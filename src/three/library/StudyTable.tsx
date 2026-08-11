import { useMemo, useRef } from 'react'
import { Euler, Quaternion, CanvasTexture, DoubleSide, SRGBColorSpace, Vector2, type MeshStandardMaterial } from 'three'
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

// Inlaid marquetry ring on the tabletop, concentric with the magic sigil — a
// thin darker-wood border that reads as crafted inlay (sits just outside the
// sigil, inset from the edge so it never overhangs the rectangular top).
const INLAY_IN = Math.min(TABLE.w, TABLE.l) * 0.43
const INLAY_OUT = INLAY_IN + 0.045

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

// A real turned-leg profile (radius, height) along Y, normalised to 0..1 so the
// same lathe works for chair legs (scaled ~0.4 tall) and table legs (0.95 tall):
// a foot disc, slender shank, two bulbous turnings and a top block.
const LEG_PROFILE: [number, number][] = [
  [0.055, 0.0], [0.062, 0.015], [0.05, 0.045], [0.042, 0.09],
  [0.036, 0.13], [0.042, 0.19], [0.072, 0.235], [0.09, 0.255],
  [0.072, 0.275], [0.05, 0.34], [0.048, 0.5], [0.052, 0.62],
  [0.072, 0.655], [0.09, 0.675], [0.072, 0.695], [0.05, 0.74],
  [0.046, 0.92], [0.05, 1.0],
]

// The chair crest rail is a shallow arch cut from a large torus: span 0.52 wide
// (matching the back posts at ±0.26), rising gently toward the middle.
const CREST_R = 1.0
const CREST_ARC = 2 * Math.asin(0.26 / CREST_R)
const CREST_END_Y = CREST_R * Math.cos(CREST_ARC / 2)
const CREST_ROT = Math.PI / 2 - CREST_ARC / 2

/** Procedural wood-grain canvas texture (neutral warm brown — tinted per
 *  instance by the material colours). */
