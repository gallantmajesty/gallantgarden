import { Suspense, useEffect, useMemo, useRef } from 'react'
import type { ScenePreset } from '../../store/settings'
import { MovingWorld } from './MovingWorld'
import { CarriageInteriorOptimized as CarriageInterior } from './CarriageInteriorOptimized'
import { InteriorController } from './InteriorController'
import { RemotePlayers } from '../library/RemotePlayers'
import { useTrain } from '../../store/train'
import { TRAIN_LINES } from '../../lib/train/lines'
import { resetSeatMap } from './interior'
import { PerformanceOverlay } from './PerformanceOverlay'
import { RouteScenery, ParallaxWindows, WeatherParticles, TimeOfDayLighting, useTunnelSystem } from './routes'
import { getRouteConfig, computeProgress } from './routes'
import { WEATHER_PRESETS } from './routes'
import type { DirectionalLight, HemisphereLight } from 'three'
import { useFrame } from '@react-three/fiber'

// The journey world: what you see once you've boarded and the train is rolling.
// Mounted by TrainStationScene whenever the player is aboard (phase traveling or
// arrived). It composes three layers in the carriage's own coordinate space —
//   • the CarriageInterior  (the cosy cabin you sit in, at the origin)
//   • the RouteScenery       (themed scenery streaming past the windows)
//   • the InteriorController  (seats you, broadcasts the seated pose, look-around)
// plus the shared RemotePlayers so fellow passengers appear in their chosen seats.
//
// Phase 4: Route system with per-route scenery, weather, time-of-day, tunnels,
// and parallax window views. The route config drives everything.

export function TrainRide({ preset }: { preset: ScenePreset }) {
  const line = useTrain((s) => s.line) ?? TRAIN_LINES[0]
  const departureSec = useTrain((s) => s.departureSec)
  const arrivalSec = useTrain((s) => s.arrivalSec)
  const startedAt = useTrain((s) => s.startedAt)
  const endsAt = useTrain((s) => s.endsAt)
  const phase = useTrain((s) => s.phase)

  const moving = phase === 'traveling' && departureSec === 0
  const decelerating = phase === 'arriving' && arrivalSec > 0
  void preset

  // Route configuration
  const route = useMemo(() => getRouteConfig(line), [line])
  const weatherPreset = WEATHER_PRESETS[route.weather]

  // Journey progress (0→1)
  const progress = computeProgress(departureSec, arrivalSec, startedAt, endsAt)

  // Tunnel system
  const { checkTunnel, onEnter, onExit } = useTunnelSystem(route.tunnels)
  const tunnelState = useMemo(() => checkTunnel(progress), [progress, checkTunnel])
  const tunnelFade = tunnelState.fadeProgress

  // Theme colors for the route scenery
  const theme = useMemo(() => {
    const themes: Record<string, any> = {
      countryside: {
        ground: '#4f7a32', hill: '#5e7f3a', tree: '#2f6a34', trunk: '#3a2414',
        sky: '#bfe0ff', fog: '#cfe6ff', light: '#fff4d8', ambient: '#9fb27a',
        field1: '#cdb45a', field2: '#6b9b3f', wall: '#e0d3b6', roof: '#9c4a32',
        barn: '#9c3b2e', mtn: '#6b7a5a', cap: '#eef4ff',
      },
      forest_river: {
        ground: '#3a5a30', hill: '#2c4a36', tree: '#1f5a34', trunk: '#2a1d12',
        sky: '#6a8a70', fog: '#5a7a62', light: '#bcd0a0', ambient: '#486a4e',
        field1: '#3f6a38', field2: '#587b42', wall: '#b9c0a8', roof: '#4a5540',
        barn: '#7a4a38', mtn: '#3e5a52', cap: '#9fb0a0',
      },
      alpine_snow: {
        ground: '#cfd8e6', hill: '#aebccf', tree: '#3a4a55', trunk: '#2a2218',
        sky: '#4a5a70', fog: '#5a6a80', light: '#cdd6ff', ambient: '#5a6488',
        field1: '#dfe7f2', field2: '#c6d2e2', wall: '#8a8f9c', roof: '#3a4256',
        barn: '#6a3a36', mtn: '#5a6478', cap: '#ffffff',
      },
      night_city: {
        ground: '#1a1a2e', hill: '#1a1a28', tree: '#1a2a20', trunk: '#1a1d18',
        sky: '#0a1225', fog: '#1a2238', light: '#8090c0', ambient: '#3a4a68',
        field1: '#1a2a38', field2: '#1a2240', wall: '#2a3248', roof: '#1a2230',
        barn: '#3a2a3a', mtn: '#1a2238', cap: '#4a5a78',
      },
      desert_coast: {
        ground: '#d4a860', hill: '#c4984a', tree: '#3a7a28', trunk: '#6a5030',
        sky: '#ff9040', fog: '#e8a040', light: '#ffcc80', ambient: '#c09050',
        field1: '#e0c070', field2: '#d4b060', wall: '#e0d0b0', roof: '#9c6a40',
        barn: '#8a5a30', mtn: '#8a7a5a', cap: '#e0d0a0',
      },
    }
    return themes[route.scenery] ?? themes.countryside
  }, [route.scenery])

  // Light refs for time-of-day system
  const sunLightRef = useRef<DirectionalLight>(null)
  const hemiLightRef = useRef<HemisphereLight>(null)

  // clear seat occupancy on a fresh ride
  useEffect(() => { resetSeatMap() }, [])

  // Cleanup GPU resources on unmount (textures, materials, geometries)
  useEffect(() => {
    return () => {
      // Force garbage collection of any lingering Three.js resources
      // by clearing the performance monitor's tracking
      if (typeof window !== 'undefined' && 'gc' in window) {
        try { (window as any).gc() } catch {}
      }
    }
  }, [])

  return (
    <>
      <Suspense fallback={<CarriagePlaceholder />}>
        {/* Route scenery — streams past the windows with weather + time-of-day */}
        <RouteScenery
          route={route}
          theme={theme}
          paused={!moving && !decelerating}
          decelerating={decelerating}
          tunnelFade={tunnelFade}
        />

        {/* Weather particles — rain, snow, or aurora */}
        <WeatherParticles weather={route.weather} />

        {/* Time-of-day lighting — sun/moon arc based on journey progress */}
        <TimeOfDayLighting
          progress={progress}
          timeOfDay={route.timeOfDay}
          sunLightRef={sunLightRef}
          hemiLightRef={hemiLightRef}
        />

        {/* Parallax window views inside the carriage */}
        <ParallaxWindows theme={theme} />

        {/* Carriage interior */}
        <CarriageInterior line={line} />
        <RemotePlayers />
      </Suspense>

      <InteriorController />
      <PerformanceOverlay />
    </>
  )
}

function CarriagePlaceholder() {
  return (
    <group>
      <ambientLight intensity={0.18} color="#ffd699" />
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 8]} />
        <meshStandardMaterial color="#3a2a1a" side={2} />
      </mesh>
    </group>
  )
}
