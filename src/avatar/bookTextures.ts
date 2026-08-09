// Procedural PBR texture + geometry helpers for the "open book" accessory and the
// presentation table. Everything is drawn into cached canvases so we never ship
// an external asset. Two goals: (1) a real open book that reads as worn leather +
// gilt metal + stacked paper, (2) a wood table with normal/roughness detail so the
// dark studio stage looks like a photographed object, not a void.
import {
  CanvasTexture,
  LinearFilter,
  RepeatWrapping,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  type Texture,
  type CanvasTexture as CT,
} from 'three'

const TEX: Record<string, CT> = {}

function make(size = 256): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

// Deterministic-ish PRNG so a texture is identical every call.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convert a height canvas (white = high, black = low) into a tangent-space normal
// map + a roughness map. Height is also returned so a call can build matching
// colour/height in one pass.
function heightToNormal(height: HTMLCanvasElement, strength = 1.4, roughMax = 1, roughMin = 0.45): { normal: CT; rough: CT } {
  const w = height.width
  const h = height.height
  const hd = height.getContext('2d')!.getImageData(0, 0, w, h).data
  const lum = (x: number, y: number) => {
    const xx = (x + w) % w
    const yy = (y + h) % h
    const i = (yy * w + xx) * 4
    return hd[i] / 255
  }
  const nC = make(w)
  const rC = make(w)
  const nd = nC.ctx.createImageData(w, h)
  const rd = rC.ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = lum(x - 1, y)
      const r = lum(x + 1, y)
      const u = lum(x, y - 1)
      const d = lum(x, y + 1)
      const dx = (l - r) * strength
      const dy = (u - d) * strength
      const len = Math.hypot(dx, dy, 1)
      const nx = dx / len
      const ny = dy / len
      const nz = 1 / len
      const i = (y * w + x) * 4
      nd.data[i] = (nx * 0.5 + 0.5) * 255
      nd.data[i + 1] = (ny * 0.5 + 0.5) * 255
      nd.data[i + 2] = (nz * 0.5 + 0.5) * 255
      nd.data[i + 3] = 255
      // roughness: lower where the surface is "high/compressed", higher in recesses
      const hv = lum(x, y)
      const rv = roughMax - hv * (roughMax - roughMin)
      const rv8 = rv * 255
      rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = rv8
      rd.data[i + 3] = 255
    }
  }
  nC.ctx.putImageData(nd, 0, 0)
  rC.ctx.putImageData(rd, 0, 0)
  const normal = new CanvasTexture(nC.c)
  normal.wrapS = normal.wrapT = RepeatWrapping
  const rough = new CanvasTexture(rC.c)
  rough.wrapS = rough.wrapT = RepeatWrapping
  return { normal, rough }
}

