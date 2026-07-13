import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import CinematicBeat from '../components/CinematicBeat'
import DecisionDock from '../components/DecisionDock'
import DecisionTimer, { MatchHUD } from '../components/MatchHUD'
import OutcomeMoment from '../components/OutcomeMoment'
import PitchKey from '../components/PitchKey'
import PitchReadGuide from '../components/PitchReadGuide'
import Scoreboard from '../components/Scoreboard'
import SelectedReadCard from '../components/SelectedReadCard'
import SituationChips from '../components/SituationChips'
import StakesBanner from '../components/StakesBanner'
import PhaserPitch from '../game/PhaserPitch'
import { useCrowdPressure } from '../hooks/useCrowdPressure'
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

type Phase = 'scan' | 'gate' | 'cinematic' | 'decide'

interface OutcomeFlash {
  outcome: string
  animation: string
  previousYour: number
  previousTheir: number
  newYour: number
  newTheir: number
}

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
  const [outcomeFlash, setOutcomeFlash] = useState<OutcomeFlash | null>(null)
  const [pendingResult, setPendingResult] = useState<Outcome | null>(null)
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

  const pressureActive = phase === 'cinematic' || phase === 'decide' || !!outcomeFlash
  useCrowdPressure(scenario?.match_state.pressure ?? 'Low', pressureActive)

  useEffect(() => {
    setPhase('scan')
    setScanStepIndex(0)
    setGateMinimized(false)
    setSelectedId(null)
    setSelectedCueLabel(null)
    setPitchEngaged(false)
    setOutcomeFlash(null)
    setPendingResult(null)

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
    if (phase !== 'decide' || outcomeFlash) return
    timerStartRef.current = Date.now()
    setTimerKey((k) => k + 1)
  }, [phase, scenario?.node_id, outcomeFlash])

  const beginDecide = () => setPhase('cinematic')
  const enterDecide = () => setPhase('decide')

  const finishOutcome = useCallback(
    (result: Outcome) => {
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
        setOutcomeFlash(null)
        setPendingResult(null)
        setAnimation(null)
        expiredRef.current = false
      }
    },
    [nav, sessionId],
  )

  const handleOutcomeMomentDone = useCallback(() => {
    if (pendingResult) finishOutcome(pendingResult)
  }, [pendingResult, finishOutcome])

  const showOutcome = useCallback((result: Outcome, prevYour: number, prevTheir: number) => {
    setAnimation(result.animation)
    setOutcomeFlash({
      outcome: result.outcome,
      animation: result.animation,
      previousYour: prevYour,
      previousTheir: prevTheir,
      newYour: result.match_state.your_score ?? prevYour,
      newTheir: result.match_state.their_score ?? prevTheir,
    })
    setPendingResult(result)
  }, [])

  const handlePitchCueSelect = useCallback(
    (cueLabel: string) => {
      if (phase !== 'decide' || locked || outcomeFlash) return
      const choiceId = cueToChoiceMap.get(cueLabel)
      if (!choiceId) return
      setPitchEngaged(true)
      setSelectedCueLabel(cueLabel)
      setSelectedId(choiceId)
    },
    [phase, locked, cueToChoiceMap, outcomeFlash],
  )

  const handleChangeRead = () => {
    setPitchEngaged(false)
    setSelectedId(null)
    setSelectedCueLabel(null)
  }

  const handleExpire = useCallback(async () => {
    if (expiredRef.current || locked || !sessionId || phase !== 'decide' || outcomeFlash) return
    expiredRef.current = true
    setLocked(true)
    const prevYour = scenario?.match_state.your_score ?? 1
    const prevTheir = scenario?.match_state.their_score ?? 1
    try {
      const result = await api.submitFreeze(sessionId)
      showOutcome(result, prevYour, prevTheir)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Freeze failed')
      setLocked(false)
      expiredRef.current = false
    }
  }, [locked, sessionId, phase, outcomeFlash, scenario, showOutcome])

  const lockChoice = async () => {
    if (!selectedId || !sessionId || locked || phase !== 'decide' || outcomeFlash) return
    setLocked(true)
    const prevYour = scenario?.match_state.your_score ?? 1
    const prevTheir = scenario?.match_state.their_score ?? 1
    const elapsed = (Date.now() - timerStartRef.current) / 1000
    const timeRemaining = Math.max(0, timerSeconds - elapsed)
    try {
      const result = await api.submitChoice(sessionId, selectedId, timeRemaining)
      showOutcome(result, prevYour, prevTheir)
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
  const inPlay = phase === 'decide' && !outcomeFlash

  return (
    <div className={`page simulation-page ${scenario.match_state.pressure === 'Hostile' ? 'hostile-session' : ''}`}>
      <Scoreboard
        matchState={scenario.match_state}
        round={scenario.round}
        totalRounds={scenario.total_rounds}
      />

      <MatchHUD
        matchState={scenario.match_state}
        round={scenario.round}
        totalRounds={scenario.total_rounds}
      />

      <StakesBanner
        headline={headline}
        matchState={scenario.match_state}
        round={scenario.round}
        totalRounds={scenario.total_rounds}
        active={inPlay}
      />

      <div className={`sim-layout ${phase === 'scan' ? 'scan-phase' : ''}`}>
        <div className="pitch-col">
          <div className={`pitch-frame ${phase === 'cinematic' ? 'cinematic-active' : ''}`}>
            <PhaserPitch
              pitch={scenario.pitch}
              pressure={scenario.match_state.pressure}
              animation={animation}
              sceneKey={scenario.node_id}
              scanFocus={scanFocus}
              selectedCueLabel={selectedCueLabel}
              pitchInteractive={inPlay && !locked}
              showTapHints={inPlay && !locked}
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
                  <p>Study the pitch — arrows show threat, space, and danger. Then you'll pick an action.</p>
                </div>
                <div className="gate-banner-actions">
                  <button type="button" className="ghost-btn" onClick={() => setGateMinimized(true)}>
                    Keep scanning ↓
                  </button>
                  <button type="button" className="primary-btn gate-btn" onClick={beginDecide}>
                    Ready — start decision →
                  </button>
                </div>
              </div>
            )}

            {phase === 'gate' && gateMinimized && (
              <div className="gate-minibar">
                <span>Still scanning the pitch?</span>
                <button type="button" className="primary-btn gate-btn-sm" onClick={beginDecide}>
                  Ready to decide →
                </button>
              </div>
            )}

            {phase === 'cinematic' && (
              <CinematicBeat
                headline={headline}
                matchState={scenario.match_state}
                round={scenario.round}
                totalRounds={scenario.total_rounds}
                onComplete={enterDecide}
              />
            )}
          </div>

          {inPlay && (
            <DecisionDock
              options={tapOptions}
              selectedCueLabel={selectedCueLabel}
              onSelect={handlePitchCueSelect}
              disabled={locked}
              pitchGated={!pitchEngaged}
            />
          )}

          {phase !== 'cinematic' && phase !== 'decide' && <PitchKey />}

          {phase === 'decide' && !pitchEngaged && (
            <p className="read-only-hint">Tap a zone on the pitch to commit your read.</p>
          )}

          <SituationChips
            chips={situationChips}
            activeLabel={activeChipLabel}
            dimmed={phase === 'scan'}
            interactive={inPlay && !locked}
            onSelect={handlePitchCueSelect}
          />

          <DecisionTimer
            key={timerKey}
            seconds={timerSeconds}
            frozen={locked || phase !== 'decide' || !!outcomeFlash}
            onExpire={handleExpire}
            hostile={scenario.match_state.pressure === 'Hostile'}
          />

          {inPlay && pitchEngaged && (
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
          {!pitchEngaged ? (
            <PitchReadGuide
              phase={phase === 'cinematic' ? 'gate' : phase === 'decide' ? 'decide' : phase}
              pitchEngaged={pitchEngaged}
              headline={headline}
              scanHint={scanHint}
              scenarioText={scenario.scenario_text}
              yourScore={scenario.match_state.your_score}
              theirScore={scenario.match_state.their_score}
              round={scenario.round}
              totalRounds={scenario.total_rounds}
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

      {outcomeFlash && (
        <OutcomeMoment
          outcome={outcomeFlash.outcome}
          animation={outcomeFlash.animation}
          previousYour={outcomeFlash.previousYour}
          previousTheir={outcomeFlash.previousTheir}
          newYour={outcomeFlash.newYour}
          newTheir={outcomeFlash.newTheir}
          onDone={handleOutcomeMomentDone}
        />
      )}
    </div>
  )
}
