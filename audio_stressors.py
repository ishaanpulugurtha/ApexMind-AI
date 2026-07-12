"""HTML5 audio stressors for crowd/pressure simulation."""

import streamlit as st
import streamlit.components.v1 as components

from config import AUDIO_SOURCES

_AUDIO_HTML = """
<script>
(function() {{
  const PRESSURE = "{pressure}";
  const SRC = "{src}";
  const WHISTLE = "{whistle}";
  const VOL = {volume};
  const SESSION_KEY = "{session_key}";

  // Idempotent: only start audio once per simulation session
  if (window.__apexmindAudioSession === SESSION_KEY) return;
  window.__apexmindAudioSession = SESSION_KEY;

  // Stop any previous audio from a prior session
  if (window.__apexmindCrowd) {{
    window.__apexmindCrowd.pause();
    window.__apexmindCrowd = null;
  }}
  if (window.__apexmindWhistleInterval) {{
    clearInterval(window.__apexmindWhistleInterval);
    window.__apexmindWhistleInterval = null;
  }}

  const crowd = new Audio(SRC);
  crowd.loop = true;
  crowd.preload = "auto";
  crowd.volume = VOL;
  window.__apexmindCrowd = crowd;

  const whistle = new Audio(WHISTLE);
  whistle.preload = "auto";

  if (PRESSURE === "Hostile") {{
    crowd.play().catch(function() {{}});
    window.__apexmindWhistleInterval = setInterval(function() {{
      whistle.currentTime = 0;
      whistle.volume = 0.35;
      whistle.play().catch(function() {{}});
    }}, 12000);
  }} else if (PRESSURE === "Medium") {{
    crowd.volume = VOL * 0.5;
    crowd.play().catch(function() {{}});
  }}
}})();
</script>
"""


def render_pressure_audio(pressure: str, session_key: str) -> None:
    """
    Inject looping crowd audio scaled to pressure intensity.

    Renders at most once per simulation session (keyed by session_key).
    """
    if pressure == "Low":
        return

    # Skip re-injection on Streamlit reruns within the same simulation
    audio_flag = f"audio_started_{session_key}"
    if st.session_state.get(audio_flag):
        return

    src = AUDIO_SOURCES.get("crowd", "")
    whistle = AUDIO_SOURCES.get("whistle", "")
    volume = 0.55 if pressure == "Hostile" else 0.25

    components.html(
        _AUDIO_HTML.format(
            src=src,
            whistle=whistle,
            pressure=pressure,
            volume=volume,
            session_key=session_key,
        ),
        height=0,
    )
    st.session_state[audio_flag] = True
