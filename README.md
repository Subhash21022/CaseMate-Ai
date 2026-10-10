# CaseMate AI — Backend & Workflow Orchestration Engine

**CaseMate AI** is an AI-powered legal document navigation and analysis engine designed to assist legal-aid workers and self-represented litigants. It extracts structured facts, generates deterministic source-linked chronological timelines, flags conflicting dates across documents, identifies missing essential evidentiary records, generates targeted clarification questions, and compiles downloadable PDF handoff reports.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client / Testing Layer
        FE[User / API Client / Demo Script]
    end

    subgraph CaseMate Express Backend [Port 5000]
        CR[Case Routes /api/cases]
        DR[Document Upload & Extraction /api/cases/:id/documents]
        IR[Protected Internal Routes /api/internal/*]
        SEC[Internal Auth Middleware X-Internal-Secret]
        PARSER[Document Extraction: PDF, DOCX, TXT + OCR Fallback]
        VERIF[Deterministic Verification & Validation Layer]
        PDF[PDFKit Report Generator]
        DB[(MongoDB / In-Memory Fallback)]
    end

    subgraph n8n Workflow Orchestrator [Port 5678]
        WH[Webhook Trigger: /webhook/casemate-analysis]
        FETCH[Fetch Case Input: GET /api/internal/cases/:id/input]
        A1[Agent 1: Document Analysis Agent]
        A2[Agent 2: Timeline Agent]
        A3[Agent 3: Completeness Agent]
        SAVE[Save Results: POST /api/internal/cases/:id/results]
        FAIL[Record Failure: POST /api/internal/cases/:id/failure]
    end

    FE -->|Create Case & Upload Docs| CR
    FE -->|Upload Documents| DR
    DR --> PARSER
    PARSER --> DB
    FE -->|Trigger Analysis: POST /analyze| CR
    CR -->|HTTP Webhook Trigger| WH
    WH --> FETCH
    FETCH -->|Authenticate via x-internal-secret| IR
    FETCH --> A1
    A1 --> A2
    A2 --> A3
    A3 --> SAVE
    SAVE --> IR
    IR --> VERIF
    VERIF --> DB
    FE -->|Download Report: GET /report.pdf| PDF
    PDF --> DB
```

---

## 🤖 Coordinated AI-Agent Workflow

1. **Agent 1: Document Analysis Agent**
   - Classifies legal documents (*Notice to Quit, Court Summons, Demand Letter, Lease Agreement, Rent Ledger*).
   - Extracts parties, dates, case/docket numbers, explicitly stated actions, and factual claims.
   - Preserves exact source citations, quotations, and page references.
   - **Security Policy**: Wraps all untrusted document input in strict boundary delimiters; neutralizes and flags adversarial prompt-injection attempts.
   - Integrates with OpenRouter API (or reliable deterministic legal extraction fallback).

2. **Agent 2: Timeline Agent**
   - Normalizes disparate date formats (*Month DD, YYYY*, *MM/DD/YYYY*, *YYYY-MM-DD*) to ISO standard dates.
   - Deterministically sorts dated events chronologically in ascending order.
   - Preserves undated events separately.
   - **Deterministic Date Conflict Detection**: Cross-references assertions across distinct documents (e.g., notice issuance date on Oct 01 vs. letter stating service on Sept 25) without allowing an LLM to hallucinate or silently resolve discrepancies.

3. **Agent 3: Completeness Agent**
   - Compares available documents and facts against configurable legal-aid checklists (*Lease Agreement, Rent Ledger, Proof of Service*).
   - Detects unuploaded referenced documents cited in court summons or complaints.
   - Generates targeted clarification questions for the legal-aid worker and client.
   - Strictly distinguishes missing documents from legally mandatory jurisdictional prerequisites.

4. **Deterministic Verification Layer**
   - Validates outputs against Zod schemas.
   - Validates that every source document ID belongs to the case.
   - Checks that quoted excerpts exist in the raw document text.
   - Automatically transitions cases to `human_review_required` if discrepancies or unresolved issues are detected.

---

## 🐳 Quickstart with Docker (Recommended for Sharing & Teams)

Anyone on your team can run the entire system (**Backend + n8n Orchestrator + MongoDB**) with a single command!

### 1. Clone & Start
**On Windows (PowerShell):**
```powershell
git clone https://github.com/Subhash21022/CaseMate-Ai.git
cd CaseMate-Ai
.\start.ps1
```

**On macOS / Linux:**
```bash
git clone https://github.com/Subhash21022/CaseMate-Ai.git
cd CaseMate-Ai
chmod +x start.sh
./start.sh
```

**Or using Docker Compose directly:**
```bash
cp .env.example .env
docker compose up --build -d
# Import the workflow into n8n
docker compose exec n8n n8n import:workflow --input=/backup/casemate_analysis_workflow.json
docker compose exec n8n n8n publish:workflow --id=CMAnalysis01Work
```

**Option B: Using Pre-built Cloud Images (No Build Required)**
```bash
cp .env.example .env
docker compose -f docker-compose.prebuilt.yml up -d
docker compose exec n8n n8n import:workflow --input=/backup/casemate_analysis_workflow.json
docker compose exec n8n n8n publish:workflow --id=CMAnalysis01Work
```

### 2. Available Endpoints
* **Backend API:** `http://localhost:5000`
* **Health Check:** `http://localhost:5000/api/health`
* **n8n Orchestrator:** `http://localhost:5678`
* **MongoDB:** `mongodb://localhost:27017`

---

## 💻 Manual Setup without Docker (Windows PowerShell)

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- (Optional) MongoDB Community Server or MongoDB Atlas (if not running, CaseMate automatically spins up an in-memory MongoDB instance for zero-configuration local development)

### 1. Environment Configuration
The backend comes pre-configured with safe development defaults. Check `backend/.env`:
```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/casemate_ai
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
INTERNAL_API_SECRET=casemate_dev_secret_key_892347
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_PATH=/webhook/casemate-analysis
N8N_USE_TEST_WEBHOOK=false
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=case-documents
```

### 2. Start the Backend Server
In PowerShell:
```powershell
cd backend
npm install
npm run build
npm run start
```
The backend will start at `http://localhost:5000`.

### 3. Start n8n and Import the Workflow
If n8n is not already running:
```powershell
npx n8n start
```
Import the pre-built workflow into n8n:
```powershell
npx n8n import:workflow --input="n8n/casemate_analysis_workflow.json"
npx n8n publish:workflow --id=CMAnalysis01Work
```
Open `http://localhost:5678` in your browser to inspect or edit the workflow visual graph.

---

## 🧪 Automated Testing & Live Verification

### Run the Vitest Automated Test Suite (14 Tests)
```powershell
cd backend
npm test
```
**Test Coverage Includes:**
1. Health check & database connection
2. Case workspace creation & retrieval
3. Invalid Case ID and 404 validation
4. File upload size & format validation
5. Document extraction & duplicate detection (SHA-256)
6. Prompt injection defense & untrusted input isolation
7. Deterministic date normalization & chronological timeline sorting
8. Date conflict detection across distinct documents
9. Completeness analysis & unuploaded referenced document detection
10. Source quotation & citation verification
11. Protected internal route authentication (`x-internal-secret`)
12. Asynchronous workflow status transitions (`created` -> `documents_uploaded` -> `processing` -> `human_review_required`)
13. n8n workflow failure recording (`/failure`)
14. Structured JSON and downloadable PDF report generation

### Run the Live End-to-End Demo Script
Execute the native demo script to verify the live integration between the backend, MongoDB, and n8n:
```powershell
node sample-data/test_live_demo.mjs
```
This script automatically:
1. Verifies system health.
2. Creates a case workspace (`Mercer v. Oakridge Residential Tenancy Dispute`).
3. Uploads 3 synthetic documents (`1_notice_to_quit.pdf`, `2_landlord_letter_conflicting_date.txt`, `3_court_summons_referenced_unuploaded.pdf`).
4. Triggers the n8n analysis workflow.
5. Polls status until transition to `human_review_required`.
6. Retrieves the 10-event verified timeline with date conflict warnings.
7. Retrieves the missing-information checklist (flagging missing lease and rent ledger).
8. Downloads the formatted case preparation PDF report to `sample-data/verified_casemate_report.pdf`.

---

## 📚 API Reference

### Public API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check for backend, database, and n8n status |
| `POST` | `/api/cases` | Create a new case workspace (`{ title, category }`) |
| `GET` | `/api/cases/:id` | Retrieve case details, processing status, and document count |
| `POST` | `/api/cases/:id/documents` | Upload a document (`multipart/form-data`) |
| `GET` | `/api/cases/:id/documents` | List uploaded documents with safe metadata (no file paths exposed) |
| `POST` | `/api/cases/:id/analyze` | Trigger the asynchronous analysis workflow |
| `GET` | `/api/cases/:id/timeline` | Retrieve verified chronological timeline and conflict warnings |
| `GET` | `/api/cases/:id/report` | Retrieve structured JSON report data |
| `GET` | `/api/cases/:id/report.pdf` | Download the case preparation PDF report |

### Protected Internal Endpoints (`x-internal-secret`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/internal/cases/:id/input` | Fetch case details and extracted document texts for n8n |
| `POST` | `/api/internal/cases/:id/results` | Submit and validate workflow results from n8n |
| `POST` | `/api/internal/cases/:id/failure` | Record workflow failure diagnostics safely |
| `POST` | `/api/internal/agents/document-analysis` | Modular runner for Agent 1 |
| `POST` | `/api/internal/agents/timeline` | Modular runner for Agent 2 |
| `POST` | `/api/internal/agents/completeness` | Modular runner for Agent 3 |

---

## ⚖️ Security and Legal Safety Disclaimers

- **Non-Lawyer Administrative Support**: CaseMate AI is designed exclusively for administrative preparation, issue-spotting, and file organization. It does not provide legal advice, legal strategy, or representation.
- **Untrusted Input Protection**: Uploaded legal documents are treated as untrusted user data. Prompt-injection instructions embedded in documents are isolated and ignored.
- **Deterministic Truth**: Dates, timelines, and conflicts are processed using deterministic code to prevent model hallucination or silent resolution of legal disputes.
- **Protected File Storage**: Raw storage paths and files are kept internal; safe metadata only is returned via the API.
