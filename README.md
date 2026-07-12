# ApexMind AI v2

Cognitive composure training for competitive youth athletes — **React + Phaser + FastAPI**.

Built for the Congressional App Challenge 2026.

## Architecture

```
ApexMind AI/
├── backend/           FastAPI — decision tree engine, scoring, Supabase, LLM debrief
├── frontend/          React + Phaser 3 — match simulation UI
├── legacy/            Archived Streamlit MVP (v1)
└── data/              Local session JSON (gitignored)
```

## Quick Start

### 1. Backend (terminal 1)

```bash
pip install -r backend/requirements.txt
# Copy .env with OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY (optional)

uvicorn backend.main:app --reload --port 8001
```

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## What's New in v2

| Feature | Description |
|---------|-------------|
| **Decision Tree** | Curated Soccer CDM scenarios — no "Option C always wins" |
| **Phaser Pitch** | Styled top-down pitch with players, pressure zones, animations |
| **0 runtime LLM calls** | Gameplay is 100% deterministic; 1 optional debrief call after |
| **Branching paths** | Your choice in R1 determines which R2 scenario you face |
| **Visible consequences** | Score, clock, crowd update on-screen after every decision |
| **Decision replay** | Full path log with integrity + velocity per round |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | Sports, levels, catalysts |
| POST | `/api/session/start` | Begin simulation |
| POST | `/api/session/{id}/choice` | Submit decision |
| POST | `/api/session/{id}/freeze` | Timeout penalty |
| GET | `/api/session/{id}/report` | Analytics report |
| POST | `/api/session/{id}/debrief` | AI debrief (1 LLM call) |

## Author

Ishaan Pulugurtha
