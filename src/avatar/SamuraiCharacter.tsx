import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarRig, type AvatarRigHandle } from './AvatarRig'
import { AvatarAnimator, type Lod, type PreviewState } from './AvatarAnimator'
import { type Locomotion } from './animation'
import { type AvatarConfig } from './config'

interface SamuraiCharacterProps {
  config: AvatarConfig
  locomotion?: React.RefObject<Locomotion>
  lod?: React.RefObject<Lod>
  preview?: PreviewState
  scale?: number
  yOffset?: number
}

export function SamuraiCharacter({ 
  scale = 1, 
  yOffset = 0 
}: SamuraiCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const swordRef = useRef<THREE.Group>(null)
  const [time, setTime] = useState(0)
  
  // Create detailed samurai geometry
  const samuraiGeometry = useMemo(() => {
    const group = new THREE.Group()
    
    // Main body (blue armor)
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.8, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.1, 0.2, 0.4), // Blue
      metalness: 0.3,
      roughness: 0.7
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.9
    group.add(body)
    
    // Shoulder guards (red)
    const shoulderGeometry = new THREE.SphereGeometry(0.15, 8, 6)
    const shoulderMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.1, 0.1), // Red
      metalness: 0.4,
      roughness: 0.6
    })
    
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial)
    leftShoulder.position.set(-0.5, 1.2, 0)
    group.add(leftShoulder)
    
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial)
    rightShoulder.position.set(0.5, 1.2, 0)
    group.add(rightShoulder)
    
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
    group.add(belt)
    
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
    group.add(helmet)
    
    // Helmet crest (red)
    const crestGeometry = new THREE.ConeGeometry(0.05, 0.1, 4)
    const crestMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.1, 0.1), // Red
      metalness: 0.3,
      roughness: 0.5
    })
    const crest = new THREE.Mesh(crestGeometry, crestMaterial)
    crest.position.y = 2.3
    group.add(crest)
    
    return group
  }, [])

  // Create face mask
  const faceMaskGeometry = useMemo(() => {
    const group = new THREE.Group()
    
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
    group.add(mask)
    
    // Eye holes
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
    group.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.08, 1.82, 0.1)
    rightEye.rotation.x = Math.PI / 2
    group.add(rightEye)
    
    return group
  }, [])

  // Create katana sword
  const katanaGeometry = useMemo(() => {
    const group = new THREE.Group()
    
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
    group.add(blade)
    
    // Guard
    const guardGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8)
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.1, 0.1), // Red
      metalness: 0.6,
      roughness: 0.4
    })
    const guard = new THREE.Mesh(guardGeometry, guardMaterial)
    guard.position.y = -0.3
    group.add(guard)
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8)
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.2, 0.1), // Brown
      roughness: 0.8,
      metalness: 0.1
    })
    const handle = new THREE.Mesh(handleGeometry, handleMaterial)
    handle.position.y = -0.5
    group.add(handle)
    
    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.04, 8, 6)
    const pommelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.8, 0.9), // Silver
      metalness: 0.8,
      roughness: 0.2
    })
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial)
    pommel.position.y = -0.7
    group.add(pommel)
    
    return group
  }, [])

  // Animation logic
  useFrame((_state, delta) => {
    setTime(prev => prev + delta)
    
    if (!groupRef.current) return
    
    const t = time
    
    // Basic idle animation for samurai
    groupRef.current.scale.y = 1 + Math.sin(t * 1.4) * 0.02
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.02
    
    // Sword sway
    if (swordRef.current) {
      swordRef.current.rotation.z = Math.sin(t * 1.5) * 0.1
    }
  })

  return (
    <group 
      ref={groupRef} 
      scale={[scale, scale, scale]}
      position={[0, yOffset, 0]}
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
      <ContactShadows 
        position={[0, 0.001, 0]} 
        opacity={0.4} 
        scale={1.5} 
        blur={2.6} 
        far={2} 
        resolution={256} 
        color="#2a1a0a" 
      />
    </group>
  )
}

// Specialized Samurai Avatar that combines with your existing system
export function SamuraiAvatar({ 
  config, 
  locomotion, 
  lod, 
  preview 
}: {
  config: AvatarConfig
  locomotion?: React.RefObject<Locomotion>
  lod?: React.RefObject<Lod>
  preview?: PreviewState
}) {
  const primaryRig = useRef<AvatarRigHandle>(null)
  const nearLod = useRef<Lod>('near')
  const resolvedLod = lod ?? nearLod

  // Use samurai character if config specifies it
  const isSamurai = config.characterId === 'samurai'

  return (
    <group scale={1} position={[0, 0, 0]}>
      {isSamurai ? (
        // Use custom samurai model
        <SamuraiCharacter 
          config={config} 
          locomotion={locomotion}
          lod={resolvedLod}
          preview={preview}
        />
      ) : (
        // Use standard character rig
        <>
          <AvatarRig ref={primaryRig} config={config} />
          {locomotion && <AvatarAnimator rig={primaryRig} locomotion={locomotion} lod={resolvedLod} preview={preview} />}
        </>
      )}
    </group>
  )
}