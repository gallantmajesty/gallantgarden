import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { groundTables, TABLE, upperTables } from './furniture'
import { QUALITY_PRESET, useSettings } from '../../store/settings'

const WOOD = '#5c3a1d'
const WOOD_DARK = '#3a2410'
const CLOTH = '#2f5c4a'
const BOOK_COLORS = ['#7c2f2f', '#2f5c4a', '#34507a', '#8a6d2f', '#5a3a6e']

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** All reading tables (ground + upper), each dressed to feel lived-in. */
export function StudyTables() {
  const quality = useSettings((s) => s.quality)
  const lampLights = QUALITY_PRESET[quality].lampLights
  const tables = useMemo(() => {
    const g = groundTables().map((p, i) => ({ ...p, seed: 1000 + i, idx: i }))
    const u = upperTables().map((p, i) => ({ ...p, seed: 5000 + i, idx: 100 + i }))
    return [...g, ...u]
  }, [])

  // spread the limited budget of real lamp-lights evenly across the hall
  const litStep = lampLights > 0 ? Math.max(1, Math.floor(tables.length / lampLights)) : Infinity

  return (
    <group>
      {tables.map((t, i) => (
        <Table key={t.idx} pos={t.pos} seed={t.seed} light={Number.isFinite(litStep) && i % litStep === 0} />
      ))}
    </group>
  )
}

