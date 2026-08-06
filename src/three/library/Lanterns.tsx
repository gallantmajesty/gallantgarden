import { useLayoutEffect, useMemo, useRef } from 'react'
import { DoubleSide, type InstancedMesh, type ShapeItem, Object3D } from 'three'
import { HALL } from './layout'
import { columns } from './furniture'
import { useScenePreset } from '../../store/quality'
import { useSettings } from '../../store/settings'
import { InstancedBoxes, InstancedShape, type BoxItem } from './Instanced'

const IRON = '#241a12'
const BRASS = '#caa84a'
const GLOW = '#ffd98a'
const GLOW_EMISSIVE = '#ffb24a'

/**
 * The hall's lantern system — the magician's-castle lighting the user asked for:
 *  • one grand hanging lantern over the centre (a real warm light),
 *  • four great lanterns high under the ceiling (real lights),
 *  • BIG ornate lanterns hanging from the ceiling at every pillar — the glowing
 *    glass bodies, iron cages, brass crowns and hearts are each ONE instanced
 *    draw for the whole hall, so dozens of large lanterns cost only a few draws.
 *
 * All glow is STATIC — a steady warm light, neither flickering nor shifting
 * brightness between day and night.
 */
export function Lanterns() {
  const preset = useScenePreset()
  const night = useSettings((s) => s.nightMode)
  const { halfW, halfL, wallH } = HALL

  // four grand lanterns up high, one per quadrant (the "topmost four")
  const topPositions = useMemo<[number, number, number][]>(
    () => [
      [-halfW * 0.5, wallH - 5.5, -halfL * 0.45],
      [halfW * 0.5, wallH - 5.5, -halfL * 0.45],
      [-halfW * 0.5, wallH - 5.5, halfL * 0.45],
      [halfW * 0.5, wallH - 5.5, halfL * 0.45],
    ],
    [halfW, halfL, wallH],
  )

  // BIG ornate lanterns hanging at every pillar, just inside the capital — these
  // are the "lanterns on the pole" the user wanted enlarged.
  const pillarLanterns = useMemo<[number, number, number][]>(() => {
    const out: [number, number, number][] = []
    const y = wallH - 4.5
    for (const c of columns()) {
      out.push([c[0], y, c[2]])
    }
    return out
  }, [wallH])

  // real point-lights are the single biggest GPU cost in forward rendering, so
  // the grand lanterns cast NO real light by day (they glow via emissive + bloom
  // and read identically, keeping the bright daytime free). At NIGHT MODE we flip
  // a couple on for warm pools — kept minimal (2) because each real light is
  // expensive and the user is hitting low FPS at night.
  const grandLights = night ? 2 : preset.grandLights

  // pillar lanterns glow via emissive only (no real light) — adding real lights
  // here was the main night FPS drain, so they stay cheap now.
  const pillarLightCols: [number, number, number][] = []

  return (
    <group>
      <CentreLantern y={wallH} />
      {topPositions.map((p, i) => (
        <GrandLantern key={i} pos={p} withLight={i < grandLights} />
      ))}

      {/* big ornate lanterns at every pillar — instanced parts for cheap draws */}
      <BigPillarLanterns positions={pillarLanterns} />

      {/* four HP-style hanging lanterns on the four sides of each pillar (below
          the big top lantern) — instanced parts for cheap draws */}
      <SideLanterns positions={columns()} wallH={wallH} />
    </group>
  )
}

/** The hero: a great ornate lantern hanging on a chain over the centre of the
 *  hall — iron cage, brass crown & finial, a warm glowing heart, and a real
 *  light that fills the nave. Its glow is steady (no day/night shift). */
