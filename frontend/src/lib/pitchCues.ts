import type { VisualCue } from '../types'

const ACTION_TYPES = new Set<VisualCue['type']>(['open_lane', 'threat_arrow', 'danger_zone'])

export function isActionableCue(cue: VisualCue): boolean {
  return ACTION_TYPES.has(cue.type) && !!cue.label
}

/** All actionable cues for display — when choice_id is present, show every mapped cue. */
export function filterCuesForDisplay(cues: VisualCue[] = []): VisualCue[] {
  const actionable = cues.filter(isActionableCue)
  const withChoice = actionable.filter((c) => c.choice_id)
  if (withChoice.length > 0) return actionable

  // Legacy fallback: one per type
  const out: VisualCue[] = []
  let hasOpen = false
  let hasThreat = false
  let hasDanger = false
  for (const c of actionable) {
    if (c.type === 'open_lane' && !hasOpen) {
      out.push(c)
      hasOpen = true
    } else if (c.type === 'threat_arrow' && !hasThreat) {
      out.push(c)
      hasThreat = true
    } else if (c.type === 'danger_zone' && !hasDanger) {
      out.push(c)
      hasDanger = true
    }
  }
  return out
}

/** Decorative threat arrows (no choice_id) still render when other cues have choice_id. */
export function decorativeCues(cues: VisualCue[] = []): VisualCue[] {
  const actionable = cues.filter(isActionableCue)
  const hasChoiceIds = actionable.some((c) => c.choice_id)
  if (!hasChoiceIds) return []
  return actionable.filter((c) => !c.choice_id)
}

export function labelCues(cues: VisualCue[] = []): VisualCue[] {
  return cues.filter((c) => c.type === 'label' && c.text)
}

/** Midpoint of an arrow, or zone center — for hit targets. */
export function cueAnchor(cue: VisualCue): [number, number] | null {
  if (cue.from && cue.to) {
    return [(cue.from[0] + cue.to[0]) / 2, (cue.from[1] + cue.to[1]) / 2]
  }
  if (cue.at) return cue.at
  return null
}

/** Cues that should have tap hit zones. */
export function tappableCues(cues: VisualCue[] = []): VisualCue[] {
  const displayed = filterCuesForDisplay(cues)
  const withChoice = displayed.filter((c) => c.choice_id)
  if (withChoice.length > 0) return withChoice
  return displayed
}
