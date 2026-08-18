import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SRGBColorSpace,
} from 'three'
import { InstancedShape, type ShapeItem } from '../library/Instanced'
import { CAFE } from './layout'
import { ChineseCafeCourtyardUpgrades } from './ChineseCafeCourtyardUpgrades'
import { CAFE_PALETTE } from './materials'

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

/** Soft radial falloff used for the pond's jade under-glow, mist, lantern halo. */
function radialTexture(inner: string, mid: string, outer: string): CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas required for jade pond')
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.04, size / 2, size / 2, size * 0.52)
  g.addColorStop(0, inner)
  g.addColorStop(0.4, mid)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function Koi({ index }: { index: number }) {
  const group = useRef<Group>(null)
  const radius = 1.25 + (index % 4) * 0.48
  const speed = 0.12 + (index % 3) * 0.025
  const phase = index * 0.91
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const a = clock.elapsedTime * speed + phase
    g.position.set(
      CAFE.pond.x + Math.cos(a) * radius,
      0.08 + Math.sin(a * 2.3 + phase) * 0.025,
      CAFE.pond.z + Math.sin(a) * radius * 0.78,
    )
    g.rotation.y = -a + Math.PI / 2
    g.rotation.z = Math.sin(a * 3.1) * 0.08
  })
  const pale = index % 3 === 0
  const gold = index % 5 === 2
  return (
    <group ref={group} scale={0.52 + (index % 2) * 0.12}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[0.18, 10, 7]} />
        <meshStandardMaterial color={gold ? '#d9a441' : pale ? '#f2e6c8' : '#d66b36'} roughness={0.45} />
      </mesh>
      <mesh position={[-0.23, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.15, 0.32, 3]} />
        <meshStandardMaterial color={gold ? '#c2913a' : index % 2 ? '#b64a2d' : '#f4e9cd'} roughness={0.5} />
      </mesh>
      <mesh position={[0.07, 0.12, 0]} rotation={[0, 0, -0.35]}>
        <coneGeometry args={[0.09, 0.22, 3]} />
        <meshStandardMaterial color="#d15b34" roughness={0.5} />
      </mesh>
    </group>
  )
}

/** A single curved bamboo leaf blade (lanceolate, slightly cupped), shared by
 *  every leaf in the grove via one InstancedMesh. */
