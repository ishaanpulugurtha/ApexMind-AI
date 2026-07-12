"""ApexMind AI — FastAPI backend."""

import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from backend.config import (
    LEVELS,
    POSITIONS_BY_SPORT,
    PRESSURE_LEVELS,
    SCORE_DIFFERENTIALS,
    SPORTS,
    TIMER_SECONDS,
    TOTAL_ROUNDS,
    TRIGGER_CATALYSTS,
    TREE_REGISTRY,
)
from backend.debrief import generate_debrief
from backend.engine.decision_tree import (
    find_choice,
    get_node,
    pick_entry_node,
    get_tree,
    node_to_response,
    resolve_next_node,
)
from backend.engine.match_state import apply_choice_effects, init_match_state
from backend.engine.scoring import (
    build_replay_log,
    calculate_composure_score,
    calculate_decision_velocity,
    calculate_reappraisal_metric,
    calculate_tactical_integrity,
    get_personalized_strategies,
)
from backend.config import FREEZE_INTEGRITY_WEIGHT
from backend.models import (
    ChoiceRequest,
    DebriefResponse,
    FreezeRequest,
    MatchStateView,
    OutcomeResponse,
    ReportResponse,
    ScenarioResponse,
    StartSessionRequest,
)
from backend.storage import load_leaderboard, load_session_history, save_session

# In-memory active sessions
_sessions: dict[str, dict] = {}


def _match_state_view(state: dict) -> MatchStateView:
    return MatchStateView(
        time_left=state["time_left"],
        score_differential=state["score_differential"],
        pressure=state["pressure"],
        catalyst=state["catalyst"],
    )


