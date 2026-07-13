import type { MatchState } from '../types'
import { plainLanguageForPhase } from '../lib/pitchRead'
import { stakesFromScore } from '../lib/scoreboard'

interface Props {
  phase: 'scan' | 'gate' | 'decide'
  pitchEngaged: boolean
  headline: string
  scanHint: string
  scenarioText?: string
  yourScore?: number
  theirScore?: number
  round?: number
  totalRounds?: number
}

export default function PitchReadGuide({
  phase,
  pitchEngaged,
  headline,
  scanHint,
  scenarioText,
  yourScore = 1,
  theirScore = 1,
  round = 1,
  totalRounds = 3,
}: Props) {
  const miniState: MatchState = {
    time_left: 60,
    score_differential: 'Tied',
    your_score: yourScore,
    their_score: theirScore,
    pressure: 'Medium',
    catalyst: '',
  }
  const stakes = stakesFromScore(miniState, round, totalRounds)

  return (
    <div className="pitch-read-guide">
      <div className="scenario-headline">{headline}</div>
      <p className="score-context">
        Score {yourScore}–{theirScore} · {stakes.split('·')[0].trim()}
      </p>
      <p className="scenario-scan">{scanHint}</p>
      {scenarioText && <p className="scenario-sub">{scenarioText}</p>}
      <div className="read-guide-box">
        <strong>What to do now</strong>
        <p>{plainLanguageForPhase(phase, pitchEngaged)}</p>
      </div>
    </div>
  )
}
