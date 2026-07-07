import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { DebugProbe, DebugHud } from './DebugOverlay'

export function GeometryLibraryScene() {
  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas
          shadows={false}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 5, 10], fov: 60 }}
        >
          <color attach="background" args={['#0c0a0a']} />
          
          <PerspectiveCamera
            makeDefault
            position={[0, 5, 10]}
            fov={60}
            near={0.1}
            far={1000}
          />
          
          <ambientLight intensity={0.5} color="#ffffff" />
          
          {/* Floor */}
          <mesh position={[0, -0.5, 0]}>
            <boxGeometry args={[20, 1, 30]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          {/* Walls */}
          <mesh position={[-10, 0, 0]}>
            <boxGeometry args={[1, 5, 30]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          
          <mesh position={[10, 0, 0]}>
            <boxGeometry args={[1, 5, 30]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          
          <mesh position={[0, 0, -15]}>
            <boxGeometry args={[20, 5, 1]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          
          {/* Some furniture */}
          <mesh position={[-5, 0.5, -5]}>
            <boxGeometry args={[3, 1, 2]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          <mesh position={[5, 0.5, -5]}>
            <boxGeometry args={[3, 1, 2]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          <mesh position={[0, 0.5, 5]}>
            <boxGeometry args={[4, 1, 3]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          <DebugProbe />
        </Canvas>
      </div>
      <DebugHud />
    </>
  )
}