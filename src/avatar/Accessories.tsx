// @ts-nocheck
// 3D accessory props for the avatar's desk / the studio dining table. Each
// AccessoryModel is a small, detailed procedural object (no GLB assets) that
// reads as a real item. BigDiningTable is the circular studio table used in the
// Avatar Creator's Accessories step — the single chosen accessory sits on top.
// AccessoryTray is the little desk that travels with the avatar (library hall).
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { DoubleSide, MeshStandardMaterial, SRGBColorSpace } from 'three'
import {
  type Color,
  boxGeo,
  circleGeo,
  coneGeo,
  glowMaterial,
  latheGeo,
  sphereGeo,
  taperGeo,
  torusGeo,
  sharedMaterial,
  texturedMaterial,
} from './config'
import { ACCESSORIES, type AccessoryId } from './config'
import { phoneHomeScreenTex, sandGrainTex } from './logoTextures'

const m = (hex: string, rough = 0.6, metal = 0) => sharedMaterial(hex, rough, metal)

// Warm, tactile material: procedural texture (wood/ceramic/leather/paper) tinted
// by a coffee-toned hex so everything reads as a real, cozy study object.
const tm = (
  hex: string,
  rough = 0.85,
  metal = 0,
  kind: 'wood' | 'ceramic' | 'leather' | 'paper' = 'wood',
  rx = 1,
  ry = 1,
) => texturedMaterial(hex, kind, rough, metal, rx, ry)

// Warm "coffee glow" palette — replaces the old rainbow RGB so the gaming laptop
// reads as a cozy amber-lit machine rather than a sci-fi neon slab.
const WARM_GLOW = ['#7a4a2b', '#a06a3a', '#c9924a', '#e0b878', '#9a6a3f', '#5b3a22']

function makeRgbGamingPalette() {
  const idx = Math.floor(Date.now() / 1000) % WARM_GLOW.length
  const base = WARM_GLOW[idx]
  const compliment = WARM_GLOW[(idx + 3) % WARM_GLOW.length]
  return {
    base,
    compliment,
    glowSoft: m(base, 0.5, 0.1),
    glowMid: m(base, 0.4, 0.2),
    glowHard: m(base, 0.35, 0.2),
    glowUltra: m(base, 0.3, 0.15),
    complimentGlowSoft: m(compliment, 0.5, 0.1),
    complimentGlowMid: m(compliment, 0.4, 0.2),
    rgb: WARM_GLOW,
  }
}

function BalloonProp() {
  const ref = useRef<any>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = 0.25 + Math.sin(t * 2) * 0.06
    ref.current.rotation.z = Math.sin(t * 1.5) * 0.12
    ref.current.rotation.x = Math.cos(t * 1.2) * 0.08
  })
  return (
    <group ref={ref}>
      {/* String */}
      <mesh geometry={boxGeo(0.003, 0.35, 0.003)} material={m('#cccccc', 0.8)} position={[0, 0.17, 0]} />
      {/* Balloon sphere */}
      <mesh geometry={sphereGeo(0.12)} material={m('#e85d75', 0.4, 0.2)} position={[0, 0.38, 0]} scale={[1, 1.25, 1]} />
      {/* Knot */}
      <mesh geometry={sphereGeo(0.018)} material={m('#c73e54', 0.5)} position={[0, 0.27, 0]} />
    </group>
  )
}

// ── Trading-terminal screen UI (shared by trading_laptop + trading_desktop_3side) ──
// TradingView-style: dark OLED panels, thin dense candlesticks with full wicks,
// price axis on the RIGHT, time axis on the bottom, small flat volume bars,
// one thin amber MA, BUY/SELL buttons and a thin-line order book. Screen pixels
// are emissive so the panels read as lit displays. Green = up / red = down.
const TRD_C = {
  body: '#1a1e2e',
  deck: '#161a28',
  metal: '#2a2f3f',
  key: '#1c1f26',
  backlight: '#4a5568',
  up: '#26a69a',
  down: '#ef5350',
  ma: '#f0b90b',
  text: '#d1d4dc',
  dim: '#787b86',
  grid: '#232733',
  bg: '#0d1117',
  panel: '#1b1f2b',
}
const TRD_UP = glowMaterial(TRD_C.up, 1.2)
const TRD_DOWN = glowMaterial(TRD_C.down, 1.2)
const TRD_MA = glowMaterial(TRD_C.ma, 1.1)
const TRD_GRID = m(TRD_C.grid, 0.6)
const TRD_PANEL = m(TRD_C.panel, 0.7)
const TRD_ASK_FILL = glowMaterial(TRD_C.down, 0.3)
const TRD_BID_FILL = glowMaterial(TRD_C.up, 0.3)
const TRD_SCREEN = glowMaterial(TRD_C.bg, 0.6)
const TRD_BODY = m(TRD_C.body, 0.35, 0.65)
const TRD_DECK = m(TRD_C.deck, 0.4, 0.6)
const TRD_METAL = m(TRD_C.metal, 0.4, 0.6)
const TRD_KEY = m(TRD_C.key, 0.55, 0.35)
const TRD_BACKLIGHT = glowMaterial('#8a93a8', 0.7)

// Deterministic candle series (seeded, stable across renders):
// [open, close, high, low, volume] all in 0..1 units.
function trdSeries(seed: number, n: number, drift: number, vol: number): number[][] {
  let s = seed >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const out: number[][] = []
  let p = 0.5
  for (let i = 0; i < n; i++) {
    const o = p
    const c = Math.min(0.92, Math.max(0.08, p + (rnd() - 0.44) * drift))
    out.push([o, c, Math.max(o, c) + rnd() * vol, Math.min(o, c) - rnd() * vol, rnd()])
    p = c
  }
  return out
}
const TRD_MAIN = trdSeries(42, 34, 0.055, 0.028)
const TRD_DENSE = trdSeries(7, 96, 0.045, 0.016)

const trdFmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const trdPrice = (f: number) => Math.round(41800 + f * 360)

/** Primary screen: TradingView-style chart — header bar with timeframes and
 *  BUY/SELL, thin dense candlesticks with full wicks, right price axis, bottom
 *  time axis, flat volume, one thin amber MA and a thin-line order book strip
 *  on the right side. */
function TradingChartUI({ cx = 0, cy = 0.16, w = 0.41, h = 0.25, depth = 0.012 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0045 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.0125
  const chartL = L + 0.012
  const chartR = R - w * 0.315 + 0.004
  const bookL = chartR + 0.009
  const bookR = R - 0.008
  const chartT = top - 0.028
  const chartB = bottom + 0.028
  const minL = Math.min(...TRD_MAIN.map((d) => d[3]))
  const maxH = Math.max(...TRD_MAIN.map((d) => d[2]))
  const span = maxH - minL || 1
  const y = (v: number) => chartB + ((v - minL) / span) * (chartT - chartB)
  const pts = TRD_MAIN.map((d) => ({ o: y(d[0]), c: y(d[1]), h: y(d[2]), l: y(d[3]), v: d[4] }))
  const midY = (chartB + chartT) / 2
  const stepX = (chartR - chartL - 0.008) / (pts.length - 1)
  const maPts: [number, number][] = []
  for (let i = 4; i < pts.length; i++) {
    const avg = (pts[i].c + pts[i - 1].c + pts[i - 2].c + pts[i - 3].c + pts[i - 4].c) / 5
    maPts.push([chartL + (i - 2) * stepX, avg])
  }
  const base = trdPrice((midY - chartB) / (chartT - chartB))
  return (
    <group>
      {/* header band */}
      <mesh geometry={boxGeo(w - 0.02, 0.016, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0052 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.01, headerY, depth + 0.002]}>
        BTC/USDT
      </Text>
      <Text fontSize={0.0042 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.062, headerY, depth + 0.002]}>
        1m 5m
      </Text>
      <Text fontSize={0.0042 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.092, headerY, depth + 0.002]}>
        15m
      </Text>
      <Text fontSize={0.0042 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.118, headerY, depth + 0.002]}>
        1H 4H 1D
      </Text>
      {/* BUY / SELL buttons */}
      <mesh geometry={boxGeo(0.032, 0.013, 0.001)} material={TRD_UP} position={[R - 0.026, headerY, depth]} />
      <Text fontSize={0.0038 * k} color="#ffffff" anchorX="center" anchorY="middle" position={[R - 0.026, headerY, depth + 0.002]}>
        BUY
      </Text>
      <mesh geometry={boxGeo(0.032, 0.013, 0.001)} material={TRD_DOWN} position={[R - 0.064, headerY, depth]} />
      <Text fontSize={0.0038 * k} color="#ffffff" anchorX="center" anchorY="middle" position={[R - 0.064, headerY, depth + 0.002]}>
        SELL
      </Text>

      {/* chart gridlines */}
      {[0, 1, 2, 3].map((j) => (
        <mesh key={`g${j}`} geometry={boxGeo(chartR - chartL, 0.001, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB + (j * (chartT - chartB)) / 3, depth]} />
      ))}

      {/* thin candles with full-height wicks + flat volume */}
      {pts.map((p, i) => {
        const x = chartL + i * stepX
        const body = Math.max(Math.abs(p.c - p.o), 0.0012)
        const up = p.c >= p.o
        return (
          <group key={`c${i}`}>
            <mesh geometry={boxGeo(0.0008, p.h - p.l, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.h + p.l) / 2, depth + 0.001]} />
            <mesh geometry={boxGeo(0.003, body, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.o + p.c) / 2, depth + 0.002]} />
            <mesh geometry={boxGeo(0.0025, 0.0022 + p.v * 0.0026, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, chartB - 0.008 - (0.0022 + p.v * 0.0026) / 2, depth + 0.001]} />
          </group>
        )
      })}

      {/* one thin amber MA(5) curve */}
      {maPts.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = maPts[i + 1]
        const dx = x2 - x1
        const dy = y2 - y1
        return (
          <mesh key={`ma${i}`} geometry={boxGeo(Math.hypot(dx, dy), 0.0015, 0.001)} material={TRD_MA} position={[(x1 + x2) / 2, (y1 + y2) / 2, depth + 0.003]} rotation={[0, 0, Math.atan2(dy, dx)]} />
        )
      })}

      {/* price labels on the RIGHT edge */}
      {[0, 1, 2, 3].map((j) => {
        const ly = chartB + (j * (chartT - chartB)) / 3
        return (
          <Text key={`p${j}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[chartR - 0.014, ly, depth + 0.002]}>
            {trdFmt(trdPrice((ly - chartB) / (chartT - chartB)))}
          </Text>
        )
      })}

      {/* time axis on the bottom */}
      <mesh geometry={boxGeo(chartR - chartL, 0.001, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB - 0.013, depth]} />
      {[0, 1, 2].map((i) => (
        <Text key={`t${i}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[chartL + (i * (chartR - chartL)) / 2, bottom + 0.006, depth + 0.002]}>
          {['14:00', '14:30', '15:00'][i]}
        </Text>
      ))}

      {/* order book strip — thin lines, tiny numbers */}
      <mesh geometry={boxGeo(bookR - bookL, 0.001, 0.001)} material={TRD_GRID} position={[(bookL + bookR) / 2, chartT, depth]} />
      {[0, 1, 2, 3].map((i) => {
        const ay = midY + 0.014 + i * 0.014
        const by = midY - 0.014 - i * 0.014
        return (
          <group key={`b${i}`}>
            <mesh geometry={boxGeo(bookR - bookL, 0.003, 0.001)} material={TRD_ASK_FILL} position={[(bookL + bookR) / 2, ay, depth]} />
            <Text fontSize={fs * 0.85} color="#ff8a80" anchorX="right" anchorY="middle" position={[bookR, ay, depth + 0.002]}>
              {trdFmt(base + (i + 1) * 1.5)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[bookL + 0.002, ay, depth + 0.002]}>
              {(0.8 - i * 0.15).toFixed(2)}
            </Text>
            <mesh geometry={boxGeo(bookR - bookL, 0.003, 0.001)} material={TRD_BID_FILL} position={[(bookL + bookR) / 2, by, depth]} />
            <Text fontSize={fs * 0.85} color="#80e0d0" anchorX="right" anchorY="middle" position={[bookR, by, depth + 0.002]}>
              {trdFmt(base - (i + 1) * 1.5)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[bookL + 0.002, by, depth + 0.002]}>
              {(0.6 + i * 0.18).toFixed(2)}
            </Text>
          </group>
        )
      })}
      {/* mid price */}
      <mesh geometry={boxGeo(bookR - bookL, 0.004, 0.001)} material={TRD_BID_FILL} position={[(bookL + bookR) / 2, midY, depth]} />
      <Text fontSize={fs * 0.95} color={TRD_C.text} anchorX="center" anchorY="middle" position={[(bookL + bookR) / 2, midY, depth + 0.002]}>
        {trdFmt(base)}
      </Text>
    </group>
  )
}

