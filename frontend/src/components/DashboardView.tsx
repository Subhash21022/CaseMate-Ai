import React from 'react';
import type { ICase } from '../types';
import {
  Scale,
  FolderPlus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface DashboardViewProps {
  cases: ICase[];
  onOpenCase: (caseId: string) => void;
  onOpenNewCaseModal: () => void;
  onLoadQuickDemo: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  onOpenCase,
  onOpenNewCaseModal,
  onLoadQuickDemo,
}) => {
  return (
    <div className="page-content">
      {/* Header Bar */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Undertrial Review Workspace</h1>
          <p className="page-description">
            AI-assisted undertrial custody timeline reconstruction, date discrepancy detection, and Section 479 BNSS brief preparation for authorized legal aid reviewers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-demo btn-sm" onClick={onLoadQuickDemo}>
            <Sparkles size={15} /> Load Judging Demo Case
          </button>
          <button className="btn btn-primary btn-sm" onClick={onOpenNewCaseModal}>
            <FolderPlus size={15} /> New Case Review
          </button>
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Active Reviews</span>
            <span className="stat-value">{cases.length}</span>
            <span className="stat-subtext">Undertrial case workspaces</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-blue">
            <Scale size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Section 479 Candidates</span>
            <span className="stat-value" style={{ color: 'var(--color-success)' }}>
              1
            </span>
            <span className="stat-subtext">Met 1/3rd or 1/2nd milestone</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-emerald">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Discrepancies Flagged</span>
            <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
              2
            </span>
            <span className="stat-subtext">Date conflicts & multi-charges</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-red">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Avg Review Speed</span>
            <span className="stat-value">2.4m</span>
            <span className="stat-subtext">From upload to draft brief</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-amber">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Main Two Column Layout: Recent Case Queue & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left: Case Queue Table */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">
              <Scale size={18} color="var(--blue-600)" />
              Recent Undertrial Case Reviews
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              {cases.length} cases in queue
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="case-table">
              <thead>
                <tr>
                  <th>Case Title & Accused</th>
                  <th>Police Station / FIR</th>
                  <th>Status</th>
                  <th>Review Category</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const isRaju = c._id.includes('raju');
                  const isSuresh = c._id.includes('suresh');
                  const isVignesh = c._id.includes('vignesh');

                  return (
                    <tr key={c._id}>
                      <td>
                        <div
                          className="case-title-cell"
                          onClick={() => onOpenCase(c.demoId || c._id)}
                        >
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                          {c.accusedName || 'Undertrial accused'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.84rem', color: 'var(--slate-800)' }}>
                          {c.policeStation ? c.policeStation.split(',')[0] : 'Saidapet PS'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--slate-500)', fontFamily: 'var(--font-mono)' }}>
                          FIR: {c.firNumber || '104/2025'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {isRaju ? (
                          <span className="badge badge-candidate">
                            Potential 1/3rd Candidate
                          </span>
                        ) : isSuresh ? (
                          <span className="badge badge-restriction">
                            48h Conflict / Multi-Offence
                          </span>
                        ) : isVignesh ? (
                          <span className="badge badge-restriction">
                            Life/Death Exclusion
                          </span>
                        ) : (
                          <span className="badge badge-info">Under Review</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => onOpenCase(c.demoId || c._id)}
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          Review <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Real-time Audit & Activity Stream */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">
              <Clock size={18} color="var(--slate-600)" />
              Recent Audit Log
            </span>
          </div>
          <div className="section-card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                    Section 479(3) Mandate Triggered
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--slate-600)' }}>
                    Raju Kumar reached 12-month (1/3rd) milestone. Superintendent mandate generated.
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '2px' }}>
                    10 mins ago • Automated Rule Engine
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                    48h Timestamp Conflict Flagged
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--slate-600)' }}>
                    Discrepancy detected between FIR No. 215/2024 and Remand Application for Suresh Babu.
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '2px' }}>
                    45 mins ago • Cross-Doc Parser
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--blue-50)',
                    color: 'var(--blue-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                    Draft Review Brief Prepared
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--slate-600)' }}>
                    Deterministic custody summary compiled for Saidapet Magistrate presentation.
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '2px' }}>
                    1 hour ago • Report Generator
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Workflow helper */}
            <div
              style={{
                marginTop: '20px',
                padding: '14px',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--slate-200)',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '4px' }}>
                Judge Demonstration Sequence:
              </div>
              <ol style={{ fontSize: '0.74rem', color: 'var(--slate-600)', paddingLeft: '16px', lineHeight: '1.5' }}>
                <li>Click <strong>Load Judging Demo Case</strong></li>
                <li>Inspect <strong>Ingested Records & Facts</strong></li>
                <li>Review <strong>Custody Timeline</strong></li>
                <li>Check <strong>48h Discrepancy & Sec 479</strong></li>
                <li>Export <strong>Draft Legal-Aid Brief</strong></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
