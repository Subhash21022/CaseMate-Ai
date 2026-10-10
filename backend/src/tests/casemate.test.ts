import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { CaseModel } from '../models/Case.js';
import { DocumentModel } from '../models/Document.js';
import { AnalysisModel } from '../models/Analysis.js';
import { parseDocumentFile } from '../services/documentParser.js';
import {
  runDocumentAnalysisAgent,
  runTimelineAgent,
  runCompletenessAgent,
  normalizeDate,
} from '../services/agentService.js';
import { verifyWorkflowResults } from '../services/verificationService.js';
import { compileReportData, generateReportPdf } from '../services/reportGenerator.js';

const sampleDir = path.resolve(process.cwd(), '../sample-data');
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

describe('CaseMate AI — Backend Automated Test Suite', () => {
  let createdCaseId: string;
  let noticeDocId: string;
  let letterDocId: string;
  let summonsDocId: string;

  // 1. Backend health check
  it('1. GET /api/health should report healthy database status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services.database).toBe('connected');
  });

  // 2. Case creation and retrieval
  it('2. POST /api/cases and GET /api/cases/:id should create and retrieve case', async () => {
    const createRes = await request(app)
      .post('/api/cases')
      .send({
        title: 'Mercer Tenancy & Eviction Defense Workspace',
        category: 'Eviction',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.title).toBe('Mercer Tenancy & Eviction Defense Workspace');
    expect(createRes.body.data.status).toBe('created');

    createdCaseId = createRes.body.data._id;

    const getRes = await request(app).get(`/api/cases/${createdCaseId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data._id).toBe(createdCaseId);
    expect(getRes.body.data.documentCount).toBe(0);
  });

  // 3. Invalid case IDs validation
  it('3. Should return 400 for invalid case ID format and 404 for non-existent case', async () => {
    const invalidIdRes = await request(app).get('/api/cases/not-a-valid-id');
    expect(invalidIdRes.status).toBe(400);
    expect(invalidIdRes.body.error).toBe('Validation failed');

    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await request(app).get(`/api/cases/${nonExistentId}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error).toBe('Case not found');
  });

  // 4. File upload validation
  it('4. Should validate file uploads (reject empty upload and accept valid documents)', async () => {
    const emptyUploadRes = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .send();
    expect(emptyUploadRes.status).toBe(400);

    // Upload 1: Notice to Quit
    const noticeFile = path.join(sampleDir, '1_notice_to_quit.txt');
    const uploadRes1 = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .attach('file', noticeFile);

    expect(uploadRes1.status).toBe(201);
    expect(uploadRes1.body.success).toBe(true);
    expect(uploadRes1.body.data.detectedDocumentType).toBe('Notice to Quit');
    expect(uploadRes1.body.data.extractionStatus).toBe('success');
    expect(uploadRes1.body.data.isDuplicate).toBe(false);
    expect(uploadRes1.body.data.storagePath).toBeUndefined(); // Storage path must NOT be exposed

    noticeDocId = uploadRes1.body.data._id;

    // Check Case status transition to documents_uploaded
    const caseAfterUpload = await CaseModel.findById(createdCaseId);
    expect(caseAfterUpload?.status).toBe('documents_uploaded');
    expect(caseAfterUpload?.documents.length).toBe(1);
  });

  // 5. Document extraction and duplicate detection
  it('5. Should extract document text and detect duplicate uploads', async () => {
    // Attempt duplicate upload of Notice to Quit
    const noticeFile = path.join(sampleDir, '1_notice_to_quit.txt');
    const dupRes = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .attach('file', noticeFile);

    expect(dupRes.status).toBe(201);
    expect(dupRes.body.data.isDuplicate).toBe(true);
    expect(dupRes.body.data.warnings.some((w: string) => w.includes('Identical file already uploaded'))).toBe(true);

    // Upload 2: Landlord follow-up letter with conflicting date
    const letterFile = path.join(sampleDir, '2_landlord_letter_conflicting_date.txt');
    const uploadRes2 = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .attach('file', letterFile);

    expect(uploadRes2.status).toBe(201);
    letterDocId = uploadRes2.body.data._id;

    // Upload 3: Court Summons referencing unuploaded documents
    const summonsFile = path.join(sampleDir, '3_court_summons_referenced_unuploaded.txt');
    const uploadRes3 = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .attach('file', summonsFile);

    expect(uploadRes3.status).toBe(201);
    summonsDocId = uploadRes3.body.data._id;

    // Upload 4: Malformed/unreadable file
    const malformedFile = path.join(sampleDir, '4_malformed_unreadable.bin');
    const malformedRes = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .attach('file', malformedFile);

    expect(malformedRes.status).toBe(201);
    expect(malformedRes.body.data.extractionStatus).toBe('failed');
    expect(malformedRes.body.data.warnings.length).toBeGreaterThan(0);
  });

  // 6. Security & Prompt Injection Defense
  it('6. Should safely isolate and defend against prompt-injection attempts in documents', async () => {
    const injectionFile = path.join(sampleDir, '5_prompt_injection.txt');
    const injectionRes = await request(app)
      .post(`/api/cases/${createdCaseId}/documents`)
      .attach('file', injectionFile);

    expect(injectionRes.status).toBe(201);
    const injectionDocId = injectionRes.body.data._id;

    const doc = await DocumentModel.findById(injectionDocId);
    expect(doc).toBeDefined();

    const analysisOutput = await runDocumentAnalysisAgent(doc!, 'Eviction');
    // Ensure security warning is generated and system was not overridden
    expect(analysisOutput.ambiguitiesOrWarnings.some((w) => w.includes('SECURITY WARNING'))).toBe(true);
    expect(analysisOutput.extractedFacts.some((f) => f.statement.includes('Tenant notified Management'))).toBe(false); // Extracted regular facts without honoring prompt override
  });

  // 7. Timeline sorting and date normalization
  it('7. Should deterministically normalize dates and sort timeline events in ascending order', () => {
    expect(normalizeDate('October 01, 2026')).toBe('2026-10-01');
    expect(normalizeDate('September 25, 2026')).toBe('2026-09-25');
    expect(normalizeDate('11/05/2026')).toBe('2026-11-05');
    expect(normalizeDate('Invalid Date')).toBeNull();

    const mockDocs: any = [
      {
        _id: new mongoose.Types.ObjectId(),
        originalFilename: 'docA.txt',
        extractedText: 'Notice issued on October 01, 2026',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        originalFilename: 'docB.txt',
        extractedText: 'Hearing scheduled for November 05, 2026',
      },
    ];

    const mockAnalysis: any = [
      {
        documentId: mockDocs[0]._id.toString(),
        datesFound: [{ rawDate: 'October 01, 2026', normalizedDate: '2026-10-01', context: 'Date of issuance' }],
      },
      {
        documentId: mockDocs[1]._id.toString(),
        datesFound: [{ rawDate: 'November 05, 2026', normalizedDate: '2026-11-05', context: 'Court hearing date' }],
      },
    ];

    const timeline = runTimelineAgent(mockDocs, mockAnalysis);
    expect(timeline.timelineEvents.length).toBe(2);
    expect(timeline.timelineEvents[0].date).toBe('2026-10-01');
    expect(timeline.timelineEvents[1].date).toBe('2026-11-05');
  });

  // 8. Conflicting dates detection
  it('8. Should flag conflicting notice dates across distinct documents without silent resolution', async () => {
    const docNotice = await DocumentModel.findById(noticeDocId);
    const docLetter = await DocumentModel.findById(letterDocId);

    expect(docNotice).toBeDefined();
    expect(docLetter).toBeDefined();

    const analysisNotice = await runDocumentAnalysisAgent(docNotice!, 'Eviction');
    const analysisLetter = await runDocumentAnalysisAgent(docLetter!, 'Eviction');

    const timeline = runTimelineAgent([docNotice!, docLetter!], [analysisNotice, analysisLetter]);

    expect(timeline.detectedDateConflicts.length).toBeGreaterThan(0);
    const dateConflict = timeline.detectedDateConflicts[0];
    expect(dateConflict.issue).toContain('Conflicting Notice to Quit');
    expect(timeline.timelineEvents.some((e) => e.hasConflict)).toBe(true);
  });

  // 9. Missing-information and unuploaded referenced document detection
  it('9. Should identify missing checklist items and unuploaded referenced documents', async () => {
    const docSummons = await DocumentModel.findById(summonsDocId);
    const docNotice = await DocumentModel.findById(noticeDocId);

    const completeness = runCompletenessAgent(
      'Mercer Eviction Case',
      'Eviction',
      [docNotice!, docSummons!],
      [],
      []
    );

    // Should detect missing Lease Agreement
    const missingLease = completeness.missingInformation.find((m) => m.category === 'Contractual Agreement');
    expect(missingLease).toBeDefined();
    expect(missingLease?.isLegallyMandated).toBe(false); // Distinguish missing from mandatory

    // Should detect unuploaded referenced documents from summons text
    expect(completeness.unuploadedReferencedDocuments.length).toBeGreaterThan(0);
    expect(
      completeness.unuploadedReferencedDocuments.some((u) => u.documentName.includes('Lease Agreement'))
    ).toBe(true);

    // Should generate targeted clarification questions
    expect(completeness.clarificationQuestions.length).toBeGreaterThan(0);
  });

  // 10. Verification Layer and Source Reference Validation
  it('10. Verification layer should detect non-existent document IDs and unverified quotations', async () => {
    const docNotice = await DocumentModel.findById(noticeDocId);

    const invalidPayload: any = {
      extractedFacts: [
        {
          factId: 'F-TEST-1',
          category: 'Claim',
          statement: 'Some fabricated claim',
          isExplicit: true,
          sourceDocumentId: new mongoose.Types.ObjectId().toString(), // Non-existent document ID
          sourceDocumentName: 'fake.txt',
          sourcePage: 1,
          sourceQuote: 'A quote that does not exist anywhere in document text',
          confidence: 'high',
        },
      ],
      timelineEvents: [],
      missingInformation: [],
      conflicts: [],
      clarificationQuestions: [],
      summary: 'Test summary',
      humanReviewRequired: false,
    };

    const verification = verifyWorkflowResults(invalidPayload, [docNotice!]);
    expect(verification.verificationStatus).toBe('flagged_for_review');
    expect(verification.verificationNotes.some((n) => n.includes('references non-existent document ID'))).toBe(true);
  });

  // 11. Unauthorized internal API access protection
  it('11. Protected internal endpoints should reject requests without valid x-internal-secret', async () => {
    const unauthGet = await request(app).get(`/api/internal/cases/${createdCaseId}/input`);
    expect(unauthGet.status).toBe(401);
    expect(unauthGet.body.error).toContain('Unauthorized');

    const wrongSecret = await request(app)
      .get(`/api/internal/cases/${createdCaseId}/input`)
      .set('x-internal-secret', 'wrong-secret-key');
    expect(wrongSecret.status).toBe(401);

    const authGet = await request(app)
      .get(`/api/internal/cases/${createdCaseId}/input`)
      .set('x-internal-secret', config.INTERNAL_API_SECRET);
    expect(authGet.status).toBe(200);
    expect(authGet.body.data.caseId).toBe(createdCaseId);
  });

  // 12. Analysis workflow triggering and status transitions
  it('12. POST /api/cases/:id/analyze should start async analysis and transition case status', async () => {
    const analyzeRes = await request(app).post(`/api/cases/${createdCaseId}/analyze`);
    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.success).toBe(true);
    expect(analyzeRes.body.data.status).toBe('processing');

    // Wait briefly for asynchronous execution to complete
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const caseUpdated = await CaseModel.findById(createdCaseId);
    // Because conflicts were detected between notice and letter, status should be human_review_required
    expect(['human_review_required', 'completed']).toContain(caseUpdated?.status);
    expect(caseUpdated?.analysis).toBeDefined();
  });

  // 13. n8n workflow failure recording
  it('13. POST /api/internal/cases/:id/failure should safely record workflow failure and prevent indefinite processing', async () => {
    // Create a new case to test failure recording
    const failCase = await CaseModel.create({
      title: 'Failed Workflow Test Case',
      status: 'processing',
    });

    const failRes = await request(app)
      .post(`/api/internal/cases/${failCase._id}/failure`)
      .set('x-internal-secret', config.INTERNAL_API_SECRET)
      .send({
        reason: 'Connection timed out during n8n node execution',
        phase: 'Agent 2 Timeline',
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.status).toBe('failed');

    const updatedFailCase = await CaseModel.findById(failCase._id);
    expect(updatedFailCase?.status).toBe('failed');
    expect(updatedFailCase?.failureReason).toBe('Connection timed out during n8n node execution');
  });

  // 14. Report generation (JSON and PDF)
  it('14. Should generate structured JSON report and downloadable PDF with safety disclaimer', async () => {
    // Retrieve JSON report
    const reportRes = await request(app).get(`/api/cases/${createdCaseId}/report`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.success).toBe(true);
    expect(reportRes.body.data.caseOverview.caseId).toBe(createdCaseId);
    expect(reportRes.body.data.documentInventory.length).toBeGreaterThan(0);
    expect(reportRes.body.data.timeline.length).toBeGreaterThan(0);
    expect(reportRes.body.data.safetyDisclaimer).toContain('DISCLAIMER');

    // Retrieve PDF report
    const pdfRes = await request(app).get(`/api/cases/${createdCaseId}/report.pdf`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(parseInt(pdfRes.headers['content-length'])).toBeGreaterThan(1000);
  });
});
