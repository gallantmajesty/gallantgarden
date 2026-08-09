import { useMemo, useRef } from 'react'
import { Euler, Quaternion, CanvasTexture, DoubleSide, SRGBColorSpace, type MeshStandardMaterial } from 'three'
import { useFrame } from '@react-three/fiber'
import { groundTables, TABLE, upperTables } from './furniture'
import { useScenePreset } from '../../store/quality'
import { useSettings } from '../../store/settings'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from './Instanced'
import { throttle } from '../../lib/frameThrottle'

const WOOD = '#3b2718'
const WOOD_DARK = '#241608'
const CLOTH = '#2f5c4a'
const BOOK_COLORS = ['#7c2f2f', '#2f5c4a', '#34507a', '#8a6d2f', '#5a3a6e']
// magical table accent — warm, wizarding-library gilded trim (no sci-fi cyan)
const BRASS_TRIM = '#caa14a'     // aged gilded edge banding
const BRASS_EMISSIVE = '#6e4a14'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** rotate a local (x,z) offset by a Y-rotation `a` (same convention as the
 *  instanced-mesh rotation, so an instance's own rotY keeps box faces aligned). */
function rot(lx: number, lz: number, a: number): [number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [lx * c + lz * s, -lx * s + lz * c]
}

const CHAIR_CZ = [-TABLE.l / 2 + 1.4, -TABLE.l / 6, TABLE.l / 6, TABLE.l / 2 - 1.4]

// A chair is built from rounded wooden parts (a Windsor-style reading chair)
// instead of flat boxes: a padded seat, tapered cylinder legs, two back posts,
// top + mid rails, vertical spindles and armrests. All parts collapse into a
// handful of instanced draws for the whole hall (see the JSX below).
const CHAIR_WOOD = '#6b4423'

/**
 * All reading tables (ground + upper).
 *
 * PERFORMANCE: the chairs (8 per table × ~16 tables × 6 boxes ≈ 770 meshes) and
 * the table frames (top, runner, 4 legs) used to be one mesh each — well over a
 * thousand draw calls. They are now built as a few INSTANCED meshes for the whole
 * hall. The tabletops are kept CLEAR so users can place their own accessories;
 * the magical look comes from emissive rune inlays, gilded trim and a floor
 * underglow (see the helper components at the bottom of this file).
 */
export function StudyTables() {
  const preset = useScenePreset()
  const lampLights = preset.lampLights
  const tables = useMemo(() => {
    const g = groundTables().map((p, i) => ({ ...p, seed: 1000 + i, idx: i }))
    const u = upperTables().map((p, i) => ({ ...p, seed: 5000 + i, idx: 100 + i }))
    return [...g, ...u]
  }, [])

  // ---- instanced structure for every table + chair in the hall ----
  const { frames, seatBoxes, cushions, cylParts } = useMemo(() => {
    const frames: BoxItem[] = []
    const seatBoxes: BoxItem[] = []
    const cushions: ShapeItem[] = []
    const cylParts: ShapeItem[] = []
    const { w: W, l: L, h } = TABLE
    for (const t of tables) {
      const [tx, ty, tz] = t.pos
      // table top + cloth runner + 4 legs
      frames.push({ pos: [tx, ty + h, tz], size: [W, 0.12, L], color: WOOD })
      frames.push({ pos: [tx, ty + h + 0.065, tz], size: [0.8, 0.02, L - 0.4], color: CLOTH })
      for (const [lx, lz] of [
        [-W / 2 + 0.15, L / 2 - 0.2],
        [W / 2 - 0.15, L / 2 - 0.2],
        [-W / 2 + 0.15, -L / 2 + 0.2],
        [W / 2 - 0.15, -L / 2 + 0.2],
      ]) {
        frames.push({ pos: [tx + lx, ty + h / 2, tz + lz], size: [0.16, h, 0.16], color: WOOD_DARK })
      }
      // 8 chairs (4 per long side), each facing the table — built as rounded
      // wooden parts, not flat boxes.
      for (const sx of [-1, 1]) {
        const yaw = sx > 0 ? -Math.PI / 2 : Math.PI / 2
        for (const cz of CHAIR_CZ) {
          const cx = tx + sx * (W / 2 + 0.5)
          const ccz = tz + cz
          const [srx, srz] = rot(0, 0, yaw)
          seatBoxes.push({ pos: [cx + srx, ty + 0.43, ccz + srz], size: [0.64, 0.08, 0.58], rotY: yaw, color: CHAIR_WOOD })
          cushions.push({ pos: [cx + srx, ty + 0.45, ccz + srz], scale: [0.3, 0.025, 0.27], rot: [0, yaw, 0], color: CLOTH })
          // tapered legs
          for (const [lx, lz] of [[-0.26, -0.23], [0.26, -0.23], [-0.26, 0.23], [0.26, 0.23]] as const) {
            const [rx, rz] = rot(lx, lz, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.23, ccz + rz], scale: [0.03, 0.46, 0.03], rot: [0, yaw, 0], color: WOOD_DARK })
          }
          // back posts
          for (const lx of [-0.26, 0.26]) {
            const [rx, rz] = rot(lx, -0.23, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.81, ccz + rz], scale: [0.032, 0.62, 0.032], rot: [0, yaw, 0], color: WOOD_DARK })
          }
          // top + mid rails (lie along X)
          {
            const [rx, rz] = rot(0, -0.23, yaw)
            cylParts.push({ pos: [cx + rx, ty + 1.12, ccz + rz], scale: [0.03, 0.52, 0.03], quat: composeYLocal(yaw, 0, 0, Math.PI / 2), color: WOOD_DARK })
          }
          {
            const [rx, rz] = rot(0, -0.24, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.74, ccz + rz], scale: [0.026, 0.52, 0.026], quat: composeYLocal(yaw, 0, 0, Math.PI / 2), color: WOOD_DARK })
          }
          // back spindles
          for (const lx of [-0.13, 0, 0.13]) {
            const [rx, rz] = rot(lx, -0.225, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.8, ccz + rz], scale: [0.016, 0.56, 0.016], rot: [0, yaw, 0], color: CHAIR_WOOD })
          }
          // armrest rails (lie along Z)
          for (const lx of [-0.3, 0.3]) {
            const [rx, rz] = rot(lx, 0, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.72, ccz + rz], scale: [0.025, 0.42, 0.025], quat: composeYLocal(yaw, Math.PI / 2, 0, 0), color: CHAIR_WOOD })
          }
          // armrest supports (front + back)
          for (const lx of [-0.3, 0.3]) {
            for (const lz of [0.18, -0.18]) {
              const [rx, rz] = rot(lx, lz, yaw)
              cylParts.push({ pos: [cx + rx, ty + 0.61, ccz + rz], scale: [0.022, 0.22, 0.022], rot: [0, yaw, 0], color: WOOD_DARK })
            }
          }
        }
      }
    }
    return { frames, seatBoxes, cushions, cylParts }
  }, [tables])

  // spread the limited budget of real lamp-lights evenly across the hall
  const litStep = lampLights > 0 ? Math.max(1, Math.floor(tables.length / lampLights)) : Infinity

  return (
    <group>
      {/* table tops cast shadow (one instanced draw); chairs are smaller — skip
          their shadow to keep the shadow pass cheap. Chairs are now rounded
          Windsor-style parts (seat plank + padded cushion + a single instanced
          draw for every cylinder part across the whole hall). */}
      <InstancedBoxes items={frames} roughness={0.55} metalness={0.05} castShadow receiveShadow />
      <InstancedBoxes items={seatBoxes} roughness={0.6} metalness={0.05} />
      <InstancedShape items={cushions} roughness={0.9}>
        <sphereGeometry args={[1, 16, 12]} />
      </InstancedShape>
      <InstancedShape items={cylParts} roughness={0.55} metalness={0.05}>
        <cylinderGeometry args={[0.85, 1.0, 1, 10]} />
      </InstancedShape>

      {/* Magical table accent: a gilded edge trim around each tabletop. The
          tabletops themselves stay clear for the user's own accessories. */}
      <TableTrim tables={tables} />

      {/* A glowing magic sigil inlaid on each tabletop — a ring + compass-star
          design (distinct from the floor rune). Brighter at night so the tables
          read as enchanted; subtle by day. */}
      <TableSigil tables={tables} />

      {/* a few real point-lights keep the hall warm & enchanted (budget capped
          by lampLights); no object sits on the surface — the glow is ambient */}
      {tables.map((t, i) =>
        Number.isFinite(litStep) && i % litStep === 0 ? (
          <pointLight
            key={t.idx}
            position={[t.pos[0], t.pos[1] + TABLE.h + 0.6, t.pos[2]]}
            intensity={4}
            distance={7}
            decay={2}
            color="#ffd2a0"
          />
        ) : null,
      )}
    </group>
  )
}

