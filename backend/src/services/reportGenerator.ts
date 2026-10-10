import PDFDocument from 'pdfkit';
import { ICase } from '../models/Case.js';
import { ILegalDocument } from '../models/Document.js';
import { IAnalysis } from '../models/Analysis.js';

export interface StructuredReportData {
  caseOverview: {
    caseId: string;
    title: string;
    category: string;
    status: string;
    createdAt: Date;
    totalDocuments: number;
  };
  documentInventory: Array<{
    documentId: string;
    filename: string;
    detectedType: string;
    pageCount: number;
    extractionStatus: string;
    warnings: string[];
    isDuplicate: boolean;
  }>;
  extractedFacts: Array<{
    factId: string;
    category: string;
    statement: string;
    sourceDocumentName: string;
    sourcePage?: number;
    sourceQuote: string;
    confidence: string;
  }>;
  timeline: Array<{
    eventId: string;
    date: string | null;
    title: string;
    description: string;
    sourceDocumentName: string;
    hasConflict: boolean;
    conflictDetails?: string;
  }>;
  conflictingInformation: Array<{
    conflictId: string;
    issue: string;
    documentA: { name: string; statement: string; date?: string };
    documentB: { name: string; statement: string; date?: string };
    resolutionStatus: string;
  }>;
  missingInformationChecklist: Array<{
    itemId: string;
    category: string;
    description: string;
    importance: string;
    isLegallyMandated: boolean;
    legalBasis?: string;
    status: string;
  }>;
  clarificationQuestions: Array<{
    questionId: string;
    targetAudience: string;
    question: string;
    context: string;
    suggestedAction?: string;
  }>;
  custodyDurationSummary?: {
    grossCustodyDays: number;
    accusedCausedDelayDaysExcluded: number;
    netCountableCustodyDays: number;
    durationBreakdownText: string;
    policeCustodyDays: number;
    judicialCustodyDays: number;
    productionDelayFlagged: boolean;
    productionDelayHours?: number | null;
    oneThirdThresholdTargetDate?: string | null;
    oneHalfThresholdTargetDate?: string | null;
    maximumPeriodTargetDate?: string | null;
    isMaximumPeriodExceeded: boolean;
  };
  section479Assessment?: {
    checklistVersion: string;
    reviewCategory: string;
    categoryTitle: string;
    categorySummary: string;
    jailSuperintendentMandateTriggered: boolean;
    rules: Array<{
      ruleId: string;
      ruleName: string;
      status: string;
      finding: string;
      humanReviewNote?: string;
    }>;
    recommendedLegalAidActions: string[];
  };
  verificationAndReview: {
    verificationStatus: string;
    verificationNotes: string[];
    humanReviewStatus: string;
    reviewedBy?: string;
    reviewedAt?: Date;
  };
  safetyDisclaimer: string;
}

