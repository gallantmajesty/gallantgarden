import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type BufferAttribute, type BufferGeometry, CanvasTexture, Color, type Group, type InstancedMesh, Object3D, type PointLight } from 'three'
import { env } from './env'
import { useScenePreset } from '../../store/quality'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * The Knowledge Tree — Focus Lily's centrepiece and visual identity. A great
 * trunk rises through the centre of the hall into a broad canopy of softly
 * glowing leaves, ringed by floating motes and lanterns. Elegant and warm, not
 * a flashy game prop. Sways almost imperceptibly.
 */
export function KnowledgeTree() {
  const sway = useRef<Group>(null)
  const treeLight = useRef<PointLight>(null)
  const preset = useScenePreset()

  // canopy leaf clusters within a dome (deterministic)
  const leaves = useMemo(() => {
    const rand = rng(4242)
    return Array.from({ length: 130 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 2 + rand() * 6.5
      const h = 9 + rand() * 6.5 - (rad / 8.5) * 2
      const warm = rand()
      return {
        pos: [Math.cos(a) * rad, h, Math.sin(a) * rad] as [number, number, number],
        s: 0.7 + rand() * 1.3,
        color: warm > 0.5 ? '#ffd98a' : '#ffc060',
        emissive: warm > 0.5 ? '#ffcf7a' : '#ff9e3a',
      }
    })
  }, [])

  // hanging lanterns
  const lanterns = useMemo(() => {
    const rand = rng(99)
    return Array.from({ length: 10 }, () => {
      const a = rand() * Math.PI * 2
      const rad = 3 + rand() * 5
      return { pos: [Math.cos(a) * rad, 7 + rand() * 3, Math.sin(a) * rad] as [number, number, number] }
    })
  }, [])

  // branches near the top
  const branches = useMemo(() => {
    const rand = rng(7)
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rand() * 0.4
      return { a, len: 3 + rand() * 2, tilt: 0.5 + rand() * 0.4 }
    })
  }, [])

  useFrame((state) => {
    if (sway.current) {
      const t = state.clock.elapsedTime
      sway.current.rotation.z = Math.sin(t * 0.25) * 0.012
      sway.current.rotation.x = Math.cos(t * 0.21) * 0.012
    }
    // warm the dais glow up after dark so the centrepiece reads as a soft beacon
    if (treeLight.current) treeLight.current.intensity = 2.8 + (1 - env.dayFactor) * 4.2
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

      {/* trunk */}
      <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 1.3, 9, 18]} />
        <meshStandardMaterial color="#5a3d22" roughness={0.95} />
      </mesh>
      {/* root flares */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.1, 0.5, Math.sin(a) * 1.1]} rotation={[0, -a, 0.5]} castShadow>
            <cylinderGeometry args={[0.18, 0.5, 1.8, 8]} />
            <meshStandardMaterial color="#4d3320" roughness={0.95} />
          </mesh>
        )
      })}

      <group ref={sway}>
        {/* branches */}
        {branches.map((b, i) => (
          <mesh
            key={i}
            position={[Math.cos(b.a) * 1.2, 8.6, Math.sin(b.a) * 1.2]}
            rotation={[b.tilt * Math.sin(b.a), -b.a, b.tilt * Math.cos(b.a)]}
            castShadow
          >
            <cylinderGeometry args={[0.12, 0.32, b.len * 2, 8]} />
            <meshStandardMaterial color="#5a3d22" roughness={0.95} />
          </mesh>
        ))}

        {/* canopy — gently lit foliage, not a glowing beacon. ONE instanced draw
            for all ~130 leaf clusters (was 130 separate meshes + materials). */}
        <Canopy leaves={leaves} />

        {/* small warm fireflies tucked in the canopy */}
        {lanterns.map((ln, i) => (
          <mesh key={i} position={ln.pos}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial color="#fff0c8" emissive="#ffce7a" emissiveIntensity={1.3} />
          </mesh>
        ))}
      </group>

      {/* a soft warm wash over the dais — gentle, not a floodlight. Gated by
          quality (a real light is costly); on low the canopy's emissive glow
          and the hall lanterns carry the look. */}
      {preset.treeLight && <pointLight ref={treeLight} position={[0, 6, 0]} intensity={2.8} distance={14} decay={2.5} color="#ffcf9a" />}

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
  color: string
  emissive: string
}

/** All canopy leaf clusters as a single instanced icosahedron mesh with
 *  per-instance colour — one draw call instead of ~130. */
function Canopy({ leaves }: { leaves: Leaf[] }) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    const col = new Color()
    leaves.forEach((l, i) => {
      dummy.position.set(l.pos[0], l.pos[1], l.pos[2])
      dummy.scale.setScalar(l.s)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      col.set(l.color)
      mesh.setColorAt(i, col)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, leaves.length)]}>
      <icosahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial emissive="#ffb24a" emissiveIntensity={0.28} roughness={0.7} flatShading />
    </instancedMesh>
  )
}
