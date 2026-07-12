"""Constants for ApexMind AI backend."""

SPORTS = ["Soccer", "Basketball", "Football", "Tennis", "Baseball"]

POSITIONS_BY_SPORT = {
    "Soccer": [
        "Central Defensive Midfielder",
        "Striker",
        "Center Back",
        "Full Back",
        "Attacking Midfielder",
        "Winger",
        "Goalkeeper",
    ],
    "Basketball": [
        "Point Guard",
        "Shooting Guard",
        "Small Forward",
        "Power Forward",
        "Center",
    ],
}

LEVELS = [
    "Rec / Junior High",
    "Varsity High School",
    "Elite Academy / Club",
    "Collegiate",
]

SCORE_DIFFERENTIALS = ["Down by 1", "Tied", "Up by 2"]

PRESSURE_LEVELS = ["Low", "Medium", "Hostile"]

TRIGGER_CATALYSTS = [
    "Just committed a critical turnover",
    "Missed a crucial free throw/penalty",
    "Coach is yelling from the sideline",
    "Teammate blamed me for a goal",
]

TIMER_SECONDS = 10
TOTAL_ROUNDS = 3

FREEZE_INTEGRITY_WEIGHT = 0.1

STRATEGIES = {
    "velocity": {
        "title": "Box Breathing Sequence",
        "description": (
            "Under time pressure your reaction window narrows. Practice a 4-4-4-4 "
            "box breathing cycle before high-stakes moments."
        ),
    },
    "reappraisal": {
        "title": "3-Second Short Memory Reset Rule",
        "description": (
            "After any mistake, give yourself exactly 3 seconds to acknowledge it, "
            "then verbalize one forward-looking cue (e.g., 'Next play, press high')."
        ),
    },
    "composure": {
        "title": "Pre-Decision Scan Protocol",
        "description": (
            "Before each decision point, run a 1-second peripheral scan: "
            "Where is pressure? Where is space? What is the safest high-upside option?"
        ),
    },
    "freeze": {
        "title": "Panic Response Interrupt Drill",
        "description": (
            "Practice 'default actions' for your position — one rehearsed "
            "fallback move you execute instantly when overwhelmed."
        ),
    },
}

TREE_REGISTRY = {
    ("Soccer", "Central Defensive Midfielder"): "soccer_cdm.json",
}
