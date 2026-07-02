// @ts-nocheck
// WeatherSystem — weather presets and particle effects for each route.
// Provides fog density, ambient/sun colors, and optional rain/snow/aurora
// particle effects. Each weather type has its own particle behavior.

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { WeatherPreset } from './RouteManager'

export interface WeatherState {
  fogDensity: number
  fogColor: string
  ambientColor: string
  sunColor: string
  sunIntensity: number
  hasParticles: boolean
  particleType: 'none' | 'rain' | 'snow' | 'aurora'
}

export const WEATHER_PRESETS: Record<WeatherPreset, WeatherState> = {
  clear: {
    fogDensity: 0.002,
    fogColor: '#cfe6ff',
    ambientColor: '#87CEEB',
    sunColor: '#FFFFFF',
    sunIntensity: 1.2,
    hasParticles: false,
    particleType: 'none',
  },
  autumn: {
    fogDensity: 0.004,
    fogColor: '#caa15f',
    ambientColor: '#D4A574',
    sunColor: '#FFD700',
    sunIntensity: 1.1,
    hasParticles: false,
    particleType: 'none',
  },
  rain: {
    fogDensity: 0.006,
    fogColor: '#5a6a72',
    ambientColor: '#6B7280',
    sunColor: '#9CA3AF',
    sunIntensity: 0.7,
    hasParticles: true,
    particleType: 'rain',
  },
  snow: {
    fogDensity: 0.008,
    fogColor: '#3a4366',
    ambientColor: '#E8E8E8',
    sunColor: '#F0F0F0',
    sunIntensity: 0.6,
    hasParticles: true,
    particleType: 'snow',
  },
  clear_night: {
    fogDensity: 0.003,
    fogColor: '#0a1225',
    ambientColor: '#0F172A',
    sunColor: '#C0C0C0',
    sunIntensity: 0.3,
    hasParticles: false,
    particleType: 'none',
  },
  golden_hour: {
    fogDensity: 0.002,
    fogColor: '#e8a040',
    ambientColor: '#FF8C00',
    sunColor: '#FF6347',
    sunIntensity: 1.4,
    hasParticles: false,
    particleType: 'none',
  },
  aurora: {
    fogDensity: 0.001,
    fogColor: '#0c1828',
    ambientColor: '#0A1628',
    sunColor: '#22D3EE',
    sunIntensity: 0.4,
    hasParticles: true,
    particleType: 'aurora',
  },
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

/** Rain particles — fast-falling streaks */
function RainParticles({ count = 80 }: { count?: number }) {
  const ref = useRef<Group>(null)
  const drops = useMemo(() => {
    const rand = rng(42)
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 80,
      y: rand() * 24,
      z: (rand() - 0.2) * 120,
    }))
  }, [count])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.children.forEach((c, i) => {
      const d = drops[i]
      d.y -= dt * 22
      d.z -= dt * 26
      if (d.y < 0) d.y = 24
      if (d.z < -30) d.z += 120
      c.position.set(d.x, d.y, d.z)
    })
  })

  return (
    <group ref={ref}>
      {drops.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          <boxGeometry args={[0.03, 0.5, 0.03]} />
          <meshBasicMaterial color="#9fb6c4" transparent opacity={0.5} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Snow particles — slow drifting flakes */
function SnowParticles({ count = 50 }: { count?: number }) {
  const ref = useRef<Group>(null)
  const flakes = useMemo(() => {
    const rand = rng(77)
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 80,
      y: rand() * 24,
      z: (rand() - 0.2) * 120,
    }))
  }, [count])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.children.forEach((c, i) => {
      const d = flakes[i]
      d.y -= dt * 4
      d.z -= dt * 26
      if (d.y < 0) d.y = 24
      if (d.z < -30) d.z += 120
      c.position.set(d.x, d.y, d.z)
    })
  })

  return (
    <group ref={ref}>
      {flakes.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]}>
          <sphereGeometry args={[0.08, 4, 4]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Aurora borealis — pulsing translucent planes in the sky */
function AuroraParticles() {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const g = ref.current
    if (!g) return
    g.children.forEach((c, i) => {
      const mesh = c as any
      if (mesh.material) {
        mesh.material.opacity = 0.18 + Math.sin(t * 0.5 + i) * 0.1
      }
    })
  })

  return (
    <group ref={ref} position={[0, 40, 120]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[(i - 1) * 30, i * 6, 0]} rotation-x={-0.3}>
          <planeGeometry args={[70, 24]} />
          <meshBasicMaterial
            color={i === 1 ? '#7CFFB0' : '#9b7cff'}
            transparent
            opacity={0.2}
            side={2}
            fog={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Weather particle layer — renders the appropriate particles for the current weather */
export function WeatherParticles({ weather }: { weather: WeatherPreset }) {
  const preset = WEATHER_PRESETS[weather]
  if (!preset.hasParticles) return null

  switch (preset.particleType) {
    case 'rain':
      return <RainParticles />
    case 'snow':
      return <SnowParticles />
    case 'aurora':
      return <AuroraParticles />
    default:
      return null
  }
}

/** Get the fog density for a weather preset, interpolated by progress for transitions */
export function getWeatherFog(preset: WeatherState, progress: number): number {
  return preset.fogDensity
}