function CentreLantern({ y }: { y: number }) {
  const hangY = y - 6
  const bodyH = 5
  const r = 1.95
  return (
    <group position={[0, hangY, 0]}>
      {/* chain to the ceiling */}
      <mesh position={[0, 4.4, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 5.2, 6]} />
        <meshStandardMaterial color={IRON} metalness={0.7} roughness={0.4} />
      </mesh>

      {/* brass crown */}
      <mesh position={[0, bodyH / 2 + 0.5, 0]}>
        <coneGeometry args={[r * 1.05, 1.2, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} emissive="#3a2c10" emissiveIntensity={0.4} />
      </mesh>

      {/* glass body — warm, translucent */}
      <mesh>
        <cylinderGeometry args={[r, r * 0.92, bodyH, 8, 1, true]} />
        <meshStandardMaterial color="#ffe6b0" emissive={GLOW_EMISSIVE} emissiveIntensity={1.4} transparent opacity={0.5} roughness={0.3} side={DoubleSide} />
      </mesh>

      {/* glowing heart */}
      <mesh>
        <sphereGeometry args={[r * 0.55, 16, 16]} />
        <meshStandardMaterial color="#fff3d2" emissive={GLOW} emissiveIntensity={2.6} />
      </mesh>

      {/* iron cage ribs */}
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <boxGeometry args={[0.06, bodyH, 0.06]} />
            <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
          </mesh>
        )
      })}
      {/* top & bottom rings */}
      {[bodyH / 2, -bodyH / 2].map((ry, k) => (
        <mesh key={k} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.07, 8, 24]} />
          <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* finial */}
      <mesh position={[0, -bodyH / 2 - 0.45, 0]}>
        <coneGeometry args={[0.22, 0.7, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* the real warm light it throws into the hall — steady intensity */}
      <pointLight position={[0, 0, 0]} intensity={40} distance={70} decay={1.6} color="#ffcf9a" />
    </group>
  )
}

/** One of the four grand lanterns hanging high under the ceiling — enlarged and
 *  ultra-detailed. */
function GrandLantern({ pos, withLight }: { pos: [number, number, number]; withLight: boolean }) {
  const bodyH = 2.6
  const r = 1.0
  return (
    <group position={pos}>
      {/* chain to the ceiling */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 4, 6]} />
        <meshStandardMaterial color={IRON} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* brass crown */}
      <mesh position={[0, bodyH / 2 + 0.5, 0]}>
        <coneGeometry args={[r * 1.05, 0.9, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} emissive="#3a2c10" emissiveIntensity={0.4} />
      </mesh>
      {/* glass body */}
      <mesh>
        <cylinderGeometry args={[r, r * 0.94, bodyH, 8, 1, true]} />
        <meshStandardMaterial color="#ffe6b0" emissive={GLOW_EMISSIVE} emissiveIntensity={1.3} transparent opacity={0.48} roughness={0.3} side={DoubleSide} />
      </mesh>
      {/* glowing heart */}
      <mesh>
        <sphereGeometry args={[r * 0.6, 16, 16]} />
        <meshStandardMaterial color="#fff3d2" emissive={GLOW} emissiveIntensity={2.6} />
      </mesh>
      {/* iron cage ribs */}
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * r, 0, Math.sin(a) * r]}>
            <boxGeometry args={[0.06, bodyH, 0.06]} />
            <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
          </mesh>
        )
      })}
      {/* top & bottom rings */}
      {[bodyH / 2, -bodyH / 2].map((ry, k) => (
        <mesh key={k} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.06, 8, 24]} />
          <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* finial */}
      <mesh position={[0, -bodyH / 2 - 0.4, 0]}>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      {withLight && <pointLight position={[0, -0.1, 0]} intensity={18} distance={34} decay={2} color="#ffcb8a" />}
    </group>
  )
}

/**
 * BIG ornate lanterns hanging at every pillar — the "lanterns on the pole" the
 * user wanted enlarged. Every repeating part (chain, brass crown, glowing glass
 * body, glowing heart, iron cage ribs, rings) is a single instanced draw for the
 * whole hall, so a dozen-plus large lanterns cost only a handful of draws. Glow
 * is entirely static (no flicker, no day/night change).
 */
