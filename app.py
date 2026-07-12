"""ApexMind AI — High-Performance Cognitive Composure Simulation."""

import sys
import time
import uuid
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from audio_stressors import render_pressure_audio
from countdown_display import render_countdown_display
from config import (
    LEVELS,
    POSITIONS_BY_SPORT,
    PRESSURE_LEVELS,
    SCORE_DIFFERENTIALS,
    SPORTS,
    TIMER_SECONDS,
    TOTAL_ROUNDS,
    TRIGGER_CATALYSTS,
)
from prompt_engine import fetch_scenario
from scoring import (
    build_velocity_log,
    calculate_composure_score,
    calculate_decision_velocity,
    calculate_reappraisal_metric,
    calculate_tactical_integrity,
    get_personalized_strategies,
)
from state_engine import apply_choice_transition, init_match_state, state_to_prompt_params
from storage import load_leaderboard, load_session_history, save_session

st.set_page_config(
    page_title="ApexMind AI",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    .main-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
        padding: 2rem 2.5rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        color: white;
    }
    .main-header h1 { color: #f8fafc; margin: 0; font-size: 2rem; }
    .main-header p { color: #94a3b8; margin: 0.4rem 0 0; }
    .metric-card {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 1.2rem 1.5rem;
        text-align: center;
    }
    .metric-card .value { font-size: 2.4rem; font-weight: 700; color: #38bdf8; }
    .metric-card .label { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .strategy-block {
        background: #0f172a;
        border-left: 4px solid #38bdf8;
        padding: 1rem 1.2rem;
        border-radius: 0 8px 8px 0;
        margin-bottom: 0.8rem;
    }
    div[data-testid="stRadio"] label { font-size: 0.95rem; }
    .stButton > button[kind="primary"] {
        background: linear-gradient(90deg, #0284c7, #0369a1);
        border: none;
        font-weight: 600;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def _init_state():
    defaults = {
        "step": "onboarding",
        "simulation_round": 1,
        "performance_data": [],
        "previous_choices": [],
        "scenario_cache": {},
        "choice_locked": False,
        "match_state": None,
        "api_notice": None,
        "round_timer_start": None,
        "timer_round": None,
        "processed_timer_event": None,
        "sim_session_id": None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def _choice_letter(choice_label: str) -> str:
    if choice_label == "FREEZE":
        return "FREEZE"
    if choice_label.startswith("Option A"):
        return "A"
    if choice_label.startswith("Option B"):
        return "B"
    if choice_label.startswith("Option C"):
        return "C"
    return "B"


def _record_choice(choice_label: str, time_remaining: float):
    st.session_state.performance_data.append({
        "choice": choice_label,
        "time_remaining": time_remaining,
        "round": st.session_state.simulation_round,
    })
    letter = _choice_letter(choice_label)
    st.session_state.previous_choices.append(letter)
    st.session_state.match_state = apply_choice_transition(st.session_state.match_state, letter)
    st.session_state.choice_locked = True


def _advance_or_finish():
    if st.session_state.simulation_round < TOTAL_ROUNDS:
        st.session_state.simulation_round += 1
        st.session_state.choice_locked = False
        st.session_state.processed_timer_event = None
        st.session_state.timer_round = None
    else:
        data = st.session_state.performance_data
        entry = {
            "sport": st.session_state.sport,
            "level": st.session_state.level,
            "position": st.session_state.position,
            "composure_score": calculate_composure_score(data),
            "decision_velocity": calculate_decision_velocity(data),
            "tactical_integrity": calculate_tactical_integrity(data),
            "rounds": len(data),
        }
        backend = save_session(entry)
        st.session_state.storage_backend = backend
        st.session_state.step = "analytics"


def _handle_freeze():
    if st.session_state.choice_locked:
        return
    _record_choice("FREEZE", 0.0)
    _advance_or_finish()


def _ensure_round_timer():
    """Start server-side clock once per simulation round."""
    rnd = st.session_state.simulation_round
    if st.session_state.timer_round != rnd:
        st.session_state.timer_round = rnd
        st.session_state.round_timer_start = time.time()
        st.session_state.processed_timer_event = None


def _get_time_remaining() -> float:
    if st.session_state.round_timer_start is None:
        return float(TIMER_SECONDS)
    elapsed = time.time() - st.session_state.round_timer_start
    return max(0.0, TIMER_SECONDS - elapsed)


def _load_scenario_for_round():
    rnd = st.session_state.simulation_round
    if rnd in st.session_state.scenario_cache:
        return st.session_state.scenario_cache[rnd]

    params = state_to_prompt_params(
        st.session_state.match_state,
        st.session_state.sport,
        st.session_state.position,
        st.session_state.level,
    )

    with st.spinner("Generating scenario…"):
        scenario = fetch_scenario(params, rnd, st.session_state.previous_choices)

    if scenario.get("notice"):
        st.session_state.api_notice = scenario["notice"]

    st.session_state.scenario_cache[rnd] = scenario
    st.session_state.choice_locked = False
    return scenario


def _render_header(title: str, subtitle: str):
    st.markdown(
        f'<div class="main-header"><h1>{title}</h1><p>{subtitle}</p></div>',
        unsafe_allow_html=True,
    )


def _format_slider_time(seconds: int) -> str:
    if seconds >= 60:
        m, s = divmod(seconds, 60)
        return f"{m} min {s} sec"
    return f"{seconds} sec"


@st.fragment(run_every=1)
def _watch_timer_expiry():
    """Server-side freeze detection — no custom component callbacks."""
    if st.session_state.choice_locked:
        return
    if st.session_state.round_timer_start is None:
        return

    rnd = st.session_state.simulation_round
    event_id = f"freeze_r{rnd}"

    if (
        _get_time_remaining() <= 0
        and st.session_state.processed_timer_event != event_id
    ):
        st.session_state.processed_timer_event = event_id
        _handle_freeze()
        st.rerun(scope="app")


def render_onboarding():
    _render_header(
        "ApexMind AI // High-Performance Assessment",
        "Configure match stress parameters to begin your cognitive composure simulation.",
    )

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Athlete Profile")
        sport = st.selectbox("Target Athletic Domain", SPORTS)
        positions = POSITIONS_BY_SPORT.get(sport, [])
        position = st.selectbox("Tactical Field Position", positions)
        level = st.radio("Competitive Tier", LEVELS, horizontal=False)

    with col2:
        st.subheader("Match Parameters")
        time_left = st.slider(
            "Time Remaining",
            min_value=5,
            max_value=600,
            value=60,
            step=5,
            help="Seconds remaining in the match (5 s – 10 min).",
        )
        st.caption(f"Display: {_format_slider_time(time_left)}")

        score_differential = st.radio(
            "Score Differential",
            SCORE_DIFFERENTIALS,
            horizontal=True,
            index=1,
        )

        pressure = st.select_slider(
            "Crowd / Pressure Intensity",
            options=PRESSURE_LEVELS,
            value="Medium",
        )

    st.subheader("Psychological Catalyst")
    catalyst = st.selectbox(
        "Immediate Mental Hurdle",
        TRIGGER_CATALYSTS,
        label_visibility="collapsed",
    )

    st.divider()

    if st.button("Generate Simulation", type="primary", use_container_width=True):
        onboarding = {
            "time_left": time_left,
            "score_differential": score_differential,
            "pressure": pressure,
            "catalyst": catalyst,
        }
        st.session_state.sport = sport
        st.session_state.position = position
        st.session_state.level = level
        st.session_state.time_left = time_left
        st.session_state.score_differential = score_differential
        st.session_state.pressure = pressure
        st.session_state.catalyst = catalyst
        st.session_state.match_state = init_match_state(onboarding)
        st.session_state.step = "simulation"
        st.session_state.simulation_round = 1
        st.session_state.performance_data = []
        st.session_state.previous_choices = []
        st.session_state.scenario_cache = {}
        st.session_state.choice_locked = False
        st.session_state.api_notice = None
        st.session_state.round_timer_start = None
        st.session_state.timer_round = None
        st.session_state.processed_timer_event = None
        st.session_state.sim_session_id = str(uuid.uuid4())[:8]
        st.rerun()


def render_simulation():
    rnd = st.session_state.simulation_round
    state = st.session_state.match_state

    _render_header(
        f"Scenario Context Layer {rnd} of {TOTAL_ROUNDS}",
        f"{st.session_state.sport} · {st.session_state.position} · {st.session_state.level}",
    )

    if st.session_state.api_notice:
        st.warning(st.session_state.api_notice)

    session_id = st.session_state.sim_session_id or "default"
    render_pressure_audio(state["pressure"], session_key=session_id)

    scenario = _load_scenario_for_round()
    _ensure_round_timer()

    info_cols = st.columns(4)
    info_cols[0].metric("Time Left (Match)", _format_slider_time(state["time_left"]))
    info_cols[1].metric("Score", state["score_differential"])
    info_cols[2].metric("Crowd", state["pressure"])
    info_cols[3].metric("Catalyst", st.session_state.catalyst[:28] + "…")

    if state.get("transition_log"):
        st.caption(f"State update: {state['transition_log'][-1]['narrative']}")

    st.markdown("---")
    st.markdown(f"**{scenario['scenario_text']}**")

    timer_col, choice_col = st.columns([1, 3])

    with timer_col:
        render_countdown_display(TIMER_SECONDS, st.session_state.round_timer_start)
        _watch_timer_expiry()
        st.caption("Client-side · 60fps")

    with choice_col:
        options = [
            f"Option A: {scenario['option_a']}",
            f"Option B: {scenario['option_b']}",
            f"Option C: {scenario['option_c']}",
        ]
        choice = st.radio(
            "Select immediate course of action:",
            options,
            index=None,
            disabled=st.session_state.choice_locked,
        )

        if st.button(
            "Lock Input",
            type="primary",
            disabled=st.session_state.choice_locked or choice is None,
            use_container_width=True,
        ):
            time_remaining = _get_time_remaining()
            _record_choice(choice, time_remaining)
            _advance_or_finish()
            st.rerun()


def _render_progress_chart(sessions: list[dict]):
    if len(sessions) < 2:
        return
    st.subheader("Composure Timeline")
    chart_data = {
        "Composure": [s.get("composure_score", 0) for s in reversed(sessions)],
        "Velocity": [s.get("decision_velocity", 0) for s in reversed(sessions)],
        "Tactical": [s.get("tactical_integrity", 0) for s in reversed(sessions)],
    }
    st.line_chart(chart_data, use_container_width=True)


def render_analytics():
    _render_header(
        "ApexMind AI // Performance Report Summary",
        "Mindset analytics calculated from your 3-step stress simulation.",
    )

    data = st.session_state.performance_data
    velocity = calculate_decision_velocity(data)
    integrity = calculate_tactical_integrity(data)
    composure = calculate_composure_score(data)
    reappraisal = calculate_reappraisal_metric(data)
    strategies = get_personalized_strategies(velocity, integrity, data, reappraisal)
    velocity_log = build_velocity_log(data)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(
            f'<div class="metric-card"><div class="label">Composure Baseline</div>'
            f'<div class="value">{composure}%</div></div>',
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            f'<div class="metric-card"><div class="label">Decision Velocity</div>'
            f'<div class="value">{velocity}%</div></div>',
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            f'<div class="metric-card"><div class="label">Tactical Integrity</div>'
            f'<div class="value">{integrity}%</div></div>',
            unsafe_allow_html=True,
        )
    with c4:
        freeze_count = sum(1 for e in data if e.get("choice") == "FREEZE")
        st.markdown(
            f'<div class="metric-card"><div class="label">Freeze Responses</div>'
            f'<div class="value">{freeze_count}</div></div>',
            unsafe_allow_html=True,
        )

    st.caption(
        "Composure = average of Decision Velocity (reaction speed) "
        "and Tactical Integrity (choice quality) — tracked independently."
    )
    st.info(reappraisal["detail"])

    st.subheader("Tactical Velocity Metrics Log")
    st.dataframe(velocity_log, use_container_width=True, hide_index=True)

    st.subheader("Personalized Psychological Strategy")
    for strat in strategies:
        st.markdown(
            f'<div class="strategy-block">'
            f"<strong>{strat['title']}</strong><br>{strat['description']}"
            f"</div>",
            unsafe_allow_html=True,
        )

    sessions, backend = load_session_history()
    backend_label = st.session_state.get("storage_backend", backend)
    st.caption(f"Progress data source: {backend_label}")

    _render_progress_chart(sessions)

    leaderboard, _ = load_leaderboard()
    if leaderboard:
        st.subheader("Global Leaderboard")
        st.dataframe(
            [
                {
                    "Sport": r.get("sport", "—"),
                    "Level": r.get("level", "—"),
                    "Composure": r.get("composure_score", 0),
                    "Velocity": r.get("decision_velocity", 0),
                    "Tactical": r.get("tactical_integrity", 0),
                }
                for r in leaderboard
            ],
            use_container_width=True,
            hide_index=True,
        )

    with st.expander("Raw Performance Vectors"):
        st.json(data)

    if st.session_state.match_state and st.session_state.match_state.get("transition_log"):
        with st.expander("State Transition Log"):
            st.json(st.session_state.match_state["transition_log"])

    st.divider()
    if st.button("Reset Matrix Engine", use_container_width=True):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()


_init_state()

if st.session_state.step == "onboarding":
    render_onboarding()
elif st.session_state.step == "simulation":
    render_simulation()
elif st.session_state.step == "analytics":
    render_analytics()
