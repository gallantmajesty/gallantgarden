// @ts-nocheck
import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const FantasyBackground = () => {
  const sceneRef = useRef<THREE.Scene>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const firefliesRef = useRef<THREE.Points>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  
  // Load 3D assets
  const castleModel = useLoader(GLTFLoader, '/assets/castle.glb')
  const trainModel = useLoader(GLTFLoader, '/assets/magical-train.glb')
  const lotusModel = useLoader(GLTFLoader, '/assets/lotus.glb')
  
  // Create particle systems
  const particlesGeometry = new THREE.BufferGeometry()
  const particlesCount = 2000
  const positions = new Float32Array(particlesCount * 3)
  const colors = new Float32Array(particlesCount * 3)
  const sizes = new Float32Array(particlesCount)
  
  const color1 = new THREE.Color('#f6f1e5')  // Soft cream
  const color2 = new THREE.Color('#d9a441')  // Warm gold
  
  for (let i = 0; i < particlesCount; i++) {
    const i3 = i * 3
    positions[i3] = (Math.random() - 0.5) * 200
    positions[i3 + 1] = (Math.random() - 0.5) * 50
    positions[i3 + 2] = (Math.random() - 0.5) * 100
    
    colors[i3] = color1.r
    colors[i3 + 1] = color1.g
    colors[i3 + 2] = color1.b
    
    sizes[i] = Math.random() * 2
  }
  
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  
  // Fireflies geometry
  const firefliesGeometry = new THREE.BufferGeometry()
  const firefliesCount = 100
  const fireflyPositions = new Float32Array(firefliesCount * 3)
  const fireflyColors = new Float32Array(firefliesCount * 3)
  const fireflyVelocities = new Float32Array(firefliesCount)
  
  const goldenColor = new THREE.Color('#d9a441')
  const creamColor = new THREE.Color('#f6f1e5')
  
  for (let i = 0; i < firefliesCount; i++) {
    const i3 = i * 3
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 30 + 10
    
    fireflyPositions[i3] = Math.cos(angle) * distance
    fireflyPositions[i3 + 1] = Math.random() * 15
    fireflyPositions[i3 + 2] = Math.sin(angle) * distance
    
    // Randomly choose firefly color
    const color = Math.random() > 0.3 ? goldenColor : creamColor
    fireflyColors[i3] = color.r
    fireflyColors[i3 + 1] = color.g
    fireflyColors[i3 + 2] = color.b
    
    fireflyVelocities[i] = Math.random() * 0.02 + 0.01
  }
  
  firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3))
  firefliesGeometry.setAttribute('color', new THREE.BufferAttribute(fireflyColors, 3))
  firefliesGeometry.setAttribute('velocity', new THREE.BufferAttribute(fireflyVelocities, 1))
  
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    
    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.05
    }
    
    // Animate fireflies
    if (firefliesRef.current) {
      const positions = firefliesRef.current.geometry.attributes.position.array as Float32Array
      const velocities = firefliesRef.current.geometry.attributes.velocity.array as Float32Array
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += velocities[i / 3] * delta
        
        // Smooth circular motion
        const angle = Math.atan2(positions[i + 2], positions[i])
        positions[i] = Math.cos(angle + delta * velocities[i / 3]) * (Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]))
        positions[i + 2] = Math.sin(angle + delta * velocities[i / 3]) * (Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]))
        
        // Reset if out of bounds
        if (positions[i + 1] > 20) {
          positions[i + 1] = -5
        }
      }
      
      firefliesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <group ref={sceneRef}>
      {/* Background particles */}
      <points ref={particlesRef} geometry={particlesGeometry}>
        <pointsMaterial
          size={0.1}
          color={0xf6f1e5}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Fireflies */}
      <points ref={firefliesRef} geometry={firefliesGeometry}>
        <pointsMaterial
          size={0.3}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Castle */}
      <primitive
        object={castleModel.scene}
        position={[-40, -10, 0]}
        scale={3}
        rotation={new THREE.Euler(0, Math.PI / 2, 0)}
      />
      
      {/* Magical Train */}
      <primitive
        object={trainModel.scene}
        position={[30, -5, 20]}
        scale={1.5}
        rotation={new THREE.Euler(0, -Math.PI / 4, 0)}
      />
      
      {/* Glowing Lotus Flower */}
      <primitive
        object={lotusModel.scene}
        position={[0, -15, -30]}
        scale={8}
        rotation={new THREE.Euler(-Math.PI / 2, 0, 0)}
      />
      
      {/* Moon */}
      <mesh position={[50, 40, -100]} castShadow>
        <sphereGeometry args={[20, 32, 32]} />
        <meshBasicMaterial color={0xf6f1e5} emissive={0x4e3d75} emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

export default FantasyBackground
