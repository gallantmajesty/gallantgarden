import { Fragment, useMemo } from 'react'
import { DoubleSide } from 'three'
import { groundTables, TABLE, upperTables } from './furniture'
import { useScenePreset } from '../../store/quality'
import { InstancedBoxes, type BoxItem } from './Instanced'

const WOOD = '#5c3a1d'
const WOOD_DARK = '#3a2410'
const CLOTH = '#2f5c4a'
const BOOK_COLORS = ['#7c2f2f', '#2f5c4a', '#34507a', '#8a6d2f', '#5a3a6e']

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

// One chair's parts in chair-local space (before the chair's own Y-rotation).
const CHAIR_PARTS: { pos: [number, number, number]; size: [number, number, number]; color: string }[] = [
  { pos: [0, 0.48, 0], size: [0.52, 0.08, 0.52], color: WOOD }, // seat
  { pos: [0, 0.82, -0.22], size: [0.52, 0.64, 0.08], color: WOOD }, // back
  { pos: [-0.2, 0.24, -0.2], size: [0.06, 0.48, 0.06], color: WOOD_DARK },
  { pos: [0.2, 0.24, -0.2], size: [0.06, 0.48, 0.06], color: WOOD_DARK },
  { pos: [-0.2, 0.24, 0.2], size: [0.06, 0.48, 0.06], color: WOOD_DARK },
  { pos: [0.2, 0.24, 0.2], size: [0.06, 0.48, 0.06], color: WOOD_DARK },
]

/**
 * All reading tables (ground + upper).
 *
 * PERFORMANCE: the chairs (8 per table × ~16 tables × 6 boxes ≈ 770 meshes) and
 * the table frames (top, runner, 4 legs) used to be one mesh each — well over a
 * thousand draw calls. They are now built as a few INSTANCED meshes for the whole
 * hall. Only the small "hero" desk dressing (lamp, books, mug…) stays per-table,
 * is gated by graphics quality, and never casts shadows.
 */
export function StudyTables() {
  const preset = useScenePreset()
  const lampLights = preset.lampLights
  // Desk clutter scales with the Mesh-LOD axis: stacked books appear below max
  // bias (medium+), the full lived-in clutter only at the lowest bias (high).
  const rich = preset.lodBias < 1.5
  const full = preset.pillarDetail
  const tables = useMemo(() => {
    const g = groundTables().map((p, i) => ({ ...p, seed: 1000 + i, idx: i }))
    const u = upperTables().map((p, i) => ({ ...p, seed: 5000 + i, idx: 100 + i }))
    return [...g, ...u]
  }, [])

  // ---- instanced structure for every table + chair in the hall ----
  const { frames, chairs } = useMemo(() => {
    const frames: BoxItem[] = []
    const chairs: BoxItem[] = []
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
      // 8 chairs (4 per long side), each facing the table
      for (const sx of [-1, 1]) {
        const yaw = sx > 0 ? -Math.PI / 2 : Math.PI / 2
        for (const cz of CHAIR_CZ) {
          const cx = tx + sx * (W / 2 + 0.5)
          const ccz = tz + cz
          for (const part of CHAIR_PARTS) {
            const [rx, rz] = rot(part.pos[0], part.pos[2], yaw)
            chairs.push({ pos: [cx + rx, ty + part.pos[1], ccz + rz], size: part.size, rotY: yaw, color: part.color })
          }
        }
      }
    }
    return { frames, chairs }
  }, [tables])

  // spread the limited budget of real lamp-lights evenly across the hall
  const litStep = lampLights > 0 ? Math.max(1, Math.floor(tables.length / lampLights)) : Infinity

  return (
    <group>
      {/* table tops cast shadow (one instanced draw); chairs are smaller — skip
          their shadow to keep the shadow pass cheap */}
      <InstancedBoxes items={frames} roughness={0.55} metalness={0.05} castShadow receiveShadow />
      <InstancedBoxes items={chairs} roughness={0.75} />

      {tables.map((t, i) => (
        <TableDressing key={t.idx} pos={t.pos} seed={t.seed} rich={rich} full={full} light={Number.isFinite(litStep) && i % litStep === 0} />
      ))}
    </group>
  )
}

