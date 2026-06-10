import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type InstancedMesh, Object3D } from 'three'
import { HALL } from './layout'
import { columns } from './furniture'
import { useSettings } from '../../store/settings'

const IRON = '#241a12'
const BRASS = '#caa84a'
const GLOW = '#ffd98a'
const GLOW_EMISSIVE = '#ffb24a'

/**
 * The hall's lantern system — the magician's-castle lighting the user asked for:
 *  • one grand hanging lantern over the centre (a real warm light),
 *  • four great lanterns high under the ceiling (real lights),
 *  • four lanterns ringing every pillar (glow via bloom — no per-lantern light).
 *
 * All the small glowing cores are drawn as ONE instanced mesh so dozens of
 * lanterns cost a single draw call. They flicker softly together.
 */
export function Lanterns() {
  const quality = useSettings((s) => s.quality)
  const cinematic = useSettings((s) => s.cinematic)
  const { halfW, halfL, wallH } = HALL

  // four grand lanterns up high, one per quadrant (the "topmost four")
  const topPositions = useMemo<[number, number, number][]>(
    () => [
      [-halfW * 0.5, wallH - 4.5, -halfL * 0.45],
      [halfW * 0.5, wallH - 4.5, -halfL * 0.45],
      [-halfW * 0.5, wallH - 4.5, halfL * 0.45],
      [halfW * 0.5, wallH - 4.5, halfL * 0.45],
    ],
    [halfW, halfL, wallH],
  )

  // four lanterns ringing each pillar, at head height
  const pillarGlow = useMemo<[number, number, number][]>(() => {
    const out: [number, number, number][] = []
    for (const c of columns()) {
      for (const off of [
        [0.85, 0],
        [-0.85, 0],
        [0, 0.85],
        [0, -0.85],
      ]) {
        out.push([c[0] + off[0], 5.4, c[2] + off[1]])
      }
    }
    return out
  }, [])

  // every small glowing core (pillar lanterns + the cores of the grand ones)
  const cores = useMemo<[number, number, number][]>(() => {
    return [...pillarGlow, ...topPositions]
  }, [pillarGlow, topPositions])

  return (
    <group>
      <CentreLantern y={wallH} />
      {topPositions.map((p, i) => (
        <GrandLantern key={i} pos={p} withLight={quality !== 'low'} />
      ))}

      {/* pillar lantern frames (cheap thin iron rings) */}
      {pillarGlow.map((p, i) => (
        <mesh key={`pf-${i}`} position={[p[0], p[1], p[2]]}>
          <torusGeometry args={[0.2, 0.03, 6, 10]} />
          <meshStandardMaterial color={IRON} metalness={0.6} roughness={0.5} />
        </mesh>
      ))}

      {/* all glowing cores in a single instanced draw */}
      <GlowCores positions={cores} flicker={cinematic} />
    </group>
  )
}

/** The hero: a great ornate lantern hanging on a chain over the centre of the
 *  hall — iron cage, brass crown & finial, a warm glowing heart, and a real
 *  light that fills the nave. */
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
        <meshStandardMaterial color="#ffe6b0" emissive={GLOW_EMISSIVE} emissiveIntensity={1.1} transparent opacity={0.45} roughness={0.3} side={DoubleSide} />
      </mesh>

      {/* glowing heart */}
      <mesh>
        <sphereGeometry args={[r * 0.55, 16, 16]} />
        <meshStandardMaterial color="#fff3d2" emissive={GLOW} emissiveIntensity={2.4} />
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

      {/* the real warm light it throws into the hall */}
      <pointLight position={[0, 0, 0]} intensity={34} distance={60} decay={1.8} color="#ffcf9a" />
    </group>
  )
}

/** One of the four grand lanterns hanging high under the ceiling. */
function GrandLantern({ pos, withLight }: { pos: [number, number, number]; withLight: boolean }) {
  return (
    <group position={pos}>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 6]} />
        <meshStandardMaterial color={IRON} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.62, 0.6, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* cage */}
      <mesh>
        <cylinderGeometry args={[0.55, 0.5, 1.4, 6, 1, true]} />
        <meshStandardMaterial color="#ffe6b0" emissive={GLOW_EMISSIVE} emissiveIntensity={0.9} transparent opacity={0.4} roughness={0.3} side={DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.34, 14, 14]} />
        <meshStandardMaterial color="#fff3d2" emissive={GLOW} emissiveIntensity={2.2} />
      </mesh>
      <mesh position={[0, -0.85, 0]}>
        <coneGeometry args={[0.14, 0.4, 6]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      {withLight && <pointLight position={[0, -0.1, 0]} intensity={14} distance={26} decay={2} color="#ffcb8a" />}
    </group>
  )
}

/** All small lantern cores in a single instanced draw call, flickering softly. */
function GlowCores({ positions, flicker }: { positions: [number, number, number][]; flicker: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      const s = flicker ? 1 + Math.sin(t * 3 + i * 1.7) * 0.05 : 1
      dummy.position.set(p[0], p[1], p[2])
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, positions.length)]}>
      <sphereGeometry args={[0.16, 10, 10]} />
      <meshStandardMaterial color="#fff0c8" emissive={GLOW_EMISSIVE} emissiveIntensity={1.9} />
    </instancedMesh>
  )
}
