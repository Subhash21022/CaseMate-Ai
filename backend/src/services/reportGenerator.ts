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
  return {
    caseOverview: {
      caseId: c._id.toString(),
      title: c.title,
      category: c.category || 'General Legal-Aid',
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
    verificationAndReview: {
      verificationStatus: analysis?.verificationStatus || 'flagged_for_review',
      verificationNotes: analysis?.verificationNotes || [],
      humanReviewStatus: analysis?.humanReviewStatus || 'pending',
      reviewedBy: analysis?.reviewedBy,
      reviewedAt: analysis?.reviewedAt,
    },
    safetyDisclaimer:
      analysis?.reportMetadata?.safetyDisclaimer ||
      'DISCLAIMER: CaseMate AI provides non-lawyer administrative organization and issue-spotting support only. It does not provide legal advice, legal strategy, or representation. All facts, dates, and conclusions must be independently verified by a licensed attorney or qualified legal professional before relying upon them in legal proceedings.',
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
        .fontSize(22)
        .fillColor('#1E3A8A')
        .text('CaseMate AI — Case Preparation Report', { align: 'left' });
      doc
        .fontSize(10)
        .fillColor('#6B7280')
        .text(`Generated on: ${new Date().toLocaleDateString()} | Non-Lawyer Administrative Support`, {
          align: 'left',
        });
      doc.moveDown(0.8);

      // Horizontal Rule
      doc.strokeColor('#D1D5DB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Section 1: Case Overview
      doc.fontSize(14).fillColor('#111827').text('1. Case Overview');
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Case ID: ${report.caseOverview.caseId}`);
      doc.text(`Case Title: ${report.caseOverview.title}`);
      doc.text(`Category: ${report.caseOverview.category}`);
      doc.text(`Status: ${report.caseOverview.status.toUpperCase()}`);
      doc.text(`Total Documents: ${report.caseOverview.totalDocuments}`);
      doc.moveDown(1);

      // Section 2: Verification & Review Status
      doc.fontSize(14).fillColor('#111827').text('2. Verification & Safety Review');
      doc.fontSize(10).fillColor('#374151');
      doc.text(`Verification Status: ${report.verificationAndReview.verificationStatus.toUpperCase()}`);
      doc.text(`Human Review: ${report.verificationAndReview.humanReviewStatus.toUpperCase()}`);
      if (report.verificationAndReview.verificationNotes.length > 0) {
        doc.fillColor('#B45309').text('Verification Notes:');
        for (const note of report.verificationAndReview.verificationNotes) {
          doc.text(`  • ${note}`);
        }
      }
      doc.moveDown(1);

      // Section 3: Document Inventory
      doc.fontSize(14).fillColor('#111827').text('3. Document Inventory');
      doc.fontSize(10).fillColor('#374151');
      for (const item of report.documentInventory) {
        doc.text(
          `• ${item.filename} — Type: ${item.detectedType} (${item.pageCount} pg) | Status: ${item.extractionStatus}`
        );
        if (item.warnings.length > 0) {
          doc.fillColor('#DC2626').text(`    Warning: ${item.warnings.join(', ')}`).fillColor('#374151');
        }
      }
      doc.moveDown(1);

      // Section 4: Chronological Timeline
      doc.fontSize(14).fillColor('#111827').text('4. Chronological Case Timeline');
      doc.fontSize(10).fillColor('#374151');
      if (report.timeline.length === 0) {
        doc.text('No dated events extracted.');
      } else {
        for (const event of report.timeline) {
          const dateStr = event.date || 'Undated';
          const conflictFlag = event.hasConflict ? ' [! CONFLICT DETECTED]' : '';
          doc.fillColor(event.hasConflict ? '#DC2626' : '#1E40AF');
          doc.text(`[${dateStr}] ${event.title}${conflictFlag}`);
          doc.fillColor('#374151');
          doc.text(`  Source: ${event.sourceDocumentName}`);
          doc.text(`  Excerpt: "${event.description}"`);
          if (event.conflictDetails) {
            doc.fillColor('#DC2626').text(`  Conflict: ${event.conflictDetails}`).fillColor('#374151');
          }
          doc.moveDown(0.4);
        }
      }
      doc.moveDown(1);

      // Section 5: Conflicting Information
      if (report.conflictingInformation.length > 0) {
        doc.fontSize(14).fillColor('#DC2626').text('5. Conflicting Facts & Date Discrepancies');
        doc.fontSize(10).fillColor('#374151');
        for (const conf of report.conflictingInformation) {
          doc.fillColor('#991B1B').text(`• Issue: ${conf.issue}`);
          doc.fillColor('#374151');
          doc.text(`    Doc A (${conf.documentA.name}): "${conf.documentA.statement}"`);
          doc.text(`    Doc B (${conf.documentB.name}): "${conf.documentB.statement}"`);
          doc.moveDown(0.4);
        }
        doc.moveDown(1);
      }

      // Section 6: Missing-Information Checklist
      doc.fontSize(14).fillColor('#111827').text('6. Missing-Information Checklist');
      doc.fontSize(10).fillColor('#374151');
      for (const item of report.missingInformationChecklist) {
        const mandatedStr = item.isLegallyMandated ? '[LEGALLY MANDATED]' : '[RECOMMENDED]';
        doc.text(`• ${item.description} — ${mandatedStr} (${item.importance.toUpperCase()})`);
        if (item.legalBasis) {
          doc.fillColor('#4B5563').text(`    Basis: ${item.legalBasis}`).fillColor('#374151');
        }
      }
      doc.moveDown(1);

      // Section 7: Questions for Legal-Aid Worker
      doc.fontSize(14).fillColor('#111827').text('7. Clarification Questions for Handoff');
      doc.fontSize(10).fillColor('#374151');
      if (report.clarificationQuestions.length === 0) {
        doc.text('No clarification questions pending.');
      } else {
        for (const q of report.clarificationQuestions) {
          doc.text(`• [Target: ${q.targetAudience.toUpperCase()}] ${q.question}`);
          doc.text(`    Context: ${q.context}`);
          if (q.suggestedAction) {
            doc.text(`    Suggested Action: ${q.suggestedAction}`);
          }
          doc.moveDown(0.4);
        }
      }
      doc.moveDown(1.5);

      // Section 8: Legal Safety Disclaimer
      doc.strokeColor('#F87171').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);
      doc.fontSize(9).fillColor('#7F1D1D');
      doc.text(report.safetyDisclaimer, { align: 'justify' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
