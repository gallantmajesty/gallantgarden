import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  EffectComposer,
  HueSaturation,
  Vignette,
  Bloom,
  N8AO,
  BrightnessContrast,
  DepthOfField,
} from '@react-three/postprocessing'
import {
  CafeAvatarCull,
  CafeCanvasBoundary,
  CafeHeartbeat,
  CafeShadowFreeze,
  CafeTextureSync,
  CafeWatchdog,
} from './quality'
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
  const ultra = tier === 'high'
  const cameraMode = useSettings((state) => state.cameraMode)
  const gl = useThree((state) => state.gl)
  const [glRestored, setGlRestored] = useState(0)

  // A GPU context loss (driver switch, resource pressure, backgrounding) wipes
  // the WebGL state. Rebuild the composer after restore so the passes re-link
  // instead of rendering a black/broken frame. preventDefault stops the browser's
  // "Aw, snap" overlay.
  useEffect(() => {
    const el = gl.domElement
    const onRestored = () => setGlRestored((n) => n + 1)
    const onLost = (e: Event) => e.preventDefault()
    el.addEventListener('webglcontextlost', onLost as EventListener)
    el.addEventListener('webglcontextrestored', onRestored)
    return () => {
      el.removeEventListener('webglcontextlost', onLost as EventListener)
      el.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl])

  if (tier === 'off') return null
  return (
    <EffectComposer key={glRestored} multisampling={ultra ? 4 : 2}>
      {/* Ambient occlusion — the biggest "flat vs premium" factor. Cheap at
          halfRes low quality, gated to the High tier. */}
      {ultra && <N8AO aoRadius={1.0} distanceFalloff={1.2} intensity={1.6} quality="low" halfRes aoSamples={16} />}
      {/* The café is a night realm: its lanterns, jade pond glow and fountain are
          emissive, so always-on bloom is what makes the whole hall glow. */}
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.26} luminanceSmoothing={0.4} radius={0.72} />
      {/* First-person cinematic depth — the room becomes softly layered when you
          sit and look out. Skipped in third-person so your own avatar stays sharp. */}
      {ultra && cameraMode === 'first' && (
        <DepthOfField focusDistance={0.02} focalLength={0.18} bokehScale={2.0} height={480} />
      )}
      {/* Filmic grade on High — lifts the warm lantern light and adds contrast. */}
      {ultra && <BrightnessContrast brightness={0.02} contrast={0.12} />}
      <HueSaturation saturation={-0.04} hue={0} />
      <Vignette eskil={false} offset={0.2} darkness={0.5} />
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
  // Bumped by CafeWatchdog when the render loop freezes — remounts the Canvas so
  // the frozen frame recovers instead of staying stuck behind the DOM.
  const [canvasKey, setCanvasKey] = useState(0)
  const paused = Boolean(socialOpen || renderPaused || (pauseWhenHidden && hidden))

  return (
    <>
      <CafeWatchdog active={!paused} onStall={() => setCanvasKey((k) => k + 1)} />
      <Canvas
        key={canvasKey}
        events={createNullSafeEvents}
        frameloop={paused ? 'never' : 'always'}
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
        <CafeTextureSync anisotropy={8} />
        <CafeAvatarCull />
        <CafeShadowFreeze enabled={preset.shadows} />
        <CafeHeartbeat />
        <CafeCanvasBoundary>
          <CafePostEffects />
        </CafeCanvasBoundary>
        <SceneReady onReady={onReady} />
        <RendererHeartbeat />
        <CafeRainMute />
      </Canvas>
    </>
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
