import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { departureBoard, statusLabel, type PlatformStatus } from '../../lib/train/schedule'
import { DEPARTURE_BOARD } from './layout'
import { palette } from './env'

// The great hanging departure board over the platform mouths — a brass-framed
// dark enamel sign whose rows are a genuine Solari split-flap display: a fixed
// grid of character tiles that roll forward through the glyph deck to their
// target, clattering as they settle. It reads the same deterministic schedule
// the trains and platform signage use, so the board, the countdowns and the
// train you actually see rolling in always agree.
//
// Each tick (≈1s) we recompute every row's target text from departureBoard().
// Only cells whose glyph actually changed start flapping, which means the live
// seconds digit riffles every second while a phase change (→ BOARDING) cascades
// a whole row — the brief's "pick the row that changed" falls out for free. The
// canvas is only redrawn on frames where a tile advanced, so a settled board
// costs nothing.

// ── tunables ────────────────────────────────────────────────────────────────
const FLIP_SOUND = true // tiny mechanical tick as flaps land (set false to mute)
const STEP_MS = 36 // how often each flapping tile advances one glyph
const TARGET_MS = 1000 // how often we re-read the live schedule

// Canvas matches the 22 × 4.4 board plane aspect (5.0) so tiles stay crisp.
const W = 1600
const H = 320
const MARGIN_X = 30

// The flap deck: blank, A–Z, digits, then the punctuation the board can show.
// Tiles roll the *shorter* way around this loop toward their target.
const DECK = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.→·-/%'
const DECK_INDEX = new Map<string, number>()
for (let i = 0; i < DECK.length; i++) DECK_INDEX.set(DECK[i], i)
const idxOf = (ch: string) => DECK_INDEX.get(ch.toUpperCase()) ?? 0

// ── tile layout ───────────────────────────────────────────────────────────
type FieldKey = 'plat' | 'line' | 'dest' | 'status' | 'time'
interface Field {
  key: FieldKey
  start: number // first column
  width: number
  label: string // column header
}
// Single-space gaps between fields; columns run 0..COLS-1 continuously so the
// board reads as one unbroken bank of tiles.
const FIELDS: Field[] = [
  { key: 'plat', start: 0, width: 1, label: 'P' },
  { key: 'line', start: 2, width: 14, label: 'LINE' },
  { key: 'dest', start: 17, width: 20, label: 'DESTINATION' },
  { key: 'status', start: 38, width: 10, label: 'STATUS' },
  { key: 'time', start: 49, width: 14, label: 'ETA' },
]
const COLS = 63 // last field ends at 49+14 = 63
const ROWS = 5

function statusColor(s: PlatformStatus): string {
  if (s.delayed && s.phase === 'approaching') return '#ff7a6a'
  if (s.phase === 'boarding') return '#7CFFB0'
  if (s.phase === 'approaching') return '#ffd27a'
  if (s.phase === 'departing') return '#ff9d5c'
  return '#c98a6a'
}

const fieldColor: Record<FieldKey, string> = {
  plat: '#ecc879',
  line: '#f3e2bf',
  dest: '#b59a6a',
  status: '#cfc3a6', // overridden per-row by status colour
  time: '#cfc3a6',
}

/** Place text into a fixed-width slice of a row's char array (uppercased, padded,
 *  truncated). */
function writeField(cells: string[], start: number, width: number, text: string) {
  const t = text.toUpperCase().slice(0, width)
  for (let i = 0; i < width; i++) cells[start + i] = t[i] ?? ' '
}

/** The 63-char target string + per-column colour for one platform row. */
function rowTarget(s: PlatformStatus): { chars: string[]; colors: string[] } {
  const chars = new Array<string>(COLS).fill(' ')
  const { tag, detail } = statusLabel(s)
  writeField(chars, 0, 1, String(s.line.platform))
  writeField(chars, 2, 14, s.line.name)
  writeField(chars, 17, 20, `→ ${s.line.destination}`)
  writeField(chars, 38, 10, tag)
  writeField(chars, 49, 14, detail)

  const sc = statusColor(s)
  const colors = new Array<string>(COLS).fill('#000')
  for (const f of FIELDS) {
    const c = f.key === 'status' ? sc : fieldColor[f.key]
    for (let i = 0; i < f.width; i++) colors[f.start + i] = c
  }
  return { chars, colors }
}

