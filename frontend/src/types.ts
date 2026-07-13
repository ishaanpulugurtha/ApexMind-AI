export interface Config {
  sports: string[]
  positions_by_sport: Record<string, string[]>
  levels: string[]
  score_differentials: string[]
  pressure_levels: string[]
  trigger_catalysts: string[]
  timer_seconds: number
  total_rounds: number
  available_trees: { sport: string; position: string }[]
}

export interface MatchState {
  time_left: number
  score_differential: string
  your_score: number
  their_score: number
  pressure: string
  catalyst: string
}

export interface ChoiceOption {
  id: string
  label: string
  tradeoff: string
}

export interface VisualCue {
  type: 'threat_arrow' | 'open_lane' | 'danger_zone' | 'label'
  from?: [number, number]
  to?: [number, number]
  at?: [number, number]
  radius?: number
  label?: string
  text?: string
  color?: string
  /** Links this cue to a decision choice — enables correct tap mapping. */
  choice_id?: string
}

export interface PitchSetup {
  ball: [number, number]
  you: [number, number]
  teammates: [number, number][]
  opponents: [number, number][]
  pressure_zones: [number, number, number][]
  highlight?: string
  visual_cues?: VisualCue[]
  opponent_labels?: string[]
}

export interface Scenario {
  session_id: string
  node_id: string
  round: number
  total_rounds: number
  scenario_text: string
  scenario_headline?: string
  scenario_scan?: string
  pitch: PitchSetup
  choices: ChoiceOption[]
  match_state: MatchState
  complete: boolean
}

export interface Outcome {
  outcome: string
  animation: string
  match_state: MatchState
  transition: Record<string, unknown>
  next_scenario: Scenario | null
  complete: boolean
}

export interface Report {
  composure_score: number
  decision_velocity: number
  tactical_integrity: number
  reappraisal: { category: string; detail: string; breakdown: Record<string, number> }
  strategies: { title: string; description: string }[]
  replay_log: ReplayEntry[]
  transition_log: Record<string, unknown>[]
  storage_backend: string | null
}

export interface ReplayEntry {
  round: number
  choice_id: string
  choice_label: string
  time_remaining_s: number
  integrity_weight: number
  integrity_pts: number
  velocity_pts: number
  outcome: string
}

export interface Debrief {
  summary: string
  focus_area: string
  drill: string
  source: string
  notice?: string
}

export interface StartParams {
  sport: string
  position: string
  level: string
  time_left: number
  score_differential: string
  pressure: string
  catalyst: string
}
