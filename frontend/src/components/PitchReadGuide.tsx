import { plainLanguageForPhase, scoreContextLine } from '../lib/pitchRead'

interface Props {
  phase: 'scan' | 'gate' | 'decide'
  pitchEngaged: boolean
  headline: string
  scanHint: string
  scenarioText?: string
  scoreDifferential?: string
}

export default function PitchReadGuide({
  phase,
  pitchEngaged,
  headline,
  scanHint,
  scenarioText,
  scoreDifferential,
}: Props) {
  const scoreLine = scoreDifferential ? scoreContextLine(scoreDifferential) : null

  return (
    <div className="pitch-read-guide">
      <div className="scenario-headline">{headline}</div>
      {scoreLine && <p className="score-context">{scoreLine}</p>}
      <p className="scenario-scan">{scanHint}</p>
      {scenarioText && <p className="scenario-sub">{scenarioText}</p>}
      <div className="read-guide-box">
        <strong>What to do now</strong>
        <p>{plainLanguageForPhase(phase, pitchEngaged)}</p>
      </div>
    </div>
  )
}