// ── mutable flap grid (lives outside React; driven by useFrame) ─────────────
interface Cell {
  cur: number // current deck index shown
  tgt: number // deck index it is rolling toward
}

function makeGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ cur: 0, tgt: 0 })),
  )
}

/** Advance one cell one glyph toward its target, the shorter way round the deck.
 *  Returns true if it moved. */
function stepCell(cell: Cell): boolean {
  if (cell.cur === cell.tgt) return false
  const n = DECK.length
  const fwd = (cell.tgt - cell.cur + n) % n
  cell.cur = fwd <= n - fwd ? (cell.cur + 1) % n : (cell.cur - 1 + n) % n
  return true
}

// ── flap tick: a faint mechanical click as tiles land ───────────────────────
// Uses a pre-allocated short noise-buffer click (no per-tick oscillator churn).
let flapCtx: AudioContext | null = null
let flapBus: GainNode | null = null
let flapClickBuf: AudioBuffer | null = null

function initFlapAudio() {
  if (flapCtx) return
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  flapCtx = new AC()
  flapBus = flapCtx.createGain()
  flapBus.gain.value = 0.06
  flapBus.connect(flapCtx.destination)
  // pre-allocate a tiny broadband click (3ms)
  const len = Math.ceil(flapCtx.sampleRate * 0.003)
  flapClickBuf = flapCtx.createBuffer(1, len, flapCtx.sampleRate)
  const d = flapClickBuf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.2))
}

function flapTick() {
  if (!FLIP_SOUND) return
  try {
    initFlapAudio()
    if (!flapCtx || !flapBus || !flapClickBuf) return
    if (flapCtx.state === 'suspended') void flapCtx.resume()
    const src = flapCtx.createBufferSource()
    src.buffer = flapClickBuf
    src.connect(flapBus)
    src.start(flapCtx.currentTime)
    src.stop(flapCtx.currentTime + 0.005)
  } catch {
    /* autoplay blocked or WebAudio unavailable — board still flaps silently */
  }
}

// ── canvas painter ──────────────────────────────────────────────────────────
function makePainter(ctx: CanvasRenderingContext2D, grid: Cell[][], colorsRef: { v: string[][] }) {
  const innerW = W - MARGIN_X * 2
  const tileW = innerW / COLS
  const headerH = 84
  const rowsTop = headerH
  const rowsH = H - rowsTop - 14
  const rowH = rowsH / ROWS
  const tileGap = Math.max(1, tileW * 0.06)
  const colX = (col: number) => MARGIN_X + col * tileW

  return function paint() {
    // backplate
    ctx.fillStyle = '#0c0b0a'
    ctx.fillRect(0, 0, W, H)

    // header
    ctx.fillStyle = '#e8c06a'
    ctx.font = 'bold 40px Georgia, serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('DEPARTURES', MARGIN_X, 48)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#9a8a66'
    ctx.font = '26px Georgia, serif'
    ctx.fillText('FOCUSLILY TERMINUS', W - MARGIN_X, 46)
    // column headers, aligned to their fields
    ctx.textAlign = 'left'
    ctx.fillStyle = '#6f6450'
    ctx.font = 'bold 17px "Courier New", monospace'
    for (const f of FIELDS) ctx.fillText(f.label, colX(f.start), 74)
    ctx.strokeStyle = '#2c241a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(MARGIN_X, 80)
    ctx.lineTo(W - MARGIN_X, 80)
    ctx.stroke()

    // flap tiles
    const colors = colorsRef.v
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const fontPx = Math.floor(rowH * 0.58)
    const charFont = `bold ${fontPx}px "Courier New", monospace`
    for (let r = 0; r < ROWS; r++) {
      const ty = rowsTop + r * rowH + 1
      const th = rowH - 2
      const cy = ty + th / 2
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c]
        const ch = DECK[cell.cur]
        const x = colX(c) + tileGap / 2
        const w = tileW - tileGap
        // tile body — top half a touch lighter than the bottom (the two flaps)
        ctx.fillStyle = '#15130f'
        ctx.fillRect(x, ty, w, th)
        ctx.fillStyle = '#100e0b'
        ctx.fillRect(x, ty + th / 2, w, th / 2)
        // the seam where the flaps meet
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, cy)
        ctx.lineTo(x + w, cy)
        ctx.stroke()
        if (ch !== ' ') {
          ctx.fillStyle = colors[r]?.[c] ?? '#cfc3a6'
          ctx.font = charFont
          ctx.fillText(ch, x + w / 2, cy + 1)
        }
        // a fugitive highlight on the seam while this tile is mid-roll
        if (cell.cur !== cell.tgt) {
          ctx.fillStyle = 'rgba(255,240,200,0.10)'
          ctx.fillRect(x, cy - 1, w, 2)
        }
      }
    }
  }
}