// reusable temporaries for composing a parent-Y + local rotation into one
// quaternion (used for the few chair parts that sit inside a rotated group).
const _qA = new Quaternion()
const _qB = new Quaternion()
const _eul = new Euler()
function composeYLocal(yaw: number, lx: number, ly: number, lz: number): [number, number, number, number] {
  _qA.setFromEuler(_eul.set(0, yaw, 0))
  _qB.setFromEuler(_eul.set(lx, ly, lz))
  _qA.multiply(_qB)
  return [_qA.x, _qA.y, _qA.z, _qA.w]
}

interface TableInfo {
  pos: [number, number, number]
  seed: number
  idx: number
}

/** Gilded emissive trim banding running along the top rim of each table. */
function TableTrim({ tables }: { tables: TableInfo[] }) {
  const { w: W, l: L, h: H } = TABLE
  const trim: BoxItem[] = []
  tables.forEach((t) => {
    const x = t.pos[0]
    const y = t.pos[1] + H + 0.125
    const z = t.pos[2]
    const t2 = 0.03
    trim.push(
      { pos: [x, y, z - L / 2], size: [W + t2, 0.012, t2], color: BRASS_TRIM },
      { pos: [x, y, z + L / 2], size: [W + t2, 0.012, t2], color: BRASS_TRIM },
      { pos: [x - W / 2, y, z], size: [t2, 0.012, L + t2], color: BRASS_TRIM },
      { pos: [x + W / 2, y, z], size: [t2, 0.012, L + t2], color: BRASS_TRIM },
    )
  })
  return (
    <InstancedBoxes items={trim} color={BRASS_TRIM} emissive={BRASS_EMISSIVE} emissiveIntensity={0.9} roughness={0.3} metalness={0.8} />
  )
}

