import React, { useState } from 'react';
import type { IFullCaseReview, IEvidenceCitation } from '../types';
import {
  FileText,
  Clock,
  AlertTriangle,
  Scale,
  ArrowLeft,
  Calendar,
  Building2,
  FileCheck,
} from 'lucide-react';
import { DocumentUploadZone } from './DocumentUploadZone';
import { ExtractedFactsList } from './ExtractedFactsList';
import { CustodyTimelineView } from './CustodyTimelineView';
import { DiscrepancyPanel } from './DiscrepancyPanel';
import { CustodyCalculationCard } from './CustodyCalculationCard';
import { Section479Checklist } from './Section479Checklist';
import { EvidenceModal } from './EvidenceModal';
import { ReviewBriefModal } from './ReviewBriefModal';

interface CaseReviewWorkspaceProps {
  review: IFullCaseReview;
  onBackToDashboard: () => void;
  onUploadDocument: (file: File) => Promise<void>;
  onTriggerAnalysis: () => Promise<void>;
  onSelectDemoCase: (demoId: string) => void;
}

export const CaseReviewWorkspace: React.FC<CaseReviewWorkspaceProps> = ({
  review,
  onBackToDashboard,
  onUploadDocument,
  onTriggerAnalysis,
  onSelectDemoCase,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'timeline' | 'discrepancies' | 'sec479' | 'brief'>('documents');
  const [selectedCitation, setSelectedCitation] = useState<IEvidenceCitation | null>(null);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { caseInfo, documents, extractedFacts, timelineEvents, conflicts, missingInformation, custodyCalculations, section479Assessment } = review;

  const handleStartAnalysis = async () => {
    setIsAnalyzing(true);
    await onTriggerAnalysis();
    setIsAnalyzing(false);
  };

  return (
    <div className="page-content">
      {/* Back button & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={onBackToDashboard}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>Quick Demo Selector:</span>
          <button
            className={`btn btn-sm ${caseInfo._id.includes('raju') ? 'btn-navy' : 'btn-outline'}`}
            onClick={() => onSelectDemoCase('demo-1-raju-kumar')}
            style={{ fontSize: '0.74rem' }}
          >
            Raju Kumar (1/3rd Proviso)
          </button>
          <button
            className={`btn btn-sm ${caseInfo._id.includes('suresh') ? 'btn-navy' : 'btn-outline'}`}
            onClick={() => onSelectDemoCase('demo-2-suresh-babu')}
            style={{ fontSize: '0.74rem' }}
          >
            Suresh Babu (48h Discrepancy)
          </button>
          <button
            className={`btn btn-sm ${caseInfo._id.includes('vignesh') ? 'btn-navy' : 'btn-outline'}`}
            onClick={() => onSelectDemoCase('demo-3-vignesh')}
            style={{ fontSize: '0.74rem' }}
          >
            Vignesh (Capital Bar)
          </button>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="workspace-header">
        <div className="workspace-case-meta">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 className="workspace-case-title">{caseInfo.title}</h2>
              {caseInfo.isDemoCase && (
                <span className="demo-badge-pill">Synthetic Demo Case</span>
              )}
            </div>

            <div className="workspace-case-details">
              <span>
                <Building2 size={14} /> {caseInfo.policeStation || 'T. Nagar Police Station'}
              </span>
              <span>•</span>
              <span>
                <FileText size={14} /> FIR No: <strong>{caseInfo.firNumber || '104/2025'}</strong>
              </span>
              <span>•</span>
              <span>
                <Calendar size={14} /> Registered:{' '}
                {new Date(caseInfo.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <span>•</span>
              <span>
                <FileCheck size={14} /> {documents.length} Ingested Document(s)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowBriefModal(true)}
              style={{ boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)' }}
            >
              <FileText size={15} /> Generate Draft Review Brief
            </button>
          </div>
        </div>

        {/* Workspace Tab Navigation */}
        <div className="workspace-tabs">
          <button
            className={`workspace-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={16} /> Ingestion & Facts
            <span className="tab-badge">{extractedFacts.length}</span>
          </button>

          <button
            className={`workspace-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={16} /> Custody Timeline
            <span className="tab-badge">{timelineEvents.length}</span>
          </button>

          <button
            className={`workspace-tab-btn ${activeTab === 'discrepancies' ? 'active' : ''}`}
            onClick={() => setActiveTab('discrepancies')}
          >
            <AlertTriangle size={16} /> Discrepancies & Gaps
            {conflicts.length > 0 && (
              <span className="tab-badge" style={{ backgroundColor: 'var(--color-danger)', color: '#ffffff' }}>
                {conflicts.length}
              </span>
            )}
          </button>

          <button
            className={`workspace-tab-btn ${activeTab === 'sec479' ? 'active' : ''}`}
            onClick={() => setActiveTab('sec479')}
          >
            <Scale size={16} /> Section 479 BNSS Assessment
            <span className="tab-badge">
              {custodyCalculations.netCountableCustodyDays}d
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content Workspace Area */}
      <div className="section-card">
        <div className="section-card-body">
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <DocumentUploadZone
                documents={documents}
                onUploadFile={onUploadDocument}
                onStartAnalysis={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
              />
              <ExtractedFactsList
                facts={extractedFacts}
                onSelectCitation={(cit) => setSelectedCitation(cit)}
              />
            </div>
          )}

          {activeTab === 'timeline' && (
            <CustodyTimelineView
              events={timelineEvents}
              onSelectCitation={(cit) => setSelectedCitation(cit)}
            />
          )}

          {activeTab === 'discrepancies' && (
            <DiscrepancyPanel
              conflicts={conflicts}
              missingInformation={missingInformation}
              onSelectCitation={(cit) => setSelectedCitation(cit)}
            />
          )}

          {activeTab === 'sec479' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <CustodyCalculationCard calculation={custodyCalculations} />
              <Section479Checklist assessment={section479Assessment} />
            </div>
          )}
        </div>
      </div>

      {/* Citation Drawer / Modal */}
      <EvidenceModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />

      {/* Review Brief Full Preview Modal */}
      {showBriefModal && (
        <ReviewBriefModal
          review={review}
          onClose={() => setShowBriefModal(false)}
        />
      )}
    </div>
  );
};