function bambooLeafGeometry(): BufferGeometry {
  const geo = new BufferGeometry()
  const segments = 7
  const verts: number[] = []
  const uvs: number[] = []
  const idx: number[] = []
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments // 0 = base, 1 = tip
    const half = 0.05 * (1 - t * 0.85) // half-width narrows toward the tip
    const z = t * 0.5 // length along the blade
    const y = -Math.sin(t * Math.PI) * 0.02 - t * t * 0.04 // cupping + droop
    verts.push(-half, y, z, half, y, z)
    uvs.push(0, t, 1, t)
  }
  for (let ring = 0; ring < segments; ring++) {
    const a = ring * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** One draw call for the torus node rings at every bamboo culm joint. */
function BambooNodes({ items }: { items: { pos: [number, number, number]; scale: number; color: string }[] }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((n, i) => {
      dummy.position.set(n.pos[0], n.pos[1], n.pos[2])
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.scale.setScalar(n.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, new Color(n.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, dummy])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <torusGeometry args={[1, 0.16, 6, 14]} />
      <meshStandardMaterial color="#ffffff" roughness={0.6} />
    </instancedMesh>
  )
}

/** One draw call for all bamboo leaves — a shared curved blade geometry,
 *  instanced with per-leaf transforms and tints. */
function BambooLeaves({ items }: { items: { pos: [number, number, number]; rot: [number, number, number]; scale: number; color: string }[] }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const leafGeo = useMemo(() => bambooLeafGeometry(), [])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    items.forEach((l, i) => {
      dummy.position.set(l.pos[0], l.pos[1], l.pos[2])
      dummy.rotation.set(l.rot[0], l.rot[1], l.rot[2])
      dummy.scale.setScalar(l.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, new Color(l.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items, dummy])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <primitive object={leafGeo} attach="geometry" />
      <meshStandardMaterial color="#ffffff" roughness={0.78} side={2} />
    </instancedMesh>
  )
}

/** A realistic bamboo grove — smooth 16-sided tapered stems with a natural
 *  lean, node rings at every joint, curved leaf blades fanning out at the
 *  top, and a mossy rock base under each clump so it reads as a planted
 *  garden bed instead of cartoon sticks. */
function Bamboo() {
  const stems = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    const rnd = seeded(90210)
    const heights = [3.4, 4.1, 4.8, 5.5]
    for (let cluster = 0; cluster < 3; cluster++) {
      const cx = -5.8 + cluster * 5.8
      const cz = 1.35
      const n = 9 + Math.floor(rnd() * 3)
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2
        const r = 0.1 + rnd() * 0.45
        const h = heights[i % heights.length] + (rnd() - 0.5) * 0.9
        const leanX = (rnd() - 0.5) * 0.14
        const leanZ = (rnd() - 0.5) * 0.14
        const d = 0.05 + rnd() * 0.026 // culm diameter
        items.push({
          pos: [cx + Math.cos(a) * r + leanX * h * 0.5, h / 2, cz + Math.sin(a) * r + leanZ * h * 0.5],
          scale: [d, h, d],
          rot: [leanZ, rnd() * Math.PI, -leanX],
          color: i % 2 ? '#5c8a60' : '#4a7a52',
        })
      }
    }
    return items
  }, [])

  const nodes = useMemo<{ pos: [number, number, number]; scale: number; color: string }[]>(() => {
    const items: { pos: [number, number, number]; scale: number; color: string }[] = []
    const rnd = seeded(31337)
    for (let cluster = 0; cluster < 3; cluster++) {
      const cx = -5.8 + cluster * 5.8
      const cz = 1.35
      const n = 10 + Math.floor(rnd() * 3)
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2
        const r = 0.1 + rnd() * 0.45
        const h = 3.4 + rnd() * 2.3
        const leanX = (rnd() - 0.5) * 0.14
        const leanZ = (rnd() - 0.5) * 0.14
        const rings = 2 + Math.floor(rnd() * 3)
        for (let k = 0; k < rings; k++) {
          const t = 0.25 + k * 0.24 + (rnd() - 0.5) * 0.04
          const y = h * t
          const d = 0.05 + rnd() * 0.024
          items.push({
            pos: [cx + Math.cos(a) * r + leanX * y * 0.55, y, cz + Math.sin(a) * r + leanZ * y * 0.55],
            scale: d * 1.18,
            color: rnd() > 0.5 ? '#d6dfbe' : '#9cc296',
          })
        }
      }
    }
    return items
  }, [])

  const leaves = useMemo<{ pos: [number, number, number]; rot: [number, number, number]; scale: number; color: string }[]>(() => {
    const items: { pos: [number, number, number]; rot: [number, number, number]; scale: number; color: string }[] = []
    const rnd = seeded(777)
    const greens = ['#4d7a4e', '#5f8f55', '#3f6f47', '#6b9a5c', '#558a52']
    for (let cluster = 0; cluster < 3; cluster++) {
      const cx = -5.8 + cluster * 5.8
      const cz = 1.35
      const n = 11 + Math.floor(rnd() * 4)
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2
        const r = 0.08 + rnd() * 0.42
        const h = 3.0 + rnd() * 2.7
        const leanX = (rnd() - 0.5) * 0.14
        const leanZ = (rnd() - 0.5) * 0.14
        const top = 0.55 + rnd() * 0.32
        const y = h * top
        const tilt = (rnd() - 0.5) * 1.6
        const spin = rnd() * Math.PI * 2
        const droop = 0.5 + rnd() * 0.5
        items.push({
          pos: [cx + Math.cos(a) * r + leanX * y * 0.55, y + 0.05, cz + Math.sin(a) * r + leanZ * y * 0.55],
          rot: [tilt * 0.5, spin, tilt * droop],
          scale: 0.7 + rnd() * 0.7,
          color: greens[Math.floor(rnd() * greens.length)],
        })
      }
    }
    return items
  }, [])

  const rocks = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    const rnd = seeded(555)
    for (let cluster = 0; cluster < 3; cluster++) {
      const cx = -5.8 + cluster * 5.8
      const cz = 1.35
      for (let i = 0; i < 6; i++) {
        const a = rnd() * Math.PI * 2
        const r = 0.15 + rnd() * 0.45
        const sz = 0.14 + rnd() * 0.2
        items.push({
          pos: [cx + Math.cos(a) * r, 0.08 + rnd() * 0.05, cz + Math.sin(a) * r],
          scale: sz,
          rot: [rnd() * 0.3, rnd() * Math.PI, rnd() * 0.3],
          color: i % 3 ? '#6d7468' : '#4c5a44',
        })
      }
    }
    return items
  }, [])

  return (
    <group>
      {/* smooth 16-sided stems */}
      <InstancedShape items={stems} roughness={0.55} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 1, 1, 16]} />
      </InstancedShape>
      <BambooNodes items={nodes} />
      <BambooLeaves items={leaves} />
      {/* mossy rock bases */}
      <InstancedShape items={rocks} roughness={0.95} flatShading castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>
    </group>
  )
}

