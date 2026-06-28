import { useMemo } from 'react'
import { palette, glow } from './env'
import { TRAIN_LINES } from '../../lib/train/lines'
import { MAT, InstancedShape, type ShapeItem } from './assets'
import {
  platforms,
  platformLanterns,
  platformBenches,
  concourseBenches,
  CONCOURSE_PLANTS,
  COFFEE_CORNER,
  BOOKSTALL,
  CLOCK_TOWER,
  LOUNGE_RUG,
  TICKET_HALL,
  CONCOURSE,
  PLAT_Z0,
  waitingChairs,
  vendingMachines,
  platformTrashCans,
  platformRailings,
} from './layout'

// All the hand-placed dressing that makes the terminus feel lived-in and busy
// without ever feeling cluttered: instanced wooden benches, brass platform
// lanterns (warm emissive globes, a few promoted to real point-lights by the
// quality budget), potted plants, luggage, trash bins and luggage carts, plus the
// zoned hero furniture — the waiting-lounge rug, the coffee kiosk, the bookstall,
// the ticket office row and the central clock tower. Every repeated prop is one
// InstancedShape batch (one draw call), so the whole set is a dozen-ish draws.

/* -------------------------------------------------------------------------- */
/* Instanced kit — benches, lanterns, plants, luggage, bins                    */
/* -------------------------------------------------------------------------- */

/** Collect every bench in the realm (platforms + lounge) and emit the four
 *  instanced parts (seat, back, two leg rails) so all benches share 4 draws. */
function useBenchBatches() {
  return useMemo(() => {
    const seats: ShapeItem[] = []
    const backs: ShapeItem[] = []
    const legs: ShapeItem[] = []
    const add = (pos: [number, number, number], yaw: number) => {
      seats.push({ pos: [pos[0], 0.45, pos[2]], rot: [0, yaw, 0] })
      backs.push({ pos: [pos[0], 0.82, pos[2]], rot: [0, yaw, -0.18], scale: [1, 1, 1] })
      for (const dx of [-1.2, 1.2]) {
        // rotate the leg offset by yaw
        const ox = Math.cos(yaw) * dx
        const oz = Math.sin(yaw) * dx
        legs.push({ pos: [pos[0] + ox, 0.22, pos[2] + oz], rot: [0, yaw, 0] })
      }
    }
    for (const p of platforms()) for (const b of platformBenches(p.index)) add(b.pos, b.yaw)
    for (const b of concourseBenches()) add(b.pos, b.yaw)
    return { seats, backs, legs }
  }, [])
}

/** Platform lanterns: posts (instanced), warm globes (instanced), and a small
 *  budgeted set promoted to real point-lights, tinted to each platform's mood. */
function useLanternBatches(lampLights: number) {
  return useMemo(() => {
    const posts: ShapeItem[] = []
    const caps: ShapeItem[] = []
    const globes: ShapeItem[] = []
    const reals: { pos: [number, number, number]; color: string }[] = []
    let budget = lampLights
    for (const p of platforms()) {
      const color = TRAIN_LINES[p.index]?.mood.glow ?? glow.lantern.getStyle()
      platformLanterns(p.index).forEach((l, j) => {
        const [x, , z] = l.pos
        posts.push({ pos: [x, 1.5, z] })
        caps.push({ pos: [x, 3.05, z] })
        globes.push({ pos: [x, 2.78, z], color })
        if (budget > 0 && j === 1) {
          reals.push({ pos: [x, 2.78, z], color })
          budget--
        }
      })
    }
    return { posts, caps, globes, reals }
  }, [lampLights])
}

/** Sittable waiting chairs on the lounge rug, BEFORE the platforms. Instanced into
 *  seat / back / legs so the whole cluster is three draw calls. Local +X maps to
 *  world (cos yaw, sin yaw) and local +Z to (-sin yaw, cos yaw) — matching the
 *  bench batch convention above. */
