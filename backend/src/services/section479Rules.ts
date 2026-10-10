/**
 * CustodyLens 479 — Section 479 BNSS (2023) Legal Rule Engine
 * 
 * Versioned, auditable, human-reviewed statutory checklist for Section 479 
 * of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS).
 * 
 * Section 479 BNSS replaces Section 436A CrPC with a significant reform:
 * 1. General Rule (Sec 479(1)): Undertrial detained up to 1/2 of max imprisonment
 *    shall be considered for release on bail/bond.
 * 2. First Proviso to Sec 479(1): First-time offenders (never convicted previously)
 *    shall be considered for release after undergoing 1/3 of max imprisonment.
 * 3. Exclusion (Sec 479(2)): Offence carrying Death or Life Imprisonment as one
 *    of the punishments is excluded from Section 479.
 * 4. Multi-case Caveat: Inquiry/trial pending in multiple cases requires judicial caveat.
 */

import { CustodyCalculationResult } from './custodyCalculator.js';

export const SECTION_479_RULES_VERSION = 'BNSS-2023-SEC479-V1.0';

export interface ChargedOffence {
  section: string;      // e.g. "IPC 379", "BNS 303(2)"
  description: string;  // e.g. "Theft"
  maxImprisonmentMonths: number; // e.g. 36
  carriesLifeOrDeath: boolean;
}

export interface Section479ChecklistInput {
  caseTitle: string;
  accusedName?: string;
  chargedOffences: ChargedOffence[];
  isFirstOffender: boolean | null; // true, false, or null if unverified
  hasMultiplePendingCases: boolean | null; // true, false, or null if unknown
  custodyCalculation: CustodyCalculationResult;
  arrestMemoAvailable: boolean;
  firAvailable: boolean;
  remandOrderAvailable: boolean;
}

export interface ChecklistCriterionResult {
  criterionId: string;
  name: string;
  statutoryBasis: string;
  status: 'satisfied' | 'not_satisfied' | 'flagged' | 'unknown';
  finding: string;
  evidenceNotes: string;
}

export type Section479ReviewCategory =
  | 'potential_review_candidate_first_offender'  // Met 1/3rd threshold under 1st Proviso
  | 'potential_review_candidate_standard'        // Met 1/2nd threshold under Main Provision
  | 'ineligible_excluded_life_death'             // Excluded under Sec 479(2)
  | 'ineligible_duration_not_met'                // Custody duration < statutory threshold
  | 'insufficient_information';                  // Missing crucial evidence

export interface Section479AssessmentReport {
  checklistVersion: string;
  evaluationTimestamp: string;
  reviewCategory: Section479ReviewCategory;
  categoryTitle: string;
  categorySummary: string;
  criteria: ChecklistCriterionResult[];
  missingCrucialFacts: string[];
  recommendedLegalAidActions: string[];
  highestMaxSentenceMonths: number;
  statutoryDisclaimer: string;
}

/**
 * Evaluates Section 479 BNSS criteria based on verified extracted facts and deterministic calculations.
 */
