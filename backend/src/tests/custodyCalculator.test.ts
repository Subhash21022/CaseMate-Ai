import { describe, it, expect } from 'vitest';
import {
  calculateDetentionDuration,
  getCalendarDaysDifference,
  breakDownCalendarDuration,
  addMonthsToDate,
  CustodyCalculationInput,
} from '../services/custodyCalculator.js';

describe('CustodyLens 479 — Deterministic Custody Calculator Unit Tests', () => {
  it('1. Correctly computes exact calendar days difference', () => {
    // Non-leap year interval
    expect(getCalendarDaysDifference('2023-01-01', '2023-01-10')).toBe(9);
    // Across leap day (2024 is leap year: Feb has 29 days)
    expect(getCalendarDaysDifference('2024-02-28', '2024-03-01')).toBe(2);
    // Full leap year (2024)
    expect(getCalendarDaysDifference('2024-01-01', '2025-01-01')).toBe(366);
  });

  it('2. Breaks down duration into years, months, days accurately', () => {
    const breakdown = breakDownCalendarDuration('2023-01-15', '2024-04-20');
    expect(breakdown.years).toBe(1);
    expect(breakdown.months).toBe(3);
    expect(breakdown.days).toBe(5);
    expect(breakdown.totalDays).toBe(461);
  });

  it('3. Safely adds months to date preserving calendar boundaries', () => {
    expect(addMonthsToDate('2023-01-15', 6)).toBe('2023-07-15');
    expect(addMonthsToDate('2023-01-15', 12)).toBe('2024-01-15');
    // Jan 31 + 1 month -> Feb 28 in non-leap year 2023
    expect(addMonthsToDate('2023-01-31', 1)).toBe('2023-02-28');
  });

  it('4. Rejects calculation when arrest date is missing', () => {
    const input: CustodyCalculationInput = {
      arrestDate: null,
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.isValidSequence).toBe(false);
    expect(result.status).toBe('undetermined_missing_arrest_date');
    expect(result.totalCustodyDays).toBe(0);
    expect(result.sequenceWarnings[0]).toContain('Arrest date is missing');
  });

  it('5. Flags Section 479(2) exclusion when offence carries death or life imprisonment', () => {
    const input: CustodyCalculationInput = {
      arrestDate: '2022-01-01',
      asOfDate: '2024-01-01',
      maxImprisonmentMonths: 240, // 20 years
      hasLifeOrDeathOffence: true,
      isFirstOffender: true,
    };
    const result = calculateDetentionDuration(input);
    expect(result.status).toBe('excluded_life_or_death');
    expect(result.oneThirdThreshold).toBeNull();
    expect(result.oneHalfThreshold).toBeNull();
    expect(result.calculationNotes.some((n) => n.includes('CRITICAL EXCLUSION'))).toBe(true);
  });

  it('6. Detects One-Third (1/3) threshold reached for confirmed first-time offender (Section 479(1) Proviso)', () => {
    // 36 months max punishment (3 years)
    // 1/3 threshold is 12 months (1 year)
    // Arrest date: 2023-01-01, asOfDate: 2024-02-01 (> 12 months)
    const input: CustodyCalculationInput = {
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-01',
      maxImprisonmentMonths: 36,
      isFirstOffender: true,
      hasLifeOrDeathOffence: false,
    };
    const result = calculateDetentionDuration(input);
    expect(result.isValidSequence).toBe(true);
    expect(result.status).toBe('threshold_reached_one_third');
    expect(result.oneThirdThreshold?.thresholdMonths).toBe(12);
    expect(result.oneThirdThreshold?.thresholdReached).toBe(true);
    expect(result.oneThirdThreshold?.daysRemaining).toBe(0);
    expect(result.oneHalfThreshold?.thresholdReached).toBe(false); // 18 months not yet reached
  });

  it('7. Detects One-Half (1/2) threshold reached for standard undertrial (Section 479(1) Main Provision)', () => {
    // 36 months max punishment (3 years)
    // 1/2 threshold is 18 months (1.5 years)
    // Arrest date: 2022-01-01, asOfDate: 2023-08-01 (19 months)
    const input: CustodyCalculationInput = {
      arrestDate: '2022-01-01',
      asOfDate: '2023-08-01',
      maxImprisonmentMonths: 36,
      isFirstOffender: false, // not a first offender
      hasLifeOrDeathOffence: false,
    };
    const result = calculateDetentionDuration(input);
    expect(result.isValidSequence).toBe(true);
    expect(result.status).toBe('threshold_reached_one_half');
    expect(result.oneHalfThreshold?.thresholdMonths).toBe(18);
    expect(result.oneHalfThreshold?.thresholdReached).toBe(true);
    expect(result.oneHalfThreshold?.daysRemaining).toBe(0);
  });

  it('8. Flags magistrate production delay exceeding 24 hours', () => {
    const input: CustodyCalculationInput = {
      arrestDate: '2023-05-10',
      arrestTime: '10:00',
      magistrateProductionDate: '2023-05-12',
      magistrateProductionTime: '16:00', // ~54 hours later
      asOfDate: '2023-06-01',
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.productionDelayFlagged).toBe(true);
    expect(result.productionDelayHours).toBeGreaterThan(24);
    expect(result.sequenceWarnings.some((w) => w.includes('> 24 hours'))).toBe(true);
  });

  it('9. Correctly computes itemized police vs judicial custody days from remand intervals', () => {
    const input: CustodyCalculationInput = {
      arrestDate: '2023-01-01',
      asOfDate: '2023-02-01',
      remandIntervals: [
        { startDate: '2023-01-02', endDate: '2023-01-06', custodyType: 'police_custody' },
        { startDate: '2023-01-06', endDate: '2023-01-20', custodyType: 'judicial_custody' },
      ],
      maxImprisonmentMonths: 24,
    };
    const result = calculateDetentionDuration(input);
    expect(result.policeCustodyDays).toBe(4);
    expect(result.judicialCustodyDays).toBe(14);
  });
});
