// CustodyLens 479 — Frontend TypeScript Definitions

export type DocumentType =
  | 'FIR'
  | 'Arrest Memo'
  | 'Remand Order'
  | 'Charge Sheet'
  | 'Bail Rejection Order'
  | 'Case Diary / Panchnama'
  | 'Unknown Legal Document';

export interface ILegalDocument {
  _id: string;
  caseId: string;
  originalFilename: string;
  detectedDocumentType: DocumentType | string;
  mimeType: string;
  fileSize: number;
  pageCount?: number;
  extractionStatus: 'pending' | 'success' | 'failed' | 'fallback_ocr';
  warnings: string[];
  isDuplicate?: boolean;
  createdAt: string;
}

export interface IEvidenceCitation {
  documentName: string;
  pageNumber?: number;
  verbatimQuote: string;
  confidence?: 'high' | 'medium' | 'low' | 'verified';
  category?: string;
}

export interface IExtractedFact {
  factId: string;
  category: 'FIR Details' | 'Arrest Details' | 'Remand & Custody' | 'Charged Offences' | 'Antecedents' | 'Procedural Flags' | string;
  statement: string;
  isExplicit: boolean;
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
  sourceDocumentName: string;
  sourcePage?: number;
  sourceQuote: string;
  hasConflict: boolean;
  conflictDetails?: string;
  custodyType?: 'arrest' | 'production' | 'police_custody' | 'judicial_remand' | 'bail_hearing' | 'procedural';
}

export interface IConflictItem {
  conflictId: string;
  issue: string;
  documentA: {
    name: string;
    statement: string;
    date?: string;
  };
  documentB: {
    name: string;
    statement: string;
    date?: string;
  };
  resolutionStatus: 'unresolved' | 'resolved';
  resolutionNotes?: string;
  impactLevel: 'critical' | 'moderate' | 'informational';
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

export interface IStatutoryThreshold {
  thresholdMonths: number;
  thresholdDaysEstimated: number;
  thresholdReached: boolean;
  daysRemaining: number;
  targetDate: string | null;
  percentageCompleted: number;
}

export interface ICustodyCalculationResult {
  isValidSequence: boolean;
  sequenceWarnings: string[];
  grossCustodyDays: number;
  accusedCausedDelayDaysExcluded: number;
  netCountableCustodyDays: number;
  durationBreakdown: {
    years: number;
    months: number;
    days: number;
    totalDays: number;
  };
  policeCustodyDays: number;
  judicialCustodyDays: number;
  productionDelayHours?: number | null;
  productionDelayFlagged: boolean;
  hasConflictingDates: boolean;
  dateDiscrepancyNotes: string[];
  oneThirdThreshold: IStatutoryThreshold | null;
  oneHalfThreshold: IStatutoryThreshold | null;
  maximumPeriodThreshold: IStatutoryThreshold | null;
  isMaximumPeriodExceeded: boolean;
  calculationNotes: string[];
}

export interface IStatutoryRuleCheck {
  ruleId: string;
  ruleName: string;
  statutoryReference: string;
  status: 'satisfied' | 'not_satisfied' | 'restriction_flagged' | 'unknown';
  finding: string;
  evidenceNotes: string;
  humanReviewNote: string;
}

export type Section479ReviewCategory =
  | 'potential_review_candidate'
  | 'threshold_not_reached'
  | 'statutory_restriction_flagged'
  | 'insufficient_information';

export interface ISection479Assessment {
  checklistVersion: string;
  evaluationTimestamp: string;
  reviewCategory: Section479ReviewCategory;
  categoryTitle: string;
  categorySummary: string;
  rules: IStatutoryRuleCheck[];
  missingCrucialFacts: string[];
  jailSuperintendentMandate: {
    obligationTriggered: boolean;
    statutoryBasis: string;
    instructionsForLegalAid: string;
  };
  recommendedLegalAidActions: string[];
  statutoryDisclaimer: string;
}

export interface ICase {
  _id: string;
  title: string;
  category: string;
  status: 'created' | 'documents_uploaded' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  documentCount?: number;
  firNumber?: string;
  policeStation?: string;
  accusedName?: string;
  isDemoCase?: boolean;
  demoId?: string;
}

export interface IFullCaseReview {
  caseInfo: ICase;
  documents: ILegalDocument[];
  extractedFacts: IExtractedFact[];
  timelineEvents: ITimelineEvent[];
  conflicts: IConflictItem[];
  missingInformation: IMissingInformationItem[];
  custodyCalculations: ICustodyCalculationResult;
  section479Assessment: ISection479Assessment;
  verificationStatus: 'verified' | 'flagged_for_review' | 'rejected';
  verificationNotes: string[];
  summary: string;
  safetyDisclaimer: string;
}
