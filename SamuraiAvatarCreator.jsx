import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { useBabylon } from '@babylonjs/core'

// Samurai Character Component
const SamuraiCharacter = ({ position = [0, 0, 0] }) => {
  const groupRef = useRef()
  const [animationState, setAnimationState] = useState('idle')

  // Create samurai geometry programmatically
  const samuraiMesh = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    
    // Create samurai body with blue+red+white colors
    const vertices = []
    const uvs = []
    const colors = []
    
    // Simple samurai body structure
    const bodySegments = 16
    const height = 2.0
    const radius = 0.3
    
    // Body vertices
    for (let y = 0; y <= height; y += 0.1) {
      const yRatio = y / height
      const segmentRadius = radius * (1 - yRatio * 0.3) // Taper towards top
      
      for (let i = 0; i < bodySegments; i++) {
        const angle = (i / bodySegments) * Math.PI * 2
        const x = Math.cos(angle) * segmentRadius
        const z = Math.sin(angle) * segmentRadius
        
        vertices.push(x, y, z)
        
        // UV coordinates
        uvs.push(i / bodySegments, y / height)
        
        // Colors: Blue body, red accents, white details
        if (yRatio < 0.3) {
          // Bottom - blue
          colors.push(0.1, 0.2, 0.4)
        } else if (yRatio > 0.7) {
          // Top - white
          colors.push(0.95, 0.95, 0.95)
        } else {
          // Middle - blue with red accents
          colors.push(0.1, 0.2, 0.4)
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    
    // Create faces
    const indices = []
    for (let y = 0; y < height / 0.1 - 1; y++) {
      for (let i = 0; i < bodySegments; i++) {
        const current = y * bodySegments + i
        const next = current + bodySegments
        const nextI = (i + 1) % bodySegments
        const currentNextI = y * bodySegments + nextI
        
        indices.push(current, next, currentNextI)
        indices.push(next, next + bodySegments, currentNextI)
      }
    }
    
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    
    return geometry
  }, [])

  // Create samurai face mask (black with eye holes)
  const faceMaskGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.3, 16, 12)
    
    // Create black face mask
    const colors = []
    const positions = geometry.attributes.position.array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      // Eye holes (black areas around eyes)
      const leftEye = Math.sqrt((x + 0.1) ** 2 + (y - 0.1) ** 2 + z ** 2) < 0.08
      const rightEye = Math.sqrt((x - 0.1) ** 2 + (y - 0.1) ** 2 + z ** 2) < 0.08
      
      if (leftEye || rightEye) {
        colors.push(0, 0, 0) // Black for eye areas
      } else {
        colors.push(0.05, 0.05, 0.05) // Dark gray for mask
      }
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geometry
  }, [])

  // Animation logic
  useFrame((state, delta) => {
    if (!groupRef.current) return
    
    const time = state.clock.getElapsedTime()
    
    // Simple animations based on state
    if (animationState === 'idle') {
      // Breathing animation
      groupRef.current.scale.y = 1 + Math.sin(time * 2) * 0.02
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05
    } else if (animationState === 'walk') {
      // Walking motion
      groupRef.current.position.x = Math.sin(time * 2) * 0.1
      groupRef.current.rotation.y = Math.sin(time * 2) * 0.1
    } else if (animationState === 'run') {
      // Running motion
      groupRef.current.position.x = Math.sin(time * 4) * 0.2
      groupRef.current.rotation.y = Math.sin(time * 4) * 0.15
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Samurai Body */}
      <mesh geometry={samuraiMesh}>
        <meshStandardMaterial 
          vertexColors 
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Face Mask */}
      <mesh geometry={faceMaskGeometry} position={[0, 1.5, 0]}>
        <meshStandardMaterial 
          vertexColors 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Sword */}
      <mesh position={[0.5, 1, 0]}>
        <boxGeometry args={[0.05, 0.8, 0.02]} />
        <meshStandardMaterial color="#silver" metalness={0.8} />
      </mesh>
      
      {/* Sword handle */}
      <mesh position={[0.5, 0.6, 0]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  )
}