function BigPillarLanterns({ positions }: { positions: [number, number, number][] }) {
  const chains = useMemo<ShapeItem[]>(
    () => positions.map((p) => ({ pos: [p[0], p[1] + 2.6, p[2]] })),
    [positions],
  )
  const crowns = useMemo<ShapeItem[]>(
    () => positions.map((p) => ({ pos: [p[0], p[1] + 1.35, p[2]] })),
    [positions],
  )
  const bodies = useMemo<ShapeItem[]>(
    () => positions.map((p) => ({ pos: [p[0], p[1], p[2]] })),
    [positions],
  )
  const hearts = useMemo<ShapeItem[]>(
    () => positions.map((p) => ({ pos: [p[0], p[1], p[2]] })),
    [positions],
  )
  const rings = useMemo<ShapeItem[]>(
    () => positions.flatMap((p) => [
      { pos: [p[0], p[1] + 1.1, p[2]], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
      { pos: [p[0], p[1] - 1.1, p[2]], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
    ]),
    [positions],
  )

  return (
    <group>
      {/* chains — decorative, no shadow (keeps the shadow pass light) */}
      <InstancedShape items={chains} color={IRON} metalness={0.7} roughness={0.4}>
        <cylinderGeometry args={[0.05, 0.05, 4.4, 6]} />
      </InstancedShape>
      {/* brass crowns */}
      <InstancedShape items={crowns} color={BRASS} metalness={0.7} roughness={0.3} emissive="#3a2c10" emissiveIntensity={0.4}>
        <coneGeometry args={[1.0, 0.9, 8]} />
      </InstancedShape>
      {/* glowing glass bodies — static warm glow */}
      <InstancedShape items={bodies} color="#ffe6b0" emissive={GLOW_EMISSIVE} emissiveIntensity={1.4} transparent opacity={0.5} roughness={0.3} side={DoubleSide}>
        <cylinderGeometry args={[0.95, 0.9, 2.2, 8, 1, true]} />
      </InstancedShape>
      {/* glowing hearts — static */}
      <InstancedShape items={hearts} color="#fff3d2" emissive={GLOW} emissiveIntensity={2.8}>
        <sphereGeometry args={[0.6, 14, 14]} />
      </InstancedShape>
      {/* brass rings */}
      <InstancedShape items={rings} color={BRASS} metalness={0.7} roughness={0.35}>
        <torusGeometry args={[0.95, 0.06, 8, 24]} />
      </InstancedShape>

      {/* iron cage ribs — one instanced draw per rib angle, all pillars share it */}
      <CageRibs positions={positions} r={0.95} h={2.2} />
    </group>
  )
}

/** Iron cage ribs for the pillar lanterns: 8 ribs × every pillar, but only 8
 *  instanced draws total (one per rib angle, sharing all pillar positions). */
function CageRibs({ positions, r, h }: { positions: [number, number, number][]; r: number; h: number }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    let i = 0
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const ox = Math.cos(a) * r
      const oz = Math.sin(a) * r
      for (const p of positions) {
        dummy.position.set(p[0] + ox, p[1], p[2] + oz)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i++, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [positions, r, h])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, positions.length * 8)]} frustumCulled={false}>
      <boxGeometry args={[0.06, h, 0.06]} />
      <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
    </instancedMesh>
  )
}

/**
 * Four HP-style hanging lanterns on the four sides of each pillar — hung from
 * iron bracket arms off the column, below the big top lantern. Medium-sized
 * (not tiny): brass crown, glowing glass body, heart and iron cage. Every part
 * is one instanced draw for the whole hall, so ~72 side lanterns cost only a
 * few draws. Glow is static (no flicker).
 */
