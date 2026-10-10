import { describe, it, expect } from 'vitest';
import {
  calculateDetentionDuration,
  getCalendarDaysDifference,
  breakDownCalendarDuration,
  addMonthsToDate,
  CustodyCalculationInput,
} from '../services/custodyCalculator.js';

describe('CustodyLens 479 — Deterministic Custody Calculator Unit & Regression Tests', () => {
  it('1. Computes exact calendar days difference including leap years', () => {
    expect(getCalendarDaysDifference('2023-01-01', '2023-01-10')).toBe(9);
    expect(getCalendarDaysDifference('2024-02-28', '2024-03-01')).toBe(2); // 2024 is leap year
    expect(getCalendarDaysDifference('2024-01-01', '2025-01-01')).toBe(366);
  });

  it('2. Breaks down duration into years, months, days accurately', () => {
    const breakdown = breakDownCalendarDuration('2023-01-15', '2024-04-20');
    expect(breakdown.years).toBe(1);
    expect(breakdown.months).toBe(3);
    expect(breakdown.days).toBe(5);
    expect(breakdown.totalDays).toBe(461);
  });

  it('3. Safely adds months preserving calendar month ends', () => {
    expect(addMonthsToDate('2023-01-15', 6)).toBe('2023-07-15');
    expect(addMonthsToDate('2023-01-15', 12)).toBe('2024-01-15');
    expect(addMonthsToDate('2023-01-31', 1)).toBe('2023-02-28'); // Non-leap Feb
  });

  it('4. Rejects calculation when arrest date is missing', () => {
    const input: CustodyCalculationInput = {
      arrestDate: null,
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.isValidSequence).toBe(false);
    expect(result.grossCustodyDays).toBe(0);
    expect(result.netCountableCustodyDays).toBe(0);
    expect(result.sequenceWarnings[0]).toContain('Arrest date is missing');
  });

  it('5. Computes multiple distinct custody intervals (handling release on bail and re-arrest)', () => {
    // Accused arrested 2023-01-01, released on interim bail on 2023-02-01 (31 days)
    // Re-arrested on 2023-05-01, detained until 2023-07-01 (61 days)
    // Total gross custody = 31 + 61 = 92 days
    const input: CustodyCalculationInput = {
      arrestDate: '2023-01-01',
      asOfDate: '2023-07-01',
      custodyIntervals: [
        { startDate: '2023-01-01', endDate: '2023-02-01', custodyType: 'police_custody' },
        { startDate: '2023-05-01', endDate: '2023-07-01', custodyType: 'judicial_custody' },
      ],
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.isValidSequence).toBe(true);
    expect(result.policeCustodyDays).toBe(31);
    expect(result.judicialCustodyDays).toBe(61);
    expect(result.grossCustodyDays).toBe(92);
    expect(result.netCountableCustodyDays).toBe(92);
  });

  it('6. Correctly deducts accused-caused delay under Explanation to Section 479(1)', () => {
    // Arrest: 2023-01-01, AsOf: 2024-01-01 (365 days gross)
    // Accused caused 65 days delay in proceedings
    // Net countable = 365 - 65 = 300 days
    const input: CustodyCalculationInput = {
      arrestDate: '2023-01-01',
      asOfDate: '2024-01-01',
      accusedCausedDelayDays: 65,
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.grossCustodyDays).toBe(365);
    expect(result.accusedCausedDelayDaysExcluded).toBe(65);
    expect(result.netCountableCustodyDays).toBe(300);
    expect(result.calculationNotes.some((n) => n.includes('Explanation to Section 479(1)'))).toBe(true);
  });

  it('7. Detects Third Proviso breach when net custody reaches or exceeds 100% of maximum sentence', () => {
    // 12 months maximum sentence (approx 365 days)
    // In custody for 400 days
    const input: CustodyCalculationInput = {
      arrestDate: '2023-01-01',
      asOfDate: '2024-02-10', // > 12 months
      maxImprisonmentMonths: 12,
    };
    const result = calculateDetentionDuration(input);
    expect(result.isMaximumPeriodExceeded).toBe(true);
    expect(result.maximumPeriodThreshold?.thresholdReached).toBe(true);
    expect(result.calculationNotes.some((n) => n.includes('CRITICAL STATUTORY BAR'))).toBe(true);
  });

  it('8. Surfaces conflicting arrest dates across multiple documents', () => {
    const input: CustodyCalculationInput = {
      arrestDate: '2023-05-10',
      conflictingArrestDates: [
        { documentName: 'FIR No. 45/2023', statedDate: '2023-05-10', statement: 'Arrested at 10 PM' },
        { documentName: 'Arrest Memo', statedDate: '2023-05-12', statement: 'Arrested at 6 AM' },
      ],
      asOfDate: '2023-06-01',
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.hasConflictingDates).toBe(true);
    expect(result.dateDiscrepancyNotes[0]).toContain('CONFLICTING ARREST DATES');
  });

  it('9. Flags magistrate production interval exceeding 24 hours without presuming illegality', () => {
    const input: CustodyCalculationInput = {
      arrestDate: '2023-05-10',
      arrestTime: '10:00',
      magistrateProductionDate: '2023-05-12',
      magistrateProductionTime: '18:00', // ~56 hours later
      asOfDate: '2023-06-01',
      maxImprisonmentMonths: 36,
    };
    const result = calculateDetentionDuration(input);
    expect(result.productionDelayFlagged).toBe(true);
    expect(result.productionDelayHours).toBeGreaterThan(24);
    expect(result.sequenceWarnings[0]).toContain('> 24 hours');
  });
});