/** Secondary panel: thin-line order book — red asks on top, green bids below,
 *  mid-price band, tiny numbers, depth as faint tinted rows (not thick bars). */
function OrderBookUI({ cx = 0, cy = 0.14, w = 0.22, h = 0.24, depth = 0.004 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0042 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.011
  const midY = cy
  const rowW = w - 0.02
  const asks = [42185.5, 42184, 42182.5, 42180, 42178.5, 42176]
  const bids = [42174, 42172.5, 42170, 42168.5, 42166, 42164]
  return (
    <group>
      <mesh geometry={boxGeo(rowW, 0.014, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0046 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, headerY, depth + 0.002]}>
        ORDER BOOK
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[R - 0.006, headerY, depth + 0.002]}>
        BTC/USDT
      </Text>
      {asks.map((p, i) => {
        const ry = midY + 0.05 - i * 0.0155
        return (
          <group key={`a${i}`}>
            <mesh geometry={boxGeo(rowW, 0.0028, 0.001)} material={TRD_ASK_FILL} position={[cx, ry, depth]} />
            <Text fontSize={fs * 0.85} color="#ff8a80" anchorX="right" anchorY="middle" position={[R - 0.006, ry, depth + 0.002]}>
              {trdFmt(p)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, ry, depth + 0.002]}>
              {(0.64 - i * 0.07).toFixed(2)}
            </Text>
          </group>
        )
      })}
      <mesh geometry={boxGeo(rowW, 0.0036, 0.001)} material={TRD_BID_FILL} position={[cx, midY, depth]} />
      <Text fontSize={fs * 0.95} color={TRD_C.text} anchorX="center" anchorY="middle" position={[cx, midY, depth + 0.002]}>
        42,180.5
      </Text>
      {bids.map((p, i) => {
        const ry = midY - 0.05 + i * 0.0155
        return (
          <group key={`b${i}`}>
            <mesh geometry={boxGeo(rowW, 0.0028, 0.001)} material={TRD_BID_FILL} position={[cx, ry, depth]} />
            <Text fontSize={fs * 0.85} color="#80e0d0" anchorX="right" anchorY="middle" position={[R - 0.006, ry, depth + 0.002]}>
              {trdFmt(p)}
            </Text>
            <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, ry, depth + 0.002]}>
              {(0.5 + i * 0.08).toFixed(2)}
            </Text>
          </group>
        )
      })}
      <mesh geometry={boxGeo(rowW, 0.001, 0.001)} material={TRD_GRID} position={[cx, bottom + 0.02, depth]} />
      <Text fontSize={fs * 0.7} color={TRD_C.dim} anchorX="center" anchorY="middle" position={[cx, bottom + 0.01, depth + 0.002]}>
        SPREAD 1.5 · DEPTH 8.2K
      </Text>
    </group>
  )
}

/** Dense zoomed-out chart for the side screen: 52 thin candles, tiny flat
 *  volume, thin MA(7), header with symbol + timeframe. */
