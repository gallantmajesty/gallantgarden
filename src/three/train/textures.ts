// Asset-free procedural textures for the Train Station Realm, drawn to a <canvas>
// at runtime (same house style as ../library/textures.ts and ../waterfall). Warm,
// worn, gas-lit terminus surfaces: dark stone concourse flags, warm waxed wood,
// and a soft puff sprite shared by steam and lantern bloom. Generated once;
// callers memoise.

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

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

const ANISO = 16

function finish(c: HTMLCanvasElement, repeat: number, srgb = true) {
  const tex = new CanvasTexture(c)
  if (srgb) tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = ANISO
  return tex
}

/** Dark warm flagstone for the concourse + platform floors — large worn slabs
 *  with grouting and a faint polish sheen baked into the value variation. */
export function makeStationFloor(repeat = 18, seed = 41): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#3a3640'
  ctx.fillRect(0, 0, 256, 256)
  const cell = 64
  for (let gy = 0; gy < 256; gy += cell) {
    for (let gx = 0; gx < 256; gx += cell) {
      const sh = 0.8 + rand() * 0.35
      ctx.fillStyle = `rgb(${Math.floor(64 * sh)},${Math.floor(58 * sh)},${Math.floor(64 * sh)})`
      const pad = 2 + rand() * 2
      ctx.fillRect(gx + pad, gy + pad, cell - pad * 2, cell - pad * 2)
    }
  }
  // grime + sparkle flecks
  for (let i = 0; i < 700; i++) {
    const v = rand() > 0.85 ? 150 : 30
    ctx.fillStyle = `rgba(${v},${v},${v},${0.04 + rand() * 0.1})`
    ctx.fillRect(rand() * 256, rand() * 256, 1, 1)
  }
  return finish(c, repeat)
}

/** Warm waxed wood planks — benches, kiosks, canopy valance, carriage walls. */
export function makeWood(repeat = 4, seed = 7, base = '#6b4427'): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 256)
  const plankH = 30
  for (let y = 0; y < 256; y += plankH) {
    const shade = 0.82 + rand() * 0.32
    ctx.fillStyle = `rgb(${Math.floor(132 * shade)},${Math.floor(86 * shade)},${Math.floor(46 * shade)})`
    ctx.fillRect(0, y, 256, plankH - 2)
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(54,30,14,${0.05 + rand() * 0.12})`
      ctx.beginPath()
      const yy = y + rand() * plankH
      ctx.moveTo(0, yy)
      ctx.bezierCurveTo(80, yy + (rand() - 0.5) * 5, 170, yy + (rand() - 0.5) * 5, 256, yy)
      ctx.stroke()
    }
  }
  return finish(c, repeat)
}

/** Soft round puff (radial alpha) — shared by steam, smoke and lantern bloom. */
export function makePuff(): CanvasTexture {
  const c = canvas(128)
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
  g.addColorStop(0, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.2)')
  g.addColorStop(0.75, 'rgba(255,255,255,0.05)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new CanvasTexture(c)
  tex.anisotropy = ANISO
  return tex
}
