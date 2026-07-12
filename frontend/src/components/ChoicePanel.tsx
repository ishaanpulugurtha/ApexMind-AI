import { getChoiceIcon } from '../lib/visuals'
import type { ChoiceOption } from '../types'

interface Props {
  choices: ChoiceOption[]
  disabled: boolean
  hidden: boolean
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
  onSelect,
  onHover,
  selectedId,
  hoveredId,
  choiceCueMap,
}: Props) {
  if (hidden) {
    return (
      <div className="choice-panel scan-placeholder">
        <div className="scan-pulse" />
        <p>Follow the guided scan on the pitch</p>
        <span className="scan-hint">Threat → Danger → Space → You — then choices unlock</span>
      </div>
    )
  }

  return (
    <div className="choice-panel">
      <h3>Your read — pick one</h3>
      {choices.map((c) => {
        const cueLabel = choiceCueMap.get(c.id)
        return (
          <button
            key={c.id}
            type="button"
            className={`choice-btn ${selectedId === c.id ? 'selected' : ''} ${hoveredId === c.id ? 'hovered' : ''}`}
            disabled={disabled}
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
              {cueLabel && <span className="choice-cue-link">↗ Highlights: {cueLabel}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
