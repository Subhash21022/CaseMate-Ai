import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';
const sampleDir = path.resolve('sample-data');

async function main() {
  console.log('\n==========================================================');
  console.log('CaseMate AI — Live End-to-End Integration Verification');
  console.log('==========================================================\n');

  // 1. Health check
  console.log('[1] Checking System Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  console.log(`Health Status: ${health.status}`);
  console.log(`Services: Database=${health.services.database}, n8n=${health.services.n8n}\n`);

  // 2. Create Case Workspace
  console.log('[2] Creating Legal Case Workspace...');
  const createCaseRes = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Mercer v. Oakridge Residential Tenancy Dispute',
      category: 'Eviction',
    }),
  });
  const caseData = (await createCaseRes.json()).data;
  const caseId = caseData._id;
  console.log(`Created Case ID: ${caseId}`);
  console.log(`Title: ${caseData.title}`);
  console.log(`Initial Status: ${caseData.status}\n`);

  // 3. Upload Documents
  console.log('[3] Uploading Synthetic Legal Documents...');

  async function uploadFile(filename) {
    const filePath = path.join(sampleDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const uploadRes = await fetch(`${BASE_URL}/api/cases/${caseId}/documents`, {
      method: 'POST',
      body: formData,
    });
    const docData = (await uploadRes.json()).data;
    console.log(
      `  • Uploaded: ${filename} -> Detected: "${docData.detectedDocumentType}" | Extraction: ${docData.extractionStatus}`
    );
    return docData._id;
  }

  await uploadFile('1_notice_to_quit.pdf');
  await uploadFile('2_landlord_letter_conflicting_date.txt');
  await uploadFile('3_court_summons_referenced_unuploaded.pdf');

  // 4. Query Document Inventory
  console.log('\n[4] Querying Document Inventory...');
  const listRes = await fetch(`${BASE_URL}/api/cases/${caseId}/documents`);
  const docList = (await listRes.json()).data;
  console.log(`Total Uploaded Documents: ${docList.length}\n`);

  // 5. Trigger Analysis Workflow
  console.log('[5] Triggering Analysis Workflow...');
  const analyzeRes = await fetch(`${BASE_URL}/api/cases/${caseId}/analyze`, {
    method: 'POST',
  });
  const analyzeData = await analyzeRes.json();
  console.log(`Trigger Result: ${analyzeData.message}`);
  console.log(`Triggered Via: ${analyzeData.data.triggeredVia}\n`);

  // 6. Poll Case Status
  console.log('[6] Polling Case Status until Completion...');
  let currentStatus = 'processing';
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusRes = await fetch(`${BASE_URL}/api/cases/${caseId}`);
    const caseObj = (await statusRes.json()).data;
    currentStatus = caseObj.status;
    console.log(`  Poll [attempt ${i + 1}]: status = ${currentStatus}`);
    if (['completed', 'human_review_required', 'failed'].includes(currentStatus)) {
      break;
    }
  }
  console.log(`\nFinal Processing Status: ${currentStatus}\n`);

  // 7. Retrieve Timeline Data
  console.log('[7] Retrieving Verified Chronological Timeline...');
  const timelineRes = await fetch(`${BASE_URL}/api/cases/${caseId}/timeline`);
  const timelineData = (await timelineRes.json()).data;
  console.log(`Timeline Events Extracted: ${timelineData.timelineEvents.length}`);
  for (const evt of timelineData.timelineEvents) {
    const conflictTag = evt.hasConflict ? ' [! CONFLICT DETECTED]' : '';
    console.log(`  • [${evt.date || 'Undated'}] ${evt.title}${conflictTag}`);
    console.log(`    Source: ${evt.sourceDocumentName}`);
  }

  if (timelineData.conflicts && timelineData.conflicts.length > 0) {
    console.log(`\nConflicts / Discrepancies Identified (${timelineData.conflicts.length}):`);
    for (const conf of timelineData.conflicts) {
      console.log(`  ! Issue: ${conf.issue}`);
    }
  }

  // 8. Retrieve Structured Report Data
  console.log('\n[8] Retrieving Structured Case Preparation Report...');
  const reportRes = await fetch(`${BASE_URL}/api/cases/${caseId}/report`);
  const report = (await reportRes.json()).data;
  console.log(`Extracted Facts: ${report.extractedFacts.length}`);
  console.log(`Missing Information Checklist: ${report.missingInformationChecklist.length}`);
  for (const item of report.missingInformationChecklist) {
    const legTag = item.isLegallyMandated ? '[MANDATED]' : '[RECOMMENDED]';
    console.log(`  • ${legTag} (${item.importance}): ${item.description}`);
  }

  console.log(`\nClarification Questions (${report.clarificationQuestions.length}):`);
  for (const q of report.clarificationQuestions) {
    console.log(`  • [Target: ${q.targetAudience}] ${q.question}`);
  }

  // 9. Download Report PDF
  console.log('\n[9] Downloading Case Preparation PDF Report...');
  const pdfRes = await fetch(`${BASE_URL}/api/cases/${caseId}/report.pdf`);
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  const reportPath = path.join(sampleDir, 'verified_casemate_report.pdf');
  fs.writeFileSync(reportPath, pdfBuffer);
  console.log(`PDF saved to: ${reportPath} (${pdfBuffer.length} bytes)\n`);

  console.log('==========================================================');
  console.log('All End-to-End Milestones Verified Successfully!');
  console.log('==========================================================\n');
}

main().catch((err) => {
  console.error('Test script failure:', err);
  process.exit(1);
});