function DenseChartUI({ cx = 0, cy = 0.14, w = 0.22, h = 0.24, depth = 0.004 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0042 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.011
  const chartL = L + 0.01
  const chartR = R - 0.014
  const chartT = top - 0.024
  const chartB = bottom + 0.024
  const minL = Math.min(...TRD_DENSE.map((d) => d[3]))
  const maxH = Math.max(...TRD_DENSE.map((d) => d[2]))
  const span = maxH - minL || 1
  const y = (v: number) => chartB + ((v - minL) / span) * (chartT - chartB)
  const pts = TRD_DENSE.map((d) => ({ o: y(d[0]), c: y(d[1]), h: y(d[2]), l: y(d[3]), v: d[4] }))
  const stepX = (chartR - chartL - 0.004) / (pts.length - 1)
  const maPts: [number, number][] = []
  for (let i = 6; i < pts.length; i++) {
    const avg = (pts[i].c + pts[i - 1].c + pts[i - 2].c + pts[i - 3].c + pts[i - 4].c + pts[i - 5].c + pts[i - 6].c) / 7
    maPts.push([chartL + (i - 3) * stepX, avg])
  }
  return (
    <group>
      <mesh geometry={boxGeo(w - 0.016, 0.014, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0046 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, headerY, depth + 0.002]}>
        BTC/USD · 1D
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[R - 0.006, headerY, depth + 0.002]}>
        MA(7)
      </Text>
      {[0, 1, 2].map((j) => (
        <mesh key={`g${j}`} geometry={boxGeo(chartR - chartL, 0.0008, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB + (j * (chartT - chartB)) / 2, depth]} />
      ))}
      {pts.map((p, i) => {
        const x = chartL + i * stepX
        const body = Math.max(Math.abs(p.c - p.o), 0.001)
        const up = p.c >= p.o
        return (
          <group key={`c${i}`}>
            <mesh geometry={boxGeo(0.0007, p.h - p.l, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.h + p.l) / 2, depth + 0.001]} />
            <mesh geometry={boxGeo(0.0018, body, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, (p.o + p.c) / 2, depth + 0.002]} />
            <mesh geometry={boxGeo(0.0012, 0.002 + p.v * 0.0025, 0.001)} material={up ? TRD_UP : TRD_DOWN} position={[x, chartB - 0.006 - (0.002 + p.v * 0.0025) / 2, depth + 0.001]} />
          </group>
        )
      })}
      {maPts.slice(0, -1).map(([x1, y1], i) => {
        const [x2, y2] = maPts[i + 1]
        const dx = x2 - x1
        const dy = y2 - y1
        return (
          <mesh key={`ma${i}`} geometry={boxGeo(Math.hypot(dx, dy), 0.001, 0.001)} material={TRD_MA} position={[(x1 + x2) / 2, (y1 + y2) / 2, depth + 0.003]} rotation={[0, 0, Math.atan2(dy, dx)]} />
        )
      })}
      {[0, 1, 2].map((j) => {
        const ly = chartB + (j * (chartT - chartB)) / 2
        return (
          <Text key={`p${j}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[chartR - 0.003, ly, depth + 0.002]}>
            {trdFmt(trdPrice((ly - chartB) / (chartT - chartB)))}
          </Text>
        )
      })}
      <mesh geometry={boxGeo(chartR - chartL, 0.0008, 0.001)} material={TRD_GRID} position={[(chartL + chartR) / 2, chartB - 0.01, depth]} />
      {[0, 1, 2].map((i) => (
        <Text key={`t${i}`} fontSize={fs * 0.9} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[chartL + (i * (chartR - chartL)) / 2, bottom + 0.006, depth + 0.002]}>
          {['Jan', 'Jul', 'Dec'][i]}
        </Text>
      ))}
    </group>
  )
}

/** Secondary panel: portfolio view — pair, qty, entry, live P&L with thin
 *  heat-style bars and an equity footer. */
function PositionsUI({ cx = 0, cy = 0.14, w = 0.22, h = 0.24, depth = 0.004 }: { cx?: number; cy?: number; w?: number; h?: number; depth?: number }) {
  const k = Math.max(w / 0.41, 0.85)
  const fs = 0.0042 * k
  const L = cx - w / 2
  const R = cx + w / 2
  const top = cy + h / 2
  const bottom = cy - h / 2
  const headerY = top - 0.011
  const rowW = w - 0.02
  const rows = [
    { sym: 'BTC', qty: '0.52', entry: '40,120', pnl: '+2.6%', up: true },
    { sym: 'ETH', qty: '4.20', entry: '2,410', pnl: '-1.1%', up: false },
    { sym: 'SOL', qty: '12.0', entry: '168.4', pnl: '+4.8%', up: true },
    { sym: 'ADA', qty: '900', entry: '1.12', pnl: '-0.4%', up: false },
  ]
  return (
    <group>
      <mesh geometry={boxGeo(rowW, 0.014, 0.001)} material={TRD_PANEL} position={[cx, headerY, depth]} />
      <Text fontSize={0.0046 * k} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, headerY, depth + 0.002]}>
        PORTFOLIO
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, headerY - 0.017, depth + 0.002]}>
        SYM
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.055, headerY - 0.017, depth + 0.002]}>
        QTY
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[cx - 0.005, headerY - 0.017, depth + 0.002]}>
        ENTRY
      </Text>
      <Text fontSize={0.0034 * k} color={TRD_C.dim} anchorX="right" anchorY="middle" position={[R - 0.006, headerY - 0.017, depth + 0.002]}>
        P&L
      </Text>
      {rows.map((row, i) => {
        const ry = headerY - 0.032 - i * 0.031
        return (
          <group key={row.sym}>
            <mesh geometry={boxGeo(0.028, 0.0028, 0.001)} material={row.up ? TRD_BID_FILL : TRD_ASK_FILL} position={[L + 0.014, ry, depth]} />
            <Text fontSize={fs} color={TRD_C.text} anchorX="left" anchorY="middle" position={[L + 0.008, ry, depth + 0.002]}>
              {row.sym}
            </Text>
            <Text fontSize={fs * 0.85} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.055, ry, depth + 0.002]}>
              {row.qty}
            </Text>
            <Text fontSize={fs * 0.85} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[cx - 0.005, ry, depth + 0.002]}>
              {row.entry}
            </Text>
            <Text fontSize={fs} color={row.up ? TRD_C.up : TRD_C.down} anchorX="right" anchorY="middle" position={[R - 0.006, ry, depth + 0.002]}>
              {row.pnl}
            </Text>
          </group>
        )
      })}
      <mesh geometry={boxGeo(rowW, 0.001, 0.001)} material={TRD_GRID} position={[cx, bottom + 0.034, depth]} />
      <Text fontSize={fs * 0.85} color={TRD_C.dim} anchorX="left" anchorY="middle" position={[L + 0.008, bottom + 0.022, depth + 0.002]}>
        TOTAL EQUITY
      </Text>
      <Text fontSize={fs} color={TRD_C.text} anchorX="right" anchorY="middle" position={[R - 0.006, bottom + 0.022, depth + 0.002]}>
        18,420.50
      </Text>
      <Text fontSize={fs * 0.85} color={TRD_C.up} anchorX="right" anchorY="middle" position={[R - 0.006, bottom + 0.01, depth + 0.002]}>
        +214.50
      </Text>
    </group>
  )
}

// ── Phone: iPhone 15 Pro-style handset lying face-up on the table ──
// Screen material: wallpaper texture lit by its own emissive map so the screen
// glows like a real OLED panel (and casts a faint light on the table).
let phoneScreenMatCache: MeshStandardMaterial | null = null
function phoneScreenMat(): MeshStandardMaterial {
  if (!phoneScreenMatCache) {
    const tex = phoneHomeScreenTex()
    tex.colorSpace = SRGBColorSpace
    phoneScreenMatCache = new MeshStandardMaterial({
      map: tex,
      color: '#ffffff',
      emissive: '#a8b9ff',
      emissiveMap: tex,
      emissiveIntensity: 1.15,
      roughness: 0.35,
      metalness: 0.05,
    })
  }
  return phoneScreenMatCache
}

/** One accessory model, centred on X/Z, base sitting at y = 0. Detailed. */
export function AccessoryModel({ id }: { id: AccessoryId }) {
  switch (id) {
  case 'laptop':
  case 'gaming_laptop': {
    const isGaming = id === 'gaming_laptop'
    const shell = isGaming ? m('#0a0a0f', 0.35, 0.55) : tm('#b8a48c', 0.5, 0.1, 'leather')
    const base = isGaming ? m('#0a0a0f', 0.4, 0.5) : tm('#9a8468', 0.6, 0, 'wood')
    const keyMat = !isGaming ? m('#e9dcc4', 0.5) : null

    // Real gaming palette: near-black body (#0a0a0f), gunmetal edges (#2a2a2a),
    // matte black keys (#1c1c1c) with cyan/magenta per-key RGB backlight.
    const DARK_BODY = m('#0a0a0f', 0.35, 0.6)
    const GUNMETAL = m('#2a2a2a', 0.4, 0.7)
    const KEY_MATTE = m('#1c1c1c', 0.85, 0.05)
    const RGB_CYAN = glowMaterial('#00ffff', 1.4)
    const RGB_MAGENTA = glowMaterial('#ff00ff', 1.4)
    const RGB_BLUE = glowMaterial('#4466ff', 1.1)
    const RGB_WAVE = [RGB_CYAN, RGB_MAGENTA, RGB_BLUE]

    const screenGlow = isGaming ? glowMaterial('#0d0d18', 0.8) : m('#c9924a', 0.35)
    const logo = isGaming ? glowMaterial('#00e5ff', 1.6) : m('#caa24a', 0.4, 0.3)
    // On-screen UI palette — neon gaming HUD on a dark OLED panel
    const scrBg = m(isGaming ? '#07070d' : '#14100c', 0.9)
    const scrLine = m(isGaming ? '#1a1a2a' : '#3a2f22', 0.8)
    const scrAccent = isGaming ? glowMaterial('#00e5ff', 1.3) : m('#e0b878', 0.5)
    const scrAccent2 = isGaming ? glowMaterial('#ff2ed1', 1.3) : m('#a06a3a', 0.5)
    const scrText = isGaming ? glowMaterial('#e8f6ff', 1.2) : m('#e8d4a0', 0.6)

    const keys = []
    const colsK = isGaming ? 13 : 11
    const rowsK = 5
    const keyW = 0.026
    const keyD = isGaming ? 0.019 : 0.02
    const keySpacing = isGaming ? 0.0275 : 0.032
    const keyH = isGaming ? 0.005 : 0.012 // ultra-flat ~1.5mm chiclet keys
    const keyY = isGaming ? 0.0315 : 0.031
    // QWERTY row labels — padded to colsK per row
    const rowLabels = isGaming
      ? ['`1234567890-=', 'qwertyuiop[]\\', 'asdfghjkl;\'"', 'zxcvbnm,./', ' ']
      : ['`1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', ' ']

    if (isGaming) {
      // Full-size deck: 6 rows × 15 cols (function row + main block + numpad).
      const rgbCol = (c: number, r: number) => RGB_WAVE[(c + r * 2) % RGB_WAVE.length]
      // function row — blank ultra-flat keys with per-key RGB glow
      for (let c = 0; c < 15; c++) {
        const kx = -0.202 + c * keySpacing
        keys.push(
          <group key={`fk${c}`} position={[kx, keyY, 0.014]}>
            <mesh geometry={boxGeo(keyW * 0.86, keyH, keyD)} material={KEY_MATTE} />
            <mesh geometry={boxGeo(keyW + 0.003, 0.0028, keyD + 0.003)} material={rgbCol(c, 0)} position={[0, -keyH / 2 - 0.0015, 0]} />
          </group>,
        )
      }
      // main block (5 rows × 13 cols) with wide space bar
      const mainRows = [
        '`1234567890-=',
        'qwertyuiop[]\\',
        'asdfghjkl;\'',
        'zxcvbnm,./',
        '',
      ]
      const bottomLabels = ['Ct', 'Wi', 'Al', '', '', '', '', '', '', 'Al', 'Fn', '◄', '►']
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 13; c++) {
          const isSpace = r === 4 && c >= 3 && c <= 8
          if (isSpace) continue
          const kx = -0.202 + c * keySpacing
          const kz = 0.038 + r * 0.0245
          const kw = r === 4 && c === 3 ? keySpacing * 6 + keyW : keyW
          const label = r === 4 ? bottomLabels[c] : mainRows[r][c] ?? ''
          keys.push(
            <group key={`k${r}-${c}`} position={[kx, keyY, kz]}>
              <mesh geometry={boxGeo(kw, keyH, keyD)} material={KEY_MATTE} />
              <mesh geometry={boxGeo(kw + 0.003, 0.0028, keyD + 0.003)} material={rgbCol(c, r)} position={[0, -keyH / 2 - 0.0015, 0]} />
              {label && (
                <Text
                  fontSize={r === 4 ? 0.0042 : 0.0055}
                  color={r === 4 ? '#6a7182' : '#9aa0b0'}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, keyH / 2 + 0.001, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  {label}
                </Text>
              )}
            </group>,
          )
        }
      }
      // numpad — 2 narrow columns on the right
      const numpadRows = [
        ['NL', '/'],
        ['7', '8'],
        ['4', '5'],
        ['1', '2'],
        ['0', ''],
      ]
      for (let r = 0; r < numpadRows.length; r++) {
        for (let n = 0; n < 2; n++) {
          const label = numpadRows[r][n]
          if (!label) continue
          const c = 13 + n
          const kx = -0.202 + c * keySpacing
          const kz = 0.038 + r * 0.0245
          const kw = r === 4 && n === 0 ? keySpacing * 2 + keyW : keyW
          keys.push(
            <group key={`nk${r}-${n}`} position={[kx, keyY, kz]}>
              <mesh geometry={boxGeo(kw, keyH, keyD)} material={KEY_MATTE} />
              <mesh geometry={boxGeo(kw + 0.003, 0.0028, keyD + 0.003)} material={rgbCol(c, r)} position={[0, -keyH / 2 - 0.0015, 0]} />
              <Text fontSize={0.0052} color="#9aa0b0" anchorX="center" anchorY="middle" position={[0, keyH / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {label}
              </Text>
            </group>,
          )
        }
      }
    } else {
      for (let r = 0; r < rowsK; r++) {
        for (let c = 0; c < colsK; c++) {
          const kx = -((colsK - 1) * keySpacing) / 2 + c * keySpacing
          const kz = 0.015 + r * 0.026
          const keyPalette = ['#e9dcc4']
          const label = (rowLabels[r] && c < rowLabels[r].length) ? rowLabels[r][c] : ''
          const isSpace = r === 4 && c === 0
          const kw = isSpace ? keySpacing * (colsK - 1) + keyW : keyW
          keys.push(
            <group key={`k${r}-${c}`} position={[kx, keyY, kz]}>
              <mesh geometry={boxGeo(kw, keyH, keyD)} material={keyMat ? keyMat : m(keyPalette[0], 0.45, 0.2)} />
              {label ? (
                <Text
                  fontSize={0.009}
                  color={'#3a2a1a'}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, keyH / 2 + 0.001, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  {label}
                </Text>
              ) : null}
            </group>,
          )
        }
      }
    }

    // On-screen content: a code editor for the study laptop, a neon game HUD +
    // dark gaming wallpaper for the gaming laptop (flat pixel UI bars, no 3D blocks).
    const screenContent = isGaming ? (
      <group position={[0, 0.16, 0.012]}>
        {/* neon wireframe mountains — dark gaming wallpaper scene */}
        {Array.from({ length: 5 }).map((_, i) => {
          const wx = -0.16 + i * 0.08
          const wh = 0.045 + ((i * 7) % 3) * 0.028
          return (
            <group key={`m${i}`}>
              <mesh geometry={boxGeo(0.055, 0.002, 0.001)} material={scrAccent} position={[wx - 0.016, -0.075 + wh / 3, 0.001]} rotation={[0, 0, Math.PI / 4]} />
              <mesh geometry={boxGeo(0.055, 0.002, 0.001)} material={scrAccent2} position={[wx + 0.016, -0.075 + wh / 3, 0.001]} rotation={[0, 0, -Math.PI / 4]} />
              <mesh geometry={boxGeo(0.048, 0.0025, 0.001)} material={scrText} position={[wx, -0.075, 0.001]} />
            </group>
          )
        })}
        {/* neon sun */}
        <mesh geometry={circleGeo(0.028)} material={glowMaterial('#ff2ed1', 1.2)} position={[0.115, 0.03, 0.001]} />
        {/* horizon */}
        <mesh geometry={boxGeo(0.4, 0.0025, 0.001)} material={scrAccent} position={[0, -0.06, 0.001]} />
        {/* glossy sheen streak across the panel */}
        <mesh geometry={boxGeo(0.2, 0.012, 0.001)} material={m('#cfe8ff', 0.15, 0.05)} position={[-0.11, 0.115, 0.013]} rotation={[0, 0, -0.32]} />

        {/* flat health bar — top left (thin 2D pixels, not thick 3D bars) */}
        <mesh geometry={boxGeo(0.1, 0.0035, 0.001)} material={m('#101018', 0.8)} position={[-0.155, 0.108, 0.001]} />
        <mesh geometry={boxGeo(0.092, 0.0022, 0.001)} material={glowMaterial('#ff2244', 1.4)} position={[-0.151, 0.108, 0.002]} />
        {/* flat energy bar — top right */}
        <mesh geometry={boxGeo(0.1, 0.0035, 0.001)} material={m('#101018', 0.8)} position={[0.155, 0.108, 0.001]} />
        <mesh geometry={boxGeo(0.068, 0.0022, 0.001)} material={glowMaterial('#00e5ff', 1.4)} position={[0.152, 0.108, 0.002]} />
        {/* ammo counter + score (small flat text UI) */}
        <Text fontSize={0.0055} color="#e8f6ff" anchorX="right" anchorY="middle" position={[0.195, 0.095, 0.002]}>24/30</Text>
        <Text fontSize={0.007} color="#ff2ed1" anchorX="center" anchorY="middle" position={[0, 0.108, 0.002]}>002450</Text>

        {/* tiny pixel crosshair at centre — flat UI element, not a 3D object */}
        <mesh geometry={boxGeo(0.0045, 0.001, 0.001)} material={scrText} position={[0, 0.012, 0.002]} />
        <mesh geometry={boxGeo(0.001, 0.0045, 0.001)} material={scrText} position={[0, 0.012, 0.002]} />

        {/* minimap — bottom right, thin frame + blip */}
        <mesh geometry={boxGeo(0.05, 0.036, 0.001)} material={m('#10101a', 0.9)} position={[0.16, -0.078, 0.001]} />
        <mesh geometry={boxGeo(0.05, 0.0015, 0.001)} material={scrAccent} position={[0.16, -0.059, 0.002]} />
        <mesh geometry={boxGeo(0.0015, 0.036, 0.001)} material={scrAccent} position={[0.185, -0.078, 0.002]} />
        <mesh geometry={boxGeo(0.05, 0.0015, 0.001)} material={scrAccent} position={[0.16, -0.097, 0.002]} />
        <mesh geometry={boxGeo(0.0015, 0.036, 0.001)} material={scrAccent} position={[0.135, -0.078, 0.002]} />
        <mesh geometry={sphereGeo(0.0035)} material={glowMaterial('#00e5ff', 1.6)} position={[0.162, -0.075, 0.003]} />
      </group>
    ) : (
      <group position={[0, 0.16, 0.012]}>
        {/* window chrome */}
        <mesh geometry={boxGeo(0.4, 0.018, 0.001)} material={scrLine} position={[0, 0.108, 0]} />
        {[-0.17, -0.155, -0.14].map((dx, i) => (
          <mesh key={`wc${i}`} geometry={sphereGeo(0.004)} material={m(['#c03030', '#d4a030', '#30a050'][i], 0.5)} position={[dx, 0.108, 0.001]} />
        ))}
        {/* sidebar */}
        <mesh geometry={boxGeo(0.07, 0.2, 0.001)} material={scrLine} position={[-0.16, 0, 0]} />
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={`sb${i}`} geometry={boxGeo(0.05, 0.008, 0.001)} material={scrText} position={[-0.16, 0.08 - i * 0.03, 0.001]} />
        ))}
        {/* code lines — varied widths + colours like syntax highlighting */}
        {Array.from({ length: 9 }).map((_, i) => {
          const lw = [0.2, 0.14, 0.22, 0.1, 0.18, 0.24, 0.12, 0.2, 0.16][i]
          const indent = [0, 1, 1, 2, 1, 0, 1, 2, 0][i] * 0.02
          const cols = [scrAccent, scrText, scrAccent2, scrText]
          return (
            <mesh key={`cl${i}`} geometry={boxGeo(lw, 0.011, 0.001)} material={cols[i % cols.length]} position={[-0.04 + indent + lw / 2 - 0.1, 0.085 - i * 0.021, 0.001]} />
          )
        })}
        {/* blinking cursor */}
        <mesh geometry={boxGeo(0.008, 0.013, 0.001)} material={scrText} position={[0.1, -0.095, 0.001]} />
      </group>
    )

    return (
      <group>
        {/* thin RGB underglow strip along the front edge (nothing protruding) */}
        {isGaming && (
          <group position={[0, 0.002, 0.265]}>
            <mesh geometry={boxGeo(0.4, 0.0025, 0.003)} material={RGB_CYAN} />
            <mesh geometry={boxGeo(0.32, 0.0025, 0.003)} material={RGB_MAGENTA} position={[0.015, 0.001, 0.002]} />
          </group>
        )}

        {/* wedge chassis — thicker at the back for cooling, thin at the front */}
        <mesh geometry={boxGeo(0.48, 0.03, 0.22)} material={isGaming ? DARK_BODY : shell} position={[0, 0.016, -0.09]} castShadow />
        <mesh geometry={boxGeo(0.48, 0.014, 0.3)} material={isGaming ? DARK_BODY : shell} position={[0, 0.007, 0.12]} castShadow />
        <mesh geometry={boxGeo(0.44, 0.012, 0.26)} material={base} position={[0, 0.02, 0.02]} />
        {keys}

        {/* RGB backlight bleeding through the gaps between keys (rainbow wave) */}
        {isGaming &&
          Array.from({ length: 6 }).map((_, i) => (
            <mesh key={`bl${i}`} geometry={boxGeo(0.405, 0.002, 0.0025)} material={RGB_WAVE[i % RGB_WAVE.length]} position={[0, 0.0287, 0.038 + i * 0.0245]} />
          ))}

        {/* compact recessed trackpad — small, dark, unobtrusive */}
        <mesh geometry={boxGeo(0.085, 0.0035, 0.05)} material={isGaming ? m('#0c0c12', 0.6, 0.4) : m('#d9c8a8', 0.5)} position={[0, 0.028, 0.185]} />
        <mesh geometry={boxGeo(0.075, 0.0015, 0.04)} material={m('#000000', 0.7)} position={[0, 0.0285, 0.185]} />
        {/* thin gunmetal edges — NOT gold/copper */}
        <mesh geometry={boxGeo(0.005, 0.016, 0.42)} material={GUNMETAL} position={[-0.238, 0.012, 0.02]} />
        <mesh geometry={boxGeo(0.005, 0.016, 0.42)} material={GUNMETAL} position={[0.238, 0.012, 0.02]} />

        {/* aggressive rear exhaust vents — grille with visible copper heatsink fins */}
        {isGaming && (
          <group position={[0, 0.014, -0.2]}>
            <mesh geometry={boxGeo(0.42, 0.024, 0.008)} material={m('#0b0b10', 0.5, 0.5)} />
            {Array.from({ length: 10 }).map((_, i) => (
              <mesh key={`fin${i}`} geometry={boxGeo(0.34, 0.014, 0.003)} material={m('#c07a3e', 0.35, 0.75)} position={[-0.187 + i * 0.0415, 0, -0.005]} />
            ))}
          </group>
        )}

        {/* fine speaker grilles flanking the keyboard */}
        {[-0.215, 0.215].map((sx, i) => (
          <group key={`spk${i}`} position={[sx, 0.016, 0.12]}>
            {Array.from({ length: 6 }).map((_, d) => (
              <mesh key={`sd${d}`} geometry={boxGeo(0.05, 0.0015, 0.003)} material={m('#050507', 0.7)} position={[0, 0, -0.055 + d * 0.022]} />
            ))}
          </group>
        ))}

        {/* screen lid — angular hinge + glossy lit panel + glowing logo */}
        <group position={[0, 0.028, -0.14]} rotation={[-0.22, 0, 0]}>
          {/* angular hinge block */}
          <mesh geometry={boxGeo(0.5, 0.012, 0.02)} material={GUNMETAL} position={[0, 0.003, 0.004]} />
          {/* thin RGB bar on the hinge */}
          {isGaming && (
            <mesh geometry={boxGeo(0.42, 0.0035, 0.004)} material={RGB_CYAN} position={[0, 0.0015, 0.008]} />
          )}
          <mesh geometry={boxGeo(0.48, 0.32, 0.014)} material={shell} position={[0, 0.16, 0]} castShadow />
          <mesh geometry={boxGeo(0.44, 0.28, 0.004)} material={scrBg} position={[0, 0.16, 0.009]} />
          <mesh geometry={boxGeo(0.42, 0.25, 0.002)} material={screenGlow} position={[0, 0.16, 0.011]} />
          {/* live on-screen content */}
          {screenContent}
          {/* glowing backlit emblem on the lid (ROG-style) */}
          <mesh geometry={sphereGeo(0.014)} material={logo} position={[0, 0.035, -0.008]} />
          <mesh geometry={torusGeo(0.02, 0.0025)} material={GUNMETAL} position={[0, 0.035, -0.008]} />
          {/* webcam dot + subtle lens ring */}
          <mesh geometry={sphereGeo(0.004)} material={m('#1a1a2a', 0.3)} position={[0, 0.31, 0.01]} />
          <mesh geometry={torusGeo(0.006, 0.0015)} material={m('#3a3a4a', 0.4)} position={[0, 0.31, 0.01]} />
        </group>

        {/* screen glow — the bright display casts coloured light onto the keyboard */}
        {isGaming && <pointLight position={[0, 0.3, -0.12]} color="#6ee7ff" intensity={0.55} distance={0.9} />}
      </group>
    )
  }
    case 'phone': {
      // iPhone 15 Pro-style handset — space-gray frame, ultra-thin bezels,
      // dynamic island, live home screen, side buttons, rear camera bump.
      const frame = m('#2c2c2e', 0.38, 0.7)
      const titanium = m('#8a8a8e', 0.42, 0.7)
      const buttonDark = m('#6e6e73', 0.45, 0.7)
      const island = m('#050507', 0.3, 0.1)
      const lensRing = m('#2c2c30', 0.35, 0.8)
      const lensGlass = m('#0c0e14', 0.15, 0.9)
      const flash = m('#fff3c0', 0.3, 0.2)
      const camBump = m('#3a3a3c', 0.45, 0.6)
      return (
        // lies FLAT on the table (face up) — not standing
        <group position={[0, 0.012, 0.14]}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            {/* body — 15×7 cm, 8 mm thin, flat titanium edges */}
            <mesh geometry={boxGeo(0.07, 0.15, 0.008)} material={frame} castShadow />
            {/* near-borderless OLED screen (3 mm bezels) with live wallpaper */}
            <mesh geometry={boxGeo(0.064, 0.144, 0.004)} material={phoneScreenMat()} position={[0, 0.075, 0.005]} />
            {/* dynamic island — small pill, not a wide bar */}
            <mesh geometry={boxGeo(0.026, 0.006, 0.003)} material={island} position={[0, 0.1365, 0.0085]} />
            <mesh geometry={sphereGeo(0.0018)} material={m('#0a0a0c', 0.3)} position={[0.007, 0.1365, 0.0098]} />
            {/* side buttons — volume up/down left, power right */}
            <mesh geometry={boxGeo(0.0016, 0.013, 0.0045)} material={buttonDark} position={[-0.0356, 0.101, 0]} />
            <mesh geometry={boxGeo(0.0016, 0.013, 0.0045)} material={buttonDark} position={[-0.0356, 0.086, 0]} />
            <mesh geometry={boxGeo(0.0016, 0.02, 0.0045)} material={titanium} position={[0.0356, 0.101, 0]} />
            {/* screen emits a soft white/blue light upward */}
            <pointLight position={[0, 0.075, 0.03]} color="#cdd9ff" intensity={0.35} distance={0.4} />
            {/* rear camera bump — square module, 3 lenses in a triangle + flash */}
            <mesh geometry={boxGeo(0.026, 0.026, 0.003)} material={camBump} position={[0, 0.105, -0.0055]} />
            {[[-0.007, -0.006], [0.007, -0.006], [0, 0.008]].map(([lx, ly], i) => (
              <group key={`l${i}`} position={[lx, 0.105 + ly, -0.0075]}>
                <mesh geometry={torusGeo(0.005, 0.0016)} material={lensRing} rotation={[0, Math.PI, 0]} />
                <mesh geometry={circleGeo(0.0048)} material={lensGlass} rotation={[0, Math.PI, 0]} />
              </group>
            ))}
            <mesh geometry={sphereGeo(0.0025)} material={flash} position={[0.008, 0.1145, -0.0065]} />
          </group>
        </group>
      )
    }
    case 'book': {
      const cover = tm('#7a3b22', 0.7, 0, 'leather')
      const cover2 = tm('#5e2c18', 0.7, 0, 'leather')
      const pages = tm('#f3ead2', 0.85, 0, 'paper')
      const pageLine = m('#e0d2b0', 0.9)
      const gold = m('#caa24a', 0.4, 0.3)
      const emblem = m('#e0b86a', 0.4, 0.35)
      return (
        <group>
          <mesh geometry={boxGeo(0.36, 0.09, 0.28)} material={cover} position={[0, 0.045, 0]} castShadow />
          <mesh geometry={boxGeo(0.34, 0.07, 0.265)} material={pages} position={[0, 0.062, 0.004]} />
          {/* page lines on the top edge */}
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={`pl${i}`} geometry={boxGeo(0.33, 0.002, 0.25)} material={pageLine} position={[0, 0.05 + i * 0.007, 0.004]} />
          ))}
          {/* spine with ridges */}
          <mesh geometry={boxGeo(0.012, 0.09, 0.28)} material={pages} position={[-0.17, 0.045, 0]} />
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={`sp${i}`} geometry={boxGeo(0.014, 0.002, 0.26)} material={pageLine} position={[-0.17, 0.022 + i * 0.018, 0.004]} />
          ))}
          <mesh geometry={boxGeo(0.33, 0.012, 0.25)} material={cover2} position={[0, 0.092, 0]} />
          {/* embossed title band + emblem */}
          <mesh geometry={boxGeo(0.24, 0.026, 0.004)} material={gold} position={[0.02, 0.075, 0.141]} />
          <mesh geometry={boxGeo(0.14, 0.014, 0.004)} material={gold} position={[0.02, 0.05, 0.141]} />
          <mesh geometry={sphereGeo(0.022)} material={emblem} position={[-0.08, 0.072, 0.142]} />
          {/* gold corner ornaments */}
          {[[-0.15, 0.07], [0.15, 0.07], [-0.15, 0.02], [0.15, 0.02]].map(([cx, cy], i) => (
            <mesh key={`co${i}`} geometry={boxGeo(0.03, 0.03, 0.004)} material={gold} position={[cx, cy, 0.141]} />
          ))}
          {/* bookmark ribbon */}
          <mesh geometry={boxGeo(0.02, 0.16, 0.004)} material={m('#e0b84a', 0.6)} position={[0.14, -0.015, 0.141]} />
        </group>
      )
    }
  case 'piano': {
    const body = tm('#3a241a', 0.5, 0, 'wood')
    const bodyLight = tm('#4a2e1d', 0.45, 0, 'wood')
    const bodyDark = tm('#241510', 0.6, 0, 'wood')
    const whiteKey = m('#f3ead9', 0.35)
    const blackKey = m('#1a1109', 0.32)
    const goldAccent = m('#caa24a', 0.3, 0.35)
    const redFelt = m('#7a2e22', 0.9)
    const musicStandWood = tm('#2a1810', 0.6, 0, 'wood')

    const keys = []
    const nWhite = 24
    const wkW = 0.023
    const x0 = -((nWhite - 1) * wkW) / 2
    // white keys
    for (let i = 0; i < nWhite; i++) {
      keys.push(<mesh key={`wk${i}`} geometry={boxGeo(wkW * 0.92, 0.012, 0.09)} material={whiteKey} position={[x0 + i * wkW, 0.063, 0.02]} />)
    }
    // black keys pattern (2-3-2 over 7-octave stretch)
    const blackPattern = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23]
    for (const i of blackPattern) {
      if (i >= nWhite) continue
      keys.push(
        <mesh
          key={`bk${i}`}
          geometry={boxGeo(wkW * 0.52, 0.018, 0.05)}
          material={blackKey}
          position={[x0 + i * wkW + wkW / 2, 0.07, 0.022]}
        />,
      )
    }

    return (
      <group>
        {/* ---- Upright piano body (lathe + boxes) ---- */}
        {/* Main box body behind keys */}
        <mesh geometry={boxGeo(0.74, 0.38, 0.34)} material={body} position={[0, 0.24, -0.06]} castShadow />
        {/* Front panel where keys sit */}
        <mesh geometry={boxGeo(0.72, 0.05, 0.16)} material={bodyLight} position={[0, 0.06, 0.1]} />
        {/* Lower cabinet */}
        <mesh geometry={boxGeo(0.72, 0.12, 0.3)} material={bodyDark} position={[0, -0.005, -0.01]} />
        {/* Red felt strip above keys */}
        <mesh geometry={boxGeo(0.68, 0.012, 0.04)} material={redFelt} position={[0, 0.085, 0.11]} />
        {/* Gold strip under keyboard */}
        <mesh geometry={boxGeo(0.66, 0.008, 0.025)} material={goldAccent} position={[0, 0.058, 0.1]} />

        {/* Keys */}

        {keys}

        {/* Music stand (angled flat panel above keys) */}
        <group position={[0, 0.245, 0.12]} rotation={[0.25, 0, 0]}>
          <mesh geometry={latheGeo([[0.3, 0], [0.32, 0.015], [0.32, 0.18], [0.3, 0.19]])} material={musicStandWood} />
          {/* Sheet of music */}
          <mesh geometry={boxGeo(0.28, 0.2, 0.004)} material={tm('#f5eedf', 0.8, 0, 'paper')} position={[0, 0.08, 0.002]} />
          {Array.from({ length: 7 }).map((_, line) => (
            <mesh
              key={`msl${line}`}
              geometry={boxGeo(0.24, 0.001, 0.001)}
              material={m('#5b3a22', 0.6)}
              position={[0, 0.06 - line * 0.014, 0.004]}
            />
          ))}
          {/* Approx note blobs */}
          {[[-0.08, 0.09], [-0.03, 0.05], [0.02, 0.02], [0.07, 0.065], [-0.05, -0.02]].map(([nx, ny], ni) => (
            <mesh key={`msn${ni}`} geometry={sphereGeo(0.006)} material={m('#241510', 0.4)} position={[nx, ny, 0.006]} />
          ))}
        </group>

        {/* Brand plate on front */}
        <mesh geometry={boxGeo(0.1, 0.015, 0.008)} material={goldAccent} position={[0, 0.12, 0.166]} />

        {/* Legs */}
        {[[-0.28, -0.12], [0.28, -0.12], [-0.28, 0.1], [0.28, 0.1]].map(([fx, fz], li) => (
          <mesh
            key={`leg${li}`}
            geometry={taperGeo(0.025, 0.03, 0.14)}
            material={bodyDark}
            position={[fx, -0.07, fz]}
          />
        ))}
        {/* Curved leg fillets */}
        {[[-0.28, -0.12], [0.28, -0.12], [-0.28, 0.1], [0.28, 0.1]].map(([fx, fz], li) => (
          <mesh key={`foot${li}`} geometry={taperGeo(0.03, 0.04, 0.01)} material={body} position={[fx, -0.14, fz]} />
        ))}

        {/* Lid prop stick */}
        <mesh geometry={boxGeo(0.008, 0.12, 0.008)} material={bodyDark} position={[0.3, 0.12, 0.05]} rotation={[0, 0, 0.4]} />
      </group>
    )
  }
    case 'mug': {
      // Rich ceramic palette
      const ceramicOuter = tm('#c96f43', 0.32, 0, 'ceramic')
      const ceramicInner = tm('#a85530', 0.4, 0, 'ceramic')
      const ceramicRim = tm('#d4794f', 0.3, 0, 'ceramic')
      const coffee = m('#2e1a0e', 0.6)
      const crema = m('#8a6040', 0.5)
      const latteArt = m('#e8d5c0', 0.45)
      const saucerMat = tm('#bd653c', 0.38, 0, 'ceramic')
      const saucerRim = tm('#a85a32', 0.42, 0, 'ceramic')
      const goldBand = m('#caa24a', 0.3, 0.35)
      const spoonMat = m('#b87333', 0.25, 0.65)
      const steam = m('#f3e9d8', 0.95)

      return (
        <group>
          {/* --- Cup body (lathe profile for realistic shape) --- */}
          <mesh
            geometry={latheGeo([
              [0.055, 0],       // base
              [0.058, 0.01],    // slight foot ring
              [0.054, 0.015],   // foot inset
              [0.052, 0.025],   // bottom curve
              [0.056, 0.05],    // belly starts
              [0.062, 0.08],    // belly
              [0.068, 0.1],     // widening
              [0.072, 0.115],   // near rim
              [0.073, 0.125],   // lip flare
              [0.071, 0.13],    // rim top
            ])}
            material={ceramicOuter}
            position={[0, 0, 0]}
            castShadow
          />
          {/* Inner cup wall (slightly smaller, hollow feel) */}
          <mesh
            geometry={latheGeo([
              [0.048, 0.02],
              [0.05, 0.04],
              [0.054, 0.07],
              [0.058, 0.095],
              [0.062, 0.11],
              [0.063, 0.12],
            ])}
            material={ceramicInner}
          />
          {/* Rim highlight ring */}
          <mesh
            geometry={torusGeo(0.072, 0.005, 10, 32)}
            material={ceramicRim}
            position={[0, 0.13, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />

          {/* --- Coffee liquid --- */}
          <mesh geometry={taperGeo(0.062, 0.055, 0.015)} material={coffee} position={[0, 0.122, 0]} />
          {/* Crema ring near the edge */}
          <mesh geometry={torusGeo(0.056, 0.006, 8, 24)} material={crema} position={[0, 0.129, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Latte art — simple rosetta heart shape */}
          <mesh geometry={sphereGeo(0.018)} material={latteArt} position={[0, 0.13, 0]} scale={[1, 0.3, 1]} />
          <mesh geometry={sphereGeo(0.012)} material={latteArt} position={[-0.015, 0.13, 0.01]} scale={[1, 0.3, 1]} />
          <mesh geometry={sphereGeo(0.012)} material={latteArt} position={[0.015, 0.13, 0.01]} scale={[1, 0.3, 1]} />
          {/* Small stem of the rosetta */}
          <mesh geometry={boxGeo(0.004, 0.001, 0.025)} material={latteArt} position={[0, 0.13, -0.012]} />

          {/* --- Decorative gold band --- */}
          <mesh geometry={torusGeo(0.068, 0.004, 8, 32)} material={goldBand} position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* --- Handle (thicker, more natural D-shape) --- */}
          <mesh
            geometry={torusGeo(0.04, 0.012, 12, 24)}
            material={ceramicOuter}
            position={[0.085, 0.075, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />

          {/* --- Saucer --- */}
          <mesh geometry={taperGeo(0.16, 0.14, 0.018)} material={saucerMat} position={[0, 0.009, 0]} castShadow />
          {/* Saucer inner depression */}
          <mesh geometry={taperGeo(0.11, 0.09, 0.008)} material={m('#a05535', 0.45)} position={[0, 0.018, 0]} />
          {/* Saucer raised rim */}
          <mesh geometry={torusGeo(0.145, 0.008, 10, 32)} material={saucerRim} position={[0, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Gold accent ring on saucer */}
          <mesh geometry={torusGeo(0.1, 0.003, 8, 28)} material={goldBand} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* --- Small spoon resting on saucer --- */}
          <group position={[0.08, 0.022, 0.06]} rotation={[0, -0.3, 0]}>
            {/* Spoon bowl */}
            <mesh geometry={sphereGeo(0.018)} material={spoonMat} scale={[1, 0.4, 1]} />
            {/* Spoon handle */}
            <mesh geometry={boxGeo(0.005, 0.002, 0.08)} material={spoonMat} position={[0, 0, -0.045]} />
          </group>

          {/* --- Steam wisps (4 translucent curls with varying heights) --- */}
          {[[-0.015, 0.155], [0.01, 0.16], [-0.005, 0.165], [0.02, 0.15]].map(([sx, sy], i) => (
            <mesh
              key={`st${i}`}
              geometry={taperGeo(0.008 - i * 0.001, 0.002, 0.1 + i * 0.015)}
              material={steam}
              position={[sx, sy, (i - 1.5) * 0.008]}
              rotation={[0, 0, sx * 0.6 + (i - 1.5) * 0.15]}
            />
          ))}
        </group>
      )
    }
case 'trading_laptop': {
  // premium navy workstation body (ASUS ProArt vibe), not warm brown
  const { glowSoft, glowHard, glowUltra, complimentGlowMid } = makeRgbGamingPalette()

  // Keyboard: 4 full rows with QWERTY labels + bottom row with ctrl/win/alt,
  // wide space bar and arrow keys at the bottom right.
  const keys = []
  const rowLabels = ['`1234567890-=', 'qwertyuiop[]\\', 'asdfghjkl;\'', 'zxcvbnm,./']
  const keyW = 0.028
  const keyH = 0.0062
  const spacing = 0.032
  const keyY = 0.0345
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 13; c++) {
      const kx = -0.192 + c * spacing
      const kz = 0.015 + r * 0.030
      keys.push(
        <group key={`k${r}-${c}`} position={[kx, keyY, kz]}>
          <mesh geometry={boxGeo(keyW, keyH, 0.021)} material={TRD_KEY} />
          <Text fontSize={0.0075} color="#9aa4b8" anchorX="center" anchorY="middle" position={[0, keyH / 2 + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {rowLabels[r][c]}
          </Text>
        </group>,
      )
    }
  }
  const bottomKeys = [
    { c: 0, label: 'ctrl', wide: false },
    { c: 1, label: 'win', wide: false },
    { c: 2, label: 'alt', wide: false },
    { c: 3, label: '', wide: true },
    { c: 9, label: '<', wide: false },
    { c: 10, label: 'v', wide: false },
    { c: 11, label: '^', wide: false },
    { c: 12, label: '>', wide: false },
  ]
  for (const bk of bottomKeys) {
    const kw = bk.wide ? spacing * 6 : keyW
    const kx = bk.wide ? -0.192 + bk.c * spacing + (spacing * 6 - keyW) / 2 : -0.192 + bk.c * spacing
    keys.push(
      <group key={`b${bk.c}`} position={[kx, keyY, 0.135]}>
        <mesh geometry={boxGeo(kw, keyH, 0.021)} material={TRD_KEY} />
        {bk.label && (
          <Text fontSize={0.0075} color="#9aa4b8" anchorX="center" anchorY="middle" position={[0, keyH / 2 + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            {bk.label}
          </Text>
        )}
      </group>,
    )
  }

  return (
    <group>
      {/* dark metal base plate — no RGB */}
      <group position={[0, -0.004, 0]}>
        <mesh geometry={boxGeo(0.52, 0.006, 0.22)} material={m('#1c2028', 0.4, 0.6)} />
        <mesh geometry={boxGeo(0.44, 0.005, 0.18)} material={m('#14171e', 0.45, 0.5)} />
      </group>

      {/* slim wedge deck — thicker at back, thinner at front */}
      <mesh geometry={boxGeo(0.48, 0.022, 0.19)} material={TRD_BODY} position={[0, 0.011, -0.075]} castShadow />
      <mesh geometry={boxGeo(0.48, 0.012, 0.19)} material={TRD_BODY} position={[0, 0.006, 0.115]} castShadow />
      <mesh geometry={boxGeo(0.44, 0.008, 0.24)} material={TRD_DECK} position={[0, 0.024, 0.02]} />
      {/* faint blue/white backlight bleeding from under the keys */}
      <mesh geometry={boxGeo(0.42, 0.0015, 0.2)} material={TRD_BACKLIGHT} position={[0, 0.029, 0.06]} />
      {/* keyboard */}
      {keys}
      {/* subtle recessed trackpad with a light border ring */}
      <mesh geometry={boxGeo(0.1, 0.004, 0.058)} material={m('#2a3140', 0.55, 0.5)} position={[0, 0.0165, 0.185]} />
      <mesh geometry={boxGeo(0.09, 0.0055, 0.048)} material={m('#0e1219', 0.55, 0.4)} position={[0, 0.0165, 0.185]} />

      {/* thin gunmetal aluminum edges */}
      <mesh geometry={boxGeo(0.004, 0.02, 0.3)} material={m('#3a3f4a', 0.35, 0.7)} position={[-0.238, 0.014, 0.03]} />
      <mesh geometry={boxGeo(0.004, 0.02, 0.3)} material={m('#3a3f4a', 0.35, 0.7)} position={[0.238, 0.014, 0.03]} />
      {/* front vent strip */}
      <mesh geometry={boxGeo(0.36, 0.006, 0.008)} material={m('#0f1116', 0.6, 0.4)} position={[0, 0.004, 0.208]} />

      {/* port indicators (HDMI + 2×USB-C style dots) */}
      {[-0.08, -0.02, 0.04].map((pz, i) => (
        <mesh key={`pl${i}`} geometry={boxGeo(0.003, 0.006, 0.012)} material={i === 1 ? m('#d4a84b', 0.45, 0.4) : m('#3a4050', 0.5, 0.4)} position={[-0.24, 0.013, pz]} />
      ))}
      {[-0.08, -0.02, 0.04].map((pz, i) => (
        <mesh key={`pr${i}`} geometry={boxGeo(0.003, 0.006, 0.012)} material={i === 1 ? m('#d4a84b', 0.45, 0.4) : m('#3a4050', 0.5, 0.4)} position={[0.24, 0.013, pz]} />
      ))}

      {/* faint cool screen light spilling onto the keys (subtle white) */}
      <pointLight position={[0, 0.12, -0.06]} color="#9fb0cc" intensity={0.16} distance={0.6} />

      {/* === CENTER SCREEN — TradingView chart (thin bezel, webcam) === */}
      <group position={[0, 0.028, -0.14]} rotation={[-0.22, 0, 0]}>
        {/* thin metal hinge bar */}
        <mesh geometry={boxGeo(0.5, 0.006, 0.014)} material={m('#1c2028', 0.45, 0.5)} position={[0, -0.002, 0.005]} />
        {/* bezel */}
        <mesh geometry={boxGeo(0.46, 0.3, 0.014)} material={TRD_BODY} position={[0, 0.16, 0]} castShadow />
        {/* screen border */}
        <mesh geometry={boxGeo(0.44, 0.28, 0.004)} material={TRD_SCREEN} position={[0, 0.16, 0.009]} />
        {/* screen glow */}
        <mesh geometry={boxGeo(0.41, 0.25, 0.002)} material={TRD_SCREEN} position={[0, 0.16, 0.011]} />
        {/* live chart: candles + scales + MA + BUY/SELL + order book strip */}
        <TradingChartUI cx={0} cy={0.16} w={0.41} h={0.25} depth={0.013} />
        {/* webcam dot + lens ring at top center */}
        <mesh geometry={sphereGeo(0.005)} material={m('#0a0c12', 0.4)} position={[0, 0.295, 0.01]} />
        <mesh geometry={torusGeo(0.007, 0.0015)} material={TRD_METAL} position={[0, 0.295, 0.01]} />
      </group>

      {/* === LEFT SCREEN — dense overview chart, facing the user === */}
      <group position={[-0.28, 0.028, -0.14]} rotation={[-0.22, 0, 0]}>
        <mesh geometry={boxGeo(0.3, 0.3, 0.014)} material={TRD_BODY} position={[0, 0.15, 0]} castShadow />
        <mesh geometry={boxGeo(0.28, 0.28, 0.004)} material={TRD_SCREEN} position={[0, 0.15, 0.008]} />
        <DenseChartUI cx={0} cy={0.15} w={0.26} h={0.26} depth={0.011} />
      </group>

      {/* === RIGHT SCREEN — portfolio, slightly angled toward the user === */}
      <group position={[0.28, 0.028, -0.14]} rotation={[-0.22, -0.06, 0]}>
        <mesh geometry={boxGeo(0.3, 0.3, 0.014)} material={TRD_BODY} position={[0, 0.15, 0]} castShadow />
        <mesh geometry={boxGeo(0.28, 0.28, 0.004)} material={TRD_SCREEN} position={[0, 0.15, 0.008]} />
        <PositionsUI cx={0} cy={0.15} w={0.26} h={0.26} depth={0.011} />
      </group>

      {/* visible thin metal arms mounting the side screens */}
      {[-1, 1].map((s) => (
        <group key={`arm${s}`}>
          {[0.24, 0.08].map((ay) => (
            <mesh key={ay} geometry={boxGeo(0.066, 0.004, 0.004)} material={TRD_METAL} position={[s * 0.245, ay, -0.14]} />
          ))}
        </group>
      ))}
    </group>
  )
}
    case 'flower_pot': {
      const potMat = tm('#b85d38', 0.6, 0, 'ceramic')
      const soilMat = m('#3a2416', 0.9)
      const stemMat = m('#4caf50', 0.5)
      const petalMat = m('#e91e63', 0.4)
      const centerMat = m('#ffeb3b', 0.4)
      return (
        <group position={[0, 0, 0]}>
          <mesh geometry={latheGeo([[0.04, 0], [0.05, 0.08], [0.065, 0.12], [0.07, 0.125]])} material={potMat} position={[0, 0, 0]} castShadow />
          <mesh geometry={sphereGeo(0.055)} material={soilMat} position={[0, 0.11, 0]} scale={[1, 0.3, 1]} />
          <mesh geometry={boxGeo(0.008, 0.16, 0.008)} material={stemMat} position={[0, 0.19, 0]} />
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i / 5) * Math.PI * 2
            return (
              <mesh key={`pet-${i}`} geometry={sphereGeo(0.035)} material={petalMat} position={[Math.cos(angle) * 0.03, 0.28, Math.sin(angle) * 0.03]} scale={[1, 0.4, 1]} />
            )
          })}
          <mesh geometry={sphereGeo(0.02)} material={centerMat} position={[0, 0.28, 0]} />
        </group>
      )
    }
    case 'chair_balloon': {
      return <BalloonProp />
    }
    case 'bento_box': {
      const boxMat = tm('#5c3a21', 0.6, 0, 'wood')
      const riceMat = m('#fdfbf7', 0.8)
      const salmonMat = m('#f27d56', 0.5)
      const brocMat = m('#2e7d32', 0.7)
      return (
        <group>
          <mesh geometry={boxGeo(0.32, 0.06, 0.22)} material={boxMat} position={[0, 0.03, 0]} castShadow />
          <mesh geometry={boxGeo(0.13, 0.04, 0.18)} material={riceMat} position={[-0.07, 0.05, 0]} />
          <mesh geometry={boxGeo(0.11, 0.045, 0.09)} material={salmonMat} position={[0.08, 0.051, 0.045]} />
          {[-0.07, 0.03, 0.07].map((bz, idx) => (
            <mesh key={`broc-${idx}`} geometry={sphereGeo(0.022)} material={brocMat} position={[0.08, 0.06, -0.04 + idx * 0.03]} />
          ))}
        </group>
      )
    }
    case 'hourglass': {
      // Vintage brass focus hourglass — transparent pear-shaped glass bulbs
      // with visible wall thickness, golden sand streaming through the neck,
      // 4 lathe-turned brass pillars, walnut plates with brass trim, a wider
      // decorative base with feet and engraved minutes.
      const walnut = tm('#5c3a21', 0.6, 0, 'wood')
      const walnutDark = tm('#4a3319', 0.65, 0, 'wood')
      const brass = m('#b87333', 0.4, 0.6)
      const brassCap = m('#caa24a', 0.35, 0.6)
      const grain = sandGrainTex()
      const sandMat = new MeshStandardMaterial({ color: '#e6c687', roughness: 0.95, metalness: 0, bumpMap: grain, bumpScale: 0.012 })
      const sandMound = new MeshStandardMaterial({ color: '#f2dca8', roughness: 0.95, metalness: 0, bumpMap: grain, bumpScale: 0.01 })
      const glassOuter = new MeshStandardMaterial({ color: '#d4e8f0', transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.05, side: DoubleSide, depthWrite: false })
      const glassInner = new MeshStandardMaterial({ color: '#cfe4ee', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.05, side: DoubleSide, depthWrite: false })
      const streamMat = glowMaterial('#d4a84b', 1.1)
      const streak = glowMaterial('#ffffff', 0.55)
      // pear bulb: narrow neck (y 0) → widest just above neck → taper to plate
      const outerBulb = [[0.014, 0.001], [0.052, 0.02], [0.052, 0.03], [0.04, 0.05], [0.028, 0.068], [0.025, 0.083]]
      const innerBulb = outerBulb.map(([r, y]) => [Math.max(r - 0.004, 0.008), y])
      // lathe-turned column like a chess piece (3 swells)
      const pillarProfile = [
        [0.006, 0], [0.009, 0.0035], [0.006, 0.007],
        [0.0045, 0.025], [0.006, 0.04], [0.009, 0.045], [0.0055, 0.051],
        [0.0045, 0.08], [0.006, 0.095], [0.009, 0.1], [0.0055, 0.106],
        [0.0045, 0.14], [0.006, 0.155], [0.009, 0.16], [0.006, 0.166], [0.005, 0.17],
      ]
      return (
        // shift up so the base feet rest on the surface (bottom at y = 0)
        <group position={[0, 0.098, 0]}>
          {/* wider decorative base: beveled walnut disc + brass rims + feet */}
          <mesh geometry={taperGeo(0.1, 0.085, 0.013)} material={walnutDark} position={[0, -0.0915, 0]} castShadow />
          <mesh geometry={torusGeo(0.098, 0.0035)} material={brass} position={[0, -0.0855, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={torusGeo(0.093, 0.003)} material={brassCap} position={[0, -0.0925, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {[[0.065, 0], [-0.0325, 0.0563], [-0.0325, -0.0563]].map(([fx, fz], i) => (
            <mesh key={`ft${i}`} geometry={boxGeo(0.014, 0.006, 0.024)} material={walnutDark} position={[fx, -0.101, fz]} castShadow />
          ))}
          {/* engraved minutes on the base rim */}
          <Text fontSize={0.007} color="#caa24a" anchorX="center" anchorY="middle" position={[0, -0.0835, 0.082]} rotation={[-Math.PI / 2, 0, 0]}>
            15 · 30 · 60
          </Text>

          {/* top plate: thin walnut disc + brass edge + finial knob */}
          <mesh geometry={taperGeo(0.075, 0.075, 0.006)} material={walnut} position={[0, 0.088, 0]} castShadow />
          <mesh geometry={torusGeo(0.073, 0.003)} material={brass} position={[0, 0.089, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={boxGeo(0.004, 0.008, 0.004)} material={brass} position={[0, 0.096, 0]} />
          <mesh geometry={sphereGeo(0.01)} material={brassCap} position={[0, 0.103, 0]} />
          <mesh geometry={sphereGeo(0.005)} material={brass} position={[0, 0.109, 0]} />

          {/* 4 slim lathe-turned brass pillars with cap rings */}
          {[[-0.0495, -0.0495], [0.0495, -0.0495], [-0.0495, 0.0495], [0.0495, 0.0495]].map(([px, pz], i) => (
            <group key={`p${i}`}>
              <mesh geometry={latheGeo(pillarProfile)} material={brass} position={[px, -0.085, pz]} />
              <mesh geometry={torusGeo(0.008, 0.002)} material={brassCap} position={[px, 0.084, pz]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={torusGeo(0.008, 0.002)} material={brassCap} position={[px, -0.084, pz]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
          ))}

          {/* glass bulbs — inner + outer shells for visible wall thickness */}
          <mesh geometry={latheGeo(outerBulb)} material={glassOuter} />
          <mesh geometry={latheGeo(innerBulb)} material={glassInner} />
          <mesh geometry={latheGeo(outerBulb)} material={glassOuter} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={latheGeo(innerBulb)} material={glassInner} rotation={[Math.PI, 0, 0]} />

          {/* brass caps where glass meets the plates */}
          <mesh geometry={torusGeo(0.029, 0.004)} material={brassCap} position={[0, 0.084, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={torusGeo(0.029, 0.004)} material={brassCap} position={[0, -0.084, 0]} rotation={[Math.PI / 2, 0, 0]} />

          {/* sand — top bulb nearly empty (inverted cone at the neck), bottom
              mound with ~34° angle of repose */}
          <mesh geometry={coneGeo(0.018, 0.026)} material={sandMat} position={[0, 0.016, 0]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={coneGeo(0.019, 0.028)} material={sandMound} position={[0, -0.0575, 0]} />

          {/* visible sand stream through the neck (thin, slightly curling) */}
          {[[0.002, -0.009, 0.001], [-0.009, -0.02, -0.001], [-0.02, -0.031, 0.0008], [-0.031, -0.0435, -0.0005]].map(([y1, y2, ox], i) => (
            <mesh key={`s${i}`} geometry={boxGeo(0.0028, y1 - y2, 0.0028)} material={streamMat} position={[ox, (y1 + y2) / 2, 0]} />
          ))}

          {/* white specular streaks catching the light on each bulb */}
          <mesh geometry={boxGeo(0.0025, 0.035, 0.0025)} material={streak} position={[0.047, 0.03, 0.012]} rotation={[0, 0, 0.25]} />
          <mesh geometry={boxGeo(0.0025, 0.035, 0.0025)} material={streak} position={[0.047, -0.03, 0.012]} rotation={[0, 0, 0.25]} />
        </group>
      )
    }
case 'book_stack': {
  const wornRough = (hex: string, wear = 0.75) => tm(hex, wear, 0.02, 'leather')
  const wornPaper = (hex: string, wear = 0.85) => tm(hex, wear, 0, 'paper')
  const spineGold = m('#d4a84b', 0.45, 0.4)
  const darkInk = m('#2a1f14', 0.85)
  const clothRed = wornRough('#8b1a1a', 0.7)
  const clothNavy = wornRough('#1e3a5f', 0.7)
  const clothGreen = wornRough('#2d5a3d', 0.7)
  const clothBrown = wornRough('#5c3a21', 0.72)
  const clothBurgundy = wornRough('#6b2d3e', 0.72)
  const clothCharcoal = wornRough('#3a3d42', 0.68)
  const clothGold = wornRough('#b8942e', 0.7)
  const clothCream = wornPaper('#f5eedf', 0.75)
  const leatherDark = wornRough('#3d1f0e', 0.65)
  const moroccoRed = wornRough('#a03030', 0.58)
  const vellumMat = wornPaper('#f0e8d0', 0.9)
  const clothLavender = wornRough('#7b6b8a', 0.7)
  const clothTeal = wornRough('#2d6b6b', 0.7)
  const clothOlive = wornRough('#5a6030', 0.7)
  const clothMaroon = wornRough('#6e2a30', 0.7)
  const clothIndigo = wornRough('#3a3070', 0.7)
  const clothPlum = wornRough('#5a3060', 0.7)
  const clothRust = wornRough('#8b4513', 0.7)
  const clothSlate = wornRough('#4a5568', 0.7)
  const clothWillow = wornRough('#6b7b3a', 0.7)
  const linenMat = wornPaper('#ede4d3', 0.8)
  const marbledEdge = m('#d4c5b2', 0.4)

  const foreEdge = wornPaper('#b8a58c', 0.72)
  const pageEdge = wornPaper('#c8b89a', 0.8)
  const endpaperRed = m('#c03030', 0.6)
  const endpaperBlue = m('#3050a0', 0.6)
  const endpaperGold = m('#d4a030', 0.5)
  const endpaperGreen = m('#30a050', 0.6)
  const wearDark = m('#1a1510', 0.9)
  const wearMark = m('#3a3028', 0.85)
  const goldTool = m('#e8c84a', 0.35, 0.5)
  const goldFine = m('#f0d860', 0.3, 0.55)

  interface BookDef {
    title: string
    author: string
    width: number
    depth: number
    thickness: number
    color: ReturnType<typeof wornRough>
    spineTex: ReturnType<typeof wornPaper>
    spinePatina: ReturnType<typeof m>
    endpaper: ReturnType<typeof m>
    hasCloth: boolean
    hasLeather: boolean
    hasMarbled: boolean
    tiltX: number
    tiltZ: number
    ribbon?: string
    ribbonColor?: string
    wearSpots?: [number, number, number][]
  }

  const bookDefs: BookDef[] = [
    { title: 'THE ILIAD', author: 'Homer', width: 0.30, depth: 0.21, thickness: 0.025, color: clothNavy, spineTex: clothCream, spinePatina: m('#d4a030', 0.5, 0.3), endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0, tiltZ: 0, ribbon: '#c03030', wearSpots: [[0.08, 0.005, 0.06], [-0.06, 0.003, 0.04]] },
    { title: 'MIDDLEMARCH', author: 'George Eliot', width: 0.28, depth: 0.19, thickness: 0.032, color: leatherDark, spineTex: wornPaper('#e8dcc8', 0.8), spinePatina: spineGold, endpaper: endpaperGold, hasCloth: false, hasLeather: true, hasMarbled: true, tiltX: 0.03, tiltZ: 0.02, wearSpots: [[0.07, 0.004, 0.05]] },
    { title: 'SHAKESPEARE', author: 'Complete Works', width: 0.34, depth: 0.23, thickness: 0.048, color: clothRed, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: -0.02, tiltZ: 0.03, ribbon: '#f0d030', ribbonColor: '#f0d030', wearSpots: [[0.09, 0.006, 0.07], [-0.05, 0.003, 0.03]] },
    { title: 'PARADISE LOST', author: 'John Milton', width: 0.29, depth: 0.20, thickness: 0.027, color: clothBrown, spineTex: clothCream, spinePatina: m('#c8942a', 0.5, 0.3), endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.01, tiltZ: -0.01, wearSpots: [[0.06, 0.004, 0.05]] },
    { title: 'PRIDE & PREJUDICE', author: 'Jane Austen', width: 0.26, depth: 0.18, thickness: 0.022, color: clothBurgundy, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: 0.04, tiltZ: -0.02, ribbon: '#4a90c0', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'THE ODYSSEY', author: 'Homer', width: 0.28, depth: 0.19, thickness: 0.024, color: clothGreen, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.01, tiltZ: 0.01, wearSpots: [[0.07, 0.004, 0.06]] },
    { title: 'A TALE OF TWO CITIES', author: 'Dickens', width: 0.31, depth: 0.22, thickness: 0.028, color: clothCharcoal, spineTex: clothCream, spinePatina: m('#e0c878', 0.55, 0.3), endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0, tiltZ: 0, ribbon: '#c03030', wearSpots: [[0.08, 0.005, 0.05], [-0.04, 0.003, 0.03]] },
    { title: 'REBECCA', author: 'Daphne du Maurier', width: 0.27, depth: 0.185, thickness: 0.024, color: moroccoRed, spineTex: vellumMat, spinePatina: spineGold, endpaper: endpaperGold, hasCloth: false, hasLeather: true, hasMarbled: true, tiltX: 0.02, tiltZ: -0.03, wearSpots: [[0.06, 0.004, 0.04]] },
    { title: 'WUTHERING HEIGHTS', author: 'Emily Brontë', width: 0.27, depth: 0.185, thickness: 0.023, color: clothLavender, spineTex: clothCream, spinePatina: m('#a08040', 0.5, 0.25), endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.03, tiltZ: 0.02, ribbon: '#6b8e6b', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'ANNA KARENINA', author: 'Leo Tolstoy', width: 0.32, depth: 0.22, thickness: 0.040, color: clothOlive, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.01, tiltZ: -0.01, wearSpots: [[0.08, 0.005, 0.06], [-0.05, 0.003, 0.03]] },
  ]
  const rightBookDefs: BookDef[] = [
    { title: 'THE GREAT GATSBY', author: 'F. Scott Fitzgerald', width: 0.25, depth: 0.175, thickness: 0.020, color: clothPlum, spineTex: clothCream, spinePatina: m('#c0a050', 0.5, 0.35), endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.03, tiltZ: 0.02, ribbon: '#2080b0', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'JANE EYRE', author: 'Charlotte Brontë', width: 0.27, depth: 0.185, thickness: 0.026, color: clothTeal, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.02, tiltZ: -0.02, wearSpots: [[0.06, 0.004, 0.05]] },
    { title: 'THE PICTURE OF DORIAN GRAY', author: 'Oscar Wilde', width: 0.28, depth: 0.19, thickness: 0.024, color: clothRust, spineTex: clothCream, spinePatina: m('#e8c060', 0.55, 0.3), endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: 0, tiltZ: 0.01, ribbon: '#2a2a5e', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'CRIME AND PUNISHMENT', author: 'Fyodor Dostoevsky', width: 0.29, depth: 0.20, thickness: 0.030, color: clothSlate, spineTex: clothCream, spinePatina: m('#c8a848', 0.5, 0.35), endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.02, tiltZ: 0.02, wearSpots: [[0.06, 0.004, 0.05]] },
    { title: 'THE SCARLET LETTER', author: 'Nathaniel Hawthorne', width: 0.26, depth: 0.18, thickness: 0.021, color: clothMaroon, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: -0.01, tiltZ: -0.03, ribbon: '#c03030', wearSpots: [[0.05, 0.003, 0.04]] },
    { title: 'WAR AND PEACE', author: 'Leo Tolstoy', width: 0.35, depth: 0.24, thickness: 0.046, color: clothIndigo, spineTex: clothCream, spinePatina: spineGold, endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.03, tiltZ: 0.01, ribbon: '#d4a030', wearSpots: [[0.09, 0.006, 0.07], [-0.05, 0.003, 0.03]] },
    { title: 'THE COMPLETE POEMS', author: 'John Keats', width: 0.25, depth: 0.175, thickness: 0.019, color: clothWillow, spineTex: clothCream, spinePatina: m('#b08040', 0.5, 0.25), endpaper: endpaperGreen, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0, tiltZ: 0.03, wearSpots: [[0.04, 0.003, 0.03]] },
    { title: 'THE WAVES', author: 'Virginia Woolf', width: 0.24, depth: 0.17, thickness: 0.018, color: linenMat, spineTex: linenMat, spinePatina: m('#8a7a6a', 0.4, 0.1), endpaper: endpaperGold, hasCloth: true, hasLeather: false, hasMarbled: false, tiltX: -0.02, tiltZ: 0.02, ribbon: '#c07040', wearSpots: [[0.04, 0.002, 0.03]] },
    { title: 'MOBY-DICK', author: 'Herman Melville', width: 0.30, depth: 0.21, thickness: 0.036, color: clothGold, spineTex: clothCream, spinePatina: m('#5a3a10', 0.5, 0.3), endpaper: endpaperRed, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.01, tiltZ: 0.01, wearSpots: [[0.07, 0.004, 0.05]] },
    { title: 'LES MISÉRABLES', author: 'Victor Hugo', width: 0.33, depth: 0.22, thickness: 0.042, color: clothBurgundy, spineTex: clothCream, spinePatina: m('#c0a030', 0.55, 0.35), endpaper: endpaperBlue, hasCloth: true, hasLeather: false, hasMarbled: true, tiltX: 0.02, tiltZ: -0.01, ribbon: '#4a90c0', wearSpots: [[0.08, 0.005, 0.06], [-0.04, 0.003, 0.03]] },
  ]

  const buildStack = (books: BookDef[], baseX: number) => {
    const nodes: React.ReactNode[] = []
    let yAcc = 0.009

    books.forEach((b, i) => {
      const tiltX = b.tiltX
      const tiltZ = b.tiltZ
      const cx = baseX + tiltZ * 0.5
      const cz = tiltX * 0.5
      const halfW = b.width / 2
      const halfD = b.depth / 2
      const midY = yAcc + b.thickness / 2
      const spineSide = -halfW - (b.hasLeather ? 0.007 : 0.005)
      const clampX = -halfW
      const dotSideZ = 1

      nodes.push(
        <group key={`book-${baseX}-${i}`} position={[cx, midY, cz]} rotation={[tiltX, 0, tiltZ]}>
          <mesh geometry={boxGeo(b.width, b.thickness, b.depth)} material={b.color} position={[0, 0, 0]} />
          <mesh geometry={boxGeo(b.width * 0.02, b.thickness * 0.9, b.depth * 0.02)} material={foreEdge} position={[halfW - 0.001, 0, 0]} />
          {b.hasCloth && <mesh geometry={boxGeo(0.004, b.thickness + 0.001, b.depth)} material={b.color} position={[clampX, 0, 0]} />}
          {b.hasLeather && (
            <mesh
              geometry={boxGeo(0.005, b.thickness + 0.0008, b.depth + 0.001)}
              material={b.color}
              position={[clampX + dotSideZ * 0.001, 0, 0]}
            />
          )}
          <group position={[spineSide, 0, 0]}>
            <mesh geometry={boxGeo(0.001, b.thickness + 0.0002, b.depth)} material={b.spineTex} />
            {Array.from({ length: 10 }).map((_, bi) => {
              const bandY = -b.thickness / 2 + (bi + 1) * (b.thickness / 11)
              return <mesh key={`band-${bi}`} geometry={boxGeo(0.0018, 0.0018, b.depth + 0.004)} material={b.spinePatina} position={[dotSideZ * 0.001, bandY, 0]} />
            })}
            <mesh geometry={boxGeo(0.0018, b.thickness * 0.22, b.depth * 0.7)} material={spineGold} position={[dotSideZ * 0.001, b.thickness * 0.42, 0]} />
            <mesh geometry={boxGeo(0.0018, b.thickness * 0.14, b.depth * 0.6)} material={spineGold} position={[dotSideZ * 0.001, b.thickness * 0.22, 0]} />
            <mesh geometry={boxGeo(0.0012, b.thickness * 0.08, b.depth * 0.5)} material={goldTool} position={[dotSideZ * 0.001, b.thickness * 0.55, 0]} />
            <mesh geometry={boxGeo(0.0012, b.thickness * 0.06, b.depth * 0.45)} material={goldFine} position={[dotSideZ * 0.001, b.thickness * 0.65, 0]} />
            {b.hasMarbled && (
              <>
                <mesh geometry={boxGeo(0.0016, b.thickness * 0.06, b.depth * 0.85)} material={marbledEdge} position={[dotSideZ * 0.001, b.thickness * 0.48, 0]} />
                <mesh geometry={boxGeo(0.0016, b.thickness * 0.06, b.depth * 0.85)} material={marbledEdge} position={[dotSideZ * 0.001, -b.thickness * 0.48, 0]} />
                <mesh geometry={boxGeo(0.0014, b.thickness * 0.04, b.depth * 0.75)} material={marbledEdge} position={[dotSideZ * 0.001, b.thickness * 0.35, 0]} />
                <mesh geometry={boxGeo(0.0014, b.thickness * 0.04, b.depth * 0.75)} material={marbledEdge} position={[dotSideZ * 0.001, -b.thickness * 0.35, 0]} />
              </>
            )}
            {[b.depth * 0.38, -b.depth * 0.38].map((dz) => (
              <mesh key={`dot-${dz}`} geometry={sphereGeo(0.0015)} material={spineGold} position={[dotSideZ * 0.001, b.thickness * 0.42, dz]} />
            ))}
            {[b.depth * 0.25, -b.depth * 0.25].map((dz) => (
              <mesh key={`dot2-${dz}`} geometry={sphereGeo(0.001)} material={goldFine} position={[dotSideZ * 0.001, b.thickness * 0.58, dz]} />
            ))}
            <mesh geometry={boxGeo(0.001, b.thickness * 0.12, b.depth * 0.5)} material={b.endpaper} position={[dotSideZ * 0.001, b.thickness * 0.7, 0]} />
            <mesh geometry={boxGeo(0.001, b.thickness * 0.12, b.depth * 0.5)} material={b.endpaper} position={[dotSideZ * 0.001, -b.thickness * 0.7, 0]} />
          </group>
          {b.ribbon && (
            <group position={[b.width * 0.22, -b.thickness / 2 - 0.0005, 0]}>
              <mesh geometry={boxGeo(0.007, b.thickness * 0.45, 0.004)} material={m(b.ribbon, 0.7, 0.05)} />
              <mesh geometry={boxGeo(0.006, 0.06, 0.003)} material={m(b.ribbon, 0.65, 0.05)} position={[0, -b.thickness * 0.22, 0.002]} />
              <mesh geometry={boxGeo(0.003, 0.03, 0.002)} material={m(b.ribbon, 0.6, 0.05)} position={[0.002, -b.thickness * 0.35, 0.003]} />
            </group>
          )}
          {b.wearSpots && b.wearSpots.map(([wx, wy, wz], wi) => (
            <mesh key={`wear-${i}-${wi}`} geometry={sphereGeo(0.003)} material={wearDark} position={[wx, wy, wz]} />
          ))}
          <mesh geometry={boxGeo(b.width * 0.02, b.thickness * 0.5, b.depth * 0.02)} material={wearMark} position={[clampX + 0.002, 0, halfD - 0.01]} />
          <mesh geometry={boxGeo(b.width * 0.02, b.thickness * 0.5, b.depth * 0.02)} material={wearMark} position={[clampX + 0.002, 0, -halfD + 0.01]} />
          {Array.from({ length: 8 }).map((_, pi) => {
            const py = -b.thickness / 2 + (pi + 0.5) * (b.thickness / 8)
            return <mesh key={`page-${pi}`} geometry={boxGeo(b.width * 0.98, 0.0008, b.depth * 0.95)} material={pageEdge} position={[0, py, 0]} />
          })}
          <mesh geometry={boxGeo(b.width * 0.015, b.thickness * 0.9, b.depth * 0.01)} material={goldTool} position={[halfW - 0.002, 0, 0]} />
          <mesh geometry={boxGeo(b.width * 0.015, b.thickness * 0.9, b.depth * 0.01)} material={goldTool} position={[-halfW + 0.002, 0, 0]} />
        </group>,
      )
      yAcc += b.thickness
    })

    const stackW = 0.36
    const stackD = 0.26
    return (
      <group key={`stack-${baseX}`} position={[baseX, 0, 0]}>
        <mesh geometry={boxGeo(stackW, 0.012, stackD)} material={foreEdge} position={[0, 0.006, 0]} castShadow />
        <mesh geometry={boxGeo(stackW * 0.95, 0.002, stackD * 0.95)} material={wearMark} position={[0, 0.003, 0]} />
        {nodes}
      </group>
    )
  }

  const LEFT_X = -0.26
  const RIGHT_X = 0.26

  return (
    <group position={[0, 0, 0]}>
      {buildStack(bookDefs, LEFT_X)}
      {buildStack(rightBookDefs, RIGHT_X)}
    </group>
  )
}
  case 'do_not_disturb_poster': {
    const postMat = tm('#4a2e1a', 0.6, 0, 'wood')
    const signMat = tm('#faf6f0', 0.75, 0, 'paper')
    const textMat = m('#a02020', 0.7)
    const accentMat = m('#1a1a1a', 0.8)
    return (
      <group>
        <mesh geometry={boxGeo(0.04, 0.75, 0.04)} material={postMat} position={[0, 0.375, 0]} />
        <mesh geometry={boxGeo(0.18, 0.02, 0.18)} material={postMat} position={[0, 0.01, 0]} />
        <mesh geometry={boxGeo(0.5, 0.36, 0.012)} material={signMat} position={[0, 0.72, 0]} />
        <mesh geometry={boxGeo(0.52, 0.38, 0.006)} material={textMat} position={[0, 0.72, 0.003]} />
        <mesh geometry={boxGeo(0.46, 0.32, 0.006)} material={textMat} position={[0, 0.72, 0.003]} />
        <mesh geometry={boxGeo(0.44, 0.1, 0.001)} material={accentMat} position={[0, 0.80, 0.004]} />
        <mesh geometry={boxGeo(0.44, 0.027, 0.001)} material={textMat} position={[0, 0.76, 0.004]} />
        <mesh geometry={boxGeo(0.44, 0.027, 0.001)} material={textMat} position={[0, 0.84, 0.004]} />
        <mesh geometry={boxGeo(0.30, 0.05, 0.001)} material={textMat} position={[0, 0.66, 0.004]} />
        <mesh geometry={boxGeo(0.04, 0.04, 0.001)} material={textMat} position={[0, 0.90, 0.004]} />
        <mesh geometry={boxGeo(0.04, 0.04, 0.001)} material={textMat} position={[0.09, 0.90, 0.004]} />
        <mesh geometry={boxGeo(0.04, 0.04, 0.001)} material={textMat} position={[-0.09, 0.90, 0.004]} />
      </group>
    )
  }
  case 'trading_desktop_3side': {
    const frameMat = tm('#141820', 0.35, 0.2, 'wood')
    const standMat = tm('#1c1c22', 0.38, 0.22, 'wood')
    const bgMat = m('#06080c', 0.95)
    return (
      <group>
        <mesh geometry={boxGeo(0.72, 0.015, 0.35)} material={standMat} position={[0, 0.007, 0]} castShadow />
        {/* center — primary chart panel with price/time scales */}
        <group position={[0, 0.16, 0]}>
          <mesh geometry={boxGeo(0.02, 0.28, 0.32)} material={frameMat} position={[0, 0.14, 0]} castShadow />
          <mesh geometry={boxGeo(0.003, 0.24, 0.28)} material={bgMat} position={[0.008, 0.14, 0]} />
          <group position={[0.008, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
            <TradingChartUI cx={0} cy={0} w={0.22} h={0.22} depth={0.002} />
          </group>
        </group>
        {/* left — labeled order book */}
        <group position={[-0.27, 0.16, 0]}>
          <mesh geometry={boxGeo(0.02, 0.28, 0.32)} material={frameMat} position={[0, 0.14, 0]} castShadow />
          <mesh geometry={boxGeo(0.003, 0.24, 0.28)} material={bgMat} position={[0.008, 0.14, 0]} />
          <group position={[0.008, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
            <OrderBookUI cx={0} cy={0} w={0.22} h={0.24} depth={0.002} />
          </group>
        </group>
        {/* right — positions panel */}
        <group position={[0.27, 0.16, 0]}>
          <mesh geometry={boxGeo(0.02, 0.28, 0.32)} material={frameMat} position={[0, 0.14, 0]} castShadow />
          <mesh geometry={boxGeo(0.003, 0.24, 0.28)} material={bgMat} position={[0.008, 0.14, 0]} />
          <group position={[0.008, 0.14, 0]} rotation={[0, Math.PI / 2, 0]}>
            <PositionsUI cx={0} cy={0} w={0.22} h={0.24} depth={0.002} />
          </group>
        </group>
      </group>
    )
  }
  default:
      return null
  }
}

/** Circular studio dining table. The single chosen accessory sits on top. */
export function BigDiningTable({ accessory }: { accessory?: string }) {
  const R = 1.18
  const H = 0.92
  const wood = tm('#6b4a2e', 0.6, 0, 'wood', 3, 1)
  const woodDark = tm('#4f3621', 0.65, 0, 'wood', 3, 1)
  const inlay = m('#caa24a', 0.4, 0.3)
  const top = accessory ? <group position={[0, H + 0.03, 0]} scale={1.5}><AccessoryModel id={accessory as AccessoryId} /></group> : null
  return (
    <group>
      {/* round top */}
      <mesh geometry={taperGeo(R, R, 0.06)} material={wood} position={[0, H, 0]} castShadow />
      {/* bevelled edge */}
      <mesh geometry={torusGeo(R, 0.025, 12, 48)} material={woodDark} position={[0, H + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* gold inlay ring on the surface */}
      <mesh geometry={torusGeo(R * 0.62, 0.012, 10, 48)} material={inlay} position={[0, H + 0.032, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* pedestal */}
      <mesh geometry={taperGeo(0.14, 0.2, H - 0.06)} material={woodDark} position={[0, (H - 0.06) / 2, 0]} castShadow />
      {/* foot */}
      <mesh geometry={taperGeo(0.52, 0.52, 0.05)} material={wood} position={[0, 0.025, 0]} castShadow />
      {top}
    </group>
  )
}

/** A small study desk holding the equipped accessories, parented to the avatar so
 *  it travels with the character (visible in the library hall). */
export function AccessoryTray({ accessories }: { accessories?: string[] }) {
  const ids = (accessories ?? []).filter((a) => ACCESSORIES.some((d) => d.id === a)) as AccessoryId[]
  if (ids.length === 0) return null

  const cols = Math.min(4, ids.length)
  const rows = Math.ceil(ids.length / cols)
  const slot = 0.46
  const deskW = cols * slot + 0.18
  const deskD = rows * slot + 0.18
  const deskTop = 0.2

  return (
    <group>
      {/* desk top */}
      <mesh geometry={boxGeo(deskW, 0.03, deskD)} material={tm('#6b4a2e', 0.7, 0, 'wood', 3, 1)} position={[0, deskTop, 0]} castShadow />
      {/* legs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} geometry={boxGeo(0.04, deskTop, 0.04)} material={tm('#4f3621', 0.7, 0, 'wood', 1, 1)}
          position={[sx * (deskW / 2 - 0.05), deskTop / 2, sz * (deskD / 2 - 0.05)]} />
      ))}
      {ids.map((id, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = (col - (cols - 1) / 2) * slot
        const z = (row - (rows - 1) / 2) * slot
        return (
          <group key={`${id}-${i}`} position={[x, deskTop + 0.015, z]}>
            <AccessoryModel id={id} />
          </group>
        )
      })}
    </group>
  )
}
