// Asset-free procedural textures, drawn to a <canvas> at runtime. Keeps the
// library looking handcrafted without shipping any image files. Each texture is
// generated once and reused (Three caches nothing for us, so callers memoise).

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

/** Deterministic LCG so textures are stable run-to-run (house style). */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function canvas(size = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return c
}

// Crisp anisotropic filtering keeps tiled surfaces (floor, walls) sharp at
// grazing angles instead of blurring — a "free" one-time clarity win with no
// per-frame cost. 16 is the common GPU maximum; drivers clamp it down safely.
const ANISO = 16

function finish(c: HTMLCanvasElement, repeat: number) {
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = ANISO
  return tex
}

/** Warm wooden planks with subtle grain — for the floor. */
export function makeWoodTexture(repeat = 8, seed = 7): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#6b4423'
  ctx.fillRect(0, 0, 256, 256)
  const plankH = 32
  for (let y = 0; y < 256; y += plankH) {
    const shade = 0.82 + rand() * 0.3
    ctx.fillStyle = `rgb(${Math.floor(122 * shade)}, ${Math.floor(78 * shade)}, ${Math.floor(40 * shade)})`
    ctx.fillRect(0, y, 256, plankH - 2)
    // grain streaks
    for (let i = 0; i < 22; i++) {
      ctx.strokeStyle = `rgba(60,36,18,${0.05 + rand() * 0.12})`
      ctx.beginPath()
      const gy = y + rand() * plankH
      ctx.moveTo(0, gy)
      ctx.bezierCurveTo(80, gy + (rand() - 0.5) * 4, 170, gy + (rand() - 0.5) * 4, 256, gy)
      ctx.stroke()
    }
    // plank seam
    ctx.fillStyle = 'rgba(30,18,8,0.55)'
    ctx.fillRect(0, y + plankH - 2, 256, 2)
  }
  return finish(c, repeat)
}

/** A tall leaded stained-glass panel in jewel tones with a glowing arched
 *  motif — used as both colour and emissive map so the windows shine like a
 *  wizard's hall. Drawn once per call; callers memoise. */
export function makeStainedGlassTexture(seed = 5): CanvasTexture {
  const W = 256
  const H = 512
  // Render at 2× and let the context scale, so the tall window panels stay crisp
  // (no blocky diamonds) without touching any of the drawing maths below. This is
  // a one-time generation cost — zero per-frame impact.
  const SS = 2
  const c = document.createElement('canvas')
  c.width = W * SS
  c.height = H * SS
  const ctx = c.getContext('2d')!
  ctx.scale(SS, SS)
  const rand = rng(seed)

  // jewel palette
  const jewels = ['#3a6ea5', '#8a2f3a', '#2f7a4a', '#caa84a', '#5a3a7a', '#2f5c8a', '#a8602a']

  // dark leading background
  ctx.fillStyle = '#1a1206'
  ctx.fillRect(0, 0, W, H)

  // diamond lattice of glass panes
  const cell = 42
  for (let y = -cell; y < H + cell; y += cell) {
    for (let x = -cell; x < W + cell; x += cell) {
      const cx = x + ((Math.floor(y / cell) % 2) * cell) / 2
      ctx.fillStyle = jewels[Math.floor(rand() * jewels.length)]
      ctx.beginPath()
      ctx.moveTo(cx, y - cell * 0.5)
      ctx.lineTo(cx + cell * 0.5, y)
      ctx.lineTo(cx, y + cell * 0.5)
      ctx.lineTo(cx - cell * 0.5, y)
      ctx.closePath()
      ctx.fill()
      // pane shading for depth
      ctx.fillStyle = `rgba(255,255,255,${0.06 + rand() * 0.1})`
      ctx.fill()
    }
  }

  // leading lines (the dark cames between panes)
  ctx.strokeStyle = '#0d0a04'
  ctx.lineWidth = 4
  for (let y = -cell; y < H + cell; y += cell) {
    for (let x = -cell; x < W + cell; x += cell) {
      const cx = x + ((Math.floor(y / cell) % 2) * cell) / 2
      ctx.beginPath()
      ctx.moveTo(cx, y - cell * 0.5)
      ctx.lineTo(cx + cell * 0.5, y)
      ctx.lineTo(cx, y + cell * 0.5)
      ctx.lineTo(cx - cell * 0.5, y)
      ctx.closePath()
      ctx.stroke()
    }
  }

  // a glowing central roundel (magical sigil) near the top
  ctx.save()
  ctx.translate(W / 2, H * 0.32)
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 60)
  grad.addColorStop(0, '#fff3cf')
  grad.addColorStop(0.5, '#ffcf7a')
  grad.addColorStop(1, 'rgba(255,180,80,0.1)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, 58, 0, Math.PI * 2)
  ctx.fill()
  // an eight-point star
  ctx.fillStyle = '#fff7e0'
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const r = i % 2 === 0 ? 40 : 16
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = ANISO
  return tex
}

/** A hanging house banner: deep navy field, gold border, a glowing gold crest
 *  (eight-point star over a leaf) and "FOCUS LILY" lettering — like the
 *  reference hall's banners. */
export function makeBannerTexture(): CanvasTexture {
  const W = 128
  const H = 320
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  // navy field
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#243a5e')
  g.addColorStop(1, '#16243c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // gold borders
  ctx.strokeStyle = '#caa84a'
  ctx.lineWidth = 5
  ctx.strokeRect(8, 8, W - 16, H - 16)
  ctx.lineWidth = 2
  ctx.strokeRect(16, 16, W - 32, H - 32)

  // crest: eight-point star
  ctx.save()
  ctx.translate(W / 2, 84)
  ctx.fillStyle = '#e7c45f'
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 34 : 14
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  // small leaf in the centre
  ctx.fillStyle = '#16243c'
  ctx.beginPath()
  ctx.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // lettering
  ctx.fillStyle = '#e7c45f'
  ctx.textAlign = 'center'
  ctx.font = 'bold 19px Georgia, serif'
  ctx.fillText('FOCUS', W / 2, 168)
  ctx.fillText('LILY', W / 2, 192)

  // a few decorative dots down the lower field
  ctx.fillStyle = 'rgba(231,196,95,0.7)'
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.arc(W / 2, 230 + i * 22, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = ANISO
  return tex
}

/** Soft warm plaster / stone wall with faint mottling. */
export function makePlasterTexture(repeat = 4, seed = 19): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#caa97e'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1400; i++) {
    const x = rand() * 256
    const y = rand() * 256
    const r = 1 + rand() * 3
    const d = (rand() - 0.5) * 28
    ctx.fillStyle = `rgba(${178 + d},${150 + d},${108 + d},0.25)`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return finish(c, repeat)
}