export function compileReportData(
  c: ICase,
  documents: ILegalDocument[],
  analysis?: IAnalysis | null
): StructuredReportData {
  const calc = analysis?.custodyCalculations;
  const sec479 = analysis?.section479Assessment;

  return {
    caseOverview: {
      caseId: c._id.toString(),
      title: c.title,
      category: c.category || 'Undertrial Legal-Aid Review',
      status: c.status,
      createdAt: c.createdAt,
      totalDocuments: documents.length,
    },
    documentInventory: documents.map((doc) => ({
      documentId: doc._id.toString(),
      filename: doc.originalFilename,
      detectedType: doc.detectedDocumentType,
      pageCount: doc.pageCount,
      extractionStatus: doc.extractionStatus,
      warnings: doc.warnings,
      isDuplicate: doc.isDuplicate,
    })),
    extractedFacts: (analysis?.extractedFacts || []).map((f) => ({
      factId: f.factId,
      category: f.category,
      statement: f.statement,
      sourceDocumentName: f.sourceDocumentName,
      sourcePage: f.sourcePage,
      sourceQuote: f.sourceQuote,
      confidence: f.confidence,
    })),
    timeline: (analysis?.timelineEvents || []).map((t) => ({
      eventId: t.eventId,
      date: t.date,
      title: t.title,
      description: t.description,
      sourceDocumentName: t.sourceDocumentName,
      hasConflict: t.hasConflict,
      conflictDetails: t.conflictDetails,
    })),
    conflictingInformation: (analysis?.conflicts || []).map((conf) => ({
      conflictId: conf.conflictId,
      issue: conf.issue,
      documentA: conf.documentA,
      documentB: conf.documentB,
      resolutionStatus: conf.resolutionStatus,
    })),
    missingInformationChecklist: (analysis?.missingInformation || []).map((m) => ({
      itemId: m.itemId,
      category: m.category,
      description: m.description,
      importance: m.importance,
      isLegallyMandated: m.isLegallyMandated,
      legalBasis: m.legalBasis,
      status: m.status,
    })),
    clarificationQuestions: (analysis?.clarificationQuestions || []).map((q) => ({
      questionId: q.questionId,
      targetAudience: q.targetAudience,
      question: q.question,
      context: q.context,
      suggestedAction: q.suggestedAction,
    })),
    custodyDurationSummary: calc
      ? {
          grossCustodyDays: calc.grossCustodyDays || calc.totalCustodyDays || 0,
          accusedCausedDelayDaysExcluded: calc.accusedCausedDelayDaysExcluded || 0,
          netCountableCustodyDays: calc.netCountableCustodyDays || calc.totalCustodyDays || 0,
          durationBreakdownText: calc.durationBreakdown
            ? `${calc.durationBreakdown.years}y ${calc.durationBreakdown.months}m ${calc.durationBreakdown.days}d`
            : 'N/A',
          policeCustodyDays: calc.policeCustodyDays || 0,
          judicialCustodyDays: calc.judicialCustodyDays || 0,
          productionDelayFlagged: Boolean(calc.productionDelayFlagged),
          productionDelayHours: calc.productionDelayHours,
          oneThirdThresholdTargetDate: calc.oneThirdThreshold?.targetDate || null,
          oneHalfThresholdTargetDate: calc.oneHalfThreshold?.targetDate || null,
          maximumPeriodTargetDate: calc.maximumPeriodThreshold?.targetDate || null,
          isMaximumPeriodExceeded: Boolean(calc.isMaximumPeriodExceeded),
        }
      : undefined,
    section479Assessment: sec479
      ? {
          checklistVersion: sec479.checklistVersion || 'BNSS-2023-SEC479-V2.0',
          reviewCategory: sec479.reviewCategory || 'insufficient_information',
          categoryTitle: sec479.categoryTitle || 'Section 479 BNSS Assessment',
          categorySummary: sec479.categorySummary || '',
          jailSuperintendentMandateTriggered: Boolean(
            sec479.jailSuperintendentMandate?.obligationTriggered
          ),
          rules: (sec479.rules || []).map((r: any) => ({
            ruleId: r.ruleId,
            ruleName: r.ruleName,
            status: r.status,
            finding: r.finding,
            humanReviewNote: r.humanReviewNote,
          })),
          recommendedLegalAidActions: sec479.recommendedLegalAidActions || [],
        }
      : undefined,
    verificationAndReview: {
      verificationStatus: analysis?.verificationStatus || 'flagged_for_review',
      verificationNotes: analysis?.verificationNotes || [],
      humanReviewStatus: analysis?.humanReviewStatus || 'pending',
      reviewedBy: analysis?.reviewedBy,
      reviewedAt: analysis?.reviewedAt,
    },
    safetyDisclaimer:
      analysis?.reportMetadata?.safetyDisclaimer ||
      'DISCLAIMER: CustodyLens 479 generates an administrative legal-aid preparation brief for authorized review by legal aid counsel and DLSA. It does not provide legal advice or represent an official judicial release order. All Section 479 BNSS relief requires judicial adjudication by the competent court.',
  };
}