function RainChain({ x }: { x: number }) {
  return (
    <group position={[x, 0, 10.35]}>
      {Array.from({ length: 21 }, (_, i) => (
        <mesh key={i} position={[0, 1.02 + i * 0.42, 0]} rotation={[Math.PI / 2, i % 2 ? Math.PI / 2 : 0, 0]}>
          <torusGeometry args={[0.12, 0.018, 6, 12]} />
          <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/** Calm jade pond — a gently rippling dark-jade surface with a faint self-glow
 *  and a soft clearcoat reflection. No separate additive "glow disc", which read
 *  as an unnatural colored reflection floating over the water. */
function JadeWater() {
  const surface = useRef<Mesh>(null)
  const base = useRef<Float32Array | null>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const mesh = surface.current
    if (!mesh) return
    const pos = mesh.geometry.attributes.position
    if (!base.current) base.current = (pos.array as Float32Array).slice()
    const b = base.current
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 2] =
        Math.sin(b[i] * 0.95 + t * 0.85) * 0.03 +
        Math.sin(b[i + 1] * 1.25 + t * 1.15) * 0.024 +
        Math.sin((b[i] + b[i + 1]) * 2.1 + t * 1.7) * 0.012
    }
    pos.needsUpdate = true
    mesh.geometry.computeVertexNormals()
  })
  return (
    <mesh ref={surface} position={[CAFE.pond.x, 0.55, CAFE.pond.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[CAFE.pond.w, CAFE.pond.l, 42, 42]} />
      <meshPhysicalMaterial
        color="#1b4f47"
        roughness={0.22}
        metalness={0.0}
        clearcoat={0.6}
        clearcoatRoughness={0.28}
        emissive="#0c3b34"
        emissiveIntensity={0.16}
      />
    </mesh>
  )
}

/** Coping stones ringing the pond edge, with moss creeping over some. */
function PondRim() {
  const stones = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    const { w, l } = CAFE.pond
    const hw = w / 2
    const hl = l / 2
    const rnd = seeded(7)
    const tones = ['#7e7b70', '#6e7166', '#8a887a', '#5f6b52']
    const push = (x: number, z: number, len: number, wid: number, yaw: number) => {
      items.push({
        pos: [x, 0.5 + (rnd() - 0.5) * 0.04, z],
        scale: [len, 0.26 + rnd() * 0.06, wid],
        rot: [0, yaw + (rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.05],
        color: tones[Math.floor(rnd() * tones.length)],
      })
    }
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9
      const x = -hw + t * (hw * 2)
      push(x, hl, 0.72 + rnd() * 0.14, 0.34, 0)
      push(x, -hl, 0.72 + rnd() * 0.14, 0.34, 0)
    }
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8
      const z = -hl + t * (hl * 2)
      push(hw, z, 0.34, 0.72 + rnd() * 0.14, Math.PI / 2)
      push(-hw, z, 0.34, 0.72 + rnd() * 0.14, Math.PI / 2)
    }
    return items
  }, [])
  const moss = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    const rnd = seeded(23)
    for (let i = 0; i < 14; i++) {
      const s = stones[Math.floor(rnd() * stones.length)]
      items.push({
        pos: [s.pos[0] + (rnd() - 0.5) * 0.3, 0.74 + rnd() * 0.08, s.pos[2] + (rnd() - 0.5) * 0.3],
        scale: 0.1 + rnd() * 0.13,
        color: rnd() > 0.5 ? '#4c6b3d' : '#3c5c33',
      })
    }
    return items
  }, [stones])
  return (
    <group>
      <InstancedShape items={stones} roughness={0.9} flatShading castShadow receiveShadow>
        <boxGeometry />
      </InstancedShape>
      <InstancedShape items={moss} roughness={0.95} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
      </InstancedShape>
    </group>
  )
}

