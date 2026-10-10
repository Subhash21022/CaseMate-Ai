import React from 'react';
import { Sparkles, FolderPlus } from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'workspace' | 'rules';
  caseTitle?: string;
  onOpenNewCaseModal: () => void;
  onLoadQuickDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  caseTitle,
  onOpenNewCaseModal,
  onLoadQuickDemo,
}) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span>CustodyLens 479</span>
          <span>/</span>
          {currentView === 'dashboard' ? (
            <strong>Overview Dashboard</strong>
          ) : (
            <strong>{caseTitle || 'Case Review Workspace'}</strong>
          )}
        </div>
      </div>

      <div className="topbar-right">
        <button className="btn btn-demo btn-sm" onClick={onLoadQuickDemo}>
          <Sparkles size={14} /> Load Demo Case
        </button>
        <button className="btn btn-primary btn-sm" onClick={onOpenNewCaseModal}>
          <FolderPlus size={14} /> New Review
        </button>
      </div>
    </header>
  );
};
