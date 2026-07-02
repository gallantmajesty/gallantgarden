// LuggageRack — brass rail luggage racks above seats on both sides.
// Randomly placed luggage items (trunks, hat boxes, parcels, books, jars).
// Items are instanced with slight random rotation and offset for natural look.

import { useMemo } from 'react'
import { CARRIAGE } from '../interior'
import { useBrassDarkMaterial } from '../materials/BrassMaterial'

const RACK_HEIGHT = 2.5
const RACK_DEPTH = 0.45

interface LuggageItem {
  type: 'trunk' | 'hatbox' | 'parcel' | 'books' | 'jar' | 'plant' | 'blanket'
  color: string
  w: number
  h: number
  d: number
  emissive?: string
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
}

const LUGGAGE_POOL: LuggageItem[] = [
  { type: 'trunk', color: '#8D6E63', w: 0.35, h: 0.2, d: 0.25 },
  { type: 'hatbox', color: '#FFF8E1', w: 0.25, h: 0.15, d: 0.25 },
  { type: 'parcel', color: '#BF5B21', w: 0.3, h: 0.18, d: 0.22 },
  { type: 'books', color: '#5D4037', w: 0.2, h: 0.18, d: 0.15 },
  { type: 'jar', color: '#E3F2FD', w: 0.12, h: 0.16, d: 0.12, emissive: '#4FC3F7', emissiveIntensity: 0.5, transparent: true, opacity: 0.7 },
  { type: 'plant', color: '#356B3E', w: 0.12, h: 0.18, d: 0.12 },
  { type: 'blanket', color: '#6B1D1D', w: 0.35, h: 0.08, d: 0.3 },
]

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function SingleLuggageItem({ item, position, rotation }: { item: LuggageItem; position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={[item.w, item.h, item.d]} />
      <meshStandardMaterial
        color={item.color}
        roughness={0.8}
        metalness={0.1}
        emissive={item.emissive ?? '#000000'}
        emissiveIntensity={item.emissiveIntensity ?? 0}
        transparent={item.transparent}
        opacity={item.opacity ?? 1}
      />
    </mesh>
  )
}

/** One rack section — brass rail + shelf + random items */
function RackSection({ side, z }: { side: -1 | 1; z: number }) {
  const brassDarkMat = useBrassDarkMaterial()
  const { halfW } = CARRIAGE
  const x = side * (halfW - 0.35)

  const items = useMemo(() => {
    const rand = rng(Math.floor(z * 100 + side * 1000))
    const count = 2 + Math.floor(rand() * 2)
    const picked: { item: LuggageItem; offset: [number, number, number]; rot: [number, number, number] }[] = []

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(rand() * LUGGAGE_POOL.length)
      const item = LUGGAGE_POOL[idx]
      picked.push({
        item,
        offset: [
          (rand() - 0.5) * 0.04,
          item.h / 2,
          (rand() - 0.5) * 0.3,
        ],
        rot: [
          0,
          (rand() - 0.5) * 0.17, // ±5 degrees
          0,
        ],
      })
    }
    return picked
  }, [z, side])

  return (
    <group position={[x, RACK_HEIGHT, z]}>
      {/* Brass shelf surface */}
      <mesh castShadow>
        <boxGeometry args={[RACK_DEPTH, 0.03, 1.2]} />
        <meshStandardMaterial color="#3E2723" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Brass rail */}
      <mesh position={[side * 0.22, 0.08, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.2, 6]} />
        <meshStandardMaterial color={brassDarkMat.color} roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Support brackets — ornate brass L-brackets, 2 per section */}
      {[-0.45, 0.45].map((dz) => (
        <group key={dz} position={[side * 0.15, -0.06, dz]}>
          {/* Vertical arm */}
          <mesh>
            <boxGeometry args={[0.03, 0.14, 0.03]} />
            <meshStandardMaterial color={brassDarkMat.color} roughness={0.4} metalness={0.8} />
          </mesh>
          {/* Horizontal arm */}
          <mesh position={[side * 0.04, 0.06, 0]}>
            <boxGeometry args={[0.08, 0.03, 0.03]} />
            <meshStandardMaterial color={brassDarkMat.color} roughness={0.4} metalness={0.8} />
          </mesh>
          {/* Decorative curve — small sphere at joint */}
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshStandardMaterial color="#E0C060" roughness={0.2} metalness={0.95} />
          </mesh>
        </group>
      ))}
      {/* Luggage items */}
      {items.map((it, i) => (
        <SingleLuggageItem
          key={i}
          item={it.item}
          position={it.offset}
          rotation={it.rot}
        />
      ))}
    </group>
  )
}

/** Complete luggage rack system — both sides, multiple sections */
export function LuggageRack() {
  const { z0, z1 } = CARRIAGE
  const midZ = (z0 + z1) / 2
  const sections = useMemo(() => {
    const zs: number[] = []
    const start = z0 + 2
    const end = z1 - 2
    const spacing = 3.5
    for (let z = start; z < end; z += spacing) {
      zs.push(z)
    }
    return zs
  }, [z0, z1])

  return (
    <group>
      {sections.map((z) => (
        <group key={z}>
          <RackSection side={-1} z={z} />
          <RackSection side={1} z={z} />
        </group>
      ))}
    </group>
  )
}