/** The per-table "hero" props — the signature banker's lamp plus, on higher
 *  quality, the lived-in clutter (books, mug, plant, hourglass…). None of it
 *  casts shadows; the structure above already grounds the tables. */
function TableDressing({ pos, seed, light, rich, full }: { pos: [number, number, number]; seed: number; light: boolean; rich: boolean; full: boolean }) {
  const topY = TABLE.h
  const { l: L } = TABLE
  const rand = useMemo(() => rng(seed), [seed])

  const dressing = useMemo(() => {
    const r = rng(seed + 7)
    return {
      books: Array.from({ length: 3 }, (_, k) => ({
        z: -L / 2 + 1.4 + k * (L / 4),
        x: (r() - 0.5) * 0.5,
        rot: (r() - 0.5) * 0.6,
        color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)],
        h: 0.1 + r() * 0.06,
      })),
      openAt: -L / 2 + 1 + r() * (L - 2),
      potAt: L / 2 - 1.4,
    }
  }, [seed, L])

  return (
    <group position={pos}>
      {/* classic green banker's lamp — the signature look, on at every quality */}
      <group position={[0.55, topY + 0.06, -L / 2 + 1.3]}>
        <mesh position={[0, 0.025, 0]}>
          <cylinderGeometry args={[0.14, 0.16, 0.05, 16]} />
          <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.022, 0.028, 0.36, 10]} />
          <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.42, 20, 1, true, 0, Math.PI]} />
          <meshStandardMaterial color="#1f6b3a" emissive="#2f8a52" emissiveIntensity={0.5} metalness={0.2} roughness={0.35} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color="#fff3d2" emissive="#ffcf8a" emissiveIntensity={2.4} />
        </mesh>
        {light && <pointLight position={[0, 0.32, 0]} intensity={5} distance={6.5} decay={2} color="#ffd2a0" />}
      </group>

      {/* stacked books (medium + high) */}
      {rich &&
        dressing.books.map((b, k) => (
          <group key={k} position={[b.x, topY + 0.06, b.z]} rotation={[0, b.rot, 0]}>
            <mesh position={[0, b.h / 2, 0]}>
              <boxGeometry args={[0.37, b.h, 0.27]} />
              <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.05} />
            </mesh>
            <mesh position={[0.005, b.h / 2, 0]}>
              <boxGeometry args={[0.33, b.h * 0.7, 0.235]} />
              <meshStandardMaterial color="#efe2c0" roughness={0.95} />
            </mesh>
            <mesh position={[-0.186, b.h / 2, 0]}>
              <boxGeometry args={[0.012, b.h * 0.3, 0.16]} />
              <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.35} emissive="#3a2c10" emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}

      {/* the rest of the lived-in clutter — high quality only */}
      {full && (
        <Fragment>
          {/* glass water bottle with a cork cap */}
          <group position={[0.6, topY + 0.06, -L / 6]}>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.32, 14]} />
              <meshStandardMaterial color="#bfe0e8" transparent opacity={0.45} roughness={0.15} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.055, 0.055, 0.2, 12]} />
              <meshStandardMaterial color="#7fb6d6" transparent opacity={0.7} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
              <meshStandardMaterial color="#7a5230" roughness={0.85} />
            </mesh>
          </group>

          {/* ceramic mug */}
          <group position={[-0.55, topY + 0.06, L / 5]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.075, 0.065, 0.16, 14]} />
              <meshStandardMaterial color="#e8e0d4" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
              <meshStandardMaterial color="#5b3a22" roughness={0.6} />
            </mesh>
            <mesh position={[0.09, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.045, 0.012, 6, 12]} />
              <meshStandardMaterial color="#e8e0d4" roughness={0.7} />
            </mesh>
          </group>

          {/* open book */}
          <group position={[-0.4, topY + 0.07, dressing.openAt]} rotation={[0, rand() * 0.6 - 0.3, 0]}>
            <mesh rotation={[-0.12, 0, 0.18]} position={[-0.16, 0, 0]}>
              <boxGeometry args={[0.32, 0.02, 0.42]} />
              <meshStandardMaterial color="#f4ead0" roughness={0.9} side={DoubleSide} />
            </mesh>
            <mesh rotation={[-0.12, 0, -0.18]} position={[0.16, 0, 0]}>
              <boxGeometry args={[0.32, 0.02, 0.42]} />
              <meshStandardMaterial color="#efe2c4" roughness={0.9} side={DoubleSide} />
            </mesh>
          </group>

          {/* potted plant — a proper terracotta pot (body + rim + soil) with a
              rounded leafy bush, evenly-spaced upright leaves and a few blossoms */}
          <group position={[-0.45, topY + 0.06, dressing.potAt]}>
            {/* tapered pot body */}
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.115, 0.085, 0.22, 20]} />
              <meshStandardMaterial color="#b5552f" roughness={0.8} />
            </mesh>
            {/* flared rim lip */}
            <mesh position={[0, 0.225, 0]}>
              <cylinderGeometry args={[0.13, 0.115, 0.04, 20]} />
              <meshStandardMaterial color="#9c4525" roughness={0.8} />
            </mesh>
            {/* dark soil disc */}
            <mesh position={[0, 0.244, 0]}>
              <cylinderGeometry args={[0.108, 0.108, 0.02, 16]} />
              <meshStandardMaterial color="#2e2016" roughness={1} />
            </mesh>
            {/* rounded leafy mound */}
            <mesh position={[0, 0.33, 0]} scale={[1, 0.78, 1]}>
              <icosahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial color="#3f8a3f" roughness={0.9} flatShading />
            </mesh>
            {/* upright leaves, evenly spaced and leaning outward */}
            {Array.from({ length: 6 }, (_, k) => {
              const a = (k / 6) * Math.PI * 2
              return (
                <mesh
                  key={k}
                  position={[Math.cos(a) * 0.075, 0.35, Math.sin(a) * 0.075]}
                  rotation={[Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]}
                >
                  <coneGeometry args={[0.032, 0.2, 5]} />
                  <meshStandardMaterial color={k % 2 ? '#3f8a3f' : '#4fa24a'} roughness={0.9} />
                </mesh>
              )
            })}
            {/* a few blossoms, evenly spaced on top */}
            {Array.from({ length: 3 }, (_, k) => {
              const a = (k / 3) * Math.PI * 2 + 0.5
              return (
                <mesh key={`fl-${k}`} position={[Math.cos(a) * 0.06, 0.43, Math.sin(a) * 0.06]}>
                  <sphereGeometry args={[0.034, 8, 8]} />
                  <meshStandardMaterial color={k === 0 ? '#e8794a' : k === 1 ? '#e6b84a' : '#e85a7a'} roughness={0.8} />
                </mesh>
              )
            })}
          </group>

          {/* hourglass */}
          <group position={[0.62, topY + 0.06, L / 6]}>
            <mesh position={[0, 0.015, 0]}>
              <boxGeometry args={[0.18, 0.03, 0.18]} />
              <meshStandardMaterial color="#5a3d22" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.27, 0]}>
              <boxGeometry args={[0.18, 0.03, 0.18]} />
              <meshStandardMaterial color="#5a3d22" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <coneGeometry args={[0.07, 0.12, 12]} />
              <meshStandardMaterial color="#cfe0e8" transparent opacity={0.4} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.18, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.07, 0.12, 12]} />
              <meshStandardMaterial color="#cfe0e8" transparent opacity={0.4} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.095, 0]}>
              <coneGeometry args={[0.055, 0.08, 10]} />
              <meshStandardMaterial color="#d8b46a" roughness={0.9} />
            </mesh>
          </group>

          {/* notebook with a quill */}
          <group position={[-0.55, topY + 0.07, -L / 6]} rotation={[0, 0.4, 0]}>
            <mesh>
              <boxGeometry args={[0.42, 0.05, 0.3]} />
              <meshStandardMaterial color="#3a5c7a" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.031, 0]}>
              <boxGeometry args={[0.36, 0.01, 0.25]} />
              <meshStandardMaterial color="#f4ead0" roughness={0.95} />
            </mesh>
            <mesh position={[0.05, 0.08, 0]} rotation={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.005, 0.012, 0.34, 6]} />
              <meshStandardMaterial color="#e8e2d2" roughness={0.7} />
            </mesh>
          </group>
        </Fragment>
      )}
    </group>
  )
}
