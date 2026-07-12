import { getChoiceIcon } from '../lib/visuals'
import type { ChoiceOption } from '../types'

interface Props {
  choices: ChoiceOption[]
  disabled: boolean
  hidden: boolean
  onSelect: (choiceId: string) => void
  selectedId: string | null
}

export default function ChoicePanel({ choices, disabled, hidden, onSelect, selectedId }: Props) {
  if (hidden) {
    return (
      <div className="choice-panel scan-placeholder">
        <div className="scan-pulse" />
        <p>Scan the pitch — read the arrows and zones</p>
        <span className="scan-hint">Choices unlock in a moment…</span>
      </div>
    )
  }

  return (
    <div className="choice-panel">
      <h3>Your read — pick one</h3>
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`choice-btn ${selectedId === c.id ? 'selected' : ''}`}
          disabled={disabled}
          onClick={() => onSelect(c.id)}
        >
          <span className="choice-icon">{getChoiceIcon(c.id)}</span>
          <span className="choice-content">
            <span className="choice-label">{c.label}</span>
            <span className="choice-tradeoff">{c.tradeoff}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