/** Floating lily pads scattered across the water. */
function LilyPads() {
  const pads = useMemo<ShapeItem[]>(() => {
    const spots: [number, number][] = [
      [-2.6, 2.2], [2.8, 3.1], [-0.6, 3.9], [3.0, 5.6], [-2.9, 5.9],
      [0.9, 6.8], [-2.3, 7.4], [2.2, 8.2], [-1.1, 1.9], [2.5, 2.4],
      [-3.0, 4.3], [1.4, 3.4], [-1.5, 6.1], [2.9, 7.0], [0.4, 8.5],
    ]
    const rnd = seeded(11)
    return spots.map(([x, z], i) => ({
      pos: [x, 0.578 + (rnd() - 0.5) * 0.02, z],
      scale: [0.3 + rnd() * 0.3, 1, 0.2 + rnd() * 0.18],
      rot: [0, rnd() * Math.PI, (rnd() - 0.5) * 0.08],
      color: i % 2 ? '#3f7a4e' : '#316b44',
    }))
  }, [])
  return (
    <InstancedShape items={pads} roughness={0.6} receiveShadow>
      <cylinderGeometry args={[1, 1, 0.05, 18]} />
    </InstancedShape>
  )
}

/** Pink lotus blooms — one hero flower plus smaller companions. */
function LotusFlowers() {
  const flowers = useMemo(() => [
    { x: 1.45, z: 5.15, s: 1.2, c: '#e78fa9' },
    { x: 0.0, z: 2.9, s: 0.8, c: '#eaa0b0' },
    { x: -2.2, z: 3.0, s: 0.75, c: '#efb1bb' },
    { x: 2.4, z: 7.3, s: 0.7, c: '#e58aa3' },
    { x: -1.9, z: 7.6, s: 0.85, c: '#f0b8c0' },
  ], [])
  const petals = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    flowers.forEach((f, fi) => {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + fi * 0.45
        items.push({
          pos: [f.x + Math.cos(a) * 0.06 * f.s, 0.64 + f.s * 0.06, f.z + Math.sin(a) * 0.06 * f.s],
          scale: [0.11 * f.s, 0.42 * f.s, 0.06 * f.s],
          rot: [0.62, 0, a + Math.PI / 2],
          color: f.c,
        })
      }
    })
    return items
  }, [flowers])
  const centers = useMemo<ShapeItem[]>(() =>
    flowers.map((f) => ({
      pos: [f.x, 0.67 + f.s * 0.02, f.z],
      scale: [0.16 * f.s, 0.11 * f.s, 0.16 * f.s],
      color: '#e9c163',
    })), [flowers])
  return (
    <group>
      <InstancedShape items={petals} roughness={0.5} castShadow>
        <coneGeometry args={[1, 1, 8]} />
      </InstancedShape>
      <InstancedShape items={centers} roughness={0.55}>
        <sphereGeometry args={[1, 12, 8]} />
      </InstancedShape>
    </group>
  )
}

/** Rain hitting the pond — thin rings that bloom outward and fade. */
const RIPPLE_SPOTS: [number, number][] = [
  [-2.2, 3.6], [1.8, 4.2], [-0.8, 5.9], [2.6, 6.3], [-1.6, 7.8],
  [0.5, 2.6], [2.0, 8.6], [-2.8, 5.2], [0.9, 7.4],
]

function RainRipples() {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    RIPPLE_SPOTS.forEach((_, i) => {
      const m = group.current?.children[i] as Mesh | undefined
      if (!m) return
      const cyc = (t * 0.6 + i * 0.37) % 2.0
      const s = 0.14 + cyc * 1.0
      m.scale.set(s, s, 1)
      const mat = m.material as MeshBasicMaterial
      mat.opacity = cyc < 1.6 ? 0.5 * Math.sin((cyc / 1.6) * Math.PI) : 0
    })
  })
  return (
    <group ref={group}>
      {RIPPLE_SPOTS.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.575, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1, 26]} />
          <meshBasicMaterial color="#7fd8c0" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={2} />
        </mesh>
      ))}
    </group>
  )
}

