"""Composure scoring based on decision-tree choice weights."""

from backend.config import FREEZE_INTEGRITY_WEIGHT, STRATEGIES, TIMER_SECONDS


def calculate_decision_velocity(performance_data: list[dict]) -> float:
    if not performance_data:
        return 0.0
    total = sum(
        min(TIMER_SECONDS, max(0, e.get("time_remaining", 0))) / TIMER_SECONDS
        for e in performance_data
    )
    return round((total / len(performance_data)) * 100, 1)


def calculate_tactical_integrity(performance_data: list[dict]) -> float:
    if not performance_data:
        return 0.0
    total = sum(e.get("integrity_weight", 0.5) for e in performance_data)
    return round((total / len(performance_data)) * 100, 1)


def calculate_composure_score(performance_data: list[dict]) -> float:
    velocity = calculate_decision_velocity(performance_data)
    integrity = calculate_tactical_integrity(performance_data)
    return round((velocity + integrity) / 2, 1)


def calculate_reappraisal_metric(performance_data: list[dict]) -> dict:
    if not performance_data:
        return {"category": "Insufficient Data", "detail": "No choices recorded."}

    high = sum(1 for e in performance_data if e.get("integrity_weight", 0) >= 0.75)
    mid = sum(1 for e in performance_data if 0.45 <= e.get("integrity_weight", 0) < 0.75)
    low = sum(1 for e in performance_data if e.get("integrity_weight", 0) < 0.45)
    freeze = sum(1 for e in performance_data if e.get("choice_id") == "FREEZE")

    if freeze >= 2:
        dominant = "freeze"
    elif low >= 2:
        dominant = "emotional"
    elif high >= 2:
        dominant = "tactical"
    else:
        dominant = "neutral"

    categories = {
        "tactical": ("Tactical Reappraisal", "Strong reads under pressure — you prioritized high-integrity decisions."),
        "neutral": ("Mixed Decision Profile", "Your choices balanced risk and safety without a clear tactical identity."),
        "emotional": ("Impulse-Driven", "Low-integrity choices suggest emotional or reactive decision-making."),
        "freeze": ("Decision Paralysis", "Freeze responses indicate breakdown under time pressure."),
    }
    label, detail = categories[dominant]
    return {
        "category": label,
        "detail": detail,
        "breakdown": {"high_integrity": high, "mid_integrity": mid, "low_integrity": low, "freeze": freeze},
    }


def get_personalized_strategies(
    velocity: float, integrity: float, performance_data: list[dict], reappraisal: dict
) -> list[dict]:
    strategies = []
    composure = (velocity + integrity) / 2
    freeze_count = sum(1 for e in performance_data if e.get("choice_id") == "FREEZE")
    low_count = sum(1 for e in performance_data if e.get("integrity_weight", 1) < 0.45)

    if freeze_count > 0:
        strategies.append(STRATEGIES["freeze"])
    if velocity < 50:
        strategies.append(STRATEGIES["velocity"])
    if low_count >= 2:
        strategies.append(STRATEGIES["reappraisal"])
    if composure < 60:
        strategies.append(STRATEGIES["composure"])
    if not strategies:
        strategies.append({
            "title": "Maintain Peak Protocol",
            "description": STRATEGIES["composure"]["description"],
        })
    return strategies


def build_replay_log(performance_data: list[dict]) -> list[dict]:
    log = []
    for i, entry in enumerate(performance_data, start=1):
        log.append({
            "round": i,
            "choice_id": entry.get("choice_id"),
            "choice_label": entry.get("choice_label", ""),
            "time_remaining_s": round(entry.get("time_remaining", 0), 2),
            "integrity_weight": entry.get("integrity_weight", 0),
            "integrity_pts": round(entry.get("integrity_weight", 0) * 100, 1),
            "velocity_pts": round(
                (entry.get("time_remaining", 0) / TIMER_SECONDS) * 100, 1
            ),
            "outcome": entry.get("outcome", ""),
        })
    return log
