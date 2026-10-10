import React from 'react';
import { X, Download, Printer, ShieldAlert, CheckCircle2, Scale } from 'lucide-react';
import type { IFullCaseReview } from '../types';
import { ApiService } from '../services/api';

interface ReviewBriefModalProps {
  review: IFullCaseReview;
  onClose: () => void;
}

export const ReviewBriefModal: React.FC<ReviewBriefModalProps> = ({ review, onClose }) => {
  const { caseInfo, documents, custodyCalculations: calc, section479Assessment: sec, timelineEvents, conflicts, missingInformation } = review;

  const handleDownloadPdf = () => {
    // If backend is active and case is real, open backend PDF endpoint
    if (!caseInfo.isDemoCase && !caseInfo._id.startsWith('case_demo') && !caseInfo._id.startsWith('case_local')) {
      const url = ApiService.getPdfReportUrl(caseInfo._id);
      window.open(url, '_blank');
    } else {
      // For synthetic demo cases or local preview, trigger print to PDF
      window.print();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '900px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--navy-900)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Scale size={20} />
            </div>
            <div>
              <h3 className="modal-title">Draft Undertrial Detention Review Brief</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                Prepared for Authorized Human Review under Section 479 BNSS (2023)
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={handleDownloadPdf}>
              <Download size={15} /> Download PDF
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--slate-400)',
                cursor: 'pointer',
                padding: '4px',
                marginLeft: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '32px' }}>
          <div className="brief-paper">
            {/* Header */}
            <div className="brief-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 className="brief-title">CustodyLens 479</h1>
                  <p className="brief-subtitle">AI-Assisted Undertrial Detention Review Brief</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--slate-100)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      color: 'var(--slate-700)',
                    }}
                  >
                    DRAFT FOR LEGAL-AID COUNSEL
                  </span>
                  <p style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                    Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 1: Case Overview */}
            <div>
              <h3 className="brief-section-title">1. Case Overview & Identification</h3>
              <table style={{ width: '100%', fontSize: '0.86rem', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--slate-500)', width: '32%' }}>Case Title:</td>
                    <td style={{ padding: '6px 0', fontWeight: 600, color: 'var(--slate-900)' }}>{caseInfo.title}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--slate-500)' }}>Accused Identity:</td>
                    <td style={{ padding: '6px 0', color: 'var(--slate-800)' }}>{caseInfo.accusedName || 'As documented in FIR'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--slate-500)' }}>Police Station & FIR:</td>
                    <td style={{ padding: '6px 0', color: 'var(--slate-800)' }}>
                      {caseInfo.policeStation || 'Jurisdictional PS'} | FIR No. {caseInfo.firNumber || '104/2025'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 0', color: 'var(--slate-500)' }}>Ingested Evidence Files:</td>
                    <td style={{ padding: '6px 0', color: 'var(--slate-800)' }}>
                      {documents.map((d) => d.originalFilename).join(', ')} ({documents.length} verified records)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Section 479 Assessment */}
            {sec && (
              <div>
                <h3 className="brief-section-title">2. Section 479 BNSS (2023) Statutory Evaluation</h3>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor:
                      sec.reviewCategory === 'potential_review_candidate'
                        ? 'var(--color-success-bg)'
                        : sec.reviewCategory === 'statutory_restriction_flagged'
                        ? 'var(--color-danger-bg)'
                        : 'var(--color-warning-bg)',
                    border: `1px solid ${
                      sec.reviewCategory === 'potential_review_candidate'
                        ? 'var(--color-success-border)'
                        : sec.reviewCategory === 'statutory_restriction_flagged'
                        ? 'var(--color-danger-border)'
                        : 'var(--color-warning-border)'
                    }`,
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--slate-900)' }}>
                      Classification: {sec.categoryTitle}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--slate-700)', lineHeight: '1.45' }}>
                    {sec.categorySummary}
                  </p>
                </div>

                {sec.jailSuperintendentMandate?.obligationTriggered && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--navy-900)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={16} color="#38bdf8" />
                    <span>
                      <strong>Section 479(3) Mandate Active:</strong> Jail Superintendent has a statutory duty to make an application to the Court forthwith.
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {sec.rules?.map((rule) => (
                    <div
                      key={rule.ruleId}
                      style={{
                        padding: '10px 14px',
                        border: 'var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{rule.ruleName}</span>
                        <span
                          className={`badge ${
                            rule.status === 'satisfied'
                              ? 'badge-candidate'
                              : rule.status === 'restriction_flagged'
                              ? 'badge-restriction'
                              : 'badge-pending'
                          }`}
                        >
                          {rule.status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      <p style={{ color: 'var(--slate-600)', margin: '2px 0' }}>{rule.finding}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Custody Calculation Breakdown */}
            {calc && (
              <div>
                <h3 className="brief-section-title">3. Deterministic Custody Computation</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    padding: '14px',
                    backgroundColor: 'var(--slate-50)',
                    border: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                      Net Countable Custody
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--navy-900)', fontFamily: 'var(--font-mono)' }}>
                      {calc.netCountableCustodyDays} days
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--slate-600)' }}>
                      {calc.durationBreakdown.years}y {calc.durationBreakdown.months}m {calc.durationBreakdown.days}d
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                      Gross Detention
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-700)', fontFamily: 'var(--font-mono)' }}>
                      {calc.grossCustodyDays} days
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                      Police: {calc.policeCustodyDays}d | Judicial: {calc.judicialCustodyDays}d
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                      Accused-Caused Delay
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-700)', fontFamily: 'var(--font-mono)' }}>
                      {calc.accusedCausedDelayDaysExcluded} days
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                      Sec 479(1) Expl. Deduction
                    </div>
                  </div>
                </div>

                <ul style={{ fontSize: '0.82rem', color: 'var(--slate-600)', paddingLeft: '20px', marginBottom: '16px' }}>
                  {calc.calculationNotes?.map((note, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 4: Discrepancies & Conflicts */}
            {conflicts.length > 0 && (
              <div>
                <h3 className="brief-section-title" style={{ color: 'var(--color-danger)' }}>
                  4. Cross-Document Discrepancies Flagged
                </h3>
                {conflicts.map((conf) => (
                  <div
                    key={conf.conflictId}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-danger-bg)',
                      border: '1px solid var(--color-danger-border)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--color-danger-text)', fontSize: '0.88rem' }}>
                      {conf.issue}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-700)', marginTop: '6px' }}>
                      <div>• Source A ({conf.documentA.name}): "{conf.documentA.statement}"</div>
                      <div>• Source B ({conf.documentB.name}): "{conf.documentB.statement}"</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section 5: Recommended Legal-Aid Actions */}
            {sec?.recommendedLegalAidActions && sec.recommendedLegalAidActions.length > 0 && (
              <div>
                <h3 className="brief-section-title">5. Recommended Next Steps for Legal-Aid Counsel</h3>
                <ul style={{ fontSize: '0.85rem', color: 'var(--slate-800)', paddingLeft: '20px', marginBottom: '16px' }}>
                  {sec.recommendedLegalAidActions.map((act, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>
                      {act}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 6: Legal & Ethical Disclaimer */}
            <div className="disclaimer-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldAlert size={16} />
                <strong>MANDATORY LEGAL & ETHICAL NOTICE</strong>
              </div>
              <p>
                {review.safetyDisclaimer ||
                  'CustodyLens 479 is an AI-assisted administrative document review platform for authorized legal-aid practitioners and DLSA. It does not provide legal advice, judicial adjudication, or guaranteed release outcomes. All calculations, statutory thresholds, and evidentiary citations must be independently reviewed and verified by an enrolled advocate before submission to a court of law.'}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close Preview
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf}>
            <Download size={15} /> Export PDF Brief
          </button>
        </div>
      </div>
    </div>
  );
};
