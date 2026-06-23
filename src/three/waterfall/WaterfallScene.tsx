import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import type { Material, Mesh, Texture } from 'three'

import { useScenePreset } from '../../store/quality'
import { WaterfallSky } from './WaterfallSky'
import { Terrain } from './Terrain'
import { Cliffs } from './Cliffs'
import { Waterfall } from './Waterfall'
import { Lake } from './Lake'
import { Bridges } from './Bridges'
import { Camps } from './Camps'
import { StudyDecks } from './StudyDecks'
import { FocusLily } from './FocusLily'
import { Vegetation } from './Vegetation'
import { Watchtower } from './Watchtower'
import { Wildlife } from './Wildlife'
import { PlayerController } from './PlayerController'

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
 * The Waterfall Realm composer — FocusLily's daytime nature flagship. Mirrors the
 * Library's LibraryScene: a Canvas with an auto-resolution governor, live
 * quality/texture sync and a bloom+vignette post pass, scaling the whole scene
 * (cliffs, hero falls, lake, camps, vegetation, wildlife) to the chosen graphics
 * budget. Reflections on the lake only switch on at High.
 */
export function WaterfallScene({ onReady }: { onReady?: () => void }) {
  const preset = useScenePreset()
  const [dpr, setDpr] = useState(preset.dpr)
  useEffect(() => setDpr(preset.dpr), [preset.dpr])
  const dprFloor = 0.6

  const high = preset.shadowMap >= 2048
  const segments = preset.forest >= 150 ? 160 : preset.forest >= 70 ? 128 : 96

  return (
    <Canvas
      shadows={preset.shadows ? 'soft' : false}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 4, 60], fov: 72, near: 0.08, far: preset.far }}
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
          <WaterfallSky shadows={preset.shadows} fog={preset.fog} clouds={preset.clouds} shadowMap={preset.shadowMap} />
          <Terrain segments={segments} />
          <Cliffs boulders={Math.round(preset.forest * 0.8)} />
          <Waterfall mist={preset.particles ? 1 : 0.4} spray={preset.dust > 30 ? 1 : 0.5} />
          <Lake reflections={high} />
          <Bridges />
          <Camps fireLights={preset.treeLight} embers={preset.particles} />
          <StudyDecks />
          <FocusLily glow={preset.bloom} />
          <Vegetation count={preset.forest} />
          <Wildlife
            birds={preset.dust > 0 ? (preset.dust > 30 ? 16 : 8) : 0}
            butterflies={preset.dust > 0 ? (preset.dust > 30 ? 28 : 14) : 0}
          />
        </Suspense>
      </SoftBoundary>

      <PlayerController />

      {preset.bloom && (
        <EffectComposer enableNormalPass={false} multisampling={0}>
          {/* gentle bloom: high threshold so only true highlights (sun, foam, pistil)
              glow softly — no nuclear bloom washing out the falls */}
          <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={0.3} kernelSize={KernelSize.SMALL} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  )
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
