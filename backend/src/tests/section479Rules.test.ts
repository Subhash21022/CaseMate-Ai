import { describe, it, expect } from 'vitest';
import {
  evaluateSection479Checklist,
  Section479ChecklistInput,
  SECTION_479_RULES_VERSION,
} from '../services/section479Rules.js';
import { calculateDetentionDuration } from '../services/custodyCalculator.js';

describe('CustodyLens 479 — Section 479 BNSS Rule Engine Comprehensive Regression Tests', () => {
  // Scenario 1: Verified single-offence first-time-offender threshold scenario
  it('1. Qualifies single-offence verified first-time offender under First Proviso (1/3rd threshold met)', () => {
    // Single Offence: IPC 379 (Theft) -> Max 36 months
    // 1/3 threshold is 12 months; served 13 months
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01', // 13 months
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Raju Kumar',
      accusedName: 'Raju Kumar',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.checklistVersion).toBe(SECTION_479_RULES_VERSION);
    expect(result.reviewCategory).toBe('potential_review_candidate');
    expect(result.categoryTitle).toContain('First Proviso');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-1')?.status).toBe('satisfied');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-2')?.status).toBe('satisfied');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-4')?.status).toBe('satisfied');
    expect(result.jailSuperintendentMandate.obligationTriggered).toBe(true);
  });

  // Scenario 2: General half-period threshold scenario
  it('2. Qualifies standard undertrial under One-Half Rule when 1/2 is served despite past convictions', () => {
    // 36 months max -> 1/2 is 18 months; served 20 months
    const calc = calculateDetentionDuration({
      arrestDate: '2022-01-01',
      asOfDate: '2023-09-01', // 20 months
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Devendra Singh',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: false, // prior convictions
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('potential_review_candidate');
    expect(result.categoryTitle).toContain('One-Half General Threshold');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-4')?.status).toBe('not_satisfied'); // First proviso not met
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-5')?.status).toBe('satisfied'); // 1/2 general met
    expect(result.jailSuperintendentMandate.obligationTriggered).toBe(true);
  });

  // Scenario 3: Multiple pending offences restriction under Section 479(2)
  it('3. Flags statutory restriction under Section 479(2) when multiple offences are charged (e.g. IPC 379 and IPC 411)', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01', // 13 months
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Multiple Offence Accused',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
        { section: 'IPC 411', description: 'Receiving Stolen Property', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('statutory_restriction_flagged');
    const rule2 = result.rules.find((r) => r.ruleId === 'SEC479-RULE-2');
    expect(rule2?.status).toBe('restriction_flagged');
    expect(rule2?.finding).toContain('Section 479(2)');
    expect(rule2?.humanReviewNote).toContain('bars automatic sub-section (1) release');
  });

  // Scenario 4: Multiple pending cases restriction under Section 479(2)
  it('4. Flags statutory restriction under Section 479(2) when multiple independent cases are pending', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01',
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Multi Case Accused',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: true, // multiple pending cases
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('statutory_restriction_flagged');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-2')?.status).toBe('restriction_flagged');
  });

  // Scenario 5: Death or Life Imprisonment exclusion (Section 479(1))
  it('5. Flags statutory exclusion under Section 479(1) for offences carrying Death or Life Imprisonment', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2020-01-01',
      asOfDate: '2024-01-01',
      maxImprisonmentMonths: 240,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Severe Offence Accused',
      chargedOffences: [
        { section: 'IPC 302', description: 'Murder', maxImprisonmentMonths: 240, carriesLifeOrDeath: true },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('statutory_restriction_flagged');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-1')?.status).toBe('restriction_flagged');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-1')?.finding).toContain('STATUTORY EXCLUSION');
  });

  // Scenario 6: Delay in proceedings caused by the accused (Explanation to Section 479(1))
  it('6. Correctly evaluates threshold when accused-caused delay deduction drops net custody below threshold', () => {
    // 36 months max -> 1/3 threshold is 12 months (~365 days)
    // Gross custody: 395 days (would have met threshold)
    // Accused caused 60 days delay -> Net custody = 335 days (< 365 days threshold)
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-01-31', // ~395 gross days
      accusedCausedDelayDays: 60,
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Delayed Proceedings Accused',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('threshold_not_reached');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-6')?.status).toBe('satisfied');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-6')?.finding).toContain('60 day(s) passed due to delay caused by accused excluded');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-4')?.status).toBe('not_satisfied');
  });

  // Scenario 7: Unknown conviction history
  it('7. Flags unverified conviction history and marks First Proviso as unknown', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01', // 13 months
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Unverified Antecedents Accused',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: null, // unknown conviction history
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    const rule4 = result.rules.find((r) => r.ruleId === 'SEC479-RULE-4');
    expect(rule4?.status).toBe('unknown');
    expect(rule4?.humanReviewNote).toContain('Jail Superintendent');
    expect(result.missingCrucialFacts.some((f) => f.includes('conviction history'))).toBe(true);
  });

  // Scenario 8: Unknown maximum punishment
  it('8. Returns insufficient_information when charges or maximum punishment are missing', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01',
      maxImprisonmentMonths: null,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'Unspecified Case Charges',
      chargedOffences: [], // missing charges
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: false,
      firAvailable: false,
      remandOrderAvailable: false,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('insufficient_information');
    expect(result.missingCrucialFacts.length).toBeGreaterThan(0);
  });

  // Scenario 9: Thresholds not yet reached
  it('9. Returns threshold_not_reached with exact milestone countdown when duration is short', () => {
    // 36 months max -> 1/3 is 12 months; only 4 months served
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2023-05-01', // 4 months
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Early Stage Accused',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('threshold_not_reached');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-4')?.status).toBe('not_satisfied');
    expect(result.rules.find((r) => r.ruleId === 'SEC479-RULE-5')?.status).toBe('not_satisfied');
    expect(result.jailSuperintendentMandate.obligationTriggered).toBe(false);
  });

  // Scenario 10: Maximum-period ceiling breach (Third Proviso)
  it('10. Flags critical statutory bar under Third Proviso when detention reaches 100% maximum imprisonment', () => {
    // 12 months max -> detained for 14 months
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-03-01', // 14 months
      maxImprisonmentMonths: 12,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Over-detained Accused',
      chargedOffences: [
        { section: 'IPC 323', description: 'Voluntarily Causing Hurt', maxImprisonmentMonths: 12, carriesLifeOrDeath: false },
      ],
      isFirstOffender: true,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('statutory_restriction_flagged');
    const rule3 = result.rules.find((r) => r.ruleId === 'SEC479-RULE-3');
    expect(rule3?.status).toBe('restriction_flagged');
    expect(rule3?.finding).toContain('MAXIMUM DETENTION PERIOD EXCEEDED');
  });

  // Scenario 11: Court discretion under Second Proviso
  it('11. Flags restriction when Court has previously ordered continued detention under Second Proviso', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2022-01-01',
      asOfDate: '2023-09-01', // 20 months (> 1/2 of 36)
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Continued Detention Accused',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: false,
      hasMultiplePendingCases: false,
      hasCourtOrderedContinuedDetention: true,
      courtContinuedDetentionReason: 'Risk of flight and tampering with prosecution witnesses',
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('statutory_restriction_flagged');
    const rule7 = result.rules.find((r) => r.ruleId === 'SEC479-RULE-7');
    expect(rule7?.status).toBe('restriction_flagged');
    expect(rule7?.finding).toContain('JUDICIAL ORDER FOR CONTINUED DETENTION');
  });
});
