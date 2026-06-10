import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, type InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { HALL } from './layout'
import { env } from './env'

// glowing castle-window material (module-level so it can be animated each frame)
const CASTLE_WIN_MAT = new MeshStandardMaterial({ color: '#ffcf8a', emissive: '#ffaa44', emissiveIntensity: 1.5 })


function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface Tree {
  x: number
  z: number
  y: number
  h: number
  r: number
}

/**
 * The world outside the windows: rolling ground, a dense pine forest that sways
 * in the wind, distant mountains, a winding river, and a mysterious castle on a
 * far mountain whose windows glow at night. `count` scales with graphics quality.
 */
export function Exterior({ count }: { count: number }) {
  const trees = useMemo<Tree[]>(() => {
    const rand = rng(20260609)
    const out: Tree[] = []
    for (let i = 0; i < count; i++) {
      // ring around the building, denser along the long (x) sides
      const ang = rand() * Math.PI * 2
      const rad = HALL.halfW + 12 + rand() * 170
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad * 0.8
      if (Math.abs(x) < HALL.halfW + 6 && Math.abs(z) < HALL.halfL + 6) continue
      out.push({ x, z, y: -0.3 - rand() * 1.5, h: 6 + rand() * 12, r: 1.4 + rand() * 1.8 })
    }
    return out
  }, [count])

  return (
    <group>
      <Ground />
      <Mountains />
      <River />
      <PineForest trees={trees} />
      <DistantCastle />
      <Clouds />
    </group>
  )
}

/** Soft clouds drifting slowly across the sky — built from clustered flattened
 *  blobs (no textures) so they read as volume while staying cheap. */
function Clouds() {
  const ref = useRef<Group>(null)
  const clouds = useMemo(() => {
    const rand = rng(5150)
    return Array.from({ length: 9 }, () => {
      const puffs = Array.from({ length: 4 + Math.floor(rand() * 3) }, () => ({
        x: (rand() - 0.5) * 28,
        y: (rand() - 0.5) * 6,
        z: (rand() - 0.5) * 14,
        s: 7 + rand() * 9,
      }))
      return {
        x: -260 + rand() * 520,
        y: 120 + rand() * 70,
        z: -200 + rand() * 400,
        puffs,
      }
    })
  }, [])

  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.x += dt * 1.6
    if (ref.current.position.x > 320) ref.current.position.x = -320
  })

  return (
    <group ref={ref}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          {c.puffs.map((p, k) => (
            <mesh key={k} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.55, p.s]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#c8cdd6" transparent opacity={0.5} roughness={1} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <circleGeometry args={[420, 64]} />
      <meshStandardMaterial color="#2f4a2a" roughness={1} />
    </mesh>
  )
}

function PineForest({ trees }: { trees: Tree[] }) {
  const sway = useRef<Group>(null)
  const trunkRef = useRef<InstancedMesh>(null)
  const lowRef = useRef<InstancedMesh>(null)
  const topRef = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const d = new Object3D()
    trees.forEach((t, i) => {
      d.position.set(t.x, t.y + t.h * 0.25, t.z)
      d.rotation.set(0, 0, 0)
      d.scale.set(t.r * 0.18, t.h * 0.5, t.r * 0.18)
      d.updateMatrix()
      trunkRef.current?.setMatrixAt(i, d.matrix)

      d.position.set(t.x, t.y + t.h * 0.5, t.z)
      d.scale.set(t.r, t.h * 0.6, t.r)
      d.updateMatrix()
      lowRef.current?.setMatrixAt(i, d.matrix)

      d.position.set(t.x, t.y + t.h * 0.85, t.z)
      d.scale.set(t.r * 0.65, t.h * 0.5, t.r * 0.65)
      d.updateMatrix()
      topRef.current?.setMatrixAt(i, d.matrix)
    })
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    if (lowRef.current) lowRef.current.instanceMatrix.needsUpdate = true
    if (topRef.current) topRef.current.instanceMatrix.needsUpdate = true
  }, [trees])

  // cheap distant "wind": gently rock all foliage together
  useFrame((state) => {
    if (sway.current) sway.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.015
  })

  const n = Math.max(1, trees.length)
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, n]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#3a2616" roughness={1} />
      </instancedMesh>
      <group ref={sway}>
        <instancedMesh ref={lowRef} args={[undefined, undefined, n]} castShadow>
          <coneGeometry args={[1, 1, 7]} />
          <meshStandardMaterial color="#1f3a22" roughness={1} flatShading />
        </instancedMesh>
        <instancedMesh ref={topRef} args={[undefined, undefined, n]} castShadow>
          <coneGeometry args={[1, 1, 7]} />
          <meshStandardMaterial color="#274a2b" roughness={1} flatShading />
        </instancedMesh>
      </group>
    </group>
  )
}

