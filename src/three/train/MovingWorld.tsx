import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, type Group } from 'three'
import type { TrainLine } from '../../lib/train/lines'

// The living world that streams past the carriage windows during a journey. The
// train stays put; the WORLD scrolls toward −Z. Two leap-frogging chunks give
// a seamless infinite loop of near-field countryside (track, fields, cottages,
// barns, trees, telegraph poles), while a STATIC distant mountain range sits far
// out on the horizon as a parallax backdrop — distant things barely move, so the
// ridge holding still while the foreground rushes by reads as real depth.
// Deliberately low-poly individual meshes — kept small for laptop FPS.

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
  field1: string // crop / pasture A
  field2: string // crop / pasture B
  wall: string // cottage walls
  roof: string // cottage roof
  barn: string // barn body
  mtn: string // mountain rock
  cap: string // mountain snow-cap / ridge highlight
  night?: boolean // lit windows
  snow?: boolean
  rain?: boolean
  aurora?: boolean
}

function themeFor(line: TrainLine): Theme {
  const night = line.mood.timeOfDay === 'night'
  switch (line.mood.weather) {
    case 'autumn':
      return {
        ground: '#6e5a2e', hill: '#7a5326', tree: '#c2691f', trunk: '#3a2414',
        sky: '#e8a85a', fog: '#caa15f', light: '#ffce8a', ambient: '#8a6a45',
        field1: '#c9a24a', field2: '#9c7a32',
        wall: '#e3cda6', roof: '#8a4326', barn: '#9c3b2e', mtn: '#6b5a3e', cap: '#e8c98a', night,
      }
    case 'rain':
      return {
        ground: '#33473a', hill: '#2c4a44', tree: '#1f5a44', trunk: '#2a1d12',
        sky: '#4a5a66', fog: '#5a6a72', light: '#bcd0dc', ambient: '#48565e',
        field1: '#3f6a48', field2: '#587b4a', wall: '#b9bcc0', roof: '#4a5560',
        barn: '#7a4038', mtn: '#3e4a52', cap: '#9fb0bc', rain: true, night,
      }
    case 'snow':
      return {
        ground: '#cfd8e6', hill: '#aebccf', tree: '#3a4a55', trunk: '#2a2218',
        sky: '#1a2342', fog: '#3a4366', light: '#cdd6ff', ambient: '#5a6488',
        field1: '#dfe7f2', field2: '#c6d2e2', wall: '#8a8f9c', roof: '#3a4256',
        barn: '#6a3a36', mtn: '#5a6478', cap: '#ffffff', snow: true, night: true,
      }
    case 'aurora':
      return {
        ground: '#21304a', hill: '#283a55', tree: '#1f3a52', trunk: '#1a1d28',
        sky: '#0e1430', fog: '#1c2742', light: '#bfa7ff', ambient: '#4a4a78',
        field1: '#243a52', field2: '#2c4660', wall: '#3a4258', roof: '#222a3e',
        barn: '#4a2f3a', mtn: '#283450', cap: '#9bb6e0', aurora: true, night: true,
      }
    default:
      return {
        ground: '#4f7a32', hill: '#5e7f3a', tree: '#2f6a34', trunk: '#3a2414',
        sky: '#bfe0ff', fog: '#cfe6ff', light: '#fff4d8', ambient: '#9fb27a',
        field1: '#cdb45a', field2: '#6b9b3f', wall: '#e0d3b6', roof: '#9c4a32',
        barn: '#9c3b2e', mtn: '#6b7a5a', cap: '#eef4ff', night,
      }
  }
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

interface Prop {
  x: number
  z: number
  kind: 'tree' | 'hill' | 'pole' | 'rock' | 'house' | 'barn' | 'field'
  s: number
  r: number // rotation / variation
}

function buildChunk(seed: number): Prop[] {
  const rand = rng(seed)
  const out: Prop[] = []

  // farm fields: big flat colour patches well out on each side
  for (let i = 0; i < 5; i++) {
    const side = i % 2 === 0 ? 1 : -1
    out.push({ x: side * (24 + rand() * 26), z: rand() * CHUNK, kind: 'field', s: 1, r: rand() })
  }

  // scattered countryside features
  for (let i = 0; i < 16; i++) {
    const side = rand() > 0.5 ? 1 : -1
    const x = side * (11 + rand() * 40)
    const z = rand() * CHUNK
    const r = rand()
    let kind: Prop['kind']
    if (r < 0.34) kind = 'tree'
    else if (r < 0.5) kind = 'hill'
    else if (r < 0.64) kind = 'rock'
    else if (r < 0.82) kind = 'house'
    else kind = 'barn'
    // push buildings a little farther from the track than trees/rocks
    const far = kind === 'house' || kind === 'barn' ? Math.max(Math.abs(x), 20) * side : x
    out.push({ x: far, z, kind, s: 0.7 + rand() * 1.0, r: rand() })
  }

  // telegraph poles march down the lineside at a steady interval
  for (let z = 0; z < CHUNK; z += 18) out.push({ x: 6.5, z, kind: 'pole', s: 1, r: 0 })
  return out
}

/** The railway the train actually runs on during a journey. */
const TRACK_GAUGE = 0.9
const RAIL_TOP = -0.92
function Track() {
  const sleepers = useMemo(() => {
    const out: number[] = []
    for (let z = 1; z < CHUNK; z += 2.4) out.push(z)
    return out
  }, [])
  return (
    <group>
      <mesh position={[0, -1.0, CHUNK / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.2, CHUNK]} />
        <meshStandardMaterial color={'#37322c'} roughness={1} />
      </mesh>
      {sleepers.map((z) => (
        <mesh key={z} position={[0, -0.98, z]}>
          <boxGeometry args={[2.6, 0.12, 0.4]} />
          <meshStandardMaterial color={'#3a2a1c'} roughness={0.95} />
        </mesh>
      ))}
      {[-TRACK_GAUGE, TRACK_GAUGE].map((x) => (
        <mesh key={x} position={[x, RAIL_TOP, CHUNK / 2]}>
          <boxGeometry args={[0.14, 0.16, CHUNK]} />
          <meshStandardMaterial color={'#9aa3ad'} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/* ── A little timber cottage with a pitched roof and (at night) lit windows ── */
function Cottage({ theme, seed }: { theme: Theme; seed: number }) {
  const rand = useMemo(() => rng(seed), [seed])
  const w = 2.2 + rand() * 1.0
  const d = 2.0 + rand() * 0.8
  const h = 1.6 + rand() * 0.5
  return (
    <group>
      {/* walls */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={theme.wall} roughness={0.85} />
      </mesh>
      {/* pitched roof — a 4-sided cone makes a clean hip roof */}
      <mesh position={[0, h + 0.55, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[Math.max(w, d) * 0.82, 1.1, 4]} />
        <meshStandardMaterial color={theme.roof} roughness={0.8} />
      </mesh>
      {/* chimney */}
      <mesh position={[w * 0.28, h + 0.7, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshStandardMaterial color={'#5a4a40'} roughness={0.9} />
      </mesh>
      {/* front windows — warm and glowing after dark */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * w * 0.26, h * 0.5, d / 2 + 0.01]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial
            color={theme.night ? '#ffd98a' : '#33506a'}
            emissive={theme.night ? '#ffcf78' : '#000000'}
            emissiveIntensity={theme.night ? 1.4 : 0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── A red gable barn with big doors ── */
function Barn({ theme }: { theme: Theme }) {
  return (
    <group>
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[4, 2.6, 3]} />
        <meshStandardMaterial color={theme.barn} roughness={0.85} />
      </mesh>
      {/* gable roof from a 4-sided cone, flattened along one axis */}
      <mesh position={[0, 3.0, 0]} rotation-y={Math.PI / 4} scale={[1, 1, 1.25]}>
        <coneGeometry args={[2.7, 1.3, 4]} />
        <meshStandardMaterial color={'#4a3026'} roughness={0.85} />
      </mesh>
      {/* big door */}
      <mesh position={[0, 0.9, 1.51]}>
        <planeGeometry args={[1.4, 1.8]} />
        <meshStandardMaterial color={'#6a3a30'} roughness={0.9} />
      </mesh>
    </group>
  )
}

function ChunkMesh({ props, theme }: { props: Prop[]; theme: Theme }) {
  return (
    <group>
      <Track />
      {props.map((p, i) => {
        if (p.kind === 'field') {
          // a large flat crop patch, lightly tilted in colour per side
          const w = 16 + p.r * 16
          const d = 22 + p.r * 26
          return (
            <mesh key={i} position={[p.x, -1.03, p.z]} rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial color={p.r > 0.5 ? theme.field1 : theme.field2} roughness={1} />
            </mesh>
          )
        }
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
        if (p.kind === 'house') {
          return (
            <group key={i} position={[p.x, 0, p.z]} scale={p.s} rotation-y={p.r * Math.PI * 2}>
              <Cottage theme={theme} seed={(p.x * 131 + p.z * 17) | 0} />
            </group>
          )
        }
        if (p.kind === 'barn') {
          return (
            <group key={i} position={[p.x, 0, p.z]} scale={p.s} rotation-y={p.r * Math.PI}>
              <Barn theme={theme} />
            </group>
          )
        }
        // telegraph pole
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 6, 5]} />
              <meshStandardMaterial color={'#4a3a2e'} roughness={0.9} />
            </mesh>
            <mesh position={[0, 5.4, 0]}>
              <boxGeometry args={[1.2, 0.12, 0.12]} />
              <meshStandardMaterial color={'#4a3a2e'} roughness={0.9} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ── Static distant mountain range — the parallax backdrop. Three ridges (far
 *    horizon ahead + a wall on each side) of big snow-capped peaks that DON'T
 *    scroll, so they hold still on the skyline while the foreground rushes by. ── */
function MountainRange({ theme }: { theme: Theme }) {
  const peaks = useMemo(() => {
    const rand = rng(0xb33f)
    const out: { x: number; z: number; h: number; r: number; rot: number }[] = []
    // horizon range far ahead, spread across the whole field of view
    for (let x = -260; x <= 260; x += 34) out.push({ x: x + rand() * 16, z: 470 + rand() * 60, h: 60 + rand() * 55, r: 40 + rand() * 30, rot: rand() })
    // left wall
    for (let z = -120; z <= 600; z += 80) out.push({ x: -150 - rand() * 40, z, h: 50 + rand() * 50, r: 38 + rand() * 24, rot: rand() })
    // right wall
    for (let z = -120; z <= 600; z += 80) out.push({ x: 160 + rand() * 40, z, h: 50 + rand() * 50, r: 38 + rand() * 24, rot: rand() })
    return out
  }, [])
  return (
    <group>
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, -1, p.z]} rotation-y={p.rot * Math.PI}>
          <mesh>
            <coneGeometry args={[p.r, p.h, 5]} />
            <meshStandardMaterial color={theme.mtn} roughness={1} fog={false} />
          </mesh>
          {/* snow / highlight cap */}
          <mesh position={[0, p.h * 0.34, 0]}>
            <coneGeometry args={[p.r * 0.42, p.h * 0.34, 5]} />
            <meshStandardMaterial color={theme.cap} roughness={0.9} fog={false} />
          </mesh>
        </group>
      ))}
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
      {/* thinner fog than before so the countryside + mountains are actually
          visible streaming past, not swallowed a few metres out */}
      <fogExp2 attach="fog" args={[fogColor.getHex(), theme.snow || theme.rain ? 0.011 : 0.006]} />
      <hemisphereLight args={[new Color(theme.sky).getHex(), new Color(theme.ground).getHex(), 0.7]} />
      <directionalLight position={[30, 40, -20]} color={theme.light} intensity={theme.aurora || theme.night ? 0.5 : 1.1} castShadow={false} />

      <mesh>
        <sphereGeometry args={[600, 10, 8]} />
        <meshBasicMaterial color={theme.sky} side={DoubleSide} fog={false} />
      </mesh>

      <MountainRange theme={theme} />

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
