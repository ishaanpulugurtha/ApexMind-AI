import os

import streamlit.components.v1 as components

_COMPONENT_PATH = os.path.join(os.path.dirname(__file__), "frontend")
_countdown = components.declare_component("countdown_timer", path=_COMPONENT_PATH)


def countdown_timer(
    duration: int = 10,
    capture: bool = False,
    reset_key: str = "0",
    key: str | None = None,
) -> dict | None:
    """
    Client-side countdown timer.

    Returns a dict when an event fires:
      {"event": "freeze", "time_remaining": 0.0}
      {"event": "capture", "time_remaining": float}
    """
    result = _countdown(
        duration=duration,
        capture=capture,
        reset_key=reset_key,
        key=key,
        default=None,
    )
    return result if isinstance(result, dict) else None