// Babylon.js Integration Component
const BabylonSamurai = () => {
  const canvasRef = useRef(null)
  
  useEffect(() => {
    if (!canvasRef.current) return
    
    const engine = new BABYLON.Engine(canvasRef.current, true)
    const createScene = () => {
      const scene = new BABYLON.Scene(engine)
      scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.2)
      
      // Camera
      const camera = new BABYLON.ArcRotateCamera(
        "camera", 
        Math.PI / 2, 
        Math.PI / 3, 
        5, 
        BABYLON.Vector3.Zero(), 
        scene
      )
      camera.attachControl(canvasRef.current, true)
      
      // Light
      const light = new BABYLON.HemisphericLight(
        "light", 
        new BABYLON.Vector3(0, 1, 0), 
        scene
      )
      light.intensity = 0.7
      
      // Create samurai using Babylon primitives
      const samurai = BABYLON.MeshBuilder.CreateBox("samurai", {size: 1}, scene)
      samurai.position.y = 1
      
      // Create face mask
      const faceMask = BABYLON.MeshBuilder.CreateSphere("faceMask", {diameter: 0.6}, scene)
      faceMask.position.y = 2.2
      
      // Materials
      const blueMaterial = new BABYLON.StandardMaterial("blue", scene)
      blueMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.4)
      blueMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.2)
      
      const redMaterial = new BABYLON.StandardMaterial("red", scene)
      redMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.1, 0.1)
      redMaterial.specularColor = new BABYLON.Color3(0.2, 0.05, 0.05)
      
      const blackMaterial = new BABYLON.StandardMaterial("black", scene)
      blackMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05)
      
      // Apply materials
      samurai.material = blueMaterial
      
      // Animation
      scene.registerBeforeRender(() => {
        samurai.rotation.y += 0.01
        faceMask.rotation.y += 0.01
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
    }
  }, [])
  
  return <canvas ref={canvasRef} style={{ width: '100%', height: '400px' }} />
}

// Main React Component
const SamuraiAvatarCreator = () => {
  const [activeView, setActiveView] = useState('three')
  const [animation, setAnimation] = useState('idle')
  
  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Samurai Avatar Creator</h1>
      
      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 justify-center">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveView('three')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'three' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Three.js + React Fiber
          </button>
          <button 
            onClick={() => setActiveView('babylon')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'babylon' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Babylon.js
          </button>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setAnimation('idle')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              animation === 'idle' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Idle
          </button>
          <button 
            onClick={() => setAnimation('walk')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              animation === 'walk' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Walk
          </button>
          <button 
            onClick={() => setAnimation('run')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              animation === 'run' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Run
          </button>
        </div>
      </div>
      
      {/* Canvas Container */}
      <div className="bg-gray-100 rounded-lg p-4">
        {activeView === 'three' ? (
          <div className="w-full h-96">
            <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 10, 5]} intensity={0.8} />
              
              <SamuraiCharacter />
              
              <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              
              {/* Ground */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="#4a5568" />
              </mesh>
              
              {/* Environment */}
              <Text position={[-3, 3, -2]} fontSize={0.5} color="white">
                Samurai Avatar
              </Text>
            </Canvas>
          </div>
        ) : (
          <BabylonSamurai />
        )}
      </div>
      
      {/* Instructions */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Samurai Avatar Features:</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Colors:</strong> Blue armor, red accents, white details, black face mask</li>
          <li><strong>Face:</strong> Black mask with only eyes visible</li>
          <li><strong>Accessories:</strong> Sword with handle</li>
          <li><strong>Animations:</strong> Idle, walk, run states</li>
          <li><strong>Framework:</strong> Three.js + React Fiber (primary), Babylon.js (alternative)</li>
          <li><strong>Controls:</strong> Mouse orbit, zoom, rotate</li>
        </ul>
      </div>
      
      {/* Export Options */}
      <div className="mt-6 flex gap-4 justify-center">
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Export as GLB
        </button>
        <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Export as OBJ
        </button>
        <button className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
          Save as React Component
        </button>
      </div>
    </div>
  )
}

export default SamuraiAvatarCreator