function makeWoodTexture(): CanvasTexture {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, S)
  g.addColorStop(0, '#6b4524')
  g.addColorStop(0.5, '#54331b')
  g.addColorStop(1, '#4a2c15')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tones = ['#7a5230', '#5f3a1e', '#3f2410', '#825b34']
  for (let i = 0; i < 110; i++) {
    const x0 = Math.random() * S
    const phase = Math.random() * Math.PI * 2
    const amp = 1 + Math.random() * 2.2
    ctx.strokeStyle = tones[i % tones.length]
    ctx.globalAlpha = 0.12 + Math.random() * 0.35
    ctx.lineWidth = 0.8 + Math.random() * 1.8
    ctx.beginPath()
    ctx.moveTo(x0, 0)
    for (let y = 0; y <= S; y += 16) {
      ctx.lineTo(x0 + Math.sin(y / 26 + phase) * amp + Math.sin(y / 61 + phase * 2) * 1.2, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  for (let k = 0; k < 7; k++) {
    const kx = Math.random() * S
    const ky = Math.random() * S
    const kr = 3 + Math.random() * 7
    ctx.strokeStyle = 'rgba(30,16,8,0.5)'
    ctx.lineWidth = 1.5
    for (let r = 0; r < 3; r++) {
      ctx.beginPath()
      ctx.ellipse(kx, ky, kr + r * 2.4, (kr + r * 2.4) * 0.72, Math.random(), 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(30,16,8,0.65)'
    ctx.beginPath()
    ctx.ellipse(kx, ky, kr * 0.35, kr * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Procedural wood-grain ROUGHNESS map (linear, no colour space): a mid-grey
 *  base with rougher (darker) grain streaks and a few polished (lighter) knots,
 *  so the tabletop picks up light like real planed timber instead of flat plastic. */
function makeWoodRoughnessTexture(): CanvasTexture {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#8c8c8c'
  ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 130; i++) {
    const x0 = Math.random() * S
    const phase = Math.random() * Math.PI * 2
    const amp = 1 + Math.random() * 2.2
    const rough = Math.random() > 0.5
    ctx.strokeStyle = rough ? 'rgba(40,40,40,0.5)' : 'rgba(225,225,225,0.5)'
    ctx.lineWidth = 0.8 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(x0, 0)
    for (let y = 0; y <= S; y += 16) {
      ctx.lineTo(x0 + Math.sin(y / 26 + phase) * amp, y)
    }
    ctx.stroke()
  }
  for (let k = 0; k < 6; k++) {
    const kx = Math.random() * S
    const ky = Math.random() * S
    const kr = 4 + Math.random() * 8
    const g = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr)
    g.addColorStop(0, 'rgba(232,232,232,0.75)')
    g.addColorStop(1, 'rgba(232,232,232,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(kx, ky, kr, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new CanvasTexture(c)
  return tex
}

/** Procedural upholstery-weave texture: cloth base, a subtle thread grid and a
 *  gold piping border (reads as cushion piping + runner edging). */
function makeFabricTexture(): CanvasTexture {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  ctx.fillStyle = CLOTH
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let y = 4; y < S; y += 8) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(S, y)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  for (let x = 4; x < S; x += 8) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, S)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.035)'
  for (let x = 0; x < S; x += 16) {
    for (let y = 0; y < S; y += 16) {
      if ((x + y) % 32 === 0) ctx.fillRect(x, y, 8, 8)
    }
  }
  ctx.strokeStyle = 'rgba(196,158,84,0.8)'
  ctx.lineWidth = 4
  ctx.strokeRect(5, 5, S - 10, S - 10)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

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
  // PERF: shed the tabletop shadow pass at raised LOD bias, same as shelf frames.
  const frameShadows = preset.lodBias < 0.75
  const lampLights = preset.lampLights
  const tables = useMemo(() => {
    const g = groundTables().map((p, i) => ({ ...p, seed: 1000 + i, idx: i }))
    const u = upperTables().map((p, i) => ({ ...p, seed: 5000 + i, idx: 100 + i }))
    return [...g, ...u]
  }, [])

  const woodTex = useMemo(() => makeWoodTexture(), [])
  const fabricTex = useMemo(() => makeFabricTexture(), [])
  const woodRough = useMemo(() => makeWoodRoughnessTexture(), [])
  const legPoints = useMemo(() => LEG_PROFILE.map((p) => new Vector2(p[0], p[1])), [])

  // ---- instanced structure for every table + chair in the hall ----
  const { frames, runnerBoxes, seats, cushions, legs, crests, cylParts, inlay, embroidery, tasselCaps, legCollars, legFeet, cornerBosses } =
    useMemo(() => {
      const frames: BoxItem[] = []
      const runnerBoxes: BoxItem[] = []
      const seats: ShapeItem[] = []
      const cushions: ShapeItem[] = []
      const legs: ShapeItem[] = []
      const crests: ShapeItem[] = []
      const cylParts: ShapeItem[] = []
      const inlay: ShapeItem[] = []
      const embroidery: BoxItem[] = []
      const tasselCaps: BoxItem[] = []
      const legCollars: ShapeItem[] = []
      const legFeet: ShapeItem[] = []
      const cornerBosses: BoxItem[] = []
      const { w: W, l: L, h } = TABLE
    for (const t of tables) {
      const [tx, ty, tz] = t.pos
      // table top + routed edge lip + cloth runner + turned legs
      frames.push({ pos: [tx, ty + h, tz], size: [W, 0.12, L], color: WOOD })
      frames.push({ pos: [tx, ty + h - 0.05, tz], size: [W + 0.06, 0.05, L + 0.06], color: WOOD })
      runnerBoxes.push({ pos: [tx, ty + h + 0.065, tz], size: [0.8, 0.02, L - 0.4] })
      // table legs (turned) + a brass collar near the top and a foot cap at the base
      const legPts: [number, number][] = [
        [-W / 2 + 0.15, L / 2 - 0.2],
        [W / 2 - 0.15, L / 2 - 0.2],
        [-W / 2 + 0.15, -L / 2 + 0.2],
        [W / 2 - 0.15, -L / 2 + 0.2],
      ]
      for (const [lx, lz] of legPts) {
        legs.push({ pos: [tx + lx, ty, tz + lz], scale: [1, h, 1], color: WOOD_DARK })
        legCollars.push({ pos: [tx + lx, ty + h - 0.14, tz + lz], scale: [0.11, 0.07, 0.11] })
        legFeet.push({ pos: [tx + lx, ty + 0.04, tz + lz], scale: [0.13, 0.05, 0.13] })
      }

      // ---- table-only decorative upgrades (additive, no other library changes) ----
      const topY = ty + h + 0.065
      // inlaid marquetry ring on the tabletop, concentric with the magic sigil
      inlay.push({ pos: [tx, topY, tz], rot: [-Math.PI / 2, 0, 0] })
      // cloth runner: a gold centre embroidery line + a tasselled cap at each end
      embroidery.push({ pos: [tx, ty + h + 0.078, tz], size: [0.05, 0.012, L - 0.4] })
      const rz0 = (L - 0.4) / 2
      for (const s of [-1, 1]) {
        tasselCaps.push({ pos: [tx, ty + h + 0.072, tz + s * rz0], size: [0.85, 0.05, 0.14] })
      }
      // brass bosses at the four top corners of the tabletop
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          cornerBosses.push({ pos: [tx + sx * (W / 2 - 0.05), ty + h + 0.07, tz + sz * (L / 2 - 0.05)], size: [0.14, 0.08, 0.14] })
        }
      }
      // apron frame + centre stretcher under the top
      frames.push({ pos: [tx, ty + 0.62, tz + L / 2 - 0.2], size: [W - 0.3, 0.16, 0.05], color: WOOD_DARK })
      frames.push({ pos: [tx, ty + 0.62, tz - L / 2 + 0.2], size: [W - 0.3, 0.16, 0.05], color: WOOD_DARK })
      frames.push({ pos: [tx + W / 2 - 0.15, ty + 0.62, tz], size: [0.05, 0.16, L - 0.45], color: WOOD_DARK })
      frames.push({ pos: [tx - W / 2 + 0.15, ty + 0.62, tz], size: [0.05, 0.16, L - 0.45], color: WOOD_DARK })
      frames.push({ pos: [tx, ty + 0.14, tz], size: [0.06, 0.07, L - 1.4], color: WOOD_DARK })
      // 8 chairs (4 per long side), each facing the table — a real Windsor
      // build: contoured round seat, fabric cushion, turned legs, H-stretcher,
      // seven back spindles, turned posts and a curved crest rail.
      for (const sx of [-1, 1]) {
        const yaw = sx > 0 ? -Math.PI / 2 : Math.PI / 2
        for (const cz of CHAIR_CZ) {
          const cx = tx + sx * (W / 2 + 0.5)
          const ccz = tz + cz
          const [srx, srz] = rot(0, 0, yaw)
          // contoured round seat + fabric cushion
          seats.push({ pos: [cx + srx, ty + 0.4, ccz + srz], scale: [0.34, 0.05, 0.34], rot: [0, yaw, 0], color: CHAIR_WOOD })
          cushions.push({ pos: [cx + srx, ty + 0.44, ccz + srz], scale: [0.32, 0.035, 0.32], rot: [0, yaw, 0] })
          // turned legs
          for (const [lx, lz] of [[-0.26, -0.23], [0.26, -0.23], [-0.26, 0.23], [0.26, 0.23]] as const) {
            const [rx, rz] = rot(lx, lz, yaw)
            legs.push({ pos: [cx + rx, ty, ccz + rz], scale: [0.5, 0.4, 0.5], rot: [0, yaw, 0], color: WOOD_DARK })
          }
          // H-stretcher between the front and back leg pairs
          for (const lz of [0.2, -0.2]) {
            const [rx, rz] = rot(0, lz, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.1, ccz + rz], scale: [0.016, 0.52, 0.016], quat: composeYLocal(yaw, 0, 0, Math.PI / 2), color: WOOD_DARK })
          }
          {
            const [rx, rz] = rot(0, 0, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.1, ccz + rz], scale: [0.016, 0.4, 0.016], quat: composeYLocal(yaw, Math.PI / 2, 0, 0), color: WOOD_DARK })
          }
          // back posts
          for (const lx of [-0.26, 0.26]) {
            const [rx, rz] = rot(lx, -0.23, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.81, ccz + rz], scale: [0.03, 0.62, 0.03], rot: [0, yaw, 0], color: WOOD_DARK })
          }
          // curved crest rail — a shallow arch mortised onto the post tops
          {
            const [rx, rz] = rot(0, -0.23, yaw)
            crests.push({ pos: [cx + rx, ty + 1.12 - CREST_END_Y, ccz + rz], quat: composeYLocal(yaw, 0, 0, CREST_ROT), color: CHAIR_WOOD })
          }
          // back spindles
          for (const lx of [-0.24, -0.16, -0.08, 0, 0.08, 0.16, 0.24]) {
            const [rx, rz] = rot(lx, -0.21, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.77, ccz + rz], scale: [0.013, 0.66, 0.013], rot: [0, yaw, 0], color: CHAIR_WOOD })
          }
          // armrest rails (lie along Z) + supports
          for (const lx of [-0.3, 0.3]) {
            const [rx, rz] = rot(lx, 0, yaw)
            cylParts.push({ pos: [cx + rx, ty + 0.72, ccz + rz], scale: [0.025, 0.42, 0.025], quat: composeYLocal(yaw, Math.PI / 2, 0, 0), color: CHAIR_WOOD })
          }
          for (const lx of [-0.3, 0.3]) {
            for (const lz of [0.18, -0.18]) {
              const [rx, rz] = rot(lx, lz, yaw)
              cylParts.push({ pos: [cx + rx, ty + 0.61, ccz + rz], scale: [0.022, 0.22, 0.022], rot: [0, yaw, 0], color: WOOD_DARK })
            }
          }
        }
      }
    }
    return { frames, runnerBoxes, seats, cushions, legs, crests, cylParts, inlay, embroidery, tasselCaps, legCollars, legFeet, cornerBosses }
  }, [tables])

  // spread the limited budget of real lamp-lights evenly across the hall
  const litStep = lampLights > 0 ? Math.max(1, Math.floor(tables.length / lampLights)) : Infinity

  return (
    <group>
      {/* table tops cast shadow (one instanced draw); chairs are smaller — skip
          their shadow to keep the shadow pass cheap. Wood parts share one
          procedural grain texture (tinted per instance), cushions + runner use
          the fabric weave. */}
      <InstancedBoxes items={frames} roughness={0.55} metalness={0.05} map={woodTex} roughnessMap={woodRough} castShadow={frameShadows} receiveShadow />
      <InstancedBoxes items={runnerBoxes} roughness={0.95} map={fabricTex} />
      <InstancedShape items={seats} roughness={0.55} metalness={0.05} map={woodTex} receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 20]} />
      </InstancedShape>
      <InstancedShape items={cushions} roughness={0.95} map={fabricTex} receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 20]} />
      </InstancedShape>
      <InstancedShape items={legs} roughness={0.55} metalness={0.05} map={woodTex} receiveShadow>
        <latheGeometry args={[legPoints, 12]} />
      </InstancedShape>
      <InstancedShape items={crests} roughness={0.55} metalness={0.05} map={woodTex} receiveShadow>
        <torusGeometry args={[CREST_R, 0.022, 8, 20, CREST_ARC]} />
      </InstancedShape>
      <InstancedShape items={cylParts} roughness={0.55} metalness={0.05} map={woodTex} receiveShadow>
        <cylinderGeometry args={[0.85, 1.0, 1, 10]} />
      </InstancedShape>

      {/* Magical table accent: a gilded edge trim around each tabletop. The
          tabletops themselves stay clear for the user's own accessories. */}
      <TableTrim tables={tables} />

      {/* A glowing magic sigil inlaid on each tabletop — a ring + compass-star design
          (distinct from the floor rune). Brighter at night so the tables
          read as enchanted; subtle by day. */}
      <TableSigil tables={tables} />

      {/* ---- table-only decorative upgrades (additive) ---- */}
      {/* inlaid marquetry ring concentric with the sigil */}
      <InstancedShape items={inlay} color="#7c5a36" roughness={0.4} metalness={0.1} receiveShadow>
        <ringGeometry args={[INLAY_IN, INLAY_OUT, 48]} />
      </InstancedShape>
      {/* cloth runner: gold centre embroidery + tasselled end caps */}
      <InstancedBoxes items={embroidery} color={BRASS_TRIM} emissive={BRASS_EMISSIVE} emissiveIntensity={0.5} roughness={0.4} metalness={0.7} />
      <InstancedBoxes items={tasselCaps} color={BRASS_TRIM} emissive={BRASS_EMISSIVE} emissiveIntensity={0.6} roughness={0.3} metalness={0.8} />
      {/* brass collars + foot caps on each turned leg */}
      <InstancedShape items={legCollars} color={BRASS_TRIM} emissive={BRASS_EMISSIVE} emissiveIntensity={0.5} roughness={0.3} metalness={0.8} receiveShadow>
        <cylinderGeometry args={[0.85, 1.0, 1, 12]} />
      </InstancedShape>
      <InstancedShape items={legFeet} color={BRASS_TRIM} emissive={BRASS_EMISSIVE} emissiveIntensity={0.5} roughness={0.3} metalness={0.8} receiveShadow>
        <cylinderGeometry args={[0.85, 1.0, 1, 12]} />
      </InstancedShape>
      {/* brass bosses at the four top corners */}
      <InstancedBoxes items={cornerBosses} color={BRASS_TRIM} emissive={BRASS_EMISSIVE} emissiveIntensity={0.7} roughness={0.3} metalness={0.8} />

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
  // faint secondary ring for a touch more depth
  ctx.strokeStyle = 'rgba(255,180,90,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, S * 0.36, 0, Math.PI * 2)
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
