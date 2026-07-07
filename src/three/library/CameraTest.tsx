import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { OrbitControls } from '@react-three/drei'

export function CameraTest() {
  const [cameraPosition, setCameraPosition] = useState([0, 5, 10])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: cameraPosition, fov: 60 }}>
        <color attach="background" args={['#0c0a0a']} />
        <PerspectiveCamera
          makeDefault
          position={[0, 5, 10]}
          fov={60}
          near={0.1}
          far={1000}
        />
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
      </Canvas>
    </div>
  )
}