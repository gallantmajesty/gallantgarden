// SeatFactory — creates the 3 seat types (A: window, B: standard, C: corner)
// with Hogwarts Express-style dark walnut frames, deep maroon velvet upholstery,
// brass fixtures, fold-down tray tables, and leather book pockets. Each seat is
// a procedural mesh group (no external models).

import { useMemo } from 'react'
import type { MeshStandardMaterial } from 'three'
import { useVelvetMaterial } from '../materials/VelvetMaterial'
import { useBrassMaterial, useBrassDarkMaterial } from '../materials/BrassMaterial'
import { useWoodPanelMaterial } from '../materials/WoodMaterial'

export type SeatType = 'A' | 'B' | 'C'

export interface SeatVariant {
  type: SeatType
  hasTrayTable: boolean
  hasBook: boolean
  hasCup: boolean
  hasPlant: boolean
  hasGlasses: boolean
}

/** Props for rendering a single seat */
export interface SeatProps {
  type?: SeatType
  variant?: SeatVariant
}

const SEAT_VARIANTS: SeatVariant[] = [
  { type: 'A', hasTrayTable: true, hasBook: true, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'A', hasTrayTable: true, hasBook: false, hasCup: true, hasPlant: false, hasGlasses: true },
  { type: 'A', hasTrayTable: true, hasBook: true, hasCup: false, hasPlant: true, hasGlasses: false },
  { type: 'A', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: true, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: true, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: true, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: true, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: true, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'B', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'C', hasTrayTable: true, hasBook: true, hasCup: false, hasPlant: false, hasGlasses: true },
  { type: 'C', hasTrayTable: true, hasBook: false, hasCup: true, hasPlant: false, hasGlasses: false },
  { type: 'C', hasTrayTable: true, hasBook: true, hasCup: false, hasPlant: false, hasGlasses: false },
  { type: 'C', hasTrayTable: true, hasBook: false, hasCup: false, hasPlant: true, hasGlasses: false },
]

export function getSeatVariant(index: number): SeatVariant {
  return SEAT_VARIANTS[index % SEAT_VARIANTS.length]
}

/** Dark walnut chair frame — carved armrests with brass caps, curved backrest */
function ChairFrame({ woodMat, brassMat }: { woodMat: MeshStandardMaterial; brassMat: MeshStandardMaterial }) {
  return (
    <group>
      {/* seat base */}
      <mesh position={[0, 0, 0]} castShadow material={woodMat}>
        <boxGeometry args={[0.7, 0.08, 0.65]} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 0.55, -0.28]} castShadow material={woodMat}>
        <boxGeometry args={[0.7, 1.0, 0.08]} />
      </mesh>
      {/* backrest top rail */}
      <mesh position={[0, 1.05, -0.28]} castShadow material={woodMat}>
        <boxGeometry args={[0.72, 0.06, 0.1]} />
      </mesh>
      {/* left armrest */}
      <mesh position={[-0.36, 0.25, -0.05]} castShadow material={woodMat}>
        <boxGeometry args={[0.06, 0.12, 0.55]} />
      </mesh>
      {/* right armrest */}
      <mesh position={[0.36, 0.25, -0.05]} castShadow material={woodMat}>
        <boxGeometry args={[0.06, 0.12, 0.55]} />
      </mesh>
      {/* brass armrest caps */}
      {[-0.36, 0.36].map((dx) => (
        <mesh key={dx} position={[dx, 0.32, 0.2]} material={brassMat}>
          <boxGeometry args={[0.08, 0.04, 0.06]} />
        </mesh>
      ))}
      {/* 4 brass feet */}
      {[[-0.28, -0.24], [0.28, -0.24], [-0.28, 0.24], [0.28, 0.24]].map(([fx, fz], i) => (
        <mesh key={i} position={[fx, -0.06, fz]} material={brassMat}>
          <cylinderGeometry args={[0.02, 0.03, 0.08, 6]} />
        </mesh>
      ))}
    </group>
  )
}

