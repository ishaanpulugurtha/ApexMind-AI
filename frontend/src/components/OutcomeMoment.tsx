import { useEffect, useState } from 'react'
import { pulseCrowd } from '../lib/crowdAudio'
import { formatScore } from '../lib/scoreboard'

interface Props {
  outcome: string
  animation: string
  previousYour: number
  previousTheir: number
  newYour: number
  newTheir: number
  onDone: () => void
}

function isNegativeOutcome(animation: string, outcome: string): boolean {
  const neg = ['offside_fail', 'dribble_loss', 'panic_clear', 'second_yellow', 'freeze', 'foul_stop']
  if (neg.some((a) => animation.includes(a))) return true
  return /goal|intercept|yellow|off|groan|erupt|spiral/i.test(outcome)
}

export default function OutcomeMoment({
  outcome,
  animation,
  previousYour,
  previousTheir,
  newYour,
  newTheir,
  onDone,
}: Props) {
  const [visible, setVisible] = useState(true)
  const negative = isNegativeOutcome(animation, outcome)
  const scoreChanged = previousYour !== newYour || previousTheir !== newTheir

  useEffect(() => {
    pulseCrowd()
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  if (!visible) return <div className="outcome-moment exit" aria-hidden />

  return (
    <div className={`outcome-moment ${negative ? 'negative' : 'positive'}`} role="alert">
      <div className="outcome-moment-inner">
        <span className="outcome-moment-label">{negative ? 'CONSEQUENCE' : 'RESULT'}</span>
        <p className="outcome-moment-text">{outcome}</p>
        {scoreChanged && (
          <div className="score-shift">
            <span className="score-old">{formatScore(previousYour, previousTheir)}</span>
            <span className="score-arrow">→</span>
            <span className={`score-new ${negative ? 'bad' : 'good'}`}>
              {formatScore(newYour, newTheir)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
