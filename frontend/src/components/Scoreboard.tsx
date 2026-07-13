import { clockLabel, formatScore } from '../lib/scoreboard'
import type { MatchState } from '../types'

interface Props {
  matchState: MatchState
  round?: number
  totalRounds?: number
  compact?: boolean
}

export default function Scoreboard({ matchState, round, totalRounds, compact }: Props) {
  const diff = matchState.your_score - matchState.their_score
  const leading = diff > 0
  const trailing = diff < 0
  const hostile = matchState.pressure === 'Hostile'

  return (
    <div className={`scoreboard ${hostile ? 'hostile' : ''} ${compact ? 'compact' : ''}`}>
      <div className="scoreboard-team you">
        <span className="scoreboard-abbr">YOU</span>
        <span className={`scoreboard-num ${leading ? 'ahead' : ''}`}>{matchState.your_score}</span>
      </div>
      <div className="scoreboard-center">
        <span className="scoreboard-clock">{clockLabel(matchState.time_left)}</span>
        {round != null && totalRounds != null && (
          <span className="scoreboard-round">
            R{round}/{totalRounds}
          </span>
        )}
        {hostile && <span className="scoreboard-crowd">HOSTILE CROWD</span>}
      </div>
      <div className="scoreboard-team opp">
        <span className="scoreboard-abbr">OPP</span>
        <span className={`scoreboard-num ${trailing ? 'behind' : ''}`}>{matchState.their_score}</span>
      </div>
    </div>
  )
}

export function ScoreStrip({ before, after }: { before: string; after: string }) {
  return (
    <div className="score-strip">
      <span className="score-strip-before">{before}</span>
      <span className="score-strip-arrow">→</span>
      <span className="score-strip-after">{after}</span>
    </div>
  )
}

export function formatScorePair(your: number, their: number) {
  return formatScore(your, their)
}
