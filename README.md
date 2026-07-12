# ApexMind AI

Interactive, multi-sport cognitive composure simulation for competitive youth athletes. Built for the **Congressional App Challenge 2026**.

## Stack

- **Python** + **Streamlit** (dashboard UI)
- **OpenAI API** (JSON mode scenario generation)
- **Supabase** (optional cloud session storage & leaderboard)
- **Client-side JS countdown** (60fps, zero server lag)
- **HTML5 audio stressors** (crowd noise scaled to pressure level)

## Quick Start

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

copy .env.example .env       # add OPENAI_API_KEY (optional)
streamlit run app.py
```

## Scoring Model

Composure is decomposed into two independent sub-metrics:

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Decision Velocity** | `(t_i / 10) × 100` | Fast reactions score high |
| **Tactical Integrity** | `W_choice × 100` | Choice quality (C=100, B=70, A=40, Freeze=10) |
| **Composure Baseline** | Average of both | Headline score |

## Architecture

```
ApexMind AI/
├── app.py                          # Main Streamlit app
├── config.py                       # Sports, positions, constants
├── prompt_engine.py                # OpenAI JSON-mode + graceful fallback
├── scoring.py                      # Velocity & integrity algorithms
├── state_engine.py                 # Deterministic branching state machine
├── storage.py                      # Supabase + local JSON fallback
├── audio_stressors.py              # HTML5 crowd/whistle audio
├── countdown_display.py            # Client-side JS countdown (html iframe)
├── supabase_schema.sql             # Cloud DB setup script
└── data/                           # Local sessions (gitignored)
```

## Cloud Setup (Optional)

1. Create a free [Supabase](https://supabase.com) project
2. Run `supabase_schema.sql` in the SQL Editor
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

Without Supabase, sessions save locally to `data/sessions.json`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | Live LLM scenario generation |
| `SUPABASE_URL` | No | Cloud session storage |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |

## Author

Ishaan Pulugurtha — Congressional App Challenge 2026
