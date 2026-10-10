import React from 'react';
import { X, FileText, CheckCircle2, Quote } from 'lucide-react';
import type { IEvidenceCitation } from '../types';

interface EvidenceModalProps {
  citation: IEvidenceCitation | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--blue-50)',
                color: 'var(--blue-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h3 className="modal-title">Source Evidence Citation</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                Verifiable documentary extract from case record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--slate-400)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--slate-500)',
              }}
            >
              Primary Source File
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'var(--slate-50)',
                border: 'var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                marginTop: '4px',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '0.9rem' }}>
                {citation.documentName}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  padding: '2px 8px',
                  backgroundColor: 'var(--blue-100)',
                  color: 'var(--blue-700)',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                Page {citation.pageNumber || 1}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Quote size={16} color="var(--blue-600)" />
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--slate-500)',
                }}
              >
                Verbatim Extracted Excerpt
              </span>
            </div>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--blue-200)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                color: 'var(--slate-800)',
                boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
              }}
            >
              "{citation.verbatimQuote}"
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CheckCircle2 size={18} color="var(--color-success)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--color-success-text)' }}>
              Source Verified: Extracted fact is directly grounded in uploaded documentary record.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close Citation
          </button>
        </div>
      </div>
    </div>
  );
};
