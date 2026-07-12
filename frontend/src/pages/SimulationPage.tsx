import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import DecisionTimer, { MatchHUD } from '../components/MatchHUD'
import PitchKey from '../components/PitchKey'
import PitchReadGuide from '../components/PitchReadGuide'
import SelectedReadCard from '../components/SelectedReadCard'
import SituationChips from '../components/SituationChips'
import PhaserPitch from '../game/PhaserPitch'
import {
  SCAN_STEP_LABELS,
  SCAN_STEPS,
  SCAN_STEP_MS,
  SCAN_TOTAL_MS,
  buildCueToChoiceMap,
  buildTapOptions,
  extractSituationChips,
} from '../lib/pitchRead'
import type { Outcome, Scenario } from '../types'

type Phase = 'scan' | 'gate' | 'decide'

export default function SimulationPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()
  const location = useLocation()
  const initial = (location.state as { scenario?: Scenario })?.scenario

  const [scenario, setScenario] = useState<Scenario | null>(initial ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedCueLabel, setSelectedCueLabel] = useState<string | null>(null)
  const [pitchEngaged, setPitchEngaged] = useState(false)
  const [gateMinimized, setGateMinimized] = useState(false)
  const [locked, setLocked] = useState(false)
  const [outcomeMsg, setOutcomeMsg] = useState<string | null>(null)
  const [animation, setAnimation] = useState<string | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [phase, setPhase] = useState<Phase>('scan')
  const [scanStepIndex, setScanStepIndex] = useState(0)
  const timerStartRef = useRef(Date.now())
  const expiredRef = useRef(false)

  const timerSeconds = 10

  const situationChips = useMemo(
    () =>
      scenario
        ? extractSituationChips(scenario.pitch.visual_cues, scenario.choices)
        : [],
    [scenario?.pitch.visual_cues, scenario?.choices],
  )

  const tapOptions = useMemo(
    () =>
      scenario ? buildTapOptions(scenario.choices, scenario.pitch.visual_cues ?? []) : [],
    [scenario],
  )

  const cueToChoiceMap = useMemo(() => {
    if (!scenario) return new Map<string, string>()
    return buildCueToChoiceMap(scenario.choices, scenario.pitch.visual_cues ?? [])
  }, [scenario])

  const selectedChoice = scenario?.choices.find((c) => c.id === selectedId) ?? null
  const selectedTapOption = tapOptions.find((o) => o.choiceId === selectedId) ?? null

  const activeChipLabel =
    phase === 'scan'
      ? situationChips.find((c) => {
          const focus = SCAN_STEPS[scanStepIndex]
          if (focus === 'threat') return c.type === 'threat_arrow'
          if (focus === 'danger') return c.type === 'danger_zone'
          if (focus === 'space') return c.type === 'open_lane'
          return false
        })?.label ?? null
      : selectedCueLabel

  useEffect(() => {
    setPhase('scan')
    setScanStepIndex(0)
    setGateMinimized(false)
    setSelectedId(null)
    setSelectedCueLabel(null)
    setPitchEngaged(false)

    const t1 = setTimeout(() => setScanStepIndex(1), SCAN_STEP_MS[0])
    const t2 = setTimeout(() => setScanStepIndex(2), SCAN_STEP_MS[0] + SCAN_STEP_MS[1])
    const t3 = setTimeout(() => setScanStepIndex(3), SCAN_STEP_MS[0] + SCAN_STEP_MS[1] + SCAN_STEP_MS[2])
    const gate = setTimeout(() => setPhase('gate'), SCAN_TOTAL_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(gate)
    }
  }, [scenario?.node_id])

  useEffect(() => {
    if (phase !== 'decide' || outcomeMsg) return
    timerStartRef.current = Date.now()
    setTimerKey((k) => k + 1)
  }, [phase, scenario?.node_id, outcomeMsg])

  const handlePitchCueSelect = useCallback(
    (cueLabel: string) => {
      if (phase !== 'decide' || locked) return
      const choiceId = cueToChoiceMap.get(cueLabel)
      if (!choiceId) return
      setPitchEngaged(true)
      setSelectedCueLabel(cueLabel)
      setSelectedId(choiceId)
    },
    [phase, locked, cueToChoiceMap],
  )

  const handleChangeRead = () => {
    setPitchEngaged(false)
    setSelectedId(null)
    setSelectedCueLabel(null)
  }

  const handleOutcome = useCallback(async (result: Outcome) => {
    setOutcomeMsg(result.outcome)
    setAnimation(result.animation)
    await new Promise((r) => setTimeout(r, 1800))

    if (result.complete) {
      nav(`/report/${sessionId}`)
      return
    }
    if (result.next_scenario) {
      setScenario(result.next_scenario)
      setSelectedId(null)
      setSelectedCueLabel(null)
      setPitchEngaged(false)
      setGateMinimized(false)
      setLocked(false)
      setOutcomeMsg(null)
      setAnimation(null)
      expiredRef.current = false
    }
  }, [nav, sessionId])

  const handleExpire = useCallback(async () => {
    if (expiredRef.current || locked || !sessionId || phase !== 'decide') return
    expiredRef.current = true
    setLocked(true)
    try {
      const result = await api.submitFreeze(sessionId)
      await handleOutcome(result)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Freeze failed')
      setLocked(false)
      expiredRef.current = false
    }
  }, [locked, sessionId, handleOutcome, phase])

  const lockChoice = async () => {
    if (!selectedId || !sessionId || locked || phase !== 'decide') return
    setLocked(true)
    const elapsed = (Date.now() - timerStartRef.current) / 1000
    const timeRemaining = Math.max(0, timerSeconds - elapsed)
    try {
      const result = await api.submitChoice(sessionId, selectedId, timeRemaining)
      await handleOutcome(result)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Choice failed')
      setLocked(false)
    }
  }

  if (!scenario || !sessionId) {
    return <div className="page">Session not found.</div>
  }

  const headline = scenario.scenario_headline || `Round ${scenario.round}`
  const scanHint = scenario.scenario_scan || 'Read the pitch before the options appear.'
  const scanFocus = phase === 'scan' ? SCAN_STEPS[scanStepIndex] : null

  return (
    <div className="page simulation-page">
      <MatchHUD
        matchState={scenario.match_state}
        round={scenario.round}
        totalRounds={scenario.total_rounds}
      />

      <div className={`sim-layout ${phase === 'scan' ? 'scan-phase' : ''}`}>
        <div className="pitch-col">
          <div className="pitch-frame">
            <PhaserPitch
              pitch={scenario.pitch}
              pressure={scenario.match_state.pressure}
              animation={animation}
              sceneKey={scenario.node_id}
              scanFocus={scanFocus}
              selectedCueLabel={selectedCueLabel}
              pitchInteractive={phase === 'decide' && !locked && !outcomeMsg}
              showTapHints={phase === 'decide' && !locked && !outcomeMsg}
              tapOptions={tapOptions}
              onCueSelect={handlePitchCueSelect}
            />

            {phase === 'scan' && (
              <div className="scan-overlay scan-strip">
                <span className="scan-badge">SCAN PHASE</span>
                <span className="scan-step-label">{SCAN_STEP_LABELS[SCAN_STEPS[scanStepIndex]]}</span>
              </div>
            )}

            {phase === 'gate' && !gateMinimized && (
              <div className="gate-banner">
                <div className="gate-banner-text">
                  <span className="scan-badge">SCAN COMPLETE</span>
                  <p>Keep looking at the pitch until you see the full picture.</p>
                </div>
                <div className="gate-banner-actions">
                  <button type="button" className="ghost-btn" onClick={() => setGateMinimized(true)}>
                    Keep scanning ↓
                  </button>
                  <button type="button" className="primary-btn gate-btn" onClick={() => setPhase('decide')}>
                    Ready — start decision →
                  </button>
                </div>
              </div>
            )}

            {phase === 'gate' && gateMinimized && (
              <div className="gate-minibar">
                <span>Still scanning the pitch?</span>
                <button type="button" className="primary-btn gate-btn-sm" onClick={() => setPhase('decide')}>
                  Ready to decide →
                </button>
              </div>
            )}

            {phase === 'decide' && !selectedId && !outcomeMsg && (
              <div className="pitch-tap-bar">
                Each labeled button is a <strong>different action</strong> — green safest, orange press, red risky
              </div>
            )}
          </div>

          <PitchKey />

          <SituationChips
            chips={situationChips}
            activeLabel={activeChipLabel}
            dimmed={phase === 'scan'}
            interactive={phase === 'decide' && !locked && !outcomeMsg}
            onSelect={handlePitchCueSelect}
          />

          <DecisionTimer
            key={timerKey}
            seconds={timerSeconds}
            frozen={locked || phase !== 'decide' || !!outcomeMsg}
            onExpire={handleExpire}
          />

          {phase === 'decide' && pitchEngaged && (
            <button
              className="primary-btn lock-btn lock-btn-pitch"
              disabled={!selectedId || locked}
              onClick={lockChoice}
            >
              Lock Decision
            </button>
          )}
        </div>

        <div className="decision-col">
          {outcomeMsg && <div className="outcome-banner">{outcomeMsg}</div>}

          {!pitchEngaged ? (
            <PitchReadGuide
              phase={phase}
              pitchEngaged={pitchEngaged}
              headline={headline}
              scanHint={scanHint}
              scenarioText={scenario.scenario_text}
              scoreDifferential={scenario.match_state.score_differential}
            />
          ) : selectedChoice ? (
            <SelectedReadCard
              choice={selectedChoice}
              cueLabel={selectedCueLabel}
              actionShort={selectedTapOption?.actionShort}
              onChangeRead={handleChangeRead}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