function useChairBatches() {
  return useMemo(() => {
    const seats: ShapeItem[] = []
    const backs: ShapeItem[] = []
    const legs: ShapeItem[] = []
    for (const { pos, yaw } of waitingChairs()) {
      const [x, , z] = pos
      const c = Math.cos(yaw)
      const s = Math.sin(yaw)
      seats.push({ pos: [x, 0.46, z], rot: [0, yaw, 0] })
      // backrest sits behind the seat (local -Z) and leans back slightly
      backs.push({ pos: [x + 0.26 * s, 0.82, z - 0.26 * c], rot: [0, yaw, -0.12] })
      // four legs at the seat corners (local ±X, ±Z)
      for (const lx of [-0.22, 0.22]) {
        for (const lz of [-0.22, 0.22]) {
          legs.push({ pos: [x + lx * c - lz * s, 0.23, z + lx * s + lz * c], rot: [0, yaw, 0] })
        }
      }
    }
    return { seats, backs, legs }
  }, [])
}

export function StationProps({ lanternLights }: { lanternLights: number }) {
  const benches = useBenchBatches()
  const chairs = useChairBatches()
  const lanterns = useLanternBatches(lanternLights)

  // potted plants — instanced pot + foliage tuft
  const plantPots = useMemo<ShapeItem[]>(() => CONCOURSE_PLANTS.map((p) => ({ pos: [p[0], 0.4, p[2]] })), [])
  const plantFoliage = useMemo<ShapeItem[]>(() => CONCOURSE_PLANTS.map((p) => ({ pos: [p[0], 1.3, p[2]] })), [])

  // scattered luggage near benches + entrance (instanced, tinted)
  const luggage = useMemo<ShapeItem[]>(() => {
    const g = platforms()
    const spots: [number, number, number][] = [
      [-9, 0, -28],
      [10, 0, -24],
      [-3, 0, -41],
      [4, 0, -18],
      [g[0].platformX, 0, PLAT_Z0 + 20],
      [g[2].platformX, 0, PLAT_Z0 + 34],
      [g[4].platformX, 0, PLAT_Z0 + 16],
    ]
    const tints = ['#6a4a2a', '#3a3a4a', '#5a2a2a', '#4a3a22']
    return spots.map((s, j) => ({ pos: [s[0], 0.36, s[2]], rot: [0, s[0] * 0.6, 0], scale: [1, 0.78 + (j % 2) * 0.25, 1], color: tints[j % tints.length] }))
  }, [])

  // vending machines (instanced)
  const vendings = useMemo<ShapeItem[]>(() => vendingMachines().map((v) => ({ pos: v.pos, rot: [0, v.yaw, 0] })), [])

  // trash cans (instanced)
  const trashCans = useMemo<ShapeItem[]>(() => platformTrashCans().map((t) => ({ pos: t.pos })), [])

  // platform railings (posts + rails)
  const railingPosts = useMemo<ShapeItem[]>(() => platformRailings().filter(r => r.len === 0).map((r) => ({ pos: r.pos, rot: [0, r.yaw, 0] })), [])
  const railingRails = useMemo<ShapeItem[]>(() => platformRailings().filter(r => r.len > 0).map((r) => ({ pos: r.pos, rot: [0, r.yaw, 0], scale: [1, 1, r.len / 10] })), [])

  return (
    <group>
      {/* ---------------- instanced benches (all platforms + lounge) ---------------- */}
      <InstancedShape items={benches.seats} color={palette.woodWarm.getStyle()} roughness={0.8} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.16, 0.62]} />
      </InstancedShape>
      <InstancedShape items={benches.backs} color={palette.wood.getStyle()} roughness={0.8} castShadow>
        <boxGeometry args={[2.6, 0.5, 0.12]} />
      </InstancedShape>
      <InstancedShape items={benches.legs} color={palette.iron.getStyle()} metalness={0.5} roughness={0.5} castShadow>
        <boxGeometry args={[0.14, 0.45, 0.6]} />
      </InstancedShape>

      {/* ---------------- instanced waiting chairs (lounge, before the platforms) ---------------- */}
      <InstancedShape items={chairs.seats} color={palette.woodWarm.getStyle()} roughness={0.78} castShadow receiveShadow>
        <boxGeometry args={[0.56, 0.1, 0.56]} />
      </InstancedShape>
      <InstancedShape items={chairs.backs} color={palette.wood.getStyle()} roughness={0.8} castShadow>
        <boxGeometry args={[0.56, 0.62, 0.1]} />
      </InstancedShape>
      <InstancedShape items={chairs.legs} color={palette.iron.getStyle()} metalness={0.5} roughness={0.5} castShadow>
        <boxGeometry args={[0.07, 0.46, 0.07]} />
      </InstancedShape>

      {/* ---------------- instanced lanterns ---------------- */}
      <InstancedShape items={lanterns.posts} color={palette.iron.getStyle()} metalness={0.6} roughness={0.4} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3.0, 8]} />
      </InstancedShape>
      <InstancedShape items={lanterns.caps} color={palette.brass.getStyle()} metalness={0.6} roughness={0.4}>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
      </InstancedShape>
      <InstancedShape items={lanterns.globes} color={glow.lanternCore.getStyle()} emissive={glow.lanternCore.getStyle()} emissiveIntensity={1.5} transparent opacity={0.95}>
        <boxGeometry args={[0.42, 0.55, 0.42]} />
      </InstancedShape>
      {lanterns.reals.map((r, i) => (
        <pointLight key={i} position={r.pos} color={r.color} intensity={9} distance={15} decay={2} />
      ))}

      {/* ---------------- instanced plants ---------------- */}
      <InstancedShape items={plantPots} color={palette.plantPot.getStyle()} roughness={0.88} castShadow>
        <cylinderGeometry args={[0.5, 0.4, 0.8, 10]} />
      </InstancedShape>
      <InstancedShape items={plantFoliage} color={palette.plant.getStyle()} roughness={0.82} castShadow>
        <sphereGeometry args={[0.85, 8, 6]} />
      </InstancedShape>

      {/* ---------------- instanced luggage ---------------- */}
      <InstancedShape items={luggage} color={'#ffffff'} roughness={0.7} castShadow>
        <boxGeometry args={[0.9, 0.7, 0.55]} />
      </InstancedShape>

      {/* ---------------- vending machines ---------------- */}
      <InstancedShape items={vendings} color={'#2a2a3a'} roughness={0.3} metalness={0.2} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2.2, 0.9]} />
      </InstancedShape>
      {/* vending machine emissive front panels */}
      <InstancedShape items={vendings} color={'#0f0f1f'} emissive={'#00bfff'} emissiveIntensity={0.8}>
        <planeGeometry args={[1.4, 1.4]} />
      </InstancedShape>

      {/* ---------------- trash cans ---------------- */}
      <InstancedShape items={trashCans} color={palette.iron.getStyle()} metalness={0.5} roughness={0.5} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 12]} />
      </InstancedShape>
      <InstancedShape items={trashCans} color={'#1a1a1a'} roughness={0.9}>
        <cylinderGeometry args={[0.38, 0.38, 0.1, 12]} />
      </InstancedShape>

      {/* ---------------- platform railings ---------------- */}
      {/* posts */}
      <InstancedShape items={railingPosts} color={palette.iron.getStyle()} metalness={0.6} roughness={0.4} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.1, 8]} />
      </InstancedShape>
      {/* top rail */}
      <InstancedShape items={railingRails} color={palette.iron.getStyle()} metalness={0.6} roughness={0.4} castShadow>
        <boxGeometry args={[0.08, 0.08, 10]} />
      </InstancedShape>

      {/* ---------------- waiting-lounge rug ---------------- */}
      <mesh rotation-x={-Math.PI / 2} position={[LOUNGE_RUG.pos[0], 0.012, LOUNGE_RUG.pos[2]]}>
        <planeGeometry args={[LOUNGE_RUG.w, LOUNGE_RUG.d]} />
        <meshStandardMaterial color={'#5a2a2a'} roughness={0.92} />
      </mesh>
      {/* rug border — brass/gold trim */}
      <mesh rotation-x={-Math.PI / 2} position={[LOUNGE_RUG.pos[0], 0.014, LOUNGE_RUG.pos[2]]}>
        <ringGeometry args={[LOUNGE_RUG.w / 2 - 1.0, LOUNGE_RUG.w / 2 - 0.5, 4, 1]} />
        <meshStandardMaterial color={palette.brassDark} roughness={0.75} side={2} />
      </mesh>

      {/* ---------------- ticket office row ---------------- */}
      {TICKET_HALL.booths.map((bx, j) => (
        <group key={`t${j}`} position={[bx, 0, TICKET_HALL.z + 1.6]}>
          <mesh position={[0, 1.3, 0]} castShadow receiveShadow material={MAT.teakDark()}>
            <boxGeometry args={[5.4, 2.6, 2.4]} />
          </mesh>
          {/* glowing counter window */}
          <mesh position={[0, 1.4, 1.25]}>
            <planeGeometry args={[4.4, 1.3]} />
            <meshStandardMaterial color={'#2a2018'} emissive={glow.signLamp} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
          {/* brass valance + small over-counter lamp */}
          <mesh position={[0, 2.5, 1.2]} material={MAT.brass()}>
            <boxGeometry args={[4.6, 0.5, 0.12]} />
          </mesh>
        </group>
      ))}

      {/* ---------------- coffee kiosk + bookstall ---------------- */}
      <Kiosk pos={COFFEE_CORNER.pos} yaw={COFFEE_CORNER.yaw} tint={'#8a3a2a'} board={MAT.teak()} />
      <Kiosk pos={BOOKSTALL.pos} yaw={BOOKSTALL.yaw} tint={'#2a5a6a'} board={MAT.oak()} />

      {/* ---------------- central clock tower / info column ---------------- */}
      <ClockTower />
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/* Hero one-offs — kiosk + clock tower                                         */
/* -------------------------------------------------------------------------- */

