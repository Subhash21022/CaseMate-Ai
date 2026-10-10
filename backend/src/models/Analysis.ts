import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFact {
  factId: string;
  category: string;
  statement: string;
  isExplicit: boolean;
  sourceDocumentId: Types.ObjectId;
  sourceDocumentName: string;
  sourcePage?: number;
  sourceQuote: string;
  confidence: string;
}

export interface ITimelineEvent {
  eventId: string;
  date: string | null; // ISO YYYY-MM-DD or null
  rawDateString?: string;
  isDated: boolean;
  dateConfidence: 'exact' | 'approximate' | 'ambiguous' | 'undated';
  title: string;
  description: string;
  sourceDocumentId: Types.ObjectId;
  sourceDocumentName: string;
  sourcePage?: number;
  sourceQuote: string;
  hasConflict: boolean;
  conflictDetails?: string;
}

export interface IMissingInformationItem {
  itemId: string;
  category: string;
  description: string;
  importance: 'critical' | 'recommended' | 'optional';
  isLegallyMandated: boolean;
  legalBasis?: string;
  status: 'missing' | 'partially_provided' | 'provided';
}

export interface IConflictItem {
  conflictId: string;
  issue: string;
  documentA: {
    id: Types.ObjectId;
    name: string;
    statement: string;
    date?: string;
  };
  documentB: {
    id: Types.ObjectId;
    name: string;
    statement: string;
    date?: string;
  };
  resolutionStatus: 'unresolved' | 'resolved';
  resolutionNotes?: string;
}

export interface IClarificationQuestion {
  questionId: string;
  targetAudience: 'client' | 'legal_aid_worker';
  question: string;
  context: string;
  suggestedAction?: string;
}

export interface IReportMetadata {
  summary: string;
  safetyDisclaimer: string;
  generatedAt: Date;
}

export interface IAnalysis extends Document {
  _id: Types.ObjectId;
  caseId: Types.ObjectId;
  extractedFacts: IFact[];
  timelineEvents: ITimelineEvent[];
  missingInformation: IMissingInformationItem[];
  conflicts: IConflictItem[];
  clarificationQuestions: IClarificationQuestion[];
  verificationStatus: 'verified' | 'flagged_for_review' | 'rejected';
  verificationNotes: string[];
  humanReviewStatus: 'pending' | 'reviewed' | 'not_required';
  reviewedBy?: string;
  reviewedAt?: Date;
  reportMetadata: IReportMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const FactSchema = new Schema<IFact>(
  {
    factId: { type: String, required: true },
    category: { type: String, required: true },
    statement: { type: String, required: true },
    isExplicit: { type: Boolean, default: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    sourceDocumentName: { type: String, required: true },
    sourcePage: { type: Number },
    sourceQuote: { type: String, required: true },
    confidence: { type: String, default: 'high' },
  },
  { _id: false }
);

const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    eventId: { type: String, required: true },
    date: { type: String, default: null },
    rawDateString: { type: String },
    isDated: { type: Boolean, default: true },
    dateConfidence: {
      type: String,
      enum: ['exact', 'approximate', 'ambiguous', 'undated'],
      default: 'exact',
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    sourceDocumentName: { type: String, required: true },
    sourcePage: { type: Number },
    sourceQuote: { type: String, required: true },
    hasConflict: { type: Boolean, default: false },
    conflictDetails: { type: String },
  },
  { _id: false }
);

const MissingInformationSchema = new Schema<IMissingInformationItem>(
  {
    itemId: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    importance: {
      type: String,
      enum: ['critical', 'recommended', 'optional'],
      default: 'recommended',
    },
    isLegallyMandated: { type: Boolean, default: false },
    legalBasis: { type: String },
    status: {
      type: String,
      enum: ['missing', 'partially_provided', 'provided'],
      default: 'missing',
    },
  },
  { _id: false }
);

const ConflictSchema = new Schema<IConflictItem>(
  {
    conflictId: { type: String, required: true },
    issue: { type: String, required: true },
    documentA: {
      id: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
      name: { type: String, required: true },
      statement: { type: String, required: true },
      date: { type: String },
    },
    documentB: {
      id: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
      name: { type: String, required: true },
      statement: { type: String, required: true },
      date: { type: String },
    },
    resolutionStatus: {
      type: String,
      enum: ['unresolved', 'resolved'],
      default: 'unresolved',
    },
    resolutionNotes: { type: String },
  },
  { _id: false }
);

const ClarificationQuestionSchema = new Schema<IClarificationQuestion>(
  {
    questionId: { type: String, required: true },
    targetAudience: {
      type: String,
      enum: ['client', 'legal_aid_worker'],
      default: 'legal_aid_worker',
    },
    question: { type: String, required: true },
    context: { type: String, required: true },
    suggestedAction: { type: String },
  },
  { _id: false }
);

const AnalysisSchema = new Schema<IAnalysis>(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    extractedFacts: [FactSchema],
    timelineEvents: [TimelineEventSchema],
    missingInformation: [MissingInformationSchema],
    conflicts: [ConflictSchema],
    clarificationQuestions: [ClarificationQuestionSchema],
    verificationStatus: {
      type: String,
      enum: ['verified', 'flagged_for_review', 'rejected'],
      default: 'flagged_for_review',
    },
    verificationNotes: [{ type: String }],
    humanReviewStatus: {
      type: String,
      enum: ['pending', 'reviewed', 'not_required'],
      default: 'pending',
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reportMetadata: {
      summary: { type: String, default: '' },
      safetyDisclaimer: {
        type: String,
        default:
          'DISCLAIMER: CaseMate AI provides non-lawyer administrative organization and issue-spotting support only. It does not provide legal advice, legal strategy, or representation. All facts, dates, and conclusions must be independently verified by a licensed attorney or qualified legal professional before relying upon them in legal proceedings.',
      },
      generatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

export const AnalysisModel = mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
