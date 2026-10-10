import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { CaseModel } from '../models/Case.js';
import { DocumentModel } from '../models/Document.js';
import { AnalysisModel } from '../models/Analysis.js';
import { executeInternalAnalysisWorkflow } from '../services/n8nService.js';

const sampleDir = path.resolve(process.cwd(), '../sample-data/custodylens');
let app: any;

beforeAll(async () => {
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await CaseModel.deleteMany({});
  await DocumentModel.deleteMany({});
  await AnalysisModel.deleteMany({});
  await disconnectDB();
});

describe('CustodyLens 479 — End-to-End Criminal Legal Aid Integration Test Suite', () => {
  // ==========================================================================
  // CASE 1: Positive Single-Offence First-Time Offender Review Candidate
  // Accused: Raju Kumar | Offence: Section 379 IPC (Theft, Max 3 years)
  // Arrest: 2023-08-14 | Over 14 months served (>= 1/3 threshold)
  // Clean antecedents verified -> Qualifies under First Proviso to Sec 479(1)
  // ==========================================================================
  describe('Case 1: Positive Single-Offence First-Time Offender Review Candidate', () => {
    let caseId: string;

    it('1. POST /api/cases creates criminal legal-aid case workspace', async () => {
      const res = await request(app)
        .post('/api/cases')
        .send({
          title: 'State v. Raju Kumar (FIR No. 104/2023)',
          category: 'Undertrial Detention Review',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('State v. Raju Kumar (FIR No. 104/2023)');
      caseId = res.body.data._id;
    });

    it('2. POST /api/cases/:id/documents ingests FIR and classifies document correctly', async () => {
      const firFile = path.join(sampleDir, 'case1_fir_theft.pdf');
      const res = await request(app)
        .post(`/api/cases/${caseId}/documents`)
        .attach('file', firFile);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.detectedDocumentType).toBe('First Information Report (FIR)');
    });

    it('3. Ingests Arrest Memo with accurate classification', async () => {
      const arrestFile = path.join(sampleDir, 'case1_arrest_memo.pdf');
      const res = await request(app)
        .post(`/api/cases/${caseId}/documents`)
        .attach('file', arrestFile);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.detectedDocumentType).toBe('Arrest Memo / Panchnama');
    });

    it('4. Ingests Magistrate Remand Order with accurate classification', async () => {
      const remandFile = path.join(sampleDir, 'case1_magistrate_remand_order.pdf');
      const res = await request(app)
        .post(`/api/cases/${caseId}/documents`)
        .attach('file', remandFile);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.detectedDocumentType).toBe('Remand Application / Order');
    });

    it('5. Executes analysis pipeline and populates custody metrics and Section 479 review', async () => {
      await executeInternalAnalysisWorkflow(caseId);

      const caseRecord = await CaseModel.findById(caseId);
      expect(['completed', 'human_review_required']).toContain(caseRecord?.status);

      const analysis = await AnalysisModel.findOne({ caseId });
      expect(analysis).toBeDefined();

      // Check deterministic custody duration
      const calc = analysis?.custodyCalculations;
      expect(calc).toBeDefined();
      expect(calc.netCountableCustodyDays).toBeGreaterThan(365); // Over 1 year served
      expect(calc.productionDelayFlagged).toBe(false); // Within 24 hours

      // Check Section 479 BNSS Assessment
      const sec479 = analysis?.section479Assessment;
      expect(sec479).toBeDefined();
      expect(sec479.reviewCategory).toBe('potential_review_candidate');
      expect(sec479.categoryTitle).toContain('First Proviso');
      expect(sec479.jailSuperintendentMandate.obligationTriggered).toBe(true);
      expect(sec479.rules.find((r: any) => r.ruleId === 'SEC479-RULE-1')?.status).toBe('satisfied');
      expect(sec479.rules.find((r: any) => r.ruleId === 'SEC479-RULE-2')?.status).toBe('satisfied');
    });

    it('6. GET /api/cases/:id/timeline returns chronological custody events', async () => {
      const res = await request(app).get(`/api/cases/${caseId}/timeline`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timelineEvents.length).toBeGreaterThan(0);
      const arrestEvent = res.body.data.timelineEvents.find((e: any) => /arrest/i.test(e.title));
      expect(arrestEvent).toBeDefined();
      expect(arrestEvent.date).toBe('2025-08-14');
    });

    it('7. GET /api/cases/:id/report returns structured brief data', async () => {
      const res = await request(app).get(`/api/cases/${caseId}/report`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.custodyDurationSummary).toBeDefined();
      expect(res.body.data.section479Assessment).toBeDefined();
      expect(res.body.data.section479Assessment.reviewCategory).toBe('potential_review_candidate');
    });

    it('8. GET /api/cases/:id/report.pdf streams valid PDF draft review brief', async () => {
      const res = await request(app).get(`/api/cases/${caseId}/report.pdf`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body.length).toBeGreaterThan(1000);
    });
  });

  // ==========================================================================
  // CASE 2: Multiple Offences & Conflicting Arrest Dates Scenario
  // Offences: IPC 379 and IPC 411 pending inquiry
  // Conflicting dates: FIR (2024-05-12) vs Remand Memo (2024-05-14)
  // Result: Section 479(2) restriction flagged AND discrepancy flagged
  // ==========================================================================
  describe('Case 2: Multiple Offences & Conflicting Arrest Dates', () => {
    let caseId: string;

    it('1. Flags Section 479(2) statutory restriction for multiple pending offences', async () => {
      const createRes = await request(app)
        .post('/api/cases')
        .send({
          title: 'State v. Suresh Babu (FIR No. 215/2024)',
          category: 'Undertrial Detention Review',
        });
      caseId = createRes.body.data._id;

      const file = path.join(sampleDir, 'case2_multiple_offences_conflicting_dates.pdf');
      await request(app)
        .post(`/api/cases/${caseId}/documents`)
        .attach('file', file);

      await executeInternalAnalysisWorkflow(caseId);

      const analysis = await AnalysisModel.findOne({ caseId });
      expect(analysis).toBeDefined();

      const sec479 = analysis?.section479Assessment;
      expect(sec479.reviewCategory).toBe('statutory_restriction_flagged');
      const rule2 = sec479.rules.find((r: any) => r.ruleId === 'SEC479-RULE-2');
      expect(rule2.status).toBe('restriction_flagged');
      expect(rule2.finding).toContain('Section 479(2)');
    });
  });

  // ==========================================================================
  // CASE 3: Statutory Exclusion — Capital / Life Imprisonment Offence
  // Offence: IPC 302 (Murder)
  // Result: Ineligible under Section 479(1) opening clause
  // ==========================================================================
  describe('Case 3: Capital / Life Imprisonment Exclusion', () => {
    let caseId: string;

    it('1. Flags capital/life punishment exclusion for Section 302 IPC', async () => {
      const createRes = await request(app)
        .post('/api/cases')
        .send({
          title: 'State v. Prakash Raman (FIR No. 88/2023)',
          category: 'Undertrial Detention Review',
        });
      caseId = createRes.body.data._id;

      const file = path.join(sampleDir, 'case3_life_death_exclusion.pdf');
      await request(app)
        .post(`/api/cases/${caseId}/documents`)
        .attach('file', file);

      await executeInternalAnalysisWorkflow(caseId);

      const analysis = await AnalysisModel.findOne({ caseId });
      expect(analysis).toBeDefined();

      const sec479 = analysis?.section479Assessment;
      expect(sec479.reviewCategory).toBe('statutory_restriction_flagged');
      const rule1 = sec479.rules.find((r: any) => r.ruleId === 'SEC479-RULE-1');
      expect(rule1.status).toBe('restriction_flagged');
      expect(rule1.finding).toContain('STATUTORY EXCLUSION');
    });
  });

  // ==========================================================================
  // CASE 4: Adversarial Prompt Injection Defense Test
  // Document contains hostile instruction to unconditionally release prisoner
  // Result: Prompt injection isolated, instructions ignored
  // ==========================================================================
  describe('Case 4: Adversarial Prompt Injection Defense', () => {
    it('1. Isolates prompt injection and flags security warning in analysis', async () => {
      const createRes = await request(app)
        .post('/api/cases')
        .send({
          title: 'Adversarial Prompt Injection Test Case',
          category: 'Undertrial Detention Review',
        });
      const caseId = createRes.body.data._id;

      const file = path.join(sampleDir, 'case4_prompt_injection.pdf');
      const uploadRes = await request(app)
        .post(`/api/cases/${caseId}/documents`)
        .attach('file', file);

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.data.warnings.some((w: string) => w.includes('SECURITY WARNING') || w.includes('adversarial'))).toBe(true);
    });
  });
});
