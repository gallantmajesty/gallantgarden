import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  type BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  Color,
  Euler,
  type Group,
  type InstancedMesh,
  type MeshStandardMaterial,
  Object3D,
  Quaternion,
  RepeatWrapping,
  Vector3,
} from 'three'
import { throttle } from '../../lib/frameThrottle'
import { useScenePreset } from '../../store/quality'
import { InstancedShape, type ShapeItem } from './Instanced'
import { Lod } from '../train/assets/Lod'
import { makeWoodNormalTexture } from './textures'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// module-level scratch for composing instance orientations
const _qv = new Quaternion()
const _ev = new Euler()

/** Build an Euler from an axis + angle — used to aim cylinders along arcs. */
function axisAngleToEuler(ax: number, ay: number, az: number, ang: number): [number, number, number] {
  const l = Math.hypot(ax, ay, az) || 1
  _qv.setFromAxisAngle(new Vector3(ax / l, ay / l, az / l), ang)
  _ev.setFromQuaternion(_qv)
  return [_ev.x, _ev.y, _ev.z]
}

/** Procedural bark: warm brown base with vertical ridge streaks, so the trunk
 *  reads as rough tree bark rather than flat wood. */
function makeBarkTexture(): CanvasTexture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, s, 0)
  g.addColorStop(0, '#4a3018')
  g.addColorStop(0.5, '#5f4024')
  g.addColorStop(1, '#4a3018')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = 'rgba(36,20,9,0.55)'
  ctx.lineWidth = 2.4
  for (let x = 4; x < s; x += 7) {
    ctx.beginPath()
    let y = (Math.random() - 0.5) * 14
    ctx.moveTo(x, 0)
    for (let yy = 0; yy < s; yy += 14) {
      y += (Math.random() - 0.5) * 11
      ctx.lineTo(Math.min(s, Math.max(0, x + (Math.random() - 0.5) * 5)), yy)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(150,100,58,0.3)'
  ctx.lineWidth = 1.3
  for (let x = 2; x < s; x += 11) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 3, s)
    ctx.stroke()
  }
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(2, 4)
  return t
}

/**
 * The Knowledge Tree — Focus Lily's centrepiece and visual identity. A great
 * trunk rises through the centre of the hall into a broad canopy of softly
 * glowing leaves, ringed by floating motes and lanterns. Elegant and warm, not
 * a flashy game prop. Sways almost imperceptibly.
 */
