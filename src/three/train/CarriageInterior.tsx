import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { makeWood } from './textures'
import { glow } from './env'
import { CARRIAGE, carriageSeats, seatTable, carriageWindows, ROWS, ROW_DZ } from './interior'
import { getInteriorTheme } from './interiorThemes'
import type { TrainLine } from '../../lib/train/lines'

// Per-line carriage cabin: each of the five train lines gets a distinct interior
// — Study Car, Lounge, Panoramic, Silent Sleeper, or Library — driven by
// interiorThemes.ts. The layout (seats, tables, windows) stays sacred; only
// colours, lighting and decorative density change.

function Seat({ x, z, accent, woodTex }: { x: number; z: number; accent: string; woodTex: any }) {
  return (
    <group position={[x, 0, z]}>
      {/* cushion */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.0, 0.2, 1.0]} />
        <meshStandardMaterial color={accent} roughness={0.8} />
      </mesh>
      {/* backrest */}
      <mesh position={[0, 1.05, -0.45]} castShadow>
        <boxGeometry args={[1.0, 1.2, 0.18]} />
        <meshStandardMaterial color={accent} roughness={0.8} />
      </mesh>
      {/* armrests */}
      {[-0.5, 0.5].map((dx) => (
        <mesh key={dx} position={[dx, 0.72, -0.1]}>
          <boxGeometry args={[0.12, 0.16, 0.8]} />
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
        <boxGeometry args={[0.9, 0.06, 0.6]} />
        <meshStandardMaterial map={woodTex} color={tableColor} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.7, 6]} />
        <meshStandardMaterial color={'#2a2a30'} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* reading lamp */}
      <mesh position={[0.3, 0.9, -0.18]}>
        <cylinderGeometry args={[0.1, 0.14, 0.12, 10]} />
        <meshStandardMaterial color={'#c9a7ff'} emissive={glow.signLamp} emissiveIntensity={0.8} metalness={0.5} toneMapped={false} />
      </mesh>
      {/* a couple of books + a coffee cup */}
      <mesh position={[-0.2, 0.81, 0.05]} rotation-y={0.3}>
        <boxGeometry args={[0.28, 0.06, 0.2]} />
        <meshStandardMaterial color={'#7a3b2a'} roughness={0.8} />
      </mesh>
      <mesh position={[0.18, 0.83, 0.12]}>
        <cylinderGeometry args={[0.05, 0.045, 0.09, 10]} />
        <meshStandardMaterial color={'#efe6d2'} roughness={0.6} />
      </mesh>
    </group>
  )
}

export function CarriageInterior({ line }: { line: TrainLine }) {
  const theme = getInteriorTheme(line.id)
  const woodTex = useMemo(() => makeWood(3, 9, theme.walls), [line.id])
  const wallTex = useMemo(() => makeWood(2, 4, theme.walls), [line.id])
  const seats = useMemo(carriageSeats, [])
  const windows = useMemo(carriageWindows, [])
  const { halfW, z0, z1, ceilY } = CARRIAGE
  const len = z1 - z0
  const midZ = (z0 + z1) / 2

  return (
    <group>
      {/* carpet floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, midZ]} receiveShadow>
        <planeGeometry args={[halfW * 2, len]} />
        <meshStandardMaterial color={theme.floor} roughness={0.95} />
      </mesh>
      {/* runner stripe down the aisle */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, midZ]}>
        <planeGeometry args={[1.0, len]} />
        <meshStandardMaterial color={theme.runner} roughness={0.9} opacity={0.5} transparent />
      </mesh>

      {/* ceiling */}
      <mesh rotation-x={Math.PI / 2} position={[0, ceilY, midZ]}>
        <planeGeometry args={[halfW * 2, len]} />
        <meshStandardMaterial map={woodTex} color={theme.ceiling} side={DoubleSide} roughness={0.9} />
      </mesh>
      {/* ceiling light strip */}
      <mesh position={[0, ceilY - 0.06, midZ]}>
        <boxGeometry args={[0.5, 0.06, len - 1]} />
        <meshStandardMaterial color={'#fff0d0'} emissive={theme.lampGlow} emissiveIntensity={theme.lampIntensity * 1.2} toneMapped={false} />
      </mesh>

      {/* end walls */}
      {[z0, z1].map((z) => (
        <mesh key={z} position={[0, ceilY / 2, z]}>
          <boxGeometry args={[halfW * 2, ceilY, 0.2]} />
          <meshStandardMaterial map={wallTex} color={theme.walls} roughness={0.8} />
        </mesh>
      ))}
      {/* panoramic front glass (toward the world ahead) */}
      <mesh position={[0, 1.5, z1 - 0.11]}>
        <planeGeometry args={[halfW * 1.8, 1.7]} />
        <meshStandardMaterial color={'#bcd6e6'} transparent opacity={0.18} side={DoubleSide} />
      </mesh>

      {/* side walls split into pillars between the windows */}
      {[-1, 1].map((side) =>
        Array.from({ length: ROWS + 1 }, (_, r) => {
          const z = z0 + 1 + r * ROW_DZ
          return (
            <mesh key={`${side}-${r}`} position={[side * halfW, ceilY / 2, z]}>
              <boxGeometry args={[0.16, ceilY, 1.0]} />
              <meshStandardMaterial map={wallTex} color={theme.walls} roughness={0.8} />
            </mesh>
          )
        }),
      )}
      {/* lower side panelling (below the windows) */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * halfW, 0.55, midZ]}>
          <boxGeometry args={[0.14, 1.1, len]} />
          <meshStandardMaterial map={wallTex} color={theme.walls} roughness={0.8} />
        </mesh>
      ))}
      {/* window glass + curtains (curtains only if theme allows) */}
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
      {/* luggage racks above the windows (only if theme allows) */}
      {theme.luggageRacks &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * (halfW - 0.35), 2.15, midZ]} rotation-z={side * 0.3}>
            <boxGeometry args={[0.5, 0.05, len - 1]} />
            <meshStandardMaterial color={theme.trim} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}

      {/* seats + tables + per-row warm lamp light */}
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
      {/* cabin lamps — intensity controlled by theme */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <pointLight key={i} position={[0, ceilY - 0.3, z0 + f * len]} color={theme.lampGlow} intensity={theme.lampIntensity * 6} distance={9} decay={2} />
      ))}

      {/* ambient fill — subtle, theme-coloured */}
      <pointLight position={[0, ceilY / 2, midZ]} color={theme.ambientFill} intensity={theme.lampIntensity * 2} distance={len} decay={2} />
    </group>
  )
}
