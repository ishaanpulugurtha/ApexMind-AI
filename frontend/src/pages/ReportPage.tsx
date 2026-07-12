import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import MetricRing from '../components/MetricRing'
import { getChoiceIcon, integrityColor, integrityLabel } from '../lib/visuals'
import type { Debrief, Report } from '../types'

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [report, setReport] = useState<Report | null>(null)
  const [debrief, setDebrief] = useState<Debrief | null>(null)
  const [loadingDebrief, setLoadingDebrief] = useState(false)
  const [leaderboard, setLeaderboard] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    if (!sessionId) return
    api.getReport(sessionId).then(setReport).catch(console.error)
    api.getLeaderboard().then((r) => setLeaderboard(r.rows)).catch(console.error)
  }, [sessionId])

  const loadDebrief = async () => {
    if (!sessionId) return
    setLoadingDebrief(true)
    try {
      setDebrief(await api.getDebrief(sessionId))
    } finally {
      setLoadingDebrief(false)
    }
  }

  if (!report) return <div className="page loading-screen">Analyzing performance…</div>

  const grade =
    report.composure_score >= 75 ? 'A' :
    report.composure_score >= 60 ? 'B' :
    report.composure_score >= 45 ? 'C' : 'D'

  return (
    <div className="page report-page">
      <header className="report-hero">
        <div>
          <p className="eyebrow">Session Complete</p>
          <h1>Performance Report</h1>
          <p className="reappraisal-tag">{report.reappraisal.category}</p>
        </div>
        <div className="grade-badge">{grade}</div>
      </header>

      <div className="metrics-rings">
        <MetricRing value={report.composure_score} label="Composure" accent delay={0} />
        <MetricRing value={report.decision_velocity} label="Velocity" delay={120} />
        <MetricRing value={report.tactical_integrity} label="Integrity" delay={240} />
      </div>

      <p className="reappraisal">{report.reappraisal.detail}</p>

      <section className="panel glass">
        <h2>Decision Path Replay</h2>
        <div className="replay-timeline">
          {report.replay_log.map((r, i) => (
            <div key={r.round} className="replay-card" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="replay-icon">{getChoiceIcon(r.choice_id)}</div>
              <div className="replay-content">
                <div className="replay-top">
                  <span className="replay-round">Round {r.round}</span>
                  <span
                    className="integrity-badge"
                    style={{ color: integrityColor(r.integrity_weight) }}
                  >
                    {integrityLabel(r.integrity_weight)}
                  </span>
                </div>
                <strong>{r.choice_label}</strong>
                <p>{r.outcome}</p>
                <div className="bar-row">
                  <div className="bar-label">Velocity</div>
                  <div className="bar-track">
                    <div className="bar-fill velocity" style={{ width: `${r.velocity_pts}%` }} />
                  </div>
                  <span>{r.velocity_pts}%</span>
                </div>
                <div className="bar-row">
                  <div className="bar-label">Integrity</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill integrity"
                      style={{
                        width: `${r.integrity_pts}%`,
                        background: integrityColor(r.integrity_weight),
                      }}
                    />
                  </div>
                  <span>{r.integrity_pts}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel glass">
        <h2>Training Focus</h2>
        <div className="strategy-grid">
          {report.strategies.map((s) => (
            <div key={s.title} className="strategy-card">
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel glass debrief-panel">
        <h2>AI Debrief {debrief?.source === 'openai' ? '✦' : ''}</h2>
        {!debrief ? (
          <button className="secondary-btn glow" onClick={loadDebrief} disabled={loadingDebrief}>
            {loadingDebrief ? 'Generating…' : 'Generate AI Debrief (1 API call)'}
          </button>
        ) : (
          <div className="debrief-content">
            {debrief.notice && <p className="notice">{debrief.notice}</p>}
            <p className="debrief-summary">{debrief.summary}</p>
            <div className="debrief-tags">
              <span><strong>Focus:</strong> {debrief.focus_area}</span>
              <span><strong>Drill:</strong> {debrief.drill}</span>
            </div>
          </div>
        )}
      </section>

      {leaderboard.length > 0 && (
        <section className="panel glass">
          <h2>Global Leaderboard</h2>
          <div className="lb-cards">
            {leaderboard.slice(0, 5).map((row, i) => (
              <div key={i} className={`lb-card rank-${i + 1}`}>
                <span className="lb-rank">#{i + 1}</span>
                <div>
                  <strong>{String(row.sport)} · {String(row.level)}</strong>
                  <span>{String(row.composure_score)}% composure</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link to="/" className="primary-btn link-btn">← New Simulation</Link>
    </div>
  )
}
