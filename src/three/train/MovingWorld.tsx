import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, type Group } from 'three'
import type { TrainLine } from '../../lib/train/lines'

// The living world that streams past the carriage windows during a journey. The
// train stays put; the WORLD scrolls toward −Z. Two leap-frogging chunks give
// a seamless infinite loop. Simple individual meshes — kept deliberately small
// for laptop FPS.

const CHUNK = 220
const SPEED = 26

type Theme = {
  ground: string
  hill: string
  tree: string
  trunk: string
  sky: string
  fog: string
  light: string
  ambient: string
  snow?: boolean
  rain?: boolean
  aurora?: boolean
}

function themeFor(line: TrainLine): Theme {
  switch (line.mood.weather) {
    case 'autumn':
      return { ground: '#6e5a2e', hill: '#7a5326', tree: '#c2691f', trunk: '#3a2414', sky: '#e8a85a', fog: '#caa15f', light: '#ffce8a', ambient: '#8a6a45' }
    case 'rain':
      return { ground: '#33473a', hill: '#2c4a44', tree: '#1f5a44', trunk: '#2a1d12', sky: '#4a5a66', fog: '#5a6a72', light: '#bcd0dc', ambient: '#48565e', rain: true }
    case 'snow':
      return { ground: '#cfd8e6', hill: '#aebccf', tree: '#3a4a55', trunk: '#2a2218', sky: '#1a2342', fog: '#3a4366', light: '#cdd6ff', ambient: '#5a6488', snow: true }
    case 'aurora':
      return { ground: '#21304a', hill: '#283a55', tree: '#1f3a52', trunk: '#1a1d28', sky: '#0e1430', fog: '#1c2742', light: '#bfa7ff', ambient: '#4a4a78', aurora: true }
    default:
      return { ground: '#4f7a32', hill: '#5e7f3a', tree: '#2f6a34', trunk: '#3a2414', sky: '#bfe0ff', fog: '#cfe6ff', light: '#fff4d8', ambient: '#9fb27a' }
  }
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

interface Prop {
  x: number
  z: number
  kind: 'tree' | 'hill' | 'pole' | 'rock'
  s: number
}

function buildChunk(seed: number): Prop[] {
  const rand = rng(seed)
  const out: Prop[] = []
  for (let i = 0; i < 14; i++) {
    const side = rand() > 0.5 ? 1 : -1
    const x = side * (10 + rand() * 38)
    const z = rand() * CHUNK
    const r = rand()
    const kind: Prop['kind'] = r < 0.45 ? 'tree' : r < 0.65 ? 'hill' : r < 0.85 ? 'rock' : 'pole'
    out.push({ x, z, kind, s: 0.7 + rand() * 1.1 })
  }
  for (let z = 0; z < CHUNK; z += 18) out.push({ x: 6.5, z, kind: 'pole', s: 1 })
  return out
}

function ChunkMesh({ props, theme }: { props: Prop[]; theme: Theme }) {
  return (
    <group>
      {props.map((p, i) => {
        if (p.kind === 'tree') {
          return (
            <group key={i} position={[p.x, 0, p.z]} scale={p.s}>
              <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.18, 0.26, 2, 5]} />
                <meshStandardMaterial color={theme.trunk} roughness={0.9} />
              </mesh>
              <mesh position={[0, 2.6, 0]}>
                <coneGeometry args={[1.3, 3.2, 6]} />
                <meshStandardMaterial color={theme.tree} roughness={0.85} />
              </mesh>
            </group>
          )
        }
        if (p.kind === 'hill') {
          return (
            <mesh key={i} position={[p.x * 1.8, -1, p.z]} scale={[p.s * 6, p.s * 3, p.s * 6]}>
              <sphereGeometry args={[1, 6, 5]} />
              <meshStandardMaterial color={theme.hill} roughness={1} />
            </mesh>
          )
        }
        if (p.kind === 'rock') {
          return (
            <mesh key={i} position={[p.x, 0.3, p.z]} scale={p.s}>
              <dodecahedronGeometry args={[0.8, 0]} />
              <meshStandardMaterial color={'#6a6560'} roughness={0.95} />
            </mesh>
          )
        }
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 6, 5]} />
              <meshStandardMaterial color={'#4a3a2e'} roughness={0.9} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function MovingWorld({ line, paused }: { line: TrainLine; paused?: boolean }) {
  const theme = useMemo(() => themeFor(line), [line])
  const chunk = useMemo(() => buildChunk(line.platform * 977 + 13), [line.platform])
  const aRef = useRef<Group>(null)
  const bRef = useRef<Group>(null)
  const scroll = useRef(0)

  useFrame((_, dt) => {
    if (!paused) scroll.current += dt * SPEED
    const s = scroll.current
    if (aRef.current) aRef.current.position.z = -((s % CHUNK))
    if (bRef.current) bRef.current.position.z = -((s % CHUNK)) + CHUNK
  })

  const fogColor = useMemo(() => new Color(theme.fog), [theme])

  return (
    <group>
      <fogExp2 attach="fog" args={[fogColor.getHex(), theme.snow || theme.rain ? 0.02 : 0.012]} />
      <hemisphereLight args={[new Color(theme.sky).getHex(), new Color(theme.ground).getHex(), 0.7]} />
      <directionalLight position={[30, 40, -20]} color={theme.light} intensity={theme.aurora || line.mood.timeOfDay === 'night' ? 0.5 : 1.1} castShadow={false} />

      <mesh>
        <sphereGeometry args={[600, 10, 8]} />
        <meshBasicMaterial color={theme.sky} side={DoubleSide} fog={false} />
      </mesh>

      {[aRef, bRef].map((ref, i) => (
        <group key={i} ref={ref as any}>
          <mesh rotation-x={-Math.PI / 2} position={[0, -1.05, CHUNK / 2]} receiveShadow>
            <planeGeometry args={[300, CHUNK]} />
            <meshStandardMaterial color={theme.ground} roughness={1} />
          </mesh>
          <ChunkMesh props={chunk} theme={theme} />
        </group>
      ))}

      {(theme.snow || theme.rain) && <Precip snow={!!theme.snow} />}
      {theme.aurora && <Aurora />}
    </group>
  )
}

function Precip({ snow }: { snow: boolean }) {
  const ref = useRef<Group>(null)
  const count = snow ? 50 : 70
  const drops = useMemo(() => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 80, y: Math.random() * 24, z: (Math.random() - 0.2) * 120 })), [count])
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.children.forEach((c, i) => {
      const d = drops[i]
      d.y -= dt * (snow ? 4 : 22)
      d.z -= dt * 26
      if (d.y < 0) d.y = 24
      if (d.z < -30) d.z += 120
      c.position.set(d.x, d.y, d.z)
    })
  })
  return (
    <group ref={ref}>
      {drops.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          {snow ? <sphereGeometry args={[0.08, 4, 4]} /> : <boxGeometry args={[0.03, 0.5, 0.03]} />}
          <meshBasicMaterial color={snow ? '#ffffff' : '#9fb6c4'} transparent opacity={snow ? 0.9 : 0.5} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

function Aurora() {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.children.forEach((c, i) => ((c as any).material.opacity = 0.18 + Math.sin(s.clock.elapsedTime * 0.5 + i) * 0.1))
  })
  return (
    <group ref={ref} position={[0, 40, 120]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 30, i * 6, 0]} rotation-x={-0.3}>
          <planeGeometry args={[70, 24]} />
          <meshBasicMaterial color={i === 1 ? '#7CFFB0' : '#9b7cff'} transparent opacity={0.2} side={DoubleSide} fog={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
