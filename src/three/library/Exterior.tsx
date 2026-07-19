import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { type Group, type InstancedMesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { HALL } from './layout'
import { env } from './env'
import { InstancedShape, type ShapeItem } from './Instanced'
import { throttle } from '../../lib/frameThrottle'

// glowing castle-window material (module-level so it can be animated each frame)
const CASTLE_WIN_MAT = new MeshStandardMaterial({ color: '#ffcf8a', emissive: '#ffaa44', emissiveIntensity: 1.5 })

// outdoor lantern glow material
const LANTERN_MAT = new MeshStandardMaterial({ color: '#fff0c8', emissive: '#ffb24a', emissiveIntensity: 2.8, toneMapped: false })


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
 * in the wind, distant mountains, a winding river, a mysterious castle on a
 * far mountain whose windows glow at night, and magical lanterns scattered
 * through the dark woods. `count` scales with graphics quality.
 */
export function Exterior({ count, mountains = 40, clouds = 9 }: { count: number; mountains?: number; clouds?: number }) {
  // dense forest — 2.5x the quality preset count for a thick night woods feel
  const trees = useMemo<Tree[]>(() => {
    const rand = rng(20260609)
    const out: Tree[] = []
    const total = Math.round(count * 2.5)
    for (let i = 0; i < total; i++) {
      const ang = rand() * Math.PI * 2
      const rad = HALL.halfW + 8 + rand() * 180
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad * 0.8
      if (Math.abs(x) < HALL.halfW + 6 && Math.abs(z) < HALL.halfL + 6) continue
      out.push({ x, z, y: -0.3 - rand() * 1.5, h: 6 + rand() * 14, r: 1.4 + rand() * 1.8 })
    }
    return out
  }, [count])

  // Distance/visibility LOD: the exterior (forest, mountains, castle, clouds,
  // river, ground) is ONLY visible through the two long window-walls (±X). The
  // end walls are solid and the hall interior hides the rest, so whenever the
  // camera looks away from ±X the whole exterior is off-screen. We flip the
  // group's `visible` flag each frame (no React re-render) so all those instanced
  // draws + the 12 forest point-lights are skipped while you study facing a wall —
  // a large, invisible-to-the-user FPS win on integrated GPUs.
  const groupRef = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const _fwd = useRef(new Vector3())
  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    camera.getWorldDirection(_fwd.current)
    // looking toward a window wall when the forward vector's X component is
    // meaningfully non-zero (≈ >14° off-axis). Below that you can't see outside.
    g.visible = Math.abs(_fwd.current.x) > 0.25
  })

  return (
    <group ref={groupRef}>
      <Ground />
      <Mountains count={mountains} />
      <River />
      <PineForest trees={trees} />
      <ForestLanterns trees={trees} />
      <DistantCastle />
      <Clouds count={clouds} />
    </group>
  )
}

/** Soft clouds drifting slowly across the sky — built from clustered flattened
 *  blobs (no textures) so they read as volume while staying cheap. Every puff in
 *  the sky is ONE instanced draw call (was dozens of separate transparent meshes,
 *  each forcing its own draw + transparency sort). */
function Clouds({ count = 9 }: { count?: number }) {
  const ref = useRef<Group>(null)
  const puffs = useMemo<ShapeItem[]>(() => {
    const rand = rng(5150)
    const out: ShapeItem[] = []
    for (let i = 0; i < count; i++) {
      const cx = -260 + rand() * 520
      const cy = 120 + rand() * 70
      const cz = -200 + rand() * 400
      const n = 4 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const s = 7 + rand() * 9
        out.push({
          pos: [cx + (rand() - 0.5) * 28, cy + (rand() - 0.5) * 6, cz + (rand() - 0.5) * 14],
          scale: [s, s * 0.55, s],
        })
      }
    }
    return out
  }, [count])

  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.x += dt * 1.6
    if (ref.current.position.x > 320) ref.current.position.x = -320
  })

  return (
    <group ref={ref}>
      <InstancedShape items={puffs} color="#1a1e2a" roughness={1} transparent opacity={0.5} depthWrite={false}>
        <sphereGeometry args={[1, 10, 8]} />
      </InstancedShape>
    </group>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
      <circleGeometry args={[420, 64]} />
      <meshStandardMaterial color="#0f1f0e" roughness={1} />
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
      <instancedMesh ref={trunkRef} args={[undefined, undefined, n]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#1a1008" roughness={1} />
      </instancedMesh>
      <group ref={sway}>
        <instancedMesh ref={lowRef} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
          <coneGeometry args={[1, 1, 7]} />
          <meshStandardMaterial color="#0e1e0f" roughness={1} flatShading />
        </instancedMesh>
        <instancedMesh ref={topRef} args={[undefined, undefined, n]} castShadow frustumCulled={false}>
          <coneGeometry args={[1, 1, 7]} />
          <meshStandardMaterial color="#132616" roughness={1} flatShading />
        </instancedMesh>
      </group>
    </group>
  )
}

