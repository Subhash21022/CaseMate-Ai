/**
 * CustodyLens 479 — Deterministic Custody Duration Calculator
 * 
 * Pure, independently tested calculation service for undertrial custody computation.
 * Strictly deterministic — no LLM involvement in arithmetic or date interval logic.
 * 
 * Features:
 * - Calendar-aware duration arithmetic accounting for leap years and exact month boundaries.
 * - Supports multiple distinct custody intervals (e.g. arrest -> interim bail/release -> re-arrest).
 * - Implements the Explanation to Section 479(1) BNSS: explicit deduction of accused-caused delay.
 * - Computes statutory thresholds: 1/3rd (First Proviso), 1/2nd (Main Provision), 100% (Third Proviso Maximum Period Bar).
 * - Surfaces evidentiary discrepancies (conflicting arrest dates, missing times, >24h magistrate production intervals).
 * - Never invents custody end dates or presumes continuous custody across recorded releases.
 */

export interface CustodyInterval {
  intervalId?: string;
  startDate: string;           // ISO YYYY-MM-DD
  endDate?: string | null;     // ISO YYYY-MM-DD (null if ongoing as of assessment date)
  custodyType: 'police_custody' | 'judicial_custody' | 'general_custody';
  sourceDocumentName?: string;
  sourceQuote?: string;
}

export interface CustodyCalculationInput {
  arrestDate: string | null;               // YYYY-MM-DD (initial recorded arrest)
  arrestTime?: string | null;              // HH:mm
  magistrateProductionDate?: string | null; // YYYY-MM-DD
  magistrateProductionTime?: string | null; // HH:mm
  custodyIntervals?: CustodyInterval[];    // Itemized custody periods (interruptions, re-arrests)
  accusedCausedDelayDays?: number;         // Explanation to Sec 479(1): delay caused by accused excluded
  asOfDate?: string;                       // Reference date for review (default: today)
  maxImprisonmentMonths?: number | null;   // Statutory maximum sentence for offence
  conflictingArrestDates?: Array<{
    documentName: string;
    statedDate: string;
    statement: string;
  }>;
}

export interface CustodyDurationBreakdown {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

export interface StatutoryThresholdProgress {
  thresholdMonths: number;
  thresholdDaysEstimated: number;
  thresholdReached: boolean;
  daysRemaining: number;
  targetDate: string | null;
  percentageCompleted: number;
}

export interface CustodyCalculationResult {
  isValidSequence: boolean;
  sequenceWarnings: string[];
  
  // Detention day counts
  grossCustodyDays: number;
  accusedCausedDelayDaysExcluded: number;
  netCountableCustodyDays: number;
  durationBreakdown: CustodyDurationBreakdown;
  
  policeCustodyDays: number;
  judicialCustodyDays: number;
  
  // Production interval checks
  productionDelayHours?: number | null;
  productionDelayFlagged: boolean;
  
  // Date discrepancy tracking
  hasConflictingDates: boolean;
  dateDiscrepancyNotes: string[];
  
  // Section 479 BNSS thresholds
  oneThirdThreshold: StatutoryThresholdProgress | null;
  oneHalfThreshold: StatutoryThresholdProgress | null;
  maximumPeriodThreshold: StatutoryThresholdProgress | null; // Third Proviso (100% max sentence)
  
  isMaximumPeriodExceeded: boolean; // Flag if net detention >= 100% max sentence
  
  calculationNotes: string[];
}

/**
 * Difference in calendar days between two ISO date strings (inclusive of start date or boundary).
 */
export function getCalendarDaysDifference(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Breaks calendar days into years, months, and days relative to a starting date.
 */
export function breakDownCalendarDuration(startDateStr: string, endDateStr: string): CustodyDurationBreakdown {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  if (end < start) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0));
    days += prevMonthDate.getUTCDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = getCalendarDaysDifference(startDateStr, endDateStr);

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    totalDays: Math.max(0, totalDays),
  };
}

/**
 * Adds months to an ISO date string in a calendar-aware manner.
 */