function Mountains() {
  const peaks = useMemo(() => {
    const rand = rng(777)
    // two layered rings for depth; bluer & hazier the further out (aerial perspective)
    const out: { pos: [number, number, number]; h: number; r: number; shade: number; snow: number }[] = []
    for (let ring = 0; ring < 2; ring++) {
      const n = ring === 0 ? 22 : 18
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.18
        const rad = (ring === 0 ? 230 : 330) + rand() * 70
        out.push({
          pos: [Math.cos(a) * rad, -8, Math.sin(a) * rad * 0.85],
          h: 70 + rand() * (ring === 0 ? 80 : 120),
          r: 44 + rand() * 34,
          shade: (ring === 0 ? 0.55 : 0.78) + rand() * 0.18,
          snow: 0.62 + rand() * 0.12,
        })
      }
    }
    return out
  }, [])
  return (
    <group>
      {peaks.map((m, i) => {
        // hazy blue-grey rock fading toward the sky colour with distance
        const r = Math.round(96 + 70 * m.shade)
        const g = Math.round(108 + 74 * m.shade)
        const b = Math.round(128 + 84 * m.shade)
        return (
          <group key={i} position={m.pos} rotation={[0, i * 1.3, 0]}>
            <mesh>
              <coneGeometry args={[m.r, m.h, 7]} />
              <meshStandardMaterial color={`rgb(${r}, ${g}, ${b})`} roughness={1} flatShading />
            </mesh>
            {/* snow cap */}
            <mesh position={[0, m.h * (m.snow - 0.5), 0]}>
              <coneGeometry args={[m.r * (1 - m.snow + 0.06), m.h * (1 - m.snow), 7]} />
              <meshStandardMaterial color="#eef2f6" roughness={1} flatShading />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function River() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[120, -0.25, 60]}>
      <planeGeometry args={[26, 320]} />
      <meshStandardMaterial color="#2a4a6a" roughness={0.15} metalness={0.5} />
    </mesh>
  )
}

function DistantCastle() {
  const winMat = CASTLE_WIN_MAT

  // brighten windows at night
  useFrame(() => {
    winMat.emissiveIntensity = 0.6 + (1 - env.dayFactor) * 2.4
  })

  const towers = useMemo(() => {
    const rand = rng(33)
    return Array.from({ length: 7 }, (_, i) => {
      const a = -0.5 + i * 0.16
      return { x: Math.cos(a) * 24, z: Math.sin(a) * 10, h: 28 + rand() * 26, r: 4 + rand() * 3 }
    })
  }, [])

  return (
    <group position={[-230, 40, -60]} scale={1.4}>
      {/* the mountain it sits on */}
      <mesh position={[0, -34, 0]}>
        <coneGeometry args={[70, 80, 6]} />
        <meshStandardMaterial color="#33414f" roughness={1} flatShading />
      </mesh>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2, 0]}>
            <cylinderGeometry args={[t.r, t.r * 1.1, t.h, 8]} />
            <meshStandardMaterial color="#3c3a44" roughness={1} />
          </mesh>
          <mesh position={[0, t.h + t.r, 0]}>
            <coneGeometry args={[t.r * 1.3, t.r * 2.2, 8]} />
            <meshStandardMaterial color="#2a2630" roughness={1} />
          </mesh>
          {/* glowing windows */}
          <mesh position={[0, t.h * 0.6, t.r]} material={winMat}>
            <boxGeometry args={[t.r * 1.4, t.h * 0.7, 0.4]} />
          </mesh>
        </group>
      ))}
      {/* central keep */}
      <mesh position={[0, 16, -6]}>
        <boxGeometry args={[26, 32, 16]} />
        <meshStandardMaterial color="#34323c" roughness={1} />
      </mesh>
    </group>
  )
}
