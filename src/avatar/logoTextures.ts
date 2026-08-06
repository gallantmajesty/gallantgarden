// Canvas-based texture generation for clothing logos and patterns.
// Creates HTMLCanvasElement textures that map onto clothing geometry.

import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three'

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

/** Big back FocusLily logo — now just a clean empty texture (no text). */
export function focusLilyBackTex(): CanvasTexture {
  return cachedTexture('fl-back', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
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

/** Dense woolly panda-coat texture (grayscale) — many short overlapping fur
 *  strokes at slight angles plus scattered flecks, so the body/head read as
 *  soft wool instead of smooth plastic. Used as bump + roughness map. */
export function pandaFurTex(): CanvasTexture {
  return cachedTexture('panda-fur', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    // long soft strokes — the main woolly grain
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const len = 4 + Math.random() * 9
      const angle = (Math.random() - 0.5) * 1.1
      const tone = 92 + Math.floor(Math.random() * 92)
      ctx.strokeStyle = `rgba(${tone},${tone},${tone},${0.35 + Math.random() * 0.5})`
      ctx.lineWidth = 0.6 + Math.random() * 1.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(angle) * len, y + Math.cos(angle) * len)
      ctx.stroke()
    }
    // dense short curls — clump texture between strokes
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 60 + Math.floor(Math.random() * 120)
      ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.3 + Math.random() * 0.4})`
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
    // a few bright guard hairs
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 190 + Math.floor(Math.random() * 60)
      ctx.strokeStyle = `rgba(${tone},${tone},${tone},0.5)`
      ctx.lineWidth = 0.4 + Math.random() * 0.7
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 2.5, y + 4 + Math.random() * 5)
      ctx.stroke()
    }
  }, 256, 256)
}

/** Panda eye iris — soft radial gradient from a warm amber-brown centre to a
 *  deep near-black rim, so the eye pops with a gentle glow instead of looking
 *  like a flat black dot. */
export function pandaIrisTex(): CanvasTexture {
  return cachedTexture('panda-iris', (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    const grad = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.5)
    grad.addColorStop(0, '#8a5426')
    grad.addColorStop(0.45, '#5f3517')
    grad.addColorStop(0.8, '#2c1709')
    grad.addColorStop(1, '#140b04')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }, 128, 128)
}

/** Coarse golden-sand grain (grayscale bump map) — dense irregular flecks so
 *  hourglass sand reads as granular instead of smooth clay. */
/** Short soft monkey-coat fur (grayscale bump map) — dense fine strokes so the
 *  monkey's head/body read as soft fur instead of smooth plastic. */
export function monkeyFurTex(): CanvasTexture {
  return cachedTexture('monkey-fur', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    // fine short undercoat strokes
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const len = 2 + Math.random() * 4
      const angle = (Math.random() - 0.5) * 1.2
      const tone = 92 + Math.floor(Math.random() * 88)
      ctx.strokeStyle = `rgba(${tone},${tone},${tone},${0.3 + Math.random() * 0.5})`
      ctx.lineWidth = 0.5 + Math.random() * 1.1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(angle) * len, y + Math.cos(angle) * len)
      ctx.stroke()
    }
    // dense short flecks — soft clump texture between strokes
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 70 + Math.floor(Math.random() * 110)
      ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.3 + Math.random() * 0.4})`
      ctx.fillRect(x, y, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6)
    }
    // a few brighter guard hairs for depth
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 185 + Math.floor(Math.random() * 65)
      ctx.strokeStyle = `rgba(${tone},${tone},${tone},0.5)`
      ctx.lineWidth = 0.4 + Math.random() * 0.7
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 2.5, y + 3 + Math.random() * 4)
      ctx.stroke()
    }
  }, 256, 256)
}

/** Monkey eye iris — warm amber-brown radial gradient (golden centre fading to a
 *  deep umber rim) so the eye glows warmly instead of reading as a flat dot. */
export function monkeyIrisTex(): CanvasTexture {
  return cachedTexture('monkey-iris', (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    const grad = ctx.createRadialGradient(cx, cy, w * 0.02, cx, cy, w * 0.5)
    grad.addColorStop(0, '#b5762e')
    grad.addColorStop(0.4, '#8a4f1c')
    grad.addColorStop(0.75, '#4a2409')
    grad.addColorStop(1, '#1f0d02')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, w * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }, 128, 128)
}

export function sandGrainTex(): CanvasTexture {
  return cachedTexture('sand-grain', (ctx, w, h) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2800; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      const tone = 90 + Math.floor(Math.random() * 110)
      ctx.fillStyle = `rgba(${tone},${tone},${tone},${0.35 + Math.random() * 0.55})`
      ctx.fillRect(x, y, 1.2 + Math.random() * 1.8, 1.2 + Math.random() * 1.8)
    }
  }, 128, 128)
}

