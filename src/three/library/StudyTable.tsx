import { useMemo } from 'react'
import { DoubleSide, Euler, Quaternion } from 'three'
import { groundTables, TABLE, upperTables } from './furniture'
import { useScenePreset } from '../../store/quality'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from './Instanced'

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

      {/* ALL desk dressing across the hall as a fixed handful of instanced draws
          (was ~42 loose meshes PER table → ~670 draw calls at high). */}
      <DeskDressing tables={tables} rich={rich} full={full} />

      {/* the few real banker's-lamp point-lights stay per-table (their budget is
          capped by lampLights); only the meshes were the draw-call problem */}
      {tables.map((t, i) =>
        Number.isFinite(litStep) && i % litStep === 0 ? (
          <pointLight
            key={t.idx}
            position={[t.pos[0] + 0.55, t.pos[1] + TABLE.h + 0.06 + 0.32, t.pos[2] - TABLE.l / 2 + 1.3]}
            intensity={5}
            distance={6.5}
            decay={2}
            color="#ffd2a0"
          />
        ) : null,
      )}
    </group>
  )
}

// reusable temporaries for composing a parent-Y + local rotation into one
// quaternion (used for the few clutter parts that sit inside a rotated group).
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

/**
 * Every table's "hero" dressing — banker's lamp, stacked books and (at high) the
 * lived-in clutter (bottle, mug, open book, potted plant, hourglass, notebook) —
 * rendered as instanced batches across the WHOLE hall instead of dozens of loose
 * meshes per table. Geometry, positions and per-table randomisation are identical
 * to the old per-table version (same seeds), so the look is unchanged; only the
 * draw-call count collapses. None of it casts shadows (the table structure
 * already grounds everything).
 */
