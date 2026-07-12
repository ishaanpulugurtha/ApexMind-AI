import type { SituationChip } from '../lib/pitchRead'

interface Props {
  chips: SituationChip[]
  activeLabel?: string | null
  dimmed?: boolean
  interactive?: boolean
  onSelect?: (cueLabel: string) => void
}

export default function SituationChips({
  chips,
  activeLabel,
  dimmed,
  interactive,
  onSelect,
}: Props) {
  if (!chips.length) return null

  return (
    <div className={`situation-chips ${dimmed ? 'dimmed' : ''} ${interactive ? 'interactive' : ''}`}>
      {chips.map((chip) => {
        const isActive = activeLabel === chip.label
        const className = `situation-chip ${chip.variant} ${isActive ? 'active' : ''}`

        if (interactive && onSelect) {
          return (
            <button
              key={`${chip.type}-${chip.label}`}
              type="button"
              className={className}
              onClick={() => onSelect(chip.label)}
            >
              <span className="chip-action">{chip.actionShort ?? chip.label}</span>
              <span className="chip-zone">{chip.label}</span>
            </button>
          )
        }

        return (
          <span key={`${chip.type}-${chip.label}`} className={className}>
            {chip.variant === 'threat' && '⚠ '}
            {chip.variant === 'open' && '✓ '}
            {chip.variant === 'danger' && '◉ '}
            {chip.label}
          </span>
        )
      })}
    </div>
  )
}
