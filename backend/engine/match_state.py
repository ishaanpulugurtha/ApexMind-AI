"""Deterministic match state transitions."""

from backend.config import PRESSURE_LEVELS

_SCORE_INDEX = {
    "Down by 2": 0,
    "Down by 1": 1,
    "Tied": 2,
    "Up by 1": 3,
    "Up by 2": 4,
}
_INDEX_TO_SCORE = {v: k for k, v in _SCORE_INDEX.items()}
_ONBOARDING_SCORE_MAP = {
    "Down by 1": "Down by 1",
    "Tied": "Tied",
    "Up by 2": "Up by 2",
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


def apply_choice_effects(state: dict, effects: dict, choice_id: str, outcome: str) -> dict:
    """Apply per-choice effects from the decision tree."""
    new_state = dict(state)
    score_delta = effects.get("score_delta", 0)
    time_delta = effects.get("time_delta", 10)
    pressure_delta = effects.get("pressure_delta", 0)

    new_score = _clamp_score_index(state["score_index"] + score_delta)
    new_pressure_idx = max(0, min(len(PRESSURE_LEVELS) - 1, state["pressure_index"] + pressure_delta))

    new_state["score_index"] = new_score
    new_state["score_differential"] = _INDEX_TO_SCORE[new_score]
    new_state["time_left"] = _clamp_time(state["time_left"] - time_delta)
    new_state["pressure_index"] = new_pressure_idx
    new_state["pressure"] = _index_to_pressure(new_pressure_idx)
    new_state.setdefault("transition_log", []).append({
        "choice_id": choice_id,
        "outcome": outcome,
        "new_score": new_state["score_differential"],
        "new_time_left": new_state["time_left"],
        "new_pressure": new_state["pressure"],
    })
    return new_state