/** iPhone-style home screen wallpaper (portrait): vertical blue-purple gradient
 *  with soft depth-effect blobs, a status bar (9:41, signal, 5G, wifi, battery
 *  87%), a 4×6 grid of rounded app icons and a translucent dock with 4 pinned
 *  apps. Drawn at screen resolution so the phone reads as a real lit display. */
export function phoneHomeScreenTex(): CanvasTexture {
  return cachedTexture('phone-home-screen', (ctx, w, h) => {
    // wallpaper gradient #1a1a2e → #16213e
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#1a1a2e')
    g.addColorStop(1, '#16213e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // soft depth-effect blobs
    const blob = (x: number, y: number, r: number, c: string) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
      rg.addColorStop(0, c)
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rg
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    blob(w * 0.72, h * 0.28, w * 0.55, 'rgba(88,101,242,0.30)')
    blob(w * 0.22, h * 0.55, w * 0.42, 'rgba(56,189,248,0.20)')
    blob(w * 0.6, h * 0.85, w * 0.5, 'rgba(168,85,247,0.18)')
    blob(w * 0.4, h * 0.12, w * 0.35, 'rgba(129,140,248,0.22)')

    // status bar (white, clear of the Dynamic Island at x 0.30–0.70)
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${h * 0.035}px "Segoe UI", Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('9:41', w * 0.075, h * 0.038)
    // signal bars
    for (let i = 0; i < 4; i++) {
      const bh = 6 + i * 4.5
      ctx.fillRect(w * 0.707 + i * 7.5, h * 0.045 - bh, 4.5, bh)
    }
    // 5G
    ctx.font = `600 ${h * 0.022}px "Segoe UI", Arial, sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText('5G', w * 0.845, h * 0.042)
    // wifi arcs + dot
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    for (const r of [6, 10.5, 15]) {
      ctx.beginPath()
      ctx.arc(w * 0.787, h * 0.05, r, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    }
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(w * 0.787, h * 0.05, 2, 0, Math.PI * 2)
    ctx.fill()
    // battery pill (87% fill)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 2
    const bx = w * 0.875, by = h * 0.031, bw = 44, bh2 = 20
    ctx.beginPath()
    ctx.rect(bx, by, bw, bh2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(bx + 44, by + 6.5, 3.5, 7)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(bx + 2.5, by + 2.5, (bw - 5) * 0.87, bh2 - 5)

    // rounded-rect path helper
    const rr = (x: number, y: number, rw: number, rh: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + rw, y, x + rw, y + rh, r)
      ctx.arcTo(x + rw, y + rh, x, y + rh, r)
      ctx.arcTo(x, y + rh, x, y, r)
      ctx.arcTo(x, y, x + rw, y, r)
      ctx.closePath()
    }

    // ── iOS-style widgets row (weather + music) — kills the "keypad" look ──
    const widgetY = h * 0.135
    const widgetH = h * 0.088
    const widgetGap = w * 0.04
    const widgetW = (w - w * 0.12 - widgetGap) / 2
    const wx = w * 0.06
    // weather card
    let wg = ctx.createLinearGradient(wx, widgetY, wx + widgetW, widgetY + widgetH)
    wg.addColorStop(0, '#2f7de1')
    wg.addColorStop(1, '#55b0f5')
    ctx.fillStyle = wg
    rr(wx, widgetY, widgetW, widgetH, 24)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `bold ${widgetH * 0.4}px "Segoe UI", Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('72°', wx + widgetW * 0.12, widgetY + widgetH * 0.42)
    ctx.font = `600 ${widgetH * 0.19}px "Segoe UI", Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillText('Sunny', wx + widgetW * 0.12, widgetY + widgetH * 0.66)
    ctx.font = `${widgetH * 0.44}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText('☀️', wx + widgetW - widgetW * 0.1, widgetY + widgetH * 0.48)
    // music card
    const mx = wx + widgetW + widgetGap
    ctx.fillStyle = '#1d1d1f'
    rr(mx, widgetY, widgetW, widgetH, 24)
    ctx.fill()
    // album art circle
    ctx.fillStyle = '#5856d6'
    ctx.beginPath()
    ctx.arc(mx + widgetW * 0.16, widgetY + widgetH * 0.5, widgetH * 0.26, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `${widgetH * 0.26}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('🎧', mx + widgetW * 0.16, widgetY + widgetH * 0.55)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.font = `600 ${widgetH * 0.17}px "Segoe UI", Arial, sans-serif`
    ctx.fillText('Focus Flow', mx + widgetW * 0.3, widgetY + widgetH * 0.42)
    ctx.font = `600 ${widgetH * 0.14}px "Segoe UI", Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('Study Beats', mx + widgetW * 0.3, widgetY + widgetH * 0.6)
    // play button triangle
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.moveTo(mx + widgetW * 0.88, widgetY + widgetH * 0.62)
    ctx.lineTo(mx + widgetW * 0.88 + widgetH * 0.1, widgetY + widgetH * 0.5)
    ctx.lineTo(mx + widgetW * 0.88, widgetY + widgetH * 0.38)
    ctx.closePath()
    ctx.fill()

    // 4×5 home-screen app grid (iOS rounded-square tiles + emoji glyphs)
    const GRID: Array<[string, string]> = [
      ['📞', '#34c759'], ['✉️', '#007aff'], ['⛅', '#4aa8ff'], ['📅', '#ff3b30'],
      ['📷', '#8e8e93'], ['🎵', '#fa2d48'], ['🗺️', '#007aff'], ['💬', '#34c759'],
      ['⏰', '#2c2c2e'], ['⚙️', '#6e6e73'], ['🗒️', '#ffcc00'], ['📚', '#007aff'],
      ['📈', '#34c759'], ['🎧', '#af52de'], ['📺', '#1c1c1e'], ['❤️', '#ff3b30'],
      ['🏠', '#f2f2f7'], ['🧭', '#0a84ff'], ['🎨', '#ff9f0a'], ['🎮', '#1c1c1e'],
    ]
    ctx.textAlign = 'center'
    const iw = 84, gap = 24, rowGap = 20
    const x0 = (w - (iw * 4 + gap * 3)) / 2
    const firstY = h * 0.27
    GRID.forEach(([glyph, color], i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const cx = x0 + col * (iw + gap) + iw / 2
      const cy = firstY + row * (iw + rowGap) + iw / 2
      rr(cx - iw / 2, cy - iw / 2, iw, iw, 24)
      ctx.fillStyle = color
      ctx.fill()
      const hg = ctx.createLinearGradient(0, cy - iw / 2, 0, cy - iw / 2 + iw * 0.5)
      hg.addColorStop(0, 'rgba(255,255,255,0.16)')
      hg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = hg
      ctx.fill()
      ctx.font = `42px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.fillText(glyph, cx, cy + 2)
    })

    // page dots under the grid
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.arc(w / 2 - 30 + i * 20, h * 0.80, 3, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
      ctx.fill()
    }

    // dock — translucent rounded bar + 4 pinned apps (safari, messages, phone, music)
    rr(x0, h * 0.86, w - x0 * 2, h * 0.1, 28)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    ctx.fill()
    const DOCK: Array<[string, string]> = [
      ['🧭', '#0a84ff'], ['💬', '#34c759'], ['📞', '#34c759'], ['🎵', '#fa2d48'],
    ]
    const dw = 78, dgap = 24
    const dx0 = (w - (dw * 4 + dgap * 3)) / 2
    DOCK.forEach(([glyph, color], i) => {
      const cx = dx0 + i * (dw + dgap) + dw / 2
      const cy = h * 0.91
      rr(cx - dw / 2, cy - dw / 2, dw, dw, 22)
      ctx.fillStyle = color
      ctx.fill()
      ctx.font = `40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.fillText(glyph, cx, cy + 2)
    })

    // home indicator pill
    rr(w / 2 - 48, h * 0.975, 96, 7, 3.5)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fill()
  }, 512, 1024)
}

/** Polished silver "apple" back logo on transparent — body + bite + leaf, drawn
 *  with a smooth squircle-ish silhouette so it reads as the real thing at phone
 *  scale. Used on the back panel of the phone accessory. */
export function appleBackLogoTex(): CanvasTexture {
  return cachedTexture('apple-back-logo', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const cx = w / 2
    ctx.fillStyle = 'rgba(226,226,232,0.92)'
    // apple body — two overlapping rounded lobes with a bite cut on the right
    ctx.beginPath()
    ctx.arc(cx - 8, h * 0.46, w * 0.17, 0, Math.PI * 2)
    ctx.arc(cx + 10, h * 0.56, w * 0.19, 0, Math.PI * 2)
    ctx.arc(cx + 26, h * 0.30, w * 0.16, 0, Math.PI * 2) // bite (overlap punch)
    ctx.fill('evenodd')
    // leaf
    ctx.fillStyle = 'rgba(226,226,232,0.92)'
    ctx.beginPath()
    ctx.ellipse(cx - 4, h * 0.24, w * 0.075, w * 0.04, -0.6, 0, Math.PI * 2)
    ctx.fill()
    // stem
    ctx.strokeStyle = 'rgba(226,226,232,0.92)'
    ctx.lineWidth = w * 0.035
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx + 6, h * 0.24)
    ctx.quadraticCurveTo(cx + 10, h * 0.15, cx + 2, h * 0.08)
    ctx.stroke()
  }, 128, 128)
}
