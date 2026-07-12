import Phaser from 'phaser'
import type { ScanFocus } from '../lib/pitchRead'
import type { PitchSetup, VisualCue } from '../types'

const W = 640
const H = 420

interface RegisteredCue {
  key: string
  focus: ScanFocus | null
  objects: Phaser.GameObjects.GameObject[]
}

export class PitchScene extends Phaser.Scene {
  private dynamicObjects: Phaser.GameObjects.GameObject[] = []
  private registeredCues: RegisteredCue[] = []
  private ball!: Phaser.GameObjects.Arc
  private ballGlow!: Phaser.GameObjects.Arc
  private youMarker!: Phaser.GameObjects.Arc
  private youRing!: Phaser.GameObjects.Arc
  private youLabel!: Phaser.GameObjects.Text
  private crowdOverlay!: Phaser.GameObjects.Rectangle
  private playerObjects: Phaser.GameObjects.GameObject[] = []
  private pitchReady = false
  private pendingUpdate: { pitch: PitchSetup; pressure: string } | null = null
  private scanFocus: ScanFocus | null = null
  private hoverCueLabel: string | null = null
  private scanTimer: Phaser.Time.TimerEvent | null = null

  constructor() {
    super({ key: 'PitchScene' })
  }

  create() {
    this.drawPitch()
    this.crowdOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
    this.crowdOverlay.setDepth(10)
    this.pitchReady = true

    if (this.pendingUpdate) {
      const { pitch, pressure } = this.pendingUpdate
      this.pendingUpdate = null
      this.updatePitch(pitch, pressure)
    }
  }

