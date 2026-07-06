import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getAtmosphereConfig } from '../../lib/season'
import { HALL } from './layout'

/** Seasonal / festival particle overlay — falling leaves, snow, petals.
 *
 *  Renders as a single instanced mesh for performance. Particles drift downward
 *  with slight horizontal sway, respawning at the top when they fall below the
 *  floor. Gates on `preset.particles` so low-quality settings skip it entirely.
 */

interface Props {
  /** Whether particles are enabled at all (from quality preset). */
  enabled: boolean
  particleMultiplier?: number
}

export function SeasonalOverlay({ enabled, particleMultiplier = 1 }: Props) {
  if (!enabled) return null
  return <SeasonalParticles multiplier={particleMultiplier} />
}

function SeasonalParticles({ multiplier }: { multiplier: number }) {
  const config = getAtmosphereConfig()
  const count = Math.round(config.particleCount * multiplier)

  // Build an array of per-instance random offsets (0..1) — stable across renders
  const refs = useRef(
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2,
      speed: 0.5 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2,
    }))
  ).current

  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useRef(new THREE.Object3D()).current

  useFrame(() => {
    if (!meshRef.current) return
    const { fallSpeed, drift } = config
    const halfW = HALL.halfW
    const halfL = HALL.halfL
    const topY = HALL.wallH + 2

    for (let i = 0; i < count; i++) {
      const r = refs[i]
      // Cycle time: each particle's own phase so they don't all fall in sync
      const t = (performance.now() / 1000) * r.speed + r.offset
      // Fall from topY down to floor, looping
      const cycle = (t * fallSpeed) % (topY + 4)
      const y = topY - cycle
      // Gentle horizontal drift (sine wave)
      const x = r.x * halfW + Math.sin(t * 0.5 + r.offset) * drift * 2
      const z = r.z * halfL + Math.cos(t * 0.3 + r.offset) * drift * 2

      dummy.position.set(x, y, z)
      dummy.rotation.set(t * 0.3, t * 0.2, 0)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[0.15, 0.15]} />
      <meshBasicMaterial
        color={config.particleColor}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
