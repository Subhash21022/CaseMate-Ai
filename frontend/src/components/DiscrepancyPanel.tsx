import React from 'react';
import type { IConflictItem, IMissingInformationItem, IEvidenceCitation } from '../types';
import { AlertTriangle, HelpCircle, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface DiscrepancyPanelProps {
  conflicts: IConflictItem[];
  missingInformation: IMissingInformationItem[];
  onSelectCitation: (citation: IEvidenceCitation) => void;
}

export const DiscrepancyPanel: React.FC<DiscrepancyPanelProps> = ({
  conflicts,
  missingInformation,
  onSelectCitation,
}) => {
  const hasItems = conflicts.length > 0 || missingInformation.length > 0;

  return (
    <div>
      {/* Overview Notice */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: conflicts.length > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          border: `1px solid ${conflicts.length > 0 ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        {conflicts.length > 0 ? (
          <AlertTriangle size={22} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
        ) : (
          <CheckCircle2 size={22} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
        )}
        <div>
          <h4
            style={{
              fontSize: '0.98rem',
              fontWeight: 700,
              color: conflicts.length > 0 ? 'var(--color-danger-text)' : 'var(--color-success-text)',
              marginBottom: '4px',
            }}
          >
            {conflicts.length > 0
              ? `${conflicts.length} Evidentiary Discrepanc${conflicts.length === 1 ? 'y' : 'ies'} Detected Across Case Documents`
              : 'Cross-Document Dates & Facts Are Consistent'}
          </h4>
          <p
            style={{
              fontSize: '0.84rem',
              color: conflicts.length > 0 ? 'var(--slate-700)' : 'var(--slate-600)',
              lineHeight: '1.45',
            }}
          >
            {conflicts.length > 0
              ? 'CustodyLens cross-referenced timestamps and statements across uploaded records. Contradictory entries require human reviewer verification before relying on computed custody totals.'
              : 'All primary timestamps (FIR, arrest memo, and magistrate remand) align without contradictory entries in the ingested evidence set.'}
          </p>
        </div>
      </div>

      {/* Conflicting Information Section */}
      {conflicts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h4
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--navy-900)',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={18} color="var(--color-danger)" />
            Documentary Contradictions & Date Variances
          </h4>

          {conflicts.map((conf) => (
            <div key={conf.conflictId} className="discrepancy-card">
              <div className="discrepancy-header">
                <span className="discrepancy-title">
                  <AlertTriangle size={18} /> {conf.issue}
                </span>
                <span className="badge badge-restriction">Unresolved Discrepancy</span>
              </div>

              {conf.resolutionNotes && (
                <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginBottom: '12px' }}>
                  <strong>Reviewer Guidance:</strong> {conf.resolutionNotes}
                </p>
              )}

              {/* Side by side comparison */}
              <div className="discrepancy-sources">
                <div className="source-box">
                  <div className="source-box-title">Source Record A</div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--slate-900)', marginBottom: '4px' }}>
                    {conf.documentA.name}
                  </div>
                  <div className="source-box-quote">"{conf.documentA.statement}"</div>
                  {conf.documentA.date && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--navy-900)', marginTop: '6px', fontWeight: 600 }}>
                      Documented Date: {conf.documentA.date}
                    </div>
                  )}
                  <button
                    className="citation-chip"
                    style={{ marginTop: '10px' }}
                    onClick={() =>
                      onSelectCitation({
                        documentName: conf.documentA.name,
                        verbatimQuote: conf.documentA.statement,
                        category: 'Conflict Analysis',
                      })
                    }
                  >
                    <FileText size={12} /> View Source Excerpt
                  </button>
                </div>

                <div className="source-box">
                  <div className="source-box-title">Source Record B (Contradictory)</div>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--slate-900)', marginBottom: '4px' }}>
                    {conf.documentB.name}
                  </div>
                  <div className="source-box-quote">"{conf.documentB.statement}"</div>
                  {conf.documentB.date && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-danger-text)', marginTop: '6px', fontWeight: 600 }}>
                      Documented Date: {conf.documentB.date}
                    </div>
                  )}
                  <button
                    className="citation-chip"
                    style={{ marginTop: '10px' }}
                    onClick={() =>
                      onSelectCitation({
                        documentName: conf.documentB.name,
                        verbatimQuote: conf.documentB.statement,
                        category: 'Conflict Analysis',
                      })
                    }
                  >
                    <FileText size={12} /> View Source Excerpt
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Missing Statutory Information Section */}
      <div>
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--navy-900)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <HelpCircle size={18} color="var(--color-warning)" />
          Missing Evidentiary Records & Unverified Statutory Fields
        </h4>

        {missingInformation.length === 0 ? (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#ffffff',
              border: 'var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              color: 'var(--slate-600)',
            }}
          >
            All critical procedural records (Arrest Memo, FIR, initial Remand Order) are present in the review dossier.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {missingInformation.map((item) => (
              <div
                key={item.itemId}
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#ffffff',
                  border: 'var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                      {item.category}: {item.description}
                    </span>
                    {item.isLegallyMandated && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--color-warning-text)',
                          backgroundColor: 'var(--color-warning-bg)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Mandated by {item.legalBasis || 'BNSS'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    Importance: <strong>{item.importance.toUpperCase()}</strong>
                  </div>
                </div>

                <span
                  className={`badge ${
                    item.status === 'missing' ? 'badge-restriction' : 'badge-pending'
                  }`}
                >
                  {item.status === 'missing' ? 'Record Missing' : 'Partially Provided'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
