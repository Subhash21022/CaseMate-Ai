/**
 * CustodyLens 479 — Section 479 BNSS (2023) Legal Rule Engine
 * 
 * Version: BNSS-2023-SEC479-V2.0
 * Authoritative Source: Bharatiya Nagarik Suraksha Sanhita, 2023 (Act No. 46 of 2023), Section 479;
 * Supreme Court directions in Re: Inhuman Conditions in 1382 Prisons & In Re Policy Strategy for Grant of Bail.
 * 
 * Implements the full 8-rule statutory checklist:
 * 1. Death / Life Imprisonment Exclusion (Section 479(1) Opening Clause)
 * 2. Multiple Pending Offences / Cases Restriction (Section 479(2))
 * 3. First-Time Offender 1/3rd Threshold (First Proviso to Section 479(1))
 * 4. General Undertrial 1/2nd Threshold (Section 479(1) Main Provision)
 * 5. Accused-Caused Delay Exclusion (Explanation to Section 479(1))
 * 6. Court's Discretion & Recorded Reasons (Second Proviso to Section 479(1))
 * 7. Absolute Maximum Period Ceiling (Third Proviso to Section 479(1))
 * 8. Jail Superintendent Statutory Obligation (Section 479(3))
 * 
 * Conservative Status Vocabulary:
 * - potential_review_candidate
 * - threshold_not_reached
 * - statutory_restriction_flagged
 * - insufficient_information
 */

import { CustodyCalculationResult } from './custodyCalculator.js';

export const SECTION_479_RULES_VERSION = 'BNSS-2023-SEC479-V2.0';

export interface ChargedOffence {
  section: string;               // e.g. "IPC 379" or "BNS 303(2)"
  description: string;           // e.g. "Theft"
  maxImprisonmentMonths: number; // statutory maximum in months
  carriesLifeOrDeath: boolean;   // true if Death or Life Imprisonment is specified
}

export interface Section479ChecklistInput {
  caseTitle: string;
  accusedName?: string;
  chargedOffences: ChargedOffence[];
  isFirstOffender: boolean | null;         // true = verified first offender; false = prior convictions; null = unverified
  hasMultiplePendingCases: boolean | null; // true, false, or null if unknown
  hasCourtOrderedContinuedDetention?: boolean; // Second Proviso: Court recorded reasons for continuing detention
  courtContinuedDetentionReason?: string;
  custodyCalculation: CustodyCalculationResult;
  arrestMemoAvailable: boolean;
  firAvailable: boolean;
  remandOrderAvailable: boolean;
}

