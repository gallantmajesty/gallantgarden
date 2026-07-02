// RouteScenery — per-route chunk spawning with lifecycle pipeline.
// Each route has unique scenery types (countryside, forest_river, alpine_snow,
// night_city, desert_coast) with different prop sets. Chunks follow the
// SPAWN → APPROACH → PASS → FAR → DESPAWN pipeline.
//
// This is a significant upgrade from the basic MovingWorld.tsx system:
// - Route-specific prop generation (bushes, fences, flowers vs cacti, dunes)
// - Proper lifecycle management with pooling
// - Varied chunk types per route

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { RouteConfig } from './RouteManager'
import { getRouteSpeed } from './RouteManager'

const BASE_CHUNK_LEN = 220
const BASE_SPEED = 26

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

export interface Prop {
  x: number
  z: number
  kind: string
  s: number
  r: number
}

/** Build chunk props based on route scenery type */
function buildChunkForRoute(seed: number, scenery: RouteConfig['scenery']): Prop[] {
  const rand = rng(seed)
  const out: Prop[] = []

  switch (scenery) {
    case 'countryside': {
      // farm fields
      for (let i = 0; i < 5; i++) {
        const side = i % 2 === 0 ? 1 : -1
        out.push({ x: side * (24 + rand() * 26), z: rand() * BASE_CHUNK_LEN, kind: 'field', s: 1, r: rand() })
      }
      // scattered countryside features
      for (let i = 0; i < 16; i++) {
        const side = rand() > 0.5 ? 1 : -1
        const x = side * (11 + rand() * 40)
        const r = rand()
        let kind: string
        if (r < 0.3) kind = 'tree'
        else if (r < 0.45) kind = 'hill'
        else if (r < 0.55) kind = 'rock'
        else if (r < 0.7) kind = 'house'
        else if (r < 0.82) kind = 'barn'
        else if (r < 0.9) kind = 'bush'
        else kind = 'fence'
        const far = kind === 'house' || kind === 'barn' ? Math.max(Math.abs(x), 20) * side : x
        out.push({ x: far, z: rand() * BASE_CHUNK_LEN, kind, s: 0.7 + rand() * 1.0, r: rand() })
      }
      // telegraph poles
      for (let z = 0; z < BASE_CHUNK_LEN; z += 18) out.push({ x: 6.5, z, kind: 'pole', s: 1, r: 0 })
      break
    }
    case 'forest_river': {
      // dense forest floor
      for (let i = 0; i < 5; i++) {
        const side = i % 2 === 0 ? 1 : -1
        out.push({ x: side * (24 + rand() * 26), z: rand() * BASE_CHUNK_LEN, kind: 'field', s: 1, r: rand() })
      }
      // forest features
      for (let i = 0; i < 20; i++) {
        const side = rand() > 0.5 ? 1 : -1
        const x = side * (10 + rand() * 40)
        const r = rand()
        let kind: string
        if (r < 0.4) kind = 'pine'
        else if (r < 0.55) kind = 'fern'
        else if (r < 0.65) kind = 'rock'
        else if (r < 0.75) kind = 'stump'
        else if (r < 0.85) kind = 'mill'
        else kind = 'bridge'
        out.push({ x, z: rand() * BASE_CHUNK_LEN, kind, s: 0.7 + rand() * 1.0, r: rand() })
      }
      // river alongside track
      out.push({ x: 14, z: BASE_CHUNK_LEN / 2, kind: 'river', s: 1, r: 0 })
      break
    }
    case 'alpine_snow': {
      // snow drifts + alpine features
      for (let i = 0; i < 5; i++) {
        const side = i % 2 === 0 ? 1 : -1
        out.push({ x: side * (24 + rand() * 26), z: rand() * BASE_CHUNK_LEN, kind: 'snowdrift', s: 1, r: rand() })
      }
      for (let i = 0; i < 18; i++) {
        const side = rand() > 0.5 ? 1 : -1
        const x = side * (10 + rand() * 40)
        const r = rand()
        let kind: string
        if (r < 0.35) kind = 'pine'
        else if (r < 0.5) kind = 'cliff'
        else if (r < 0.65) kind = 'rock'
        else if (r < 0.8) kind = 'waterfall'
        else kind = 'eagle'
        out.push({ x, z: rand() * BASE_CHUNK_LEN, kind, s: 0.8 + rand() * 1.2, r: rand() })
      }
      break
    }
    case 'night_city': {
      // urban night scene
      for (let i = 0; i < 5; i++) {
        const side = i % 2 === 0 ? 1 : -1
        out.push({ x: side * (24 + rand() * 26), z: rand() * BASE_CHUNK_LEN, kind: 'field', s: 1, r: rand() })
      }
      for (let i = 0; i < 20; i++) {
        const side = rand() > 0.5 ? 1 : -1
        const x = side * (12 + rand() * 38)
        const r = rand()
        let kind: string
        if (r < 0.25) kind = 'streetlamp'
        else if (r < 0.45) kind = 'building'
        else if (r < 0.6) kind = 'church'
        else if (r < 0.75) kind = 'hedge'
        else kind = 'fence'
        out.push({ x, z: rand() * BASE_CHUNK_LEN, kind, s: 0.8 + rand() * 0.8, r: rand() })
      }
      break
    }
    case 'desert_coast': {
      // desert + coastal features
      for (let i = 0; i < 5; i++) {
        const side = i % 2 === 0 ? 1 : -1
        out.push({ x: side * (24 + rand() * 26), z: rand() * BASE_CHUNK_LEN, kind: 'dune', s: 1, r: rand() })
      }
      for (let i = 0; i < 16; i++) {
        const side = rand() > 0.5 ? 1 : -1
        const x = side * (11 + rand() * 40)
        const r = rand()
        let kind: string
        if (r < 0.25) kind = 'cactus'
        else if (r < 0.4) kind = 'palm'
        else if (r < 0.55) kind = 'rock'
        else if (r < 0.65) kind = 'oasis'
        else if (r < 0.75) kind = 'pyramid'
        else kind = 'camel'
        out.push({ x, z: rand() * BASE_CHUNK_LEN, kind, s: 0.8 + rand() * 1.2, r: rand() })
      }
      break
    }
  }

  return out
}

