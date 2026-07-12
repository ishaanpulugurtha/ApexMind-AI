import type { SituationChip } from '../lib/pitchRead'

interface Props {
  chips: SituationChip[]
  activeLabel?: string | null
  dimmed?: boolean
}

export default function SituationChips({ chips, activeLabel, dimmed }: Props) {
  if (!chips.length) return null

  return (
    <div className={`situation-chips ${dimmed ? 'dimmed' : ''}`}>
      {chips.map((chip) => (
        <span
          key={`${chip.type}-${chip.label}`}
          className={`situation-chip ${chip.variant} ${activeLabel === chip.label ? 'active' : ''}`}
        >
          {chip.variant === 'threat' && '⚠ '}
          {chip.variant === 'open' && '✓ '}
          {chip.variant === 'danger' && '◉ '}
          {chip.label}
        </span>
      ))}
    </div>
  )
}
