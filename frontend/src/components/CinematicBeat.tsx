import { clockLabel, stakesFromScore } from '../lib/scoreboard'
import type { MatchState } from '../types'

interface Props {
  headline: string
  matchState: MatchState
  round: number
  totalRounds: number
  onComplete: () => void
}

/** Overlay on the real pitch — no abstract fake field. */
export default function CinematicBeat({
  headline,
  matchState,
  round,
  totalRounds,
  onComplete,
}: Props) {
  const hostile = matchState.pressure === 'Hostile'

  return (
    <div className="cinematic-overlay" role="dialog" aria-label="Decision moment">
      <div className="cinematic-vignette" />
      <div className="cinematic-shoulder left" />
      <div className="cinematic-shoulder right" />
      {hostile && (
        <>
          <div className="cinematic-periph threat-left" />
          <div className="cinematic-periph threat-right" />
        </>
      )}
      <div className="cinematic-copy">
        <span className="cinematic-badge">
          {hostile ? 'Crowd roaring' : 'Clock running'} · {clockLabel(matchState.time_left)}
        </span>
        <h2>{headline}</h2>
        <p className="cinematic-stakes">
          {stakesFromScore(matchState, round, totalRounds)}
        </p>
        <p className="cinematic-hint">The pitch above is your read — pick your action below.</p>
        <button type="button" className="primary-btn cinematic-cta" onClick={onComplete}>
          Start decision window →
        </button>
      </div>
    </div>
  )
}
