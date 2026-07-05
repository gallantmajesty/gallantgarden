import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useBabylon } from '@babylonjs/core'

// Advanced Samurai Character Component
const AdvancedSamurai = ({ position = [0, 0, 0], animation = 'idle' }) => {
  const groupRef = useRef()
  const swordRef = useRef()
  const [time, setTime] = useState(0)
  
  useFrame((state, delta) => {
    setTime(prev => prev + delta)
    
    if (!groupRef.current) return
    
    const t = time
    
    // Animation states
    if (animation === 'idle') {
      // Gentle breathing and subtle movement
      groupRef.current.scale.y = 1 + Math.sin(t * 2) * 0.02
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.02
      
      // Sword sway
      if (swordRef.current) {
        swordRef.current.rotation.z = Math.sin(t * 1.5) * 0.1
      }
    } else if (animation === 'walk') {
      // Walking motion
      groupRef.current.position.x = Math.sin(t * 3) * 0.3
      groupRef.current.rotation.y = Math.sin(t * 3) * 0.1
      groupRef.current.position.y = Math.abs(Math.sin(t * 6)) * 0.1
      
      // Sword swing
      if (swordRef.current) {
        swordRef.current.rotation.z = Math.sin(t * 3) * 0.3
      }
    } else if (animation === 'run') {
      // Running motion
      groupRef.current.position.x = Math.sin(t * 6) * 0.5
      groupRef.current.rotation.y = Math.sin(t * 6) * 0.15
      groupRef.current.position.y = Math.abs(Math.sin(t * 12)) * 0.15
      
      // Fast sword movement
      if (swordRef.current) {
        swordRef.current.rotation.z = Math.sin(t * 6) * 0.5
      }
    }
  })

  // Create detailed samurai body with multiple materials
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
  }, [animation])

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
    <group ref={groupRef} position={position}>
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

// Babylon.js Samurai Component
const BabylonSamurai = ({ animation = 'idle' }) => {
  const canvasRef = useRef(null)
  const [babylonEngine, setBabylonEngine] = useState(null)
  
  useEffect(() => {
    if (!canvasRef.current || babylonEngine) return
    
    const engine = new BABYLON.Engine(canvasRef.current, true)
    setBabylonEngine(engine)
    
    const createScene = () => {
      const scene = new BABYLON.Scene(engine)
      scene.clearColor = new BABYLON.Color3(0.05, 0.05, 0.1)
      
      // Camera
      const camera = new BABYLON.ArcRotateCamera(
        "camera", 
        Math.PI / 2, 
        Math.PI / 3, 
        8, 
        BABYLON.Vector3.Zero(), 
        scene
      )
      camera.attachControl(canvasRef.current, true)
      camera.wheelPrecision = 50
      camera.lowerRadiusLimit = 3
      camera.upperRadiusLimit = 15
      
      // Light
      const light1 = new BABYLON.HemisphericLight(
        "light1", 
        new BABYLON.Vector3(0, 1, 0), 
        scene
      )
      light1.intensity = 0.6
      
      const light2 = new BABYLON.DirectionalLight(
        "light2", 
        new BABYLON.Vector3(-1, -1, -1), 
        scene
      )
      light2.intensity = 0.4
      
      // Ground
      const ground = BABYLON.MeshBuilder.CreateGround(
        "ground", 
        {width: 10, height: 10}, 
        scene
      )
      const groundMaterial = new BABYLON.StandardMaterial("groundMat", scene)
      groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.3)
      groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0)
      ground.material = groundMaterial
      
      // Create samurai
      const samuraiBody = BABYLON.MeshBuilder.CreateBox("samuraiBody", {size: 1}, scene)
      samuraiBody.position.y = 1
      
      // Materials
      const blueMat = new BABYLON.StandardMaterial("blueMat", scene)
      blueMat.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.4)
      blueMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.4)
      blueMat.emissiveColor = new BABYLON.Color3(0, 0, 0)
      
      const redMat = new BABYLON.StandardMaterial("redMat", scene)
      redMat.diffuseColor = new BABYLON.Color3(0.6, 0.1, 0.1)
      redMat.specularColor = new BABYLON.Color3(0.2, 0.1, 0.1)
      
      const blackMat = new BABYLON.StandardMaterial("blackMat", scene)
      blackMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05)
      blackMat.specularColor = new BABYLON.Color3(0, 0, 0)
      
      const silverMat = new BABYLON.StandardMaterial("silverMat", scene)
      silverMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.9)
      silverMat.specularColor = new BABYLON.Color3(1, 1, 1)
      silverMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2)
      
      // Apply materials to body parts
      samuraiBody.material = blueMat
      
      // Animation
      let animationTime = 0
      scene.registerBeforeRender(() => {
        animationTime += engine.getDeltaTime() / 1000
        
        if (animation === 'idle') {
          samuraiBody.position.y = 1 + Math.sin(animationTime * 2) * 0.02
          samuraiBody.rotation.y = Math.sin(animationTime * 0.5) * 0.02
        } else if (animation === 'walk') {
          samuraiBody.position.x = Math.sin(animationTime * 3) * 0.3
          samuraiBody.position.y = 1 + Math.abs(Math.sin(animationTime * 6)) * 0.1
          samuraiBody.rotation.y = Math.sin(animationTime * 3) * 0.1
        } else if (animation === 'run') {
          samuraiBody.position.x = Math.sin(animationTime * 6) * 0.5
          samuraiBody.position.y = 1 + Math.abs(Math.sin(animationTime * 12)) * 0.15
          samuraiBody.rotation.y = Math.sin(animationTime * 6) * 0.15
        }
      })
      
      return scene
    }
    
    const scene = createScene()
    
    engine.runRenderLoop(() => {
      scene.render()
    })
    
    const resize = () => engine.resize()
    window.addEventListener('resize', resize)
    
    return () => {
      engine.stopRenderLoop()
      window.removeEventListener('resize', resize)
      engine.dispose()
    }
  }, [animation])
  
  return <canvas ref={canvasRef} style={{ width: '100%', height: '500px' }} />
}

