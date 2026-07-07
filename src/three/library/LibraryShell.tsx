import { Sparkles } from '@react-three/drei'
import { HALL } from './layout'

// Simple placeholder for LibraryShell
export function LibraryShell() {
  return (
    <group>
      {/* Basic shell structure */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[HALL.halfW * 2, 5, HALL.halfL * 2]} />
        <meshStandardMaterial color="#4a4a4a" transparent opacity={0.1} />
      </mesh>
      
      {/* Some decorative elements */}
      <Sparkles count={50} scale={[HALL.halfW * 2, 10, HALL.halfL * 2]} position={[0, 5, 0]} size={1} speed={0.1} color="#ffe6b0" opacity={0.3} />
    </group>
  )
}