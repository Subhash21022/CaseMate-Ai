import React from 'react';
import type { ISection479Assessment } from '../types';
import { Scale, CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

interface Section479ChecklistProps {
  assessment: ISection479Assessment;
}

export const Section479Checklist: React.FC<Section479ChecklistProps> = ({ assessment }) => {
  const {
    reviewCategory,
    categoryTitle,
    categorySummary,
    rules,
    jailSuperintendentMandate,
    recommendedLegalAidActions,
    statutoryDisclaimer,
  } = assessment;

  return (
    <div>
      {/* Category Header Banner */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor:
            reviewCategory === 'potential_review_candidate'
              ? 'var(--color-success-bg)'
              : reviewCategory === 'statutory_restriction_flagged'
              ? 'var(--color-danger-bg)'
              : 'var(--color-warning-bg)',
          border: `1px solid ${
            reviewCategory === 'potential_review_candidate'
              ? 'var(--color-success-border)'
              : reviewCategory === 'statutory_restriction_flagged'
              ? 'var(--color-danger-border)'
              : 'var(--color-warning-border)'
          }`,
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {reviewCategory === 'potential_review_candidate' ? (
              <CheckCircle2 size={24} color="var(--color-success)" />
            ) : reviewCategory === 'statutory_restriction_flagged' ? (
              <ShieldAlert size={24} color="var(--color-danger)" />
            ) : (
              <AlertTriangle size={24} color="var(--color-warning)" />
            )}
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              {categoryTitle}
            </h4>
          </div>

          <span
            className={`badge ${
              reviewCategory === 'potential_review_candidate'
                ? 'badge-candidate'
                : reviewCategory === 'statutory_restriction_flagged'
                ? 'badge-restriction'
                : 'badge-pending'
            }`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
          >
            {reviewCategory.toUpperCase().replace(/_/g, ' ')}
          </span>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--slate-700)', lineHeight: '1.5' }}>
          {categorySummary}
        </p>
      </div>

      {/* Jail Superintendent Section 479(3) Mandate Banner */}
      {jailSuperintendentMandate?.obligationTriggered && (
        <div className="mandate-banner">
          <div className="mandate-icon">
            <Scale size={24} />
          </div>
          <div className="mandate-content">
            <h4>Section 479(3) BNSS Statutory Mandate is ACTIVE</h4>
            <p>
              Under Section 479(3) of the Bharatiya Nagarik Suraksha Sanhita, 2023, where the accused has completed the statutory milestone, the <strong>Superintendent of Jail has an active legal obligation</strong> to forthwith make an application to the Court on behalf of the undertrial.
            </p>
            <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '6px' }}>
              • Recommended Action: DLSA Panel Advocate / Legal Aid Clinic should submit compliance requisition to Prison Superintendent.
            </div>
          </div>
        </div>
      )}

      {/* 8 Statutory Rules Evaluation Stepper */}
      <div style={{ marginBottom: '28px' }}>
        <h5 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '14px' }}>
          Statutory Rule Evaluation Checklist (BNSS Section 479)
        </h5>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rules?.map((rule) => {
            const isSatisfied = rule.status === 'satisfied';
            const isRestriction = rule.status === 'restriction_flagged';
            const isUnknown = rule.status === 'unknown';

            return (
              <div key={rule.ruleId} className="rule-check-item">
                <div className="rule-check-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="rule-check-name">{rule.ruleName}</span>
                    <span className="rule-ref-chip">{rule.statutoryReference}</span>
                  </div>

                  <span
                    className={`badge ${
                      isSatisfied
                        ? 'badge-candidate'
                        : isRestriction
                        ? 'badge-restriction'
                        : isUnknown
                        ? 'badge-neutral'
                        : 'badge-pending'
                    }`}
                  >
                    {isSatisfied ? 'Satisfied' : isRestriction ? 'Restriction Flagged' : isUnknown ? 'Unverified' : 'Not Reached'}
                  </span>
                </div>

                <div className="rule-finding">{rule.finding}</div>

                {rule.humanReviewNote && (
                  <div className="rule-human-note">
                    <Info size={14} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Human Review Note:</strong> {rule.humanReviewNote}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Legal Aid Actions */}
      {recommendedLegalAidActions && recommendedLegalAidActions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h5 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '12px' }}>
            Recommended Action Items for Defense Counsel / DLSA
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendedLegalAidActions.map((action, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  border: 'var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.86rem',
                  color: 'var(--slate-800)',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--blue-50)',
                    color: 'var(--blue-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </div>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statutory Disclaimer */}
      <div className="disclaimer-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <ShieldAlert size={16} />
          <strong>LEGAL ASSISTANCE BOUNDARY</strong>
        </div>
        <p>{statutoryDisclaimer}</p>
      </div>
    </div>
  );
};