export function evaluateSection479Checklist(input: Section479ChecklistInput): Section479AssessmentReport {
  const criteria: ChecklistCriterionResult[] = [];
  const missingFacts: string[] = [];
  const recommendedActions: string[] = [];

  const calc = input.custodyCalculation;
  const highestMaxSentence = input.chargedOffences.reduce(
    (max, o) => Math.max(max, o.maxImprisonmentMonths || 0),
    0
  );

  // --------------------------------------------------------------------------
  // Criterion 1: Exclusion Check — Death or Imprisonment for Life (Sec 479(2))
  // --------------------------------------------------------------------------
  const hasLifeOrDeath = input.chargedOffences.some((o) => o.carriesLifeOrDeath);
  if (hasLifeOrDeath) {
    criteria.push({
      criterionId: 'SEC479-CRIT-1',
      name: 'Life Imprisonment or Death Penalty Exclusion Check',
      statutoryBasis: 'Section 479(2) BNSS, 2023',
      status: 'flagged',
      finding: 'EXCLUSION APPLICABLE: One or more charged offences specify death or imprisonment for life as a punishment.',
      evidenceNotes: `Charged offences include provisions carrying life/death sentence: ${input.chargedOffences.filter((o) => o.carriesLifeOrDeath).map((o) => o.section).join(', ')}.`,
    });
  } else {
    criteria.push({
      criterionId: 'SEC479-CRIT-1',
      name: 'Life Imprisonment or Death Penalty Exclusion Check',
      statutoryBasis: 'Section 479(2) BNSS, 2023',
      status: 'satisfied',
      finding: 'PASSED: None of the charged offences carry death or life imprisonment.',
      evidenceNotes: `Charged offences: ${input.chargedOffences.map((o) => `${o.section} (Max: ${o.maxImprisonmentMonths}m)`).join(', ') || 'None specified'}.`,
    });
  }

  // --------------------------------------------------------------------------
  // Criterion 2: Criminal Antecedents / First-Time Offender Status
  // --------------------------------------------------------------------------
  if (input.isFirstOffender === true) {
    criteria.push({
      criterionId: 'SEC479-CRIT-2',
      name: 'First-Time Offender Status (First Proviso Eligibility)',
      statutoryBasis: 'First Proviso to Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: 'CONFIRMED: Accused has no prior convictions recorded. Eligible under relaxed 1/3rd detention threshold.',
      evidenceNotes: 'Case records indicate first-time offender with no prior convictions.',
    });
  } else if (input.isFirstOffender === false) {
    criteria.push({
      criterionId: 'SEC479-CRIT-2',
      name: 'First-Time Offender Status (First Proviso Eligibility)',
      statutoryBasis: 'First Proviso to Section 479(1) BNSS, 2023',
      status: 'not_satisfied',
      finding: 'NOT APPLICABLE: Accused has prior criminal convictions. Relaxed 1/3rd proviso does not apply; standard 1/2nd rule governs.',
      evidenceNotes: 'Prior conviction record noted.',
    });
  } else {
    criteria.push({
      criterionId: 'SEC479-CRIT-2',
      name: 'First-Time Offender Status (First Proviso Eligibility)',
      statutoryBasis: 'First Proviso to Section 479(1) BNSS, 2023',
      status: 'unknown',
      finding: 'UNVERIFIED: Prior conviction history is not explicitly documented in the available records.',
      evidenceNotes: 'Criminal antecedent report / custody certificate required from Jail Superintendent to confirm first-offender status.',
    });
    missingFacts.push('Jail Superintendent Certificate confirming whether accused has any prior criminal convictions.');
    recommendedActions.push('File memo before Trial Court seeking antecedent report from jail authorities.');
  }

  // --------------------------------------------------------------------------
  // Criterion 3: Deterministic Detention Duration vs Statutory Threshold
  // --------------------------------------------------------------------------
  const oneThirdReached = calc.oneThirdThreshold?.thresholdReached || false;
  const oneHalfReached = calc.oneHalfThreshold?.thresholdReached || false;

  if (oneHalfReached) {
    criteria.push({
      criterionId: 'SEC479-CRIT-3',
      name: 'Statutory Custody Duration Threshold (One-Half Rule)',
      statutoryBasis: 'Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: `THRESHOLD MET: Accused has served ${calc.totalCustodyDays} days, exceeding the 1/2nd statutory threshold (${calc.oneHalfThreshold?.thresholdMonths} months / ~${calc.oneHalfThreshold?.thresholdDaysEstimated} days).`,
      evidenceNotes: `Detention began ${calc.durationBreakdown.years}y ${calc.durationBreakdown.months}m ${calc.durationBreakdown.days}d ago. One-half target date was ${calc.oneHalfThreshold?.targetDate}.`,
    });
  } else if (oneThirdReached) {
    criteria.push({
      criterionId: 'SEC479-CRIT-3',
      name: 'Statutory Custody Duration Threshold (One-Third Proviso)',
      statutoryBasis: 'First Proviso to Section 479(1) BNSS, 2023',
      status: input.isFirstOffender === true ? 'satisfied' : 'flagged',
      finding: input.isFirstOffender === true
        ? `PROVISO THRESHOLD MET: Accused has served ${calc.totalCustodyDays} days, exceeding 1/3rd threshold (${calc.oneThirdThreshold?.thresholdMonths} months / ~${calc.oneThirdThreshold?.thresholdDaysEstimated} days) as a verified first-time offender.`
        : `ONE-THIRD REACHED BUT ANTECEDENTS UNVERIFIED: Accused has served ${calc.totalCustodyDays} days (>= 1/3 threshold). Will qualify under First Proviso if first-offender status is verified.`,
      evidenceNotes: `Target 1/3 date was ${calc.oneThirdThreshold?.targetDate}. 1/2 target date is ${calc.oneHalfThreshold?.targetDate} (${calc.oneHalfThreshold?.daysRemaining} days remaining).`,
    });
  } else {
    criteria.push({
      criterionId: 'SEC479-CRIT-3',
      name: 'Statutory Custody Duration Threshold',
      statutoryBasis: 'Section 479(1) BNSS, 2023',
      status: 'not_satisfied',
      finding: `THRESHOLD NOT YET MET: Accused has served ${calc.totalCustodyDays} days. 1/3 threshold requires ${calc.oneThirdThreshold?.daysRemaining ?? 'N/A'} more days; 1/2 threshold requires ${calc.oneHalfThreshold?.daysRemaining ?? 'N/A'} more days.`,
      evidenceNotes: `Next milestone (1/3 date): ${calc.oneThirdThreshold?.targetDate || 'Unknown'}.`,
    });
  }

  // --------------------------------------------------------------------------
  // Criterion 4: Multi-Case / Multiple Pending Inquiries Caveat
  // --------------------------------------------------------------------------
  if (input.hasMultiplePendingCases === true) {
    criteria.push({
      criterionId: 'SEC479-CRIT-4',
      name: 'Multiple Pending Cases Check',
      statutoryBasis: 'Section 479(2) BNSS proviso / judicial discretion',
      status: 'flagged',
      finding: 'MULTIPLE CASES PENDING: Accused has other pending investigations/cases. May require special judicial scrutiny under multi-case caveats.',
      evidenceNotes: 'Records reference other pending FIRs or proceedings against accused.',
    });
    recommendedActions.push('Collate status of all co-pending cases to present composite custody review to the Court.');
  } else if (input.hasMultiplePendingCases === false) {
    criteria.push({
      criterionId: 'SEC479-CRIT-4',
      name: 'Multiple Pending Cases Check',
      statutoryBasis: 'Section 479(2) BNSS proviso',
      status: 'satisfied',
      finding: 'SINGLE CASE: No other pending cases recorded against the accused.',
      evidenceNotes: 'Sole proceeding identified.',
    });
  } else {
    criteria.push({
      criterionId: 'SEC479-CRIT-4',
      name: 'Multiple Pending Cases Check',
      statutoryBasis: 'Section 479(2) BNSS proviso',
      status: 'unknown',
      finding: 'UNVERIFIED: Not confirmed whether any additional FIRs or cases are pending in other police stations.',
      evidenceNotes: 'Inter-station police verification recommended.',
    });
  }

  // --------------------------------------------------------------------------
  // Criterion 5: Evidentiary Record Completeness
  // --------------------------------------------------------------------------
  if (!input.arrestMemoAvailable) {
    missingFacts.push('Formal Arrest Memo / Panchnama confirming exact date, time, and grounds of arrest.');
    recommendedActions.push('Request certified copy of Arrest Memo from the Magistrate Court repository.');
  }
  if (!input.firAvailable) {
    missingFacts.push('Copy of registered First Information Report (FIR).');
  }
  if (!input.remandOrderAvailable) {
    missingFacts.push('Latest Judicial Remand Extension Order confirming current legal custody.');
    recommendedActions.push('Obtain order sheet extract of remand proceedings from jurisdictional court.');
  }

  // --------------------------------------------------------------------------
  // Determine Overall Category and Legal Aid Recommendations
  // --------------------------------------------------------------------------
  let reviewCategory: Section479ReviewCategory;
  let categoryTitle: string;
  let categorySummary: string;

  if (hasLifeOrDeath) {
    reviewCategory = 'ineligible_excluded_life_death';
    categoryTitle = 'Excluded Under Section 479(2) BNSS';
    categorySummary = 'The case involves offences specifying death or life imprisonment as a potential sentence. Section 479 statutory detention review is not available; regular bail under Section 480 / 483 BNSS must be explored instead.';
    recommendedActions.push('Evaluate regular bail grounds under Section 483 BNSS (High Court/Sessions Court) on medical, parity, or evidentiary delay grounds.');
  } else if (calc.status === 'undetermined_missing_arrest_date' || highestMaxSentence <= 0) {
    reviewCategory = 'insufficient_information';
    categoryTitle = 'Insufficient Information for Review Assessment';
    categorySummary = 'Key facts (date of arrest or statutory maximum sentences) are missing from the uploaded documents. Custody duration cannot be reliably evaluated.';
    recommendedActions.push('Upload Arrest Memo and FIR to establish baseline custody dates and charges.');
  } else if (oneHalfReached) {
    reviewCategory = 'potential_review_candidate_standard';
    categoryTitle = 'Potential Review Candidate — One-Half (1/2) General Rule';
    categorySummary = `The undertrial has undergone detention exceeding 1/2nd of the maximum statutory punishment (${calc.oneHalfThreshold?.thresholdMonths} months). An application for release under Section 479(1) BNSS is strongly indicated.`;
    recommendedActions.push('Draft and submit an urgent application under Section 479(1) BNSS before the jurisdictional Magistrate/Sessions Court.');
    recommendedActions.push('Ensure DLSA (District Legal Services Authority) / Jail Visiting Advocate assists accused with personal bond documentation.');
  } else if (oneThirdReached && input.isFirstOffender === true) {
    reviewCategory = 'potential_review_candidate_first_offender';
    categoryTitle = 'Potential Review Candidate — One-Third (1/3) First-Offender Proviso';
    categorySummary = `The undertrial has completed 1/3rd of the maximum sentence (${calc.oneThirdThreshold?.thresholdMonths} months) and is a confirmed first-time offender. Eligible under the First Proviso to Section 479(1) BNSS.`;
    recommendedActions.push('Draft Section 479 application explicitly invoking the First Proviso for first-time offenders.');
    recommendedActions.push('Attach an affidavit or Jail Superintendent Certificate confirming clean antecedent history.');
  } else if (oneThirdReached && input.isFirstOffender === null) {
    reviewCategory = 'potential_review_candidate_first_offender';
    categoryTitle = 'Conditional Candidate — One-Third Reached (Antecedents Pending)';
    categorySummary = `The undertrial has served over 1/3rd of the sentence (${calc.oneThirdThreshold?.thresholdMonths} months). Will qualify immediately under the First Proviso once first-offender status is verified.`;
    recommendedActions.push('Expedite verification of criminal antecedent record with Jail Superintendent.');
  } else {
    reviewCategory = 'ineligible_duration_not_met';
    categoryTitle = 'Statutory Detention Threshold Not Yet Reached';
    categorySummary = `The undertrial has served ${calc.totalCustodyDays} days. The 1/3rd milestone date is ${calc.oneThirdThreshold?.targetDate || 'TBD'} (${calc.oneThirdThreshold?.daysRemaining} days away); 1/2nd milestone date is ${calc.oneHalfThreshold?.targetDate || 'TBD'} (${calc.oneHalfThreshold?.daysRemaining} days away).`;
    recommendedActions.push(`Schedule automatic case calendar review for ${calc.oneThirdThreshold?.targetDate || 'next milestone'}.`);
  }

  return {
    checklistVersion: SECTION_479_RULES_VERSION,
    evaluationTimestamp: new Date().toISOString(),
    reviewCategory,
    categoryTitle,
    categorySummary,
    criteria,
    missingCrucialFacts: missingFacts,
    recommendedLegalAidActions: recommendedActions,
    highestMaxSentenceMonths: highestMaxSentence,
    statutoryDisclaimer:
      'NOTICE: This assessment is an administrative legal-aid preparation brief generated by CustodyLens 479 for authorized review by legal aid counsel and DLSA. It does not constitute a judicial pronouncement, court order, or legal guarantee of release. All petitions under Section 479 BNSS require independent judicial adjudication.',
  };
}