/** Render a single prop based on its kind and theme colors */
function PropMesh({ prop, theme }: { prop: Prop; theme: any }) {
  switch (prop.kind) {
    // ── Shared types (all routes) ──
    case 'field':
      return (
        <mesh position={[prop.x, -1.03, prop.z]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[16 + prop.r * 16, 22 + prop.r * 26]} />
          <meshStandardMaterial color={prop.r > 0.5 ? theme.field1 : theme.field2} roughness={1} />
        </mesh>
      )
    case 'tree':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
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
    case 'pine':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 2, 5]} />
            <meshStandardMaterial color={theme.trunk} roughness={0.9} />
          </mesh>
          {[0, 0.8, 1.6].map((y, i) => (
            <mesh key={i} position={[0, 2 + y, 0]}>
              <coneGeometry args={[1.2 - i * 0.3, 1.4, 6]} />
              <meshStandardMaterial color={theme.tree} roughness={0.85} />
            </mesh>
          ))}
        </group>
      )
    case 'hill':
      return (
        <mesh position={[prop.x * 1.8, -1, prop.z]} scale={[prop.s * 6, prop.s * 3, prop.s * 6]}>
          <sphereGeometry args={[1, 6, 5]} />
          <meshStandardMaterial color={theme.hill} roughness={1} />
        </mesh>
      )
    case 'rock':
      return (
        <mesh position={[prop.x, 0.3, prop.z]} scale={prop.s}>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color="#6a6560" roughness={0.95} />
        </mesh>
      )
    case 'pole':
      return (
        <group position={[prop.x, 0, prop.z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 6, 5]} />
            <meshStandardMaterial color="#4a3a2e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 5.4, 0]}>
            <boxGeometry args={[1.2, 0.12, 0.12]} />
            <meshStandardMaterial color="#4a3a2e" roughness={0.9} />
          </mesh>
        </group>
      )
    case 'house':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s} rotation-y={prop.r * Math.PI * 2}>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[2.2, 1.6, 2]} />
            <meshStandardMaterial color={theme.wall} roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.15, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[2, 1.1, 4]} />
            <meshStandardMaterial color={theme.roof} roughness={0.8} />
          </mesh>
        </group>
      )
    case 'barn':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s} rotation-y={prop.r * Math.PI}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[4, 2.6, 3]} />
            <meshStandardMaterial color={theme.barn} roughness={0.85} />
          </mesh>
          <mesh position={[0, 3.0, 0]} rotation-y={Math.PI / 4} scale={[1, 1, 1.25]}>
            <coneGeometry args={[2.7, 1.3, 4]} />
            <meshStandardMaterial color="#4a3026" roughness={0.85} />
          </mesh>
        </group>
      )

    // ── Express / Countryside ──
    case 'bush':
      return (
        <mesh position={[prop.x, 0.5, prop.z]} scale={prop.s}>
          <sphereGeometry args={[0.8, 5, 5]} />
          <meshStandardMaterial color={theme.tree} roughness={0.9} />
        </mesh>
      )
    case 'fence':
      return (
        <group position={[prop.x, 0, prop.z]}>
          {[-0.5, 0, 0.5].map((dz) => (
            <mesh key={dz} position={[0, 0.5, dz]}>
              <cylinderGeometry args={[0.04, 0.04, 1, 4]} />
              <meshStandardMaterial color="#8a7a60" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[0.06, 0.06, 1.2]} />
            <meshStandardMaterial color="#8a7a60" roughness={0.9} />
          </mesh>
        </group>
      )

    // ── Regional / Forest ──
    case 'fern':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          {[0, 1.2, 2.4].map((y, i) => (
            <mesh key={i} position={[0, 0.4 + y * 0.3, 0]} rotation-y={i * 1.2}>
              <coneGeometry args={[0.4, 0.6, 4]} />
              <meshStandardMaterial color="#2d5a30" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )
    case 'stump':
      return (
        <mesh position={[prop.x, 0.3, prop.z]} scale={prop.s}>
          <cylinderGeometry args={[0.4, 0.5, 0.6, 6]} />
          <meshStandardMaterial color={theme.trunk} roughness={0.95} />
        </mesh>
      )
    case 'mill':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[1, 1.2, 3, 6]} />
            <meshStandardMaterial color={theme.wall} roughness={0.85} />
          </mesh>
          <mesh position={[0, 3.2, 0]} rotation-y={prop.r * Math.PI}>
            <coneGeometry args={[1.5, 1, 6]} />
            <meshStandardMaterial color={theme.roof} roughness={0.8} />
          </mesh>
        </group>
      )
    case 'bridge':
      return (
        <group position={[prop.x, -0.3, prop.z]}>
          <mesh>
            <boxGeometry args={[3, 0.3, 4]} />
            <meshStandardMaterial color="#7a6a50" roughness={0.9} />
          </mesh>
          {[-1.2, 1.2].map((dx) => (
            <mesh key={dx} position={[dx, -0.5, 0]}>
              <boxGeometry args={[0.4, 1.2, 4]} />
              <meshStandardMaterial color="#6a5a40" roughness={0.9} />
            </mesh>
          ))}
        </group>
      )
    case 'river':
      return (
        <mesh position={[prop.x, -0.95, prop.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[4, BASE_CHUNK_LEN]} />
          <meshStandardMaterial color="#4a8ab0" roughness={0.3} metalness={0.2} transparent opacity={0.7} />
        </mesh>
      )

    // ── Mountain / Alpine ──
    case 'snowdrift':
      return (
        <mesh position={[prop.x * 1.5, -0.5, prop.z]} scale={[prop.s * 4, prop.s * 1.5, prop.s * 3]}>
          <sphereGeometry args={[1, 5, 4]} />
          <meshStandardMaterial color="#dfe7f2" roughness={0.95} />
        </mesh>
      )
    case 'cliff':
      return (
        <mesh position={[prop.x * 1.5, 2, prop.z]} scale={[prop.s * 3, prop.s * 5, prop.s * 2]}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#5a6478" roughness={0.95} />
        </mesh>
      )
    case 'waterfall':
      return (
        <group position={[prop.x, 0, prop.z]}>
          <mesh position={[0, 2, 0]} scale={[1, 4, 0.3]}>
            <boxGeometry args={[1.5, 1, 1]} />
            <meshStandardMaterial color="#6ab0d0" transparent opacity={0.6} />
          </mesh>
        </group>
      )
    case 'eagle':
      return (
        <group position={[prop.x, 8, prop.z]}>
          <mesh rotation-y={prop.r * Math.PI * 2}>
            <coneGeometry args={[0.5, 0.2, 3]} />
            <meshStandardMaterial color="#4a3a2e" roughness={0.9} />
          </mesh>
        </group>
      )

    // ── Night / City ──
    case 'streetlamp':
      return (
        <group position={[prop.x, 0, prop.z]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 4, 5]} />
            <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.2, 6, 6]} />
            <meshStandardMaterial color="#ffd98a" emissive="#ffcf78" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          <pointLight position={[prop.x, 4.2, prop.z]} color="#ffd98a" intensity={0.8} distance={8} decay={2} />
        </group>
      )
    case 'building':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          <mesh position={[0, 2, 0]} castShadow>
            <boxGeometry args={[3, 4, 2.5]} />
            <meshStandardMaterial color={theme.wall} roughness={0.85} />
          </mesh>
          {/* lit windows at night */}
          {[[-0.8, 1.5], [0.8, 1.5], [-0.8, 3], [0.8, 3]].map(([wx, wy], i) => (
            <mesh key={i} position={[wx, wy, 1.26]}>
              <planeGeometry args={[0.4, 0.5]} />
              <meshStandardMaterial color="#ffd98a" emissive="#ffcf78" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )
    case 'church':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[2.5, 4, 2]} />
            <meshStandardMaterial color="#5a5a60" roughness={0.9} />
          </mesh>
          <mesh position={[0, 4.8, 0]}>
            <coneGeometry args={[1.2, 2, 4]} />
            <meshStandardMaterial color="#3a3a40" roughness={0.85} />
          </mesh>
          {/* steeple cross */}
          <mesh position={[0, 6.2, 0]}>
            <boxGeometry args={[0.08, 0.6, 0.08]} />
            <meshStandardMaterial color="#c9a84c" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )
    case 'hedge':
      return (
        <mesh position={[prop.x, 0.5, prop.z]} scale={[prop.s * 0.8, prop.s * 0.6, prop.s * 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#1a3a20" roughness={0.95} />
        </mesh>
      )

    // ── Grand / Desert ──
    case 'dune':
      return (
        <mesh position={[prop.x * 2, -0.5, prop.z]} scale={[prop.s * 8, prop.s * 2, prop.s * 6]}>
          <sphereGeometry args={[1, 5, 4]} />
          <meshStandardMaterial color="#d4a860" roughness={1} />
        </mesh>
      )
    case 'cactus':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 2.4, 5]} />
            <meshStandardMaterial color="#3a6a30" roughness={0.9} />
          </mesh>
          <mesh position={[0.4, 1.8, 0]} rotation-z={-0.5}>
            <cylinderGeometry args={[0.12, 0.15, 1, 4]} />
            <meshStandardMaterial color="#3a6a30" roughness={0.9} />
          </mesh>
        </group>
      )
    case 'palm':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 4, 5]} />
            <meshStandardMaterial color="#6a5030" roughness={0.9} />
          </mesh>
          {[0, 1.2, 2.4, 3.6].map((rot, i) => (
            <mesh key={i} position={[Math.cos(rot) * 1.2, 4.2, Math.sin(rot) * 1.2]} rotation-x={0.5}>
              <coneGeometry args={[0.6, 1.5, 3]} />
              <meshStandardMaterial color="#2a7a28" roughness={0.85} />
            </mesh>
          ))}
        </group>
      )
    case 'oasis':
      return (
        <group position={[prop.x, 0, prop.z]}>
          <mesh position={[0, -0.8, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[3, 8]} />
            <meshStandardMaterial color="#4a8ab0" transparent opacity={0.7} />
          </mesh>
        </group>
      )
    case 'pyramid':
      return (
        <mesh position={[prop.x * 2, 0, prop.z * 1.5]} scale={prop.s}>
          <coneGeometry args={[3, 4, 4]} />
          <meshStandardMaterial color="#d4b060" roughness={0.95} />
        </mesh>
      )
    case 'camel':
      return (
        <group position={[prop.x, 0, prop.z]} scale={prop.s * 0.5} rotation-y={prop.r * Math.PI * 2}>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[1.2, 0.6, 0.5]} />
            <meshStandardMaterial color="#b08a50" roughness={0.9} />
          </mesh>
          <mesh position={[0.5, 1.2, 0]}>
            <sphereGeometry args={[0.2, 5, 5]} />
            <meshStandardMaterial color="#b08a50" roughness={0.9} />
          </mesh>
        </group>
      )

    default:
      return null
  }
}

