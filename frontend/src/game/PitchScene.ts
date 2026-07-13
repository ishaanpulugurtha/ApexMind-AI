import Phaser from 'phaser'
import {
  cueAnchor,
  filterCuesForDisplay,
  labelCues,
  tappableCues,
} from '../lib/pitchCues'
import type { ScanFocus, TapOption } from '../lib/pitchRead'
import type { PitchSetup, VisualCue } from '../types'
import { TOKEN_KEYS, ensurePitchTokens, facingRad } from './pitchTokens'

const W = 640
const H = 420
const PAD_X = 28
const PAD_Y = 24
const PLAY_W = W - PAD_X * 2
const PLAY_H = H - PAD_Y * 2

const TAP_SPREAD = [
  { x: -58, y: -42 },
  { x: 58, y: -28 },
  { x: 0, y: 48 },
  { x: -48, y: 36 },
]

function cueKey(cue: VisualCue): string {
  if (cue.label && cue.choice_id) return `${cue.label}::${cue.choice_id}`
  return cue.label || cue.text || cue.type
}

interface RegisteredCue {
  key: string
  cueLabel: string
  focus: ScanFocus | null
  actionShort: string
  tappable: boolean
  objects: Phaser.GameObjects.GameObject[]
  hitZone?: Phaser.GameObjects.Arc
}

export class PitchScene extends Phaser.Scene {
  private dynamicObjects: Phaser.GameObjects.GameObject[] = []
  private registeredCues: RegisteredCue[] = []
  private ball!: Phaser.GameObjects.Sprite
  private ballGlow!: Phaser.GameObjects.Arc
  private youMarker!: Phaser.GameObjects.Sprite
  private youRing!: Phaser.GameObjects.Arc
  private crowdOverlay!: Phaser.GameObjects.Rectangle
  private playerObjects: Phaser.GameObjects.GameObject[] = []
  private pitchReady = false
  private pendingUpdate: { pitch: PitchSetup; pressure: string } | null = null
  private scanFocus: ScanFocus | null = null
  private hoverCueLabel: string | null = null
  private pitchHoverLabel: string | null = null
  private selectedCueLabel: string | null = null
  private pitchInteractive = false
  private showTapHints = false
  private onCueSelect: ((label: string) => void) | null = null
  private tapHintObjects: Phaser.GameObjects.GameObject[] = []
  private tapOptions: TapOption[] = []
  private lastScanFocus: ScanFocus | null | undefined = undefined

  constructor() {
    super({ key: 'PitchScene' })
  }

