import { useCallback, useEffect, useRef } from 'react'
import Phaser from 'phaser'
import type { ScanFocus, TapOption } from '../lib/pitchRead'
import { createPitchGame, getPitchScene } from './PitchScene'
import type { PitchSetup } from '../types'

interface Props {
  pitch: PitchSetup
  pressure: string
  animation?: string | null
  sceneKey?: string
  scanFocus?: ScanFocus | null
  hoverCueLabel?: string | null
  selectedCueLabel?: string | null
  pitchInteractive?: boolean
  showTapHints?: boolean
  tapOptions?: TapOption[]
  onCueSelect?: (cueLabel: string) => void
}

export default function PhaserPitch({
  pitch,
  pressure,
  animation,
  sceneKey,
  scanFocus = null,
  hoverCueLabel = null,
  selectedCueLabel = null,
  pitchInteractive = false,
  showTapHints = false,
  tapOptions = [],
  onCueSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const pitchRef = useRef({ pitch, pressure })
  const onCueSelectRef = useRef(onCueSelect)
  pitchRef.current = { pitch, pressure }
  onCueSelectRef.current = onCueSelect

  const syncPitch = useCallback((): boolean => {
    const game = gameRef.current
    if (!game) return false
    const scene = getPitchScene(game)
    if (!scene) return false
    const { pitch: p, pressure: pr } = pitchRef.current
    scene.updatePitch(p, pr)
    return true
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || gameRef.current) return

    const game = createPitchGame(el)
    gameRef.current = game

    const boot = () => syncPitch()
    if (game.isBooted) {
      requestAnimationFrame(boot)
    } else {
      game.events.once('ready', () => requestAnimationFrame(boot))
    }

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [syncPitch])

  useEffect(() => {
    if (syncPitch()) return
    let attempts = 0
    const id = window.setInterval(() => {
      if (syncPitch() || ++attempts > 60) clearInterval(id)
    }, 32)
    return () => clearInterval(id)
  }, [pitch, pressure, sceneKey, syncPitch])

  useEffect(() => {
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.setScanFocus(scanFocus ?? null)
  }, [scanFocus, sceneKey])

  useEffect(() => {
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.setHoverCueLabel(hoverCueLabel ?? null)
  }, [hoverCueLabel, sceneKey])

  useEffect(() => {
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.setSelectedCueLabel(selectedCueLabel ?? null)
  }, [selectedCueLabel, sceneKey])

  useEffect(() => {
    const scene = getPitchScene(gameRef.current!)
    if (!scene) return
    scene.setPitchInteractive(pitchInteractive, (label) => onCueSelectRef.current?.(label))
  }, [pitchInteractive, sceneKey])

  useEffect(() => {
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.setShowTapHints(showTapHints && pitchInteractive)
  }, [showTapHints, pitchInteractive, sceneKey])

  useEffect(() => {
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.setTapOptions(tapOptions)
  }, [tapOptions, sceneKey])

  useEffect(() => {
    if (!animation) return
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.playAnimation(animation)
  }, [animation])

  return <div className="pitch-container" ref={containerRef} />
}