/** The railway track (shared across all routes) */
function Track({ length }: { length: number }) {
  const sleepers = useMemo(() => {
    const out: number[] = []
    for (let z = 1; z < length; z += 2.4) out.push(z)
    return out
  }, [length])

  return (
    <group>
      <mesh position={[0, -1.0, length / 2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.2, length]} />
        <meshStandardMaterial color="#37322c" roughness={1} />
      </mesh>
      {sleepers.map((z) => (
        <mesh key={z} position={[0, -0.98, z]}>
          <boxGeometry args={[2.6, 0.12, 0.4]} />
          <meshStandardMaterial color="#3a2a1c" roughness={0.95} />
        </mesh>
      ))}
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, -0.92, length / 2]}>
          <boxGeometry args={[0.14, 0.16, length]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Single chunk of route-specific scenery */
function RouteChunk({ props, theme }: { props: Prop[]; theme: any }) {
  return (
    <group>
      <Track length={BASE_CHUNK_LEN} />
      {props.map((p, i) => (
        <PropMesh key={i} prop={p} theme={theme} />
      ))}
    </group>
  )
}

/** Static distant mountain range — parallax backdrop */
function MountainRange({ theme }: { theme: any }) {
  const peaks = useMemo(() => {
    const rand = rng(0xb33f)
    const out: { x: number; z: number; h: number; r: number; rot: number }[] = []
    for (let x = -260; x <= 260; x += 34) out.push({ x: x + rand() * 16, z: 470 + rand() * 60, h: 60 + rand() * 55, r: 40 + rand() * 30, rot: rand() })
    for (let z = -120; z <= 600; z += 80) out.push({ x: -150 - rand() * 40, z, h: 50 + rand() * 50, r: 38 + rand() * 24, rot: rand() })
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
          <mesh position={[0, p.h * 0.34, 0]}>
            <coneGeometry args={[p.r * 0.42, p.h * 0.34, 5]} />
            <meshStandardMaterial color={theme.cap} roughness={0.9} fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Full route scenery — leap-frogging chunks + mountains + weather overlay */
export function RouteScenery({
  route,
  theme,
  paused,
  decelerating,
  tunnelFade,
}: {
  route: RouteConfig
  theme: any
  paused?: boolean
  decelerating?: boolean
  tunnelFade?: number
}) {
  const chunk = useMemo(() => buildChunkForRoute(route.track * 977 + 13, route.scenery), [route.track, route.scenery])
  const aRef = useRef<Group>(null)
  const bRef = useRef<Group>(null)
  const scroll = useRef(0)
  const decelFactor = useRef(1)
  const speed = getRouteSpeed(route, BASE_SPEED)

  useFrame((_, dt) => {
    if (!paused || decelerating) {
      if (decelerating) {
        decelFactor.current = Math.max(0, decelFactor.current - dt / 10)
        scroll.current += dt * speed * decelFactor.current
      } else {
        decelFactor.current = 1
        scroll.current += dt * speed
      }
    }
    const s = scroll.current
    if (aRef.current) aRef.current.position.z = -(s % BASE_CHUNK_LEN)
    if (bRef.current) bRef.current.position.z = -(s % BASE_CHUNK_LEN) + BASE_CHUNK_LEN
  })

  // Tunnel fade: darken everything when in tunnel
  const tunnelOpacity = tunnelFade ?? 0

  return (
    <group>
      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[600, 10, 8]} />
        <meshBasicMaterial color={theme.sky} side={2} fog={false} />
      </mesh>

      {/* Mountain range backdrop */}
      <MountainRange theme={theme} />

      {/* Leap-frogging terrain chunks */}
      {[aRef, bRef].map((ref, i) => (
        <group key={i} ref={ref as any}>
          <mesh rotation-x={-Math.PI / 2} position={[0, -1.05, BASE_CHUNK_LEN / 2]} receiveShadow>
            <planeGeometry args={[300, BASE_CHUNK_LEN]} />
            <meshStandardMaterial color={theme.ground} roughness={1} />
          </mesh>
          <RouteChunk props={chunk} theme={theme} />
        </group>
      ))}

      {/* Tunnel blackout overlay */}
      {tunnelOpacity > 0 && (
        <mesh position={[0, 0, 50]}>
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial color="#000000" transparent opacity={tunnelOpacity} fog={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
