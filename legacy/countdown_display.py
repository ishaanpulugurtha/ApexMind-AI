"""Client-side countdown display synced to server start time (no custom component)."""

import streamlit.components.v1 as components

_COUNTDOWN_HTML = """
<div class="timer-shell">
  <div class="timer-label">Decision Window</div>
  <div class="timer-value" id="val">{initial}</div>
  <div class="timer-bar"><div class="timer-bar-fill" id="bar"></div></div>
</div>
<style>
  .timer-shell {{
    background:#1e293b; border:1px solid #334155; border-radius:10px;
    padding:1.2rem 1.5rem; text-align:center; font-family:Inter,sans-serif;
  }}
  .timer-label {{
    color:#94a3b8; font-size:0.75rem; text-transform:uppercase;
    letter-spacing:0.06em; margin-bottom:0.4rem;
  }}
  .timer-value {{
    font-size:2.6rem; font-weight:700; color:#38bdf8;
    font-variant-numeric:tabular-nums;
  }}
  .timer-value.critical {{ color:#ef4444; }}
  .timer-bar {{
    margin-top:0.75rem; height:4px; background:#334155;
    border-radius:2px; overflow:hidden;
  }}
  .timer-bar-fill {{
    height:100%; background:linear-gradient(90deg,#0284c7,#38bdf8);
    border-radius:2px; transition:width 0.05s linear;
  }}
  .timer-bar-fill.critical {{
    background:linear-gradient(90deg,#dc2626,#ef4444);
  }}
</style>
<script>
(function() {{
  const START = {start_ts};
  const DURATION = {duration};
  const val = document.getElementById("val");
  const bar = document.getElementById("bar");
  let rafId = null;

  function tick() {{
    const elapsed = (Date.now() / 1000) - START;
    const remaining = Math.max(0, DURATION - elapsed);
    val.textContent = remaining.toFixed(1);
    bar.style.width = ((remaining / DURATION) * 100) + "%";
    const critical = remaining <= 3;
    val.classList.toggle("critical", critical);
    bar.classList.toggle("critical", critical);
    if (remaining > 0) {{
      rafId = requestAnimationFrame(tick);
    }}
  }}

  if (rafId) cancelAnimationFrame(rafId);
  tick();
}})();
</script>
"""


def render_countdown_display(duration: int, start_timestamp: float) -> None:
    """
    Render a smooth client-side countdown synced to a server-side start time.

    Uses st.components.v1.html (srcdoc iframe) — no declare_component needed.
    Re-mounts on Streamlit rerun but stays in sync because start_timestamp
    is stored in st.session_state.
    """
    import time

    elapsed = time.time() - start_timestamp
    initial = max(0.0, duration - elapsed)

    components.html(
        _COUNTDOWN_HTML.format(
            duration=duration,
            start_ts=start_timestamp,
            initial=f"{initial:.1f}",
        ),
        height=130,
    )
