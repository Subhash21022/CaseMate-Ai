import { z } from 'zod';

export const ObjectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Fact Schema
export const FactSchema = z.object({
  factId: z.string(),
  category: z.string(),
  statement: z.string().min(3),
  isExplicit: z.boolean(),
  sourceDocumentId: ObjectIdString,
  sourceDocumentName: z.string(),
  sourcePage: z.number().int().positive().optional(),
  sourceQuote: z.string().min(1, 'Source quotation is required for verification'),
  confidence: z.enum(['high', 'medium', 'low', 'unverified']).default('high'),
});

// Party Schema
export const PartySchema = z.object({
  name: z.string(),
  role: z.string(), // e.g. Landlord, Tenant, Attorney, Court, Creditor, Debtor
  address: z.string().optional(),
  representation: z.string().optional(),
});

// Stated Action Schema
export const StatedActionSchema = z.object({
  action: z.string(),
  requiredBy: z.string().optional(),
  deadline: z.string().optional(),
  consequences: z.string().optional(),
  sourceQuote: z.string().optional(),
});

// Agent 1: Document Analysis Output Schema
export const DocumentAnalysisAgentOutputSchema = z.object({
  documentId: ObjectIdString,
  detectedDocumentType: z.string(),
  parties: z.array(PartySchema),
  caseReferences: z.array(z.string()),
  datesFound: z.array(
    z.object({
      rawDate: z.string(),
      normalizedDate: z.string().nullable().optional(),
      context: z.string(),
    })
  ),
  statedActions: z.array(StatedActionSchema),
  extractedFacts: z.array(FactSchema),
  unreadableSections: z.array(z.string()).optional().default([]),
  ambiguitiesOrWarnings: z.array(z.string()).optional().default([]),
});

// Agent 2: Timeline Event Schema
export const TimelineEventSchema = z.object({
  eventId: z.string(),
  date: z.string().nullable(), // ISO YYYY-MM-DD or null if undated
  rawDateString: z.string().optional(),
  isDated: z.boolean(),
  dateConfidence: z.enum(['exact', 'approximate', 'ambiguous', 'undated']),
  title: z.string().min(2),
  description: z.string(),
  sourceDocumentId: ObjectIdString,
  sourceDocumentName: z.string(),
  sourcePage: z.number().int().positive().optional(),
  sourceQuote: z.string().min(1, 'Source quote required for timeline traceability'),
  hasConflict: z.boolean().default(false),
  conflictDetails: z.string().optional(),
});

export const TimelineAgentOutputSchema = z.object({
  timelineEvents: z.array(TimelineEventSchema),
  detectedDateConflicts: z.array(
    z.object({
      conflictId: z.string(),
      issue: z.string(),
      documentA: z.object({
        id: ObjectIdString,
        name: z.string(),
        statement: z.string(),
        date: z.string().optional(),
      }),
      documentB: z.object({
        id: ObjectIdString,
        name: z.string(),
        statement: z.string(),
        date: z.string().optional(),
      }),
    })
  ),
});

// Agent 3: Completeness Schema
export const MissingInformationItemSchema = z.object({
  itemId: z.string(),
  category: z.string(),
  description: z.string(),
  importance: z.enum(['critical', 'recommended', 'optional']),
  isLegallyMandated: z.boolean().default(false),
  legalBasis: z.string().optional(),
  status: z.enum(['missing', 'partially_provided', 'provided']),
});

export const ConflictItemSchema = z.object({
  conflictId: z.string(),
  issue: z.string(),
  documentA: z.object({
    id: ObjectIdString,
    name: z.string(),
    statement: z.string(),
    date: z.string().optional(),
  }),
  documentB: z.object({
    id: ObjectIdString,
    name: z.string(),
    statement: z.string(),
    date: z.string().optional(),
  }),
  resolutionStatus: z.enum(['unresolved', 'resolved']).default('unresolved'),
  resolutionNotes: z.string().optional(),
});

export const ClarificationQuestionSchema = z.object({
  questionId: z.string(),
  targetAudience: z.enum(['client', 'legal_aid_worker']),
  question: z.string(),
  context: z.string(),
  suggestedAction: z.string().optional(),
});

export const CompletenessAgentOutputSchema = z.object({
  missingInformation: z.array(MissingInformationItemSchema),
  conflicts: z.array(ConflictItemSchema),
  clarificationQuestions: z.array(ClarificationQuestionSchema),
  unuploadedReferencedDocuments: z.array(
    z.object({
      documentName: z.string(),
      referencedInDocumentId: ObjectIdString,
      reasonNeeded: z.string(),
    })
  ).optional().default([]),
});

// Combined Workflow Result Schema (posted back to backend by n8n or orchestrator)
export const WorkflowResultSchema = z.object({
  extractedFacts: z.array(FactSchema),
  timelineEvents: z.array(TimelineEventSchema),
  missingInformation: z.array(MissingInformationItemSchema),
  conflicts: z.array(ConflictItemSchema),
  clarificationQuestions: z.array(ClarificationQuestionSchema),
  custodyCalculations: z.any().optional(),
  section479Assessment: z.any().optional(),
  summary: z.string().optional().default('Case document analysis complete.'),
  verificationNotes: z.array(z.string()).optional().default([]),
  humanReviewRequired: z.boolean().optional().default(false),
});

export type WorkflowResultInput = z.infer<typeof WorkflowResultSchema>;
export type DocumentAnalysisOutput = z.infer<typeof DocumentAnalysisAgentOutputSchema>;
export type TimelineAgentOutput = z.infer<typeof TimelineAgentOutputSchema>;
export type CompletenessAgentOutput = z.infer<typeof CompletenessAgentOutputSchema>;
