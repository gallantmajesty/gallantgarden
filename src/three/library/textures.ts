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

/** Like `finish` but for non-colour data (normal maps): NO sRGB transform, or the
 *  GPU would mis-decode the encoded vectors and the lighting would look wrong. */
function finishLinear(c: HTMLCanvasElement, repeat: number) {
  const tex = new CanvasTexture(c)
  // leave colorSpace at the default (linear) — normal maps are data, not colour
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = ANISO
  return tex
}

/**
 * Convert a grayscale height canvas into a tangent-space normal map (one-time
 * cost at load). Sobel-style central differences give per-texel slopes; `strength`
 * scales how pronounced the bumps read under lighting. This is what turns the flat
 * procedural wood/stone into surfaces with real grain/imperfection depth without
 * shipping any image files.
 */
function heightToNormal(src: HTMLCanvasElement, strength: number, repeat: number): CanvasTexture {
  const n = src.width
  const sctx = src.getContext('2d')!
  const h = sctx.getImageData(0, 0, n, n).data
  const out = canvas(n)
  const octx = out.getContext('2d')!
  const img = octx.createImageData(n, n)
  const o = img.data
  const at = (x: number, y: number) => h[((((y + n) % n) * n + ((x + n) % n)) << 2)] / 255
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength
      const len = Math.hypot(dx, dy, 1)
      const i = (y * n + x) << 2
      o[i] = ((dx / len) * 0.5 + 0.5) * 255
      o[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      o[i + 2] = (1 / len) * 0.5 * 255 + 127.5
      o[i + 3] = 255
    }
  }
  octx.putImageData(img, 0, 0)
  return finishLinear(out, repeat)
}

/** Warm wooden planks with subtle grain — for the floor. Rendered at 2× and let
 *  the context scale so the grain stays crisp at grazing angles (one-time cost).
 *  Each plank now gets its own colour temperature (some honey, some coffee),
 *  a few grain knots, and a worn highlight down the centre so the floor reads as
 *  real aged timber rather than a flat tile. */
export function makeWoodTexture(repeat = 8, seed = 7): CanvasTexture {
  const SS = 2
  const c = canvas(256 * SS)
  const ctx = c.getContext('2d')!
  ctx.scale(SS, SS)
  const rand = rng(seed)
  ctx.fillStyle = '#6b4423'
  ctx.fillRect(0, 0, 256, 256)
  const plankH = 32
  for (let y = 0; y < 256; y += plankH) {
    // per-plank colour so no two boards share the exact tone
    const baseR = 122, baseG = 78, baseB = 40
    const warm = rand()
    const shade = 0.78 + rand() * 0.4
    const r = Math.floor((baseR + warm * 26) * shade)
    const g = Math.floor((baseG + warm * 10) * shade)
    const b = Math.floor((baseB - 6) * shade)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
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
    // a couple of knots per plank for organic imperfection
    const knots = 1 + Math.floor(rand() * 2)
    for (let k = 0; k < knots; k++) {
      const kx = rand() * 256
      const ky = y + rand() * plankH
      const kr = 1.5 + rand() * 3
      const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr)
      kg.addColorStop(0, 'rgba(40,22,10,0.55)')
      kg.addColorStop(1, 'rgba(40,22,10,0)')
      ctx.fillStyle = kg
      ctx.beginPath()
      ctx.arc(kx, ky, kr, 0, Math.PI * 2)
      ctx.fill()
    }
    // worn centre highlight (varnished boards catch the lantern light)
    const hg = ctx.createLinearGradient(0, y, 0, y + plankH)
    hg.addColorStop(0, 'rgba(255,220,170,0)')
    hg.addColorStop(0.5, 'rgba(255,225,180,0.10)')
    hg.addColorStop(1, 'rgba(255,220,170,0)')
    ctx.fillStyle = hg
    ctx.fillRect(0, y, 256, plankH - 2)
    // plank seam
    ctx.fillStyle = 'rgba(30,18,8,0.55)'
    ctx.fillRect(0, y + plankH - 2, 256, 2)
  }
  return finish(c, repeat)
}

