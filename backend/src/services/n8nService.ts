import axios from 'axios';
import { config } from '../config/env.js';
import { CaseModel, ICase } from '../models/Case.js';
import { DocumentModel, ILegalDocument } from '../models/Document.js';
import { AnalysisModel } from '../models/Analysis.js';
import {
  runDocumentAnalysisAgent,
  runTimelineAgent,
  runCompletenessAgent,
} from './agentService.js';
import { verifyWorkflowResults } from './verificationService.js';
import { calculateDetentionDuration } from './custodyCalculator.js';
import { evaluateSection479Checklist } from './section479Rules.js';

export interface TriggerAnalysisResponse {
  success: boolean;
  message: string;
  triggeredVia: 'n8n_webhook' | 'internal_orchestrator';
  caseId: string;
}

export const triggerCaseAnalysis = async (
  caseRecord: ICase,
  forceInternalFallback = false
): Promise<TriggerAnalysisResponse> => {
  const caseId = caseRecord._id.toString();

  // 1. Mark status as processing
  caseRecord.status = 'processing';
  caseRecord.failureReason = undefined;
  await caseRecord.save();

  if (!forceInternalFallback && config.NODE_ENV !== 'test') {
    const webhookPath = config.N8N_USE_TEST_WEBHOOK
      ? `/webhook-test/casemate-analysis`
      : config.N8N_WEBHOOK_PATH;
    const webhookUrl = `${config.N8N_BASE_URL}${webhookPath}`;

    try {
      console.log(`Triggering n8n webhook at: ${webhookUrl} for Case ID: ${caseId}`);
      const n8nResp = await axios.post(
        webhookUrl,
        {
          caseId,
          timestamp: new Date().toISOString(),
          inputUrl: `http://localhost:${config.PORT}/api/internal/cases/${caseId}/input`,
          resultsUrl: `http://localhost:${config.PORT}/api/internal/cases/${caseId}/results`,
          failureUrl: `http://localhost:${config.PORT}/api/internal/cases/${caseId}/failure`,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': config.INTERNAL_API_SECRET,
          },
          timeout: 10000,
        }
      );

      console.log(`n8n webhook responded with status: ${n8nResp.status}`);
      return {
        success: true,
        message: 'Analysis workflow successfully triggered via n8n orchestrator.',
        triggeredVia: 'n8n_webhook',
        caseId,
      };
    } catch (n8nErr: any) {
      console.warn(
        `Could not reach n8n webhook at ${webhookUrl} (${n8nErr.message}). Executing asynchronous internal agent pipeline fallback...`
      );
      // Run internal orchestration asynchronously so request returns immediately
      setImmediate(() => {
        executeInternalAnalysisWorkflow(caseId).catch((err) => {
          console.error(`Internal workflow failed for case ${caseId}:`, err);
        });
      });

      return {
        success: true,
        message: 'Analysis workflow started via internal agent orchestrator.',
        triggeredVia: 'internal_orchestrator',
        caseId,
      };
    }
  }

  // Internal asynchronous execution
  setImmediate(() => {
    executeInternalAnalysisWorkflow(caseId).catch((err) => {
      console.error(`Internal workflow failed for case ${caseId}:`, err);
    });
  });

  return {
    success: true,
    message: 'Analysis workflow triggered via internal orchestrator.',
    triggeredVia: 'internal_orchestrator',
    caseId,
  };
};

