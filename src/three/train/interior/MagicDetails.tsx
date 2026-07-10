// MagicDetails — atmospheric visual effects that make the interior feel alive:
// floating dust particles (GPU Points), magical book stack with page flip,
// window condensation/frost for cold routes, and candle flicker on lamps.
//
// DustParticles uses pre-allocated Float32Arrays (no per-frame GC) and a
// PointsMaterial with AdditiveBlending for a single-draw-call particle system.

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, AdditiveBlending } from 'three'
import { CARRIAGE } from '../interior'
import { sharedPerfMonitor } from '../perfMonitor'

const DUST_COUNT = 80

/** Floating dust particles — GPU point sprites drifting upward in warm light */
export function DustParticles() {
  const pointsRef = useRef<import('three').Points>(null)
  const { halfW, ceilY, z0, z1 } = CARRIAGE

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(DUST_COUNT * 3)
    const sizes = new Float32Array(DUST_COUNT)
    const phases = new Float32Array(DUST_COUNT)

    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * halfW * 1.6
      positions[i * 3 + 1] = Math.random() * ceilY
      positions[i * 3 + 2] = z0 + Math.random() * (z1 - z0)
      sizes[i] = 0.01 + Math.random() * 0.02
      phases[i] = Math.random() * Math.PI * 2
    }

    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new Float32BufferAttribute(phases, 1))
    return geo
  }, [halfW, ceilY, z0, z1])

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => { geometry.dispose() }
  }, [geometry])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    // Gate visibility on the perf monitor's dust toggle (spec 3.10): when FPS
    // sags the auto-adjuster drops particles to claw back frames.
    pointsRef.current.visible = sharedPerfMonitor.dustParticlesEnabled
    const t = clock.getElapsedTime()
    const pos = pointsRef.current.geometry.attributes.position
    const phaseAttr = pointsRef.current.geometry.attributes.aPhase

    for (let i = 0; i < DUST_COUNT; i++) {
      const phase = phaseAttr.getX(i)
      // slow upward drift
      pos.array[i * 3 + 1] += 0.003
      // wrap around
      if (pos.array[i * 3 + 1] > ceilY) {
        pos.array[i * 3 + 1] = 0
      }
      // slight horizontal wobble
      pos.array[i * 3] += Math.sin(t * 0.5 + phase) * 0.0005
      pos.array[i * 3 + 2] += Math.cos(t * 0.3 + phase) * 0.0003
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#FFD54F"
        size={0.025}
        transparent
        opacity={0.5}
        blending={AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

/** Candle flicker effect — oscillates lamp intensity for warm, living light */
export function CandleFlicker({ lightRef }: { lightRef: React.RefObject<any> }) {
  const baseIntensity = useRef(0)

  useFrame(({ clock }) => {
    if (!lightRef.current) return
    if (baseIntensity.current === 0) {
      baseIntensity.current = lightRef.current.intensity
    }
    const t = clock.getElapsedTime()
    // subtle flicker: ±0.1 intensity at 0.5Hz
    const flicker = Math.sin(t * 3.14) * 0.05 + Math.sin(t * 7.7) * 0.03
    lightRef.current.intensity = baseIntensity.current + flicker
  })

  return null
}

/** Magical book stack with occasional page flip */
export function MagicBookStack({ position }: { position: [number, number, number] }) {
  const topBookRef = useRef<any>(null)
  const glowRef = useRef<any>(null)
  const lastFlip = useRef(0)
  const flipping = useRef(false)
  const flipProgress = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    // page flip every 30 seconds
    if (!flipping.current && t - lastFlip.current > 30) {
      flipping.current = true
      flipProgress.current = 0
      lastFlip.current = t
    }

    if (flipping.current && topBookRef.current) {
      flipProgress.current += 0.02
      // vertex wave: slight tilt then return
      const wave = Math.sin(flipProgress.current * Math.PI) * 0.15
      topBookRef.current.rotation.x = wave

      if (flipProgress.current >= 1) {
        flipping.current = false
        topBookRef.current.rotation.x = 0
      }
    }

    // golden glow pulse between pages
    if (glowRef.current) {
      glowRef.current.emissiveIntensity = 0.3 + Math.sin(t * 0.8) * 0.15
    }
  })

  return (
    <group position={position}>
      {/* Bottom book */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.2, 0.03, 0.15]} />
        <meshStandardMaterial color="#5D4037" roughness={0.7} />
      </mesh>
      {/* Middle book */}
      <mesh position={[0, 0.06, 0.01]}>
        <boxGeometry args={[0.19, 0.035, 0.14]} />
        <meshStandardMaterial color="#BF5B21" roughness={0.65} />
      </mesh>
      {/* Top book — flips occasionally */}
      <mesh ref={topBookRef} position={[0, 0.1, -0.01]}>
        <boxGeometry args={[0.18, 0.025, 0.13]} />
        <meshStandardMaterial color="#6B1D1D" roughness={0.7} />
      </mesh>
      {/* Golden glow between pages */}
      <mesh ref={glowRef} position={[0, 0.045, 0]}>
        <boxGeometry args={[0.16, 0.005, 0.12]} />
        <meshStandardMaterial
          color="#FFD54F"
          emissive="#FFD54F"
          emissiveIntensity={0.4}
          toneMapped={false}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}
