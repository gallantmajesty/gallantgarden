// @ts-nocheck
import { Component, useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, N8AO, GodRays } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import type { Material, Mesh, Object3D, Texture } from 'three'
import { useScenePreset } from '../../store/quality'

import { HALL } from './layout'
import { LibraryShell } from './LibraryShell'
import { Bookshelves } from './Bookshelf'
import { StudyTables } from './StudyTable'
import { Decor } from './Decor'
import { Lanterns } from './Lanterns'
import { KnowledgeTree } from './KnowledgeTree'
import { Fireflies } from './Fireflies'
import { Aurora } from './Aurora'
import { FloatingBooks } from './FloatingBooks'
import { Exterior } from './Exterior'
import { DayNightWeather } from './DayNightWeather'

import { SimpleCamera } from './SimpleCamera'
import { CameraStatusIndicator } from '../../components/library/CameraStatusIndicator'
import './cameraSystem.css'
import { DebugProbe, DebugHud } from './DebugOverlay'

class SoftBoundary extends Component<{ children: ReactNode }, { failed: boolean; msg: string }> {
  state = { failed: false, msg: '' }
  static getDerivedStateFromError(error: Error) {
    return { failed: true, msg: error?.message ?? 'Unknown error' }
  }
  componentDidCatch(error: Error) {
    console.error('[LibraryScene] SoftBoundary caught:', error)
  }
  render() {
    if (this.state.failed) {
      return (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, padding: '6px 12px',
          background: 'rgba(0,0,0,0.7)', color: '#ff8a6a', fontSize: 11,
          borderRadius: 6, fontFamily: 'monospace', zIndex: 10, maxWidth: 320,
        }}>
          Scene element failed: {this.state.msg}
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * The International Realm great library. Composes the architecture, centrepiece
 * tree, furniture, exterior world, day/night + weather, player controller and
 * post-processing — scaling all of it to the chosen graphics quality.
 */
export function LibraryScene({ onReady }: { onReady?: () => void }) {
  // The merged quality budget (user's six axes + transient Ctrl+F perf override).
  const preset = useScenePreset()

  // The sun disc mesh feeds the Ultra GodRays effect. It lives in DayNightWeather;
  // we hold a ref to it here and only mount GodRays once the mesh exists.
  const sunRef = useRef<Mesh | null>(null)
  const [sunReady, setSunReady] = useState(false)

  // Runtime device-pixel-ratio. Fixed at the quality ceiling — no dynamic
  // scaling to avoid the single-frame black blink that DPR resizes cause.
  const [dpr, setDpr] = useState(preset.dpr)
  useEffect(() => setDpr(preset.dpr), [preset.dpr])

  return (
    <>
      <Canvas
        shadows={preset.shadows ? 'soft' : false}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 5, 10], fov: 60 }}
      >
        <color attach="background" args={['#0c0a0a']} />
        <SimpleCamera />
        <DebugProbe />

        <SoftBoundary>
          <DayNightWeather fog={preset.fog} rainScale={preset.rainScale} shadowMap={preset.shadowMap} rainDrops={preset.rainDrops} sunRef={sunRef} onSunReady={() => setSunReady(true)} />
          <Exterior count={preset.forest} mountains={preset.mountains} clouds={preset.clouds} />
        </SoftBoundary>

        {/* warm interior fill so the hall is always cosily lit — the lanterns add
            the real pools of golden light against the dark night outside */}
        <ambientLight intensity={0.38} color="#ffd9a8" />

        <SoftBoundary>
          <LibraryShell />
          <Bookshelves />
          <StudyTables />
          <Decor />
          <KnowledgeTree />
        </SoftBoundary>

        <Lanterns />

        {/* Magical layer — all instanced/particle/shader, zero extra real lights and
            zero full-screen passes. Gated by the same particle/detail budget so they
            shed on low-end settings and Performance Mode. */}
        {preset.particles && <Fireflies count={Math.round(12 + preset.dust * 0.8)} />}
        {preset.particles && <Aurora />}
        {preset.lodBias < 1 && <FloatingBooks count={preset.lodBias < 0.5 ? 8 : 5} />}
        {preset.dust > 0 && (
          <Sparkles count={preset.dust} scale={[HALL.halfW * 2, HALL.wallH, HALL.halfL * 2]} position={[0, HALL.wallH / 2, 0]} size={1.5} speed={0.12} color="#ffe6b0" opacity={0.35} />
        )}

        {preset.particles && (
          <SeasonalOverlay enabled={preset.particles} particleMultiplier={preset.lodBias < 1 ? 0.8 : 1} />
        )}

        <RemotePlayers />

        {/* Standard post tier (default): cheap mipmap bloom + vignette. multisampling
            0 disables the composer's expensive MSAA pass. */}
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.4} intensity={0.4} kernelSize={KernelSize.SMALL} mipmapBlur />
          <Vignette eskil={false} offset={0.16} darkness={0.8} />
        </EffectComposer>

        {/* Ultra post tier (opt-in, off by default): adds N8 ambient occlusion for
            corner depth, god-ray shafts from the sun, and (first-person only) a
            shallow depth-of-field. Heavier full-screen passes — for strong GPUs that
            accept lower FPS. Bloom + vignette stay. The effects are assembled as a
            filtered array because EffectComposer's children type rejects `false`. */}
        {preset.ultra && (
          <EffectComposer enableNormalPass={false} multisampling={2}>
            {[
              <N8AO key="ao" aoRadius={1.2} distanceFalloff={1} intensity={1.8} quality="medium" halfRes />,
              <Bloom key="bloom" luminanceThreshold={0.75} luminanceSmoothing={0.4} intensity={0.5} kernelSize={KernelSize.MEDIUM} mipmapBlur />,
              sunReady ? (
                <GodRays key="god" sun={sunRef as unknown as RefObject<Mesh>} samples={50} density={0.9} decay={0.9} weight={0.35} exposure={0.45} clampMax={1} />
              ) : null,
              <Vignette key="vig" eskil={false} offset={0.16} darkness={0.8} />,
            ].filter(Boolean) as ReactElement[]}
          </EffectComposer>
        )}
      </Canvas>
      <DebugHud />
      <CameraStatusIndicator />
    </>
  )
}