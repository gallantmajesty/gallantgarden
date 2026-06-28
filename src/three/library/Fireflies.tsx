import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type InstancedMesh, Object3D } from 'three'
import { groundShelves, SHELF, upperShelves } from './furniture'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface Mote {
  // world anchor (in front of a shelf face), plus a per-mote wander
  x: number
  y: number
  z: number
  amp: number // vertical bob amplitude
  driftX: number
  driftZ: number
  speed: number
  phase: number
}

/**
 * Tiny glowing fireflies hovering among the bookshelves — the "fireflies in the
 * stacks" look. Anchored in front of a random sample of the actual shelf
 * placements so they read as living in the books, each bobs and wanders on its
 * own slow cycle. Rendered as ONE instanced emissive mesh and lit purely by
 * bloom — zero real-time lights, one small instance-matrix upload per frame.
 */
export function Fireflies({ count = 40 }: { count?: number }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  const motes = useMemo<Mote[]>(() => {
    const shelves = [...groundShelves(), ...upperShelves()]
    if (shelves.length === 0) return []
    const rand = rng(13317)
    return Array.from({ length: count }, () => {
      const sh = shelves[Math.floor(rand() * shelves.length)]
      const [ox, oy, oz] = sh.pos
      const a = sh.rotY
      const c = Math.cos(a)
      const s = Math.sin(a)
      // local: spread along the shelf width, float a little out from the face
      const lx = (rand() - 0.5) * SHELF.w
      const lz = 0.5 + rand() * 1.3
      return {
        x: lx * c + lz * s + ox,
        y: oy + 0.6 + rand() * (SHELF.h - 1),
        z: -lx * s + lz * c + oz,
        amp: 0.15 + rand() * 0.4,
        driftX: 0.1 + rand() * 0.3,
        driftZ: 0.1 + rand() * 0.3,
        speed: 0.4 + rand() * 0.9,
        phase: rand() * Math.PI * 2,
      }
    })
  }, [count])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]
      dummy.position.set(
        m.x + Math.sin(t * m.speed + m.phase) * m.driftX,
        m.y + Math.sin(t * m.speed * 0.8 + m.phase * 1.7) * m.amp,
        m.z + Math.cos(t * m.speed * 0.7 + m.phase) * m.driftZ,
      )
      // gentle pulse so they twinkle
      const tw = 0.7 + Math.sin(t * 2 + m.phase * 3) * 0.3
      dummy.scale.setScalar(tw)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (motes.length === 0) return null

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, motes.length]} frustumCulled={false}>
      <sphereGeometry args={[0.05, 8, 8]} />
      {/* bright emissive core — bloom turns these into soft fireflies; toneMapped
          off so they stay punchy. No real light is created. */}
      <meshStandardMaterial color="#fff2cc" emissive="#ffd982" emissiveIntensity={3} toneMapped={false} />
    </instancedMesh>
  )
}
