// WindowFrame — round/oval brass-framed windows in Hogwarts Express style.
// Brass frame with rivet details, slightly tinted glass, and warm amber glow.
// Each window is positioned along the side walls aligned to seat rows.

import { useMemo } from 'react'
import { CARRIAGE, carriageWindows } from '../interior'
import { useBrassMaterial } from '../materials/BrassMaterial'
import { useGlassMaterial } from '../materials/GlassMaterial'

const WINDOW_W = 1.0
const WINDOW_H = 0.7
const FRAME_THICK = 0.06

interface WindowFrameProps {
  side: -1 | 1
  z: number
  frost?: boolean
}

function SingleWindow({ side, z, frost }: WindowFrameProps) {
  const brassMat = useBrassMaterial()
  const glassMat = useGlassMaterial()
  const { halfW } = CARRIAGE
  const x = side * halfW

  return (
    <group position={[x, 1.35, z]}>
      {/* Glass pane */}
      <mesh>
        <boxGeometry args={[0.04, WINDOW_H, WINDOW_W]} />
        <meshPhysicalMaterial
          color={glassMat.color}
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.9}
          transmission={0.8}
          thickness={0.02}
          envMapIntensity={0.5}
          side={2}
        />
      </mesh>

      {/* Brass frame — top */}
      <mesh position={[0, WINDOW_H / 2 + FRAME_THICK / 2, 0]}>
        <boxGeometry args={[FRAME_THICK * 2, FRAME_THICK, WINDOW_W + FRAME_THICK * 2]} />
        <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Brass frame — bottom */}
      <mesh position={[0, -WINDOW_H / 2 - FRAME_THICK / 2, 0]}>
        <boxGeometry args={[FRAME_THICK * 2, FRAME_THICK, WINDOW_W + FRAME_THICK * 2]} />
        <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Brass frame — left */}
      <mesh position={[0, 0, -WINDOW_W / 2 - FRAME_THICK / 2]}>
        <boxGeometry args={[FRAME_THICK * 2, WINDOW_H + FRAME_THICK * 2, FRAME_THICK]} />
        <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Brass frame — right */}
      <mesh position={[0, 0, WINDOW_W / 2 + FRAME_THICK / 2]}>
        <boxGeometry args={[FRAME_THICK * 2, WINDOW_H + FRAME_THICK * 2, FRAME_THICK]} />
        <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Rivet details — small brass dots around the frame */}
      {[...Array(8)].map((_, i) => {
        const t = i / 8
        const ry = (t - 0.5) * WINDOW_H * 0.8
        const rz = (i % 2 === 0 ? -1 : 1) * (WINDOW_W / 2 + FRAME_THICK * 0.5)
        return (
          <mesh key={i} position={[0, ry, rz]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial color="#E0C060" roughness={0.2} metalness={0.95} />
          </mesh>
        )
      })}

      {/* Warm interior glow panel */}
      <mesh position={[-side * 0.01, 0, 0]}>
        <boxGeometry args={[0.02, WINDOW_H * 0.8, WINDOW_W * 0.8]} />
        <meshStandardMaterial
          color="#FFB74D"
          emissive="#FFB74D"
          emissiveIntensity={0.4}
          toneMapped={false}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Window condensation / frost — appears on cold routes (e.g. Mountain,
       *  Night Express in snow). A subtle semi-opaque ice film over the glass;
       *  cheap, single draw per window, no GPU cost beyond the extra mesh. */}
      {frost && (
        <mesh position={[-side * 0.018, 0, 0]}>
          <boxGeometry args={[0.012, WINDOW_H * 0.97, WINDOW_W * 0.97]} />
          <meshStandardMaterial
            color="#ECEFF1"
            roughness={1}
            metalness={0}
            transparent
            opacity={0.26}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

/** All windows along both sides of the carriage */
export function WindowFrames({ frost = false }: { frost?: boolean }) {
  const windows = useMemo(() => carriageWindows(), [])

  return (
    <group>
      {windows.map((w, i) => (
        <SingleWindow key={i} side={w.side} z={w.pos[2]} frost={frost} />
      ))}
    </group>
  )
}
