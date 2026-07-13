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
_START_SCORES = {
    "Down by 2": (0, 2),
    "Down by 1": (0, 1),
    "Tied": (1, 1),
    "Up by 1": (2, 1),
    "Up by 2": (3, 1),
}
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


def _sync_differential(state: dict) -> dict:
    diff = state["your_score"] - state["their_score"]
    state["score_index"] = _clamp_score_index(2 + diff)
    state["score_differential"] = _INDEX_TO_SCORE[state["score_index"]]
    return state


def init_match_state(onboarding: dict) -> dict:
    score_label = _ONBOARDING_SCORE_MAP.get(
        onboarding["score_differential"], onboarding["score_differential"]
    )
    your_score, their_score = _START_SCORES.get(score_label, (1, 1))
    return {
        "time_left": onboarding["time_left"],
        "score_differential": score_label,
        "your_score": your_score,
        "their_score": their_score,
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

    your_score = state.get("your_score", 1)
    their_score = state.get("their_score", 1)
    if score_delta > 0:
        your_score += score_delta
    elif score_delta < 0:
        their_score += abs(score_delta)

    new_state["your_score"] = your_score
    new_state["their_score"] = their_score
    _sync_differential(new_state)

    new_pressure_idx = max(0, min(len(PRESSURE_LEVELS) - 1, state["pressure_index"] + pressure_delta))

    new_state["time_left"] = _clamp_time(state["time_left"] - time_delta)
    new_state["pressure_index"] = new_pressure_idx
    new_state["pressure"] = _index_to_pressure(new_pressure_idx)
    new_state.setdefault("transition_log", []).append({
        "choice_id": choice_id,
        "outcome": outcome,
        "new_score": new_state["score_differential"],
        "your_score": new_state["your_score"],
        "their_score": new_state["their_score"],
        "new_time_left": new_state["time_left"],
        "new_pressure": new_state["pressure"],
    })
    return new_state
