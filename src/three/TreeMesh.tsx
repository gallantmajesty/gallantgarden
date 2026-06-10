import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { Group } from 'three'
import { speciesFor, TREE_SPECIES } from '../lib/types'

// Warm the cache for every species model so trees pop in without a stall.
for (const s of TREE_SPECIES) useGLTF.preload(`/models/${s.model}`)

interface TreeMeshProps {
  variant: number
  selected?: boolean
  dimmed?: boolean
  sway?: boolean
  /** target scale multiplier — selected trees grow, others stay 1 */
  grow?: number
}

const PALETTES = [
  { leaf: '#5fa83c', leafMid: '#6fbf45', leafLight: '#8fd860', bark: '#6b4327' },
  { leaf: '#4f9e6a', leafMid: '#62b07e', leafLight: '#86cf9d', bark: '#735034' },
  { leaf: '#7bb04a', leafMid: '#8cc459', leafLight: '#aadd78', bark: '#5e3d22' },
  { leaf: '#3f8f5a', leafMid: '#549d6c', leafLight: '#7cc091', bark: '#6a4525' },
]

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** Catches a failed GLB load (e.g. file not dropped in yet) and renders a fallback. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function TreeMesh({ variant, selected, dimmed, sway = true, grow = 1 }: TreeMeshProps) {
  const group = useRef<Group>(null)
  const scaleRef = useRef(1)

  useFrame((state, delta) => {
    if (group.current) {
      // smooth grow/shrink toward target
      const target = grow
      scaleRef.current += (target - scaleRef.current) * Math.min(1, delta * 6)
      group.current.scale.setScalar(scaleRef.current)
      if (sway) {
        const t = state.clock.elapsedTime
        group.current.rotation.z = 0.02 + Math.sin(t * 0.6 + variant) * 0.018
      }
    }
  })

  const fallback = <ProceduralTree variant={variant} dimmed={dimmed} />

  return (
    <group ref={group}>
      <ModelBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <GLBTree variant={variant} dimmed={dimmed} />
        </Suspense>
      </ModelBoundary>

      {selected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.9, 2.35, 48]} />
          <meshBasicMaterial color="#ffce54" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  )
}

/** Loads /models/<species>.glb. Throws (caught by boundary) if the file is absent. */
function GLBTree({ variant, dimmed }: { variant: number; dimmed?: boolean }) {
  const species = speciesFor(variant)
  const { scene } = useGLTF(`/models/${species.model}`)
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      // @ts-expect-error three mesh typing
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (dimmed) {
          // @ts-expect-error material may be array
          const m = o.material
          if (m && !Array.isArray(m)) {
            m.transparent = true
            m.opacity = 0.5
          }
        }
      }
    })
    return c
  }, [scene, dimmed])
  return <primitive object={cloned} scale={species.scale} position={[0, species.yOffset, 0]} />
}

/** Procedural fallback: tapered trunk, limbs, full multi-sphere canopy. */
function ProceduralTree({ variant, dimmed }: { variant: number; dimmed?: boolean }) {
  const pal = PALETTES[variant % PALETTES.length]
  const opacity = dimmed ? 0.5 : 1

  const clusters = useMemo(() => {
    const rand = rng(variant + 1)
    const blobs: { pos: [number, number, number]; r: number; shade: number }[] = []
    for (let i = 0; i < 11; i++) {
      const ang = rand() * Math.PI * 2
      const rad = 0.35 + rand() * 1.15
      const height = 2.7 + rand() * 1.7
      blobs.push({
        pos: [Math.cos(ang) * rad, height, Math.sin(ang) * rad * 0.85],
        r: 0.6 + rand() * 0.55,
        shade: rand(),
      })
    }
    return blobs
  }, [variant])

  return (
    <group>
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, -0.03]} castShadow>
        <cylinderGeometry args={[0.22, 0.45, 2.4, 12]} />
        <meshStandardMaterial color={pal.bark} roughness={0.95} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.62, 0.4, 12]} />
        <meshStandardMaterial color={pal.bark} roughness={1} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0.42, 2.0, 0.1]} rotation={[0, 0, -0.9]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, 1.3, 8]} />
        <meshStandardMaterial color={pal.bark} roughness={0.95} transparent opacity={opacity} />
      </mesh>
      <mesh position={[-0.4, 2.15, -0.1]} rotation={[0, 0, 0.95]} castShadow>
        <cylinderGeometry args={[0.09, 0.18, 1.2, 8]} />
        <meshStandardMaterial color={pal.bark} roughness={0.95} transparent opacity={opacity} />
      </mesh>
      {clusters.map((b, i) => {
        const color = b.shade < 0.34 ? pal.leaf : b.shade < 0.7 ? pal.leafMid : pal.leafLight
        return (
          <mesh key={i} position={b.pos} castShadow>
            <sphereGeometry args={[b.r, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.8} transparent opacity={opacity} />
          </mesh>
        )
      })}
    </group>
  )
}
