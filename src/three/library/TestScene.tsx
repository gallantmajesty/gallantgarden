import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export function TestScene() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: '#0c0a0a' }}
      >
        <ambientLight intensity={0.5} color="#ffffff" />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
        
        {/* Simple test objects */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        <mesh position={[5, 0, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#00ff00" />
        </mesh>
        
        <OrbitControls />
      </Canvas>
    </div>
  )
}