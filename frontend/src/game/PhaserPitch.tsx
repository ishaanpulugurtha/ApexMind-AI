import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createPitchGame, getPitchScene } from './PitchScene'
import type { PitchSetup } from '../types'

interface Props {
  pitch: PitchSetup
  pressure: string
  animation?: string | null
}

export default function PhaserPitch({ pitch, pressure, animation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    gameRef.current = createPitchGame(containerRef.current)
    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    const scene = getPitchScene(game)
    if (scene) scene.updatePitch(pitch, pressure)
  }, [pitch, pressure])

  useEffect(() => {
    if (!animation) return
    const scene = getPitchScene(gameRef.current!)
    if (scene) scene.playAnimation(animation)
  }, [animation])

  return <div className="pitch-container" ref={containerRef} />
}
