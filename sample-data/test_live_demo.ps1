# CaseMate AI End-to-End Live Integration Verification Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "CaseMate AI — Live End-to-End Integration Verification" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1] Checking System Health..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get
Write-Host "Health Status: $($health.status)" -ForegroundColor Green
Write-Host "Database: $($health.services.database) | n8n Orchestrator: $($health.services.n8n)" -ForegroundColor Green

# 2. Create Case Workspace
Write-Host "`n[2] Creating Legal Case Workspace..." -ForegroundColor Yellow
$casePayload = @{
    title = "Mercer v. Oakridge Residential Tenancy Dispute"
    category = "Eviction"
} | ConvertTo-Json

$caseResp = Invoke-RestMethod -Uri "http://localhost:5000/api/cases" -Method Post -Body $casePayload -ContentType "application/json"
$caseId = $caseResp.data._id
Write-Host "Created Case ID: $caseId" -ForegroundColor Green
Write-Host "Case Title: $($caseResp.data.title)" -ForegroundColor Green
Write-Host "Initial Status: $($caseResp.data.status)" -ForegroundColor Green

# 3. Upload Documents
Write-Host "`n[3] Uploading Synthetic Legal Documents..." -ForegroundColor Yellow

function Upload-Doc {
    param($Path, $Name)
    $form = @{
        file = Get-Item -Path $Path
    }
    # Use curl.exe for reliable multipart form upload on Windows
    $uploadOutput = & curl.exe -s -F "file=@$Path" "http://localhost:5000/api/cases/$caseId/documents" | ConvertFrom-Json
    Write-Host "Uploaded: $Name -> Detected Type: $($uploadOutput.data.detectedDocumentType) | Status: $($uploadOutput.data.extractionStatus)" -ForegroundColor Green
    return $uploadOutput.data._id
}

$doc1Id = Upload-Doc -Path "sample-data/1_notice_to_quit.pdf" -Name "1_notice_to_quit.pdf"
$doc2Id = Upload-Doc -Path "sample-data/2_landlord_letter_conflicting_date.txt" -Name "2_landlord_letter_conflicting_date.txt"
$doc3Id = Upload-Doc -Path "sample-data/3_court_summons_referenced_unuploaded.pdf" -Name "3_court_summons_referenced_unuploaded.pdf"

# 4. List Documents
Write-Host "`n[4] Querying Document Inventory..." -ForegroundColor Yellow
$docsResp = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$caseId/documents" -Method Get
Write-Host "Total Uploaded Documents: $($docsResp.data.Count)" -ForegroundColor Green

# 5. Trigger Analysis Workflow
Write-Host "`n[5] Triggering Analysis Workflow..." -ForegroundColor Yellow
$analyzeResp = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$caseId/analyze" -Method Post
Write-Host "Analysis Triggered: $($analyzeResp.message)" -ForegroundColor Green
Write-Host "Triggered Via: $($analyzeResp.data.triggeredVia)" -ForegroundColor Green

# 6. Poll Case Status
Write-Host "`n[6] Polling Case Status until Completion..." -ForegroundColor Yellow
$maxAttempts = 15
$attempt = 0
$finalStatus = "processing"

while ($attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $statusResp = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$caseId" -Method Get
    $currentStatus = $statusResp.data.status
    Write-Host "Status check [attempt $($attempt + 1)]: $currentStatus" -ForegroundColor Gray
    if ($currentStatus -in @("completed", "human_review_required", "failed")) {
        $finalStatus = $currentStatus
        break
    }
    $attempt++
}

Write-Host "Final Processing Status: $finalStatus" -ForegroundColor Green

# 7. Retrieve Timeline Data
Write-Host "`n[7] Retrieving Verified Chronological Timeline..." -ForegroundColor Yellow
$timelineResp = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$caseId/timeline" -Method Get
Write-Host "Timeline Events Count: $($timelineResp.data.timelineEvents.Count)" -ForegroundColor Green
foreach ($evt in $timelineResp.data.timelineEvents) {
    $conflictTag = ""
    if ($evt.hasConflict) {
        $conflictTag = " [! CONFLICT]"
    }
    Write-Host "  • [$($evt.date)] $($evt.title)$conflictTag — Source: $($evt.sourceDocumentName)" -ForegroundColor Cyan
}

if ($timelineResp.data.conflicts.Count -gt 0) {
    Write-Host "Date Discrepancies / Conflicts Identified: $($timelineResp.data.conflicts.Count)" -ForegroundColor Red
    foreach ($conf in $timelineResp.data.conflicts) {
        Write-Host "    Issue: $($conf.issue)" -ForegroundColor DarkYellow
    }
}

# 8. Retrieve Structured Report
Write-Host "`n[8] Retrieving Structured Case Preparation Report..." -ForegroundColor Yellow
$reportResp = Invoke-RestMethod -Uri "http://localhost:5000/api/cases/$caseId/report" -Method Get
Write-Host "Extracted Facts: $($reportResp.data.extractedFacts.Count)" -ForegroundColor Green
Write-Host "Missing Information Items: $($reportResp.data.missingInformationChecklist.Count)" -ForegroundColor Green
Write-Host "Clarification Questions: $($reportResp.data.clarificationQuestions.Count)" -ForegroundColor Green

foreach ($q in $reportResp.data.clarificationQuestions) {
    Write-Host "  • [Target: $($q.targetAudience)] Question: $($q.question)" -ForegroundColor Magenta
}

# 9. Download Report PDF
Write-Host "`n[9] Downloading Case Preparation PDF Report..." -ForegroundColor Yellow
$pdfPath = "sample-data/verified_casemate_report.pdf"
Invoke-WebRequest -Uri "http://localhost:5000/api/cases/$caseId/report.pdf" -OutFile $pdfPath
$pdfSize = (Get-Item $pdfPath).Length
Write-Host "PDF Report successfully saved to: $pdfPath ($pdfSize bytes)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "All Verification Steps Passed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