export interface StatutoryRuleCheck {
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

export interface Section479AssessmentReport {
  checklistVersion: string;
  evaluationTimestamp: string;
  reviewCategory: Section479ReviewCategory;
  categoryTitle: string;
  categorySummary: string;
  rules: StatutoryRuleCheck[];
  missingCrucialFacts: string[];
  jailSuperintendentMandate: {
    obligationTriggered: boolean;
    statutoryBasis: string;
    instructionsForLegalAid: string;
  };
  recommendedLegalAidActions: string[];
  statutoryDisclaimer: string;
}

/**
 * Evaluates the comprehensive Section 479 BNSS checklist.
 */
export function evaluateSection479Checklist(input: Section479ChecklistInput): Section479AssessmentReport {
  const rules: StatutoryRuleCheck[] = [];
  const missingFacts: string[] = [];
  const recommendedActions: string[] = [];
  const calc = input.custodyCalculation;

  // --------------------------------------------------------------------------
  // Rule 1: Death / Life Imprisonment Exclusion (Section 479(1) Opening Clause)
  // --------------------------------------------------------------------------
  const carriesLifeOrDeath = input.chargedOffences.some((o) => o.carriesLifeOrDeath);
  if (carriesLifeOrDeath) {
    const excludedSections = input.chargedOffences
      .filter((o) => o.carriesLifeOrDeath)
      .map((o) => o.section)
      .join(', ');
    rules.push({
      ruleId: 'SEC479-RULE-1',
      ruleName: 'Capital / Life Imprisonment Exclusion',
      statutoryReference: 'Section 479(1) BNSS, 2023 (opening clause)',
      status: 'restriction_flagged',
      finding: `STATUTORY EXCLUSION: Charged offence(s) (${excludedSections}) specify death or imprisonment for life as a punishment.`,
      evidenceNotes: 'Section 479(1) explicitly bars application to offences carrying capital punishment or imprisonment for life.',
      humanReviewNote: 'Section 479 detention review is legally unavailable. Counsel must explore regular bail under Section 480 / 483 BNSS.',
    });
  } else if (input.chargedOffences.length === 0) {
    rules.push({
      ruleId: 'SEC479-RULE-1',
      ruleName: 'Capital / Life Imprisonment Exclusion',
      statutoryReference: 'Section 479(1) BNSS, 2023',
      status: 'unknown',
      finding: 'UNVERIFIED: Specific charged offences are not recorded in available documents.',
      evidenceNotes: 'Charges must be verified from the formal FIR or Charge Sheet.',
      humanReviewNote: 'Obtain copy of FIR or Remand order to confirm charged penal sections.',
    });
    missingFacts.push('Specific penal sections and charges under BNS / IPC.');
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-1',
      ruleName: 'Capital / Life Imprisonment Exclusion',
      statutoryReference: 'Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: 'PASSED: None of the charged offences carry death or life imprisonment.',
      evidenceNotes: `Charged offences: ${input.chargedOffences.map((o) => `${o.section} (${o.description || 'offence'})`).join(', ')}.`,
      humanReviewNote: 'Exclusion does not apply to these penal sections.',
    });
  }

  // --------------------------------------------------------------------------
  // Rule 2: Multiple Offences or Multiple Cases Restriction (Section 479(2))
  // --------------------------------------------------------------------------
  const hasMultipleOffences = input.chargedOffences.length > 1;
  const hasMultipleCases = input.hasMultiplePendingCases === true;

  if (hasMultipleOffences || hasMultipleCases) {
    const issues: string[] = [];
    if (hasMultipleOffences) {
      issues.push(`investigation/trial in more than one offence is pending (${input.chargedOffences.map((o) => o.section).join(' + ')})`);
    }
    if (hasMultipleCases) {
      issues.push('multiple separate cases/FIRs are pending against the accused');
    }

    rules.push({
      ruleId: 'SEC479-RULE-2',
      ruleName: 'Multiple Offences / Cases Statutory Restriction',
      statutoryReference: 'Section 479(2) BNSS, 2023',
      status: 'restriction_flagged',
      finding: `STATUTORY RESTRICTION FLAGGED: Under Section 479(2) BNSS, where an inquiry or trial in more than one offence or in multiple cases is pending, release under sub-section (1) is restricted: ${issues.join('; ')}.`,
      evidenceNotes: `Record shows ${input.chargedOffences.length} charged offence(s) and multi-case status: ${input.hasMultiplePendingCases === true ? 'Yes' : 'Not recorded'}.`,
      humanReviewNote: 'Section 479(2) expressly bars automatic sub-section (1) release where multiple offences or cases are pending. Counsel must examine judicial precedents (e.g. Supreme Court directions on whether charges arise from the same transaction) and consider regular bail.',
    });
  } else if (input.hasMultiplePendingCases === null) {
    rules.push({
      ruleId: 'SEC479-RULE-2',
      ruleName: 'Multiple Offences / Cases Statutory Restriction',
      statutoryReference: 'Section 479(2) BNSS, 2023',
      status: 'unknown',
      finding: 'UNVERIFIED MULTI-CASE STATUS: Single offence in current FIR, but external pending cases in other police stations are unverified.',
      evidenceNotes: 'Inter-station antecedent verification report needed.',
      humanReviewNote: 'Confirm with DLSA / police records that no other independent FIRs or cases are pending against accused.',
    });
    missingFacts.push('Confirmation of whether any other distinct FIRs or criminal cases are pending against the accused.');
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-2',
      ruleName: 'Multiple Offences / Cases Statutory Restriction',
      statutoryReference: 'Section 479(2) BNSS, 2023',
      status: 'satisfied',
      finding: 'PASSED: Single offence charged and confirmed no other pending criminal cases.',
      evidenceNotes: `Sole offence: ${input.chargedOffences[0]?.section}. No co-pending proceedings recorded.`,
      humanReviewNote: 'Section 479(2) restriction does not bar assessment for this single offence.',
    });
  }

  // --------------------------------------------------------------------------
  // Rule 3: Third Proviso Maximum Period Bar (100% Maximum Sentence)
  // --------------------------------------------------------------------------
  if (calc.isMaximumPeriodExceeded) {
    rules.push({
      ruleId: 'SEC479-RULE-3',
      ruleName: 'Absolute Maximum Period Detention Bar',
      statutoryReference: 'Third Proviso to Section 479(1) BNSS, 2023',
      status: 'restriction_flagged',
      finding: `MAXIMUM DETENTION PERIOD EXCEEDED: Accused has been detained for ${calc.netCountableCustodyDays} net days, meeting or exceeding 100% of the maximum imprisonment for the offence.`,
      evidenceNotes: `Third Proviso states: "no such person shall in any case be detained... for more than the maximum period of imprisonment provided for the said offence".`,
      humanReviewNote: 'URGENT: Continued detention beyond 100% maximum imprisonment is an absolute statutory violation. Immediate habeas corpus / Section 479 petition warranted.',
    });
    recommendedActions.push('File urgent petition highlighting absolute statutory bar under Third Proviso to Section 479(1) BNSS.');
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-3',
      ruleName: 'Absolute Maximum Period Detention Bar',
      statutoryReference: 'Third Proviso to Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: 'PASSED: Current net detention has not exceeded 100% of the maximum statutory sentence.',
      evidenceNotes: `Net custody: ${calc.netCountableCustodyDays} days vs Maximum ceiling: ~${calc.maximumPeriodThreshold?.thresholdDaysEstimated ?? 'Unknown'} days.`,
      humanReviewNote: 'Detention is within statutory maximum duration.',
    });
  }

  // --------------------------------------------------------------------------
  // Rule 4: First-Time Offender 1/3rd Proviso Check (First Proviso to Section 479(1))
  // --------------------------------------------------------------------------
  const oneThirdReached = calc.oneThirdThreshold?.thresholdReached || false;
  if (input.isFirstOffender === true) {
    if (oneThirdReached) {
      rules.push({
        ruleId: 'SEC479-RULE-4',
        ruleName: 'First-Time Offender One-Third (1/3) Threshold',
        statutoryReference: 'First Proviso to Section 479(1) BNSS, 2023',
        status: 'satisfied',
        finding: `PROVISO THRESHOLD SATISFIED: Verified first-time offender has served ${calc.netCountableCustodyDays} net days, exceeding the 1/3rd threshold (${calc.oneThirdThreshold?.thresholdMonths} months / ~${calc.oneThirdThreshold?.thresholdDaysEstimated} days).`,
        evidenceNotes: `First Proviso applies: person has never been convicted of any offence in the past. 1/3 target date was ${calc.oneThirdThreshold?.targetDate}.`,
        humanReviewNote: 'Qualifies as potential review candidate under the First Proviso to Section 479(1) BNSS.',
      });
    } else {
      rules.push({
        ruleId: 'SEC479-RULE-4',
        ruleName: 'First-Time Offender One-Third (1/3) Threshold',
        statutoryReference: 'First Proviso to Section 479(1) BNSS, 2023',
        status: 'not_satisfied',
        finding: `THRESHOLD NOT YET MET: Verified first-time offender has served ${calc.netCountableCustodyDays} net days. 1/3 threshold requires ${calc.oneThirdThreshold?.daysRemaining ?? 'N/A'} more days (target date: ${calc.oneThirdThreshold?.targetDate || 'TBD'}).`,
        evidenceNotes: `Completed ${calc.oneThirdThreshold?.percentageCompleted ?? 0}% of 1/3rd threshold.`,
        humanReviewNote: 'Monitor case until milestone date.',
      });
    }
  } else if (input.isFirstOffender === false) {
    rules.push({
      ruleId: 'SEC479-RULE-4',
      ruleName: 'First-Time Offender One-Third (1/3) Threshold',
      statutoryReference: 'First Proviso to Section 479(1) BNSS, 2023',
      status: 'not_satisfied',
      finding: 'NOT APPLICABLE: Accused has prior criminal convictions. Relaxed 1/3rd first-offender proviso does not apply.',
      evidenceNotes: 'Prior conviction record documented in case files.',
      humanReviewNote: 'Must evaluate eligibility under standard 1/2nd provision instead.',
    });
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-4',
      ruleName: 'First-Time Offender One-Third (1/3) Threshold',
      statutoryReference: 'First Proviso to Section 479(1) BNSS, 2023',
      status: 'unknown',
      finding: `CONVICTION HISTORY UNVERIFIED: Accused has served ${calc.netCountableCustodyDays} net days (${oneThirdReached ? '>= 1/3rd threshold' : '< 1/3rd threshold'}). First-offender status unknown.`,
      evidenceNotes: 'Jail Superintendent / police antecedent verification needed.',
      humanReviewNote: oneThirdReached
        ? 'NOTE: 1/3rd duration is reached. Candidate WILL qualify under First Proviso if first-offender status is verified with Jail Superintendent.'
        : 'Verify antecedents for milestone tracking.',
    });
    missingFacts.push('Confirmation of conviction history / first-time offender status from Jail Superintendent.');
  }

  // --------------------------------------------------------------------------
  // Rule 5: General Undertrial One-Half (1/2) Threshold (Section 479(1) Main Provision)
  // --------------------------------------------------------------------------
  const oneHalfReached = calc.oneHalfThreshold?.thresholdReached || false;
  if (oneHalfReached) {
    rules.push({
      ruleId: 'SEC479-RULE-5',
      ruleName: 'General Undertrial One-Half (1/2) Threshold',
      statutoryReference: 'Section 479(1) BNSS, 2023 (main provision)',
      status: 'satisfied',
      finding: `MAIN THRESHOLD SATISFIED: Accused has served ${calc.netCountableCustodyDays} net days, exceeding the 1/2nd statutory threshold (${calc.oneHalfThreshold?.thresholdMonths} months / ~${calc.oneHalfThreshold?.thresholdDaysEstimated} days).`,
      evidenceNotes: `1/2 target date was ${calc.oneHalfThreshold?.targetDate}.`,
      humanReviewNote: 'Qualifies as potential review candidate under the general provision of Section 479(1) BNSS.',
    });
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-5',
      ruleName: 'General Undertrial One-Half (1/2) Threshold',
      statutoryReference: 'Section 479(1) BNSS, 2023',
      status: 'not_satisfied',
      finding: `ONE-HALF THRESHOLD NOT YET MET: Accused has served ${calc.netCountableCustodyDays} net days. 1/2 threshold requires ${calc.oneHalfThreshold?.daysRemaining ?? 'N/A'} more days (target date: ${calc.oneHalfThreshold?.targetDate || 'TBD'}).`,
      evidenceNotes: `Completed ${calc.oneHalfThreshold?.percentageCompleted ?? 0}% of 1/2nd threshold.`,
      humanReviewNote: 'Undertrial has not completed 50% of maximum sentence.',
    });
  }

  // --------------------------------------------------------------------------
  // Rule 6: Accused-Caused Delay Exclusion (Explanation to Section 479(1))
  // --------------------------------------------------------------------------
  if (calc.accusedCausedDelayDaysExcluded > 0) {
    rules.push({
      ruleId: 'SEC479-RULE-6',
      ruleName: 'Accused-Caused Delay Exclusion Check',
      statutoryReference: 'Explanation to Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: `DELAY DEDUCTION APPLIED: ${calc.accusedCausedDelayDaysExcluded} day(s) passed due to delay caused by accused excluded from countable custody. Gross custody: ${calc.grossCustodyDays}d; Net countable custody: ${calc.netCountableCustodyDays}d.`,
      evidenceNotes: 'Explanation mandates: "period of detention passed due to delay in proceedings caused by the accused shall be excluded."',
      humanReviewNote: 'Verify court order sheets to confirm exact days of defense-caused adjournments or non-appearance.',
    });
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-6',
      ruleName: 'Accused-Caused Delay Exclusion Check',
      statutoryReference: 'Explanation to Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: 'NO ACCUSED DELAY RECORDED: No adjournments or delays attributable to the accused recorded in available proceedings.',
      evidenceNotes: 'Zero delay deduction applied.',
      humanReviewNote: 'Prosecution may raise accused-caused delay in Court; defense should keep order sheets ready.',
    });
  }

  // --------------------------------------------------------------------------
  // Rule 7: Second Proviso — Judicial Discretion & Continued Detention
  // --------------------------------------------------------------------------
  if (input.hasCourtOrderedContinuedDetention) {
    rules.push({
      ruleId: 'SEC479-RULE-7',
      ruleName: 'Court Discretion for Continued Detention',
      statutoryReference: 'Second Proviso to Section 479(1) BNSS, 2023',
      status: 'restriction_flagged',
      finding: `JUDICIAL ORDER FOR CONTINUED DETENTION: The Court has previously ordered continued detention under the Second Proviso (${input.courtContinuedDetentionReason || 'Recorded reasons'}).`,
      evidenceNotes: 'Second Proviso permits Court, after hearing Public Prosecutor and recording reasons in writing, to order continued detention.',
      humanReviewNote: 'Review grounds recorded by the Magistrate/Judge. A renewed application or challenge in higher court may be required.',
    });
  } else {
    rules.push({
      ruleId: 'SEC479-RULE-7',
      ruleName: 'Court Discretion for Continued Detention',
      statutoryReference: 'Second Proviso to Section 479(1) BNSS, 2023',
      status: 'satisfied',
      finding: 'NO RESTRICTIVE ORDER: No judicial order directing continued detention under the Second Proviso is recorded.',
      evidenceNotes: 'Normal statutory review process remains operative.',
      humanReviewNote: 'Court retains discretion to hear Public Prosecutor upon application.',
    });
  }

  // --------------------------------------------------------------------------
  // Rule 8: Section 479(3) Jail Superintendent Statutory Obligation
  // --------------------------------------------------------------------------
  const thresholdMetOverall = (oneThirdReached && input.isFirstOffender === true) || oneHalfReached;
  rules.push({
    ruleId: 'SEC479-RULE-8',
    ruleName: 'Jail Superintendent Statutory Application Duty',
    statutoryReference: 'Section 479(3) BNSS, 2023',
    status: thresholdMetOverall ? 'satisfied' : 'not_satisfied',
    finding: thresholdMetOverall
      ? 'STATUTORY MANDATE TRIGGERED: Under Section 479(3) BNSS, the Jail Superintendent has an active statutory duty to forthwith make an application to the Court on behalf of the accused.'
      : 'NOT YET TRIGGERED: Statutory duty triggers upon completion of 1/3rd (first offender) or 1/2nd period.',
    evidenceNotes: 'Section 479(3) requires Jail Superintendent to act proactively upon milestone completion.',
    humanReviewNote: 'DLSA / Panel Counsel should coordinate directly with Jail Superintendent to ensure formal Section 479(3) application is forwarded to the Court.',
  });

  // --------------------------------------------------------------------------
  // Missing Record Checks
  // --------------------------------------------------------------------------
  if (!input.arrestMemoAvailable) {
    missingFacts.push('Arrest Memo / Panchnama confirming arrest date, time, and grounds.');
  }
  if (!input.firAvailable) {
    missingFacts.push('Registered First Information Report (FIR).');
  }
  if (!input.remandOrderAvailable) {
    missingFacts.push('Latest Judicial Remand Extension Order confirming lawful custody continuity.');
  }

  // --------------------------------------------------------------------------
  // Synthesize Conservative Review Classification
  // --------------------------------------------------------------------------
  let reviewCategory: Section479ReviewCategory;
  let categoryTitle: string;
  let categorySummary: string;

  const hasRestriction = rules.some((r) => r.status === 'restriction_flagged');
  const hasUnknownCrucial = input.chargedOffences.length === 0 || !calc.isValidSequence;

  if (hasRestriction) {
    reviewCategory = 'statutory_restriction_flagged';
    categoryTitle = 'Statutory Legal Restriction Flagged';
    const restrictionFindings = rules
      .filter((r) => r.status === 'restriction_flagged')
      .map((r) => r.ruleName)
      .join(', ');
    categorySummary = `The case triggers specific statutory restrictions or exclusions (${restrictionFindings}). Automated Section 479 release application is barred or requires specialized legal argument.`;
    recommendedActions.push('Assess alternative legal remedies (e.g. regular bail under Section 483 BNSS).');
  } else if (hasUnknownCrucial) {
    reviewCategory = 'insufficient_information';
    categoryTitle = 'Insufficient Evidence for Statutory Evaluation';
    categorySummary = 'Critical evidentiary records (charges, baseline arrest date, or continuous remand) are missing. Section 479 review cannot be defensibly calculated.';
    recommendedActions.push('Collate required primary records from jurisdictional Court or Jail Superintendent.');
  } else if (thresholdMetOverall && !hasMultipleOffences && !hasMultipleCases) {
    reviewCategory = 'potential_review_candidate';
    const subRule = (oneThirdReached && input.isFirstOffender === true)
      ? 'First Proviso (One-Third Threshold for First-Time Offender)'
      : 'Section 479(1) (One-Half General Threshold)';
    categoryTitle = `Potential Review Candidate — ${subRule}`;
    categorySummary = `The undertrial has completed the required statutory detention period (${calc.netCountableCustodyDays} net days) for a single pending offence with no statutory restrictions. Recommended for expedited legal-aid review.`;
    recommendedActions.push('Draft Section 479 application before jurisdictional Magistrate/Sessions Court.');
    recommendedActions.push('Request Jail Superintendent to submit Section 479(3) application report.');
  } else {
    reviewCategory = 'threshold_not_reached';
    categoryTitle = 'Statutory Custody Threshold Not Yet Reached';
    categorySummary = `Current net detention (${calc.netCountableCustodyDays} days) is below the statutory threshold. 1/3 milestone: ${calc.oneThirdThreshold?.targetDate || 'TBD'} (${calc.oneThirdThreshold?.daysRemaining ?? 'N/A'}d remaining); 1/2 milestone: ${calc.oneHalfThreshold?.targetDate || 'TBD'} (${calc.oneHalfThreshold?.daysRemaining ?? 'N/A'}d remaining).`;
    recommendedActions.push(`Schedule calendar review for next statutory milestone date (${calc.oneThirdThreshold?.targetDate || 'TBD'}).`);
  }

  return {
    checklistVersion: SECTION_479_RULES_VERSION,
    evaluationTimestamp: new Date().toISOString(),
    reviewCategory,
    categoryTitle,
    categorySummary,
    rules,
    missingCrucialFacts: missingFacts,
    jailSuperintendentMandate: {
      obligationTriggered: thresholdMetOverall,
      statutoryBasis: 'Section 479(3) BNSS, 2023',
      instructionsForLegalAid: thresholdMetOverall
        ? 'Statutory duty active: Contact Jail Superintendent / DLSA Jail Visiting Advocate to initiate formal Section 479(3) application.'
        : 'Obligation triggers upon completion of statutory threshold.',
    },
    recommendedLegalAidActions: recommendedActions,
    statutoryDisclaimer:
      'DISCLAIMER: CustodyLens 479 produces an administrative legal-aid review draft for authorized defense counsel and DLSA. It does not constitute a judicial pronouncement, court order, or binding decision. Section 479 relief requires formal judicial adjudication by the competent Court.',
  };
}
