import { stakesFromScore } from '../lib/scoreboard'
import type { MatchState } from '../types'

interface Props {
  headline: string
  matchState: MatchState
  round: number
  totalRounds: number
  active: boolean
}

export default function StakesBanner({ headline, matchState, round, totalRounds, active }: Props) {
  if (!active) return null

  const isDown = matchState.your_score < matchState.their_score
  const isHostile = matchState.pressure === 'Hostile'
  const stakes = stakesFromScore(matchState, round, totalRounds)

  return (
    <div className={`stakes-banner ${isDown ? 'down' : ''} ${isHostile ? 'hostile' : ''}`}>
      <div className="stakes-top">
        <span className="stakes-pulse">{isHostile ? '🔊 CROWD HOSTILE' : '⏱ PRESSURE ON'}</span>
        <span className="stakes-round">
          Round {round}/{totalRounds}
        </span>
      </div>
      <h2 className="stakes-headline">{headline}</h2>
      <p className="stakes-line">{stakes}</p>
    </div>
  )
}