def _build_scenario(session: dict) -> ScenarioResponse:
    node = get_node(session["tree"], session["current_node_id"])
    payload = node_to_response(node, session["match_state"])
    return ScenarioResponse(
        session_id=session["id"],
        node_id=payload["node_id"],
        round=payload["round"],
        total_rounds=TOTAL_ROUNDS,
        scenario_text=payload["scenario_text"],
        scenario_headline=payload.get("scenario_headline", ""),
        scenario_scan=payload.get("scenario_scan", ""),
        pitch=payload["pitch"],
        choices=payload["choices"],
        match_state=MatchStateView(**payload["match_state"]),
        complete=False,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    _sessions.clear()


app = FastAPI(title="ApexMind AI", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/config")
def get_config():
    return {
        "sports": SPORTS,
        "positions_by_sport": POSITIONS_BY_SPORT,
        "levels": LEVELS,
        "score_differentials": SCORE_DIFFERENTIALS,
        "pressure_levels": PRESSURE_LEVELS,
        "trigger_catalysts": TRIGGER_CATALYSTS,
        "timer_seconds": TIMER_SECONDS,
        "total_rounds": TOTAL_ROUNDS,
        "available_trees": [
            {"sport": k[0], "position": k[1]} for k in TREE_REGISTRY
        ],
    }


@app.post("/api/session/start", response_model=ScenarioResponse)
def start_session(req: StartSessionRequest):
    if (req.sport, req.position) not in TREE_REGISTRY:
        raise HTTPException(400, f"No scenario tree for {req.sport} / {req.position}")

    tree = get_tree(req.sport, req.position)
    start = pick_entry_node(tree, req.catalyst)
    session_id = str(uuid.uuid4())[:12]

    onboarding = req.model_dump()
    match_state = init_match_state(onboarding)

    _sessions[session_id] = {
        "id": session_id,
        "sport": req.sport,
        "position": req.position,
        "level": req.level,
        "tree": tree,
        "current_node_id": start["id"],
        "entry_node_id": start["id"],
        "match_state": match_state,
        "performance_data": [],
        "complete": False,
    }
    return _build_scenario(_sessions[session_id])


def _get_session(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@app.get("/api/session/{session_id}/scenario", response_model=ScenarioResponse)
def get_scenario(session_id: str):
    session = _get_session(session_id)
    if session["complete"]:
        raise HTTPException(400, "Session already complete")
    return _build_scenario(session)


@app.post("/api/session/{session_id}/choice", response_model=OutcomeResponse)
def submit_choice(session_id: str, req: ChoiceRequest):
    session = _get_session(session_id)
    if session["complete"]:
        raise HTTPException(400, "Session already complete")

    node = get_node(session["tree"], session["current_node_id"])
    choice = find_choice(node, req.choice_id)
    if not choice:
        raise HTTPException(400, f"Invalid choice: {req.choice_id}")

    session["performance_data"].append({
        "round": node["round"],
        "choice_id": choice["id"],
        "choice_label": choice["label"],
        "time_remaining": req.time_remaining,
        "integrity_weight": choice["integrity_weight"],
        "outcome": choice["outcome"],
        "node_id": node["id"],
    })

    session["match_state"] = apply_choice_effects(
        session["match_state"],
        choice.get("effects", {}),
        choice["id"],
        choice["outcome"],
    )

    next_node_id = resolve_next_node(session["tree"], choice.get("next_node"), session["match_state"])
    transition = session["match_state"]["transition_log"][-1]

    if next_node_id:
        session["current_node_id"] = next_node_id
        next_scenario = _build_scenario(session)
        return OutcomeResponse(
            outcome=choice["outcome"],
            animation=choice.get("animation", "default"),
            match_state=_match_state_view(session["match_state"]),
            transition=transition,
            next_scenario=next_scenario,
            complete=False,
        )

    session["complete"] = True
    _persist_session(session)
    return OutcomeResponse(
        outcome=choice["outcome"],
        animation=choice.get("animation", "default"),
        match_state=_match_state_view(session["match_state"]),
        transition=transition,
        next_scenario=None,
        complete=True,
    )


@app.post("/api/session/{session_id}/freeze", response_model=OutcomeResponse)
def submit_freeze(session_id: str, req: FreezeRequest):
    session = _get_session(session_id)
    if session["complete"]:
        raise HTTPException(400, "Session already complete")

    node = get_node(session["tree"], session["current_node_id"])
    outcome = "Decision window expired — panic freeze. Teammates left exposed."

    session["performance_data"].append({
        "round": node["round"],
        "choice_id": "FREEZE",
        "choice_label": "Panic / Freeze",
        "time_remaining": 0,
        "integrity_weight": FREEZE_INTEGRITY_WEIGHT,
        "outcome": outcome,
        "node_id": node["id"],
    })

    session["match_state"] = apply_choice_effects(
        session["match_state"],
        {"score_delta": -1, "time_delta": 20, "pressure_delta": 1},
        "FREEZE",
        outcome,
    )

    # Advance to first choice's next node as penalty path, or complete if round 3
    fallback = node["choices"][0] if node.get("choices") else {}
    next_node_id = resolve_next_node(session["tree"], fallback.get("next_node"), session["match_state"])
    transition = session["match_state"]["transition_log"][-1]

    if next_node_id and node["round"] < TOTAL_ROUNDS:
        session["current_node_id"] = next_node_id
        return OutcomeResponse(
            outcome=outcome,
            animation="freeze",
            match_state=_match_state_view(session["match_state"]),
            transition=transition,
            next_scenario=_build_scenario(session),
            complete=False,
        )

    session["complete"] = True
    _persist_session(session)
    return OutcomeResponse(
        outcome=outcome,
        animation="freeze",
        match_state=_match_state_view(session["match_state"]),
        transition=transition,
        next_scenario=None,
        complete=True,
    )


def _persist_session(session: dict):
    data = session["performance_data"]
    entry = {
        "sport": session["sport"],
        "level": session["level"],
        "position": session["position"],
        "composure_score": calculate_composure_score(data),
        "decision_velocity": calculate_decision_velocity(data),
        "tactical_integrity": calculate_tactical_integrity(data),
        "rounds": len(data),
    }
    session["storage_backend"] = save_session(entry)


@app.get("/api/session/{session_id}/report", response_model=ReportResponse)
def get_report(session_id: str):
    session = _get_session(session_id)
    data = session["performance_data"]
    velocity = calculate_decision_velocity(data)
    integrity = calculate_tactical_integrity(data)
    reappraisal = calculate_reappraisal_metric(data)
    return ReportResponse(
        composure_score=calculate_composure_score(data),
        decision_velocity=velocity,
        tactical_integrity=integrity,
        reappraisal=reappraisal,
        strategies=get_personalized_strategies(velocity, integrity, data, reappraisal),
        replay_log=build_replay_log(data),
        transition_log=session["match_state"].get("transition_log", []),
        storage_backend=session.get("storage_backend"),
    )


@app.post("/api/session/{session_id}/debrief", response_model=DebriefResponse)
def post_debrief(session_id: str):
    session = _get_session(session_id)
    data = session["performance_data"]
    report = {
        "sport": session["sport"],
        "position": session["position"],
        "level": session["level"],
        "composure_score": calculate_composure_score(data),
        "decision_velocity": calculate_decision_velocity(data),
        "tactical_integrity": calculate_tactical_integrity(data),
        "reappraisal": calculate_reappraisal_metric(data),
    }
    replay = build_replay_log(data)
    result = generate_debrief(report, replay)
    return DebriefResponse(**result)


@app.get("/api/leaderboard")
def leaderboard():
    rows, backend = load_leaderboard()
    return {"backend": backend, "rows": rows}


@app.get("/api/history")
def history():
    rows, backend = load_session_history()
    return {"backend": backend, "rows": rows}
