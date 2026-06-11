import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'

import { HALL } from './layout'
import { LibraryShell } from './LibraryShell'
import { Bookshelves } from './Bookshelf'
import { StudyTables } from './StudyTable'
import { Decor } from './Decor'
import { Lanterns } from './Lanterns'
import { KnowledgeTree } from './KnowledgeTree'
import { Exterior } from './Exterior'
import { DayNightWeather } from './DayNightWeather'
import { PlayerController } from './PlayerController'
import { QUALITY_PRESET, type Quality } from '../../store/settings'
import { useSettings } from '../../store/settings'

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
 * The International Realm great library. Composes the architecture, centrepiece
 * tree, furniture, exterior world, day/night + weather, player controller and
 * post-processing — scaling all of it to the chosen graphics quality.
 */
export function LibraryScene({ onReady }: { onReady?: () => void }) {
  const quality = useSettings((s) => s.quality)
  const cinematic = useSettings((s) => s.cinematic)
  const preset = QUALITY_PRESET[quality]

  // Runtime device-pixel-ratio. Starts at the quality ceiling and is auto-scaled
  // DOWN by the PerformanceMonitor below when the GPU can't keep up (and back up
  // when it has headroom). This is the single most reliable FPS lever on weak
  // laptops — the same scene rendered at fewer pixels. Reset to the ceiling
  // whenever the Quality setting changes.
  const [dpr, setDpr] = useState(preset.dpr)
  useEffect(() => setDpr(preset.dpr), [preset.dpr])
  const dprFloor = 0.6

  return (
    <Canvas
      shadows={preset.shadows ? 'soft' : false}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={() => onReady?.()}
    >
      {/* Auto-resolution governor: when the frame rate drops below the healthy
          band we shed pixels; when it recovers we add them back. Keeps motion
          smooth on integrated GPUs instead of locking at a fixed heavy DPR. */}
      <PerformanceMonitor
        bounds={(rate) => (rate > 90 ? [55, 90] : [35, 58])}
        flipflops={3}
        factor={1}
        onChange={({ factor }) => setDpr(Math.round((dprFloor + (preset.dpr - dprFloor) * factor) * 100) / 100)}
        onFallback={() => setDpr(dprFloor)}
      />

      <QualitySync quality={quality} shadows={preset.shadows} />

      <SoftBoundary>
        <Suspense fallback={null}>
          <DayNightWeather quality={quality} cinematic={cinematic} rainScale={preset.rainScale} shadowMap={preset.shadowMap} rainDrops={preset.rainDrops} />
          <Exterior count={preset.forest} mountains={preset.mountains} clouds={preset.clouds} />
        </Suspense>
      </SoftBoundary>

      {/* warm interior fill so the hall is always cosily lit — never pitch-black
          at night — while the lanterns add the real pools of light */}
      <ambientLight intensity={0.44} color="#ffd9a8" />

      <LibraryShell />
      <Bookshelves />
      <StudyTables />
      <Decor />
      <Lanterns />
      <KnowledgeTree />

      {preset.dust > 0 && (
        <Sparkles count={preset.dust} scale={[HALL.halfW * 2, HALL.wallH, HALL.halfL * 2]} position={[0, HALL.wallH / 2, 0]} size={2.6} speed={0.16} color="#ffe6b0" opacity={0.5} />
      )}

      <PlayerController />
      <PerfLogger />

      {cinematic && preset.bloom && (
        // multisampling 0 disables the composer's expensive MSAA pass; the small
        // mipmap bloom kernel keeps the lantern/window glow at a fraction of the
        // cost of the previous full-resolution bloom.
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.3} intensity={0.5} kernelSize={KernelSize.SMALL} mipmapBlur />
          <Vignette eskil={false} offset={0.14} darkness={0.85} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

/** Applies graphics-quality changes that the WebGL renderer won't pick up from a
 *  React prop on its own — chiefly toggling the shadow map on/off live so the
 *  "Quality" setting visibly updates the scene without a reload. */
function QualitySync({ quality, shadows }: { quality: Quality; shadows: boolean }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.shadowMap.enabled = shadows
    gl.shadowMap.needsUpdate = true
  }, [gl, shadows, quality])
  return null
}

/**
 * Render-statistics logger. Samples the WebGL renderer's `info` (draw calls,
 * triangles, active programs) plus a rolling FPS average and prints a concise
 * summary to the console — once ~2 s after the scene warms up, and then every
 * 5 s while the on-screen FPS counter is enabled. This is how we measured the
 * before/after of the optimization pass.
 */
function PerfLogger() {
  const gl = useThree((s) => s.gl)
  const acc = useRef({ frames: 0, time: 0, logged: false, since: 0 })

  useFrame((_, dt) => {
    const a = acc.current
    a.frames++
    a.time += dt
    a.since += dt
    if (a.since < (a.logged ? 5 : 2)) return
    const fps = a.frames / a.since
    const r = gl.info.render
    const m = gl.info.memory
    console.info(
      `[StudyGarden perf] ${fps.toFixed(0)} fps · ${r.calls} draw calls · ${(r.triangles / 1000).toFixed(0)}k tris · ${gl.info.programs?.length ?? 0} programs · geo ${m.geometries} · tex ${m.textures}`,
    )
    a.frames = 0
    a.since = 0
    a.logged = true
  })

  return null
}
