import Phaser from 'phaser'

export const TOKEN_KEYS = {
  ally: 'token-ally',
  opp: 'token-opp',
  you: 'token-you',
  ball: 'token-ball',
} as const

/** Generate top-down player + ball textures once per game boot. */
export function ensurePitchTokens(scene: Phaser.Scene) {
  if (scene.textures.exists(TOKEN_KEYS.ally)) return

  const size = 28

  const drawPlayer = (key: string, fill: number, accent: number) => {
    const g = scene.make.graphics({ x: 0, y: 0 })
    g.fillStyle(fill, 1)
    g.fillCircle(size / 2, size / 2, size / 2 - 2)
    g.lineStyle(2, 0xffffff, 0.95)
    g.strokeCircle(size / 2, size / 2, size / 2 - 2)
    // Facing wedge (points right = 0 rad)
    g.fillStyle(accent, 1)
    g.fillTriangle(size / 2 + 6, size / 2, size / 2 - 4, size / 2 - 6, size / 2 - 4, size / 2 + 6)
    g.generateTexture(key, size, size)
    g.destroy()
  }

  drawPlayer(TOKEN_KEYS.ally, 0x1d4ed8, 0x93c5fd)
  drawPlayer(TOKEN_KEYS.opp, 0xb91c1c, 0xfca5a5)
  drawPlayer(TOKEN_KEYS.you, 0xca8a04, 0xfef08a)

  const ballG = scene.make.graphics({ x: 0, y: 0 })
  const bs = 18
  ballG.fillStyle(0xffffff, 1)
  ballG.fillCircle(bs / 2, bs / 2, bs / 2 - 1)
  ballG.lineStyle(1, 0xcbd5e1, 0.9)
  ballG.strokeCircle(bs / 2, bs / 2, bs / 2 - 1)
  ballG.lineStyle(1, 0x94a3b8, 0.5)
  ballG.strokeCircle(bs / 2, bs / 2, 3)
  ballG.generateTexture(TOKEN_KEYS.ball, bs, bs)
  ballG.destroy()
}

export function facingRad(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(toY - fromY, toX - fromX)
}
