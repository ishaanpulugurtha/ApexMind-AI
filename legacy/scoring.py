"""Composure and cognitive reappraisal scoring for ApexMind AI."""

from config import CHOICE_WEIGHTS, TIMER_SECONDS


def _extract_choice_letter(choice: str) -> str:
    if choice == "FREEZE":
        return "FREEZE"
    if choice.startswith("Option A"):
        return "A"
    if choice.startswith("Option B"):
        return "B"
    if choice.startswith("Option C"):
        return "C"
    return "B"


def calculate_decision_velocity(performance_data: list[dict]) -> float:
    """
    Decision Velocity — how fast the athlete processed each scenario.

    Velocity Component = t_i / 10  (t_i = seconds remaining when clicked)
    Fast response (9s left) → 0.9 | Slow response (1s left) → 0.1
    """
    if not performance_data:
        return 0.0

    total = 0.0
    for entry in performance_data:
        t_remaining = min(TIMER_SECONDS, max(0, entry.get("time_remaining", 0)))
        total += t_remaining / TIMER_SECONDS

    return round((total / len(performance_data)) * 100, 1)


def calculate_tactical_integrity(performance_data: list[dict]) -> float:
    """
    Tactical Integrity — quality of choices independent of reaction speed.

    Based solely on W_choice weights (C=1.0, B=0.7, A=0.4, FREEZE=0.1).
    """
    if not performance_data:
        return 0.0

    total = 0.0
    for entry in performance_data:
        letter = _extract_choice_letter(entry.get("choice", ""))
        total += CHOICE_WEIGHTS.get(letter, 0.7)

    return round((total / len(performance_data)) * 100, 1)


def calculate_composure_score(performance_data: list[dict]) -> float:
    """
    Composite Composure = average of Decision Velocity and Tactical Integrity.

    Keeps sub-metrics separate in analytics; this is the headline score.
    """
    velocity = calculate_decision_velocity(performance_data)
    integrity = calculate_tactical_integrity(performance_data)
    return round((velocity + integrity) / 2, 1)


def calculate_reappraisal_metric(performance_data: list[dict]) -> dict:
    """Categorize choices as tactical-forward vs emotional-dwell."""
    if not performance_data:
        return {"category": "Insufficient Data", "detail": "No choices recorded."}

    counts = {"tactical": 0, "neutral": 0, "emotional": 0, "freeze": 0}

    for entry in performance_data:
        letter = _extract_choice_letter(entry.get("choice", ""))
        if letter == "C":
            counts["tactical"] += 1
        elif letter == "B":
            counts["neutral"] += 1
        elif letter == "A":
            counts["emotional"] += 1
        else:
            counts["freeze"] += 1

    dominant = max(counts, key=counts.get)

    categories = {
        "tactical": (
            "Tactical Reappraisal",
            "You consistently chose composed, forward-looking actions under pressure.",
        ),
        "neutral": (
            "Risk-Averse Neutral",
            "You defaulted to safe, submissive actions rather than seizing tactical advantage.",
        ),
        "emotional": (
            "Emotional Fixation",
            "Your choices reflected high-risk emotional reactions tied to the catalyst event.",
        ),
        "freeze": (
            "Decision Paralysis",
            "You experienced freeze responses when decision windows closed.",
        ),
    }

    label, detail = categories[dominant]
    return {
        "category": label,
        "detail": detail,
        "breakdown": counts,
    }


def get_personalized_strategies(
    velocity: float,
    integrity: float,
    performance_data: list[dict],
    reappraisal: dict,
) -> list[dict]:
    """Return targeted psychological exercises based on weakest sub-metrics."""
    from config import STRATEGIES

    strategies = []
    composure = (velocity + integrity) / 2

    avg_time_remaining = 0.0
    if performance_data:
        avg_time_remaining = sum(
            e.get("time_remaining", 0) for e in performance_data
        ) / len(performance_data)

    freeze_count = sum(
        1 for e in performance_data if _extract_choice_letter(e.get("choice", "")) == "FREEZE"
    )
    emotional_count = sum(
        1 for e in performance_data if _extract_choice_letter(e.get("choice", "")) == "A"
    )

    if freeze_count > 0:
        strategies.append(STRATEGIES["freeze"])

    if velocity < 50 or avg_time_remaining < 3:
        strategies.append(STRATEGIES["velocity"])

    if integrity < 60 or emotional_count >= 2:
        strategies.append(STRATEGIES["reappraisal"])

    if composure < 60:
        strategies.append(STRATEGIES["composure"])

    if not strategies:
        strategies.append({
            "title": "Maintain Peak Protocol",
            "description": (
                "Your composure metrics are strong. Continue reinforcing your "
                "pre-decision routine and add variability — simulate hostile crowd "
                "scenarios in practice to stress-test your baseline."
            ),
        })

    return strategies


def build_velocity_log(performance_data: list[dict]) -> list[dict]:
    """Format performance entries for the analytics display."""
    log = []
    for i, entry in enumerate(performance_data, start=1):
        letter = _extract_choice_letter(entry.get("choice", ""))
        t_remaining = entry.get("time_remaining", 0)
        log.append({
            "round": i,
            "choice": letter,
            "time_remaining_s": round(t_remaining, 2),
            "velocity_pts": round((t_remaining / TIMER_SECONDS) * 100, 1),
            "tactical_pts": round(CHOICE_WEIGHTS.get(letter, 0.7) * 100, 1),
            "reaction_type": {
                "A": "High-Risk Emotional",
                "B": "Safe/Passive",
                "C": "High-Composure Tactical",
                "FREEZE": "Panic / Freeze",
            }.get(letter, "Unknown"),
        })
    return log