export const executeInternalAnalysisWorkflow = async (caseId: string): Promise<void> => {
  const caseDoc = await CaseModel.findById(caseId);
  if (!caseDoc) {
    throw new Error(`Case not found: ${caseId}`);
  }

  const documents = await DocumentModel.find({ caseId });
  if (documents.length === 0) {
    caseDoc.status = 'failed';
    caseDoc.failureReason = 'Cannot run analysis without at least one uploaded document.';
    await caseDoc.save();
    return;
  }

  try {
    console.log(`Starting sequential agent workflow for Case ${caseId}...`);

    // Step 1: Agent 1 - Document Analysis Agent (run for each document)
    const docAnalysisOutputs = [];
    for (const doc of documents) {
      const output = await runDocumentAnalysisAgent(doc, caseDoc.category);
      docAnalysisOutputs.push(output);
    }

    // Step 2: Agent 2 - Timeline Agent
    const timelineOutput = runTimelineAgent(documents, docAnalysisOutputs);

    // Step 3: Agent 3 - Completeness Agent
    const allExtractedFacts = docAnalysisOutputs.flatMap((o) => o.extractedFacts);
    const completenessOutput = runCompletenessAgent(
      caseDoc.title,
      caseDoc.category || 'Undertrial Detention Review',
      documents,
      allExtractedFacts,
      timelineOutput.timelineEvents,
      timelineOutput.detectedDateConflicts
    );

    // Step 4: Deterministic Custody Duration Calculation & Section 479 BNSS Rule Engine
    const fullCaseText = documents.map((d) => d.extractedText).join(' ');
    
    // Find earliest confirmed arrest date
    const arrestEvent = timelineOutput.timelineEvents.find(
      (e) => (/arrest/i.test(e.title) || /arrest/i.test(e.description)) && e.isDated && e.date !== null
    );
    let arrestDate = arrestEvent?.date || null;
    if (!arrestDate) {
      const textArrestMatch = fullCaseText.match(/(?:arrested\s+on|date\s+(?:and\s+time\s+)?of\s+arrest)[\s#:.-]*(\d{4}-\d{2}-\d{2})/i);
      if (textArrestMatch) {
        arrestDate = textArrestMatch[1];
      }
    }

    // Detect charged offences
    const chargedOffences: any[] = [];
    if (/302/i.test(fullCaseText) && /ipc|bns|murder/i.test(fullCaseText)) {
      chargedOffences.push({ section: 'IPC 302', description: 'Murder', maxImprisonmentMonths: 240, carriesLifeOrDeath: true });
    }
    if (/379/i.test(fullCaseText) && /ipc|bns|theft/i.test(fullCaseText)) {
      chargedOffences.push({ section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false });
    }
    if (/411/i.test(fullCaseText) && /ipc|bns|stolen/i.test(fullCaseText)) {
      chargedOffences.push({ section: 'IPC 411', description: 'Receiving Stolen Property', maxImprisonmentMonths: 36, carriesLifeOrDeath: false });
    }
    if (/323/i.test(fullCaseText) && /ipc|bns|hurt/i.test(fullCaseText)) {
      chargedOffences.push({ section: 'IPC 323', description: 'Voluntarily Causing Hurt', maxImprisonmentMonths: 12, carriesLifeOrDeath: false });
    }

    // Determine first offender status
    let isFirstOffender: boolean | null = null;
    const deSpacedCaseText = fullCaseText.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (
      deSpacedCaseText.includes('nopreviousconviction') ||
      deSpacedCaseText.includes('firsttimeoffender') ||
      deSpacedCaseText.includes('nopastconviction') ||
      deSpacedCaseText.includes('cleanantecedent') ||
      deSpacedCaseText.includes('nopastcriminalrecord') ||
      /no\s+previous\s+convictions?|first\s*-?\s*time\s+offender|clean\s+antecedents?/i.test(fullCaseText)
    ) {
      isFirstOffender = true;
    } else if (
      /previous\s+convictions?\s*:\s*(?:yes|\d+)|prior\s+convictions/i.test(fullCaseText) ||
      deSpacedCaseText.includes('priorconviction')
    ) {
      isFirstOffender = false;
    }

    // Conflicting arrest dates
    const conflictingArrestDates = timelineOutput.detectedDateConflicts
      .filter((c) => /arrest/i.test(c.issue))
      .map((c) => ({
        documentName: c.documentA.name,
        statedDate: c.documentA.date || '',
        statement: c.documentA.statement,
      }));

    const maxMonths = chargedOffences.length > 0 ? chargedOffences[0].maxImprisonmentMonths : null;

    const custodyCalculations = calculateDetentionDuration({
      arrestDate,
      maxImprisonmentMonths: maxMonths,
      conflictingArrestDates: conflictingArrestDates.length > 0 ? conflictingArrestDates : undefined,
    });

    const section479Assessment = evaluateSection479Checklist({
      caseTitle: caseDoc.title,
      chargedOffences,
      isFirstOffender,
      hasMultiplePendingCases: false,
      custodyCalculation: custodyCalculations,
      arrestMemoAvailable: documents.some((d) => d.detectedDocumentType === 'Arrest Memo / Panchnama'),
      firAvailable: documents.some((d) => d.detectedDocumentType === 'First Information Report (FIR)'),
      remandOrderAvailable: documents.some((d) => d.detectedDocumentType === 'Remand Application / Order'),
    });

    // Step 5: Verification Layer
    const workflowPayload = {
      extractedFacts: allExtractedFacts,
      timelineEvents: timelineOutput.timelineEvents,
      missingInformation: completenessOutput.missingInformation,
      conflicts: completenessOutput.conflicts,
      clarificationQuestions: completenessOutput.clarificationQuestions,
      custodyCalculations,
      section479Assessment,
      summary: `Automated CustodyLens analysis completed across ${documents.length} document(s). Category: ${section479Assessment.categoryTitle}`,
      humanReviewRequired:
        completenessOutput.conflicts.length > 0 ||
        section479Assessment.reviewCategory === 'statutory_restriction_flagged',
    };

    const verification = verifyWorkflowResults(workflowPayload, documents);

    if (verification.verificationStatus === 'rejected') {
      caseDoc.status = 'failed';
      caseDoc.failureReason = `Verification rejection: ${verification.verificationNotes.join(', ')}`;
      await caseDoc.save();
      return;
    }

    // Persist Analysis record
    const analysisRecord = await AnalysisModel.create({
      caseId: caseDoc._id,
      extractedFacts: workflowPayload.extractedFacts,
      timelineEvents: workflowPayload.timelineEvents,
      missingInformation: workflowPayload.missingInformation,
      conflicts: workflowPayload.conflicts,
      clarificationQuestions: workflowPayload.clarificationQuestions,
      custodyCalculations: workflowPayload.custodyCalculations,
      section479Assessment: workflowPayload.section479Assessment,
      verificationStatus: verification.verificationStatus,
      verificationNotes: verification.verificationNotes,
      humanReviewStatus:
        verification.verificationStatus === 'flagged_for_review' ? 'pending' : 'not_required',
      reportMetadata: {
        summary: workflowPayload.summary,
        generatedAt: new Date(),
      },
    });

    // Update Case status
    caseDoc.analysis = analysisRecord._id;
    caseDoc.status =
      verification.verificationStatus === 'flagged_for_review'
        ? 'human_review_required'
        : 'completed';
    await caseDoc.save();

    console.log(
      `Analysis completed successfully for Case ${caseId}. Final Status: ${caseDoc.status}`
    );
  } catch (err: any) {
    console.error(`Workflow failure for Case ${caseId}:`, err);
    caseDoc.status = 'failed';
    caseDoc.failureReason = err.message || 'Internal workflow execution error';
    await caseDoc.save();
  }
};
