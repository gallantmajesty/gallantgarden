import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { makeWood } from './textures'
import { palette, glow } from './env'
import { CARRIAGE, carriageSeats, seatTable, carriageWindows, ROWS, ROW_DZ, DOOR_Z } from './interior'
import { getInteriorTheme } from './interiorThemes'
import type { TrainLine } from '../../lib/train/lines'
import { useTrain } from '../../store/train'

// Per-line carriage cabin: each of the five train lines gets a distinct interior
// — Study Car, Lounge, Panoramic, Silent Sleeper, or Library — driven by
// interiorThemes.ts. The layout (seats, tables, windows) stays sacred; only
// colours, lighting and decorative density change.

// Carriage is now GRAND: wider body, tall ceiling, doors on BOTH sides at the
// rear vestibule area so the player can board from either side.

const DOOR_H = 2.2 // door opening height
const DOOR_W = 0.9 // door opening width

function Seat({ x, z, accent, woodTex }: { x: number; z: number; accent: string; woodTex: any }) {
  return (
    <group position={[x, 0, z]}>
      {/* cushion — wider for the grand carriage */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.95, 0.2, 1.1]} />
        <meshStandardMaterial color={accent} roughness={0.8} />
      </mesh>
      {/* backrest — taller for the higher ceiling */}
      <mesh position={[0, 1.15, -0.5]} castShadow>
        <boxGeometry args={[0.95, 1.4, 0.2]} />
        <meshStandardMaterial color={accent} roughness={0.8} />
      </mesh>
      {/* armrests */}
      {[-0.47, 0.47].map((dx) => (
        <mesh key={dx} position={[dx, 0.72, -0.12]}>
          <boxGeometry args={[0.12, 0.18, 0.85]} />
          <meshStandardMaterial map={woodTex} color={'#8b7355'} roughness={0.7} />
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

  return (
    <group>
      {/* carpet floor — wider for the expanded cabin */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, midZ]} receiveShadow>
        <planeGeometry args={[halfW * 2, len]} />
        <meshStandardMaterial color={theme.floor} roughness={0.95} />
      </mesh>
      {/* runner stripe down the aisle — wider */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, midZ]}>
        <planeGeometry args={[1.4, len]} />
        <meshStandardMaterial color={theme.runner} roughness={0.9} opacity={0.5} transparent />
      </mesh>

      {/* ceiling — taller */}
      <mesh rotation-x={Math.PI / 2} position={[0, ceilY, midZ]}>
        <planeGeometry args={[halfW * 2, len]} />
        <meshStandardMaterial map={woodTex} color={theme.ceiling} side={DoubleSide} roughness={0.9} />
      </mesh>
      {/* ceiling light strip — longer */}
      <mesh position={[0, ceilY - 0.06, midZ]}>
        <boxGeometry args={[0.6, 0.06, len - 1]} />
        <meshStandardMaterial color={'#fff0d0'} emissive={theme.lampGlow} emissiveIntensity={theme.lampIntensity * 0.6} toneMapped={false} />
      </mesh>

      {/* ===== EXTERIOR SHELL — curved roof, livery, brass trim ===== */}
      {/* curved roof */}
      <mesh position={[0, 1.05, midZ]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[halfW + 0.22, halfW + 0.22, len + 0.7, 18, 1, true]} />
        <meshStandardMaterial color={'#3a3742'} metalness={0.35} roughness={0.55} side={DoubleSide} />
      </mesh>
      {/* brass roof ridge */}
      <mesh position={[0, halfW + 0.05 + 1.05, midZ]}>
        <boxGeometry args={[0.18, 0.08, len]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* livery body sides + brass belt-lines + skirt, both sides */}
      {[-1, 1].map((side) => (
        <group key={`shell${side}`}>
          {/* livery panel below the windows — split to leave door zone open */}
          <mesh position={[side * (halfW + 0.06), 0.55, (doorZoneZ1 + z1) / 2]}>
            <boxGeometry args={[0.16, 1.15, z1 - doorZoneZ1]} />
            <meshStandardMaterial color={line.mood.accent} roughness={0.55} metalness={0.15} />
          </mesh>
          {/* brass belt under the windows — full length */}
          <mesh position={[side * (halfW + 0.12), 1.16, midZ]}>
            <boxGeometry args={[0.08, 0.08, len]} />
            <meshStandardMaterial color={palette.brass} metalness={0.55} roughness={0.3} />
          </mesh>
          {/* brass belt above the windows */}
          <mesh position={[side * (halfW + 0.04), 2.05, midZ]}>
            <boxGeometry args={[0.08, 0.07, len]} />
            <meshStandardMaterial color={palette.brass} metalness={0.55} roughness={0.3} />
          </mesh>
          {/* dark skirt */}
          <mesh position={[side * (halfW + 0.05), 0.05, midZ]}>
            <boxGeometry args={[0.12, 0.2, len]} />
            <meshStandardMaterial color={'#23202a'} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* end walls */}
      {[z0, z1].map((z) => (
        <mesh key={z} position={[0, ceilY / 2, z]}>
          <boxGeometry args={[halfW * 2, ceilY, 0.2]} />
          <meshStandardMaterial map={wallTex} color={theme.walls} roughness={0.8} />
        </mesh>
      ))}
      {/* panoramic front glass — taller */}
      <mesh position={[0, 1.7, z1 - 0.11]}>
        <planeGeometry args={[halfW * 1.8, 2.0]} />
        <meshStandardMaterial color={'#bcd6e6'} transparent opacity={0.18} side={DoubleSide} />
      </mesh>

      {/* side walls — pillars between windows, skipping the door zone */}
      {[-1, 1].map((side) =>
        Array.from({ length: ROWS + 1 }, (_, r) => {
          const z = z0 + 1 + r * ROW_DZ
          if (z > doorZoneZ0 && z < doorZoneZ1) return null // skip door zone
          return (
            <mesh key={`${side}-${r}`} position={[side * halfW, ceilY / 2, z]}>
              <boxGeometry args={[0.16, ceilY, 1.0]} />
              <meshStandardMaterial map={wallTex} color={theme.walls} roughness={0.8} />
            </mesh>
          )
        }),
      )}

      {/* lower side panelling — split to leave door zone open */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * halfW, 0.55, (doorZoneZ1 + z1) / 2]}>
          <boxGeometry args={[0.14, 1.1, z1 - doorZoneZ1]} />
          <meshStandardMaterial map={wallTex} color={theme.walls} roughness={0.8} />
        </mesh>
      ))}

      {/* door openings on BOTH sides at the rear vestibule */}
      {([-1, 1] as const).map((side) =>
        DOOR_Z.map((dz) => <DoorOpening key={`door-${side}-${dz}`} side={side} z={dz} locked={doorsLocked} />),
      )}

      {/* window glass + curtains */}
      {windows.map((w, i) => (
        <group key={i} position={w.pos}>
          <mesh>
            <boxGeometry args={[0.06, 1.0, 1.7]} />
            <meshStandardMaterial color={'#cfe2ee'} transparent opacity={0.12} side={DoubleSide} />
          </mesh>
          {theme.curtains &&
            [-0.85, 0.85].map((dz) => (
              <mesh key={dz} position={[w.side * 0.06, 0.1, dz]}>
                <boxGeometry args={[0.05, 1.1, 0.18]} />
                <meshStandardMaterial color={theme.curtain} roughness={0.85} />
              </mesh>
            ))}
        </group>
      ))}
      {/* luggage racks — higher for the taller ceiling */}
      {theme.luggageRacks &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * (halfW - 0.35), 2.5, midZ]} rotation-z={side * 0.3}>
            <boxGeometry args={[0.5, 0.05, len - 1]} />
            <meshStandardMaterial color={theme.trim} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}

      {/* seats + tables */}
      {seats.map((s) => (
        <group key={s.id}>
          <Seat x={s.pos[0]} z={s.pos[2]} accent={theme.seat} woodTex={woodTex} />
          <StudyTable
            x={seatTable(s).pos[0]}
            z={seatTable(s).pos[2]}
            woodTex={woodTex}
            tableColor={theme.table}
          />
        </group>
      ))}
      {/* cabin lamps */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <pointLight key={i} position={[0, ceilY - 0.3, z0 + f * len]} color={theme.lampGlow} intensity={theme.lampIntensity * 3} distance={9} decay={2} />
      ))}

      {/* ambient fill */}
      <pointLight position={[0, ceilY / 2, midZ]} color={theme.ambientFill} intensity={theme.lampIntensity * 1} distance={len} decay={2} />
    </group>
  )
}
