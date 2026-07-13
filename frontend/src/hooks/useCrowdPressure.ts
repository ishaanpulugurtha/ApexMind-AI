import { useEffect } from 'react'
import { disposeCrowd, setCrowdIntensity, stopCrowd } from '../lib/crowdAudio'

export function useCrowdPressure(pressure: string, active: boolean) {
  useEffect(() => {
    if (!active) {
      stopCrowd()
      return
    }
    const level =
      pressure === 'Hostile' ? 'hostile' : pressure === 'Medium' ? 'medium' : 'low'
    setCrowdIntensity(level)
    return () => stopCrowd()
  }, [pressure, active])

  useEffect(() => () => disposeCrowd(), [])
}
