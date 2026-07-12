"""OpenAI prompt generation and scenario fetching for ApexMind AI."""

import json
import logging
import os

from openai import APIConnectionError, APITimeoutError, AuthenticationError, OpenAI, RateLimitError

from config import TOTAL_ROUNDS

logger = logging.getLogger(__name__)

CHOICE_CONTEXT = {
    "A": "The athlete chose a high-risk emotional reaction in the previous moment.",
    "B": "The athlete chose a safe, passive submissive action in the previous moment.",
    "C": "The athlete chose a high-composure tactical assessment in the previous moment.",
    "FREEZE": "The athlete froze and failed to respond before the countdown expired.",
}


def _format_time_remaining(seconds: int) -> str:
    if seconds >= 60:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} {secs} second{'s' if secs != 1 else ''}"
    return f"{seconds} second{'s' if seconds != 1 else ''}"


def build_system_prompt(params: dict, round_num: int, previous_choices: list[str]) -> str:
    sport = params["sport"]
    position = params["position"]
    level = params["level"]
    time_str = _format_time_remaining(params["time_left"])
    score = params["score_differential"]
    pressure = params["pressure"]
    catalyst = params["catalyst"]
    state_narrative = params.get("state_narrative", "")

    branch_context = ""
    if round_num > 1:
        parts = [f"This is micro-scenario {round_num} of {TOTAL_ROUNDS}."]
        if previous_choices:
            last = previous_choices[-1]
            parts.append(CHOICE_CONTEXT.get(last, ""))
        if state_narrative:
            parts.append(f"Deterministic state update: {state_narrative}")
        parts.append(
            "The scenario MUST reflect the exact match state provided — "
            "do not invent a different score, time, or pressure level."
        )
        branch_context = " " + " ".join(parts)

    return (
        f"You are an elite sports psychologist and tactical coordinator for {sport}. "
        f"Generate a highly specific, intense, realistic match scenario for a {position} "
        f"playing at the {level} level. "
        f"MATCH STATE (use exactly): {time_str} remaining, score is {score}, "
        f"crowd noise is {pressure}. "
        f"Mental catalyst: {catalyst}.{branch_context} "
        f"Write a short, intense 3-sentence description of the immediate tactical crossroad. "
        f"Provide exactly three options. Option A = High-Risk Emotional Reaction. "
        f"Option B = Safe/Passive Submissive Action. "
        f"Option C = High-Composure Tactical Assessment. "
        f"Output exclusively in valid JSON with keys: scenario_text, option_a, option_b, option_c."
    )


def _fallback_scenario(params: dict, round_num: int, previous_choices: list[str]) -> dict:
    """Deterministic fallback when the API is unavailable."""
    sport = params["sport"]
    catalyst = params["catalyst"]
    score = params["score_differential"]
    time_str = _format_time_remaining(params["time_left"])
    pressure = params["pressure"]
    state_narrative = params.get("state_narrative", "")

    follow = state_narrative
    if not follow and previous_choices:
        last = previous_choices[-1]
        follow = {
            "A": "Your aggressive gamble backfired — the situation has worsened.",
            "B": "Your cautious play kept possession but the crowd senses hesitation.",
            "C": "Your composed read bought time, but pressure is mounting fast.",
            "FREEZE": "Your delayed response left teammates exposed and the crowd furious.",
        }.get(last, "")

    base = (
        f"Match state: {time_str} left, {score}, {pressure} crowd. "
        f"{follow} " if follow else ""
    )

    scenarios = {
        1: (
            f"{base}You are locked in a {sport} match when {catalyst.lower()}. "
            f"The noise spikes and every eye is on you. "
            f"A split-second decision will define the next sequence."
        ),
        2: (
            f"{base}The game tempo accelerates and your marker closes the space. "
            f"You must process the mistake and execute under pressure."
        ),
        3: (
            f"{base}Final critical moment — composure or collapse. "
            f"The outcome of this possession could decide the match. "
            f"Your body is tense but one clear action remains available."
        ),
    }

    return {
        "scenario_text": scenarios.get(round_num, scenarios[1]),
        "option_a": "React impulsively — force the play through frustration and adrenaline.",
        "option_b": "Play it safe — defer to a teammate and avoid any further risk.",
        "option_c": "Pause, scan the field, and execute the highest-percentage tactical read.",
        "source": "fallback",
    }


def fetch_scenario(params: dict, round_num: int, previous_choices: list[str]) -> dict:
    """
    Call OpenAI in JSON mode or return a fallback scenario.

    Returns dict with scenario fields plus optional 'source' and 'notice' keys.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        result = _fallback_scenario(params, round_num, previous_choices)
        result["notice"] = "Running in offline mode — add OPENAI_API_KEY for live scenarios."
        return result

    client = OpenAI(api_key=api_key)
    system_prompt = build_system_prompt(params, round_num, previous_choices)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Generate the scenario now. Return JSON with scenario_text, "
                        "option_a, option_b, option_c."
                    ),
                },
            ],
            temperature=0.85,
            max_tokens=500,
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)
        return {
            "scenario_text": data.get("scenario_text", ""),
            "option_a": data.get("option_a", ""),
            "option_b": data.get("option_b", ""),
            "option_c": data.get("option_c", ""),
            "source": "openai",
        }
    except AuthenticationError:
        logger.warning("OpenAI authentication failed — using fallback scenarios.")
        result = _fallback_scenario(params, round_num, previous_choices)
        result["notice"] = "API key invalid — switched to offline fallback scenarios."
        return result
    except (RateLimitError, APITimeoutError, APIConnectionError) as exc:
        logger.warning("OpenAI request failed (%s) — using fallback.", exc)
        result = _fallback_scenario(params, round_num, previous_choices)
        result["notice"] = "API temporarily unavailable — using offline fallback scenarios."
        return result
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.warning("Malformed OpenAI response (%s) — using fallback.", exc)
        result = _fallback_scenario(params, round_num, previous_choices)
        result["notice"] = "Unexpected API response — using offline fallback scenarios."
        return result
    except Exception as exc:
        logger.exception("Unhandled OpenAI error")
        result = _fallback_scenario(params, round_num, previous_choices)
        result["notice"] = f"Simulation engine fallback active ({type(exc).__name__})."
        return result