function Kiosk({ pos, yaw, tint, board }: { pos: [number, number, number]; yaw: number; tint: string; board: ReturnType<typeof MAT.teak> }) {
  return (
    <group position={pos} rotation-y={yaw}>
      {/* counter body */}
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow material={board}>
        <boxGeometry args={[5.2, 2.6, 2.8]} />
      </mesh>
      {/* striped awning */}
      <mesh position={[0, 2.5, 1.6]} rotation-x={-0.5} castShadow>
        <boxGeometry args={[5.4, 0.1, 1.4]} />
        <meshStandardMaterial color={tint} roughness={0.7} />
      </mesh>
      {/* warm counter glow */}
      <mesh position={[0, 1.5, 1.45]}>
        <planeGeometry args={[4.2, 1.5]} />
        <meshStandardMaterial color={'#3a2a18'} emissive={glow.signLamp} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.1, 2.0]} color={glow.lantern.getStyle()} intensity={5} distance={11} decay={2} />
      {/* hanging sign board */}
      <mesh position={[0, 3.0, 1.45]}>
        <boxGeometry args={[3.0, 0.7, 0.1]} />
        <meshStandardMaterial color={'#14110f'} emissive={tint} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

function ClockTower() {
  const [x, , z] = CLOCK_TOWER.pos
  const h = CONCOURSE.wallH - 1
  return (
    <group position={[x, 0, z]}>
      {/* stone column */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={MAT.stone()}>
        <boxGeometry args={[1.8, h, 1.8]} />
      </mesh>
      {/* brass banding */}
      {[2.2, h - 2].map((yy) => (
        <mesh key={yy} position={[0, yy, 0]} material={MAT.brass()}>
          <boxGeometry args={[2.0, 0.25, 2.0]} />
        </mesh>
      ))}
      {/* a four-faced clock head */}
      <mesh position={[0, h + 0.1, 0]} castShadow material={MAT.teakDark()}>
        <boxGeometry args={[2.4, 2.0, 2.4]} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 1.22, h + 0.1, Math.cos(a) * 1.22]} rotation-y={a}>
          <circleGeometry args={[0.8, 24]} />
          <meshStandardMaterial color={'#f3ead4'} emissive={'#fff4d8'} emissiveIntensity={0.3} toneMapped={false} />
        </mesh>
      ))}
      {/* finial lamp */}
      <mesh position={[0, h + 1.5, 0]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color={'#241a0e'} emissive={glow.lanternCore.getStyle()} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <pointLight position={[0, h + 1.5, 0]} color={glow.lantern.getStyle()} intensity={5} distance={14} decay={2} />
    </group>
  )
}
