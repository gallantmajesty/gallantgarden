import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, HueSaturation, Vignette, Bloom } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { useSocialOverlay } from '../../features/social/store'
import { useScenePreset } from '../../store/quality'
import { useSettings } from '../../store/settings'
import { useWorld } from '../../store/world'
import { createNullSafeEvents } from '../safeEvents'
import { RemotePlayers } from '../library/RemotePlayers'
import { ChineseCafeArchitecture } from './ChineseCafeArchitecture'
import { ChineseCafeAtmosphere } from './ChineseCafeAtmosphere'
import { ChineseCafeCourtyard } from './ChineseCafeCourtyard'
import { ChineseCafeFurniture } from './ChineseCafeFurniture'
import { ChineseCafePlayerController } from './ChineseCafePlayerController'
import { ChineseCafeTableAccessories } from './ChineseCafeTableAccessories'

function SceneReady({ onReady }: { onReady?: () => void }) {
  const called = useRef(false)
  const frames = useRef(0)
  const { gl, scene, camera } = useThree()
  useFrame(() => {
    if (called.current) return
    frames.current += 1
    if (frames.current < 24) return
    try { gl.compile(scene, camera) } catch { /* renderer may still be warming */ }
    called.current = true
    onReady?.()
  })
  return null
}

function RendererHeartbeat() {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') invalidate()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(invalidate, 1200)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [invalidate])
  return null
}

function CafePostEffects() {
  const tier = useSettings((state) => state.postProcessing)
  if (tier === 'off') return null
  return (
    <EffectComposer multisampling={0}>
      {/* The café is a night realm — its lanterns, fireflies, jade pond glow and
          stone-lantern window are all emissive, so an always-on bloom is what
          makes the whole hall glow. A low threshold keeps the warm glow visible
          over the whole scene; mipmapBlur keeps the pass cheap. */}
      <Bloom mipmapBlur intensity={1.25} luminanceThreshold={0.28} luminanceSmoothing={0.35} radius={0.7} />
      <HueSaturation saturation={-0.04} hue={0} />
      <Vignette eskil={false} offset={0.18} darkness={0.45} />
    </EffectComposer>
  )
}

/** The café is a night realm with its own soundscape — the library's looping
 *  rain recording is muted while this scene is mounted, then restored on exit. */
function CafeRainMute() {
  useEffect(() => {
    const s = useSettings.getState()
    const prev = s.rainOn
    if (prev) s.set('rainOn', false)
    return () => {
      if (prev) useSettings.getState().set('rainOn', true)
    }
  }, [])
  return null
}

export function ChineseCafeScene({ onReady }: { onReady?: () => void }) {
  const preset = useScenePreset()
  const socialOpen = useSocialOverlay((state) => state.open)
  const renderPaused = useWorld((state) => state.renderPaused)
  const pauseWhenHidden = useSettings((state) => state.pauseWhenHidden)
  const hidden = useHiddenTab()

  return (
    <Canvas
      events={createNullSafeEvents}
      frameloop={socialOpen || renderPaused || (pauseWhenHidden && hidden) ? 'never' : 'always'}
      shadows={preset.shadows ? 'soft' : false}
      dpr={preset.dpr}
      camera={{ position: [0, 2.2, 20], fov: 63, near: 0.08, far: Math.min(180, preset.far) }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <color attach="background" args={['#101b1d']} />
      <ChineseCafeAtmosphere />
      <ChineseCafeArchitecture />
      <ChineseCafeCourtyard />
      <ChineseCafeFurniture />
      <ChineseCafeTableAccessories />
      <ChineseCafePlayerController />
      <RemotePlayers />
      <CafePostEffects />
      <SceneReady onReady={onReady} />
      <RendererHeartbeat />
      <CafeRainMute />
    </Canvas>
  )
}

function useHiddenTab(): boolean {
  const [hidden, setHidden] = useState(
    typeof document !== 'undefined' && document.visibilityState === 'hidden',
  )
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    update()
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}
