import { getChoiceIcon } from '../lib/visuals'
import type { ChoiceOption } from '../types'

interface Props {
  choices: ChoiceOption[]
  disabled: boolean
  hidden: boolean
  labelsRevealed: boolean
  onSelect: (choiceId: string) => void
  onHover: (choiceId: string | null) => void
  selectedId: string | null
  hoveredId: string | null
  choiceCueMap: Map<string, string | null>
}

export default function ChoicePanel({
  choices,
  disabled,
  hidden,
  labelsRevealed,
  onSelect,
  onHover,
  selectedId,
  hoveredId,
  choiceCueMap,
}: Props) {
  if (hidden) return null

  return (
    <div className="choice-panel">
      <h3>Your read — confirm or adjust</h3>
      {choices.map((c) => {
        const cueLabel = choiceCueMap.get(c.id)
        return (
          <button
            key={c.id}
            type="button"
            className={`choice-btn ${selectedId === c.id ? 'selected' : ''} ${hoveredId === c.id ? 'hovered' : ''}`}
            disabled={disabled || !labelsRevealed}
            onClick={() => onSelect(c.id)}
            onMouseEnter={() => onHover(c.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(c.id)}
            onBlur={() => onHover(null)}
          >
            <span className="choice-icon">{getChoiceIcon(c.id)}</span>
            <span className="choice-content">
              <span className="choice-label">{c.label}</span>
              <span className="choice-tradeoff">{c.tradeoff}</span>
              {cueLabel && <span className="choice-cue-link">Pitch zone: {cueLabel}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
