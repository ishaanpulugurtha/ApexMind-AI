import type { ChoiceOption, VisualCue } from '../types'
import { tappableCues } from './pitchCues'

export type ScanFocus = 'threat' | 'danger' | 'space' | 'you'

export const SCAN_STEPS: ScanFocus[] = ['threat', 'danger', 'space', 'you']

export const SCAN_STEP_MS = [1000, 1000, 1000, 2000] as const
export const SCAN_TOTAL_MS = SCAN_STEP_MS.reduce((a, b) => a + b, 0)

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
  actionShort?: string
}

export interface TapOption {
  choiceId: string
  cueLabel: string
  cueType: VisualCue['type']
  actionShort: string
  actionLine: string
}

const CUE_ORDER: VisualCue['type'][] = ['open_lane', 'threat_arrow', 'danger_zone']

function legacyActionableCues(cues: VisualCue[] = []) {
  return CUE_ORDER.map((type) => cues.find((c) => c.type === type && c.label)).filter(
    (c): c is VisualCue => !!c,
  )
}

/** Short verb shown on pitch tap buttons — tells the player WHAT they're doing. */
export function actionShortForChoice(choice: ChoiceOption): string {
  const shortcuts: Record<string, string> = {
    circulate_safe: '↩ Recycle',
    shield_recycle: '↩ Recycle',
    switch_play: '↗ Switch',
    split_pass: '↗ Through ball',
    recovery_sprint: '⚡ Sprint close',
    immediate_press: '⚡ Press',
    trigger_press: '⚡ Press',
    carry_into_space: '🏃 Carry & foul',
    drive_half_space: '🏃 Drive',
    panic_clearance: '⬆ Boot clear',
    foul_to_stop: '🟨 Foul',
    verbal_reset: '🗣️ Lead',
    hide_from_ball: '👻 Hide',
    reckless_tackle: '💥 Lunge',
    dribble_forward: '🏃 Dribble',
    check_back_slow: '↩ Hold up',
    delay_run: '🛡️ Delay',
    one_touch_release: '⚡ Release',
    aerial_challenge: '💪 Win duel',
    cushion_header: '↩ Cushion',
    pull_out_duel: '👻 Bail',
    shield_turn: '🔄 Turn out',
    snap_at_coach: '🗣️ Argue',
    clip_diagonal: '↗ Diagonal',
    hold_shape: '🛡️ Hold line',
    dive_in_early: '💥 Dive in',
    flick_on: '↗ Flick on',
    body_block: '🛡️ Shield',
    drop_deep: '👻 Drop off',
    step_tackle: '⚡ Tackle',
    stand_guess: '🎲 Guess',
    chest_control: '⚡ Play wide',
    nod_down: '↩ Nod back',
    miscontrol_panic: '💥 Blind flick',
    call_offside_trap: '📣 Offside trap',
    stop_and_argue: '🗣️ Argue',
  }
  if (shortcuts[choice.id]) return shortcuts[choice.id]
  const first = choice.label.split('—')[0].trim()
  return first.length > 24 ? `${first.slice(0, 22)}…` : first
}

/** Map cues to choices via choice_id when authored; else legacy type order. */
export function buildTapOptions(choices: ChoiceOption[], cues: VisualCue[] = []): TapOption[] {
  const tappable = tappableCues(cues)
  const withChoiceId = tappable.filter((c) => c.choice_id)

  if (withChoiceId.length > 0) {
    return withChoiceId
      .map((cue) => {
        const choice = choices.find((ch) => ch.id === cue.choice_id)
        if (!choice || !cue.label) return null
        return {
          choiceId: choice.id,
          cueLabel: cue.label,
          cueType: cue.type,
          actionShort: actionShortForChoice(choice),
          actionLine: choice.label,
        }
      })
      .filter((o): o is TapOption => o !== null)
  }

  const typedCues = legacyActionableCues(cues)
  return typedCues
    .map((cue, i) => {
      const choice = choices[i]
      if (!choice || !cue.label) return null
      return {
        choiceId: choice.id,
        cueLabel: cue.label,
        cueType: cue.type,
        actionShort: actionShortForChoice(choice),
        actionLine: choice.label,
      }
    })
    .filter((o): o is TapOption => o !== null)
}

export function buildChoiceCueMap(
  choices: ChoiceOption[],
  cues: VisualCue[] = [],
): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const c of choices) map.set(c.id, null)
  for (const opt of buildTapOptions(choices, cues)) {
    map.set(opt.choiceId, opt.cueLabel)
  }
  return map
}

export function buildCueToChoiceMap(
  choices: ChoiceOption[],
  cues: VisualCue[] = [],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const opt of buildTapOptions(choices, cues)) {
    map.set(opt.cueLabel, opt.choiceId)
  }
  return map
}

export function extractSituationChips(
  cues: VisualCue[] = [],
  choices: ChoiceOption[] = [],
): SituationChip[] {
  const tapOpts = buildTapOptions(choices, cues)
  const chips: SituationChip[] = []
  for (const cue of tappableCues(cues)) {
    if (!cue.label) continue
    const variant =
      cue.type === 'open_lane'
        ? 'open'
        : cue.type === 'threat_arrow'
          ? 'threat'
          : 'danger'
    const opt = tapOpts.find((o) => o.cueLabel === cue.label)
    chips.push({
      type: cue.type,
      label: cue.label,
      variant,
      actionShort: opt?.actionShort,
    })
  }
  return chips
}

export function choiceIdForCueLabel(
  cueLabel: string,
  choices: ChoiceOption[],
  cues: VisualCue[] = [],
): string | null {
  return buildCueToChoiceMap(choices, cues).get(cueLabel) ?? null
}

export function plainLanguageForPhase(
  phase: 'scan' | 'gate' | 'decide',
  pitchEngaged: boolean,
): string {
  if (phase === 'scan') {
    return 'Watch the pitch light up: red pressure → danger zone → green space → your position.'
  }
  if (phase === 'gate') {
    return 'Study the pitch until the picture is clear. Minimize the banner to keep looking.'
  }
  if (!pitchEngaged) {
    return 'Read the pitch for threats and space. Pick one of the three action buttons below the field.'
  }
  return 'Change your action below, then lock it in.'
}

export function scoreContextLine(score: string): string {
  if (score.startsWith('Up')) return `You're ${score.toLowerCase()} — protect or extend.`
  if (score.startsWith('Down')) return `You're ${score.toLowerCase()} — need a positive play.`
  return 'Level scores — one read swings the game.'
}
