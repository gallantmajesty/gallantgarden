// Asset-free procedural textures for the Waterfall Realm, drawn to a <canvas> at
// runtime (same house style as ../library/textures.ts — no image files shipped).
// Each is generated once; callers memoise.

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

/** Lush meadow grass with clover/flower speckle — the land surface. */
export function makeGrassTexture(repeat = 24, seed = 11): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#4f7a32'
  ctx.fillRect(0, 0, 256, 256)
  // mottled tufts
  for (let i = 0; i < 2600; i++) {
    const x = rand() * 256
    const y = rand() * 256
    const g = 90 + rand() * 90
    ctx.fillStyle = `rgba(${Math.floor(40 + rand() * 30)},${Math.floor(g)},${Math.floor(30 + rand() * 30)},0.6)`
    ctx.fillRect(x, y, 1 + rand() * 2, 2 + rand() * 3)
  }
  // sparse tiny flowers
  for (let i = 0; i < 60; i++) {
    const x = rand() * 256
    const y = rand() * 256
    ctx.fillStyle = rand() > 0.5 ? 'rgba(245,240,200,0.8)' : 'rgba(225,170,210,0.8)'
    ctx.beginPath()
    ctx.arc(x, y, 1.4, 0, Math.PI * 2)
    ctx.fill()
  }
  return finish(c, repeat)
}

/** Grey-brown cliff rock with strata + moss tint — cliffs and boulders. */
export function makeRockTexture(repeat = 6, seed = 23): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#7c756a'
  ctx.fillRect(0, 0, 256, 256)
  // horizontal strata bands
  for (let y = 0; y < 256; y += 6 + rand() * 10) {
    const sh = 0.78 + rand() * 0.4
    ctx.fillStyle = `rgb(${Math.floor(124 * sh)},${Math.floor(117 * sh)},${Math.floor(106 * sh)})`
    ctx.fillRect(0, y, 256, 4 + rand() * 6)
  }
  // cracks + grain
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(50,46,40,${0.05 + rand() * 0.15})`
    ctx.fillRect(rand() * 256, rand() * 256, 1, 1 + rand() * 3)
  }
  // moss patches
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(70,100,45,${0.12 + rand() * 0.2})`
    ctx.beginPath()
    ctx.arc(rand() * 256, rand() * 256, 4 + rand() * 12, 0, Math.PI * 2)
    ctx.fill()
  }
  return finish(c, repeat)
}

/** Warm wooden planks — benches, decks, bridges. (Local copy so the realm is
 *  self-contained; same recipe as the Library floor wood.) */
export function makeWoodTexture(repeat = 4, seed = 7): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#6b4423'
  ctx.fillRect(0, 0, 256, 256)
  const plankH = 32
  for (let y = 0; y < 256; y += plankH) {
    const shade = 0.82 + rand() * 0.3
    ctx.fillStyle = `rgb(${Math.floor(132 * shade)},${Math.floor(88 * shade)},${Math.floor(48 * shade)})`
    ctx.fillRect(0, y, 256, plankH - 2)
    for (let i = 0; i < 22; i++) {
      ctx.strokeStyle = `rgba(60,36,18,${0.05 + rand() * 0.12})`
      ctx.beginPath()
      const yy = y + rand() * plankH
      ctx.moveTo(0, yy)
      ctx.bezierCurveTo(80, yy + (rand() - 0.5) * 6, 170, yy + (rand() - 0.5) * 6, 256, yy)
      ctx.stroke()
    }
  }
  return finish(c, repeat)
}

