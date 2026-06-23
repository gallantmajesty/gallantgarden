import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, type InstancedMesh, Object3D } from 'three'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** Gentle life: birds wheeling over the lake and butterflies fluttering near the
 *  flowers. Each group is one instanced mesh whose matrices are updated per frame
 *  (cheap). Counts are quality-scaled; pass 0 to disable (Low). */
export function Wildlife({ birds = 14, butterflies = 24 }: { birds?: number; butterflies?: number }) {
  return (
    <group>
      {birds > 0 && <Birds count={birds} />}
      {butterflies > 0 && <Butterflies count={butterflies} />}
    </group>
  )
}

function Birds({ count }: { count: number }) {
  const ref = useRef<InstancedMesh>(null)
  const flock = useMemo(() => {
    const rand = rng(1212)
    return Array.from({ length: count }, () => ({
      cx: -10 + rand() * 30,
      cz: -40 + rand() * 40,
      r: 18 + rand() * 40,
      y: 24 + rand() * 22,
      w: (0.1 + rand() * 0.18) * (rand() > 0.5 ? 1 : -1),
      phase: rand() * Math.PI * 2,
      flap: 6 + rand() * 4,
    }))
  }, [count])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const t = state.clock.elapsedTime
    flock.forEach((b, i) => {
      const ang = b.phase + t * b.w
      const x = b.cx + Math.cos(ang) * b.r
      const z = b.cz + Math.sin(ang) * b.r
      dummy.position.set(x, b.y + Math.sin(t * 0.5 + b.phase) * 1.5, z)
      dummy.rotation.set(0, -ang + (b.w > 0 ? Math.PI : 0), Math.sin(t * b.flap + b.phase) * 0.5)
      dummy.scale.setScalar(1.6)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      {/* a shallow open "V" wing pair */}
      <coneGeometry args={[0.8, 0.18, 4]} />
      <meshStandardMaterial color={new Color('#3a3f4a')} roughness={0.9} side={DoubleSide} flatShading />
    </instancedMesh>
  )
}

function Butterflies({ count }: { count: number }) {
  const ref = useRef<InstancedMesh>(null)
  const flutter = useMemo(() => {
    const rand = rng(909)
    const cols = ['#f4c64a', '#e98bbf', '#86c0ff', '#f0f4ff']
    return Array.from({ length: count }, () => ({
      ax: -80 + rand() * 160,
      az: -70 + rand() * 100,
      r: 1.5 + rand() * 4,
      y: 1.2 + rand() * 2.2,
      w: 0.4 + rand() * 0.8,
      phase: rand() * Math.PI * 2,
      flap: 12 + rand() * 8,
      col: new Color(cols[Math.floor(rand() * cols.length)]),
    }))
  }, [count])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const t = state.clock.elapsedTime
    flutter.forEach((b, i) => {
      const ang = b.phase + t * b.w
      const x = b.ax + Math.cos(ang) * b.r + Math.sin(t * 0.7 + b.phase) * 0.6
      const z = b.az + Math.sin(ang * 1.3) * b.r
      dummy.position.set(x, b.y + Math.sin(t * 1.3 + b.phase) * 0.5, z)
      const fold = Math.abs(Math.sin(t * b.flap + b.phase))
      dummy.rotation.set(0, ang, 0)
      dummy.scale.set(0.4 * (0.3 + fold * 0.7), 0.4, 0.4)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, b.col)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 0.7]} />
      <meshStandardMaterial vertexColors={false} roughness={0.7} side={DoubleSide} />
    </instancedMesh>
  )
}