export function generateReportPdf(report: StructuredReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .fontSize(20)
        .fillColor('#0F172A')
        .text('CustodyLens 479 — Undertrial Detention Review Brief', { align: 'left' });
      doc
        .fontSize(9)
        .fillColor('#475569')
        .text(`Generated on: ${new Date().toLocaleDateString()} | Draft For Authorized Human Review Only`, {
          align: 'left',
        });
      doc.moveDown(0.6);

      // Horizontal Divider
      doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // Section 1: Case Overview
      doc.fontSize(13).fillColor('#0F172A').text('1. Case Overview & Status');
      doc.fontSize(9.5).fillColor('#334155');
      doc.text(`Case Title: ${report.caseOverview.title}`);
      doc.text(`Case ID: ${report.caseOverview.caseId}`);
      doc.text(`Category: ${report.caseOverview.category}`);
      doc.text(`Workflow Status: ${report.caseOverview.status.toUpperCase()}`);
      doc.text(`Verified Documents Ingested: ${report.caseOverview.totalDocuments}`);
      doc.moveDown(0.8);

      // Section 2: Section 479 BNSS Review Assessment (If Present)
      if (report.section479Assessment) {
        const sec = report.section479Assessment;
        doc.fontSize(13).fillColor('#1E3A8A').text('2. Section 479 BNSS (2023) Statutory Assessment');
        doc.fontSize(9.5).fillColor('#0F172A');
        doc.text(`Classification: ${sec.categoryTitle} [${sec.reviewCategory.toUpperCase()}]`);
        doc.fillColor('#334155').text(`Summary: ${sec.categorySummary}`);

        if (sec.jailSuperintendentMandateTriggered) {
          doc
            .fillColor('#B45309')
            .text('• Active Statutory Duty: Section 479(3) Jail Superintendent obligation is TRIGGERED.');
        }

        doc.moveDown(0.5);
        doc.fillColor('#1E293B').text('Statutory Checklist Findings:');
        for (const rule of sec.rules) {
          const icon = rule.status === 'satisfied' ? '[SATISFIED]' : rule.status === 'restriction_flagged' ? '[RESTRICTION]' : `[${rule.status.toUpperCase()}]`;
          doc.fillColor(rule.status === 'restriction_flagged' ? '#B91C1C' : '#334155');
          doc.text(`  • ${rule.ruleName} ${icon}: ${rule.finding}`);
        }
        doc.moveDown(0.8);
      }

      // Section 3: Deterministic Custody Duration Summary
      if (report.custodyDurationSummary) {
        const c = report.custodyDurationSummary;
        doc.fontSize(13).fillColor('#0F172A').text('3. Deterministic Custody Duration Breakdown');
        doc.fontSize(9.5).fillColor('#334155');
        doc.text(`Net Countable Custody: ${c.netCountableCustodyDays} days (${c.durationBreakdownText})`);
        doc.text(`Gross Detention: ${c.grossCustodyDays} days | Accused-Caused Delay Excluded: ${c.accusedCausedDelayDaysExcluded} days`);
        doc.text(`Custody Division: ${c.policeCustodyDays} days Police Custody | ${c.judicialCustodyDays} days Judicial Custody`);

        if (c.productionDelayFlagged) {
          doc.fillColor('#B45309').text(`Review Notice: Recorded initial production interval was approx. ${c.productionDelayHours} hours (> 24h).`);
        }
        if (c.oneThirdThresholdTargetDate) {
          doc.fillColor('#334155').text(`1/3rd Milestone Target Date (First Proviso): ${c.oneThirdThresholdTargetDate}`);
        }
        if (c.oneHalfThresholdTargetDate) {
          doc.fillColor('#334155').text(`1/2nd Milestone Target Date (Main Provision): ${c.oneHalfThresholdTargetDate}`);
        }
        if (c.isMaximumPeriodExceeded) {
          doc.fillColor('#DC2626').text('CRITICAL NOTICE: Net custody exceeds 100% of maximum statutory imprisonment.');
        }
        doc.moveDown(0.8);
      }

      // Section 4: Document Inventory & Citations
      doc.fontSize(13).fillColor('#0F172A').text('4. Ingested Evidence Inventory');
      doc.fontSize(9.5).fillColor('#334155');
      for (const item of report.documentInventory) {
        doc.text(`• ${item.filename} — [${item.detectedType}] (${item.pageCount} pg) | Extraction: ${item.extractionStatus}`);
        if (item.warnings.length > 0) {
          doc.fillColor('#DC2626').text(`    Note: ${item.warnings.join(', ')}`).fillColor('#334155');
        }
      }
      doc.moveDown(0.8);

      // Section 5: Chronological Custody Timeline
      doc.fontSize(13).fillColor('#0F172A').text('5. Source-Linked Custody Chronology');
      doc.fontSize(9).fillColor('#334155');
      if (report.timeline.length === 0) {
        doc.text('No dated custody events extracted.');
      } else {
        for (const event of report.timeline.slice(0, 15)) {
          const dateStr = event.date || 'Undated';
          const conflictFlag = event.hasConflict ? ' [! CONFLICT]' : '';
          doc.fillColor(event.hasConflict ? '#DC2626' : '#1E40AF');
          doc.text(`[${dateStr}] ${event.title}${conflictFlag}`);
          doc.fillColor('#475569');
          doc.text(`  Source: ${event.sourceDocumentName} | "${event.description.slice(0, 110)}"`);
          if (event.conflictDetails) {
            doc.fillColor('#DC2626').text(`  Discrepancy: ${event.conflictDetails}`).fillColor('#475569');
          }
          doc.moveDown(0.3);
        }
      }
      doc.moveDown(0.8);

      // Section 6: Conflicting Information & Discrepancies
      if (report.conflictingInformation.length > 0) {
        doc.fontSize(13).fillColor('#B91C1C').text('6. Evidentiary Discrepancies & Date Conflicts');
        doc.fontSize(9).fillColor('#334155');
        for (const conf of report.conflictingInformation) {
          doc.fillColor('#991B1B').text(`• Issue: ${conf.issue}`);
          doc.fillColor('#475569');
          doc.text(`    Source A (${conf.documentA.name}): "${conf.documentA.statement}"`);
          doc.text(`    Source B (${conf.documentB.name}): "${conf.documentB.statement}"`);
          doc.moveDown(0.3);
        }
        doc.moveDown(0.8);
      }

      // Section 7: Action Items for Legal Aid Counsel / DLSA
      doc.fontSize(13).fillColor('#0F172A').text('7. Recommended Legal-Aid & DLSA Action Items');
      doc.fontSize(9.5).fillColor('#334155');
      const actions = report.section479Assessment?.recommendedLegalAidActions || [];
      if (actions.length > 0) {
        for (const act of actions) {
          doc.text(`• ${act}`);
        }
      } else {
        doc.text('• Coordinate with Jail Visiting Advocate to verify undertrial status.');
      }
      doc.moveDown(1.2);

      // Section 8: Legal Safety Disclaimer
      doc.strokeColor('#EF4444').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.6);
      doc.fontSize(8).fillColor('#7F1D1D');
      doc.text(report.safetyDisclaimer, { align: 'justify' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
