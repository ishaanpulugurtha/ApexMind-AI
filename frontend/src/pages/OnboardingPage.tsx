import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Config, StartParams } from '../types'

const FEATURES = [
  { icon: '👁️', title: 'Visual Scan Training', desc: 'Read arrows & zones on the pitch — not paragraphs.' },
  { icon: '🌳', title: 'Branching Decisions', desc: 'Round 1 choice changes your Round 2 scenario.' },
  { icon: '⚡', title: 'Zero Token Gameplay', desc: 'Deterministic engine — AI debrief only after.' },
]

export default function OnboardingPage() {
  const nav = useNavigate()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<StartParams>({
    sport: 'Soccer',
    position: 'Central Defensive Midfielder',
    level: 'Varsity High School',
    time_left: 60,
    score_differential: 'Tied',
    pressure: 'Medium',
    catalyst: 'Just committed a critical turnover',
  })

  useEffect(() => {
    api.getConfig().then(setConfig).catch(console.error)
  }, [])

  const positions = config?.positions_by_sport[params.sport] ?? [params.position]

  const start = async () => {
    setLoading(true)
    try {
      const scenario = await api.startSession(params)
      nav(`/sim/${scenario.session_id}`, { state: { scenario } })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start — is the backend running on port 8001?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing">
      <div className="landing-bg" />

      <header className="landing-hero">
        <div className="hero-content">
          <p className="eyebrow">Congressional App Challenge 2026</p>
          <h1>ApexMind AI</h1>
          <p className="hero-tagline">
            Train composure under match pressure — scan the pitch, make the read, live with the consequence.
          </p>
          <div className="feature-pills">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-pill">
                <span className="pill-icon">{f.icon}</span>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-visual">
          <div className="mock-pitch">
            <div className="mock-arrow threat" />
            <div className="mock-arrow open" />
            <div className="mock-player you">YOU</div>
            <div className="mock-player opp">#10</div>
            <div className="mock-ball" />
          </div>
          <p className="mock-caption">Visual-first decisions · Not a reading test</p>
        </div>
      </header>

      <div className="config-section">
        <h2>Configure Match Stress</h2>
        <div className="onboarding-grid">
          <section className="panel glass">
            <h3>Athlete Profile</h3>
            <label>
              Sport
              <select
                value={params.sport}
                onChange={(e) => {
                  const sport = e.target.value
                  const pos = config?.positions_by_sport[sport]?.[0] ?? params.position
                  setParams({ ...params, sport, position: pos })
                }}
              >
                {(config?.sports ?? ['Soccer']).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Position
              <select
                value={params.position}
                onChange={(e) => setParams({ ...params, position: e.target.value })}
              >
                {positions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Level
              <select
                value={params.level}
                onChange={(e) => setParams({ ...params, level: e.target.value })}
              >
                {(config?.levels ?? []).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="panel glass">
            <h3>Match Parameters</h3>
            <label>
              Time Remaining: <strong>{params.time_left}s</strong>
              <input
                type="range"
                min={5}
                max={600}
                step={5}
                value={params.time_left}
                onChange={(e) => setParams({ ...params, time_left: +e.target.value })}
              />
            </label>
            <label>
              Score
              <div className="radio-row">
                {(config?.score_differentials ?? ['Tied']).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={params.score_differential === s ? 'pill active' : 'pill'}
                    onClick={() => setParams({ ...params, score_differential: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Crowd Pressure
              <select
                value={params.pressure}
                onChange={(e) => setParams({ ...params, pressure: e.target.value })}
              >
                {(config?.pressure_levels ?? []).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Catalyst
              <select
                value={params.catalyst}
                onChange={(e) => setParams({ ...params, catalyst: e.target.value })}
              >
                {(config?.trigger_catalysts ?? []).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </section>
        </div>

        <button className="primary-btn cta-btn" onClick={start} disabled={loading}>
          {loading ? 'Drawing scenario…' : 'Enter Match Simulation →'}
        </button>
        <p className="footnote">
          Random Round 1 scenario each run · 8 entry situations · 0 API calls during play
        </p>
      </div>
    </div>
  )
}
