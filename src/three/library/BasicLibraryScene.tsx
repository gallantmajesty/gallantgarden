import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { DebugProbe, DebugHud } from './DebugOverlay'

export function BasicLibraryScene() {
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
          
          <DebugProbe />
        </Canvas>
      </div>
      <DebugHud />
    </>
  )
}