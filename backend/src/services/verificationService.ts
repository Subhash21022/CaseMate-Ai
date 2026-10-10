import { Types } from 'mongoose';
import {
  WorkflowResultSchema,
  WorkflowResultInput,
  FactSchema,
  TimelineEventSchema,
} from '../schemas/agentSchemas.js';
import { ILegalDocument } from '../models/Document.js';

export interface VerificationResult {
  isValid: boolean;
  verificationStatus: 'verified' | 'flagged_for_review' | 'rejected';
  verificationNotes: string[];
  validatedData?: WorkflowResultInput;
}

export const verifyWorkflowResults = (
  results: any,
  caseDocuments: ILegalDocument[]
): VerificationResult => {
  const notes: string[] = [];

  // 1. Zod Schema Validation
  const schemaParsed = WorkflowResultSchema.safeParse(results);
  if (!schemaParsed.success) {
    const errorDetails = schemaParsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return {
      isValid: false,
      verificationStatus: 'rejected',
      verificationNotes: [`Schema validation failed: ${errorDetails}`],
    };
  }

  const data = schemaParsed.data;

  // Build document lookup maps
  const docMap = new Map<string, ILegalDocument>();
  for (const doc of caseDocuments) {
    docMap.set(doc._id.toString(), doc);
  }

  // 2. Verify Source Document IDs and Citations for Extracted Facts
  for (const fact of data.extractedFacts) {
    const doc = docMap.get(fact.sourceDocumentId);
    if (!doc) {
      notes.push(
        `Fact "${fact.factId}" references non-existent document ID: ${fact.sourceDocumentId}`
      );
    } else {
      // Verify supporting quotation exists in document text
      if (fact.sourceQuote && fact.sourceQuote.trim().length > 0) {
        const normalizedDocText = doc.extractedText.toLowerCase().replace(/\s+/g, ' ');
        const normalizedQuote = fact.sourceQuote.toLowerCase().replace(/\s+/g, ' ').slice(0, 50);

        if (!normalizedDocText.includes(normalizedQuote)) {
          notes.push(
            `Quotation check warning: Quote for fact "${fact.factId}" was not found verbatim in source document "${doc.originalFilename}". Marked for human review.`
          );
        }
      } else {
        notes.push(`Fact "${fact.factId}" lacks supporting source quotation.`);
      }
    }
  }

  // 3. Verify Timeline Events and Source Traceability
  for (const event of data.timelineEvents) {
    const doc = docMap.get(event.sourceDocumentId);
    if (!doc) {
      notes.push(
        `Timeline event "${event.eventId}" references non-existent document ID: ${event.sourceDocumentId}`
      );
    }

    if (event.isDated && event.date) {
      // Validate date format YYYY-MM-DD
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(event.date);
      if (!isValidDate) {
        notes.push(
          `Timeline event "${event.eventId}" has invalid date format: "${event.date}". Expected YYYY-MM-DD.`
        );
      }
    }
  }

  // 4. Check for unresolved conflicts
  if (data.conflicts.length > 0) {
    notes.push(
      `Detected ${data.conflicts.length} conflicting factual or date assertion(s) requiring human review.`
    );
  }

  // 5. Check if any critical documents or information are missing
  const criticalMissing = data.missingInformation.filter((m) => m.importance === 'critical');
  if (criticalMissing.length > 0) {
    notes.push(
      `Checklist flagged ${criticalMissing.length} critical missing piece(s) of documentation.`
    );
  }

  // Determine final verification status
  const verificationStatus: 'verified' | 'flagged_for_review' | 'rejected' =
    notes.length === 0 ? 'verified' : 'flagged_for_review';

  return {
    isValid: true,
    verificationStatus,
    verificationNotes: notes,
    validatedData: data,
  };
};
