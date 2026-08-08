import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import type { Material, Mesh, Texture } from 'three'
import { createNullSafeEvents } from '../safeEvents'

import { useScenePreset } from '../../store/quality'
import { useTrain } from '../../store/train'
import { useAuth } from '../../store/auth'
import { StationWorld } from './StationWorld'
import { TrainRide } from './TrainRide'
import { useSocialOverlay } from '../../features/social/store'

class SoftBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError(err: unknown) {
    console.error('[SoftBoundary]', err)
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function TrainStationScene({ onReady }: { onReady?: () => void }) {
  const preset = useScenePreset()
  const socialOpen = useSocialOverlay((s) => s.open)

  const handleReady = () => {
    onReady?.()
  }

  const phase = useTrain((s) => s.phase)
  const aboard = phase === 'traveling' || phase === 'arriving' || phase === 'arrived'

  return (
    <>
      <TrainJourneyRuntime />
      <Canvas
        events={createNullSafeEvents}
        frameloop={socialOpen ? 'never' : 'always'}
        shadows={preset.shadows ? 'soft' : false}
        dpr={preset.dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.6, -34], fov: 72, near: 0.08, far: preset.far }}
      >
        <color attach="background" args={['#1a1209']} />
        <fog attach="fog" args={['#1a1209', 40, preset.far]} />

        <QualitySync shadows={preset.shadows} />
        <TextureQualitySync anisotropy={preset.anisotropy} />

        <SoftBoundary>
          <Suspense fallback={<TransitionBackdrop />}>
            {aboard ? <TrainRide preset={preset} /> : <StationWorld preset={preset} />}
            <SceneReady onReady={handleReady} />
          </Suspense>
        </SoftBoundary>

        {preset.bloom && (
          <EffectComposer enableNormalPass={false} multisampling={0}>
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
    const wake = () => {
      if (document.visibilityState === 'visible') useTrain.getState().markWake(Date.now())
    }
    document.addEventListener('visibilitychange', snapshot)
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('pagehide', snapshot)
    return () => {
      document.removeEventListener('visibilitychange', snapshot)
      document.removeEventListener('visibilitychange', wake)
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

function SceneReady({ onReady }: { onReady?: () => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onReady?.() }, [])
  return null
}

function TransitionBackdrop() {
  return (
    <group>
      <ambientLight intensity={0.15} color="#ffd699" />
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 8]} />
        <meshStandardMaterial color="#3a2a1a" side={2} />
      </mesh>
    </group>
  )
}
