import React, { useState, useEffect } from 'react';
import type { ICase, IFullCaseReview } from './types';
import { ApiService } from './services/api';
import { DEMO_CASES } from './data/demoCases';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CaseReviewWorkspace } from './components/CaseReviewWorkspace';
import { NewCaseModal } from './components/NewCaseModal';
import { X } from 'lucide-react';
import './styles/index.css';

export function App() {
  const [cases, setCases] = useState<ICase[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'workspace' | 'rules'>('dashboard');
  const [activeCaseId, setActiveCaseId] = useState<string | null>(DEMO_CASES[0].caseInfo.demoId || DEMO_CASES[0].caseInfo._id);
  const [activeReview, setActiveReview] = useState<IFullCaseReview | null>(DEMO_CASES[0]);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);
  const [showDemoBanner, setShowDemoBanner] = useState(true);

  // Initialize data and check backend connectivity
  useEffect(() => {
    const initApp = async () => {
      const isHealthy = await ApiService.checkHealth();
      setIsBackendConnected(isHealthy);
      const loadedCases = await ApiService.getCases();
      setCases(loadedCases);

      // Default to the first demo case
      const defaultCase = DEMO_CASES[0];
      setActiveCaseId(defaultCase.caseInfo.demoId || defaultCase.caseInfo._id);
      setActiveReview(defaultCase);
    };

    initApp();
  }, []);

  // Handle case selection
  const handleOpenCase = async (caseId: string) => {
    setActiveCaseId(caseId);
    const reviewData = await ApiService.getFullCaseReview(caseId);
    setActiveReview(reviewData);
    setCurrentView('workspace');
  };

  // Handle demo case selection
  const handleSelectDemoCase = (demoId: string) => {
    const demo = DEMO_CASES.find((d) => d.caseInfo.demoId === demoId || d.caseInfo._id === demoId);
    if (demo) {
      setActiveCaseId(demo.caseInfo.demoId || demo.caseInfo._id);
      setActiveReview(demo);
      setCurrentView('workspace');
    }
  };

  // Quick action for judges: load the primary Raju Kumar demo case
  const handleLoadQuickDemo = () => {
    handleSelectDemoCase('demo-1-raju-kumar');
  };

  // Handle new case creation
  const handleCreateCase = async (title: string, category: string) => {
    const newCase = await ApiService.createCase(title, category);
    setCases((prev) => [newCase, ...prev]);
    const emptyReview: IFullCaseReview = {
      caseInfo: newCase,
      documents: [],
      extractedFacts: [],
      timelineEvents: [],
      conflicts: [],
      missingInformation: [
        {
          itemId: 'miss_fir',
          category: 'Police Records',
          description: 'First Information Report (FIR) required for charge verification.',
          importance: 'critical',
          isLegallyMandated: true,
          status: 'missing',
        },
        {
          itemId: 'miss_remand',
          category: 'Court Records',
          description: 'Initial Magistrate Remand Order required for lawful custody calculation.',
          importance: 'critical',
          isLegallyMandated: true,
          status: 'missing',
        },
      ],
      custodyCalculations: {
        isValidSequence: false,
        sequenceWarnings: ['No documents uploaded yet.'],
        grossCustodyDays: 0,
        accusedCausedDelayDaysExcluded: 0,
        netCountableCustodyDays: 0,
        durationBreakdown: { years: 0, months: 0, days: 0, totalDays: 0 },
        policeCustodyDays: 0,
        judicialCustodyDays: 0,
        productionDelayFlagged: false,
        hasConflictingDates: false,
        dateDiscrepancyNotes: [],
        oneThirdThreshold: null,
        oneHalfThreshold: null,
        maximumPeriodThreshold: null,
        isMaximumPeriodExceeded: false,
        calculationNotes: ['Upload documents to calculate custody periods.'],
      },
      section479Assessment: {
        checklistVersion: 'BNSS-2023-SEC479-V2.0',
        evaluationTimestamp: new Date().toISOString(),
        reviewCategory: 'insufficient_information',
        categoryTitle: 'Awaiting Document Ingestion',
        categorySummary: 'Please upload the FIR, Arrest Memo, or Remand Order to evaluate Section 479 eligibility.',
        rules: [],
        missingCrucialFacts: ['FIR and Remand records'],
        jailSuperintendentMandate: {
          obligationTriggered: false,
          statutoryBasis: 'Section 479(3) BNSS',
          instructionsForLegalAid: 'Pending records',
        },
        recommendedLegalAidActions: ['Upload primary case records.'],
        statutoryDisclaimer: 'Administrative legal-aid review draft only.',
      },
      verificationStatus: 'flagged_for_review',
      verificationNotes: [],
      summary: 'Case workspace initialized. Ready for document upload.',
      safetyDisclaimer: 'All legal outputs must be independently reviewed by authorized counsel.',
    };

    setActiveCaseId(newCase._id);
    setActiveReview(emptyReview);
    setCurrentView('workspace');
  };

  // Handle document upload within workspace
  const handleUploadDocument = async (file: File) => {
    if (!activeReview) return;
    const uploadedDoc = await ApiService.uploadDocument(activeReview.caseInfo._id, file);

    const updatedReview: IFullCaseReview = {
      ...activeReview,
      documents: [...activeReview.documents, uploadedDoc],
    };
    setActiveReview(updatedReview);
  };

  // Handle trigger analysis
  const handleTriggerAnalysis = async () => {
    if (!activeReview) return;

    // Trigger analysis API
    await ApiService.triggerAnalysis(activeReview.caseInfo._id);

    // If it is a demo case, refresh demo data or populate enriched facts
    if (activeReview.caseInfo.isDemoCase) {
      const demo = DEMO_CASES.find(
        (d) => d.caseInfo.demoId === activeReview.caseInfo.demoId || d.caseInfo._id === activeReview.caseInfo._id
      );
      if (demo) {
        setActiveReview({ ...demo });
      }
    } else {
      const refreshed = await ApiService.getFullCaseReview(activeReview.caseInfo._id);
      setActiveReview(refreshed);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        activeCaseId={activeCaseId}
        onNavigate={(view) => setCurrentView(view)}
        onSelectCase={handleOpenCase}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Navbar */}
        <Navbar
          currentView={currentView}
          caseTitle={activeReview?.caseInfo.title}
          onOpenNewCaseModal={() => setIsNewCaseModalOpen(true)}
          onLoadQuickDemo={handleLoadQuickDemo}
        />

        {/* Demo Mode Notice Banner */}
        {showDemoBanner && (
          <div className="demo-banner">
            <div className="demo-banner-content">
              <span className="demo-badge-pill">Synthetic Demo Mode</span>
              <span>
                Demonstrating AI-assisted Section 479 BNSS detention review using synthetic legal dossiers for hackathon judging.
              </span>
            </div>
            <button
              onClick={() => setShowDemoBanner(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#92400e',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* View Routing */}
        {currentView === 'dashboard' ? (
          <DashboardView
            cases={cases}
            onOpenCase={handleOpenCase}
            onOpenNewCaseModal={() => setIsNewCaseModalOpen(true)}
            onLoadQuickDemo={handleLoadQuickDemo}
          />
        ) : activeReview ? (
          <CaseReviewWorkspace
            review={activeReview}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onUploadDocument={handleUploadDocument}
            onTriggerAnalysis={handleTriggerAnalysis}
            onSelectDemoCase={handleSelectDemoCase}
          />
        ) : (
          <div className="page-content" style={{ textAlign: 'center', padding: '60px' }}>
            <p>Loading case workspace...</p>
          </div>
        )}
      </div>

      {/* New Case Review Modal */}
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onCreateCase={handleCreateCase}
        onSelectDemoCase={handleSelectDemoCase}
      />
    </div>
  );
}

export default App;
