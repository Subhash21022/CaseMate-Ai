/**
 * CustodyLens 479 — Deterministic Custody Duration Calculator
 * 
 * Independent, pure calculation service for undertrial custody computation.
 * Strictly deterministic (no LLM involvement in arithmetic or date interval logic).
 * Implements calendar-aware duration arithmetic accounting for leap years,
 * statutory Section 479 BNSS thresholds (1/3rd first-offender proviso and 1/2nd general rule).
 */

export interface RemandInterval {
  intervalId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  custodyType: 'police_custody' | 'judicial_custody';
  sourceDocumentName?: string;
}

export interface CustodyCalculationInput {
  arrestDate: string | null;           // YYYY-MM-DD
  arrestTime?: string | null;          // HH:mm
  magistrateProductionDate?: string | null; // YYYY-MM-DD
  magistrateProductionTime?: string | null; // HH:mm
  remandIntervals?: RemandInterval[];
  asOfDate?: string;                   // Reference date for review (default: today)
  maxImprisonmentMonths?: number | null; // Statutory maximum sentence for offence
  isFirstOffender?: boolean | null;    // null if unknown
  hasLifeOrDeathOffence?: boolean;     // Section 479(2) exclusion check
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
  totalCustodyDays: number;
  durationBreakdown: CustodyDurationBreakdown;
  policeCustodyDays: number;
  judicialCustodyDays: number;
  productionDelayHours?: number | null;
  productionDelayFlagged: boolean;
  
  // Section 479 BNSS metrics
  oneThirdThreshold: StatutoryThresholdProgress | null;
  oneHalfThreshold: StatutoryThresholdProgress | null;
  
  status: 
    | 'threshold_reached_one_third'
    | 'threshold_reached_one_half'
    | 'in_progress_threshold_not_reached'
    | 'excluded_life_or_death'
    | 'undetermined_missing_arrest_date'
    | 'undetermined_missing_max_sentence';
    
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
 * Breaks total calendar days into years, months, and days relative to a starting date.
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
    // Get days in the previous month
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
    d.setUTCDate(0); // set to last day of target month
  }
  
  return d.toISOString().slice(0, 10);
}

/**
 * Main deterministic custody calculator for CustodyLens 479
 */
