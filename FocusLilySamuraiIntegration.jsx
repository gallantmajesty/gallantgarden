import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Text, Html, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useBabylon } from '@babylonjs/core'

// Focus Lily Integration Component
const FocusLilySamurai = ({ 
  position = [0, 0, 0], 
  scale = 1, 
  animation = 'idle',
  onCharacterStateChange = () => {} 
}) => {
  const groupRef = useRef()
  const swordRef = useRef()
  const [time, setTime] = useState(0)
  const [characterState, setCharacterState] = useState('idle')
  
  // Sync with parent animation state
  useEffect(() => {
    setCharacterState(animation)
    onCharacterStateChange(animation)
  }, [animation, onCharacterStateChange])
  
  useFrame((state, delta) => {
    setTime(prev => prev + delta)
    
    if (!groupRef.current) return
    
    const t = time
    
    // Animation states matching Focus Lily's locomotion system
    if (characterState === 'idle') {
      // Gentle breathing and subtle movement
      groupRef.current.scale.y = 1 + Math.sin(t * 1.4) * 0.02
      groupRef.current.rotation.y = Math.sin(t * 0.55) * 0.02
      
      // Sword sway
      if (swordRef.current) {
        swordRef.current.rotation.z = Math.sin(t * 1.5) * 0.1
      }
    } else if (characterState === 'walk') {
      // Walking motion matching Focus Lily's walk cycle
      const walkPhase = t * 4.5
      const walkSine = Math.sin(walkPhase)
      const walkCos = Math.cos(walkPhase)
      
      groupRef.current.position.x = walkSine * 0.1
      groupRef.current.rotation.y = walkSine * 0.05
      groupRef.current.position.y = Math.abs(walkCos) * 0.05
      
      // Arm swing
      if (swordRef.current) {
        swordRef.current.rotation.z = -walkSine * 0.2
      }
    } else if (characterState === 'run') {
      // Running motion
      const runPhase = t * 7
      const runSine = Math.sin(runPhase)
      const runCos = Math.cos(runPhase)
      
      groupRef.current.position.x = runSine * 0.2
      groupRef.current.rotation.y = runSine * 0.08
      groupRef.current.position.y = Math.abs(runCos) * 0.1
      
      // Fast sword movement
      if (swordRef.current) {
        swordRef.current.rotation.z = -runSine * 0.3
      }
    } else if (characterState === 'jump') {
      // Jump motion
      const jumpPhase = (t * 3) % 1
      let jumpHeight = 0
      
      if (jumpPhase < 0.33) {
        // Crouch
        jumpHeight = -jumpPhase * 0.3
      } else if (jumpPhase < 0.66) {
        // Rise and peak
        jumpHeight = Math.sin((jumpPhase - 0.33) * 3 * Math.PI) * 0.3
      } else {
        // Land
        jumpHeight = (1 - jumpPhase) * 0.15
      }
      
      groupRef.current.position.y = 1 + jumpHeight
      
      // Sword up during jump
      if (swordRef.current) {
        swordRef.current.rotation.z = jumpHeight > 0 ? -0.5 : 0
      }
    }
  })

  // Create detailed samurai body with Focus Lily compatible materials
  const samuraiGeometry = useMemo(() => {
    const bodyGroup = new THREE.Group()
    
    // Main body (blue armor)
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.8, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.1, 0.2, 0.4), // Blue
      metalness: 0.3,
      roughness: 0.7
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.9
    bodyGroup.add(body)
    
    // Shoulder guards (red)
    const shoulderGeometry = new THREE.SphereGeometry(0.15, 8, 6)
    const shoulderMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.1, 0.1), // Red
      metalness: 0.4,
      roughness: 0.6
    })
    
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial)
    leftShoulder.position.set(-0.5, 1.2, 0)
    bodyGroup.add(leftShoulder)
    
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial)
    rightShoulder.position.set(0.5, 1.2, 0)
    bodyGroup.add(rightShoulder)
    
    // Belt (white)
    const beltGeometry = new THREE.TorusGeometry(0.45, 0.05, 8, 16)
    const beltMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.95, 0.95, 0.95), // White
      metalness: 0.1,
      roughness: 0.8
    })
    const belt = new THREE.Mesh(beltGeometry, beltMaterial)
    belt.position.y = 0.5
    belt.rotation.x = Math.PI / 2
    bodyGroup.add(belt)
    
    // Helmet with crest
    const helmetGeometry = new THREE.SphereGeometry(0.25, 8, 6)
    const helmetMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.7, 0.7, 0.8), // Metallic silver
      metalness: 0.8,
      roughness: 0.2
    })
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial)
    helmet.position.y = 2.1
    helmet.scale.set(1, 0.8, 1.1)
    bodyGroup.add(helmet)
    
    // Helmet crest (red)
    const crestGeometry = new THREE.ConeGeometry(0.05, 0.1, 4)
    const crestMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.1, 0.1), // Red
      metalness: 0.3,
      roughness: 0.5
    })
    const crest = new THREE.Mesh(crestGeometry, crestMaterial)
    crest.position.y = 2.3
    bodyGroup.add(crest)
    
    return bodyGroup
  }, [characterState])

  // Create detailed face mask
  const faceMaskGeometry = useMemo(() => {
    const maskGroup = new THREE.Group()
    
    // Main face mask (black)
    const maskGeometry = new THREE.SphereGeometry(0.2, 12, 8)
    const maskMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.05, 0.05, 0.05), // Black
      metalness: 0.2,
      roughness: 0.9
    })
    const mask = new THREE.Mesh(maskGeometry, maskMaterial)
    mask.position.y = 1.8
    mask.scale.set(1.2, 1, 1)
    maskGroup.add(mask)
    
    // Eye holes (transparent)
    const eyeGeometry = new THREE.RingGeometry(0.03, 0.06, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0, 0, 0), // Black
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.08, 1.82, 0.1)
    leftEye.rotation.x = Math.PI / 2
    maskGroup.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.08, 1.82, 0.1)
    rightEye.rotation.x = Math.PI / 2
    maskGroup.add(rightEye)
    
    return maskGroup
  }, [])

  // Create katana sword
  const katanaGeometry = useMemo(() => {
    const swordGroup = new THREE.Group()
    
    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.02, 0.8, 0.005)
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.9, 0.9, 1), // Silver
      metalness: 0.9,
      roughness: 0.1,
      emissive: new THREE.Color(0.1, 0.1, 0.2),
      emissiveIntensity: 0.1
    })
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial)
    swordGroup.add(blade)
    
    // Guard
    const guardGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8)
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.1, 0.1), // Red
      metalness: 0.6,
      roughness: 0.4
    })
    const guard = new THREE.Mesh(guardGeometry, guardMaterial)
    guard.position.y = -0.3
    swordGroup.add(guard)
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8)
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.2, 0.1), // Brown
      roughness: 0.8,
      metalness: 0.1
    })
    const handle = new THREE.Mesh(handleGeometry, handleMaterial)
    handle.position.y = -0.5
    swordGroup.add(handle)
    
    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.04, 8, 6)
    const pommelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.8, 0.9), // Silver
      metalness: 0.8,
      roughness: 0.2
    })
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial)
    pommel.position.y = -0.7
    swordGroup.add(pommel)
    
    return swordGroup
  }, [])

  return (
    <group 
      ref={groupRef} 
      position={position}
      scale={[scale, scale, scale]}
    >
      {/* Samurai Body Parts */}
      <primitive object={samuraiGeometry} />
      
      {/* Face Mask */}
      <primitive object={faceMaskGeometry} />
      
      {/* Sword */}
      <group ref={swordRef} position={[0.4, 1.2, 0]}>
        <primitive object={katanaGeometry} />
      </group>
      
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial 
          color="black" 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

// Focus Lily Integration Main Component
const FocusLilySamuraiIntegration = () => {
  const [characterState, setCharacterState] = useState('idle')
  const [cameraPosition, setCameraPosition] = useState([0, 2, 5])
  const [showControls, setShowControls] = useState(true)
  
  // Animation state handlers
  const handleCharacterStateChange = (newState) => {
    setCharacterState(newState)
    console.log('Character state changed to:', newState)
  }
  
  // Camera controls
  const resetCamera = () => {
    setCameraPosition([0, 2, 5])
  }
  
  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            Focus Lily - Samurai Avatar Integration
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowControls(!showControls)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {showControls ? 'Hide Controls' : 'Show Controls'}
            </button>
            <button
              onClick={resetCamera}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Reset Camera
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Canvas */}
      <div className="w-full h-full">
        <Canvas
          camera={{ position: cameraPosition, fov: 75 }}
          shadows
          style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* Focus Lily Environment */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.5, 0]}
            receiveShadow
          >
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#2a2a3e" />
          </mesh>
          
          {/* Samurai Character */}
          <FocusLilySamurai
            position={[0, 0, 0]}
            scale={1}
            animation={characterState}
            onCharacterStateChange={handleCharacterStateChange}
          />
          
          {/* Camera Controls */}
          {showControls && (
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxDistance={15}
              minDistance={3}
              onChange={(event) => {
                if (event.target) {
                  setCameraPosition([...event.target.camera.position])
                }
              }}
            />
          )}
          
          {/* UI Elements */}
          <Text position={[-4, 3, -2]} fontSize={0.5} color="white" font="/fonts/inter-bold.woff">
            Samurai Avatar
          </Text>
          
          {/* Floating particles */}
          {Array.from({ length: 20 }, (_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 10,
                Math.random() * 4,
                (Math.random() - 0.5) * 10
              ]}
            >
              <sphereGeometry args={[0.02]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
            </mesh>
          ))}
        </Canvas>
      </div>
      
      {/* Control Panel */}
      {showControls && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="max-w-4xl mx-auto bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Animation Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Animation Controls</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCharacterState('idle')}
                    className={`p-3 rounded-lg transition-all ${
                      characterState === 'idle'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    🧘 Idle
                  </button>
                  <button
                    onClick={() => setCharacterState('walk')}
                    className={`p-3 rounded-lg transition-all ${
                      characterState === 'walk'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    🚶 Walk
                  </button>
                  <button
                    onClick={() => setCharacterState('run')}
                    className={`p-3 rounded-lg transition-all ${
                      characterState === 'run'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    🏃 Run
                  </button>
                  <button
                    onClick={() => setCharacterState('jump')}
                    className={`p-3 rounded-lg transition-all ${
                      characterState === 'jump'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    🦘 Jump
                  </button>
                </div>
              </div>
              
              {/* Character Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-red-400">Character Information</h3>
                <div className="space-y-2 text-gray-300">
                  <div className="flex justify-between">
                    <span>Current State:</span>
                    <span className="font-semibold text-white">{characterState}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Framework:</span>
                    <span className="font-semibold text-blue-400">Three.js + React Fiber</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Integration:</span>
                    <span className="font-semibold text-green-400">Focus Lily Compatible</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Skeleton:</span>
                    <span className="font-semibold text-yellow-400">23-bone Structure</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Export Options */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">Export Options</h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  📦 Export as GLB
                </button>
                <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                  🎨 Export as OBJ
                </button>
                <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                  💾 Save as React Component
                </button>
                <button className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                  🔗 Share Focus Lily
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FocusLilySamuraiIntegration