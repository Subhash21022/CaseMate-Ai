import React, { useState } from 'react';
import { X, Sparkles, FolderPlus } from 'lucide-react';
import { DEMO_CASES } from '../data/demoCases';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCase: (title: string, category: string) => void;
  onSelectDemoCase: (demoId: string) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({
  isOpen,
  onClose,
  onCreateCase,
  onSelectDemoCase,
}) => {
  const [caseTitle, setCaseTitle] = useState('');
  const [caseCategory, setCaseCategory] = useState('Section 479 BNSS Undertrial Detention Review');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle.trim()) return;
    onCreateCase(caseTitle, caseCategory);
    setCaseTitle('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
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
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="modal-title">New Case Review</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                Initialize a legal-aid workspace or load prepared synthetic demo case
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
          {/* Quick Demo Cases for Judges */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--blue-600)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} /> Recommended Hackathon Demo Cases
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>Synthetic Data</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DEMO_CASES.map((d, index) => (
                <div
                  key={d.caseInfo._id}
                  onClick={() => {
                    onSelectDemoCase(d.caseInfo.demoId || d.caseInfo._id);
                    onClose();
                  }}
                  style={{
                    padding: '14px 16px',
                    border: index === 0 ? '2px solid var(--blue-500)' : '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: index === 0 ? 'var(--blue-50)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                      {d.caseInfo.title}
                    </span>
                    <span
                      className={`badge ${
                        d.section479Assessment?.reviewCategory === 'potential_review_candidate'
                          ? 'badge-candidate'
                          : 'badge-restriction'
                      }`}
                    >
                      {d.section479Assessment?.categoryTitle.split('—')[0] || 'Demo'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--slate-600)', marginTop: '4px' }}>
                    {d.summary.slice(0, 140)}...
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--slate-200)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>
              Or Create Blank Case Workspace
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--slate-200)' }} />
          </div>

          {/* Form to create custom case */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  marginBottom: '6px',
                }}
              >
                Case Title / Accused Name *
              </label>
              <input
                type="text"
                placeholder="e.g. State vs. Ramesh (Crime No. 45/2025)"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  marginBottom: '6px',
                }}
              >
                Review Track & Statutory Classification
              </label>
              <select
                value={caseCategory}
                onChange={(e) => setCaseCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  fontSize: '0.88rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="Section 479 BNSS Undertrial Detention Review">
                  Section 479 BNSS Undertrial Detention Review (1/3rd / 1/2nd Period)
                </option>
                <option value="Magistrate 24-Hour Production Verification">
                  Magistrate 24-Hour Production & Remand Review
                </option>
                <option value="Statutory Maximum Period Ceiling (Third Proviso)">
                  Statutory Maximum Period Ceiling (100% Sentence Bar)
                </option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!caseTitle.trim()}
                style={{ opacity: caseTitle.trim() ? 1 : 0.6 }}
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