/** Drifting glow motes hovering over the water at night. */
function Fireflies() {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const flies = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const a = i * 2.399
    const r = 1.2 + (i % 5) * 0.55
    return {
      x: Math.cos(a) * r,
      z: CAFE.pond.z + Math.sin(a) * r * 0.92,
      y0: 0.15 + (i % 4) * 0.12,
      phase: i * 1.61,
    }
  }), [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const t = clock.elapsedTime
    flies.forEach((f, i) => {
      dummy.position.set(
        f.x + Math.sin(t * 0.5 + f.phase) * 0.55,
        f.y0 + 0.55 + Math.sin(t * 0.95 + f.phase * 1.3) * 0.32,
        f.z + Math.cos(t * 0.42 + f.phase) * 0.55,
      )
      const p = 0.5 + 0.5 * Math.sin(t * 2.1 + f.phase)
      dummy.scale.setScalar(0.035 + p * 0.045)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, flies.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#d9f7a8" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}

/** Slow, faint mist drifting over the pond surface. */
function MistVeil() {
  const a = useRef<Mesh>(null)
  const b = useRef<Mesh>(null)
  const tex = useMemo(() => radialTexture('rgba(150, 200, 190, 0.8)', 'rgba(110, 160, 155, 0.35)', 'rgba(60, 100, 95, 0)'), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (a.current) a.current.position.x = CAFE.pond.x + Math.sin(t * 0.05) * 1.1
    if (b.current) b.current.position.x = CAFE.pond.x + Math.cos(t * 0.042) * 1.3
  })
  return (
    <group>
      <mesh ref={a} position={[CAFE.pond.x, 1.0, CAFE.pond.z + 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 11]} />
        <meshBasicMaterial map={tex} transparent opacity={0.09} blending={AdditiveBlending} depthWrite={false} side={2} />
      </mesh>
      <mesh ref={b} position={[CAFE.pond.x, 0.98, CAFE.pond.z - 0.5]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <planeGeometry args={[9, 10]} />
        <meshBasicMaterial map={tex} transparent opacity={0.07} blending={AdditiveBlending} depthWrite={false} side={2} />
      </mesh>
    </group>
  )
}

/**
 * Shishi-odoshi — the bamboo water feature at the pond's west edge. A spout
 * drips water into a pivoting bamboo tube that slowly fills, tips, pours into
 * the pond, then springs back with a clack. The rhythmic cycle is the classic
 * garden meditation device.
 */
function SozuWaterFeature() {
  const tube = useRef<Group>(null)
  const fill = useRef<Mesh>(null)
  const pour = useRef<Group>(null)
  const splash = useRef<Mesh>(null)
  const splashMat = useRef<MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const CYCLE = 5.2
    const p = (t % CYCLE) / CYCLE
    const FILL_END = 0.82
    let angle: number
    if (p < FILL_END) {
      // Slow fill — the tube barely moves as water collects in the open end.
      const f = p / FILL_END
      angle = 0.35 - f * 0.25
      if (fill.current) {
        fill.current.visible = true
        fill.current.scale.x = 0.05 + f * 0.85
      }
      if (pour.current) pour.current.visible = false
      if (splash.current) splash.current.visible = false
    } else {
      const tp = (p - FILL_END) / (1 - FILL_END)
      if (tp < 0.16) {
        // Quick tip forward — the water pours out over the pond edge.
        const k = tp / 0.16
        angle = 0.1 - k * 0.85
        if (fill.current) fill.current.visible = false
        if (pour.current) pour.current.visible = k > 0.3
        if (splash.current) splash.current.visible = k > 0.3
      } else if (tp < 0.6) {
        angle = -0.75
        if (splash.current) {
          const s = (tp - 0.16) / 0.44
          splash.current.scale.setScalar(0.4 + s * 0.9)
          if (splashMat.current) splashMat.current.opacity = 0.5 * (1 - s * 0.75)
        }
      } else {
        // Spring back with a damped clack-bounce.
        const k = (tp - 0.6) / 0.4
        angle = -0.75 + k * 1.1 + Math.sin(k * Math.PI * 4) * 0.14 * (1 - k)
        if (pour.current) pour.current.visible = false
        if (splash.current) splash.current.visible = false
        if (fill.current) fill.current.visible = false
      }
    }
    if (tube.current) tube.current.rotation.z = angle
  })

  return (
    <group position={[-4.15, 0.16, 2.7]}>
      {/* base rock the whole thing sits on */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.92, 0]} />
        <meshStandardMaterial color="#5a5f58" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-0.45, 0.12, 0.3]} castShadow>
        <dodecahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#64685f" roughness={0.95} flatShading />
      </mesh>

      {/* two upright bamboo posts + crossbar */}
      {[-0.42, 0.42].map((x) => (
        <group key={x} position={[x, 0.55, -0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.045, 0.06, 1.25, 8]} />
            <meshStandardMaterial color="#4d6b3f" roughness={0.6} />
          </mesh>
          {[0.3, 0.85].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.05, 0.008, 6, 10]} />
              <meshStandardMaterial color="#3c5633" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.24, -0.15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.05, 1.05, 8]} />
        <meshStandardMaterial color="#4d6b3f" roughness={0.6} />
      </mesh>

      {/* bamboo spout — the water pip delivering the drip */}
      <mesh position={[0.12, 1.12, -0.15]} rotation={[0, 0, 0.75]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.85, 8]} />
        <meshStandardMaterial color="#557447" roughness={0.6} />
      </mesh>
      <mesh position={[0.28, 1.44, -0.15]} rotation={[0, 0, 0.75]}>
        <torusGeometry args={[0.045, 0.008, 6, 10]} />
        <meshStandardMaterial color="#3c5633" roughness={0.7} />
      </mesh>
      {/* continuous drip from the spout into the tube's open end */}
      <mesh position={[0.42, 1.12, -0.15]} rotation={[0, 0, 0.55]}>
        <cylinderGeometry args={[0.012, 0.012, 0.75, 6]} />
        <meshBasicMaterial color="#8fd8d0" transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {/* the pivoting bamboo tube — open end (+x) catches the drip */}
      <group ref={tube} position={[0, 1.04, -0.15]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 1.9, 10]} />
          <meshStandardMaterial color="#5a7a48" roughness={0.55} />
        </mesh>
        {[-0.7, -0.35, 0.0, 0.35].map((y) => (
          <mesh key={y} position={[y, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.058, 0.008, 6, 10]} />
            <meshStandardMaterial color="#44613a" roughness={0.7} />
          </mesh>
        ))}
        {/* hollow open end */}
        <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.08, 10, 1, true]} />
          <meshStandardMaterial color="#2c3822" roughness={0.8} side={2} />
        </mesh>
        {/* collected water inside the open end (grows as it fills) */}
        <mesh ref={fill} position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 1, 1]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
          <meshBasicMaterial color="#7fd0c8" transparent opacity={0.65} depthWrite={false} />
        </mesh>
      </group>

      {/* pour stream + splash, shown while the tube is tipped */}
      <group ref={pour}>
        <mesh position={[0.73, 0.42, -0.15]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.013, 0.018, 0.22, 6]} />
          <meshBasicMaterial color="#8fd8d0" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={splash} position={[0.75, 0.39, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 24]} />
        <meshBasicMaterial ref={splashMat} color="#a7e8dc" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={2} />
      </mesh>
    </group>
  )
}

