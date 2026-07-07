import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Vector3 } from 'three'

export function SimpleCamera() {
  const cameraRef = useRef<PerspectiveCamera>(null)
  const { camera } = useThree()

  useEffect(() => {
    // Set up keyboard controls
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = parseInt(e.key)
      if (key >= 1 && key <= 5) {
        console.log(`Camera mode ${key} activated`)
        // You can add camera logic here
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useFrame(() => {
    // Simple camera movement
    if (cameraRef.current) {
      const time = Date.now() * 0.001
      const radius = 10
      cameraRef.current.position.x = Math.cos(time) * radius
      cameraRef.current.position.z = Math.sin(time) * radius
      cameraRef.current.lookAt(0, 0, 0)
    }
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={60}
      near={0.1}
      far={1000}
      position={[10, 5, 10]}
      rotation={[0, 0, 0]}
    />
  )
}