function DeskDressing({ tables, rich, full }: { tables: TableInfo[]; rich: boolean; full: boolean }) {
  const b = useMemo(() => {
    const lampBases: ShapeItem[] = []
    const lampStems: ShapeItem[] = []
    const lampShades: ShapeItem[] = []
    const lampBulbs: ShapeItem[] = []

    const bookCovers: BoxItem[] = []
    const bookPages: BoxItem[] = []
    const bookSpines: BoxItem[] = []

    const bottleBodies: ShapeItem[] = []
    const bottleWaters: ShapeItem[] = []
    const bottleCorks: ShapeItem[] = []
    const mugBodies: ShapeItem[] = []
    const mugInners: ShapeItem[] = []
    const mugHandles: ShapeItem[] = []
    const openLeaves: ShapeItem[] = []
    const plantBodies: ShapeItem[] = []
    const plantRims: ShapeItem[] = []
    const plantSoils: ShapeItem[] = []
    const plantMounds: ShapeItem[] = []
    const plantLeaves: ShapeItem[] = []
    const plantBlossoms: ShapeItem[] = []
    const hourCaps: BoxItem[] = []
    const hourGlass: ShapeItem[] = []
    const hourSand: ShapeItem[] = []
    const noteBooks: BoxItem[] = []
    const notePages: BoxItem[] = []
    const noteQuills: ShapeItem[] = []

    const L = TABLE.l

    for (const t of tables) {
      const [tx, ty, tz] = t.pos
      const topY = ty + TABLE.h

      // ---- banker's lamp (every table, every quality) ----
      const lx = tx + 0.55
      const ly = topY + 0.06
      const lz = tz - L / 2 + 1.3
      lampBases.push({ pos: [lx, ly + 0.025, lz] })
      lampStems.push({ pos: [lx, ly + 0.2, lz] })
      lampShades.push({ pos: [lx, ly + 0.4, lz], rot: [Math.PI / 2, 0, 0] })
      lampBulbs.push({ pos: [lx, ly + 0.36, lz] })

      // ---- deterministic dressing rng (identical sequence to the old code so
      //      every book/prop lands in exactly the same spot). The full sequence
      //      is always advanced even when a tier isn't rendered, so openAt and
      //      the open-book rotation never shift between quality levels. ----
      const r = rng(t.seed + 7)
      const bookParams = Array.from({ length: 3 }, (_, k) => ({
        z: -L / 2 + 1.4 + k * (L / 4),
        x: (r() - 0.5) * 0.5,
        rot: (r() - 0.5) * 0.6,
        color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)],
        h: 0.1 + r() * 0.06,
      }))
      const openAt = -L / 2 + 1 + r() * (L - 2)
      const potAt = L / 2 - 1.4
      const obRot = rng(t.seed)() * 0.6 - 0.3

      // ---- stacked books (medium + high) ----
      if (rich) {
        for (const bk of bookParams) {
          const baseX = tx + bk.x
          const baseZ = tz + bk.z
          const baseY = topY + 0.06
          bookCovers.push({ pos: [baseX, baseY + bk.h / 2, baseZ], size: [0.37, bk.h, 0.27], rotY: bk.rot, color: bk.color })
          {
            const [rx, rz] = rot(0.005, 0, bk.rot)
            bookPages.push({ pos: [baseX + rx, baseY + bk.h / 2, baseZ + rz], size: [0.33, bk.h * 0.7, 0.235], rotY: bk.rot })
          }
          {
            const [rx, rz] = rot(-0.186, 0, bk.rot)
            bookSpines.push({ pos: [baseX + rx, baseY + bk.h / 2, baseZ + rz], size: [0.012, bk.h * 0.3, 0.16], rotY: bk.rot })
          }
        }
      }

      // ---- lived-in clutter (high only) ----
      if (full) {
        // glass water bottle (body + water + cork)
        {
          const ox = tx + 0.6
          const oy = topY + 0.06
          const oz = tz - L / 6
          bottleBodies.push({ pos: [ox, oy + 0.16, oz] })
          bottleWaters.push({ pos: [ox, oy + 0.12, oz] })
          bottleCorks.push({ pos: [ox, oy + 0.36, oz] })
        }
        // ceramic mug (body + inner + handle)
        {
          const ox = tx - 0.55
          const oy = topY + 0.06
          const oz = tz + L / 5
          mugBodies.push({ pos: [ox, oy + 0.08, oz] })
          mugInners.push({ pos: [ox, oy + 0.1, oz] })
          mugHandles.push({ pos: [ox + 0.09, oy + 0.08, oz], rot: [0, 0, Math.PI / 2] })
        }
        // open book (two leaves) — leaves sit inside a Y-rotated group
        {
          const ox = tx - 0.4
          const oy = topY + 0.07
          const oz = tz + openAt
          for (const [lhx, color, tilt] of [
            [-0.16, '#f4ead0', 0.18],
            [0.16, '#efe2c4', -0.18],
          ] as const) {
            const [rx, rz] = rot(lhx, 0, obRot)
            openLeaves.push({ pos: [ox + rx, oy, oz + rz], quat: composeYLocal(obRot, -0.12, 0, tilt), color })
          }
        }
        // potted plant
        {
          const ox = tx - 0.45
          const oy = topY + 0.06
          const oz = tz + potAt
          plantBodies.push({ pos: [ox, oy + 0.11, oz] })
          plantRims.push({ pos: [ox, oy + 0.225, oz] })
          plantSoils.push({ pos: [ox, oy + 0.244, oz] })
          plantMounds.push({ pos: [ox, oy + 0.33, oz], scale: [1, 0.78, 1] })
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2
            plantLeaves.push({
              pos: [ox + Math.cos(a) * 0.075, oy + 0.35, oz + Math.sin(a) * 0.075],
              rot: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6],
              color: k % 2 ? '#3f8a3f' : '#4fa24a',
            })
          }
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 + 0.5
            plantBlossoms.push({
              pos: [ox + Math.cos(a) * 0.06, oy + 0.43, oz + Math.sin(a) * 0.06],
              color: k === 0 ? '#e8794a' : k === 1 ? '#e6b84a' : '#e85a7a',
            })
          }
        }
        // hourglass (caps + two glass cones + sand)
        {
          const ox = tx + 0.62
          const oy = topY + 0.06
          const oz = tz + L / 6
          hourCaps.push({ pos: [ox, oy + 0.015, oz], size: [0.18, 0.03, 0.18] })
          hourCaps.push({ pos: [ox, oy + 0.27, oz], size: [0.18, 0.03, 0.18] })
          hourGlass.push({ pos: [ox, oy + 0.11, oz] })
          hourGlass.push({ pos: [ox, oy + 0.18, oz], rot: [Math.PI, 0, 0] })
          hourSand.push({ pos: [ox, oy + 0.095, oz] })
        }
        // notebook + quill (inside a Y-rotated group)
        {
          const ox = tx - 0.55
          const oy = topY + 0.07
          const oz = tz - L / 6
          noteBooks.push({ pos: [ox, oy, oz], size: [0.42, 0.05, 0.3], rotY: 0.4 })
          notePages.push({ pos: [ox, oy + 0.031, oz], size: [0.36, 0.01, 0.25], rotY: 0.4 })
          const [qx, qz] = rot(0.05, 0, 0.4)
          noteQuills.push({ pos: [ox + qx, oy + 0.08, oz + qz], quat: composeYLocal(0.4, 0, 0, 0.5) })
        }
      }
    }

    return {
      lampBases, lampStems, lampShades, lampBulbs,
      bookCovers, bookPages, bookSpines,
      bottleBodies, bottleWaters, bottleCorks, mugBodies, mugInners, mugHandles, openLeaves,
      plantBodies, plantRims, plantSoils, plantMounds, plantLeaves, plantBlossoms,
      hourCaps, hourGlass, hourSand, noteBooks, notePages, noteQuills,
    }
  }, [tables, rich, full])

  return (
    <group>
      {/* banker's lamp — base, stem, green shade, glowing bulb */}
      <InstancedShape items={b.lampBases} color="#caa84a" metalness={0.7} roughness={0.3}>
        <cylinderGeometry args={[0.14, 0.16, 0.05, 16]} />
      </InstancedShape>
      <InstancedShape items={b.lampStems} color="#caa84a" metalness={0.7} roughness={0.3}>
        <cylinderGeometry args={[0.022, 0.028, 0.36, 10]} />
      </InstancedShape>
      <InstancedShape items={b.lampShades} color="#1f6b3a" emissive="#2f8a52" emissiveIntensity={0.5} metalness={0.2} roughness={0.35} side={DoubleSide}>
        <cylinderGeometry args={[0.14, 0.14, 0.42, 20, 1, true, 0, Math.PI]} />
      </InstancedShape>
      <InstancedShape items={b.lampBulbs} color="#fff3d2" emissive="#ffcf8a" emissiveIntensity={2.4}>
        <sphereGeometry args={[0.06, 10, 10]} />
      </InstancedShape>

      {/* stacked books — per-instance colour/size */}
      {b.bookCovers.length > 0 && <InstancedBoxes items={b.bookCovers} roughness={0.5} metalness={0.05} />}
      {b.bookPages.length > 0 && <InstancedBoxes items={b.bookPages} color="#efe2c0" roughness={0.95} />}
      {b.bookSpines.length > 0 && <InstancedBoxes items={b.bookSpines} color="#caa84a" metalness={0.6} roughness={0.35} emissive="#3a2c10" emissiveIntensity={0.3} />}

      {/* water bottle */}
      {b.bottleBodies.length > 0 && (
        <>
          <InstancedShape items={b.bottleBodies} color="#bfe0e8" transparent opacity={0.45} roughness={0.15} metalness={0.2}>
            <cylinderGeometry args={[0.07, 0.07, 0.32, 14]} />
          </InstancedShape>
          <InstancedShape items={b.bottleWaters} color="#7fb6d6" transparent opacity={0.7} roughness={0.1}>
            <cylinderGeometry args={[0.055, 0.055, 0.2, 12]} />
          </InstancedShape>
          <InstancedShape items={b.bottleCorks} color="#7a5230" roughness={0.85}>
            <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
          </InstancedShape>
        </>
      )}

      {/* mug */}
      {b.mugBodies.length > 0 && (
        <>
          <InstancedShape items={b.mugBodies} color="#e8e0d4" roughness={0.7}>
            <cylinderGeometry args={[0.075, 0.065, 0.16, 14]} />
          </InstancedShape>
          <InstancedShape items={b.mugInners} color="#5b3a22" roughness={0.6}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
          </InstancedShape>
          <InstancedShape items={b.mugHandles} color="#e8e0d4" roughness={0.7}>
            <torusGeometry args={[0.045, 0.012, 6, 12]} />
          </InstancedShape>
        </>
      )}

      {/* open book leaves — per-instance colour, composed rotation */}
      {b.openLeaves.length > 0 && (
        <InstancedShape items={b.openLeaves} roughness={0.9} side={DoubleSide}>
          <boxGeometry args={[0.32, 0.02, 0.42]} />
        </InstancedShape>
      )}

      {/* potted plant */}
      {b.plantBodies.length > 0 && (
        <>
          <InstancedShape items={b.plantBodies} color="#b5552f" roughness={0.8}>
            <cylinderGeometry args={[0.115, 0.085, 0.22, 20]} />
          </InstancedShape>
          <InstancedShape items={b.plantRims} color="#9c4525" roughness={0.8}>
            <cylinderGeometry args={[0.13, 0.115, 0.04, 20]} />
          </InstancedShape>
          <InstancedShape items={b.plantSoils} color="#2e2016" roughness={1}>
            <cylinderGeometry args={[0.108, 0.108, 0.02, 16]} />
          </InstancedShape>
          <InstancedShape items={b.plantMounds} color="#3f8a3f" roughness={0.9} flatShading>
            <icosahedronGeometry args={[0.12, 0]} />
          </InstancedShape>
          <InstancedShape items={b.plantLeaves} roughness={0.9}>
            <coneGeometry args={[0.032, 0.2, 5]} />
          </InstancedShape>
          <InstancedShape items={b.plantBlossoms} roughness={0.8}>
            <sphereGeometry args={[0.034, 8, 8]} />
          </InstancedShape>
        </>
      )}

      {/* hourglass */}
      {b.hourCaps.length > 0 && (
        <>
          <InstancedBoxes items={b.hourCaps} color="#5a3d22" roughness={0.7} />
          <InstancedShape items={b.hourGlass} color="#cfe0e8" transparent opacity={0.4} roughness={0.1}>
            <coneGeometry args={[0.07, 0.12, 12]} />
          </InstancedShape>
          <InstancedShape items={b.hourSand} color="#d8b46a" roughness={0.9}>
            <coneGeometry args={[0.055, 0.08, 10]} />
          </InstancedShape>
        </>
      )}

      {/* notebook + quill */}
      {b.noteBooks.length > 0 && (
        <>
          <InstancedBoxes items={b.noteBooks} color="#3a5c7a" roughness={0.6} />
          <InstancedBoxes items={b.notePages} color="#f4ead0" roughness={0.95} />
          <InstancedShape items={b.noteQuills} color="#e8e2d2" roughness={0.7}>
            <cylinderGeometry args={[0.005, 0.012, 0.34, 6]} />
          </InstancedShape>
        </>
      )}
    </group>
  )
}
