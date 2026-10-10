import React from 'react';
import {
  Scale,
  LayoutDashboard,
  FolderKanban,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { DEMO_CASES } from '../data/demoCases';

interface SidebarProps {
  currentView: 'dashboard' | 'workspace' | 'rules';
  activeCaseId: string | null;
  onNavigate: (view: 'dashboard' | 'workspace' | 'rules') => void;
  onSelectCase: (caseId: string) => void;
  isBackendConnected: boolean | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeCaseId,
  onNavigate,
  onSelectCase,
  isBackendConnected,
}) => {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Scale size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-title">CustodyLens</span>
            <span className="brand-badge">479</span>
          </div>
          <div className="brand-subtitle">Undertrial Detention Review</div>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="sidebar-nav">
        <div className="nav-section-label">Core Navigation</div>

        <div
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Overview Dashboard</span>
        </div>

        <div
          className={`nav-item ${currentView === 'workspace' ? 'active' : ''}`}
          onClick={() => onNavigate('workspace')}
        >
          <FolderKanban size={18} />
          <span>Case Review Workspace</span>
          {activeCaseId && (
            <span className="nav-badge" style={{ backgroundColor: 'var(--blue-600)' }}>
              Active
            </span>
          )}
        </div>

        {/* Demo Cases Section */}
        <div className="nav-section-label" style={{ marginTop: '12px' }}>
          Prepared Demo Cases
        </div>

        {DEMO_CASES.map((d) => {
          const isSelected = activeCaseId === (d.caseInfo.demoId || d.caseInfo._id);
          const shortName = d.caseInfo.accusedName?.split('(')[0]?.trim() || d.caseInfo.title;

          return (
            <div
              key={d.caseInfo._id}
              className={`nav-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectCase(d.caseInfo.demoId || d.caseInfo._id)}
              style={{ fontSize: '0.82rem', padding: '8px 12px' }}
            >
              <FileCheck size={16} color={isSelected ? '#60a5fa' : 'var(--slate-400)'} />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {shortName}
              </span>
            </div>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: '12px' }}>
          Statutory Standards
        </div>

        <div
          className="nav-item"
          onClick={() => alert('BNSS Section 479 Rule Engine v2.0 is actively compiled into the review workspace.')}
        >
          <ShieldCheck size={18} />
          <span>BNSS 479 Legal Rules</span>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="sidebar-footer">
        <div className="system-status-indicator">
          <span className={`status-dot ${isBackendConnected === false ? 'offline' : ''}`} />
          <span>
            {isBackendConnected === true
              ? 'Backend API Connected (Port 5000)'
              : isBackendConnected === false
              ? 'Deterministic Demo Mode Active'
              : 'Checking API Status...'}
          </span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--slate-400)', lineHeight: '1.3' }}>
          GDG Chennai DevFest 2026<br />Courts & Legal Aid Track
        </div>
      </div>
    </aside>
  );
};
