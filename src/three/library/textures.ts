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

/**
 * A tall leaded-glass window in the warm, candlelit manner of a wizarding Great
 * Hall — antique diamond-quarry panes in honey/amber glass with a scatter of
 * pale cool panes (the night sky seen through the glass), each pane hand-blown
 * so it bows with a brighter centre and darker came edges, carrying faint
 * streaks, stray bubbles and a slightly different tone from its neighbour. The
 * lead cames are blackened but pick up a thin metallic sheen, with little
 * solder joints where they meet. A soft warm backlight pools behind a quiet
 * gothic quatrefoil oculus near the top. Used as BOTH colour and emissive map,
 * so the windows glow like a hall of candlelight after dark. Drawn once per
 * call; callers memoise.
 *
 * Supersampled 4× (1024×2048 effective) so the fine leading and the tiny
 * bubbles/streaks stay crisp on the tall bay panels — a one-time cost, no
 * per-frame impact.
 */
export function makeStainedGlassTexture(seed = 5): CanvasTexture {
  const W = 256
  const H = 512
  const SS = 4
  const c = document.createElement('canvas')
  c.width = W * SS
  c.height = H * SS
  const ctx = c.getContext('2d')!
  ctx.scale(SS, SS)
  const rand = rng(seed)

  // hex -> [r,g,b]
  const rgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
  }
  // rescale a hex colour's brightness (f<1 darken, >1 lighten, clamped)
  const shade = (hex: string, f: number) => {
    const [r, g, b] = rgb(hex)
    const q = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
    return `rgb(${q(r)},${q(g)},${q(b)})`
  }

  // Warm candlelit palette — HP Great Hall reads gold/amber, NOT rainbow. A few
  // pale cool panes give the night-sky-through-glass contrast. Weighted ~82%
  // warm so the wall glows honey, never purple/green/red.
  const warm = ['#efce82', '#e3b25a', '#d9a441', '#e9bd66', '#f0cf8c', '#d68f37', '#e0a64e', '#c9953f', '#e6b65c']
  const cool = ['#c4d2dc', '#aebfce', '#c2cdbf', '#b7c7d4']
  const pick = () => (rand() < 0.82 ? warm[(rand() * warm.length) | 0] : cool[(rand() * cool.length) | 0])

  // dark leaded background (the came network behind the panes)
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1c140a')
  bg.addColorStop(0.5, '#15100a')
  bg.addColorStop(1, '#0f0b06')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // diamond lattice of antique glass panes
  const cell = 40
  for (let y = -cell; y < H + cell; y += cell) {
    for (let x = -cell; x < W + cell; x += cell) {
      const cx = x + ((Math.floor(y / cell) % 2) * cell) / 2
      const base = pick()
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, y - cell * 0.5)
      ctx.lineTo(cx + cell * 0.5, y)
      ctx.lineTo(cx, y + cell * 0.5)
      ctx.lineTo(cx - cell * 0.5, y)
      ctx.closePath()
      // base glass, lightly jittered so no two panes share a tone
      const jit = 0.84 + rand() * 0.3
      ctx.fillStyle = shade(base, jit)
      ctx.fill()
      // hand-blown curvature: brighter bowed centre, darker toward the came edges
      const grad = ctx.createRadialGradient(cx, y, 1, cx, y, cell * 0.62)
      grad.addColorStop(0, 'rgba(255,244,214,0.20)')
      grad.addColorStop(0.55, 'rgba(255,236,196,0.05)')
      grad.addColorStop(1, 'rgba(18,11,4,0.34)')
      ctx.fillStyle = grad
      ctx.fill()
      // a couple of faint streaks — cylinder-blown glass grain
      const streaks = 1 + ((rand() * 2) | 0)
      for (let s = 0; s < streaks; s++) {
        ctx.strokeStyle = `rgba(255,250,230,${0.03 + rand() * 0.05})`
        ctx.lineWidth = 0.6 + rand() * 0.8
        const sx = cx + (rand() - 0.5) * cell * 0.6
        ctx.beginPath()
        ctx.moveTo(sx, y - cell * 0.46)
        ctx.lineTo(sx + (rand() - 0.5) * cell * 0.3, y + cell * 0.46)
        ctx.stroke()
      }
      // an occasional tiny bubble caught in the molten glass
      if (rand() < 0.13) {
        const bx = cx + (rand() - 0.5) * cell * 0.5
        const by = y + (rand() - 0.5) * cell * 0.5
        const br = 0.6 + rand() * 1.3
        ctx.fillStyle = 'rgba(255,255,245,0.5)'
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  // lead cames — blackened strokes with a thin warm metallic sheen on the
  // top-left (as if catching the hall's candlelight). Drawn as a helper so the
  // highlight can be a slightly offset, thinner pass.
  ctx.lineCap = 'round'
  const drawCames = (dx: number, dy: number, width: number, style: string) => {
    ctx.strokeStyle = style
    ctx.lineWidth = width
    for (let y = -cell; y < H + cell; y += cell) {
      for (let x = -cell; x < W + cell; x += cell) {
        const cx = x + ((Math.floor(y / cell) % 2) * cell) / 2
        ctx.beginPath()
        ctx.moveTo(cx + dx, y - cell * 0.5 + dy)
        ctx.lineTo(cx + cell * 0.5 + dx, y + dy)
        ctx.lineTo(cx + dx, y + cell * 0.5 + dy)
        ctx.lineTo(cx - cell * 0.5 + dx, y + dy)
        ctx.closePath()
        ctx.stroke()
      }
    }
  }
  // soft dark body of the came…
  drawCames(0, 0, 4, '#0d0904')
  // …then a bright hairline offset up-left for a hand-soldered metal glint.
  drawCames(0.8, -0.6, 1.1, 'rgba(126,100,54,0.55)')

  // solder joints where the cames cross — dark bead with a tiny warm catch-light
  for (let y = -cell; y < H + cell; y += cell) {
    for (let x = -cell; x < W + cell; x += cell) {
      const cx = x + ((Math.floor(y / cell) % 2) * cell) / 2
      ctx.fillStyle = '#080501'
      ctx.beginPath()
      ctx.arc(cx, y, 2.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(150,120,66,0.5)'
      ctx.beginPath()
      ctx.arc(cx - 0.6, y - 0.6, 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // soft candlelit backlight — the panes read as lit from behind after dark
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const glow = ctx.createRadialGradient(W / 2, H * 0.34, 8, W / 2, H * 0.34, H * 0.42)
  glow.addColorStop(0, 'rgba(255,206,130,0.16)')
  glow.addColorStop(0.5, 'rgba(255,176,96,0.07)')
  glow.addColorStop(1, 'rgba(255,150,70,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // a quiet gothic quatrefoil oculus in the came work near the top — reads as
  // HP tracery, not a logo. Double ring + four petal lobes + a warm boss.
  ctx.save()
  ctx.translate(W / 2, H * 0.34)
  ctx.strokeStyle = 'rgba(20,12,6,0.85)'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.arc(0, 0, 54, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(150,120,66,0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(-0.6, -0.6, 54, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const px = Math.cos(a) * 38
    const py = Math.sin(a) * 38
    ctx.strokeStyle = 'rgba(18,11,5,0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px, py, 14, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,222,160,0.5)'
  ctx.beginPath()
  ctx.arc(0, 0, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // gentle warm vignette so the glow pools toward the centre, corners fall away
  const vig = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.2, W / 2, H * 0.4, H * 0.62)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(10,6,2,0.42)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

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

/**
 * A multi-tongue flame texture with turbulent edges and proper color ramps.
 * Generated procedurally on a canvas. Used on an additive billboard with a
 * minimal shader that adds vertical turbulence for living movement.
 */
export function makeFlameTexture(seed = 3): CanvasTexture {
  const W = 256
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const rand = rng(seed)

  // transparent base
  ctx.clearRect(0, 0, W, H)

  // Helper: draw a single flame tongue at given x center, with given width/height
  const drawTongue = (cx: number, baseY: number, width: number, height: number, phase: number) => {
    const tipY = baseY - height
    const left = cx - width / 2
    const right = cx + width / 2
    // Build a noise-distorted flame shape
    const segments = 16
    ctx.beginPath()
    ctx.moveTo(left, baseY)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = baseY - t * height
      // noise-based horizontal offset
      const n = rand() - 0.5
      const sway = n * width * 0.3 * (1 - t * 0.5)
      const x = cx + sway + (rand() - 0.5) * width * 0.15 * (1 - t)
      if (i === 0) ctx.lineTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo(right, baseY)
    ctx.closePath()
    ctx.clip()

    // Color gradient: white-hot core → yellow → orange → red → transparent
    const grad = ctx.createLinearGradient(cx, baseY, cx, tipY)
    grad.addColorStop(0, 'rgba(255,255,255,0)')           // transparent at base
    grad.addColorStop(0.08, 'rgba(255,255,220,0.95)')    // white-hot
    grad.addColorStop(0.22, 'rgba(255,235,160,0.9)')     // bright yellow
    grad.addColorStop(0.42, 'rgba(255,190,80,0.85)')     // golden
    grad.addColorStop(0.62, 'rgba(255,130,30,0.8)')      // orange
    grad.addColorStop(0.78, 'rgba(255,60,15,0.6)')       // red-orange
    grad.addColorStop(0.92, 'rgba(180,20,10,0.25)')      // deep red
    grad.addColorStop(1, 'rgba(80,10,5,0)')               // transparent tip
    ctx.fillStyle = grad
    ctx.fillRect(left, tipY, width, height)

    // Add a hotter core stripe down the center
    ctx.beginPath()
    ctx.moveTo(cx - width * 0.12, baseY)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = baseY - t * height
      const n = rand() - 0.5
      const x = cx + n * width * 0.08 * (1 - t * 0.5)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(cx + width * 0.12, baseY)
    ctx.closePath()
    const core = ctx.createLinearGradient(cx, baseY, cx, tipY)
    core.addColorStop(0, 'rgba(255,255,255,0.5)')
    core.addColorStop(0.3, 'rgba(255,255,200,0.4)')
    core.addColorStop(0.7, 'rgba(255,200,100,0.15)')
    core.addColorStop(1, 'rgba(255,150,50,0)')
    ctx.fillStyle = core
    ctx.fill()

    ctx.restore()
  }

  // Draw 5-6 flame tongues at slightly different positions and phases
  const centers = [
    { x: W * 0.5, baseY: H * 0.92, w: W * 0.42, h: H * 0.55 },
    { x: W * 0.32, baseY: H * 0.9, w: W * 0.28, h: H * 0.48 },
    { x: W * 0.68, baseY: H * 0.9, w: W * 0.28, h: H * 0.48 },
    { x: W * 0.18, baseY: H * 0.88, w: W * 0.2, h: H * 0.35 },
    { x: W * 0.82, baseY: H * 0.88, w: W * 0.2, h: H * 0.35 },
    { x: W * 0.5, baseY: H * 0.95, w: W * 0.18, h: H * 0.25 }, // center core
  ]

  centers.forEach((t, i) => {
    // Each tongue gets its own rand sequence by re-seeding
    const tongueRand = rng(seed + i * 137)
    // swap rng temporarily
    const savedRand = ctx.rand
    ctx.rand = tongueRand
    drawTongue(t.x, t.baseY, t.w, t.h, i)
    ctx.rand = savedRand
  })

  // Add subtle glowing ember particles at the base
  ctx.fillStyle = 'rgba(255,120,30,0.4)'
  for (let i = 0; i < 30; i++) {
    const x = W * 0.25 + rand() * W * 0.5
    const y = H * 0.82 + rand() * H * 0.12
    const r = 1 + rand() * 3
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
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
