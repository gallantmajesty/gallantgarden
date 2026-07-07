import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'

// Simple placeholder for RemotePlayers
export function RemotePlayers() {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    // Simple animation for testing
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {/* Placeholder for other players */}
      <mesh position={[3, 1, 0]}>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshStandardMaterial color="#00ff00" />
      </mesh>
      <mesh position={[-3, 1, 0]}>
        <boxGeometry args={[0.5, 2, 0.5]} />
        <meshStandardMaterial color="#00ff00" />
      </mesh>
    </group>
  )
}