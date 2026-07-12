import Phaser from 'phaser'
import type { PitchSetup, VisualCue } from '../types'

const W = 640
const H = 420

export class PitchScene extends Phaser.Scene {
  private dynamicObjects: Phaser.GameObjects.GameObject[] = []
  private ball!: Phaser.GameObjects.Arc
  private youMarker!: Phaser.GameObjects.Arc
  private crowdOverlay!: Phaser.GameObjects.Rectangle
  private pitchReady = false
  private pendingUpdate: { pitch: PitchSetup; pressure: string } | null = null

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
  }

  private toX(n: number) { return 40 + n * (W - 80) }
  private toY(n: number) { return 30 + n * (H - 60) }

  updatePitch(pitch: PitchSetup, pressure: string) {
    if (!this.pitchReady || !this.crowdOverlay) {
      this.pendingUpdate = { pitch, pressure }
      return
    }
    this.clearDynamic()

    for (const cue of pitch.visual_cues || []) {
      this.drawCue(cue)
    }

    for (const [nx, ny, radius] of pitch.pressure_zones || []) {
      const circle = this.add.circle(this.toX(nx), this.toY(ny), radius * 200, 0xff3333, 0.15)
      circle.setDepth(1)
      this.tweens.add({
        targets: circle,
        alpha: { from: 0.1, to: 0.28 },
        scale: { from: 0.95, to: 1.06 },
        duration: 900,
        yoyo: true,
        repeat: -1,
      })
      this.track(circle)
    }

    pitch.teammates?.forEach(([nx, ny]) => {
      const p = this.add.circle(this.toX(nx), this.toY(ny), 11, 0x38bdf8, 1)
      p.setStrokeStyle(2, 0xffffff, 0.9)
      p.setDepth(3)
      this.track(p)
    })

    pitch.opponents?.forEach(([nx, ny], i) => {
      const p = this.add.circle(this.toX(nx), this.toY(ny), 11, 0xf87171, 1)
      p.setStrokeStyle(2, 0xffffff, 0.9)
      p.setDepth(3)
      this.track(p)
      const lbl = pitch.opponent_labels?.[i]
      if (lbl) {
        const t = this.add.text(this.toX(nx), this.toY(ny) - 18, lbl, {
          fontSize: '11px',
          color: '#fca5a5',
          fontFamily: 'Inter, sans-serif',
        }).setOrigin(0.5).setDepth(4)
        this.track(t)
      }
    })

    const [yx, yy] = pitch.you || [0.5, 0.5]
    this.youMarker = this.add.circle(this.toX(yx), this.toY(yy), 14, 0xfbbf24, 1)
    this.youMarker.setStrokeStyle(3, 0xffffff, 1)
    this.youMarker.setDepth(5)
    this.tweens.add({
      targets: this.youMarker,
      scale: { from: 1, to: 1.12 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    })
    this.track(this.youMarker)

    const [bx, by] = pitch.ball || [0.5, 0.5]
    this.ball = this.add.circle(this.toX(bx), this.toY(by), 7, 0xffffff, 1)
    this.ball.setDepth(6)
    this.track(this.ball)

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
  }

  private drawCue(cue: VisualCue) {
    const g = this.add.graphics()
    g.setDepth(2)
    this.track(g)

    if (cue.type === 'threat_arrow' && cue.from && cue.to) {
      this.drawArrow(g, cue.from, cue.to, 0xf87171, 0.9)
      if (cue.label) this.addCueLabel(cue.to, cue.label, '#fca5a5')
    } else if (cue.type === 'open_lane' && cue.from && cue.to) {
      this.drawArrow(g, cue.from, cue.to, 0x4ade80, 0.85)
      if (cue.label) this.addCueLabel(cue.to, cue.label, '#86efac')
    } else if (cue.type === 'danger_zone' && cue.at && cue.radius) {
      const c = this.add.circle(
        this.toX(cue.at[0]), this.toY(cue.at[1]), cue.radius * 180, 0xef4444, 0.22
      )
      c.setDepth(2)
      c.setStrokeStyle(2, 0xf87171, 0.7)
      this.tweens.add({ targets: c, alpha: { from: 0.15, to: 0.35 }, duration: 700, yoyo: true, repeat: -1 })
      this.track(c)
      if (cue.label) this.addCueLabel(cue.at, cue.label, '#fca5a5')
    } else if (cue.type === 'label' && cue.at) {
      const t = this.add.text(this.toX(cue.at[0]), this.toY(cue.at[1]), cue.text || cue.label || '', {
        fontSize: '12px',
        color: cue.color || '#ffffff',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(7)
      this.track(t)
    }
  }

  private drawArrow(g: Phaser.GameObjects.Graphics, from: [number, number], to: [number, number], color: number, alpha: number) {
    const x1 = this.toX(from[0]), y1 = this.toY(from[1])
    const x2 = this.toX(to[0]), y2 = this.toY(to[1])
    g.lineStyle(3, color, alpha)
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.strokePath()
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const head = 10
    g.fillStyle(color, alpha)
    g.fillTriangle(
      x2, y2,
      x2 - head * Math.cos(angle - 0.4), y2 - head * Math.sin(angle - 0.4),
      x2 - head * Math.cos(angle + 0.4), y2 - head * Math.sin(angle + 0.4),
    )
  }

  private addCueLabel(at: [number, number], text: string, color: string) {
    const t = this.add.text(this.toX(at[0]), this.toY(at[1]) - 14, text, {
      fontSize: '10px',
      color,
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#0f172acc',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(8)
    this.track(t)
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
    for (const o of this.dynamicObjects) o.destroy()
    this.dynamicObjects = []
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
