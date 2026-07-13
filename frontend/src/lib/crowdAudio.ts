/** Lightweight procedural crowd rumble — no audio files needed. */

let ctx: AudioContext | null = null
let gain: GainNode | null = null
let noiseNodes: OscillatorNode[] = []

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function setCrowdIntensity(level: 'off' | 'low' | 'medium' | 'hostile') {
  const audio = getCtx()
  if (audio.state === 'suspended') void audio.resume()

  if (level === 'off') {
    stopCrowd()
    return
  }

  if (!gain) {
    gain = audio.createGain()
    gain.connect(audio.destination)
    for (let i = 0; i < 3; i++) {
      const osc = audio.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = 80 + i * 40
      const g = audio.createGain()
      g.gain.value = 0.012
      osc.connect(g)
      g.connect(gain)
      osc.start()
      noiseNodes.push(osc)
    }
  }

  const target =
    level === 'hostile' ? 0.09 : level === 'medium' ? 0.045 : 0.02
  gain.gain.cancelScheduledValues(audio.currentTime)
  gain.gain.setTargetAtTime(target, audio.currentTime, 0.4)
}

export function stopCrowd() {
  if (gain && ctx) {
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
  }
}

export function pulseCrowd() {
  if (!gain || !ctx) return
  const now = ctx.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(Math.min(gain.gain.value * 1.8, 0.14), now + 0.08)
  gain.gain.linearRampToValueAtTime(gain.gain.value, now + 0.35)
}

export function disposeCrowd() {
  for (const n of noiseNodes) {
    try {
      n.stop()
    } catch {
      /* already stopped */
    }
  }
  noiseNodes = []
  gain = null
  if (ctx) {
    void ctx.close()
    ctx = null
  }
}