/** Pale flagstone for the stone paths and camp platforms. */
export function makeStoneTexture(repeat = 5, seed = 31): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  ctx.fillStyle = '#9a948a'
  ctx.fillRect(0, 0, 256, 256)
  // irregular flagstones
  for (let gy = 0; gy < 256; gy += 64) {
    for (let gx = 0; gx < 256; gx += 64) {
      const sh = 0.85 + rand() * 0.3
      ctx.fillStyle = `rgb(${Math.floor(160 * sh)},${Math.floor(154 * sh)},${Math.floor(142 * sh)})`
      const pad = 3 + rand() * 3
      ctx.fillRect(gx + pad, gy + pad, 64 - pad * 2, 64 - pad * 2)
    }
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(60,58,52,${0.04 + rand() * 0.1})`
    ctx.fillRect(rand() * 256, rand() * 256, 1, 1)
  }
  return finish(c, repeat)
}

/** A tileable bluish normal-ish ripple map (used as a bump/normal on the lake &
 *  waterfall to break up the flat shading). Stored linear (not sRGB). */
export function makeWaterNormalTexture(repeat = 8, seed = 5): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  const img = ctx.createImageData(256, 256)
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      // overlapping sine ripples → a soft height field, encoded as a normal-ish blue map
      const h =
        Math.sin(x * 0.12 + Math.sin(y * 0.07) * 2) * 0.5 +
        Math.sin(y * 0.09 + Math.cos(x * 0.05) * 2) * 0.5
      const nx = 128 + h * 40 + (rand() - 0.5) * 10
      const ny = 128 + h * 40 + (rand() - 0.5) * 10
      const i = (y * 256 + x) * 4
      img.data[i] = Math.max(0, Math.min(255, nx))
      img.data[i + 1] = Math.max(0, Math.min(255, ny))
      img.data[i + 2] = 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return finish(c, repeat, false)
}

/** A streaky vertical falling-water sheet used as a grayscale FLOW MASK (the red
 *  channel drives the shader's streak/foam mix — the shader supplies all colour).
 *  Tiled vertically and scrolled by the waterfall material. Deliberately varied
 *  so the sheet breaks up into distinct ribbons of water rather than a flat wall. */
export function makeWaterfallTexture(seed = 17): CanvasTexture {
  const c = canvas(256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)
  // mid-grey base so most of the sheet is translucent body water, not foam
  ctx.fillStyle = 'rgb(70,70,70)'
  ctx.fillRect(0, 0, 256, 256)
  // broad soft ribbons (the main visible flow lanes) — varied width & brightness
  for (let i = 0; i < 26; i++) {
    const x = rand() * 256
    const w = 4 + rand() * 18
    const g = Math.floor(60 + rand() * 110)
    const grad = ctx.createLinearGradient(x, 0, x + w, 0)
    grad.addColorStop(0, `rgba(${g},${g},${g},0)`)
    grad.addColorStop(0.5, `rgba(${g},${g},${g},0.9)`)
    grad.addColorStop(1, `rgba(${g},${g},${g},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(x, 0, w, 256)
  }
  // fine bright streaks (catch the light along the ribbons)
  for (let i = 0; i < 70; i++) {
    const x = rand() * 256
    const w = 1 + rand() * 2.5
    const v = Math.floor(150 + rand() * 105)
    ctx.fillStyle = `rgba(${v},${v},${v},${0.25 + rand() * 0.45})`
    ctx.fillRect(x, 0, w, 256)
  }
  // short foam flecks (brightest points → become the white breakup)
  for (let i = 0; i < 260; i++) {
    const v = Math.floor(210 + rand() * 45)
    ctx.fillStyle = `rgba(${v},${v},${v},${0.3 + rand() * 0.6})`
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 2 + rand() * 7)
  }
  const tex = new CanvasTexture(c)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = ANISO
  return tex
}

/** Soft round foam/mist puff (radial alpha) for billboards & spray points. */
export function makeFoamSprite(): CanvasTexture {
  const c = canvas(128)
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
  // soft, feathered puff — low core alpha so stacked sprites read as haze, not blobs
  g.addColorStop(0, 'rgba(255,255,255,0.6)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.22)')
  g.addColorStop(0.7, 'rgba(255,255,255,0.06)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new CanvasTexture(c)
  tex.anisotropy = ANISO
  return tex
}
