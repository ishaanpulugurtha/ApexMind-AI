"""Session persistence — Supabase cloud with local JSON fallback."""

import json
import os
import time
from pathlib import Path

STORAGE_PATH = Path(__file__).parent / "data" / "sessions.json"


def _load_local_sessions() -> list[dict]:
    if not STORAGE_PATH.exists():
        return []
    try:
        return json.loads(STORAGE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_local_sessions(sessions: list[dict]) -> None:
    STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORAGE_PATH.write_text(json.dumps(sessions[-100:], indent=2), encoding="utf-8")


def _get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client
        return create_client(url, key)
    except Exception:
        return None


def save_session(entry: dict) -> str:
    """
    Persist a completed simulation session.

    Returns storage backend used: 'supabase' or 'local'.
    """
    entry.setdefault("timestamp", time.strftime("%Y-%m-%d %H:%M:%S"))

    client = _get_supabase_client()
    if client:
        try:
            client.table("sessions").insert(entry).execute()
            return "supabase"
        except Exception:
            pass

    sessions = _load_local_sessions()
    sessions.append(entry)
    _save_local_sessions(sessions)
    return "local"


def load_session_history(limit: int = 20) -> tuple[list[dict], str]:
    """
    Load recent sessions for progress charts.

    Returns (sessions, backend_label).
    """
    client = _get_supabase_client()
    if client:
        try:
            response = (
                client.table("sessions")
                .select("*")
                .order("timestamp", desc=True)
                .limit(limit)
                .execute()
            )
            if response.data:
                return response.data, "supabase"
        except Exception:
            pass

    sessions = _load_local_sessions()
    return sessions[-limit:][::-1], "local"


def load_leaderboard(limit: int = 10) -> tuple[list[dict], str]:
    """Load top composure scores for global ranking display."""
    client = _get_supabase_client()
    if client:
        try:
            response = (
                client.table("sessions")
                .select("sport, level, composure_score, decision_velocity, tactical_integrity, timestamp")
                .order("composure_score", desc=True)
                .limit(limit)
                .execute()
            )
            if response.data:
                return response.data, "supabase"
        except Exception:
            pass

    sessions = _load_local_sessions()
    ranked = sorted(sessions, key=lambda s: s.get("composure_score", 0), reverse=True)
    return ranked[:limit], "local"