/** A roughness map to pair with `makeWoodTexture`: darker = smoother/varnished,
 *  lighter = weathered/matte. Gives the floor a believable mix of polished and
 *  scuffed boards so the lantern speculars break up instead of smearing evenly. */
export function makeWoodRoughnessTexture(repeat = 8, seed = 7): CanvasTexture {
  const SS = 2
  const c = canvas(256 * SS)
  const ctx = c.getContext('2d')!
  ctx.scale(SS, SS)
  const rand = rng(seed + 101)
  ctx.fillStyle = '#b8b8b8'
  ctx.fillRect(0, 0, 256, 256)
  const plankH = 32
  for (let y = 0; y < 256; y += plankH) {
    const rough = 0.55 + rand() * 0.4 // this plank's overall wear
    for (let x = 0; x < 256; x += 2) {
      const n = rough + (rand() - 0.5) * 0.25
      const v = Math.max(0, Math.min(255, Math.floor(n * 255)))
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(x, y, 2, plankH - 2)
    }
    // polished centre strip (lower roughness → smoother)
    const sg = ctx.createLinearGradient(0, y, 0, y + plankH)
    sg.addColorStop(0, 'rgba(40,40,40,0)')
    sg.addColorStop(0.5, 'rgba(30,30,30,0.7)')
    sg.addColorStop(1, 'rgba(40,40,40,0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, y, 256, plankH - 2)
    // dark seam (smooth groove)
    ctx.fillStyle = 'rgba(20,20,20,0.8)'
    ctx.fillRect(0, y + plankH - 2, 256, 2)
  }
  return finishLinear(c, repeat)
}

/** A grand-library carpet runner: deep crimson field, gold border and a faint
 *  diamond trellis, tiled along the aisle. One draw call for the whole runner. */
export function makeCarpetTexture(repeat = 1, seed = 3): CanvasTexture {
  const N = 256
  const c = canvas(N)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  // crimson gradient field
  const g = ctx.createLinearGradient(0, 0, 0, N)
  g.addColorStop(0, '#5a1422')
  g.addColorStop(0.5, '#6e1a2c')
  g.addColorStop(1, '#551320')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, N, N)
  // muted mottling so it isn't a flat colour
  for (let i = 0; i < 900; i++) {
    const x = rand() * N, y = rand() * N, r = 1 + rand() * 3
    const d = (rand() - 0.5) * 30
    ctx.fillStyle = `rgba(${110 + d},${26 + d * 0.4},${44 + d * 0.4},0.18)`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // gold border
  ctx.strokeStyle = '#caa84a'
  ctx.lineWidth = 10
  ctx.strokeRect(14, 14, N - 28, N - 28)
  ctx.strokeStyle = '#e7c45f'
  ctx.lineWidth = 3
  ctx.strokeRect(24, 24, N - 48, N - 48)
  // diamond trellis
  ctx.strokeStyle = 'rgba(231,196,95,0.35)'
  ctx.lineWidth = 2
  const cell = 64
  for (let y = -cell; y < N + cell; y += cell) {
    for (let x = -cell; x < N + cell; x += cell) {
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
  return finish(c, repeat)
}

/** A tall leaded stained-glass panel in jewel tones with a glowing arched
 *  motif — used as both colour and emissive map so the windows shine like a
 *  wizard's hall. Drawn once per call; callers memoise. */
export function makeStainedGlassTexture(seed = 5): CanvasTexture {
  const W = 256
  const H = 512
  // Render at 3× and let the context scale, so the tall window panels stay crisp
  // (no blocky diamonds) without touching any of the drawing maths below. This is
  // a one-time generation cost — zero per-frame impact. Bumped 2×→3× to clear the
  // "blurry stained glass" report (768×1536 effective).
  const SS = 3
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

/** Soft warm plaster / stone wall with faint mottling. Supersampled 2× for crisp
 *  grazing-angle detail. */
export function makePlasterTexture(repeat = 4, seed = 19): CanvasTexture {
  const SS = 2
  const c = canvas(256 * SS)
  const ctx = c.getContext('2d')!
  ctx.scale(SS, SS)
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

/** Tangent-space normal map for the wooden floor: plank seams cut grooves and the
 *  long grain adds fine ridges, so the floor catches the lantern light with real
 *  depth instead of reading as a flat decal. Pair with `makeWoodTexture` (same
 *  repeat). */
export function makeWoodNormalTexture(repeat = 14, seed = 7): CanvasTexture {
  const N = 256
  const c = canvas(N)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  // mid-grey height baseline
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, N, N)
  const plankH = 32
  for (let y = 0; y < N; y += plankH) {
    // long grain ridges (subtle brighter/darker streaks = micro height)
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(${rand() > 0.5 ? 255 : 0},${rand() > 0.5 ? 255 : 0},${rand() > 0.5 ? 255 : 0},${0.04 + rand() * 0.06})`
      ctx.beginPath()
      const gy = y + rand() * plankH
      ctx.moveTo(0, gy)
      ctx.bezierCurveTo(80, gy + (rand() - 0.5) * 3, 170, gy + (rand() - 0.5) * 3, N, gy)
      ctx.stroke()
    }
    // deep seam between planks (dark = recessed groove)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, y + plankH - 2, N, 2)
    ctx.fillStyle = '#d8d8d8'
    ctx.fillRect(0, y + plankH - 3, N, 1)
  }
  return heightToNormal(c, 2.4, repeat)
}

/** Tangent-space normal map for stone/plaster: rounded mottled bumps so columns
 *  and walls show surface imperfections under the warm lights. Pair with
 *  `makePlasterTexture` (same repeat). */
export function makeStoneNormalTexture(repeat = 4, seed = 19): CanvasTexture {
  const N = 256
  const c = canvas(N)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, N, N)
  for (let i = 0; i < 900; i++) {
    const x = rand() * N
    const y = rand() * N
    const r = 2 + rand() * 7
    const up = rand() > 0.5
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const lvl = up ? 210 : 60
    g.addColorStop(0, `rgba(${lvl},${lvl},${lvl},0.5)`)
    g.addColorStop(1, 'rgba(128,128,128,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return heightToNormal(c, 1.6, repeat)
}

/**
 * A rougher, chunkier normal map for the ancient pillar SHAFTS — bigger, harder
 * rocky bumps and a few deep fissures so the columns read as weathered stone
 * rather than smooth plaster. Stronger height→normal strength than the wall map.
 */
export function makeRockNormalTexture(repeat = 3, seed = 41): CanvasTexture {
  const N = 256
  const c = canvas(N)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, N, N)
  // broad rocky lumps
  for (let i = 0; i < 420; i++) {
    const x = rand() * N
    const y = rand() * N
    const r = 4 + rand() * 16
    const up = rand() > 0.45
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const lvl = up ? 225 : 40
    g.addColorStop(0, `rgba(${lvl},${lvl},${lvl},0.55)`)
    g.addColorStop(1, 'rgba(128,128,128,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // horizontal bedding / strata lines (ancient cut-stone courses)
  for (let i = 0; i < 26; i++) {
    const y = rand() * N
    ctx.strokeStyle = `rgba(${rand() > 0.5 ? 235 : 25},${rand() > 0.5 ? 235 : 25},${rand() > 0.5 ? 235 : 25},0.18)`
    ctx.lineWidth = 1 + rand() * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(N, y + (rand() - 0.5) * 4)
    ctx.stroke()
  }
  // a few deep cracks
  for (let i = 0; i < 14; i++) {
    const x = rand() * N
    const y = rand() * N
    ctx.strokeStyle = 'rgba(20,20,20,0.5)'
    ctx.lineWidth = 1 + rand() * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    let cx = x
    let cy = y
    for (let s = 0; s < 5; s++) {
      cx += (rand() - 0.5) * 28
      cy += (rand() - 0.5) * 28
      ctx.lineTo(cx, cy)
    }
    ctx.stroke()
  }
  return heightToNormal(c, 4.2, repeat)
}