function SideLanterns({ positions, wallH }: { positions: [number, number, number][]; wallH: number }) {
  const yL = Math.min(6.5, wallH * 0.3) // hangs lower down the pole, clear of the balcony floor
  const r = 0.42
  const bodyH = 1.1
  const off = 1.15 // how far the lantern hangs out from the pillar centre
  const bracketY = yL + bodyH / 2 + 0.55
  const chainTop = bracketY - 0.1
  const chainLen = chainTop - (yL + bodyH / 2)
  const chainY = (chainTop + yL + bodyH / 2) / 2

  const brackets = useMemo<BoxItem[]>(() => {
    const out: BoxItem[] = []
    positions.forEach(([x, , z]) => {
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2
        const armLen = off - 0.55
        const mid = 0.55 + armLen / 2
        out.push({
          pos: [x + Math.cos(a) * mid, bracketY, z + Math.sin(a) * mid],
          size: [armLen, 0.14, 0.14],
          rotY: -a,
          color: IRON,
        })
      }
    })
    return out
  }, [positions, bracketY])

  const centers = useMemo<[number, number, number][]>(() => {
    const out: [number, number, number][] = []
    positions.forEach(([x, , z]) => {
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2
        out.push([x + Math.cos(a) * off, yL, z + Math.sin(a) * off])
      }
    })
    return out
  }, [positions, yL])

  const chains = useMemo<ShapeItem[]>(
    () => centers.map((p) => ({ pos: [p[0], chainY, p[2]], scale: [1, chainLen, 1] })),
    [centers, chainY, chainLen],
  )
  const crowns = useMemo<ShapeItem[]>(
    () => centers.map((p) => ({ pos: [p[0], p[1] + bodyH / 2 + 0.45, p[2]] })),
    [centers],
  )
  const bodies = useMemo<ShapeItem[]>(() => centers.map((p) => ({ pos: [p[0], p[1], p[2]] })), [centers])
  const hearts = useMemo<ShapeItem[]>(() => centers.map((p) => ({ pos: [p[0], p[1], p[2]] })), [centers])
  const rings = useMemo<ShapeItem[]>(
    () => centers.flatMap((p) => [
      { pos: [p[0], p[1] + bodyH / 2, p[2]], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
      { pos: [p[0], p[1] - bodyH / 2, p[2]], rot: [Math.PI / 2, 0, 0] as [number, number, number] },
    ]),
    [centers],
  )

  return (
    <group>
      {/* iron bracket arms reaching out from the pillar — decorative, no shadow */}
      <InstancedBoxes items={brackets} metalness={0.6} roughness={0.5} />
      {/* chains down to each lantern */}
      <InstancedShape items={chains} color={IRON} metalness={0.7} roughness={0.4}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
      </InstancedShape>
      {/* brass crowns */}
      <InstancedShape items={crowns} color={BRASS} metalness={0.7} roughness={0.3} emissive="#3a2c10" emissiveIntensity={0.4}>
        <coneGeometry args={[r * 1.05, 0.45, 8]} />
      </InstancedShape>
      {/* glowing glass bodies — static warm glow */}
      <InstancedShape items={bodies} color="#ffe6b0" emissive={GLOW_EMISSIVE} emissiveIntensity={1.4} transparent opacity={0.5} roughness={0.3} side={DoubleSide}>
        <cylinderGeometry args={[r, r * 0.9, bodyH, 8, 1, true]} />
      </InstancedShape>
      {/* glowing hearts — static */}
      <InstancedShape items={hearts} color="#fff3d2" emissive={GLOW} emissiveIntensity={2.8}>
        <sphereGeometry args={[r * 0.6, 14, 14]} />
      </InstancedShape>
      {/* brass rings */}
      <InstancedShape items={rings} color={BRASS} metalness={0.7} roughness={0.35}>
        <torusGeometry args={[r, 0.04, 8, 20]} />
      </InstancedShape>
      {/* iron cage ribs */}
      <CageRibs positions={centers} r={r} h={bodyH} />
    </group>
  )
}
