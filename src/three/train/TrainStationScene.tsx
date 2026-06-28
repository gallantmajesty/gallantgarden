import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import type { Material, Mesh, Texture } from 'three'

import { useScenePreset } from '../../store/quality'
import { useTrain } from '../../store/train'
import { useAuth } from '../../store/auth'
import { StationWorld } from './StationWorld'
import { TrainRide } from './TrainRide'

class SoftBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The Train Station Realm composer — FocusLily's third flagship world. Like the
 * Library/Waterfall scenes it owns a single Canvas with an auto-resolution
 * governor, live quality/texture sync and a warm bloom+vignette post pass. What's
 * unique: it renders ONE of two worlds depending on the player's journey phase —
 * the walkable Station (browsing/boarding) or the moving TrainRide (traveling/
 * arrived) — swapping the whole scene (and its camera) when you board or arrive.
 *
 * A non-visual <TrainJourneyRuntime/> rides alongside the Canvas to restore an
 * in-flight journey on entry, tick the journey clock once a second, and snapshot
 * state when the tab sleeps — so a journey survives reloads and completes even if
 * the train arrived while you were away.
 */
export function TrainStationScene({ onReady }: { onReady?: () => void }) {
  const preset = useScenePreset()
  const [dpr, setDpr] = useState(preset.dpr)
  useEffect(() => setDpr(preset.dpr), [preset.dpr])
  const dprFloor = 0.75

  const phase = useTrain((s) => s.phase)
  const aboard = phase === 'traveling' || phase === 'arrived'

  return (
    <>
      <TrainJourneyRuntime />
      <Canvas
        shadows={preset.shadows ? 'soft' : false}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.6, -34], fov: 72, near: 0.08, far: preset.far }}
        onCreated={() => onReady?.()}
      >
        <PerformanceMonitor
          bounds={(rate) => (rate > 90 ? [55, 90] : [35, 58])}
          flipflops={3}
          factor={1}
          onChange={({ factor }) => setDpr(Math.round((dprFloor + (preset.dpr - dprFloor) * factor) * 100) / 100)}
          onFallback={() => setDpr(dprFloor)}
        />

        <QualitySync shadows={preset.shadows} />
        <TextureQualitySync anisotropy={preset.anisotropy} />

        <SoftBoundary>
          <Suspense fallback={null}>
            {aboard ? <TrainRide preset={preset} /> : <StationWorld preset={preset} />}
          </Suspense>
        </SoftBoundary>

        {preset.bloom && (
          <EffectComposer enableNormalPass={false} multisampling={0}>
            {/* warm gas-lamp bloom: high threshold so only lanterns, signage and
                window-glow blossom — the cosy terminus highlight, never a wash */}
            <Bloom luminanceThreshold={0.88} luminanceSmoothing={0.4} intensity={0.32} kernelSize={KernelSize.SMALL} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.62} />
          </EffectComposer>
        )}
      </Canvas>
    </>
  )
}

/**
 * Non-visual journey lifecycle. Mounted once with the scene:
 *   • on entry — restore any in-flight/finished-while-away journey from disk+server
 *   • every second — advance the journey clock (accrues focus, fires arrival)
 *   • on tab sleep/close — snapshot so a hard exit leaves an accurate resume point
 * The 1 Hz tick is the journey's heartbeat; the in-canvas frame loop is purely
 * visual, so the clock keeps perfect time even when the tab is backgrounded.
 */
function TrainJourneyRuntime() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    void useTrain.getState().restore(userId)
  }, [userId])

  useEffect(() => {
    const id = window.setInterval(() => useTrain.getState().tick(), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const snapshot = () => {
      if (document.visibilityState === 'hidden') useTrain.getState().markSleep(Date.now())
    }
    document.addEventListener('visibilitychange', snapshot)
    window.addEventListener('pagehide', snapshot)
    return () => {
      document.removeEventListener('visibilitychange', snapshot)
      window.removeEventListener('pagehide', snapshot)
    }
  }, [])

  return null
}

/** Toggle the shadow map live so the Quality setting updates without a reload. */
function QualitySync({ shadows }: { shadows: boolean }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.shadowMap.enabled = shadows
    gl.shadowMap.needsUpdate = true
  }, [gl, shadows])
  return null
}

/** Re-apply anisotropic filtering to every texture when the axis changes. */
const TEX_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const
function TextureQualitySync({ anisotropy }: { anisotropy: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy()
    const a = Math.min(anisotropy, max)
    scene.traverse((o) => {
      const mat = (o as Mesh).material as Material | Material[] | undefined
      if (!mat) return
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        for (const key of TEX_KEYS) {
          const tex = (m as unknown as Record<string, Texture | null>)[key]
          if (tex && tex.isTexture && tex.anisotropy !== a) {
            tex.anisotropy = a
            tex.needsUpdate = true
          }
        }
      }
    })
  }, [anisotropy, gl, scene])
  return null
}