export function KnowledgeTree() {
  const sway = useRef<Group>(null)
  const stringMatRef = useRef<MeshStandardMaterial>(null)
  const preset = useScenePreset()
  const barkTex = useMemo(() => makeBarkTexture(), [])
  const barkNorm = useMemo(() => makeWoodNormalTexture(3, 43), [])

  // canopy foliage — a big golden Ghibli dome: one instanced draw for ~340
  // clusters, warm golds from deep amber at the heart out to pale straw.
  const leaves = useMemo(() => {
    const rand = rng(4242)
    return Array.from({ length: 340 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 1.8 + rand() * 6.4
      const h = 8.8 + rand() * 5.8 - (rad / 8.2) * 1.8
      const warm = rand()
      return {
        pos: [Math.cos(a) * rad, h, Math.sin(a) * rad] as [number, number, number],
        s: 0.75 + rand() * 1.15,
        rot: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as [number, number, number],
        color: warm > 0.55 ? '#ffd98a' : warm > 0.25 ? '#e8b060' : '#d99a3a',
      }
    })
  }, [])

  // LOD level 1 — the first 120 clusters of the same deterministic stream, so
  // the far canopy keeps the same seed's distribution at ~⅓ the instances.
  const sparseLeaves = useMemo(() => leaves.slice(0, 120), [leaves])

  // hanging lanterns
  const lanterns = useMemo(() => {
    const rand = rng(99)
    return Array.from({ length: 10 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 3 + rand() * 5
      return { pos: [Math.cos(a) * rad, 7 + rand() * 3, Math.sin(a) * rad] as [number, number, number] }
    })
  }, [])

  // twisted trunk — six overlapping tapered segments, each rotated a little
  // further around Y so the column reads as a living twisted tree. One
  // instanced draw with the bark texture + normal map.
  const trunkParts = useMemo(() => {
    const segs = [
      { y: 0.85, r: 1.32, h: 1.5, tw: 0.0, dx: 0.0, dz: 0.0 },
      { y: 2.4, r: 1.12, h: 1.6, tw: 0.16, dx: 0.05, dz: 0.02 },
      { y: 4.0, r: 0.95, h: 1.6, tw: 0.3, dx: -0.04, dz: 0.06 },
      { y: 5.6, r: 0.82, h: 1.6, tw: 0.42, dx: 0.06, dz: -0.03 },
      { y: 7.2, r: 0.7, h: 1.6, tw: 0.52, dx: -0.02, dz: -0.05 },
      { y: 8.8, r: 0.6, h: 1.6, tw: 0.6, dx: 0.02, dz: 0.03 },
    ]
    return segs.map((s) => ({
      pos: [s.dx, s.y, s.dz] as [number, number, number],
      rot: [0, s.tw, 0] as [number, number, number],
      scale: [s.r, s.h, s.r] as [number, number, number],
    }))
  }, [])

  // buttress roots + upper branches in ONE bark draw. Each root is three arcs
  // (rise, then droop back down to the stone) aimed along its spoke angle.
  const barkParts = useMemo(() => {
    const rand = rng(2024)
    const out: ShapeItem[] = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + rand() * 0.3
      const arcs = [
        { r0: 1.0, r1: 1.7, y0: 0.55, y1: 0.82, rb: 0.24 },
        { r0: 1.7, r1: 2.35, y0: 0.82, y1: 0.34, rb: 0.19 },
        { r0: 2.35, r1: 2.75, y0: 0.34, y1: 0.1, rb: 0.14 },
      ]
      for (const arc of arcs) {
        const dr = arc.r1 - arc.r0
        const dy = arc.y1 - arc.y0
        const len = Math.hypot(dr, dy)
        const mid = arc.r0 + dr / 2
        out.push({
          pos: [Math.cos(a) * mid, (arc.y0 + arc.y1) / 2, Math.sin(a) * mid],
          scale: [arc.rb, len, arc.rb],
          rot: axisAngleToEuler(Math.sin(a), 0, -Math.cos(a), Math.PI / 2 - Math.atan2(dy, dr)),
        })
      }
    }
    const branchRand = rng(7)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + branchRand() * 0.4
      const len = (3 + branchRand() * 2) * 2
      const tilt = 0.5 + branchRand() * 0.4
      out.push({
        pos: [Math.cos(a) * 1.2, 8.6, Math.sin(a) * 1.2],
        scale: [0.16, len, 0.16],
        rot: [tilt * Math.sin(a), -a, tilt * Math.cos(a)],
      })
    }
    return out
  }, [])

  // moss clumps hugging the trunk base (deterministic; every instance tinted)
  const mossParts = useMemo(() => {
    const rand = rng(303)
    const cols = ['#3f7a3a', '#4f8f44', '#33682f']
    return Array.from({ length: 14 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 0.95 + rand() * 0.75
      return {
        pos: [Math.cos(a) * rad, 0.34 + rand() * 0.5, Math.sin(a) * rad] as [number, number, number],
        scale: [0.55 + rand() * 0.3, 0.22 + rand() * 0.12, 0.55 + rand() * 0.3] as [number, number, number],
        rot: [0, rand() * Math.PI, 0] as [number, number, number],
        color: cols[Math.floor(rand() * cols.length)],
      }
    })
  }, [])

  // fairy string lights — six gently sagging threads of glowing orbs threaded
  // through the canopy. One instanced draw; the emissive pulses in useFrame.
  const strings = useMemo(() => {
    const rand = rng(5150)
    const out: ShapeItem[] = []
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2 + 0.3
      for (let k = 0; k < 9; k++) {
        const t = k / 8
        const rad = 1.7 + t * 3.9
        out.push({
          pos: [Math.cos(a) * rad, 11.4 - Math.sin(Math.PI * t) * 1.6, Math.sin(a) * rad],
          scale: 0.05 + rand() * 0.02,
        })
      }
    }
    return out
  }, [])

  // fine cords carrying the lanterns up to the branches
  const cords = useMemo(
    () =>
      lanterns.map((ln) => ({
        pos: [ln.pos[0], ln.pos[1] + 0.175, ln.pos[2]] as [number, number, number],
        scale: [0.017, 0.35, 0.017] as [number, number, number],
      })),
    [lanterns],
  )

  // ground-level life on the dais: a ring of mushrooms plus a few flowers
  const mushrooms = useMemo(() => {
    const rand = rng(707)
    const stems: ShapeItem[] = []
    const caps: ShapeItem[] = []
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2
      const rad = 2.5 + rand() * 1.0
      const x = Math.cos(a) * rad
      const z = Math.sin(a) * rad
      stems.push({ pos: [x, 0.42, z], scale: [0.021, 0.3, 0.021] })
      caps.push({
        pos: [x, 0.62, z],
        scale: [0.26 + rand() * 0.12, 0.15 + rand() * 0.06, 0.26 + rand() * 0.12],
        color: rand() > 0.5 ? '#c85a3a' : '#d96a4a',
      })
    }
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2
      const rad = 1.6 + rand() * 2.2
      caps.push({
        pos: [Math.cos(a) * rad, 0.34, Math.sin(a) * rad],
        scale: 0.06,
        color: rand() > 0.5 ? '#ff9eb0' : '#ffd9a0',
      })
    }
    return { stems, caps }
  }, [])

  useFrame((state) => {
    if (sway.current) {
      const t = state.clock.elapsedTime
      sway.current.rotation.z = Math.sin(t * 0.25) * 0.012
      sway.current.rotation.x = Math.cos(t * 0.21) * 0.012
    }
    // fairy-string twinkle — 30Hz is plenty for a slow pulse
    if (throttle(30, performance.now())) {
      const m = stringMatRef.current
      if (m) m.emissiveIntensity = 1.3 + Math.sin(state.clock.elapsedTime * 1.7) * 0.45
    }
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
      {/* faint rune ring etched around the dais on the floor */}
      <mesh position={[0, 0.03, 0]}>
        <torusGeometry args={[4.85, 0.05, 8, 96]} />
        <meshStandardMaterial color="#7aa8ff" emissive="#6f9bff" emissiveIntensity={0.85} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* twisted trunk — one instanced draw, bark texture + normal map */}
      <InstancedShape items={trunkParts} castShadow receiveShadow map={barkTex} normalMap={barkNorm} roughness={0.95}>
        <cylinderGeometry args={[0.85, 1, 1, 14]} />
      </InstancedShape>

      {/* moss clumps hugging the trunk base */}
      <InstancedShape items={mossParts} castShadow color="#ffffff" roughness={0.95}>
        <sphereGeometry args={[1, 10, 8]} />
      </InstancedShape>

      {/* mushrooms + flowers on the dais */}
      <InstancedShape items={mushrooms.stems} castShadow color="#e8dcc8" roughness={0.8}>
        <cylinderGeometry args={[0.85, 1, 1, 6]} />
      </InstancedShape>
      <InstancedShape items={mushrooms.caps} castShadow color="#ffffff" roughness={0.7}>
        <sphereGeometry args={[1, 10, 8]} />
      </InstancedShape>

      <group ref={sway}>
        {/* buttress roots + branches — one bark draw */}
        <InstancedShape items={barkParts} castShadow map={barkTex} normalMap={barkNorm} roughness={0.95}>
          <cylinderGeometry args={[0.85, 1, 1, 8]} />
        </InstancedShape>

        {/* canopy — big golden Ghibli dome, one instanced draw for ~340 clusters.
            Distance LOD (settings "Mesh detail · LOD bias" scales the ladder):
            full dome → ⅓-density dome → culled entirely. */}
        <Lod distances={[0, 42, 95]} bias={preset.lodBias}>
          <Canopy leaves={leaves} emissive="#e09a3a" emissiveIntensity={0.3} />
          <Canopy leaves={sparseLeaves} emissive="#e09a3a" emissiveIntensity={0.22} />
          <group />
        </Lod>

        {/* fairy string lights threaded through the canopy */}
        <Lod distances={[0, 55, 100]} bias={preset.lodBias}>
          <InstancedShape items={strings} emissive="#ffd27a" emissiveIntensity={1.5} roughness={0.4} materialRef={stringMatRef}>
            <sphereGeometry args={[1, 8, 8]} />
          </InstancedShape>
          <group />
        </Lod>

        {/* lantern cords + fireflies — culled past 60 m alongside the strings */}
        <Lod distances={[0, 60, 105]} bias={preset.lodBias}>
          <group>
            <InstancedShape items={cords} color="#3a2c10" roughness={0.8}>
              <cylinderGeometry args={[0.85, 1, 1, 6]} />
            </InstancedShape>

            {/* small warm fireflies tucked in the canopy */}
            {lanterns.map((ln, i) => (
              <mesh key={i} position={ln.pos}>
                <sphereGeometry args={[0.16, 10, 10]} />
                <meshStandardMaterial color="#fff0c8" emissive="#ffce7a" emissiveIntensity={1.3} />
              </mesh>
            ))}
          </group>
        </Lod>
      </group>

      {/* glowing rune motes drifting up out of the canopy — GPU Points, additive,
          picked up by bloom. Replaces the old round Sparkles with the magical
          rising-rune look. (only when particles are on) */}
      {preset.particles && <RuneMotes count={Math.round(20 + preset.dust * 1.2)} />}
    </group>
  )
}