/** Deep maroon velvet upholstery — tufted cushion and backrest pad */
function Upholstery({ velvetMat }: { velvetMat: MeshStandardMaterial }) {
  return (
    <group>
      {/* seat cushion */}
      <mesh position={[0, 0.06, 0.02]} castShadow material={velvetMat}>
        <boxGeometry args={[0.62, 0.14, 0.56]} />
      </mesh>
      {/* backrest pad */}
      <mesh position={[0, 0.5, -0.24]} castShadow material={velvetMat}>
        <boxGeometry args={[0.62, 0.85, 0.1]} />
      </mesh>
      {/* headrest cushion */}
      <mesh position={[0, 0.97, -0.25]} castShadow material={velvetMat}>
        <boxGeometry args={[0.48, 0.15, 0.08]} />
      </mesh>
      {/* wing/bolster accent — left */}
      <mesh position={[-0.31, 0.5, -0.2]} castShadow material={velvetMat}>
        <boxGeometry args={[0.04, 0.5, 0.12]} />
      </mesh>
      {/* wing/bolster accent — right */}
      <mesh position={[0.31, 0.5, -0.2]} castShadow material={velvetMat}>
        <boxGeometry args={[0.04, 0.5, 0.12]} />
      </mesh>
    </group>
  )
}

/** Fold-down brass tray table on armrest */
function TrayTable({ brassDarkMat }: { brassDarkMat: MeshStandardMaterial }) {
  return (
    <group position={[0.42, 0.3, 0]}>
      {/* bracket */}
      <mesh material={brassDarkMat}>
        <boxGeometry args={[0.04, 0.04, 0.25]} />
      </mesh>
      {/* tray surface — dark walnut */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.28, 0.02, 0.22]} />
        <meshStandardMaterial color="#3E2723" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* brass lip on tray edge */}
      <mesh position={[0, 0.05, -0.11]}>
        <boxGeometry args={[0.28, 0.02, 0.02]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  )
}

/** Leather pocket on seat back — for books/tablet */
function BookPocket() {
  return (
    <mesh position={[0, 0.4, -0.32]}>
      <boxGeometry args={[0.4, 0.25, 0.03]} />
      <meshStandardMaterial color="#8D6E63" roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

/** Random prop items on the tray table */
function SeatProps({ variant }: { variant: SeatVariant }) {
  if (!variant.hasTrayTable) return null
  return (
    <group position={[0.42, 0.36, 0]}>
      {variant.hasBook && (
        <mesh position={[0, 0.02, 0]} rotation-y={0.15}>
          <boxGeometry args={[0.18, 0.04, 0.14]} />
          <meshStandardMaterial color="#BF5B21" roughness={0.6} />
        </mesh>
      )}
      {variant.hasCup && (
        <group position={[0.06, 0.02, 0.04]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.025, 0.06, 8]} />
            <meshStandardMaterial color="#EFE6D2" roughness={0.6} />
          </mesh>
          {/* steam wisps */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#FFF8E1" emissive="#FFD54F" emissiveIntensity={0.5} transparent opacity={0.3} />
          </mesh>
        </group>
      )}
      {variant.hasPlant && (
        <group position={[-0.04, 0.02, 0]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.025, 0.05, 6]} />
            <meshStandardMaterial color="#7A4A30" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.035, 6, 6]} />
            <meshStandardMaterial color="#356B3E" roughness={0.85} />
          </mesh>
        </group>
      )}
      {variant.hasGlasses && (
        <group position={[0.08, 0.02, -0.04]}>
          <mesh>
            <boxGeometry args={[0.06, 0.005, 0.03]} />
            <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.9} />
          </mesh>
          {[-0.015, 0.015].map((dx) => (
            <mesh key={dx} position={[dx, 0, 0]}>
              <circleGeometry args={[0.012, 8]} />
              <meshStandardMaterial color="#E3F2FD" transparent opacity={0.3} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/** Complete seat component — frame + upholstery + props */
export function Seat({ type = 'B', variant }: SeatProps) {
  const woodMat = useWoodPanelMaterial()
  const velvetMat = useVelvetMaterial()
  const brassMat = useBrassMaterial()
  const brassDarkMat = useBrassDarkMaterial()

  const seatVariant = variant ?? getSeatVariant(0)

  // Type A (window) slightly wider, Type C (corner) premium feel
  const scale = type === 'A' ? 1.1 : type === 'C' ? 1.05 : 1.0
  // Type C corner seats angle slightly toward the window (±8 degrees)
  const tiltY = type === 'C' ? (variant?.hasBook ? -0.14 : 0.14) : 0

  return (
    <group scale={[scale, 1, scale]} rotation-y={tiltY}>
      <ChairFrame woodMat={woodMat} brassMat={brassMat} />
      <Upholstery velvetMat={velvetMat} />
      <TrayTable brassDarkMat={brassDarkMat} />
      <BookPocket />
      <SeatProps variant={seatVariant} />
    </group>
  )
}
