// Lava Pad Lava Controller — dynamic rising lava with waves, glow, and ember particles

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, Mesh, PlaneGeometry, MeshStandardMaterial, BufferGeometry, Float32BufferAttribute } from 'three'
import { useLavaPadStore } from './store'

const LAVA_RADIUS = 35
const LAVA_SEGMENTS = 64
const EMBER_COUNT = 120

export function LavaController() {
  const meshRef = useRef<Mesh>(null)
  const innerRef = useRef<Mesh>(null)
  const embersRef = useRef<Points>(null)
  const lavaY = useLavaPadStore((s) => s.lavaY)

  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(LAVA_RADIUS * 2, LAVA_RADIUS * 2, LAVA_SEGMENTS, LAVA_SEGMENTS)
    return geo
  }, [])

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: '#ff4a1a',
      emissive: '#ff2a0a',
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    })
  }, [])

  const glowMaterial = useMemo(() => {
    return new MeshStandardMaterial({
      color: '#ff6a30',
      emissive: '#ff5a20',
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.25,
      side: 2,
      depthWrite: false,
    })
  }, [])

  // Ember particles — initialized once via useState lazy initializer
  const [emberData] = useState(() => {
    const positions = new Float32Array(EMBER_COUNT * 3)
    const velocities = new Float32Array(EMBER_COUNT * 3)
    const lifetimes = new Float32Array(EMBER_COUNT)
    for (let i = 0; i < EMBER_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * LAVA_RADIUS * 0.8
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = -10 + Math.random() * 5
      positions[i * 3 + 2] = Math.sin(angle) * r
      velocities[i * 3] = (Math.random() - 0.5) * 0.3
      velocities[i * 3 + 1] = 0.5 + Math.random() * 1.5
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3
      lifetimes[i] = Math.random() * 5
    }
    return { positions, velocities, lifetimes }
  })

  // Mutable refs for useFrame to avoid linter false positives on R3F geometry mutation
  const geometryRef = useRef(geometry)
  const materialRef = useRef(material)
  const innerMaterialRef = useRef(glowMaterial)
  const emberVelocitiesRef = useRef(emberData.velocities)
  const emberLifetimesRef = useRef(emberData.lifetimes)

  // Ember geometry
  const emberGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(emberData.positions, 3))
    return geo
  }, [emberData.positions])

  useFrame(() => {
    const mesh = meshRef.current
    const inner = innerRef.current
    if (!mesh) return

    const y = lavaY
    mesh.position.y = y
    if (inner) inner.position.y = y + 0.1

    const geo = geometryRef.current
    const positions = geo.attributes.position.array as Float32Array
    const time = Date.now() * 0.001

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 2]
      const dist = Math.sqrt(x * x + z * z)

      // Multi-frequency wave superposition for organic feel
      const wave1 = Math.sin(dist * 0.2 - time * 1.5) * 0.25
      const wave2 = Math.sin(x * 0.35 + time * 0.8) * 0.15
      const wave3 = Math.cos(z * 0.3 + time * 0.7) * 0.15
      const wave4 = Math.sin((x + z) * 0.25 + time * 1.2) * 0.1
      const wave5 = Math.cos(dist * 0.5 - time * 2.0) * 0.05
      const edgeFade = Math.max(0, Math.min(1, (LAVA_RADIUS - dist) / 4))
      positions[i + 1] = (wave1 + wave2 + wave3 + wave4 + wave5) * edgeFade
    }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()

    // Dynamic color pulse
    const pulse = 0.7 + Math.sin(time * 1.2) * 0.2
    const pulse2 = 0.6 + Math.sin(time * 1.5 + 1.0) * 0.25
    const mat = materialRef.current
    mat.emissiveIntensity = pulse
    mat.opacity = 0.9 + Math.sin(time * 0.6) * 0.05

    // Subtle color shift
    const hue = 0.04 + Math.sin(time * 0.25) * 0.015
    mat.color.setHSL(hue, 0.95, 0.5)
    mat.emissive.setHSL(hue, 1.0, 0.48)

    if (inner) {
      const innerMat = innerMaterialRef.current
      innerMat.emissiveIntensity = 0.4 + pulse2 * 0.2
      innerMat.opacity = 0.2 + Math.sin(time * 0.5) * 0.05
    }

    // Update ember particles
    const embers = embersRef.current
    if (embers && embers.geometry) {
      const posAttr = embers.geometry.attributes.position
      const posArray = posAttr.array as Float32Array
      const velocities = emberVelocitiesRef.current
      const lifetimes = emberLifetimesRef.current
      for (let i = 0; i < EMBER_COUNT; i++) {
        const idx = i * 3
        lifetimes[i] -= 0.016
        if (lifetimes[i] <= 0) {
          // Reset ember
          const angle = Math.random() * Math.PI * 2
          const r = Math.random() * LAVA_RADIUS * 0.7
          posArray[idx] = Math.cos(angle) * r
          posArray[idx + 1] = y + 0.2
          posArray[idx + 2] = Math.sin(angle) * r
          lifetimes[i] = 2 + Math.random() * 4
        } else {
          posArray[idx] += velocities[idx] * 0.016
          posArray[idx + 1] += velocities[idx + 1] * 0.016
          posArray[idx + 2] += velocities[idx + 2] * 0.016
          // Add some drift
          posArray[idx] += Math.sin(time * 2 + i) * 0.01
          posArray[idx + 2] += Math.cos(time * 1.5 + i) * 0.01
        }
      }
      posAttr.needsUpdate = true
    }
  })

  return (
    <>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, lavaY, 0]}
        geometry={geometry}
        material={material}
        receiveShadow
      />
      <mesh
        ref={innerRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, lavaY + 0.1, 0]}
        geometry={geometry}
        material={glowMaterial}
      />
      <points ref={embersRef} geometry={emberGeometry}>
<pointsMaterial
  color="#ffaa44"
  size={0.15}
  transparent
  opacity={0.8}
  sizeAttenuation
/>
      </points>
    </>
  )
}