// Main React Component
const SamuraiAvatarApp = () => {
  const [activeFramework, setActiveFramework] = useState('three')
  const [animation, setAnimation] = useState('idle')
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
        Samurai Avatar Creator
      </h1>
      
      {/* Framework Selection */}
      <div className="mb-8 flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => setActiveFramework('three')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 font-semibold ${
            activeFramework === 'three'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          Three.js + React Fiber
        </button>
        <button
          onClick={() => setActiveFramework('babylon')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 font-semibold ${
            activeFramework === 'babylon'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/50'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          Babylon.js
        </button>
      </div>
      
      {/* Animation Controls */}
      <div className="mb-8 flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => setAnimation('idle')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 font-semibold ${
            animation === 'idle'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          🧘 Idle
        </button>
        <button
          onClick={() => setAnimation('walk')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 font-semibold ${
            animation === 'walk'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          🚶 Walk
        </button>
        <button
          onClick={() => setAnimation('run')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 font-semibold ${
            animation === 'run'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          🏃 Run
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all duration-300"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {/* Canvas Container */}
      <div className="bg-black/30 rounded-xl p-4 backdrop-blur-sm border border-gray-700">
        {activeFramework === 'three' ? (
          <div className="w-full h-[500px] rounded-lg overflow-hidden">
            <Canvas
              camera={{ position: [0, 2, 6], fov: 75 }}
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
              
              {/* Samurai Character */}
              <AdvancedSamurai animation={animation} />
              
              {/* Controls */}
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                maxDistance={15}
                minDistance={3}
              />
              
              {/* Ground */}
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.5, 0]}
                receiveShadow
              >
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#2a2a3e" />
              </mesh>
              
              {/* Environment */}
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
        ) : (
          <BabylonSamurai animation={animation} />
        )}
      </div>
      
      {/* Details Panel */}
      {showDetails && (
        <div className="mt-8 bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-blue-400">Samurai Avatar Details</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-400">Visual Features:</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Blue samurai armor with metallic finish</li>
                <li>• Red shoulder guards and helmet crest</li>
                <li>• White belt detail</li>
                <li>• Black face mask with eye holes</li>
                <li>• Detailed katana sword with guard and handle</li>
                <li>• Dynamic shadows and lighting</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-400">Technical Features:</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Three.js + React Fiber for rendering</li>
                <li>• Babylon.js alternative implementation</li>
                <li>• Procedural geometry generation</li>
                <li>• Real-time animations (idle, walk, run)</li>
                <li>• Interactive camera controls</li>
                <li>• Material system with PBR shading</li>
                <li>• Shadow mapping and lighting</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">Animation States:</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-600 rounded-lg">
                <div className="text-2xl mb-1">🧘</div>
                <div className="font-semibold">Idle</div>
                <div className="text-sm text-gray-400">Breathing, subtle movement</div>
              </div>
              <div className="p-3 bg-gray-600 rounded-lg">
                <div className="text-2xl mb-1">🚶</div>
                <div className="font-semibold">Walk</div>
                <div className="text-sm text-gray-400">Gentle stride, sword sway</div>
              </div>
              <div className="p-3 bg-gray-600 rounded-lg">
                <div className="text-2xl mb-1">🏃</div>
                <div className="font-semibold">Run</div>
                <div className="text-sm text-gray-400">Fast movement, dynamic sword</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Options */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg">
          📦 Export as GLB
        </button>
        <button className="px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg">
          🎨 Export as OBJ
        </button>
        <button className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg">
          💾 Save as React Component
        </button>
      </div>
    </div>
  )
}

export default SamuraiAvatarApp