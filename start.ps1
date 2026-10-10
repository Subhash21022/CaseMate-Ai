# ==============================================================================
# CaseMate AI — One-Click Docker Startup Script (Windows PowerShell)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   CaseMate AI — Automated Docker Stack Initialization    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "[1/4] .env not found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "      Please check .env to configure your OPENROUTER_API_KEY if desired." -ForegroundColor Yellow
} else {
    Write-Host "[1/4] .env file detected." -ForegroundColor Green
}

# 2. Build and start containers
Write-Host "[2/4] Building and starting Docker containers..." -ForegroundColor Cyan
docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker compose failed to start. Is Docker Desktop running?" -ForegroundColor Red
    exit 1
}

# 3. Wait for n8n to initialize and import workflow
Write-Host "[3/4] Waiting for n8n to initialize before importing workflow..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

Write-Host "      Importing legal analysis workflow into n8n..." -ForegroundColor Cyan
docker compose exec n8n n8n import:workflow --input=/backup/casemate_analysis_workflow.json
docker compose exec n8n n8n publish:workflow --id=CMAnalysis01Work

# 4. Success summary
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   CaseMate AI is UP AND RUNNING!                        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Backend API:        http://localhost:5000" -ForegroundColor White
Write-Host "  Health Check:       http://localhost:5000/api/health" -ForegroundColor White
Write-Host "  n8n Orchestrator:   http://localhost:5678" -ForegroundColor White
Write-Host "  MongoDB Database:   mongodb://localhost:27017" -ForegroundColor White
Write-Host ""
Write-Host "To view real-time logs:" -ForegroundColor Gray
Write-Host "  docker compose logs -f" -ForegroundColor Gray
Write-Host "To stop the stack:" -ForegroundColor Gray
Write-Host "  docker compose down" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
