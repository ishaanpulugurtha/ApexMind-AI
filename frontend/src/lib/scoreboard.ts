import type { MatchState } from '../types'

export function formatScore(your: number, their: number): string {
  return `${your} – ${their}`
}

export function scoreFromState(state: MatchState): string {
  return formatScore(state.your_score ?? 1, state.their_score ?? 1)
}

export function stakesFromScore(state: MatchState, round: number, totalRounds: number): string {
  const diff = state.your_score - state.their_score
  const finale = round === totalRounds ? ' · FINAL DECISION' : ''
  if (diff < 0) return `Trailing by ${Math.abs(diff)}${finale} — need a goal`
  if (diff > 0) return `Leading by ${diff}${finale} — protect the lead`
  return `Level scores${finale} — next read wins it`
}

export function clockLabel(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${seconds}s`
}
