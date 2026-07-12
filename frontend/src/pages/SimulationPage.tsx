import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ChoicePanel from '../components/ChoicePanel'
import DecisionTimer, { MatchHUD } from '../components/MatchHUD'
import PhaserPitch from '../game/PhaserPitch'
import type { Outcome, Scenario } from '../types'

const SCAN_MS = 2800

export default function SimulationPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const nav = useNavigate()
  const location = useLocation()
  const initial = (location.state as { scenario?: Scenario })?.scenario

  const [scenario, setScenario] = useState<Scenario | null>(initial ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [outcomeMsg, setOutcomeMsg] = useState<string | null>(null)
  const [animation, setAnimation] = useState<string | null>(null)
  const [timerKey, setTimerKey] = useState(0)
  const [phase, setPhase] = useState<'scan' | 'decide'>('scan')
  const timerStartRef = useRef(Date.now())
  const expiredRef = useRef(false)

  const timerSeconds = 10

  useEffect(() => {
    setPhase('scan')
    const t = setTimeout(() => setPhase('decide'), SCAN_MS)
    return () => clearTimeout(t)
  }, [scenario?.node_id])

  // Start decision timer only after scan — not during scan or outcome replay
  useEffect(() => {
    if (phase !== 'decide' || outcomeMsg) return
    timerStartRef.current = Date.now()
    setTimerKey((k) => k + 1)
  }, [phase, scenario?.node_id, outcomeMsg])

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
      setLocked(false)
      setOutcomeMsg(null)
      setAnimation(null)
      expiredRef.current = false
    }
  }, [nav, sessionId])

  const handleExpire = useCallback(async () => {
    if (expiredRef.current || locked || !sessionId || phase === 'scan') return
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
    if (!selectedId || !sessionId || locked || phase === 'scan') return
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
          />
            {phase === 'scan' && (
              <div className="scan-overlay">
                <span className="scan-badge">SCAN PHASE</span>
              </div>
            )}
          </div>
          <div className="cue-legend">
            <span className="cue-item threat">→ Threat</span>
            <span className="cue-item open">→ Open lane</span>
            <span className="cue-item danger">◉ Danger zone</span>
          </div>
          <DecisionTimer
            key={timerKey}
            seconds={timerSeconds}
            frozen={locked || phase === 'scan' || !!outcomeMsg}
            onExpire={handleExpire}
          />
        </div>

        <div className="decision-col">
          <div className="scenario-headline">{headline}</div>
          <p className="scenario-scan">{scanHint}</p>
          {scenario.scenario_text && (
            <p className="scenario-sub">{scenario.scenario_text}</p>
          )}

          {outcomeMsg && <div className="outcome-banner">{outcomeMsg}</div>}

          <ChoicePanel
            choices={scenario.choices}
            disabled={locked}
            hidden={phase === 'scan'}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {phase === 'decide' && (
            <button
              className="primary-btn lock-btn"
              disabled={!selectedId || locked}
              onClick={lockChoice}
            >
              Lock Decision
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
