"""HTML5 audio stressors for crowd/pressure simulation."""

import streamlit.components.v1 as components

from config import AUDIO_SOURCES

_AUDIO_HTML = """
<div id="audio-wrap" style="display:none;">
  <audio id="crowd-audio" loop preload="auto" src="{src}" volume="{volume}"></audio>
  <audio id="whistle-audio" preload="auto" src="{whistle}"></audio>
</div>
<script>
(function() {{
  const pressure = "{pressure}";
  const crowd = document.getElementById("crowd-audio");
  const whistle = document.getElementById("whistle-audio");
  if (!crowd) return;

  crowd.volume = {volume};

  if (pressure === "Hostile") {{
    crowd.play().catch(() => {{}});
    setInterval(() => {{
      whistle.currentTime = 0;
      whistle.volume = 0.35;
      whistle.play().catch(() => {{}});
    }}, 12000);
  }} else if (pressure === "Medium") {{
    crowd.volume = {volume} * 0.5;
    crowd.play().catch(() => {{}});
  }}
}})();
</script>
"""


def render_pressure_audio(pressure: str) -> None:
    """Inject looping crowd audio scaled to pressure intensity."""
    if pressure == "Low":
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
        ),
        height=0,
    )
