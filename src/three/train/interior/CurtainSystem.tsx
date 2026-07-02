// CurtainSystem — heavy velvet curtains on brass rods with tie-back hooks.
// Curtains sway subtly when the train moves (vertex shader animation via useFrame).
// Can be drawn closed by player toggle (press C). One curtain pair per window.
// When drawn, curtains slide inward to cover the window; when open, they gather
// at the sides with tie-back hooks.

import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { carriageWindows, CARRIAGE } from '../interior'
import { useVelvetMaterial } from '../materials/VelvetMaterial'
import { useBrassMaterial } from '../materials/BrassMaterial'
import type { Mesh } from 'three'

const CURTAIN_W = 0.15
const CURTAIN_H = 1.1
const CURTAIN_DEPTH = 0.12

// Open position: curtains at window edges (gathering)
const OPEN_OFFSET = 0.5
// Closed position: curtains meet at window centre
const CLOSED_OFFSET = 0.05
// Animation duration in seconds
const DRAW_DURATION = 1.5

/** Global curtain state — toggled by pressing C */
let _curtainsClosed = false
let _curtainsDrawProgress = 0 // 0 = open, 1 = closed

export function isCurtainClosed() { return _curtainsClosed }

/** Listen for C key press to toggle curtain state */
function useCurtainToggle() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        // Don't toggle if player is typing in an input
        if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
        _curtainsClosed = !_curtainsClosed
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

interface CurtainPairProps {
  side: -1 | 1
  z: number
}

/** A pair of curtains flanking one window, with brass rod and tie-back hooks */
function CurtainPair({ side, z }: CurtainPairProps) {
  const velvetMat = useVelvetMaterial()
  const brassMat = useBrassMaterial()
  const { halfW } = CARRIAGE
  const x = side * halfW

  const leftRef = useRef<Mesh>(null)
  const rightRef = useRef<Mesh>(null)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const sway = Math.sin(t * 0.3 + phase) * 0.015

    // Smoothly animate between open and closed
    const target = _curtainsClosed ? 1 : 0
    const speed = 1 / DRAW_DURATION / 60 // per-frame increment at 60fps
    if (_curtainsDrawProgress < target) {
      _curtainsDrawProgress = Math.min(_curtainsDrawProgress + speed, 1)
    } else if (_curtainsDrawProgress > target) {
      _curtainsDrawProgress = Math.max(_curtainsDrawProgress - speed, 0)
    }

    // Ease in-out
    const p = _curtainsDrawProgress
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2

    // Interpolate curtain position
    const closedZ = CLOSED_OFFSET
    const openZ = OPEN_OFFSET
    const curtainZ = openZ + (closedZ - openZ) * eased

    if (leftRef.current) {
      leftRef.current.rotation.z = sway * (1 - eased * 0.5)
      leftRef.current.position.x = x + side * 0.06
      leftRef.current.position.z = -curtainZ
    }
    if (rightRef.current) {
      rightRef.current.rotation.z = -sway * (1 - eased * 0.5)
      rightRef.current.position.x = x + side * 0.06
      rightRef.current.position.z = curtainZ
    }
  })

  return (
    <group position={[0, 0, z]}>
      {/* Brass curtain rod */}
      <mesh position={[x + side * 0.06, 1.7, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 6]} />
        <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Rod finials — decorative end caps */}
      {[-0.6, 0.6].map((dz) => (
        <mesh key={dz} position={[x + side * 0.06, 1.7, dz]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#E0C060" roughness={0.2} metalness={0.95} />
        </mesh>
      ))}

      {/* Left curtain (tied back) */}
      <mesh ref={leftRef} position={[x + side * 0.06, 0.9, -0.5]}>
        <boxGeometry args={[CURTAIN_W, CURTAIN_H, CURTAIN_DEPTH]} />
        <meshStandardMaterial {...velvetMat} />
      </mesh>
      {/* Right curtain (tied back) */}
      <mesh ref={rightRef} position={[x + side * 0.06, 0.9, 0.5]}>
        <boxGeometry args={[CURTAIN_W, CURTAIN_H, CURTAIN_DEPTH]} />
        <meshStandardMaterial {...velvetMat} />
      </mesh>

      {/* Tie-back hooks — brass L-shapes */}
      {[-0.5, 0.5].map((dz) => (
        <mesh key={`hook-${dz}`} position={[x + side * 0.08, 0.85, dz]}>
          <boxGeometry args={[0.03, 0.06, 0.02]} />
          <meshStandardMaterial color={brassMat.color} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** All curtain pairs along both sides of the carriage */
export function CurtainSystem() {
  const windows = useMemo(() => carriageWindows(), [])
  useCurtainToggle()

  return (
    <group>
      {windows.map((w, i) => (
        <CurtainPair key={i} side={w.side} z={w.pos[2]} />
      ))}
    </group>
  )
}