/** A soft glowing rune sprite (warm core + faint eight-spoke glyph) used as the
 *  point texture for the drifting tree motes. Generated once. */
function makeRuneSprite(): CanvasTexture {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,244,210,1)')
  g.addColorStop(0.4, 'rgba(255,200,120,0.55)')
  g.addColorStop(1, 'rgba(255,180,80,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  ctx.translate(s / 2, s / 2)
  ctx.strokeStyle = 'rgba(255,250,232,0.85)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11)
  }
  ctx.stroke()
  return new CanvasTexture(c)
}

/**
 * Drifting rune motes rising out of the canopy. One `THREE.Points` draw call: a
 * shared position buffer is nudged upward each frame (and gently swirled around
 * the trunk), wrapping back down at the top. Additive + toneMapped:false so the
 * motes read as glowing sparks under bloom — no real lights, ~one cheap buffer
 * upload per frame for a few dozen points.
 */
function RuneMotes({ count }: { count: number }) {
  const geomRef = useRef<BufferGeometry>(null)
  const sprite = useMemo(() => makeRuneSprite(), [])

  const { positions, speeds, baseX, baseZ, phase } = useMemo(() => {
    const rand = rng(20260626)
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const baseX = new Float32Array(count)
    const baseZ = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2
      const rad = 1.5 + rand() * 6
      baseX[i] = Math.cos(a) * rad
      baseZ[i] = Math.sin(a) * rad
      positions[i * 3] = baseX[i]
      positions[i * 3 + 1] = 4 + rand() * 12
      positions[i * 3 + 2] = baseZ[i]
      speeds[i] = 0.4 + rand() * 0.8
      phase[i] = rand() * Math.PI * 2
    }
    return { positions, speeds, baseX, baseZ, phase }
  }, [count])

  useFrame((state, dtRaw) => {
    const g = geomRef.current
    if (!g) return
    // The motes drift slowly, so rewriting the whole position buffer every frame
    // is wasted bandwidth. 30Hz reads identically.
    if (!throttle(30, performance.now())) return
    const dt = Math.min(dtRaw, 0.05)
    const t = state.clock.elapsedTime
    const arr = (g.attributes.position as BufferAttribute).array as Float32Array
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speeds[i] * dt
      if (y > 17) y -= 13 // wrap back down to keep the column continuous
      arr[i * 3] = baseX[i] + Math.sin(t * 0.5 + phase[i]) * 0.5
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = baseZ[i] + Math.cos(t * 0.4 + phase[i]) * 0.5
    }
    g.attributes.position.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        map={sprite}
        color="#ffe0a0"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

interface Leaf {
  pos: [number, number, number]
  s: number
  rot: [number, number, number]
  color: string
}

/** All canopy leaf clusters of one tone as a single instanced icosahedron mesh
 *  with per-instance colour + random rotation — one draw call per tone. */
function Canopy({
  leaves,
  emissive = '#ffb24a',
  emissiveIntensity = 0.28,
}: {
  leaves: Leaf[]
  emissive?: string
  emissiveIntensity?: number
}) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const col = new Color()
    leaves.forEach((l, i) => {
      dummy.position.set(l.pos[0], l.pos[1], l.pos[2])
      dummy.scale.setScalar(l.s)
      dummy.rotation.set(l.rot[0], l.rot[1], l.rot[2])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      col.set(l.color)
      mesh.setColorAt(i, col)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, leaves.length)]} frustumCulled={false}>
      <icosahedronGeometry args={[0.7, 1]} />
      <meshStandardMaterial emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.7} flatShading />
    </instancedMesh>
  )
}