/** Glowing magic sigil inlaid on each tabletop: a ring + compass-star design
 *  (different from the floor rune ring). Emissive only — sits a hair above the
 *  clear tabletop so accessories still place fine. Stronger at night. */
function makeTableSigilTexture(): CanvasTexture {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, S, S)
  ctx.translate(S / 2, S / 2)
  ctx.strokeStyle = 'rgba(255,196,120,0.95)'
  ctx.shadowColor = 'rgba(255,170,80,0.95)'
  ctx.shadowBlur = 14
  ctx.lineWidth = 8
  // outer ring
  ctx.beginPath()
  ctx.arc(0, 0, S * 0.42, 0, Math.PI * 2)
  ctx.stroke()
  // inner ring
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(0, 0, S * 0.3, 0, Math.PI * 2)
  ctx.stroke()
  // compass star radiating from centre
  const pts = 12
  ctx.lineWidth = 5
  ctx.beginPath()
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2
    const r = i % 2 === 0 ? S * 0.3 : S * 0.12
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
  // little rune ticks on the outer ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.3)
    ctx.lineTo(Math.cos(a) * S * 0.42, Math.sin(a) * S * 0.42)
    ctx.stroke()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function TableSigil({ tables }: { tables: TableInfo[] }) {
  const { w: W, l: L, h: H } = TABLE
  const tex = useMemo(() => makeTableSigilTexture(), [])
  const matRef = useRef<MeshStandardMaterial>(null)
  // One instanced draw for ALL sigils (was 16 individual transparent circle
  // meshes — 16 transparent sort entries + 16 draw calls every frame).
  const items = useMemo<ShapeItem[]>(
    () => tables.map((t) => ({ pos: [t.pos[0], t.pos[1] + H + 0.12, t.pos[2]], rot: [-Math.PI / 2, 0, 0] })),
    [tables, H],
  )
  useFrame((s) => {
    if (!throttle(20, performance.now())) return
    if (matRef.current) {
      const night = useSettings.getState().nightMode
      const base = night ? 1.6 : 0.5
      matRef.current.emissiveIntensity = base + Math.sin(s.clock.elapsedTime * 0.8) * (night ? 0.4 : 0.1)
    }
  })
  return (
    <InstancedShape
      items={items}
      materialRef={matRef}
      map={tex}
      emissive="#ffb454"
      emissiveMap={tex}
      emissiveIntensity={0.5}
      transparent
      opacity={0.9}
      depthWrite={false}
      side={DoubleSide}
    >
      <circleGeometry args={[Math.min(W, L) * 0.42, 48]} />
    </InstancedShape>
  )
}
