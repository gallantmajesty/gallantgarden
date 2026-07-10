// Canvas-based texture generation for clothing logos and patterns.
// Creates HTMLCanvasElement textures that map onto clothing geometry.

import { CanvasTexture, LinearFilter, RepeatWrapping } from 'three'

const texCache = new Map<string, CanvasTexture>()

function cachedTexture(key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 512): CanvasTexture {
  let t = texCache.get(key)
  if (t) return t
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  draw(ctx, w, h)
  t = new CanvasTexture(canvas)
  t.magFilter = LinearFilter
  t.minFilter = LinearFilter
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  texCache.set(key, t)
  return t
}

/** FocusLily logo: a stylised "FL" monogram with a lily petal motif. */
export function focusLilyLogoTex(): CanvasTexture {
  return cachedTexture('fl-logo', (ctx, w, h) => {
    // Transparent background
    ctx.clearRect(0, 0, w, h)

    // Outer circle — soft white glow
    const cx = w / 2, cy = h / 2, r = w * 0.42
    const grad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r)
    grad.addColorStop(0, 'rgba(255,255,255,0.95)')
    grad.addColorStop(0.7, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // Inner circle border
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = w * 0.012
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2)
    ctx.stroke()

    // "FL" text
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${w * 0.28}px "Segoe UI", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FL', cx, cy - h * 0.02)

    // "FocusLily" text below
    ctx.font = `${w * 0.08}px "Segoe UI", Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText('FocusLily', cx, cy + r * 0.55)

    // Small lily petal accent above the circle
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.ellipse(cx, cy - r * 0.88, w * 0.06, h * 0.04, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx - w * 0.04, cy - r * 0.82, w * 0.04, h * 0.03, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + w * 0.04, cy - r * 0.82, w * 0.04, h * 0.03, 0.5, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** Small front-chest FocusLily logo patch. */
export function focusLilyChestTex(): CanvasTexture {
  return cachedTexture('fl-chest', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2

    // Compact badge: circle + FL
    const r = w * 0.38
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = w * 0.015
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${w * 0.3}px "Segoe UI", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FL', cx, cy)
  })
}

/** Big back FocusLily logo — full brand name + monogram. */
export function focusLilyBackTex(): CanvasTexture {
  return cachedTexture('fl-back', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2

    // Large outer ring
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = w * 0.008
    ctx.beginPath()
    ctx.arc(cx, cy * 0.85, w * 0.35, 0, Math.PI * 2)
    ctx.stroke()

    // "FL" monogram inside ring
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${w * 0.22}px "Segoe UI", Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('FL', cx, cy * 0.83)

    // "FocusLily" full name below
    ctx.font = `bold ${w * 0.1}px "Segoe UI", Arial, sans-serif`
    ctx.fillText('FocusLily', cx, cy * 1.35)

    // Tagline
    ctx.font = `${w * 0.045}px "Segoe UI", Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('Study  ·  Focus  ·  Grow', cx, cy * 1.55)

    // Decorative lily petals at top
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI / 2
      const px = cx + Math.cos(angle) * w * 0.12
      const py = cy * 0.42 + Math.sin(angle) * h * 0.06
      ctx.beginPath()
      ctx.ellipse(px, py, w * 0.035, h * 0.025, angle, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

/** Horizontal stripe pattern for hoodie/sleeves. */
export function stripePatternTex(color1: string, color2: string, stripeH = 24): CanvasTexture {
  return cachedTexture(`stripe:${color1}:${color2}:${stripeH}`, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = color1
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = color2
    for (let y = 0; y < h; y += stripeH * 2) {
      ctx.fillRect(0, y, w, stripeH)
    }
  })
}

/** Cross-stitch / hash pattern for fabric texture. */
export function fabricTexture(baseHex: string): CanvasTexture {
  return cachedTexture(`fabric:${baseHex}`, (ctx, w, h) => {
    ctx.fillStyle = baseHex
    ctx.fillRect(0, 0, w, h)
    // Subtle cross-hatch to simulate fabric weave
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 8) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 8) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  })
}

/** Procedural hair strand/frizz texture (grayscale) used as a bump + roughness
 *  map so hair reads as individual fibres instead of a smooth "clay" shell.
 *  Vertical, slightly wavy strands of varied tone give surface relief. */
export function hairFrizzTex(): CanvasTexture {
  return cachedTexture('hair-frizz', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    // fine, wavy strands
    for (let i = 0; i < 280; i++) {
      const x = Math.random() * w
      const tone = 95 + Math.floor(Math.random() * 95)
      ctx.strokeStyle = `rgb(${tone},${tone},${tone})`
      ctx.lineWidth = 0.5 + Math.random() * 1.7
      ctx.beginPath()
      let y = 0
      let cx = x
      ctx.moveTo(cx, y)
      while (y < h) {
        y += 5 + Math.random() * 9
        cx = x + Math.sin(y * 0.05 + i) * (3 + Math.random() * 4)
        ctx.lineTo(cx, y)
      }
      ctx.stroke()
    }
    // darker root flecks for depth
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * w
      const tone = 35 + Math.floor(Math.random() * 45)
      ctx.strokeStyle = `rgba(${tone},${tone},${tone},0.5)`
      ctx.lineWidth = 0.5 + Math.random()
      ctx.beginPath()
      ctx.moveTo(x, Math.random() * h * 0.35)
      ctx.lineTo(x + (Math.random() - 0.5) * 4, Math.random() * h * 0.35 + h * 0.08)
      ctx.stroke()
    }
  }, 256, 256)
}

/** Faint skin micro-texture (grayscale) for subtle surface relief — kills the
 *  plastic-doll smoothness without changing the silhouette. */
export function skinReliefTex(): CanvasTexture {
  return cachedTexture('skin-relief', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = Math.random() < 0.5 ? 120 : 60
      ctx.fillStyle = `rgba(${tone},${tone},${tone},0.5)`
      ctx.fillRect(x, y, 1, 1)
    }
  }, 256, 256)
}
