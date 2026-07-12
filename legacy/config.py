"""Constants and sport-specific configuration for ApexMind AI."""

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
    "Football": [
        "Quarterback",
        "Running Back",
        "Wide Receiver",
        "Linebacker",
        "Cornerback",
        "Safety",
        "Offensive Lineman",
        "Defensive Lineman",
    ],
    "Tennis": [
        "Singles Player",
        "Doubles Player (Net)",
        "Doubles Player (Baseline)",
    ],
    "Baseball": [
        "Pitcher",
        "Catcher",
        "Shortstop",
        "Center Fielder",
        "Designated Hitter",
        "Relief Pitcher",
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

CHOICE_WEIGHTS = {
    "A": 0.4,
    "B": 0.7,
    "C": 1.0,
    "FREEZE": 0.1,
}

TIMER_SECONDS = 10
TOTAL_ROUNDS = 3

# Royalty-free audio CDN sources (Mixkit)
AUDIO_SOURCES = {
    "crowd": "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    "whistle": "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
}

STRATEGIES = {
    "velocity": {
        "title": "Box Breathing Sequence",
        "description": (
            "Under time pressure your reaction window narrows. Practice a 4-4-4-4 "
            "box breathing cycle before high-stakes moments: inhale 4s, hold 4s, "
            "exhale 4s, hold 4s. Repeat twice between possessions to reset your "
            "parasympathetic response."
        ),
    },
    "reappraisal": {
        "title": "3-Second Short Memory Reset Rule",
        "description": (
            "You showed a tendency to dwell on the emotional catalyst rather than "
            "the next tactical action. After any mistake, give yourself exactly "
            "3 seconds to acknowledge it, then verbalize one forward-looking cue "
            "(e.g., 'Next play, press high'). This breaks rumination loops."
        ),
    },
    "composure": {
        "title": "Pre-Decision Scan Protocol",
        "description": (
            "Your composure score indicates hesitation under crowd pressure. "
            "Before each decision point, run a 1-second peripheral scan: "
            "Where is pressure? Where is space? What is the safest high-upside "
            "option? Drill this until it becomes automatic."
        ),
    },
    "freeze": {
        "title": "Panic Response Interrupt Drill",
        "description": (
            "You experienced a freeze response when the countdown expired. "
            "Practice 'default actions' for your position — one rehearsed "
            "fallback move you execute instantly when overwhelmed (e.g., "
            "shield and recycle possession). Muscle memory beats analysis paralysis."
        ),
    },
}
