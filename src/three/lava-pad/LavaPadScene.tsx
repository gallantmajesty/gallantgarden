// Lava Pad Scene — Canvas wrapper with lighting, atmosphere, and composition

import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor, Sky, Cloud, Stars } from '@react-three/drei'
import { useScenePreset } from '../../store/quality'
import { usePomodoro } from '../../store/pomodoro'
import { createNullSafeEvents } from '../safeEvents'
import { ARENA_CONFIG } from './arena'
import { PlatformRenderer } from './PlatformRenderer'
import { LavaController } from './LavaController'
import { LavaPadPlayerController } from './LavaPadPlayerController'
import { ConnectionLines } from './ConnectionLines'
import { LavaPadCamera } from './LavaPadCamera'
import { HoverIndicator } from './HoverIndicator'
import { EliminationEffect } from './EliminationEffect'
import { SoundEffects } from './SoundEffects'
import { MatchManager } from './MatchManager'
import { SpectatorMode } from './SpectatorMode'
import { SessionManager } from './SessionManager'
import { LavaPadNetworking } from './LavaPadNetworking'
import { useLavaPadStore } from './store'
import { useSessionStore } from './sessionStore'

const DPR_FLOOR = 0.85

function Environment() {
  const preset = useScenePreset()
  return (
    <>
      <ambientLight intensity={0.3} color="#6b5b8a" />
      <hemisphereLight args={['#8b7faa', '#1a1230', 0.6]} />
      <directionalLight
        position={[30, 40, 20]}
        intensity={0.8}
        color="#ffd4a8"
        castShadow={preset.shadows}
        shadow-mapSize-width={preset.shadowMap}
        shadow-mapSize-height={preset.shadowMap}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-20, 30, -20]} intensity={0.3} color="#4466aa" />
    </>
  )
}

function Atmosphere() {
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[30, 20, 30]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={8}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={200} depth={50} count={500} factor={4} saturation={0} fade speed={0.5} />
      <Cloud position={[-20, 15, -30]} scale={10} opacity={0.4} />
      <Cloud position={[15, 12, -20]} scale={8} opacity={0.3} />
      <Cloud position={[0, 18, 25]} scale={12} opacity={0.35} />
      <fog attach="fog" args={['#1a1230', 35, 70]} />
    </>
  )
}

function LavaGlow() {
  const meshRef = useRef<THREE.PointLight>(null)
  useFrame(() => {
    if (!meshRef.current) return
    const intensity = 0.6 + Math.sin(Date.now() * 0.001) * 0.15
    meshRef.current.intensity = intensity
  })
  return <pointLight ref={meshRef} position={[0, -8, 0]} distance={50} intensity={0.6} color="#ff6a20" />
}

export function LavaPadScene({ onReady }: { onReady?: () => void }) {
  const preset = useScenePreset()
  const [dpr, setDpr] = useState(preset.dpr)
  const [govReady, setGovReady] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setDpr((prev) => prev === preset.dpr ? prev : preset.dpr)
    }, 0)
  }, [preset.dpr])
  useEffect(() => {
    const t = setTimeout(() => setGovReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const store = useLavaPadStore.getState()
    if (store.phase === 'waiting') {
      const { playMode } = useSessionStore.getState()
      if (playMode === 'single') {
        store.setPhase('countdown')
        store.setCountdown(ARENA_CONFIG.match.countdownDuration)
      } else {
        store.setPhase('playersJoining')
        store.setCountdown(ARENA_CONFIG.match.countdownDuration)
      }
    }
  }, [])

  return (
    <Canvas
      events={createNullSafeEvents}
      shadows={preset.shadows ? 'soft' : false}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 10, 15], fov: 68, near: 0.1, far: preset.far }}
    >
      {govReady && (
        <PerformanceMonitor
          bounds={(rate) => (rate > 90 ? [55, 90] : [35, 58])}
          flipflops={1}
          factor={1}
          onChange={({ factor }) => setDpr(Math.round((DPR_FLOOR + (preset.dpr - DPR_FLOOR) * factor) * 100) / 100)}
          onFallback={() => setDpr(DPR_FLOOR)}
        />
      )}

      <Environment />
      <Atmosphere />
      <LavaGlow />

      <PlatformRenderer />
      <LavaController />
      <ConnectionLines />
      <HoverIndicator />
      <LavaPadPlayerController />
      <EliminationEffect />
      <LavaPadCamera />
      <SpectatorMode />
      <MatchManager />
      <SessionManager />
      <LavaPadNetworking onReady={onReady} />
      <SoundEffects />
      <BreakWatcher />
    </Canvas>
  )
}

/** Monitors pomodoro break state and auto-finishes match when break ends. */
function BreakWatcher() {
  const phase = useLavaPadStore((s) => s.phase)
  const setPhase = useLavaPadStore((s) => s.setPhase)

  useEffect(() => {
    if (phase !== 'playing') return
    const unsub = usePomodoro.subscribe((pomo) => {
      if (pomo.phase === 'running' && phase === 'playing') {
        setPhase('finished')
      }
    })
    return () => unsub()
  }, [phase])

  return null
}
