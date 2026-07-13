import { useEffect, useState } from 'react'
import type { MatchState } from '../types'

interface Props {
  seconds: number
  onExpire: () => void
  frozen: boolean
  hostile?: boolean
}

export default function DecisionTimer({ seconds, onExpire, frozen, hostile }: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (frozen) return
    const start = Date.now()
    const duration = seconds * 1000
    let raf: number

    const tick = () => {
      const elapsed = Date.now() - start
      const left = Math.max(0, duration - elapsed)
      setRemaining(left / 1000)
      if (left <= 0) {
        onExpire()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seconds, frozen, onExpire])

  const pct = (remaining / seconds) * 100
  const critical = remaining <= 3

  return (
    <div className={`timer-card ${critical ? 'critical' : ''} ${hostile ? 'hostile-timer' : ''}`}>
      <span className="timer-label">{hostile && critical ? '⚠ DECIDE NOW' : 'Decision Window'}</span>
      <span className="timer-value">{remaining.toFixed(1)}</span>
      <div className="timer-bar">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface HUDProps {
  matchState: MatchState
  round: number
  totalRounds: number
}

export function MatchHUD({ matchState, round, totalRounds }: HUDProps) {
  const pressureClass =
    matchState.pressure === 'Hostile'
      ? 'hostile'
      : matchState.pressure === 'Medium'
        ? 'medium'
        : 'low'

  return (
    <div className={`match-hud ${matchState.pressure === 'Hostile' ? 'hostile-hud' : ''}`}>
      <div className="hud-item">
        <span className="hud-label">Round</span>
        <span className="hud-value">{round}/{totalRounds}</span>
      </div>
      <div className={`hud-item pressure ${pressureClass}`}>
        <span className="hud-label">Crowd</span>
        <span className="hud-value">{matchState.pressure}</span>
      </div>
    </div>
  )
}
