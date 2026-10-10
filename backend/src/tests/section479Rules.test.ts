import { describe, it, expect } from 'vitest';
import {
  evaluateSection479Checklist,
  Section479ChecklistInput,
  SECTION_479_RULES_VERSION,
} from '../services/section479Rules.js';
import { calculateDetentionDuration } from '../services/custodyCalculator.js';

describe('CustodyLens 479 — Section 479 BNSS Rule Engine Unit Tests', () => {
  it('1. Qualifies candidate under First Proviso (1/3rd max sentence) for verified first-time offender', () => {
    // Offence: IPC 379 (Theft) -> Max 36 months (3 years)
    // 1/3 threshold is 12 months
    const calc = calculateDetentionDuration({
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01', // 13 months
      maxImprisonmentMonths: 36,
      isFirstOffender: true,
      hasLifeOrDeathOffence: false,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Raju Kumar (FIR 104/2023)',
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
    expect(result.reviewCategory).toBe('potential_review_candidate_first_offender');
    expect(result.categoryTitle).toContain('One-Third (1/3) First-Offender Proviso');
    expect(result.criteria.find((c) => c.criterionId === 'SEC479-CRIT-1')?.status).toBe('satisfied');
    expect(result.criteria.find((c) => c.criterionId === 'SEC479-CRIT-2')?.status).toBe('satisfied');
    expect(result.criteria.find((c) => c.criterionId === 'SEC479-CRIT-3')?.status).toBe('satisfied');
    expect(result.recommendedLegalAidActions.some((a) => a.includes('First Proviso'))).toBe(true);
  });

  it('2. Qualifies standard undertrial under One-Half Rule when 1/2 is served despite past record', () => {
    // 36 months max -> 1/2 is 18 months
    // Served 20 months
    const calc = calculateDetentionDuration({
      arrestDate: '2022-01-01',
      asOfDate: '2023-09-01', // 20 months
      maxImprisonmentMonths: 36,
      isFirstOffender: false,
      hasLifeOrDeathOffence: false,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Devendra Singh',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: false,
      hasMultiplePendingCases: false,
      custodyCalculation: calc,
      arrestMemoAvailable: true,
      firAvailable: true,
      remandOrderAvailable: true,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('potential_review_candidate_standard');
    expect(result.categoryTitle).toContain('One-Half (1/2) General Rule');
    expect(result.criteria.find((c) => c.criterionId === 'SEC479-CRIT-2')?.status).toBe('not_satisfied'); // Not a first offender
    expect(result.criteria.find((c) => c.criterionId === 'SEC479-CRIT-3')?.status).toBe('satisfied'); // 1/2 met
  });

  it('3. Flags statutory exclusion for offences with Death or Life Imprisonment (Sec 479(2))', () => {
    const calc = calculateDetentionDuration({
      arrestDate: '2020-01-01',
      asOfDate: '2024-01-01',
      maxImprisonmentMonths: 240,
      hasLifeOrDeathOffence: true,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'State v. Vikramaditya',
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

    expect(result.reviewCategory).toBe('ineligible_excluded_life_death');
    expect(result.categoryTitle).toContain('Excluded Under Section 479(2)');
    expect(result.criteria.find((c) => c.criterionId === 'SEC479-CRIT-1')?.status).toBe('flagged');
    expect(result.recommendedLegalAidActions.some((a) => a.includes('regular bail'))).toBe(true);
  });

  it('4. Returns insufficient information when critical documents are missing', () => {
    const calc = calculateDetentionDuration({
      arrestDate: null, // missing arrest date
      maxImprisonmentMonths: 36,
    });

    const input: Section479ChecklistInput = {
      caseTitle: 'Incomplete Case Workspace',
      chargedOffences: [
        { section: 'IPC 379', description: 'Theft', maxImprisonmentMonths: 36, carriesLifeOrDeath: false },
      ],
      isFirstOffender: null,
      hasMultiplePendingCases: null,
      custodyCalculation: calc,
      arrestMemoAvailable: false,
      firAvailable: false,
      remandOrderAvailable: false,
    };

    const result = evaluateSection479Checklist(input);

    expect(result.reviewCategory).toBe('insufficient_information');
    expect(result.missingCrucialFacts.length).toBeGreaterThan(0);
    expect(result.missingCrucialFacts.some((f) => f.includes('Arrest Memo'))).toBe(true);
  });
});
