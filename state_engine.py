"""Deterministic match-state transitions for branching simulation logic."""

from config import PRESSURE_LEVELS, SCORE_DIFFERENTIALS

# Internal score index: lower = worse for the athlete
_SCORE_INDEX = {
    "Down by 2": 0,
    "Down by 1": 1,
    "Tied": 2,
    "Up by 1": 3,
    "Up by 2": 4,
}

_INDEX_TO_SCORE = {v: k for k, v in _SCORE_INDEX.items()}

# Onboarding labels map into the internal scale
_ONBOARDING_SCORE_MAP = {
    "Down by 1": "Down by 1",
    "Tied": "Tied",
    "Up by 2": "Up by 2",
}

CHOICE_TRANSITIONS = {
    "A": {
        "score_delta": -1,
        "time_delta": 30,
        "pressure_delta": 1,
        "narrative": "The emotional gamble backfired — possession lost and pressure spiked.",
    },
    "B": {
        "score_delta": 0,
        "time_delta": 15,
        "pressure_delta": 0,
        "narrative": "The safe play preserved the ball but burned valuable clock.",
    },
    "C": {
        "score_delta": 1,
        "time_delta": 10,
        "pressure_delta": -1,
        "narrative": "The composed read created an advantage — momentum shifted your way.",
    },
    "FREEZE": {
        "score_delta": -1,
        "time_delta": 20,
        "pressure_delta": 1,
        "narrative": "The delayed response left teammates exposed and the crowd erupted.",
    },
}


def _clamp_score_index(index: int) -> int:
    return max(0, min(4, index))


def _clamp_time(seconds: int) -> int:
    return max(5, seconds)


def _pressure_index(level: str) -> int:
    try:
        return PRESSURE_LEVELS.index(level)
    except ValueError:
        return 1


def _index_to_pressure(index: int) -> str:
    index = max(0, min(len(PRESSURE_LEVELS) - 1, index))
    return PRESSURE_LEVELS[index]


def init_match_state(onboarding: dict) -> dict:
    """Build structured match state from onboarding inputs."""
    score_label = _ONBOARDING_SCORE_MAP.get(
        onboarding["score_differential"], onboarding["score_differential"]
    )
    return {
        "time_left": onboarding["time_left"],
        "score_differential": score_label,
        "score_index": _SCORE_INDEX.get(score_label, 2),
        "pressure": onboarding["pressure"],
        "pressure_index": _pressure_index(onboarding["pressure"]),
        "catalyst": onboarding["catalyst"],
        "transition_log": [],
    }


def apply_choice_transition(state: dict, choice_letter: str) -> dict:
    """
    Apply deterministic state changes after a choice.

    Returns a new state dict — does not mutate the input.
    """
    transition = CHOICE_TRANSITIONS.get(choice_letter, CHOICE_TRANSITIONS["B"])
    new_state = dict(state)

    new_score = _clamp_score_index(state["score_index"] + transition["score_delta"])
    new_pressure = _pressure_index(
        _index_to_pressure(state["pressure_index"] + transition["pressure_delta"])
    )

    new_state["score_index"] = new_score
    new_state["score_differential"] = _INDEX_TO_SCORE[new_score]
    new_state["time_left"] = _clamp_time(state["time_left"] - transition["time_delta"])
    new_state["pressure_index"] = new_pressure
    new_state["pressure"] = _index_to_pressure(new_pressure)
    new_state.setdefault("transition_log", []).append({
        "choice": choice_letter,
        "narrative": transition["narrative"],
        "new_score": new_state["score_differential"],
        "new_time_left": new_state["time_left"],
        "new_pressure": new_state["pressure"],
    })
    return new_state


def state_to_prompt_params(state: dict, sport: str, position: str, level: str) -> dict:
    """Convert structured match state into prompt-engine parameters."""
    last_narrative = ""
    if state.get("transition_log"):
        last_narrative = state["transition_log"][-1]["narrative"]

    return {
        "sport": sport,
        "position": position,
        "level": level,
        "time_left": state["time_left"],
        "score_differential": state["score_differential"],
        "pressure": state["pressure"],
        "catalyst": state["catalyst"],
        "state_narrative": last_narrative,
    }
