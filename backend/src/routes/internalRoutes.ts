import { Router, Request, Response, NextFunction } from 'express';
import { CaseModel } from '../models/Case.js';
import { DocumentModel } from '../models/Document.js';
import { AnalysisModel } from '../models/Analysis.js';
import { caseIdParamSchema } from '../schemas/caseSchemas.js';
import { workflowFailureSchema } from '../schemas/internalSchemas.js';
import { requireInternalAuth } from '../middleware/auth.js';
import { verifyWorkflowResults } from '../services/verificationService.js';
import {
  runDocumentAnalysisAgent,
  runTimelineAgent,
  runCompletenessAgent,
} from '../services/agentService.js';

const router = Router();

// Apply internal authentication to all routes in this router
router.use(requireInternalAuth);

// GET /api/internal/cases/:id/input — Fetch case input for n8n workflow
router.get('/cases/:id/input', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const documents = await DocumentModel.find({ caseId: id });
    if (documents.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No documents found for this case.',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        caseId: caseDoc._id.toString(),
        title: caseDoc.title,
        category: caseDoc.category || 'Eviction',
        status: caseDoc.status,
        documents: documents.map((d) => ({
          documentId: d._id.toString(),
          originalFilename: d.originalFilename,
          detectedDocumentType: d.detectedDocumentType,
          extractedText: d.extractedText,
          pageCount: d.pageCount,
          warnings: d.warnings,
          fileHash: d.fileHash,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/internal/cases/:id/results — Validate and persist workflow results from n8n
router.post('/cases/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    const documents = await DocumentModel.find({ caseId: id });

    // Validate workflow results deterministically
    const verification = verifyWorkflowResults(req.body, documents);

    if (verification.verificationStatus === 'rejected') {
      caseDoc.status = 'failed';
      caseDoc.failureReason = `Workflow results rejected: ${verification.verificationNotes.join('; ')}`;
      await caseDoc.save();

      res.status(422).json({
        success: false,
        error: 'Workflow results rejected by verification layer',
        verificationNotes: verification.verificationNotes,
      });
      return;
    }

    const data = verification.validatedData!;

    // Persist Analysis record
    const analysisRecord = await AnalysisModel.create({
      caseId: caseDoc._id,
      extractedFacts: data.extractedFacts,
      timelineEvents: data.timelineEvents,
      missingInformation: data.missingInformation,
      conflicts: data.conflicts,
      clarificationQuestions: data.clarificationQuestions,
      verificationStatus: verification.verificationStatus,
      verificationNotes: verification.verificationNotes,
      humanReviewStatus:
        verification.verificationStatus === 'flagged_for_review' || data.humanReviewRequired
          ? 'pending'
          : 'not_required',
      reportMetadata: {
        summary: data.summary || 'Case document analysis complete.',
        generatedAt: new Date(),
      },
    });

    // Update Case status
    caseDoc.analysis = analysisRecord._id;
    caseDoc.status =
      verification.verificationStatus === 'flagged_for_review' || data.humanReviewRequired
        ? 'human_review_required'
        : 'completed';
    await caseDoc.save();

    res.status(200).json({
      success: true,
      message: 'Analysis results validated and persisted successfully.',
      data: {
        caseId: caseDoc._id,
        analysisId: analysisRecord._id,
        status: caseDoc.status,
        verificationStatus: verification.verificationStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/internal/cases/:id/failure — Record workflow failure safely from n8n
router.post('/cases/:id/failure', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = caseIdParamSchema.parse(req.params);
    const failureInput = workflowFailureSchema.parse(req.body);

    const caseDoc = await CaseModel.findById(id);
    if (!caseDoc) {
      res.status(404).json({ success: false, error: 'Case not found' });
      return;
    }

    caseDoc.status = 'failed';
    caseDoc.failureReason = failureInput.reason;
    await caseDoc.save();

    res.json({
      success: true,
      message: 'Workflow failure recorded successfully.',
      caseId: id,
      status: 'failed',
    });
  } catch (err) {
    next(err);
  }
});

// Modular Internal Agent Endpoints for n8n HTTP Request Nodes:
// POST /api/internal/agents/document-analysis
router.post('/agents/document-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId, caseCategory } = req.body;
    if (!documentId) {
      res.status(400).json({ success: false, error: 'documentId is required' });
      return;
    }

    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    const output = await runDocumentAnalysisAgent(doc, caseCategory || 'Eviction');
    res.json({ success: true, data: output });
  } catch (err) {
    next(err);
  }
});

// POST /api/internal/agents/timeline
router.post('/agents/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId, docAnalysisOutputs } = req.body;
    if (!caseId || !docAnalysisOutputs) {
      res.status(400).json({ success: false, error: 'caseId and docAnalysisOutputs are required' });
      return;
    }

    const documents = await DocumentModel.find({ caseId });
    const output = runTimelineAgent(documents, docAnalysisOutputs);
    res.json({ success: true, data: output });
  } catch (err) {
    next(err);
  }
});

// POST /api/internal/agents/completeness
router.post('/agents/completeness', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caseId, docAnalysisOutputs, timelineEvents, dateConflicts } = req.body;
    if (!caseId) {
      res.status(400).json({ success: false, error: 'caseId is required' });
      return;
    }

    const caseDoc = await CaseModel.findById(caseId);
    const documents = await DocumentModel.find({ caseId });
    const allFacts = (docAnalysisOutputs || []).flatMap((o: any) => o.extractedFacts || []);

    const output = runCompletenessAgent(
      caseDoc?.title || 'Case',
      caseDoc?.category || 'Eviction',
      documents,
      allFacts,
      timelineEvents || [],
      dateConflicts || []
    );

    res.json({ success: true, data: output });
  } catch (err) {
    next(err);
  }
});

export const internalRoutes = router;
