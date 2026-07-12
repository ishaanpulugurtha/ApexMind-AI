import { getChoiceIcon } from '../lib/visuals'
import type { ChoiceOption } from '../types'

interface Props {
  choice: ChoiceOption
  cueLabel: string | null
  actionShort?: string | null
  onChangeRead: () => void
}

export default function SelectedReadCard({
  choice,
  cueLabel,
  actionShort,
  onChangeRead,
}: Props) {
  return (
    <div className="selected-read-card">
      <span className="selected-read-badge">Your decision</span>
      {actionShort && <p className="selected-read-action">You will: {actionShort}</p>}
      <div className="selected-read-row">
        <span className="choice-icon">{getChoiceIcon(choice.id)}</span>
        <div>
          <p className="selected-read-label">{choice.label}</p>
          <p className="selected-read-tradeoff">{choice.tradeoff}</p>
          {cueLabel && <p className="selected-read-zone">Read from: {cueLabel}</p>}
        </div>
      </div>
      <p className="change-read-hint">Tap a different action button on the pitch or below to change.</p>
      <button type="button" className="ghost-btn change-read-btn" onClick={onChangeRead}>
        Clear selection
      </button>
    </div>
  )
}