export function calculateDetentionDuration(input: CustodyCalculationInput): CustodyCalculationResult {
  const sequenceWarnings: string[] = [];
  const calculationNotes: string[] = [];
  const asOf = input.asOfDate || new Date().toISOString().slice(0, 10);

  // 1. Arrest date check
  if (!input.arrestDate) {
    return {
      isValidSequence: false,
      sequenceWarnings: ['Arrest date is missing. Detention duration cannot be calculated without confirmed initial custody date.'],
      totalCustodyDays: 0,
      durationBreakdown: { years: 0, months: 0, days: 0, totalDays: 0 },
      policeCustodyDays: 0,
      judicialCustodyDays: 0,
      productionDelayHours: null,
      productionDelayFlagged: false,
      oneThirdThreshold: null,
      oneHalfThreshold: null,
      status: 'undetermined_missing_arrest_date',
      calculationNotes: ['Please upload or verify the Arrest Memo or Remand Application to confirm the date of arrest.'],
    };
  }

  // 2. Validate arrest date not in future relative to asOfDate
  if (input.arrestDate > asOf) {
    sequenceWarnings.push(`Arrest date (${input.arrestDate}) is after evaluation date (${asOf}). Sequence invalid.`);
    return {
      isValidSequence: false,
      sequenceWarnings,
      totalCustodyDays: 0,
      durationBreakdown: { years: 0, months: 0, days: 0, totalDays: 0 },
      policeCustodyDays: 0,
      judicialCustodyDays: 0,
      productionDelayHours: null,
      productionDelayFlagged: false,
      oneThirdThreshold: null,
      oneHalfThreshold: null,
      status: 'undetermined_missing_arrest_date',
      calculationNotes: ['Arrest date cannot be in the future.'],
    };
  }

  // 3. Magistrate 24-hour production check (Art. 22(2) Constitution / Sec 57 CrPC / Sec 58 BNSS)
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
          `Review Flag: Recorded interval between arrest and magistrate production is approx. ${productionDelayHours} hours (> 24 hours). Flagged for reviewer check of transit time or date discrepancies.`
        );
      }
    }
  }

  // 4. Calculate total custody period from arrest date to asOf date
  const totalCustodyDays = getCalendarDaysDifference(input.arrestDate, asOf);
  const durationBreakdown = breakDownCalendarDuration(input.arrestDate, asOf);
  calculationNotes.push(
    `Uninterrupted detention calculated from recorded arrest date (${input.arrestDate}) to assessment date (${asOf}): ${durationBreakdown.years} year(s), ${durationBreakdown.months} month(s), ${durationBreakdown.days} day(s) (${totalCustodyDays} total days).`
  );

  // 5. Custody Breakdown by Remand Intervals (Police vs Judicial Custody)
  let policeCustodyDays = 0;
  let judicialCustodyDays = 0;

  if (input.remandIntervals && input.remandIntervals.length > 0) {
    for (const interval of input.remandIntervals) {
      if (interval.startDate > interval.endDate) {
        sequenceWarnings.push(
          `Invalid remand period: Start date (${interval.startDate}) is after end date (${interval.endDate}).`
        );
        continue;
      }
      const days = getCalendarDaysDifference(interval.startDate, interval.endDate);
      if (interval.custodyType === 'police_custody') {
        policeCustodyDays += days;
      } else {
        judicialCustodyDays += days;
      }
    }
    calculationNotes.push(
      `Recorded remand intervals account for ${policeCustodyDays} days Police Custody and ${judicialCustodyDays} days Judicial Custody.`
    );
  } else {
    // If specific remand intervals are not recorded separately, entire custody post-arrest is treated as general custody
    calculationNotes.push(
      'Detailed itemized remand orders not provided; continuous detention calculated from initial arrest.'
    );
  }

  // 6. Section 479(2) Exclusion Check (Death or Life Imprisonment offences)
  if (input.hasLifeOrDeathOffence) {
    return {
      isValidSequence: sequenceWarnings.length === 0,
      sequenceWarnings,
      totalCustodyDays,
      durationBreakdown,
      policeCustodyDays,
      judicialCustodyDays,
      productionDelayHours,
      productionDelayFlagged,
      oneThirdThreshold: null,
      oneHalfThreshold: null,
      status: 'excluded_life_or_death',
      calculationNotes: [
        ...calculationNotes,
        'CRITICAL EXCLUSION: Section 479(2) BNSS explicitly excludes offences where death or imprisonment for life is specified as one of the punishments. Statutory bail review threshold is not applicable under Section 479.',
      ],
    };
  }

  // 7. Maximum Punishment Check
  if (!input.maxImprisonmentMonths || input.maxImprisonmentMonths <= 0) {
    return {
      isValidSequence: sequenceWarnings.length === 0,
      sequenceWarnings,
      totalCustodyDays,
      durationBreakdown,
      policeCustodyDays,
      judicialCustodyDays,
      productionDelayHours,
      productionDelayFlagged,
      oneThirdThreshold: null,
      oneHalfThreshold: null,
      status: 'undetermined_missing_max_sentence',
      calculationNotes: [
        ...calculationNotes,
        'Statutory maximum punishment for the stated offences is unknown or unverified. Section 479 BNSS proportion cannot be determined without maximum sentence.',
      ],
    };
  }

  const maxMonths = input.maxImprisonmentMonths;
  
  // Section 479(1) First Proviso: One-Third (1/3) for First-Time Offenders
  const oneThirdMonths = Math.floor(maxMonths / 3);
  const oneThirdTargetDate = addMonthsToDate(input.arrestDate, oneThirdMonths);
  const oneThirdDaysEst = getCalendarDaysDifference(input.arrestDate, oneThirdTargetDate);
  const oneThirdReached = asOf >= oneThirdTargetDate;
  const oneThirdDaysRemaining = oneThirdReached ? 0 : Math.max(0, getCalendarDaysDifference(asOf, oneThirdTargetDate));
  const oneThirdPct = Math.min(100, Math.round((totalCustodyDays / oneThirdDaysEst) * 100));

  const oneThirdThreshold: StatutoryThresholdProgress = {
    thresholdMonths: oneThirdMonths,
    thresholdDaysEstimated: oneThirdDaysEst,
    thresholdReached: oneThirdReached,
    daysRemaining: oneThirdDaysRemaining,
    targetDate: oneThirdTargetDate,
    percentageCompleted: oneThirdPct,
  };

  // Section 479(1) Main Provision: One-Half (1/2) for Standard Undertrials
  const oneHalfMonths = Math.floor(maxMonths / 2);
  const oneHalfTargetDate = addMonthsToDate(input.arrestDate, oneHalfMonths);
  const oneHalfDaysEst = getCalendarDaysDifference(input.arrestDate, oneHalfTargetDate);
  const oneHalfReached = asOf >= oneHalfTargetDate;
  const oneHalfDaysRemaining = oneHalfReached ? 0 : Math.max(0, getCalendarDaysDifference(asOf, oneHalfTargetDate));
  const oneHalfPct = Math.min(100, Math.round((totalCustodyDays / oneHalfDaysEst) * 100));

  const oneHalfThreshold: StatutoryThresholdProgress = {
    thresholdMonths: oneHalfMonths,
    thresholdDaysEstimated: oneHalfDaysEst,
    thresholdReached: oneHalfReached,
    daysRemaining: oneHalfDaysRemaining,
    targetDate: oneHalfTargetDate,
    percentageCompleted: oneHalfPct,
  };

  // 8. Determine Overall Status
  let status: CustodyCalculationResult['status'] = 'in_progress_threshold_not_reached';

  if (oneHalfReached) {
    status = 'threshold_reached_one_half';
    calculationNotes.push(
      `STATUTORY THRESHOLD REACHED: Accused has served ${totalCustodyDays} days, exceeding the 1/2 threshold (${oneHalfMonths} months / ~${oneHalfDaysEst} days, reached on ${oneHalfTargetDate}) under Section 479(1) BNSS.`
    );
  } else if (oneThirdReached && input.isFirstOffender === true) {
    status = 'threshold_reached_one_third';
    calculationNotes.push(
      `FIRST-OFFENDER PROVISO REACHED: Accused has served ${totalCustodyDays} days, exceeding the 1/3 threshold (${oneThirdMonths} months / ~${oneThirdDaysEst} days, reached on ${oneThirdTargetDate}) under the First Proviso to Section 479(1) BNSS.`
    );
  } else if (oneThirdReached && input.isFirstOffender === null) {
    calculationNotes.push(
      `NOTE: 1/3 duration threshold was reached on ${oneThirdTargetDate}. Accused may be a review candidate IF verified as a first-time offender (no prior convictions). Conviction history verification required.`
    );
  } else {
    calculationNotes.push(
      `Under trial detention in progress. 1/3 threshold date: ${oneThirdTargetDate} (${oneThirdDaysRemaining} days remaining); 1/2 threshold date: ${oneHalfTargetDate} (${oneHalfDaysRemaining} days remaining).`
    );
  }

  return {
    isValidSequence: sequenceWarnings.length === 0,
    sequenceWarnings,
    totalCustodyDays,
    durationBreakdown,
    policeCustodyDays,
    judicialCustodyDays,
    productionDelayHours,
    productionDelayFlagged,
    oneThirdThreshold,
    oneHalfThreshold,
    status,
    calculationNotes,
  };
}
