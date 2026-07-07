// @ts-nocheck
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { DebugProbe, DebugHud } from './DebugOverlay'

export function WorkingLibraryScene() {
  return (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas
          shadows={false}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 5, 10], fov: 60 }}
        >
          <color attach="background" args={['#0c0a0a']} />
          
          {/* Camera */}
          <PerspectiveCamera
            makeDefault
            position={[0, 5, 10]}
            fov={60}
            near={0.1}
            far={1000}
          />
          
          {/* Basic lighting */}
          <ambientLight intensity={0.38} color="#ffd9a8" />
          
          {/* Simple library representation */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[10, 1, 20]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          {/* Some furniture */}
          <mesh position={[-3, 0.5, -5]}>
            <boxGeometry args={[2, 1, 2]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          
          <mesh position={[3, 0.5, -5]}>
            <boxGeometry args={[2, 1, 2]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          
          <mesh position={[0, 0.5, 5]}>
            <boxGeometry args={[4, 1, 3]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
          
          {/* Camera controls for testing */}
          <OrbitControls />
          
          <DebugProbe />
        </Canvas>
      </div>
      <DebugHud />
    </>
  )
}