import type { VisualCue } from '../types'

/** Show at most one of each cue type — keeps the pitch uncluttered. */
export function filterCuesForDisplay(cues: VisualCue[] = []): VisualCue[] {
  const out: VisualCue[] = []
  let hasOpen = false
  let hasThreat = false
  let hasDanger = false
  for (const c of cues) {
    if (c.type === 'label') continue
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

/** Midpoint of an arrow, or zone center — for hit targets. */
export function cueAnchor(cue: VisualCue): [number, number] | null {
  if (cue.from && cue.to) {
    return [(cue.from[0] + cue.to[0]) / 2, (cue.from[1] + cue.to[1]) / 2]
  }
  if (cue.at) return cue.at
  return null
}
