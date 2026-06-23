import { useMemo, useRef } from 'react'
import { Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, type Group } from 'three'
import { InstancedShape, type ShapeItem } from '../library/Instanced'
import { FOCUS_LILY, WATER_LEVEL } from './layout'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * The Focus Lily — the realm's icon and landmark, the visual equal of the
 * Library's Knowledge Tree. A giant water lily floating in open lake between
 * spawn and the falls, visible from everywhere: a broad pad, layered petal
 * rings rising to a golden pistil, gentle float + petal sway, and soft emissive
 * accents (Medium/High) that bloom through the post pass. Elegant, not gaudy.
 */
export function FocusLily({ glow = true }: { glow?: boolean }) {
  const sway = useRef<Group>(null)

  // four concentric petal rings: outer open & deeper-pink, inner upright & pale.
  // Per-petal brightness jitter gives natural shading variation across the bloom.
  const petals = useMemo<ShapeItem[]>(() => {
    const rand = rng(2207)
    const rings = [
      { count: 18, r: 5.6, h: 0.35, tilt: 1.12, len: 4.6, w: 1.05, color: '#eeb6d0' },
      { count: 15, r: 4.4, h: 0.7, tilt: 0.95, len: 4.2, w: 1.0, color: '#f6c9dd' },
      { count: 12, r: 3.1, h: 1.15, tilt: 0.74, len: 3.7, w: 0.9, color: '#fbe0ec' },
      { count: 9, r: 1.9, h: 1.7, tilt: 0.48, len: 3.1, w: 0.8, color: '#fff3f8' },
    ]
    const base = new Color()
    const out: ShapeItem[] = []
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * Math.PI * 2 + (ring.r % 2) * 0.2
        // jitter each petal's tint a little lighter/darker for shading variation
        const v = 0.9 + rand() * 0.16
        base.set(ring.color).multiplyScalar(v)
        out.push({
          pos: [Math.cos(a) * ring.r, ring.h + (rand() - 0.5) * 0.12, Math.sin(a) * ring.r],
          rot: [ring.tilt + (rand() - 0.5) * 0.12, -a + Math.PI / 2, (rand() - 0.5) * 0.1],
          scale: [ring.w, 0.3, ring.len],
          color: '#' + base.getHexString(),
        })
      }
    }
    return out
  }, [])

  // golden pistil stamens
  const stamens = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2
      const r = 0.5 + (i % 3) * 0.25
      out.push({ pos: [Math.cos(a) * r, 2.1 + (i % 2) * 0.2, Math.sin(a) * r], rot: [0.3, a, 0], scale: [0.07, 0.5, 0.07] })
    }
    return out
  }, [])

  useFrame((state) => {
    if (sway.current) sway.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.025
  })

  return (
    <group position={[FOCUS_LILY.pos[0], WATER_LEVEL + 0.05, FOCUS_LILY.pos[2]]} scale={1.8}>
      <Float speed={1.0} rotationIntensity={0.1} floatIntensity={0.55} floatingRange={[0, 0.4]}>
        {/* the lily pad */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <circleGeometry args={[9, 56]} />
          <meshStandardMaterial color="#3e7d4a" roughness={0.78} side={DoubleSide} />
        </mesh>
        {/* a second, slightly raised inner pad for depth */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
          <ringGeometry args={[6.5, 8.6, 56]} />
          <meshStandardMaterial color="#4c8f56" roughness={0.82} side={DoubleSide} />
        </mesh>

        <group ref={sway}>
          {/* petals (one instanced draw); smoother geometry + a hint of soft-subsurface
              sheen via a very faint emissive — NOT a fantasy glow */}
          <InstancedShape items={petals} roughness={0.42} metalness={0} emissive={glow ? '#ffd9ea' : undefined} emissiveIntensity={glow ? 0.06 : 0}>
            <sphereGeometry args={[1, 20, 14]} />
          </InstancedShape>

          {/* golden pistil — the warm heart of the lily (gentle, not nuclear) */}
          <mesh position={[0, 2.0, 0]}>
            <sphereGeometry args={[1.1, 24, 18]} />
            <meshStandardMaterial color="#ffce5e" emissive={glow ? '#ffb02a' : '#000000'} emissiveIntensity={glow ? 0.3 : 0} roughness={0.45} />
          </mesh>
          <InstancedShape items={stamens} color="#ffe08a" emissive={glow ? '#ffc24a' : undefined} emissiveIntensity={glow ? 0.25 : 0} roughness={0.5}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
          </InstancedShape>
        </group>
      </Float>
    </group>
  )
}