export function DepartureBoard() {
  const { tex, paint, grid, colorsRef } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const context = c.getContext('2d')!
    const texture = new CanvasTexture(c)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    const g = makeGrid()
    const colors = { v: Array.from({ length: ROWS }, () => new Array<string>(COLS).fill('#cfc3a6')) }
    return { tex: texture, paint: makePainter(context, g, colors), grid: g, colorsRef: colors }
  }, [])

  // accumulators kept in refs so they survive frames without re-rendering React
  const stepAcc = useRef(0)
  const targetAcc = useRef(TARGET_MS) // force a target read on the first frame
  const dirty = useRef(true)

  // dispose the canvas texture when the board unmounts
  useEffect(() => () => tex.dispose(), [tex])

  useFrame((_, dtSec) => {
    const dt = Math.min(dtSec, 0.1) * 1000 // ms, clamped over hitches

    // re-read the live schedule on its own cadence and retarget changed cells
    targetAcc.current += dt
    if (targetAcc.current >= TARGET_MS) {
      targetAcc.current = 0
      const rows = departureBoard()
      for (let r = 0; r < ROWS && r < rows.length; r++) {
        const { chars, colors } = rowTarget(rows[r])
        for (let c = 0; c < COLS; c++) grid[r][c].tgt = idxOf(chars[c])
        colorsRef.v[r] = colors
      }
      dirty.current = true // colours/targets changed — repaint once
    }

    // advance flapping tiles at a fixed cadence (independent of frame rate)
    stepAcc.current += dt
    let ticked = false
    while (stepAcc.current >= STEP_MS) {
      stepAcc.current -= STEP_MS
      let moved = 0
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (stepCell(grid[r][c])) moved++
      if (moved > 0) {
        dirty.current = true
        ticked = true
      }
    }
    if (ticked) flapTick()

    if (dirty.current) {
      paint()
      tex.needsUpdate = true
      dirty.current = false
    }
  })

  const [x, y, z] = DEPARTURE_BOARD.pos
  const w = DEPARTURE_BOARD.width
  const h = DEPARTURE_BOARD.height

  return (
    <group position={[x, y, z]}>
      {/* brass frame */}
      <mesh>
        <boxGeometry args={[w + 0.8, h + 0.8, 0.4]} />
        <meshStandardMaterial color={palette.brass} metalness={0.6} roughness={0.4} emissive={'#3a2808'} emissiveIntensity={0.3} />
      </mesh>
      {/* enamel face with the live split-flap schedule */}
      <mesh position={[0, 0, 0.22]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive={'#ffffff'} emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      {/* hanger chains */}
      {[-w / 2 + 1, w / 2 - 1].map((dx) => (
        <mesh key={dx} position={[dx, h / 2 + 1.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
          <meshStandardMaterial color={palette.iron} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <pointLight position={[0, 0, 3]} color={'#ffe7b0'} intensity={6} distance={18} decay={2} />
    </group>
  )
}
