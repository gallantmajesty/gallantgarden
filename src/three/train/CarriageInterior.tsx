// @ts-nocheck
import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { makeWood } from './textures'
import { palette, glow } from './env'
import { CARRIAGE, carriageSeats, seatTable, carriageWindows, ROWS, ROW_DZ, DOOR_Z } from './interior'
import { getInteriorTheme } from './interiorThemes'
import type { TrainLine } from '../../lib/train/lines'
import { useTrain } from '../../store/train'
import { InteriorBuilder } from './interior/InteriorBuilder'

// Per-line carriage cabin: each of the five train lines gets a distinct interior
// — Study Car, Lounge, Panoramic, Silent Sleeper, or Library — driven by
// interiorThemes.ts. The layout (seats, tables, windows) stays sacred; only
// colours, lighting and decorative density change.
//
// Phase 2: The InteriorBuilder provides the rich Hogwarts Express-style detail
// with wood paneling, velvet upholstery, brass fixtures, and magical atmosphere.

const DOOR_H = 2.2 // door opening height
const DOOR_W = 0.9 // door opening width

function Seat({ x, z, accent, woodTex }: { x: number; z: number; accent: string; woodTex: any }) {
  return (
    <group position={[x, 0, z]}>
      {/* cushion — wider business-class seat */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.1, 0.2, 1.1]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.05} />
      </mesh>
      {/* backrest — taller with headrest */}
      <mesh position={[0, 1.15, -0.5]} castShadow>
        <boxGeometry args={[1.1, 1.4, 0.2]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.05} />
      </mesh>
      {/* headrest */}
      <mesh position={[0, 1.95, -0.5]} castShadow>
        <boxGeometry args={[0.8, 0.25, 0.14]} />
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.05} />
      </mesh>
      {/* armrests — polished chrome */}
      {[-0.55, 0.55].map((dx) => (
        <mesh key={dx} position={[dx, 0.72, -0.12]}>
          <boxGeometry args={[0.12, 0.18, 0.85]} />
          <meshStandardMaterial color={'#c0c0c8'} roughness={0.2} metalness={0.7} />
        </mesh>
      ))}
      {/* wing / bolster accent on each side */}
      {[-0.55, 0.55].map((dx) => (
        <mesh key={`bol-${dx}`} position={[dx, 0.9, -0.1]}>
          <boxGeometry args={[0.06, 0.6, 0.7]} />
          <meshStandardMaterial color={'#2a2a30'} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function StudyTable({ x, z, woodTex, tableColor }: { x: number; z: number; woodTex: any; tableColor: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[1.3, 0.06, 0.6]} />
        <meshStandardMaterial map={woodTex} color={tableColor} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.7, 6]} />
        <meshStandardMaterial color={'#2a2a30'} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* reading lamp */}
      <mesh position={[0.35, 0.9, -0.2]}>
        <cylinderGeometry args={[0.12, 0.16, 0.14, 10]} />
        <meshStandardMaterial color={'#c9a7ff'} emissive={glow.signLamp} emissiveIntensity={0.8} metalness={0.5} toneMapped={false} />
      </mesh>
      {/* a couple of books + a coffee cup */}
      <mesh position={[-0.25, 0.81, 0.06]} rotation-y={0.3}>
        <boxGeometry args={[0.32, 0.06, 0.22]} />
        <meshStandardMaterial color={'#7a3b2a'} roughness={0.8} />
      </mesh>
      <mesh position={[0.22, 0.83, 0.14]}>
        <cylinderGeometry args={[0.06, 0.055, 0.1, 10]} />
        <meshStandardMaterial color={'#efe6d2'} roughness={0.6} />
      </mesh>
    </group>
  )
}

/** Sliding door on one side — an open doorway with warm light spilling out,
 *  framed by a dark recess and a threshold step. When locked, a red emissive
 *  strip glows on the frame to signal "doors sealed while traveling". */
function DoorOpening({ side, z, locked }: { side: -1 | 1; z: number; locked: boolean }) {
  const wx = side * CARRIAGE.halfW
  return (
    <group position={[wx, 0, z]}>
      {/* warm-lit doorway recess — glowing from within */}
      <mesh position={[-side * 0.04, DOOR_H / 2, 0]}>
        <boxGeometry args={[0.08, DOOR_H, DOOR_W]} />
        <meshStandardMaterial
          color={locked ? '#1a0505' : '#0b0a0c'}
          emissive={locked ? '#ff2222' : glow.signLamp}
          emissiveIntensity={locked ? 0.8 : 0.5}
          toneMapped={false}
        />
      </mesh>
      {/* door frame — brass trim */}
      <mesh position={[-side * 0.06, DOOR_H / 2, -DOOR_W / 2 - 0.03]}>
        <boxGeometry args={[0.04, DOOR_H, 0.04]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[-side * 0.06, DOOR_H / 2, DOOR_W / 2 + 0.03]}>
        <boxGeometry args={[0.04, DOOR_H, 0.04]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[-side * 0.06, DOOR_H, 0]}>
        <boxGeometry args={[0.04, 0.04, DOOR_W + 0.06]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* locked indicator — red emissive strip on top frame */}
      {locked && (
        <mesh position={[-side * 0.06, DOOR_H + 0.02, 0]}>
          <boxGeometry args={[0.06, 0.04, DOOR_W + 0.08]} />
          <meshStandardMaterial color={'#ff1111'} emissive={'#ff2222'} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      )}
      {/* threshold / step */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.4, 0.06, 0.9]} />
        <meshStandardMaterial color={'#48464e'} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* warm light spill in front of the doorway — dim when locked */}
      <mesh position={[-side * 0.01, 1.0, 0]}>
        <planeGeometry args={[0.3, DOOR_H * 0.6]} />
        <meshStandardMaterial
          color={locked ? '#ff4444' : '#ffd27a'}
          emissive={locked ? '#ff2222' : glow.signLamp}
          emissiveIntensity={locked ? 0.3 : 0.6}
          transparent
          opacity={locked ? 0.08 : 0.15}
          toneMapped={false}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function CarriageInterior({ line }: { line: TrainLine }) {
  const theme = getInteriorTheme(line.id)
  const woodTex = useMemo(() => makeWood(3, 9, theme.walls), [line.id])
  const wallTex = useMemo(() => makeWood(2, 4, theme.walls), [line.id])
  const seats = useMemo(() => carriageSeats(), [])
  const windows = useMemo(() => carriageWindows(), [])
  const { halfW, z0, z1, ceilY } = CARRIAGE
  const len = z1 - z0
  const midZ = (z0 + z1) / 2
  const phase = useTrain((s) => s.phase)
  const doorsLocked = phase === 'traveling'

  // Z range of the door zone at the rear — pillars/panelling skip this area
  const doorZoneZ0 = z0
  const doorZoneZ1 = z0 + 5.5

  // Use the rich Phase 2 InteriorBuilder for all themes
  return <InteriorBuilder line={line} />
}