  create() {
    ensurePitchTokens(this)
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
    g.strokeRect(PAD_X, PAD_Y, PLAY_W, PLAY_H)
    g.strokeCircle(W / 2, H / 2, 48)
    g.beginPath()
    g.moveTo(W / 2, PAD_Y)
    g.lineTo(W / 2, H - PAD_Y)
    g.strokePath()
    g.strokeRect(PAD_X, H / 2 - 58, 72, 116)
    g.strokeRect(W - PAD_X - 72, H / 2 - 58, 72, 116)

    g.fillStyle(0xffffff, 0.2)
    g.fillRect(PAD_X - 2, H / 2 - 36, 6, 72)
    g.fillRect(W - PAD_X - 4, H / 2 - 36, 6, 72)

    this.add
      .text(PAD_X + 36, H / 2, 'YOUR GOAL\n← defend', {
        fontSize: '10px',
        color: '#cbd5e1',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#0f172acc',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(1)

    this.add
      .text(W - PAD_X - 36, H / 2, 'THEIR GOAL\nattack →', {
        fontSize: '10px',
        color: '#fecaca',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#450a0acc',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(1)
  }

  private toX(n: number) {
    return PAD_X + n * PLAY_W
  }

  private toY(n: number) {
    return PAD_Y + n * PLAY_H
  }

  private placeToken(
    key: string,
    nx: number,
    ny: number,
    faceToward: [number, number],
    depth = 5,
  ): Phaser.GameObjects.Sprite {
    const px = this.toX(nx)
    const py = this.toY(ny)
    const sprite = this.add.sprite(px, py, key)
    sprite.setDepth(depth)
    sprite.setRotation(facingRad(px, py, this.toX(faceToward[0]), this.toY(faceToward[1])))
    this.track(sprite)
    return sprite
  }

  updatePitch(pitch: PitchSetup, pressure: string) {
    if (!this.pitchReady || !this.crowdOverlay) {
      this.pendingUpdate = { pitch, pressure }
      return
    }
    this.clearDynamic()
    this.registeredCues = []
    this.lastScanFocus = undefined

    this.cameras.main.setZoom(1)
    this.cameras.main.setScroll(0, 0)

    const allCues = pitch.visual_cues ?? []
    const tapKeys = new Set(tappableCues(allCues).map(cueKey))
    let tapIndex = 0

    for (const cue of filterCuesForDisplay(allCues)) {
      const isTappable = tapKeys.has(cueKey(cue))
      this.drawCue(cue, isTappable, tapIndex)
      if (isTappable) tapIndex++
    }

    for (const cue of labelCues(allCues)) {
      this.drawLabel(cue)
    }

    for (const [nx, ny, radius] of pitch.pressure_zones || []) {
      const circle = this.add.circle(this.toX(nx), this.toY(ny), radius * 200, 0xff3333, 0.12)
      circle.setDepth(1)
      circle.setStrokeStyle(2, 0xf87171, 0.35)
      this.track(circle)
    }

    const [bx, by] = pitch.ball || [0.5, 0.5]
    const bxPx = this.toX(bx)
    const byPx = this.toY(by)

    pitch.teammates?.forEach(([nx, ny]) => {
      const sprite = this.placeToken(TOKEN_KEYS.ally, nx, ny, [bx, by], 4)
      this.playerObjects.push(sprite)
    })

    pitch.opponents?.forEach(([nx, ny], i) => {
      const sprite = this.placeToken(TOKEN_KEYS.opp, nx, ny, [bx, by], 4)
      this.playerObjects.push(sprite)
      const lbl = pitch.opponent_labels?.[i]
      if (lbl && i < 2) {
        const t = this.add
          .text(this.toX(nx), this.toY(ny) - 18, lbl, {
            fontSize: '10px',
            color: '#fecaca',
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'bold',
            backgroundColor: '#450a0acc',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(6)
        this.track(t)
        this.playerObjects.push(t)
      }
    })

    const [yx, yy] = pitch.you || [0.5, 0.5]
    const yxPx = this.toX(yx)
    const yyPx = this.toY(yy)

    this.youRing = this.add.circle(yxPx, yyPx, 20, 0xfbbf24, 0.12)
    this.youRing.setStrokeStyle(2, 0xfbbf24, 0.45)
    this.youRing.setDepth(4)
    this.track(this.youRing)

    this.youMarker = this.placeToken(TOKEN_KEYS.you, yx, yy, [bx, by], 6)
    this.playerObjects.push(this.youMarker, this.youRing)

    this.ballGlow = this.add.circle(bxPx, byPx, 12, 0xffffff, 0.2)
    this.ballGlow.setDepth(5)
    this.track(this.ballGlow)
    this.ball = this.add.sprite(bxPx, byPx, TOKEN_KEYS.ball)
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
      alpha: { from: 0.1, to: 0.25 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    })

    this.applyReadability()
    this.bindHitZones()
    this.refreshTapHints()
  }

  private drawLabel(cue: VisualCue) {
    if (!cue.at || !cue.text) return
    const t = this.add
      .text(this.toX(cue.at[0]), this.toY(cue.at[1]), cue.text, {
        fontSize: '11px',
        color: cue.color || '#e2e8f0',
        fontFamily: 'Inter, sans-serif',
        fontStyle: 'bold',
        backgroundColor: '#0f172acc',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(8)
    this.track(t)
    this.playerObjects.push(t)
  }

  setShowTapHints(on: boolean) {
    this.showTapHints = on
    this.refreshTapHints()
  }

  setTapOptions(options: TapOption[]) {
    this.tapOptions = options
    for (const cue of this.registeredCues) {
      cue.actionShort = this.actionForCue(cue.cueLabel)
    }
    this.refreshTapHints()
  }

  private actionForCue(cueLabel: string): string {
    return this.tapOptions.find((o) => o.cueLabel === cueLabel)?.actionShort ?? 'Choose'
  }

  private refreshTapHints() {
    for (const o of this.tapHintObjects) o.destroy()
    this.tapHintObjects = []
    const showButtons = (this.showTapHints || this.selectedCueLabel) && this.pitchInteractive
    if (!showButtons) return

    let hintIdx = 0
    for (const cue of this.registeredCues) {
      if (!cue.tappable || !cue.hitZone || !cue.focus) continue
      const zone = cue.hitZone
      const isSelected = this.selectedCueLabel === cue.cueLabel
      const isHover = this.pitchHoverLabel === cue.cueLabel
      const showThis = this.showTapHints || isSelected
      if (!showThis) continue

      const spread = TAP_SPREAD[hintIdx % TAP_SPREAD.length]
      hintIdx++
      const hx = zone.x + (isSelected ? 0 : spread.x * 0.15)
      const hy = zone.y + (isSelected ? 0 : spread.y * 0.15)

      const strokeColor =
        cue.focus === 'space' ? 0x4ade80 : cue.focus === 'threat' ? 0xfb923c : 0xef4444
      const ring = this.add.circle(hx, hy, isSelected ? 38 : 34, 0xffffff, 0)
      ring.setStrokeStyle(isSelected ? 4 : 2, strokeColor, isSelected || isHover ? 1 : 0.7)
      ring.setDepth(11)
      this.track(ring)
      this.tapHintObjects.push(ring)

      if (this.showTapHints && !isSelected) {
        this.tweens.add({
          targets: ring,
          alpha: { from: 0.5, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
        })
      }

      const bgColor =
        cue.focus === 'space' ? '#14532d' : cue.focus === 'threat' ? '#7c2d12' : '#450a0a'
      const lbl = this.add
        .text(hx, hy, cue.actionShort, {
          fontSize: isSelected ? '12px' : '11px',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontStyle: 'bold',
          backgroundColor: bgColor,
          padding: { x: 6, y: 4 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(12)
      this.track(lbl)
      this.tapHintObjects.push(lbl)
    }
  }

  setScanFocus(focus: ScanFocus | null) {
    if (this.lastScanFocus === focus) return
    this.lastScanFocus = focus
    this.scanFocus = focus
    this.applyReadability()
  }

  setHoverCueLabel(label: string | null) {
    this.hoverCueLabel = label
    this.applyReadability()
  }

  setSelectedCueLabel(label: string | null) {
    this.selectedCueLabel = label
    this.applyReadability()
    this.refreshTapHints()
  }

  setPitchInteractive(enabled: boolean, onSelect: ((label: string) => void) | null) {
    this.pitchInteractive = enabled
    this.onCueSelect = enabled ? onSelect : null
    this.bindHitZones()
    this.refreshTapHints()
  }

  private bindHitZones() {
    for (const cue of this.registeredCues) {
      const zone = cue.hitZone
      if (!zone) continue
      zone.removeAllListeners()
      if (!this.pitchInteractive || !cue.tappable) {
        zone.disableInteractive()
        continue
      }
      zone.setInteractive({ useHandCursor: true })
      zone.on('pointerover', () => {
        this.pitchHoverLabel = cue.cueLabel
        this.applyReadability()
      })
      zone.on('pointerout', () => {
        this.pitchHoverLabel = null
        this.applyReadability()
      })
      zone.on('pointerdown', () => {
        this.selectedCueLabel = cue.cueLabel
        this.onCueSelect?.(cue.cueLabel)
        this.applyReadability()
        this.refreshTapHints()
      })
    }
  }

  private applyReadability() {
    const highlightLabel = this.pitchHoverLabel || this.hoverCueLabel || this.selectedCueLabel

    if (highlightLabel && !this.scanFocus) {
      this.setGroupAlpha(this.registeredCues, 0.18)
      this.setGroupAlpha(this.playerObjects, 0.45)
      this.brightenCue(highlightLabel, 1)
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
  }

  private brightenScanFocus(focus: ScanFocus) {
    for (const cue of this.registeredCues) {
      if (cue.focus === focus) this.setObjectsAlpha(cue.objects, 1)
    }
    if (focus === 'you') {
      this.setObjectsAlpha(
        this.playerObjects.filter((o) => o === this.youMarker || o === this.youRing),
        1,
      )
      this.setObjectsAlpha([this.ball, this.ballGlow], 1)
    }
  }

  private brightenCue(label: string, alpha: number) {
    const cue = this.registeredCues.find((c) => c.cueLabel === label)
    if (cue) {
      this.setObjectsAlpha(cue.objects, alpha)
      if (cue.hitZone) cue.hitZone.setAlpha(0.35)
    }
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

  private drawCue(cue: VisualCue, tappable: boolean, tapIndex: number) {
    const objects: Phaser.GameObjects.GameObject[] = []
    const key = cueKey(cue)
    const cueLabel = cue.label || cue.text || cue.type
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
      this.drawArrow(g, cue.from, cue.to, 0xf87171, tappable ? 1 : 0.55, 4)
      objects.push(g)
    } else if (cue.type === 'open_lane' && cue.from && cue.to) {
      const g = this.add.graphics()
      g.setDepth(2)
      this.drawArrow(g, cue.from, cue.to, 0x4ade80, tappable ? 1 : 0.55, 4, true)
      objects.push(g)
    } else if (cue.type === 'danger_zone' && cue.at && cue.radius) {
      const c = this.add.circle(
        this.toX(cue.at[0]),
        this.toY(cue.at[1]),
        Math.min(cue.radius * 120, 36),
        0xef4444,
        tappable ? 0.22 : 0.12,
      )
      c.setDepth(2)
      c.setStrokeStyle(2, 0xfca5a5, tappable ? 0.85 : 0.45)
      objects.push(c)
    }

    for (const o of objects) this.track(o)
    if (objects.length) {
      const entry: RegisteredCue = {
        key,
        cueLabel,
        focus,
        actionShort: this.actionForCue(cueLabel),
        tappable,
        objects,
      }
      if (tappable && focus) {
        const anchor = cueAnchor(cue)
        if (anchor) {
          const spread = TAP_SPREAD[tapIndex % TAP_SPREAD.length]
          const hitX = this.toX(anchor[0]) + spread.x
          const hitY = this.toY(anchor[1]) + spread.y
          const hitColor =
            cue.type === 'open_lane' ? 0x4ade80 : cue.type === 'threat_arrow' ? 0xfb923c : 0xef4444
          const hit = this.add.circle(hitX, hitY, 40, hitColor, 0.08)
          hit.setDepth(9)
          hit.setStrokeStyle(1, hitColor, 0.4)
          this.track(hit)
          entry.hitZone = hit
        }
      }
      this.registeredCues.push(entry)
    }
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

  playAnimation(name: string) {
    if (!this.ball || !this.youMarker) return
    this.ball.setScale(1)
    this.youMarker.setScale(1)
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
    this.playerObjects = []
    this.registeredCues = []
    this.selectedCueLabel = null
    this.pitchHoverLabel = null
    for (const o of this.tapHintObjects) o.destroy()
    this.tapHintObjects = []
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
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
  })
}

export function getPitchScene(game: Phaser.Game): PitchScene | null {
  return game.scene.getScene('PitchScene') as PitchScene
}