function finish(c: HTMLCanvasElement, srgb = true): CT {
  const t = new CanvasTexture(c)
  t.magFilter = LinearFilter
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.wrapS = t.wrapT = ClampToEdgeWrapping
  if (srgb) t.colorSpace = SRGBColorSpace
  return t
}
function tiling(c: HTMLCanvasElement, srgb = true): CT {
  const t = finish(c, srgb)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/* ----------------------------------------------------------------- CACHED GETTERS */

// Bespoke leather board: pebbled grain, broken-in creases, scuffed lighter spine
// ridges and worn corners. Height canvas drives the normal + roughness maps.
let _leather: { map: CT; normal: CT; rough: CT } | null = null
export function leatherBoard() {
  if (_leather) return _leather
  const S = 512
  const { c, ctx } = make(S)
  const h = make(S)
  const hx = h.ctx
  const hb = rng(77)
  // base
  ctx.fillStyle = '#e9e2d4'
  ctx.fillRect(0, 0, S, S)
  hx.fillStyle = '#808080'
  hx.fillRect(0, 0, S, S)
  // pebble grain
  for (let i = 0; i < 2600; i++) {
    const x = hb() * S
    const y = hb() * S
    const r = 1 + hb() * 3
    const dark = hb() > 0.5
    ctx.fillStyle = dark ? `rgba(70,52,32,${0.05 + hb() * 0.1})` : `rgba(255,250,238,${0.05 + hb() * 0.12})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    hx.fillStyle = dark ? 'rgba(40,40,40,0.5)' : 'rgba(220,220,220,0.5)'
    hx.beginPath()
    hx.arc(x, y, r, 0, Math.PI * 2)
    hx.fill()
  }
  // broken creases
  for (let i = 0; i < 14; i++) {
    const x = hb() * S
    const y = hb() * S
    ctx.strokeStyle = `rgba(60,42,22,${0.06 + hb() * 0.08})`
    hx.strokeStyle = 'rgba(20,20,20,0.55)'
    ctx.lineWidth = hx.lineWidth = 0.8 + hb()
    ctx.beginPath()
    hx.beginPath()
    ctx.moveTo(x, y)
    hx.moveTo(x, y)
    for (let s = 0; s < 6; s++) {
      const nx = x + (hb() - 0.5) * S * 0.4
      const ny = y + (hb() - 0.5) * S * 0.4
      ctx.lineTo(nx, ny)
      hx.lineTo(nx, ny)
    }
    ctx.stroke()
    hx.stroke()
  }
  // worn lighter corners + edges
  const edge = (cx: number, cy: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.22)
    g.addColorStop(0, 'rgba(214,202,178,0.5)')
    g.addColorStop(1, 'rgba(214,202,178,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    const hg = hx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.22)
    hg.addColorStop(0, 'rgba(225,225,225,0.5)')
    hg.addColorStop(1, 'rgba(225,225,225,0)')
    hx.fillStyle = hg
    hx.fillRect(0, 0, S, S)
  }
  edge(0, 0)
  edge(S, 0)
  edge(0, S)
  edge(S, S)
  edge(S / 2, 0)
  edge(S / 2, S)
  // fine scratches
  for (let i = 0; i < 40; i++) {
    const x = hb() * S
    const y = hb() * S
    ctx.strokeStyle = `rgba(120,96,60,0.05)`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (hb() - 0.5) * 30, y + (hb() - 0.5) * 30)
    ctx.stroke()
  }
  const { normal, rough } = heightToNormal(h.c, 1.5, 0.95, 0.5)
  _leather = { map: finish(c), normal, rough }
  return _leather
}

// Stacked-paper fore-edge: thin horizontal sheet lines with wavy alignment.
let _fore: { map: CT; normal: CT } | null = null
export function foreEdge() {
  if (_fore) return _fore
  const S = 256
  const { c, ctx } = make(S)
  const h = make(S)
  ctx.fillStyle = '#efe6cf'
  ctx.fillRect(0, 0, S, S)
  h.ctx.fillStyle = '#808080'
  h.ctx.fillRect(0, 0, S, S)
  const r = rng(21)
  for (let i = 0; i < 100; i++) {
    const y = (i / 100) * S + (r() - 0.5) * 2
    const shade = 150 + r() * 90
    ctx.strokeStyle = `rgba(${shade * 0.62},${shade * 0.52},${shade * 0.4},0.55)`
    h.ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.7)`
    ctx.lineWidth = h.ctx.lineWidth = 0.6
    ctx.beginPath()
    h.ctx.beginPath()
    for (let x = 0; x <= S; x += 8) {
      const yy = y + Math.sin(x * 0.08 + i) * 1.6 + (r() - 0.5)
      ctx.lineTo(x, yy)
      h.ctx.lineTo(x, yy)
    }
    ctx.stroke()
    h.ctx.stroke()
  }
  // a few foxing specks
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(150,110,60,${0.06 + r() * 0.12})`
    ctx.fillRect(r() * S, r() * S, 1.5, 1.5)
  }
  const { normal } = heightToNormal(h.c, 0.8, 1, 0.6)
  _fore = { map: tiling(c), normal }
  return _fore
}

// Brushed gold: fine radial brushing + a couple of dings. Used as map+normal+rough.
let _gold: { map: CT; normal: CT; rough: CT } | null = null
export function brushedGold() {
  if (_gold) return _gold
  const S = 128
  const { c, ctx } = make(S)
  const h = make(S)
  ctx.fillStyle = '#c9a24a'
  ctx.fillRect(0, 0, S, S)
  h.ctx.fillStyle = '#808080'
  h.ctx.fillRect(0, 0, S, S)
  const r = rng(53)
  for (let i = 0; i < 900; i++) {
    const y = r() * S
    const x = r() * S
    const len = 6 + r() * 30
    const dark = r() > 0.5
    ctx.strokeStyle = dark ? `rgba(120,90,30,${0.06 + r() * 0.12})` : `rgba(255,228,150,${0.08 + r() * 0.14})`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (r() - 0.5) * 1.5)
    ctx.stroke()
    h.ctx.strokeStyle = dark ? 'rgba(40,40,40,0.5)' : 'rgba(255,255,255,0.6)'
    h.ctx.lineWidth = 0.5
    h.ctx.beginPath()
    h.ctx.moveTo(x, y)
    h.ctx.lineTo(x + len, y + (r() - 0.5) * 1.5)
    h.ctx.stroke()
  }
  const { normal, rough } = heightToNormal(h.c, 0.7, 0.5, 0.18)
  _gold = { map: tiling(c), normal, rough }
  return _gold
}

// Open-page printed spread. A real chapter of text + heading + drop-cap + a small
// framed diagram + page number, with a gutter/fore-edge shade baked into the art
// so the page reads as curved. Canvas Y is flipped at draw time so content is
// right-way-up when the texture is applied (flipY default).
const PAGE_W = 768
const PAGE_H = 1152
function drawPage(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  // paper
  const g = ctx.createLinearGradient(0, 0, 0, PAGE_H)
  g.addColorStop(0, '#f7efd9')
  g.addColorStop(1, '#efe3c4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  // foxing + fibre
  const r = rng(side === 'left' ? 11 : 23)
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(150,110,55,${r() * 0.05})`
    ctx.fillRect(r() * PAGE_W, r() * PAGE_H, 1.2, 1.2)
  }
  for (let i = 0; i < 5; i++) {
    const x = r() * PAGE_W
    const y = r() * PAGE_H
    const rr = 6 + r() * 22
    ctx.strokeStyle = `rgba(120,85,40,0.05)`
    for (let k = rr; k > 0; k -= 2) {
      ctx.beginPath()
      ctx.ellipse(x, y, k, k * 1.3, r() * Math.PI, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  // shade: darker near gutter (x small) and a cool bloom near fore-edge (x large)
  const shade = ctx.createLinearGradient(0, 0, PAGE_W, 0)
  shade.addColorStop(0, 'rgba(60,40,15,0.30)')
  shade.addColorStop(0.12, 'rgba(60,40,15,0.05)')
  shade.addColorStop(0.5, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(120,90,40,0.10)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)

  ctx.textBaseline = 'alphabetic'
  const ink = '#33271a'
  ctx.fillStyle = ink

  const M = 78 // outer margin
  const colW = PAGE_W - M * 2
  const lineH = 30
  const para = (text: string, x: number, y0: number, w: number) => {
    const chars = text.split('')
    let line = ''
    let y = y0
    const words = text.split(' ')
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (ctx.measureText(test).width > w && line) {
        ctx.fillText(line, x, y)
        line = word
        y += lineH
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line, x, y)
    return y
  }

  if (side === 'right') {
    ctx.font = 'bold 40px Georgia, "Times New Roman", serif'
    ctx.fillText('CHAPTER II', M, 150)
    ctx.font = 'bold 30px Georgia, serif'
    ctx.fillText('On the Architecture of Memory', M, 195)
    ctx.strokeStyle = 'rgba(80,55,25,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(M, 215)
    ctx.lineTo(M + colW, 215)
    ctx.stroke()
    const body =
      'The mind, when set before a page, builds a quiet architecture of its own. Each reading lays a stone, and the stones, though they seem to scatter, are in truth bound by a mortar of attention that no idleness can dissolve.'
    const end = para(body, M, 270, colW)
    const body2 =
      'We study not to fill a vessel, but to light a lamp; and the lamp, once kindled, throws its gentle circle of light upon the next thing that asks to be learned.'
    para(body2, M, end + 26, colW)
  } else {
    ctx.font = '26px Georgia, serif'
    const body =
      'Consider the library at evening, when the long windows are dim and the candles make small islands of gold upon the desks. There is a hush that is not silence but concentration made audible.'
    const end = para(body, M, 200, colW)
    const body2 =
      'To sit within it is to be reminded that knowledge is a shared hearth, and that every scholar who came before has left a little warmth for the one who comes after.'
    para(body2, M, end + 26, colW)
  }

  // drop cap on the right page
  if (side === 'right') {
    ctx.font = 'bold 120px Georgia, serif'
    ctx.fillStyle = '#7a3b22'
    ctx.fillText('T', M, 360)
  }

  // small framed diagram / margin note
  const dx = M + colW - 150
  const dy = 470
  ctx.strokeStyle = 'rgba(80,55,25,0.7)'
  ctx.lineWidth = 2
  ctx.strokeRect(dx, dy, 150, 110)
  ctx.fillStyle = 'rgba(120,90,40,0.6)'
  ctx.beginPath()
  ctx.moveTo(dx + 20, dy + 90)
  ctx.lineTo(dx + 60, dy + 30)
  ctx.lineTo(dx + 100, dy + 70)
  ctx.lineTo(dx + 130, dy + 20)
  ctx.strokeStyle = 'rgba(90,60,25,0.8)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // page number
  ctx.fillStyle = 'rgba(70,50,25,0.8)'
  ctx.font = 'italic 24px Georgia, serif'
  ctx.fillText(side === 'left' ? '— 41 —' : '42 —', PAGE_W / 2, PAGE_H - 50)
}

const _pageL: CT | null = null
const _pageR: CT | null = null
export function pageTex(side: 'left' | 'right'): CT {
  const key = side === 'left' ? 'book-page-l' : 'book-page-r'
  if (TEX[key]) return TEX[key]
  const { c, ctx } = make(PAGE_H)
  c.width = PAGE_W
  c.height = PAGE_H
  // flip so text is upright under flipY
  ctx.translate(0, PAGE_H)
  ctx.scale(1, -1)
  drawPage(ctx, side)
  TEX[key] = finish(c)
  return TEX[key]
}

// thin tiling paper-fibre normal for the page faces
let _fibre: CT | null = null
export function paperFibre(): CT {
  if (_fibre) return _fibre
  const S = 256
  const { c, ctx } = make(S)
  const h = make(S)
  ctx.fillStyle = '#9b9b9b'
  ctx.fillRect(0, 0, S, S)
  h.ctx.fillStyle = '#808080'
  h.ctx.fillRect(0, 0, S, S)
  const r = rng(91)
  for (let i = 0; i < 2000; i++) {
    const x = r() * S
    const y = r() * S
    const len = 2 + r() * 6
    ctx.strokeStyle = `rgba(150,150,150,0.6)`
    h.ctx.strokeStyle = `rgba(${120 + r() * 100},${120 + r() * 100},${120 + r() * 100},0.6)`
    ctx.lineWidth = h.ctx.lineWidth = 0.6
    ctx.beginPath()
    h.ctx.beginPath()
    ctx.moveTo(x, y)
    h.ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (r() - 0.5) * 2)
    h.ctx.lineTo(x + len, y + (r() - 0.5) * 2)
    ctx.stroke()
    h.ctx.stroke()
  }
  heightToNormal(h.c, 0.5, 1, 0.7)
  _fibre = tiling(h.c, false)
  return _fibre
}

// marbled endpaper
let _marble: CT | null = null
export function marbledPaper(): CT {
  if (_marble) return _marble
  const S = 256
  const { c, ctx } = make(S)
  // dark teal base
  const g = ctx.createLinearGradient(0, 0, S, S)
  g.addColorStop(0, '#1f3b3a')
  g.addColorStop(1, '#16302f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const r = rng(64)
  for (let i = 0; i < 18; i++) {
    const x = r() * S
    const y = r() * S
    ctx.strokeStyle = `rgba(${200 + r() * 40},${170 + r() * 40},${90 + r() * 40},0.5)`
    ctx.lineWidth = 1.5 + r() * 3
    ctx.beginPath()
    for (let s = 0; s < 30; s++) {
      const xx = x + s * 4 + Math.sin(s * 0.5 + i) * 10
      const yy = y + Math.cos(s * 0.3 + i) * 22
      s === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy)
    }
    ctx.stroke()
  }
  for (let i = 0; i < 6; i++) {
    const x = r() * S
    const y = r() * S
    ctx.strokeStyle = `rgba(244,230,190,0.4)`
    ctx.lineWidth = 1 + r() * 2
    ctx.beginPath()
    for (let s = 0; s < 20; s++) {
      const xx = x + s * 5 + Math.sin(s * 0.7 + i) * 8
      const yy = y + Math.cos(s * 0.4 + i) * 16
      s === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy)
    }
    ctx.stroke()
  }
  _marble = finish(c)
  return _marble
}

// striped headband ribbon
let _band: CT | null = null
export function headBand(): CT {
  if (_band) return _band
  const S = 64
  const { c, ctx } = make(S)
  ctx.fillStyle = '#7a2e22'
  ctx.fillRect(0, 0, S, S)
  for (let x = 0; x < S; x += 6) {
    ctx.fillStyle = x % 12 === 0 ? '#e8d28a' : '#2a3b6e'
    ctx.fillRect(x, 0, 3, S)
  }
  _band = tiling(c)
  return _band
}

// dust/scuff decals for the table
let _dust: CT[] = []
export function dustDecals(): CT[] {
  if (_dust.length) return _dust
  for (let k = 0; k < 5; k++) {
    const S = 128
    const { c, ctx } = make(S)
    const r = rng(100 + k)
    const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(255,245,225,0.18)')
    g.addColorStop(0.6, 'rgba(255,240,215,0.05)')
    g.addColorStop(1, 'rgba(255,240,215,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,245,220,${r() * 0.06})`
      ctx.beginPath()
      ctx.arc(r() * S, r() * S, r() * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    _dust.push(tiling(c))
  }
  return _dust
}

/* ----------------------------------------------------------------- WOOD (oak table) */

// Oak plank grain: long vertical-ish grain, a few knots, plank seams. Height drives
// the normal map so the surface catches light like real sawn timber.
let _wood: { map: CT; normal: CT; rough: CT } | null = null
export function oakWood() {
  if (_wood) return _wood
  const S = 512
  const { c, ctx } = make(S)
  const h = make(S)
  const hx = h.ctx
  const r = rng(901)
  const plankN = 5
  const pw = S / plankN
  ctx.fillStyle = '#c79a63'
  ctx.fillRect(0, 0, S, S)
  hx.fillStyle = '#808080'
  hx.fillRect(0, 0, S, S)
  // per-plank base tone + grain
  for (let p = 0; p < plankN; p++) {
    const px = p * pw
    const tone = 12 - r() * 22
    ctx.fillStyle = `rgba(${90 + tone},${60 + tone},${30 + tone},0.5)`
    ctx.fillRect(px, 0, pw, S)
    hx.fillStyle = `rgba(${120 + tone * 2},${120 + tone * 2},${120 + tone * 2},0.5)`
    hx.fillRect(px, 0, pw, S)
    // grain lines
    for (let i = 0; i < 60; i++) {
      const x = px + r() * pw
      const wob = (xx: number) => Math.sin(xx * 0.02 + i) * 6 + Math.sin(xx * 0.06 + p) * 3
      ctx.strokeStyle = `rgba(70,42,18,${0.05 + r() * 0.14})`
      hx.strokeStyle = 'rgba(40,40,40,0.5)'
      ctx.lineWidth = hx.lineWidth = 0.5 + r() * 1.6
      ctx.beginPath()
      hx.beginPath()
      ctx.moveTo(x, 0)
      hx.moveTo(x, 0)
      for (let y = 0; y <= S; y += 6) {
        ctx.lineTo(x + wob(y), y)
        hx.lineWidth = hx.lineWidth
        hx.lineTo(x + wob(y), y)
      }
      ctx.stroke()
      hx.stroke()
    }
    // plank seam (dark groove)
    ctx.fillStyle = 'rgba(40,24,10,0.35)'
    hx.fillStyle = 'rgba(20,20,20,0.7)'
    ctx.fillRect(px, 0, 2, S)
    hx.fillRect(px, 0, 2, S)
  }
  // knots
  for (let i = 0; i < 4; i++) {
    const kx = r() * S
    const ky = r() * S
    const kr = 6 + r() * 12
    const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr)
    kg.addColorStop(0, 'rgba(50,30,12,0.6)')
    kg.addColorStop(1, 'rgba(50,30,12,0)')
    ctx.fillStyle = kg
    ctx.beginPath()
    ctx.arc(kx, ky, kr, 0, Math.PI * 2)
    ctx.fill()
    const hg = hx.createRadialGradient(kx, ky, 0, kx, ky, kr)
    hg.addColorStop(0, 'rgba(30,30,30,0.7)')
    hg.addColorStop(1, 'rgba(30,30,30,0)')
    hx.fillStyle = hg
    hx.beginPath()
    hx.arc(kx, ky, kr, 0, Math.PI * 2)
    hx.fill()
  }
  // fine scratches
  for (let i = 0; i < 120; i++) {
    const x = r() * S
    const y = r() * S
    ctx.strokeStyle = `rgba(255,240,210,0.04)`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40)
    ctx.stroke()
  }
  const { normal, rough } = heightToNormal(h.c, 1.1, 0.9, 0.55)
  _wood = { map: tiling(c), normal, rough }
  return _wood
}

// soft rounded contact-shadow alpha (used as a decal under the accessory)
let _contact: CT | null = null
export function contactShadowTex(): CT {
  if (_contact) return _contact
  const S = 256
  const { c, ctx } = make(S)
  const g = ctx.createRadialGradient(S / 2, S / 2, 6, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(20,12,4,0.55)')
  g.addColorStop(0.55, 'rgba(20,12,4,0.28)')
  g.addColorStop(1, 'rgba(20,12,4,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  // round the blob: punch a soft rounded-rect mask
  _contact = finish(c, false)
  return _contact
}
