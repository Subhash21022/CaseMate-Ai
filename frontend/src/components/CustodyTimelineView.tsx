import React from 'react';
import type { ITimelineEvent, IEvidenceCitation } from '../types';
import { Calendar, AlertTriangle, CheckCircle2, FileText, ExternalLink, Milestone, ShieldAlert } from 'lucide-react';

interface CustodyTimelineViewProps {
  events: ITimelineEvent[];
  onSelectCitation: (citation: IEvidenceCitation) => void;
}

export const CustodyTimelineView: React.FC<CustodyTimelineViewProps> = ({
  events,
  onSelectCitation,
}) => {
  if (events.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          border: 'var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--slate-500)',
        }}
      >
        <Calendar size={32} style={{ margin: '0 auto 10px', color: 'var(--slate-400)' }} />
        <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No chronology extracted yet</p>
        <p style={{ fontSize: '0.78rem' }}>Upload case documents to reconstruct the undertrial custody timeline.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            Reconstructed Custody Timeline ({events.length} Events)
          </h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
            Verified chronological sequence from arrest to current judicial custody
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--blue-600)' }} />
            <span style={{ color: 'var(--slate-600)' }}>Confirmed Record</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
            <span style={{ color: 'var(--color-danger-text)', fontWeight: 600 }}>Date Discrepancy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
            <span style={{ color: 'var(--color-success-text)' }}>Statutory Milestone</span>
          </div>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-line" />

        {events.map((evt) => {
          const isConflict = evt.hasConflict;
          const isMilestone = evt.title.toLowerCase().includes('milestone') || evt.title.toLowerCase().includes('threshold');

          return (
            <div key={evt.eventId} className="timeline-event-item">
              <div
                className={`timeline-dot ${isConflict ? 'conflict' : isMilestone ? 'milestone' : ''}`}
              >
                {isConflict ? (
                  <AlertTriangle size={13} />
                ) : isMilestone ? (
                  <Milestone size={13} />
                ) : (
                  <CheckCircle2 size={13} />
                )}
              </div>

              <div className={`timeline-card ${isConflict ? 'conflict' : ''}`}>
                <div className="timeline-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="timeline-date">{evt.date || 'Date Unverified'}</span>
                    {evt.rawDateString && evt.rawDateString !== evt.date && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>
                        ({evt.rawDateString})
                      </span>
                    )}
                  </div>

                  {isConflict ? (
                    <span className="badge badge-restriction" style={{ fontSize: '0.68rem' }}>
                      <AlertTriangle size={11} /> Cross-Doc Conflict
                    </span>
                  ) : isMilestone ? (
                    <span className="badge badge-candidate" style={{ fontSize: '0.68rem' }}>
                      <Milestone size={11} /> Sec 479 Milestone
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {evt.custodyType || 'Custody Event'}
                    </span>
                  )}
                </div>

                <h5 className="timeline-title">{evt.title}</h5>
                <p className="timeline-desc">{evt.description}</p>

                {/* Conflict Callout Details */}
                {isConflict && evt.conflictDetails && (
                  <div className="conflict-callout">
                    <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Discrepancy:</strong> {evt.conflictDetails}
                    </div>
                  </div>
                )}

                {/* Citation Chip */}
                {evt.sourceDocumentName && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      className="citation-chip"
                      onClick={() =>
                        onSelectCitation({
                          documentName: evt.sourceDocumentName,
                          pageNumber: evt.sourcePage,
                          verbatimQuote: evt.sourceQuote || evt.description,
                          category: 'Timeline Chronology',
                        })
                      }
                      title="Inspect documentary evidence for this timestamp"
                    >
                      <FileText size={12} />
                      <span>{evt.sourceDocumentName} (pg {evt.sourcePage || 1})</span>
                      <ExternalLink size={11} style={{ marginLeft: '2px', opacity: 0.7 }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