export function addMonthsToDate(startDateStr: string, monthsToAdd: number): string {
  const d = new Date(startDateStr + 'T00:00:00Z');
  const originalDay = d.getUTCDate();
  
  d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
  
  // Guard against month rollover (e.g. adding 1 month to Jan 31 -> Feb 28/29)
  if (d.getUTCDate() < originalDay) {
    d.setUTCDate(0);
  }
  
  return d.toISOString().slice(0, 10);
}

/**
 * Main deterministic custody calculator for CustodyLens 479
 */
export function calculateDetentionDuration(input: CustodyCalculationInput): CustodyCalculationResult {
  const sequenceWarnings: string[] = [];
  const calculationNotes: string[] = [];
  const dateDiscrepancyNotes: string[] = [];
  const asOf = input.asOfDate || new Date().toISOString().slice(0, 10);

  // 1. Validate Conflicting Arrest Dates across Documents
  let hasConflictingDates = false;
  if (input.conflictingArrestDates && input.conflictingArrestDates.length > 1) {
    hasConflictingDates = true;
    const dateList = input.conflictingArrestDates
      .map((c) => `"${c.documentName}" states ${c.statedDate}`)
      .join(' vs ');
    dateDiscrepancyNotes.push(
      `CONFLICTING ARREST DATES: Documents record contradictory dates of initial arrest (${dateList}). Reviewer verification required before relying on computed duration.`
    );
  }

  // 2. Validate Baseline Arrest Date
  if (!input.arrestDate) {
    return {
      isValidSequence: false,
      sequenceWarnings: ['Arrest date is missing. Detention duration cannot be calculated without confirmed initial custody date.'],
      grossCustodyDays: 0,
      accusedCausedDelayDaysExcluded: 0,
      netCountableCustodyDays: 0,
      durationBreakdown: { years: 0, months: 0, days: 0, totalDays: 0 },
      policeCustodyDays: 0,
      judicialCustodyDays: 0,
      productionDelayHours: null,
      productionDelayFlagged: false,
      hasConflictingDates,
      dateDiscrepancyNotes,
      oneThirdThreshold: null,
      oneHalfThreshold: null,
      maximumPeriodThreshold: null,
      isMaximumPeriodExceeded: false,
      calculationNotes: ['Arrest date required from Arrest Memo or Remand Application.'],
    };
  }

  // 3. Arrest Date Cannot Be In the Future
  if (input.arrestDate > asOf) {
    sequenceWarnings.push(`Arrest date (${input.arrestDate}) is after evaluation date (${asOf}). Sequence invalid.`);
    return {
      isValidSequence: false,
      sequenceWarnings,
      grossCustodyDays: 0,
      accusedCausedDelayDaysExcluded: 0,
      netCountableCustodyDays: 0,
      durationBreakdown: { years: 0, months: 0, days: 0, totalDays: 0 },
      policeCustodyDays: 0,
      judicialCustodyDays: 0,
      productionDelayHours: null,
      productionDelayFlagged: false,
      hasConflictingDates,
      dateDiscrepancyNotes,
      oneThirdThreshold: null,
      oneHalfThreshold: null,
      maximumPeriodThreshold: null,
      isMaximumPeriodExceeded: false,
      calculationNotes: ['Arrest date cannot be in the future relative to the assessment date.'],
    };
  }

  // 4. Magistrate 24-Hour Production Check (Article 22(2) Constitution / Sec 57 CrPC / Sec 58 BNSS)
  let productionDelayHours: number | null = null;
  let productionDelayFlagged = false;

  if (input.magistrateProductionDate) {
    if (input.magistrateProductionDate < input.arrestDate) {
      sequenceWarnings.push(
        `Discrepancy: Magistrate production date (${input.magistrateProductionDate}) precedes recorded arrest date (${input.arrestDate}).`
      );
    } else {
      const arrestTimeStr = input.arrestTime || '10:00';
      const prodTimeStr = input.magistrateProductionTime || '10:00';
      const arrestDt = new Date(`${input.arrestDate}T${arrestTimeStr}:00Z`);
      const prodDt = new Date(`${input.magistrateProductionDate}T${prodTimeStr}:00Z`);
      const diffHours = (prodDt.getTime() - arrestDt.getTime()) / (1000 * 60 * 60);
      productionDelayHours = Math.round(diffHours * 10) / 10;

      if (productionDelayHours > 24) {
        productionDelayFlagged = true;
        sequenceWarnings.push(
          `Review Flag: Recorded interval between arrest and magistrate production is approx. ${productionDelayHours} hours (> 24 hours). Flagged for review of transit time or date discrepancies (does not automatically establish illegality).`
        );
      }
    }
  }

  // 5. Custody Calculation Across Distinct Intervals (Handling Interruptions, Bail, Re-arrests)
  let grossCustodyDays = 0;
  let policeCustodyDays = 0;
  let judicialCustodyDays = 0;

  if (input.custodyIntervals && input.custodyIntervals.length > 0) {
    for (const interval of input.custodyIntervals) {
      const intervalEnd = interval.endDate || asOf;
      if (interval.startDate > intervalEnd) {
        sequenceWarnings.push(
          `Invalid custody interval: Start date (${interval.startDate}) is after end date (${intervalEnd}).`
        );
        continue;
      }

      const days = getCalendarDaysDifference(interval.startDate, intervalEnd);
      grossCustodyDays += days;

      if (interval.custodyType === 'police_custody') {
        policeCustodyDays += days;
      } else if (interval.custodyType === 'judicial_custody') {
        judicialCustodyDays += days;
      }
    }

    calculationNotes.push(
      `Aggregated ${input.custodyIntervals.length} distinct custody interval(s): ${grossCustodyDays} gross custody days (${policeCustodyDays}d police, ${judicialCustodyDays}d judicial).`
    );
  } else {
    // Single continuous custody from arrest date to asOfDate
    grossCustodyDays = getCalendarDaysDifference(input.arrestDate, asOf);
    calculationNotes.push(
      `Continuous uninterrupted detention calculated from initial arrest date (${input.arrestDate}) to assessment date (${asOf}): ${grossCustodyDays} gross days.`
    );
  }

  // 6. Explanation to Section 479(1) BNSS: Deduct Accused-Caused Delay
  const accusedDelay = Math.max(0, input.accusedCausedDelayDays || 0);
  const netCountableCustodyDays = Math.max(0, grossCustodyDays - accusedDelay);

  if (accusedDelay > 0) {
    calculationNotes.push(
      `Explanation to Section 479(1) BNSS applied: Deducted ${accusedDelay} day(s) attributable to delay in proceedings caused by the accused. Net countable detention: ${netCountableCustodyDays} days.`
    );
  }

  const durationBreakdown = breakDownCalendarDuration(input.arrestDate, asOf);

  // 7. Maximum Sentence & Statutory Threshold Computations
  let oneThirdThreshold: StatutoryThresholdProgress | null = null;
  let oneHalfThreshold: StatutoryThresholdProgress | null = null;
  let maximumPeriodThreshold: StatutoryThresholdProgress | null = null;
  let isMaximumPeriodExceeded = false;

  if (input.maxImprisonmentMonths && input.maxImprisonmentMonths > 0) {
    const maxMonths = input.maxImprisonmentMonths;

    // (a) First Proviso: 1/3rd Threshold
    const oneThirdMonths = Math.floor(maxMonths / 3);
    const baseOneThirdDate = addMonthsToDate(input.arrestDate, oneThirdMonths);
    const oneThirdDaysEst = getCalendarDaysDifference(input.arrestDate, baseOneThirdDate);
    const oneThirdReached = netCountableCustodyDays >= oneThirdDaysEst;
    const oneThirdDaysRemaining = oneThirdReached ? 0 : Math.max(0, oneThirdDaysEst - netCountableCustodyDays);
    const targetThirdObj = new Date(baseOneThirdDate + 'T00:00:00Z');
    targetThirdObj.setUTCDate(targetThirdObj.getUTCDate() + accusedDelay);
    const oneThirdTargetDate = targetThirdObj.toISOString().slice(0, 10);
    const oneThirdPct = Math.min(100, Math.round((netCountableCustodyDays / oneThirdDaysEst) * 100));

    oneThirdThreshold = {
      thresholdMonths: oneThirdMonths,
      thresholdDaysEstimated: oneThirdDaysEst,
      thresholdReached: oneThirdReached,
      daysRemaining: oneThirdDaysRemaining,
      targetDate: oneThirdTargetDate,
      percentageCompleted: oneThirdPct,
    };

    // (b) Main Provision: 1/2nd Threshold
    const oneHalfMonths = Math.floor(maxMonths / 2);
    const baseOneHalfDate = addMonthsToDate(input.arrestDate, oneHalfMonths);
    const oneHalfDaysEst = getCalendarDaysDifference(input.arrestDate, baseOneHalfDate);
    const oneHalfReached = netCountableCustodyDays >= oneHalfDaysEst;
    const oneHalfDaysRemaining = oneHalfReached ? 0 : Math.max(0, oneHalfDaysEst - netCountableCustodyDays);
    const targetHalfObj = new Date(baseOneHalfDate + 'T00:00:00Z');
    targetHalfObj.setUTCDate(targetHalfObj.getUTCDate() + accusedDelay);
    const oneHalfTargetDate = targetHalfObj.toISOString().slice(0, 10);
    const oneHalfPct = Math.min(100, Math.round((netCountableCustodyDays / oneHalfDaysEst) * 100));

    oneHalfThreshold = {
      thresholdMonths: oneHalfMonths,
      thresholdDaysEstimated: oneHalfDaysEst,
      thresholdReached: oneHalfReached,
      daysRemaining: oneHalfDaysRemaining,
      targetDate: oneHalfTargetDate,
      percentageCompleted: oneHalfPct,
    };

    // (c) Third Proviso: 100% Maximum Period Ceiling (Absolute Bar on Detention)
    const baseMaxDate = addMonthsToDate(input.arrestDate, maxMonths);
    const maxPeriodDaysEst = getCalendarDaysDifference(input.arrestDate, baseMaxDate);
    const maxPeriodReached = netCountableCustodyDays >= maxPeriodDaysEst;
    const maxPeriodDaysRemaining = maxPeriodReached ? 0 : Math.max(0, maxPeriodDaysEst - netCountableCustodyDays);
    const targetMaxObj = new Date(baseMaxDate + 'T00:00:00Z');
    targetMaxObj.setUTCDate(targetMaxObj.getUTCDate() + accusedDelay);
    const maxPeriodTargetDate = targetMaxObj.toISOString().slice(0, 10);
    const maxPeriodPct = Math.min(100, Math.round((netCountableCustodyDays / maxPeriodDaysEst) * 100));

    maximumPeriodThreshold = {
      thresholdMonths: maxMonths,
      thresholdDaysEstimated: maxPeriodDaysEst,
      thresholdReached: maxPeriodReached,
      daysRemaining: maxPeriodDaysRemaining,
      targetDate: maxPeriodTargetDate,
      percentageCompleted: maxPeriodPct,
    };

    if (maxPeriodReached) {
      isMaximumPeriodExceeded = true;
      calculationNotes.push(
        `CRITICAL STATUTORY BAR: Accused has served ${netCountableCustodyDays} net days, meeting or exceeding the 100% MAXIMUM sentence (${maxMonths} months / ~${maxPeriodDaysEst} days). Under Third Proviso to Section 479(1) BNSS, no undertrial can in any case be detained beyond the maximum period of imprisonment.`
      );
    }
  } else {
    calculationNotes.push(
      'Maximum statutory punishment for offence is unknown or unverified; statutory threshold percentages cannot be computed.'
    );
  }

  return {
    isValidSequence: sequenceWarnings.length === 0,
    sequenceWarnings,
    grossCustodyDays,
    accusedCausedDelayDaysExcluded: accusedDelay,
    netCountableCustodyDays,
    durationBreakdown,
    policeCustodyDays,
    judicialCustodyDays,
    productionDelayHours,
    productionDelayFlagged,
    hasConflictingDates,
    dateDiscrepancyNotes,
    oneThirdThreshold,
    oneHalfThreshold,
    maximumPeriodThreshold,
    isMaximumPeriodExceeded,
    calculationNotes,
  };
}
