import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type InstancedMesh, Object3D } from 'three'
import { HALL } from './layout'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface Candle {
  x: number
  z: number
  y: number // hovering height (very high up)
  phase: number
  sway: number // gentle in-place drift
  bob: number
  speed: number
  scale: number
}

/**
 * Tiny enchanted candles drifting upward through the hall — the floating-candle
 * look from the wizarding world. Each is a small wax column with a glowing flame,
 * slowly rising and looping, with a gentle sway. Rendered as two instanced draws
 * (wax + flame), lit purely by bloom — zero real lights, one small matrix upload
 * per frame. Only shown at night (gated by `night` prop) so the daytime look is
 * never touched.
 */
export function FlyingCandles({ count = 70, night = false }: { count?: number; night?: boolean }) {
  const waxRef = useRef<InstancedMesh>(null)
  const flameRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  const candles = useMemo<Candle[]>(() => {
    const rand = rng(70707)
    return Array.from({ length: count }, () => {
      const x = (rand() - 0.5) * (HALL.halfW * 2 - 4)
      const z = (rand() - 0.5) * (HALL.halfL * 2 - 6)
      // VERY HIGH UP — candles hover near the ceiling (Harry Potter style), a
      // wide band from mid-height to just under the roof. They stay up there.
      const y = HALL.wallH * (0.55 + rand() * 0.38)
      return {
        x,
        z,
        y,
        phase: rand() * 100,
        sway: 0.15 + rand() * 0.4, // gentle in-place drift only
        bob: 0.1 + rand() * 0.3,
        speed: 0.2 + rand() * 0.4,
        scale: 0.7 + rand() * 0.7,
      }
    })
  }, [count])

  useFrame((state) => {
    if (!night) return
    const wax = waxRef.current
    const flame = flameRef.current
    if (!wax || !flame) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      // hover in place, high up — only a soft bob + sway, never rising
      const y = c.y + Math.sin(t * c.speed * 0.8 + c.phase) * c.bob
      const x = c.x + Math.sin(t * c.speed * 0.6 + c.phase) * c.sway
      const z = c.z + Math.cos(t * c.speed * 0.5 + c.phase * 1.3) * c.sway
      const sc = c.scale
      // wax body
      dummy.position.set(x, y, z)
      dummy.rotation.set(0, 0, Math.sin(t * 0.5 + c.phase) * 0.06)
      dummy.scale.set(sc, sc, sc)
      dummy.updateMatrix()
      wax.setMatrixAt(i, dummy.matrix)
      // flame sits just above the wax
      dummy.position.set(x, y + 0.13 * sc, z)
      const flick = 0.85 + Math.sin(t * 9 + c.phase * 5) * 0.15
      dummy.scale.set(sc * 0.5, sc * 0.9 * flick, sc * 0.5)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      flame.setMatrixAt(i, dummy.matrix)
    }
    wax.instanceMatrix.needsUpdate = true
    flame.instanceMatrix.needsUpdate = true
  })

  if (!night) return null

  return (
    <group>
      <instancedMesh ref={waxRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.035, 0.04, 0.24, 8]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.7} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={flameRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
