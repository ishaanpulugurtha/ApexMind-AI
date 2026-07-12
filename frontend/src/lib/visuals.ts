export type VisualCue =
  | { type: 'threat_arrow'; from: [number, number]; to: [number, number]; label?: string }
  | { type: 'open_lane'; from: [number, number]; to: [number, number]; label?: string }
  | { type: 'danger_zone'; at: [number, number]; radius: number; label?: string }
  | { type: 'label'; at: [number, number]; text: string; color?: string }

export const CHOICE_ICONS: Record<string, string> = {
  immediate_press: '⚡',
  shield_recycle: '🛡️',
  foul_to_stop: '🟨',
  recovery_sprint: '🏃',
  call_offside_trap: '📢',
  stop_and_argue: '😤',
  switch_play: '↗️',
  circulate_safe: '🔄',
  dribble_forward: '🎯',
  verbal_reset: '🗣️',
  hide_from_ball: '👻',
  reckless_tackle: '💥',
  split_pass: '🧵',
  carry_into_space: '🏋️',
  panic_clearance: '🚀',
  FREEZE: '⏱️',
}

export function getChoiceIcon(choiceId: string): string {
  return CHOICE_ICONS[choiceId] ?? '⚽'
}

export function integrityColor(weight: number): string {
  if (weight >= 0.75) return 'var(--success)'
  if (weight >= 0.45) return 'var(--gold)'
  return 'var(--danger)'
}

export function integrityLabel(weight: number): string {
  if (weight >= 0.75) return 'Strong read'
  if (weight >= 0.45) return 'Mixed read'
  return 'Impulse read'
}