/** A quiet meditation spot on the deck just west of the pond, facing it. */
function MeditationSpot() {
  return (
    <group position={[-4.55, 0.115, 5.7]} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.1, 8]} />
        <meshStandardMaterial color="#6f736a" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.52, 0.2, 20]} />
        <meshStandardMaterial color="#b0853f" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.42, 0.08, 20]} />
        <meshStandardMaterial color="#c99a52" roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Small glowing stone lantern perched on rocks at the pond's east edge. */
function StoneLantern() {
  const glowTex = useMemo(() => radialTexture('rgba(255, 196, 110, 0.9)', 'rgba(255, 160, 70, 0.4)', 'rgba(255, 140, 60, 0)'), [])
  return (
    <group position={[4.35, 0.32, 3.7]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <dodecahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial color="#565c56" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-0.35, 0.4, 0.28]} castShadow>
        <dodecahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial color="#6b716a" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.05, 0.75, -0.05]} castShadow>
        <boxGeometry args={[0.34, 0.1, 0.34]} />
        <meshStandardMaterial color="#6f6d63" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 1.0, -0.05]} castShadow>
        <boxGeometry args={[0.26, 0.42, 0.26]} />
        <meshStandardMaterial color="#8a8778" roughness={0.85} />
      </mesh>
      <mesh position={[0.05, 1.0, -0.05]}>
        <boxGeometry args={[0.17, 0.3, 0.17]} />
        <meshBasicMaterial color="#ffb35c" />
      </mesh>
      <mesh position={[0.05, 1.24, -0.05]} castShadow>
        <coneGeometry args={[0.3, 0.2, 4]} />
        <meshStandardMaterial color="#5a574e" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.05, 1.0, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function ChineseCafeCourtyard() {
  return (
    <group>
      <mesh position={[CAFE.courtyard.x, 0.025, CAFE.courtyard.z]} receiveShadow>
        <boxGeometry args={[CAFE.courtyard.w, 0.18, CAFE.courtyard.l]} />
        <meshStandardMaterial color="#575a54" roughness={0.92} />
      </mesh>
      <mesh position={[CAFE.pond.x, 0.13, CAFE.pond.z]}>
        <boxGeometry args={[CAFE.pond.w + 1.1, 0.42, CAFE.pond.l + 1.1]} />
        <meshStandardMaterial color="#282d2b" roughness={0.86} />
      </mesh>
      <mesh position={[CAFE.pond.x, 0.37, CAFE.pond.z]}>
        <boxGeometry args={[CAFE.pond.w, 0.36, CAFE.pond.l]} />
        <meshStandardMaterial color="#101c1b" roughness={0.76} />
      </mesh>

      <JadeWater />
      <PondRim />
      <LilyPads />
      <LotusFlowers />
      <RainRipples />
      <Fireflies />
      <MistVeil />
      {Array.from({ length: 9 }, (_, i) => <Koi key={i} index={i} />)}

      <group position={[0, 0.8, 5.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.32, 9.3]} />
          <meshStandardMaterial color="#4b3322" roughness={0.67} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[0, 0.19, -4.15 + i * 0.75]}>
            <boxGeometry args={[2.05, 0.08, 0.07]} />
            <meshStandardMaterial color={i % 2 ? '#795033' : '#5e3d28'} roughness={0.62} />
          </mesh>
        ))}
        {[-1.04, 1.04].map((x) => (
          <group key={x} position={[x, 0.55, 0]}>
            <mesh><boxGeometry args={[0.09, 0.09, 9]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.65} roughness={0.32} /></mesh>
            {Array.from({ length: 13 }, (_, i) => (
              <mesh key={i} position={[0, 0.35, -4.1 + i * 0.68]}><boxGeometry args={[0.055, 0.7, 0.055]} /><meshStandardMaterial color="#3b281b" roughness={0.54} /></mesh>
            ))}
          </group>
        ))}
      </group>

      <Bamboo />
      <RainChain x={-4.45} />
      <RainChain x={4.45} />

      <group position={[5.55, 0.6, 2.1]} rotation={[0.12, 0.3, -0.08]}>
        <mesh castShadow>
          <dodecahedronGeometry args={[1.35, 1]} />
          <meshStandardMaterial color="#4a514d" roughness={0.95} flatShading />
        </mesh>
        <mesh position={[-0.3, 1.0, 0.15]} rotation={[0.2, 0, 0.4]}>
          <dodecahedronGeometry args={[0.7, 1]} />
          <meshStandardMaterial color="#59605b" roughness={0.95} flatShading />
        </mesh>
      </group>

      <SozuWaterFeature />
      <MeditationSpot />

      <StoneLantern />
      <ChineseCafeCourtyardUpgrades />

      {[-3.7, -1.5, 1.9, 3.9].map((x, i) => (
        <mesh key={x} position={[x, 0.66 + (i % 2) * 0.06, i % 2 ? 8.45 : 2.05]} rotation={[0, i * 0.4, 0]} receiveShadow>
          <cylinderGeometry args={[0.55, 0.62, 0.15, 7]} />
          <meshStandardMaterial color="#77766f" roughness={0.96} />
        </mesh>
      ))}

      <mesh position={[0, 10.02, 5.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.8, 10.6]} />
        <meshPhysicalMaterial color="#526968" transparent opacity={0.22} roughness={0.18} metalness={0.05} side={2} depthWrite={false} />
      </mesh>
    </group>
  )
}