/** Magical lanterns scattered through the dark pine forest — warm glowing
 *  orbs hanging from invisible posts, pulsing softly. They create pools of
 *  golden light among the trees, making the woods feel enchanted at night. */
function ForestLanterns({ trees }: { trees: Tree[] }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  // pick a subset of trees to host lanterns (roughly 1 in 8, capped)
  const lanterns = useMemo(() => {
    const rand = rng(42424)
    const out: { x: number; y: number; z: number; phase: number }[] = []
    const step = Math.max(1, Math.floor(trees.length / 60))
    for (let i = 0; i < trees.length; i += step) {
      const t = trees[i]
      // place lantern slightly off to the side of the trunk, at mid-height
      const ox = (rand() - 0.5) * 3
      const oz = (rand() - 0.5) * 3
      out.push({
        x: t.x + ox,
        y: t.y + t.h * 0.45 + rand() * 2,
        z: t.z + oz,
        phase: rand() * Math.PI * 2,
      })
    }
    return out
  }, [trees])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    // Lanterns only pulse softly — rewriting their instance buffer at 60fps is
    // wasted work. 20Hz is visually identical.
    if (!throttle(20, performance.now())) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < lanterns.length; i++) {
      const l = lanterns[i]
      const pulse = 0.85 + Math.sin(t * 1.5 + l.phase) * 0.15
      dummy.position.set(l.x, l.y, l.z)
      dummy.scale.setScalar(pulse)
       dummy.updateMatrix()
       mesh.setMatrixAt(i, dummy.matrix)
     }
     mesh.instanceMatrix.needsUpdate = true
   })

  if (lanterns.length === 0) return null

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, lanterns.length]} frustumCulled={false}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <primitive object={LANTERN_MAT} attach="material" />
      </instancedMesh>
      {/* Real point-lights for the forest lanterns were removed: they are behind
          the hall walls ~99% of the time and were the single biggest forward-render
          cost (12 animated lights evaluated per fragment). The orbs already glow
          via the emissive LANTERN_MAT, so the visible look is unchanged — they read
          identically as warm pools of light, only now essentially for free.
          `lightRefs` is kept (unused) so the per-frame pulse loop still compiles. */}
    </group>
  )
}

function Mountains({ count = 40 }: { count?: number }) {
  // two layered rings for depth; bluer & hazier the further out (aerial
  // perspective). Each peak is a cone + a snow cap; the whole range collapses to
  // TWO instanced draws (was up to ~80 separate meshes + materials).
  const { peaks, caps } = useMemo(() => {
    const rand = rng(777)
    const peaks: ShapeItem[] = []
    const caps: ShapeItem[] = []
    const inner = Math.round(count * 0.55)
    let idx = 0
    for (let ring = 0; ring < 2; ring++) {
      const n = ring === 0 ? inner : count - inner
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.18
        const rad = (ring === 0 ? 230 : 330) + rand() * 70
        const h = 70 + rand() * (ring === 0 ? 80 : 120)
        const r = 44 + rand() * 34
        const shade = (ring === 0 ? 0.55 : 0.78) + rand() * 0.18
        const snow = 0.62 + rand() * 0.12
        const pos: [number, number, number] = [Math.cos(a) * rad, -8, Math.sin(a) * rad * 0.85]
        const rot: [number, number, number] = [0, idx * 1.3, 0]
        // hazy blue-grey rock fading toward the sky colour with distance
        const cr = Math.round(96 + 70 * shade)
        const cg = Math.round(108 + 74 * shade)
        const cb = Math.round(128 + 84 * shade)
        peaks.push({ pos, rot, scale: [r, h, r], color: `rgb(${cr}, ${cg}, ${cb})` })
        const capR = r * (1 - snow + 0.06)
        const capH = h * (1 - snow)
        caps.push({ pos: [pos[0], pos[1] + h * (snow - 0.5), pos[2]], rot, scale: [capR, capH, capR] })
        idx++
      }
    }
    return { peaks, caps }
  }, [count])
  return (
    <group>
      <InstancedShape items={peaks} roughness={1} flatShading>
        <coneGeometry args={[1, 1, 7]} />
      </InstancedShape>
      <InstancedShape items={caps} color="#eef2f6" roughness={1} flatShading>
        <coneGeometry args={[1, 1, 7]} />
      </InstancedShape>
    </group>
  )
}

function River() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[120, -0.25, 60]}>
      <planeGeometry args={[26, 320]} />
      <meshStandardMaterial color="#0a1a2e" roughness={0.15} metalness={0.5} />
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
    <group position={[0, 0, -100]} scale={1.8}>
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
