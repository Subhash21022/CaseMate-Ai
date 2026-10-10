#!/bin/bash
# ==============================================================================
# CaseMate AI — One-Click Docker Startup Script (macOS / Linux)
# ==============================================================================

set -e

echo -e "\033[1;36m==========================================================\033[0m"
echo -e "\033[1;36m   CaseMate AI — Automated Docker Stack Initialization    \033[0m"
echo -e "\033[1;36m==========================================================\033[0m"

# 1. Check for .env file
if [ ! -f ".env" ]; then
    echo -e "\033[1;33m[1/4] .env not found. Creating from .env.example...\033[0m"
    cp .env.example .env
    echo -e "\033[1;33m      Please check .env to configure your OPENROUTER_API_KEY if desired.\033[0m"
else
    echo -e "\033[1;32m[1/4] .env file detected.\033[0m"
fi

# 2. Build and start containers
echo -e "\033[1;36m[2/4] Building and starting Docker containers...\033[0m"
docker compose up --build -d

# 3. Wait for n8n to initialize and import workflow
echo -e "\033[1;36m[3/4] Waiting for n8n to initialize before importing workflow...\033[0m"
sleep 8

echo -e "\033[1;36m      Importing legal analysis workflow into n8n...\033[0m"
docker compose exec n8n n8n import:workflow --input=/backup/casemate_analysis_workflow.json
docker compose exec n8n n8n publish:workflow --id=CMAnalysis01Work

# 4. Success summary
echo ""
echo -e "\033[1;32m==========================================================\033[0m"
echo -e "\033[1;32m   CaseMate AI is UP AND RUNNING!                        \033[0m"
echo -e "\033[1;32m==========================================================\033[0m"
echo -e "  Backend API:        http://localhost:5000"
echo -e "  Health Check:       http://localhost:5000/api/health"
echo -e "  n8n Orchestrator:   http://localhost:5678"
echo -e "  MongoDB Database:   mongodb://localhost:27017"
echo ""
echo -e "\033[0;37mTo view real-time logs:\033[0m"
echo -e "  docker compose logs -f"
echo -e "\033[0;37mTo stop the stack:\033[0m"
echo -e "  docker compose down"
echo -e "\033[1;32m==========================================================\033[0m"
