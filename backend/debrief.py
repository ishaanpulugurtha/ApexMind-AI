"""Post-game LLM debrief — single API call per completed session."""

import json
import logging
import os

from openai import APIConnectionError, APITimeoutError, AuthenticationError, OpenAI, RateLimitError

logger = logging.getLogger(__name__)


def _fallback_debrief(report: dict) -> dict:
    velocity = report.get("decision_velocity", 0)
    integrity = report.get("tactical_integrity", 0)
    return {
        "summary": (
            f"Composure score {report.get('composure_score', 0)}% — "
            f"velocity {velocity}%, tactical integrity {integrity}%."
        ),
        "focus_area": "Pre-decision scan under hostile crowd noise",
        "drill": "Run 3-second memory reset after every turnover in practice.",
        "source": "fallback",
    }


def generate_debrief(report: dict, replay_log: list[dict]) -> dict:
    """One LLM call after simulation completes. Returns personalized debrief."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        result = _fallback_debrief(report)
        result["notice"] = "Offline debrief — add OPENAI_API_KEY for AI-generated analysis."
        return result

    choices_summary = "\n".join(
        f"Round {r['round']}: {r['choice_label']} (integrity {r['integrity_pts']}%) — {r['outcome']}"
        for r in replay_log
    )

    prompt = (
        f"You are an elite sports psychologist. An athlete completed a cognitive composure simulation.\n"
        f"Sport: {report.get('sport')} | Position: {report.get('position')} | Level: {report.get('level')}\n"
        f"Composure: {report.get('composure_score')}% | Velocity: {report.get('decision_velocity')}% | "
        f"Integrity: {report.get('tactical_integrity')}%\n"
        f"Reappraisal: {report.get('reappraisal', {}).get('category', 'N/A')}\n\n"
        f"Choice path:\n{choices_summary}\n\n"
        f"Return JSON with keys: summary (2 sentences), focus_area (1 phrase), drill (1 actionable exercise)."
    )

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a concise sports psychologist. Output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )
        data = json.loads(response.choices[0].message.content)
        return {
            "summary": data.get("summary", ""),
            "focus_area": data.get("focus_area", ""),
            "drill": data.get("drill", ""),
            "source": "openai",
        }
    except (AuthenticationError, RateLimitError, APITimeoutError, APIConnectionError) as exc:
        logger.warning("Debrief API failed: %s", exc)
        result = _fallback_debrief(report)
        result["notice"] = "API unavailable — using offline debrief."
        return result
    except Exception as exc:
        logger.exception("Debrief error")
        result = _fallback_debrief(report)
        result["notice"] = f"Fallback debrief ({type(exc).__name__})."
        return result
