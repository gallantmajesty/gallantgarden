// Lava Pad Elimination Effects — screen flash, particles, and visual feedback on elimination

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, Mesh, BufferGeometry, Float32BufferAttribute, AdditiveBlending, MeshBasicMaterial } from 'three'
import { useLavaPadStore } from './store'

const PARTICLE_COUNT = 40

export function EliminationEffect() {
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const players = useLavaPadStore((s) => s.players)
  const phase = useLavaPadStore((s) => s.phase)
  const meshRef = useRef<Mesh>(null)
  const particlesRef = useRef<Points>(null)

  const localPlayer = localPlayerId ? players[localPlayerId] : null
  const isEliminated = localPlayer?.eliminated ?? false
  const wasEliminated = useRef(false)
  const effectTimer = useRef(0)
  const effectActive = useRef(false)
  const particleLifetimes = useRef(new Float32Array(PARTICLE_COUNT).fill(0))
  const flashIntensity = useRef(0)

  // Particle geometry — initialized once via useState lazy initializer
  const [particleGeo] = useState(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.4
      colors[i * 3 + 2] = 0.1
      sizes[i] = 0.2 + Math.random() * 0.5
    }
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geo.setAttribute('size', new Float32BufferAttribute(sizes, 1))
    return geo
  })

  useEffect(() => {
    if (isEliminated && !wasEliminated.current) {
      wasEliminated.current = true
      effectActive.current = true
      effectTimer.current = 1.5
      flashIntensity.current = 1.0
    }
    if (!isEliminated) {
      wasEliminated.current = false
    }
  }, [isEliminated])

  useFrame((_, dt) => {
    if (!effectActive.current) return

    effectTimer.current -= dt
    flashIntensity.current = Math.max(0, flashIntensity.current - dt * 2)

    // Update flash mesh
    const mesh = meshRef.current
    if (mesh) {
      const mat = mesh.material as MeshBasicMaterial
      mat.opacity = flashIntensity.current * 0.3

      // Pulse the flash
      if (flashIntensity.current > 0.5) {
        mat.opacity = 0.3 * Math.sin(Date.now() * 0.015) * 0.5 + 0.3
      }
    }

    // Update particles
    const pts = particlesRef.current
    if (pts && pts.geometry) {
      const posAttr = pts.geometry.attributes.position
      const posArray = posAttr.array as Float32Array

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleLifetimes.current[i] -= dt
        if (particleLifetimes.current[i] <= 0 && effectTimer.current > 0) {
          // Spawn a new particle
          const angle1 = Math.random() * Math.PI * 2
          const angle2 = Math.random() * Math.PI * 2
          const speed = 2 + Math.random() * 4
          posArray[i * 3] = Math.sin(angle1) * Math.cos(angle2) * speed * 0.001
          posArray[i * 3 + 1] = Math.random() * 3
          posArray[i * 3 + 2] = Math.cos(angle1) * Math.cos(angle2) * speed * 0.001
          particleLifetimes.current[i] = 0.5 + Math.random() * 1.0
        } else if (particleLifetimes.current[i] > 0) {
          // Move outward
          const speed = 4
          const dist = Math.sqrt(
            posArray[i * 3] ** 2 + posArray[i * 3 + 1] ** 2 + posArray[i * 3 + 2] ** 2
          )
          if (dist > 0) {
            posArray[i * 3] *= 1 + speed * dt
            posArray[i * 3 + 1] *= 1 + speed * dt * 0.5
            posArray[i * 3 + 2] *= 1 + speed * dt
          }
          posArray[i * 3 + 1] += dt * 0.5 // float upward
        }
      }
      posAttr.needsUpdate = true
    }

    if (effectTimer.current <= 0) {
      effectActive.current = false
      if (mesh) {
        const mat = mesh.material as MeshBasicMaterial
        mat.opacity = 0
      }
    }
  })

  if (phase !== 'playing') return null

  return (
    <>
      {/* Screen flash overlay */}
      <mesh ref={meshRef} position={[0, 5, -5]} scale={[30, 20, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0}
          depthWrite={false}
          side={2}
        />
      </mesh>

      {/* Debris particles */}
      <points ref={particlesRef} geometry={particleGeo}>
        <pointsMaterial
          color="#ff8833"
          size={0.3}
          transparent
          opacity={0.7}
          blending={AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  )
}