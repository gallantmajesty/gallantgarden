import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Color, type Group, type InstancedMesh, Object3D, type PointLight } from 'three'
import { env } from './env'
import { QUALITY_PRESET, useSettings } from '../../store/settings'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * The Knowledge Tree — Focus Lily's centrepiece and visual identity. A great
 * trunk rises through the centre of the hall into a broad canopy of softly
 * glowing leaves, ringed by floating motes and lanterns. Elegant and warm, not
 * a flashy game prop. Sways almost imperceptibly.
 */
export function KnowledgeTree() {
  const sway = useRef<Group>(null)
  const treeLight = useRef<PointLight>(null)
  const quality = useSettings((s) => s.quality)
  const preset = QUALITY_PRESET[quality]

  // canopy leaf clusters within a dome (deterministic)
  const leaves = useMemo(() => {
    const rand = rng(4242)
    return Array.from({ length: 130 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 2 + rand() * 6.5
      const h = 9 + rand() * 6.5 - (rad / 8.5) * 2
      const warm = rand()
      return {
        pos: [Math.cos(a) * rad, h, Math.sin(a) * rad] as [number, number, number],
        s: 0.7 + rand() * 1.3,
        color: warm > 0.5 ? '#ffd98a' : '#ffc060',
        emissive: warm > 0.5 ? '#ffcf7a' : '#ff9e3a',
      }
    })
  }, [])

  // hanging lanterns
  const lanterns = useMemo(() => {
    const rand = rng(99)
    return Array.from({ length: 10 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 3 + rand() * 5
      return { pos: [Math.cos(a) * rad, 7 + rand() * 3, Math.sin(a) * rad] as [number, number, number] }
    })
  }, [])

  // branches near the top
  const branches = useMemo(() => {
    const rand = rng(7)
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rand() * 0.4
      return { a, len: 3 + rand() * 2, tilt: 0.5 + rand() * 0.4 }
    })
  }, [])

  useFrame((state) => {
    if (sway.current) {
      const t = state.clock.elapsedTime
      sway.current.rotation.z = Math.sin(t * 0.25) * 0.012
      sway.current.rotation.x = Math.cos(t * 0.21) * 0.012
    }
    // warm the dais glow up after dark so the centrepiece reads as a soft beacon
    if (treeLight.current) treeLight.current.intensity = 2.8 + (1 - env.dayFactor) * 4.2
  })

  return (
    <group position={[0, 0, 0]}>
      {/* stone dais */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.6, 0.3, 32]} />
        <meshStandardMaterial color="#8a7a5e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[3.9, 0.12, 10, 48]} />
        <meshStandardMaterial color="#caa84a" emissive="#caa84a" emissiveIntensity={0.7} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* trunk */}
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 1.3, 9, 18]} />
        <meshStandardMaterial color="#5a3d22" roughness={0.95} />
      </mesh>
      {/* root flares */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.1, 0.5, Math.sin(a) * 1.1]} rotation={[0, -a, 0.5]} castShadow>
            <cylinderGeometry args={[0.18, 0.5, 1.8, 8]} />
            <meshStandardMaterial color="#4d3320" roughness={0.95} />
          </mesh>
        )
      })}

      <group ref={sway}>
        {/* branches */}
        {branches.map((b, i) => (
          <mesh
            key={i}
            position={[Math.cos(b.a) * 1.2, 8.6, Math.sin(b.a) * 1.2]}
            rotation={[b.tilt * Math.sin(b.a), -b.a, b.tilt * Math.cos(b.a)]}
            castShadow
          >
            <cylinderGeometry args={[0.12, 0.32, b.len * 2, 8]} />
            <meshStandardMaterial color="#5a3d22" roughness={0.95} />
          </mesh>
        ))}

        {/* canopy — gently lit foliage, not a glowing beacon. ONE instanced draw
            for all ~130 leaf clusters (was 130 separate meshes + materials). */}
        <Canopy leaves={leaves} />

        {/* small warm fireflies tucked in the canopy */}
        {lanterns.map((ln, i) => (
          <mesh key={i} position={ln.pos}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#fff0c8" emissive="#ffce7a" emissiveIntensity={1.3} />
          </mesh>
        ))}
      </group>

      {/* a soft warm wash over the dais — gentle, not a floodlight. Gated by
          quality (a real light is costly); on low the canopy's emissive glow
          and the hall lanterns carry the look. */}
      {preset.treeLight && <pointLight ref={treeLight} position={[0, 6, 0]} intensity={3.4} distance={16} decay={2.2} color="#ffcf9a" />}

      {/* a few floating motes around the canopy (only when particles are on) */}
      {preset.particles && <Sparkles count={preset.dust > 0 ? 24 : 0} scale={[14, 10, 14]} position={[0, 10, 0]} size={2.4} speed={0.2} color="#ffe6b0" opacity={0.55} />}
    </group>
  )
}

interface Leaf {
  pos: [number, number, number]
  s: number
  color: string
  emissive: string
}

/** All canopy leaf clusters as a single instanced icosahedron mesh with
 *  per-instance colour — one draw call instead of ~130. */
function Canopy({ leaves }: { leaves: Leaf[] }) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const col = new Color()
    leaves.forEach((l, i) => {
      dummy.position.set(l.pos[0], l.pos[1], l.pos[2])
      dummy.scale.setScalar(l.s)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      col.set(l.color)
      mesh.setColorAt(i, col)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, leaves.length)]}>
      <icosahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial emissive="#ffb24a" emissiveIntensity={0.28} roughness={0.7} flatShading />
    </instancedMesh>
  )
}
