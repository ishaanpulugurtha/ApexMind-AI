import type { ChoiceOption, VisualCue } from '../types'

export type ScanFocus = 'threat' | 'danger' | 'space' | 'you'

export const SCAN_STEPS: ScanFocus[] = ['threat', 'danger', 'space', 'you']

export const SCAN_STEP_LABELS: Record<ScanFocus, string> = {
  threat: '1 · THREAT — Where is pressure coming from?',
  danger: '2 · DANGER — What happens if you hesitate?',
  space: '3 · SPACE — Where is the outlet?',
  you: '4 · YOU — Your position relative to the ball',
}

export interface SituationChip {
  type: VisualCue['type']
  label: string
  variant: 'threat' | 'open' | 'danger' | 'info'
}

export function extractSituationChips(cues: VisualCue[] = []): SituationChip[] {
  const chips: SituationChip[] = []
  for (const cue of cues) {
    if (cue.type === 'label') continue
    const label = cue.label?.trim()
    if (!label) continue
    const variant =
      cue.type === 'open_lane'
        ? 'open'
        : cue.type === 'threat_arrow'
          ? 'threat'
          : cue.type === 'danger_zone'
            ? 'danger'
            : 'info'
    chips.push({ type: cue.type, label, variant })
  }
  return chips
}

/** Match a choice to the pitch cue label it most relates to (for hover highlight). */
export function cueLabelForChoice(
  choice: ChoiceOption,
  cues: VisualCue[] = [],
  index = 0,
): string | null {
  const haystack = `${choice.label} ${choice.tradeoff}`.toLowerCase()

  for (const cue of cues) {
    if (!cue.label) continue
    const tokens = cue.label
      .toLowerCase()
      .split(/[\s/—–-]+/)
      .filter((t) => t.length > 3)
    if (tokens.some((t) => haystack.includes(t))) return cue.label
  }

  const actionHints: [RegExp, RegExp][] = [
    [/press|close|sprint|cut|trigger|challenge|tackle|dive|step in|delay|jockey/, /press|threat|closing|run|lane|#|counter/i],
    [/recycle|shield|outlet|safe|circulate|hold|cushion|body|nod|chest|check back|reset/, /recycle|outlet|safe|switch|redirect|wide|half-space/i],
    [/switch|diagonal|overlap|wide|flick|through|split|release|clip|drive/, /switch|open|lane|overlap|half-space|through|split|target|out/i],
    [/clear|boot|panic|hoof|pull out|hide|argue|snap/, /danger|gap|trap|turnover|crowd/i],
  ]

  for (const [choiceRx, cueRx] of actionHints) {
    if (!choiceRx.test(haystack)) continue
    const match = cues.find((c) => c.label && cueRx.test(c.label))
    if (match?.label) return match.label
  }

  const ordered = cues.filter(
    (c) => c.label && ['open_lane', 'threat_arrow', 'danger_zone'].includes(c.type),
  )
  return ordered[index]?.label ?? ordered[0]?.label ?? null
}

export function scanFocusForCueType(type: VisualCue['type']): ScanFocus | null {
  if (type === 'threat_arrow') return 'threat'
  if (type === 'danger_zone') return 'danger'
  if (type === 'open_lane') return 'space'
  return null
}
