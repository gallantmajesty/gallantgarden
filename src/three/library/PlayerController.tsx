import { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'
import { HALL } from './layout'

// Simple placeholder for PlayerController
export function PlayerController() {
  const avatarRef = useRef<Group>(null)
  const loco = useRef({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })

  useEffect(() => {
    // Initialize player position
    console.log('PlayerController initialized')
  }, [])

  useFrame(() => {
    // Simple animation for testing
    if (avatarRef.current) {
      avatarRef.current.rotation.y += 0.005
    }
  })

  return (
    <group ref={avatarRef}>
      {/* Player avatar placeholder */}
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 1.5, 4, 8]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
    </group>
  )
}