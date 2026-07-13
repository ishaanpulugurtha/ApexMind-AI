import type { TapOption } from '../lib/pitchRead'

interface Props {
  options: TapOption[]
  selectedCueLabel: string | null
  onSelect: (cueLabel: string) => void
  disabled?: boolean
  /** True when user hasn't tapped the pitch yet — dock shows prompt instead of buttons */
  pitchGated?: boolean
}

export default function DecisionDock({
  options,
  selectedCueLabel,
  onSelect,
  disabled,
  pitchGated,
}: Props) {
  if (!options.length) return null

  if (pitchGated) {
    return (
      <div className="decision-dock decision-dock--gated">
        <p className="decision-dock-gate-label">
          <span className="gate-arrow">↑</span> Tap a zone on the pitch to read the situation
        </p>
      </div>
    )
  }

  return (
    <div className="decision-dock">
      <p className="decision-dock-label">
        {selectedCueLabel ? 'Confirm your read — or change it below' : 'What do you do?'}
      </p>
      <div className="decision-dock-actions">
        {options.map((opt) => {
          const active = selectedCueLabel === opt.cueLabel
          return (
            <button
              key={`${opt.cueType}-${opt.cueLabel}`}
              type="button"
              className={`decision-dock-btn ${active ? 'active' : ''}`}
              disabled={disabled}
              onClick={() => onSelect(opt.cueLabel)}
            >
              <span className="dock-action">{opt.actionShort}</span>
              <span className="dock-read">{opt.cueLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