  private drawPitch() {
    const g = this.add.graphics()
    for (let i = 0; i < 8; i++) {
      const shade = i % 2 === 0 ? 0x1a6b35 : 0x1e7a3d
      g.fillStyle(shade, 1)
      g.fillRect(0, (H / 8) * i, W, H / 8)
    }
    g.lineStyle(2, 0xffffff, 0.85)
    g.strokeRect(40, 30, W - 80, H - 60)
    g.strokeCircle(W / 2, H / 2, 55)
    g.beginPath()
    g.moveTo(W / 2, 30)
    g.lineTo(W / 2, H - 30)
    g.strokePath()
    g.strokeRect(40, H / 2 - 70, 90, 140)
    g.strokeRect(W - 130, H / 2 - 70, 90, 140)

    this.add
      .text(W - 52, 38, 'ATTACK →', {
        fontSize: '11px',
        color: '#e2e8f0',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#0f172acc',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(1)

    this.add
      .text(52, 38, '← DEFEND', {
        fontSize: '11px',
        color: '#94a3b8',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#0f172a99',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(1)
  }

  private toX(n: number) {
    return 40 + n * (W - 80)
  }

  private toY(n: number) {
    return 30 + n * (H - 60)
  }

  updatePitch(pitch: PitchSetup, pressure: string) {
    if (!this.pitchReady || !this.crowdOverlay) {
      this.pendingUpdate = { pitch, pressure }
      return
    }
    this.clearDynamic()
    this.registeredCues = []

    for (const cue of pitch.visual_cues || []) {
      this.drawCue(cue)
    }

    for (const [nx, ny, radius] of pitch.pressure_zones || []) {
      const circle = this.add.circle(this.toX(nx), this.toY(ny), radius * 200, 0xff3333, 0.12)
      circle.setDepth(1)
      circle.setStrokeStyle(2, 0xf87171, 0.35)
      this.track(circle)
    }

    pitch.teammates?.forEach(([nx, ny], i) => {
      const p = this.add.circle(this.toX(nx), this.toY(ny), 13, 0x38bdf8, 1)
      p.setStrokeStyle(2, 0xffffff, 0.95)
      p.setDepth(3)
      this.track(p)
      this.playerObjects.push(p)
      const t = this.add
        .text(this.toX(nx), this.toY(ny) - 20, `T${i + 1}`, {
          fontSize: '10px',
          color: '#bae6fd',
          fontFamily: 'Inter, sans-serif',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(4)
      this.track(t)
      this.playerObjects.push(t)
    })

    pitch.opponents?.forEach(([nx, ny], i) => {
      const p = this.add.circle(this.toX(nx), this.toY(ny), 13, 0xf87171, 1)
      p.setStrokeStyle(2, 0xffffff, 0.95)
      p.setDepth(3)
      this.track(p)
      this.playerObjects.push(p)
      const lbl = pitch.opponent_labels?.[i] ?? `#${i + 1}`
      const t = this.add
        .text(this.toX(nx), this.toY(ny) - 20, lbl, {
          fontSize: '11px',
          color: '#fca5a5',
          fontFamily: 'Inter, sans-serif',
          fontStyle: 'bold',
          backgroundColor: '#450a0a99',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(4)
      this.track(t)
      this.playerObjects.push(t)
    })

    const [yx, yy] = pitch.you || [0.5, 0.5]
    const yxPx = this.toX(yx)
    const yyPx = this.toY(yy)

    this.youRing = this.add.circle(yxPx, yyPx, 22, 0xfbbf24, 0.15)
    this.youRing.setStrokeStyle(2, 0xfbbf24, 0.5)
    this.youRing.setDepth(4)
    this.track(this.youRing)

    this.youMarker = this.add.circle(yxPx, yyPx, 17, 0xfbbf24, 1)
    this.youMarker.setStrokeStyle(3, 0xffffff, 1)
    this.youMarker.setDepth(6)
    this.track(this.youMarker)

    this.youLabel = this.add
      .text(yxPx, yyPx + 26, 'YOU', {
        fontSize: '12px',
        color: '#fef08a',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#422006cc',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(7)
    this.track(this.youLabel)
    this.playerObjects.push(this.youMarker, this.youRing, this.youLabel)

    const [bx, by] = pitch.ball || [0.5, 0.5]
    const bxPx = this.toX(bx)
    const byPx = this.toY(by)
    this.ballGlow = this.add.circle(bxPx, byPx, 11, 0xffffff, 0.25)
    this.ballGlow.setDepth(5)
    this.track(this.ballGlow)
    this.ball = this.add.circle(bxPx, byPx, 8, 0xffffff, 1)
    this.ball.setStrokeStyle(1, 0xcbd5e1, 0.8)
    this.ball.setDepth(6)
    this.track(this.ball)
    this.playerObjects.push(this.ball, this.ballGlow)

    const alpha = pressure === 'Hostile' ? 0.48 : pressure === 'Medium' ? 0.22 : 0.06
    this.crowdOverlay.setFillStyle(0x000000, alpha)
    if (pressure === 'Hostile') {
      this.tweens.add({
        targets: this.crowdOverlay,
        alpha: { from: 0.38, to: 0.52 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
      })
    }

    this.tweens.add({
      targets: this.youRing,
      scale: { from: 1, to: 1.18 },
      alpha: { from: 0.12, to: 0.32 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    })

    this.applyReadability()
  }

  setScanFocus(focus: ScanFocus | null) {
    this.scanFocus = focus
    this.applyReadability()
  }

  setHoverCueLabel(label: string | null) {
    this.hoverCueLabel = label
    this.applyReadability()
  }

  private applyReadability() {
    if (this.hoverCueLabel) {
      this.setGroupAlpha(this.registeredCues, 0.18)
      this.setGroupAlpha(this.playerObjects, 0.45)
      this.brightenCue(this.hoverCueLabel, 1)
      this.setYouHighlight(false)
      return
    }

    if (this.scanFocus) {
      this.setGroupAlpha(this.registeredCues, 0.12)
      this.setGroupAlpha(this.playerObjects, 0.4)
      this.brightenScanFocus(this.scanFocus)
      return
    }

    this.setGroupAlpha(this.registeredCues, 1)
    this.setGroupAlpha(this.playerObjects, 1)
    this.setYouHighlight(true)
  }

  private brightenScanFocus(focus: ScanFocus) {
    for (const cue of this.registeredCues) {
      if (cue.focus === focus) this.setObjectsAlpha(cue.objects, 1)
    }
    if (focus === 'you') {
      this.setObjectsAlpha(this.playerObjects.filter((o) => o === this.youMarker || o === this.youRing || o === this.youLabel), 1)
      this.setObjectsAlpha([this.ball, this.ballGlow], 1)
      this.tweens.add({
        targets: [this.youMarker, this.ball],
        scale: { from: 1, to: 1.08 },
        duration: 350,
        yoyo: true,
      })
    }
  }

  private brightenCue(label: string, alpha: number) {
    const cue = this.registeredCues.find((c) => c.key === label)
    if (cue) this.setObjectsAlpha(cue.objects, alpha)
  }

  private setYouHighlight(on: boolean) {
    if (!this.youMarker) return
    this.youMarker.setScale(on ? 1 : 1)
  }

  private setGroupAlpha(groups: RegisteredCue[] | Phaser.GameObjects.GameObject[], alpha: number) {
    if (Array.isArray(groups) && groups.length && 'objects' in (groups[0] as RegisteredCue)) {
      for (const g of groups as RegisteredCue[]) this.setObjectsAlpha(g.objects, alpha)
    } else {
      this.setObjectsAlpha(groups as Phaser.GameObjects.GameObject[], alpha)
    }
  }

  private setObjectsAlpha(objects: Phaser.GameObjects.GameObject[], alpha: number) {
    for (const obj of objects) {
      if ('setAlpha' in obj && typeof obj.setAlpha === 'function') obj.setAlpha(alpha)
    }
  }

  private drawCue(cue: VisualCue) {
    const objects: Phaser.GameObjects.GameObject[] = []
    const key = cue.label || cue.text || cue.type
    const focus: ScanFocus | null =
      cue.type === 'threat_arrow'
        ? 'threat'
        : cue.type === 'danger_zone'
          ? 'danger'
          : cue.type === 'open_lane'
            ? 'space'
            : null

    if (cue.type === 'threat_arrow' && cue.from && cue.to) {
      const g = this.add.graphics()
      g.setDepth(2)
      this.drawArrow(g, cue.from, cue.to, 0xf87171, 1, 5)
      objects.push(g)
      if (cue.label) objects.push(this.makeCueLabel(cue.to, cue.label, '#fecaca', '#450a0acc'))
    } else if (cue.type === 'open_lane' && cue.from && cue.to) {
      const g = this.add.graphics()
      g.setDepth(2)
      this.drawArrow(g, cue.from, cue.to, 0x4ade80, 1, 5, true)
      objects.push(g)
      if (cue.label) objects.push(this.makeCueLabel(cue.to, cue.label, '#bbf7d0', '#14532dcc'))
    } else if (cue.type === 'danger_zone' && cue.at && cue.radius) {
      const c = this.add.circle(
        this.toX(cue.at[0]),
        this.toY(cue.at[1]),
        cue.radius * 190,
        0xef4444,
        0.28,
      )
      c.setDepth(2)
      c.setStrokeStyle(3, 0xfca5a5, 0.9)
      objects.push(c)
      if (cue.label) objects.push(this.makeCueLabel(cue.at, cue.label, '#fecaca', '#450a0acc'))
    } else if (cue.type === 'label' && cue.at) {
      const t = this.add
        .text(this.toX(cue.at[0]), this.toY(cue.at[1]), cue.text || cue.label || '', {
          fontSize: '13px',
          color: cue.color || '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontStyle: 'bold',
          backgroundColor: '#0f172ae6',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(7)
      objects.push(t)
    }

    for (const o of objects) this.track(o)
    if (objects.length) this.registeredCues.push({ key, focus, objects })
  }

  private drawArrow(
    g: Phaser.GameObjects.Graphics,
    from: [number, number],
    to: [number, number],
    color: number,
    alpha: number,
    width: number,
    dashed = false,
  ) {
    const x1 = this.toX(from[0])
    const y1 = this.toY(from[1])
    const x2 = this.toX(to[0])
    const y2 = this.toY(to[1])

    g.lineStyle(width + 4, color, alpha * 0.25)
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.strokePath()

    if (dashed) {
      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.hypot(dx, dy)
      const dash = 10
      const gap = 7
      let dist = 0
      g.lineStyle(width, color, alpha)
      while (dist < len) {
        const t0 = dist / len
        const t1 = Math.min((dist + dash) / len, 1)
        g.beginPath()
        g.moveTo(x1 + dx * t0, y1 + dy * t0)
        g.lineTo(x1 + dx * t1, y1 + dy * t1)
        g.strokePath()
        dist += dash + gap
      }
    } else {
      g.lineStyle(width, color, alpha)
      g.beginPath()
      g.moveTo(x1, y1)
      g.lineTo(x2, y2)
      g.strokePath()
    }

    const angle = Math.atan2(y2 - y1, x2 - x1)
    const head = 14
    g.fillStyle(color, alpha)
    g.fillTriangle(
      x2,
      y2,
      x2 - head * Math.cos(angle - 0.35),
      y2 - head * Math.sin(angle - 0.35),
      x2 - head * Math.cos(angle + 0.35),
      y2 - head * Math.sin(angle + 0.35),
    )
  }

  private makeCueLabel(at: [number, number], text: string, color: string, bg: string) {
    return this.add
      .text(this.toX(at[0]), this.toY(at[1]) - 16, text, {
        fontSize: '11px',
        color,
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        backgroundColor: bg,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(8)
  }

  playAnimation(name: string) {
    if (!this.ball || !this.youMarker) return
    const tweens = this.tweens
    switch (name) {
      case 'press_forward':
        tweens.add({ targets: this.youMarker, x: this.youMarker.x + 40, duration: 400, yoyo: true })
        break
      case 'recycle_back':
        tweens.add({ targets: this.ball, x: this.ball.x - 50, duration: 500 })
        break
      case 'switch_wide':
        tweens.add({ targets: this.ball, x: this.ball.x - 120, y: this.ball.y - 40, duration: 600 })
        break
      case 'freeze':
        this.cameras.main.shake(200, 0.012)
        break
      default:
        tweens.add({ targets: this.ball, scale: { from: 1, to: 1.4 }, duration: 200, yoyo: true })
    }
  }

  private track(obj: Phaser.GameObjects.GameObject) {
    this.dynamicObjects.push(obj)
  }

  private clearDynamic() {
    if (this.scanTimer) {
      this.scanTimer.remove()
      this.scanTimer = null
    }
    for (const o of this.dynamicObjects) o.destroy()
    this.dynamicObjects = []
    this.playerObjects = []
    this.registeredCues = []
    this.tweens.killAll()
  }
}

export function createPitchGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent,
    backgroundColor: '#0f172a',
    scene: [PitchScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  })
}

export function getPitchScene(game: Phaser.Game): PitchScene | null {
  return game.scene.getScene('PitchScene') as PitchScene
}