function Table({ pos, seed, light }: { pos: [number, number, number]; seed: number; light: boolean }) {
  const topY = TABLE.h
  const { w: W, l: L } = TABLE
  const rand = useMemo(() => rng(seed), [seed])

  const dressing = useMemo(() => {
    const r = rng(seed + 7)
    return {
      books: Array.from({ length: 3 }, (_, k) => ({
        z: -L / 2 + 1.4 + k * (L / 4),
        x: (r() - 0.5) * 0.5,
        rot: (r() - 0.5) * 0.6,
        color: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)],
        h: 0.1 + r() * 0.06,
      })),
      openAt: -L / 2 + 1 + r() * (L - 2),
      potAt: L / 2 - 1.4,
    }
  }, [seed, L])

  return (
    <group position={pos}>
      {/* top + runner */}
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, 0.12, L]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, topY + 0.065, 0]}>
        <boxGeometry args={[0.8, 0.02, L - 0.4]} />
        <meshStandardMaterial color={CLOTH} roughness={0.9} />
      </mesh>
      {/* legs */}
      {[
        [-W / 2 + 0.15, L / 2 - 0.2],
        [W / 2 - 0.15, L / 2 - 0.2],
        [-W / 2 + 0.15, -L / 2 + 0.2],
        [W / 2 - 0.15, -L / 2 + 0.2],
      ].map(([lx, lz], k) => (
        <mesh key={k} position={[lx, topY / 2, lz]} castShadow>
          <boxGeometry args={[0.16, topY, 0.16]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      ))}

      {/* chairs: 4 per long side = 8 seats */}
      {[-1, 1].map((sx) =>
        [-L / 2 + 1.4, -L / 6, L / 6, L / 2 - 1.4].map((cz, k) => (
          <Chair key={`${sx}-${k}`} pos={[sx * (W / 2 + 0.5), 0, cz]} faceX={-sx} />
        )),
      )}

      {/* classic green banker's lamp — brass base & stem, domed green glass
          shade glowing warm from within (the signature look of the hall) */}
      <group position={[0.55, topY + 0.06, -L / 2 + 1.3]}>
        {/* brass base */}
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.05, 16]} />
          <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* brass stem */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.028, 0.36, 10]} />
          <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* domed green glass shade (half-cylinder) */}
        <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.42, 20, 1, true, 0, Math.PI]} />
          <meshStandardMaterial color="#1f6b3a" emissive="#2f8a52" emissiveIntensity={0.5} metalness={0.2} roughness={0.35} side={DoubleSide} />
        </mesh>
        {/* warm bulb under the shade */}
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color="#fff3d2" emissive="#ffcf8a" emissiveIntensity={2.4} />
        </mesh>
        {light && <pointLight position={[0, 0.32, 0]} intensity={5} distance={6.5} decay={2} color="#ffd2a0" />}
      </group>

      {/* stacked books — leather cover + cream page block peeking out + a gold
          title band, so they read as real books rather than coloured blocks */}
      {dressing.books.map((b, k) => (
        <group key={k} position={[b.x, topY + 0.06, b.z]} rotation={[0, b.rot, 0]}>
          {/* cover */}
          <mesh position={[0, b.h / 2, 0]} castShadow>
            <boxGeometry args={[0.37, b.h, 0.27]} />
            <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.05} />
          </mesh>
          {/* pages (slightly inset, cream) */}
          <mesh position={[0.005, b.h / 2, 0]}>
            <boxGeometry args={[0.33, b.h * 0.7, 0.235]} />
            <meshStandardMaterial color="#efe2c0" roughness={0.95} />
          </mesh>
          {/* gold title band on the spine */}
          <mesh position={[-0.186, b.h / 2, 0]}>
            <boxGeometry args={[0.012, b.h * 0.3, 0.16]} />
            <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.35} emissive="#3a2c10" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* a glass water bottle with a cork cap */}
      <group position={[0.6, topY + 0.06, -L / 6]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.32, 14]} />
          <meshStandardMaterial color="#bfe0e8" transparent opacity={0.45} roughness={0.15} metalness={0.2} />
        </mesh>
        {/* water inside */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 12]} />
          <meshStandardMaterial color="#7fb6d6" transparent opacity={0.7} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
          <meshStandardMaterial color="#7a5230" roughness={0.85} />
        </mesh>
      </group>

      {/* a ceramic mug */}
      <group position={[-0.55, topY + 0.06, L / 5]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.16, 14]} />
          <meshStandardMaterial color="#e8e0d4" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.6} />
        </mesh>
        <mesh position={[0.09, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.045, 0.012, 6, 12]} />
          <meshStandardMaterial color="#e8e0d4" roughness={0.7} />
        </mesh>
      </group>

      {/* an open book */}
      <group position={[-0.4, topY + 0.07, dressing.openAt]} rotation={[0, rand() * 0.6 - 0.3, 0]}>
        <mesh rotation={[-0.12, 0, 0.18]} position={[-0.16, 0, 0]}>
          <boxGeometry args={[0.32, 0.02, 0.42]} />
          <meshStandardMaterial color="#f4ead0" roughness={0.9} side={DoubleSide} />
        </mesh>
        <mesh rotation={[-0.12, 0, -0.18]} position={[0.16, 0, 0]}>
          <boxGeometry args={[0.32, 0.02, 0.42]} />
          <meshStandardMaterial color="#efe2c4" roughness={0.9} side={DoubleSide} />
        </mesh>
      </group>

      {/* flower pot + plant */}
      <group position={[-0.45, topY + 0.06, dressing.potAt]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.1, 0.24, 12]} />
          <meshStandardMaterial color="#b5552f" roughness={0.8} />
        </mesh>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} position={[Math.cos(k) * 0.06, 0.33, Math.sin(k) * 0.06]} rotation={[0.3, k, 0]}>
            <coneGeometry args={[0.05, 0.32, 5]} />
            <meshStandardMaterial color="#3f8a3f" roughness={0.9} />
          </mesh>
        ))}
        {/* a couple of warm blossoms */}
        {[0.5, 2.2].map((k) => (
          <mesh key={`fl-${k}`} position={[Math.cos(k) * 0.07, 0.42, Math.sin(k) * 0.07]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={k > 1 ? '#e8794a' : '#e6b84a'} roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* an hourglass (sand timer) */}
      <group position={[0.62, topY + 0.06, L / 6]}>
        <mesh position={[0, 0.015, 0]}>
          <boxGeometry args={[0.18, 0.03, 0.18]} />
          <meshStandardMaterial color="#5a3d22" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.18, 0.03, 0.18]} />
          <meshStandardMaterial color="#5a3d22" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <coneGeometry args={[0.07, 0.12, 12]} />
          <meshStandardMaterial color="#cfe0e8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.07, 0.12, 12]} />
          <meshStandardMaterial color="#cfe0e8" transparent opacity={0.4} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.095, 0]}>
          <coneGeometry args={[0.055, 0.08, 10]} />
          <meshStandardMaterial color="#d8b46a" roughness={0.9} />
        </mesh>
      </group>

      {/* a notebook with a quill resting on it */}
      <group position={[-0.55, topY + 0.07, -L / 6]} rotation={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.05, 0.3]} />
          <meshStandardMaterial color="#3a5c7a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.031, 0]}>
          <boxGeometry args={[0.36, 0.01, 0.25]} />
          <meshStandardMaterial color="#f4ead0" roughness={0.95} />
        </mesh>
        {/* quill */}
        <mesh position={[0.05, 0.08, 0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.005, 0.012, 0.34, 6]} />
          <meshStandardMaterial color="#e8e2d2" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}

function Chair({ pos, faceX }: { pos: [number, number, number]; faceX: number }) {
  return (
    <group position={pos} rotation={[0, faceX > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.52, 0.08, 0.52]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.82, -0.22]} castShadow>
        <boxGeometry args={[0.52, 0.64, 0.08]} />
        <meshStandardMaterial color={WOOD} roughness={0.7} />
      </mesh>
      {[
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2],
      ].map(([lx, lz], k) => (
        <mesh key={k} position={[lx, 0.24, lz]}>
          <boxGeometry args={[0.06, 0.48, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}
