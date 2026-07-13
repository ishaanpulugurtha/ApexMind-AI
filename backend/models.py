"""Pydantic models for ApexMind AI API."""

from pydantic import BaseModel, Field


class StartSessionRequest(BaseModel):
    sport: str = "Soccer"
    position: str = "Central Defensive Midfielder"
    level: str = "Varsity High School"
    time_left: int = Field(default=60, ge=5, le=600)
    score_differential: str = "Tied"
    pressure: str = "Medium"
    catalyst: str = "Just committed a critical turnover"


class ChoiceRequest(BaseModel):
    choice_id: str
    time_remaining: float = Field(ge=0, le=10)


class FreezeRequest(BaseModel):
    time_remaining: float = 0.0


class ChoiceOption(BaseModel):
    id: str
    label: str
    tradeoff: str


class MatchStateView(BaseModel):
    time_left: int
    score_differential: str
    your_score: int = 1
    their_score: int = 1
    pressure: str
    catalyst: str


class ScenarioResponse(BaseModel):
    session_id: str
    node_id: str
    round: int
    total_rounds: int = 3
    scenario_text: str
    scenario_headline: str = ""
    scenario_scan: str = ""
    pitch: dict
    choices: list[ChoiceOption]
    match_state: MatchStateView
    complete: bool = False


class OutcomeResponse(BaseModel):
    outcome: str
    animation: str
    match_state: MatchStateView
    transition: dict
    next_scenario: ScenarioResponse | None = None
    complete: bool = False


class ReportResponse(BaseModel):
    composure_score: float
    decision_velocity: float
    tactical_integrity: float
    reappraisal: dict
    strategies: list[dict]
    replay_log: list[dict]
    transition_log: list[dict]
    storage_backend: str | None = None


class DebriefResponse(BaseModel):
    summary: str
    focus_area: str
    drill: str
    source: str
    notice: str | None = None
