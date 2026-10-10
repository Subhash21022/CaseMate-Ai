import React from 'react';
import type { ICustodyCalculationResult } from '../types';
import { Clock } from 'lucide-react';

interface CustodyCalculationCardProps {
  calculation: ICustodyCalculationResult;
}

export const CustodyCalculationCard: React.FC<CustodyCalculationCardProps> = ({ calculation }) => {
  const {
    netCountableCustodyDays,
    grossCustodyDays,
    accusedCausedDelayDaysExcluded,
    durationBreakdown,
    policeCustodyDays,
    judicialCustodyDays,
    productionDelayHours,
    productionDelayFlagged,
    oneThirdThreshold,
    oneHalfThreshold,
    maximumPeriodThreshold,
    isMaximumPeriodExceeded,
    calculationNotes,
  } = calculation;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
          Deterministic Custody Duration Calculation
        </h4>
        <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
          Pure algorithmic calendar-aware arithmetic accounting for statutory deductions under Explanation to Section 479(1) BNSS
        </p>
      </div>

      {/* Main KPI Stat Boxes */}
      <div className="calc-summary-grid">
        <div className="calc-stat-box" style={{ backgroundColor: 'var(--blue-50)', borderColor: 'var(--blue-200)' }}>
          <div className="calc-stat-title" style={{ color: 'var(--blue-700)' }}>Net Countable Custody</div>
          <div className="calc-stat-num" style={{ color: 'var(--blue-700)' }}>{netCountableCustodyDays}</div>
          <div className="calc-stat-sub" style={{ fontWeight: 600 }}>
            {durationBreakdown.years}y {durationBreakdown.months}m {durationBreakdown.days}d
          </div>
        </div>

        <div className="calc-stat-box">
          <div className="calc-stat-title">Gross Total Custody</div>
          <div className="calc-stat-num">{grossCustodyDays}</div>
          <div className="calc-stat-sub">Calendar Days Elapsed</div>
        </div>

        <div className="calc-stat-box">
          <div className="calc-stat-title">Accused-Caused Delay</div>
          <div className="calc-stat-num" style={{ color: accusedCausedDelayDaysExcluded > 0 ? 'var(--color-warning)' : 'inherit' }}>
            {accusedCausedDelayDaysExcluded}
          </div>
          <div className="calc-stat-sub">Sec 479(1) Expl. Deduction</div>
        </div>

        <div className="calc-stat-box">
          <div className="calc-stat-title">Custody Split</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy-900)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {policeCustodyDays}d PC / {judicialCustodyDays}d JC
          </div>
          <div className="calc-stat-sub">Police vs. Judicial Custody</div>
        </div>
      </div>

      {/* 24-Hour Magistrate Production Check */}
      {productionDelayHours !== null && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: productionDelayFlagged ? 'var(--color-danger-bg)' : 'var(--slate-50)',
            border: `1px solid ${productionDelayFlagged ? 'var(--color-danger-border)' : 'var(--slate-200)'}`,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color={productionDelayFlagged ? 'var(--color-danger)' : 'var(--blue-600)'} />
            <div>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                Arrest to First Magistrate Production Interval: {productionDelayHours} hours
              </span>
              <p style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                Article 22(2) Constitution / Section 58 BNSS 24-Hour Production Mandate
              </p>
            </div>
          </div>
          <span className={`badge ${productionDelayFlagged ? 'badge-restriction' : 'badge-candidate'}`}>
            {productionDelayFlagged ? 'Exceeds 24h Threshold' : 'Complies with 24h Limit'}
          </span>
        </div>
      )}

      {/* Statutory Thresholds Progress */}
      <div style={{ marginBottom: '24px' }}>
        <h5 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '14px' }}>
          Section 479 BNSS Statutory Threshold Trajectory
        </h5>

        {/* 1/3rd First-Offender Milestone */}
        {oneThirdThreshold && (
          <div className="threshold-card">
            <div className="threshold-header">
              <div>
                <span className="threshold-name">First-Time Offender 1/3rd Milestone (First Proviso)</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Requires 1/3 of maximum sentence ({oneThirdThreshold.thresholdMonths} months / ~{oneThirdThreshold.thresholdDaysEstimated} days)
                </p>
              </div>
              <span className={`badge ${oneThirdThreshold.thresholdReached ? 'badge-candidate' : 'badge-pending'}`}>
                {oneThirdThreshold.thresholdReached ? '1/3rd Threshold Reached' : `${oneThirdThreshold.daysRemaining} Days Remaining`}
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${oneThirdThreshold.thresholdReached ? 'completed' : ''}`}
                style={{ width: `${oneThirdThreshold.percentageCompleted}%` }}
              />
            </div>
            <div className="progress-labels">
              <span>Progress: {oneThirdThreshold.percentageCompleted}% ({netCountableCustodyDays}/{oneThirdThreshold.thresholdDaysEstimated} days)</span>
              <span>Target Milestone Date: <strong>{oneThirdThreshold.targetDate || 'TBD'}</strong></span>
            </div>
          </div>
        )}

        {/* 1/2nd General Undertrial Milestone */}
        {oneHalfThreshold && (
          <div className="threshold-card">
            <div className="threshold-header">
              <div>
                <span className="threshold-name">General Undertrial 1/2nd Milestone (Main Provision)</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Requires 1/2 of maximum sentence ({oneHalfThreshold.thresholdMonths} months / ~{oneHalfThreshold.thresholdDaysEstimated} days)
                </p>
              </div>
              <span className={`badge ${oneHalfThreshold.thresholdReached ? 'badge-candidate' : 'badge-pending'}`}>
                {oneHalfThreshold.thresholdReached ? '1/2nd Threshold Reached' : `${oneHalfThreshold.daysRemaining} Days Remaining`}
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${oneHalfThreshold.thresholdReached ? 'completed' : ''}`}
                style={{ width: `${oneHalfThreshold.percentageCompleted}%` }}
              />
            </div>
            <div className="progress-labels">
              <span>Progress: {oneHalfThreshold.percentageCompleted}% ({netCountableCustodyDays}/{oneHalfThreshold.thresholdDaysEstimated} days)</span>
              <span>Target Milestone Date: <strong>{oneHalfThreshold.targetDate || 'TBD'}</strong></span>
            </div>
          </div>
        )}

        {/* 100% Maximum Period Bar */}
        {maximumPeriodThreshold && (
          <div className="threshold-card" style={isMaximumPeriodExceeded ? { borderColor: 'var(--color-danger)' } : {}}>
            <div className="threshold-header">
              <div>
                <span className="threshold-name" style={isMaximumPeriodExceeded ? { color: 'var(--color-danger-text)' } : {}}>
                  Absolute Maximum Period Ceiling (Third Proviso 100% Limit)
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Absolute statutory bar: No undertrial can be detained beyond 100% of maximum punishment ({maximumPeriodThreshold.thresholdMonths} months)
                </p>
              </div>
              <span className={`badge ${isMaximumPeriodExceeded ? 'badge-restriction' : 'badge-neutral'}`}>
                {isMaximumPeriodExceeded ? 'MAX PERIOD VIOLATION' : `${maximumPeriodThreshold.daysRemaining} Days Remaining`}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${maximumPeriodThreshold.percentageCompleted}%`,
                  backgroundColor: isMaximumPeriodExceeded ? 'var(--color-danger)' : 'var(--blue-600)',
                }}
              />
            </div>
            <div className="progress-labels">
              <span>Progress: {maximumPeriodThreshold.percentageCompleted}% ({netCountableCustodyDays}/{maximumPeriodThreshold.thresholdDaysEstimated} days)</span>
              <span>100% Maximum Limit Date: <strong>{maximumPeriodThreshold.targetDate || 'TBD'}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Deterministic Calculation Notes */}
      <div style={{ padding: '14px 18px', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: 'var(--border-subtle)' }}>
        <h6 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-600)', marginBottom: '6px' }}>
          Calculation Engine Notes
        </h6>
        <ul style={{ fontSize: '0.8rem', color: 'var(--slate-700)', paddingLeft: '18px' }}>
          {calculationNotes.map((note, idx) => (
            <li key={idx} style={{ marginBottom: '3px' }}>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
