// @ts-nocheck
import { Component, Suspense, useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, N8AO, GodRays } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import type { Material, Mesh, Object3D, Texture } from 'three'
import { useSettings } from '../../store/settings'
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
import { PlayerController } from './PlayerController'
import { RemotePlayers } from './RemotePlayers'
import { SeasonalOverlay } from './SeasonalOverlay'

class SoftBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    console.error('[LibraryScene] SoftBoundary caught:', error)
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
  // The merged quality budget (user's six axes + transient Ctrl+F perf override).
  const preset = useScenePreset()
  // First-person only for the Ultra depth-of-field (blurring the avatar in
  // third-person looks wrong).
  const cameraMode = useSettings((s) => s.cameraMode)

  // The sun disc mesh feeds the Ultra GodRays effect. It lives in DayNightWeather;
  // we hold a ref to it here and only mount GodRays once the mesh exists.
  const sunRef = useRef<Mesh | null>(null)
  const [sunReady, setSunReady] = useState(false)

  // Runtime device-pixel-ratio. Starts at the quality ceiling and is auto-scaled
  // DOWN by the PerformanceMonitor below when the GPU can't keep up (and back up
  // when it has headroom). This is the single most reliable FPS lever on weak
  // laptops — the same scene rendered at fewer pixels. Reset to the ceiling
  // whenever the Quality setting changes.
  const [dpr, setDpr] = useState(preset.dpr)
  useEffect(() => setDpr(preset.dpr), [preset.dpr])

  // DPR floor: the PerformanceMonitor may drop to this when the GPU struggles.
  // Now that the per-frame cost is much lower (≈5 forward lights instead of ~13,
  // dpr ceiling 1.5, far less overdraw), the governor rarely needs to shed pixels —
  // so the floor is raised back to 0.85. This is the direct fix for the
  // "sharp at first, then blurry a few seconds in" report: the scene stays crisp
  // because it no longer collapses to a soft 0.6 under transient load.
  const dprFloor = 0.85

  // Warm-up gate. The first few seconds after entering the realm are dominated
  // by one-time stalls (Suspense asset loads, shader/program compilation,
  // texture uploads, EffectComposer warm-up). Those frame-time spikes look like
  // a struggling GPU to the PerformanceMonitor, so if it samples during that
  // window it permanently sheds pixels right as the scene is about to settle —
  // the "sharp at first, then blurry a few seconds in" bug. 5 s is enough to
  // cover the typical Suspense waterfall + shader compile without leaving the
  // governor blind for too long. (Was 8 s — the extra 3 s gave no benefit.)
  const [govReady, setGovReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGovReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
    <Canvas
      shadows={preset.shadows ? 'soft' : false}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.7, 8], fov: 68, near: 0.08, far: preset.far }}
    >
      {/* Auto-resolution governor: when the frame rate drops below the healthy
          band we shed pixels; when it recovers we add them back. Keeps motion
          smooth on integrated GPUs instead of locking at a fixed heavy DPR.
          Mounted only after the warm-up window so transient load-time stalls
          can't trigger a permanent downscale.
          DPR floor is 0.6 (down from 0.85) giving the governor real headroom
          to actually help weak GPUs — the main fix for the 1–10 FPS issue. */}
      {govReady && (
        <PerformanceMonitor
          bounds={(rate) => (rate > 90 ? [55, 90] : [35, 58])}
          flipflops={1}
          factor={1}
          onChange={({ factor }) => setDpr(Math.round((dprFloor + (preset.dpr - dprFloor) * factor) * 100) / 100)}
          onFallback={() => setDpr(dprFloor)}
        />
      )}

      <QualitySync shadows={preset.shadows} />
      <ShadowThrottle enabled={preset.shadows} />
      <TextureQualitySync anisotropy={preset.anisotropy} />

      <SoftBoundary>
        <Suspense fallback={null}>
          <DayNightWeather shadows={preset.shadows} fog={preset.fog} rainScale={preset.rainScale} shadowMap={preset.shadowMap} rainDrops={preset.rainDrops} sunRef={sunRef} onSunReady={() => setSunReady(true)} />
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

      {/* Magical layer — all instanced/particle/shader, zero extra real lights and
          zero full-screen passes. Gated by the same particle/detail budget so they
          shed on low-end settings and Performance Mode. */}
      {preset.particles && <Fireflies count={Math.round(18 + preset.dust)} />}
      {preset.particles && <Aurora />}
      {preset.lodBias < 1 && <FloatingBooks count={preset.lodBias < 0.5 ? 8 : 5} />}

      {preset.dust > 0 && (
        // PERF: small, soft motes. Smaller size + lower opacity keeps the blended
        // overdraw down (these sprites span the whole hall volume); the count is
        // already capped at 24 in scenePreset().
        <Sparkles count={preset.dust} scale={[HALL.halfW * 2, HALL.wallH, HALL.halfL * 2]} position={[0, HALL.wallH / 2, 0]} size={1.8} speed={0.14} color="#ffe6b0" opacity={0.4} />
      )}

      {preset.particles && <SeasonalOverlay enabled={preset.particles} particleMultiplier={preset.lodBias < 1 ? 0.8 : 1} />}
      <PlayerController />
      <RemotePlayers />
      <PerfLogger />

      {/* Standard post tier (default): cheap mipmap bloom + vignette. multisampling
          0 disables the composer's expensive MSAA pass. */}
      {preset.bloom && !preset.ultra && (
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.3} intensity={0.5} kernelSize={KernelSize.SMALL} mipmapBlur />
          <Vignette eskil={false} offset={0.14} darkness={0.85} />
        </EffectComposer>
      )}

      {/* Ultra post tier (opt-in, off by default): adds N8 ambient occlusion for
          corner depth, god-ray shafts from the sun, and (first-person only) a
          shallow depth-of-field. Heavier full-screen passes — for strong GPUs that
          accept lower FPS. Bloom + vignette stay. The effects are assembled as a
          filtered array because EffectComposer's children type rejects `false`. */}
      {preset.ultra && (
        <EffectComposer enableNormalPass={false} multisampling={2}>
          {[
            <N8AO key="ao" aoRadius={1.4} distanceFalloff={1} intensity={2.2} quality="medium" halfRes />,
            <Bloom key="bloom" luminanceThreshold={0.7} luminanceSmoothing={0.3} intensity={0.6} kernelSize={KernelSize.MEDIUM} mipmapBlur />,
            sunReady ? (
              <GodRays key="god" sun={sunRef as unknown as RefObject<Mesh>} samples={60} density={0.92} decay={0.92} weight={0.4} exposure={0.5} clampMax={1} />
            ) : null,
            <Vignette key="vig" eskil={false} offset={0.14} darkness={0.85} />,
          ].filter(Boolean) as ReactElement[]}
        </EffectComposer>
      )}
    </Canvas>
    <SceneReady onReady={onReady} />
    </>
  )
}

/**
 * Shadow-map update governor — the single biggest *quality-preserving* GPU win.
 *
 * The hall casts ONE directional shadow over ~49 casters into a 1024² (or higher)
 * depth map. By default three re-renders that entire depth pass EVERY FRAME — and
 * because the day/night cycle nudges the sun a hair each frame, the renderer never
 * gets to skip it. That is a full extra ~49-object scene pass at 60 fps for shadows
 * that visibly change perhaps once a second.
 *
 * Fix: turn off automatic shadow updates and refresh the map only every Nth frame
 * (plus immediately whenever shadows are toggled). The sun moves ~0.0008 rad per
 * frame, so a refresh every 8 frames is visually identical while cutting the shadow
 * pass to ~1/8 of its cost. No resolution, sharpness or coverage is touched.
 */
const SHADOW_REFRESH_INTERVAL = 8
function ShadowThrottle({ enabled }: { enabled: boolean }) {
  const gl = useThree((s) => s.gl)
  const frame = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    // force a fresh render of the map right after (un)toggling shadows
    gl.shadowMap.needsUpdate = enabled
    return () => {
      // restore default behaviour if this scene unmounts
      gl.shadowMap.autoUpdate = true
    }
  }, [gl, enabled])
  useFrame(() => {
    if (!enabled) return
    frame.current = (frame.current + 1) % SHADOW_REFRESH_INTERVAL
    if (frame.current === 0) gl.shadowMap.needsUpdate = true
  })
  return null
}

/** Applies graphics-quality changes that the WebGL renderer won't pick up from a
 *  React prop on its own — chiefly toggling the shadow map on/off live so the
 *  "Quality" setting visibly updates the scene without a reload. */
function QualitySync({ shadows }: { shadows: boolean }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.shadowMap.enabled = shadows
    gl.shadowMap.needsUpdate = true
  }, [gl, shadows])
  return null
}

/**
 * Applies the Texture Quality axis live by re-setting anisotropic filtering on
 * every texture already in the scene. Textures are generated once (textures.ts)
 * with max anisotropy; lowering the axis trades a little grazing-angle sharpness
 * for fill-rate. Walks the graph on change only — never per frame. Clamped to the
 * GPU's reported maximum so a request of 16 is safe everywhere.
 */
const TEX_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const
function TextureQualitySync({ anisotropy }: { anisotropy: number }) {
  const gl    = useThree((s) => s.gl)
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

/**
 * Fires onReady once it mounts — which only happens after Suspense resolves
 * DayNightWeather + Exterior. This prevents the explore-veil from disappearing
 * while the scene is still partially black.
 */
function SceneReady({ onReady }: { onReady?: () => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onReady?.() }, [])
  return null
}

/**
 * Comprehensive render-statistics logger. Samples the WebGL renderer's `info`
 * plus a rolling FPS average and prints a detailed profile report to the console.
 *
 * Reports every ~2 s during the first 15 s (warm-up phase) and every 10 s after.
 * Covers the full audit checklist:
 *   FPS, draw calls, triangles, active programs (proxy for shader permutations),
 *   geometry count (proxy for non-instanced mesh count), texture memory,
 *   point / directional / spot light counts, shadow-casting objects, and the
 *   object count (active meshes in the graph).
 *
 * The report also ranks the most likely bottlenecks by frame cost so engineers
 * can read the console and know where to look without needing an external profiler.
 */
function PerfLogger() {
  const gl    = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const acc   = useRef({ frames: 0, time: 0, logged: false, since: 0, warmPhase: 0 })

  // TEMP perf-audit hook: expose the live renderer + scene graph so the external
  // profiler (probe.cjs) can compute exact triangle/draw/light counts directly,
  // bypassing the unreliable gl.info.render under the postprocessing composer.
  // Remove with the PerfHarness when the optimisation pass is done.
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__perfStore = { gl, scene }
  }, [gl, scene])

  useFrame((_, dt) => {
    const a = acc.current
    a.frames++
    a.time   += dt
    a.since  += dt
    a.warmPhase += dt

    // Report every 2 s for the first 15 s, then every 10 s
    const interval = a.warmPhase < 15 ? 2 : 10
    if (a.since < interval) return

    const fps = a.frames / a.since
    const r   = gl.info.render
    const m   = gl.info.memory

    // Count light types and shadow-casting objects by walking the scene graph.
    // This is done at report time (~every 10 s), not every frame.
    let pointLights = 0, dirLights = 0, spotLights = 0, shadowCasters = 0, meshCount = 0
    scene.traverse((o: Object3D) => {
      const type = o.type
      if (type === 'PointLight')       pointLights++
      else if (type === 'DirectionalLight') dirLights++
      else if (type === 'SpotLight')   spotLights++
      // @ts-expect-error three typing
      if (o.castShadow && (o.isMesh || o.isSkinnedMesh)) shadowCasters++
      // @ts-expect-error three typing
      if (o.isMesh || o.isSkinnedMesh) meshCount++
    })

    const totalLights = pointLights + dirLights + spotLights

    // ---- bottleneck ranking (heuristic, based on known WebGL costs) ----
    const bottlenecks: string[] = []
    if (r.calls > 200)     bottlenecks.push(`HIGH draw calls (${r.calls}) → merge/instance static props`)
    if (r.triangles > 400_000) bottlenecks.push(`HIGH tri count (${(r.triangles/1000).toFixed(0)}k) → LOD/cull distant meshes`)
    if (totalLights > 6)   bottlenecks.push(`MANY real-time lights (${totalLights}) → switch to emissive+bloom`)
    if (shadowCasters > 30) bottlenecks.push(`MANY shadow casters (${shadowCasters}) → disable castShadow on static props`)
    if (fps < 30 && meshCount > 500) bottlenecks.push(`HIGH mesh count (${meshCount}) w/ low FPS → static batching`)
    if (fps < 30 && m.textures > 80) bottlenecks.push(`HIGH texture count (${m.textures}) → atlas/reduce`)
    if (fps >= 45) bottlenecks.push('✓ FPS healthy — no urgent bottleneck detected')

    console.info(
      `[FocusLily perf] ${fps.toFixed(1)} fps` +
      ` | draws: ${r.calls}` +
      ` | tris: ${(r.triangles / 1000).toFixed(0)}k` +
      ` | programs: ${gl.info.programs?.length ?? 0}` +
      ` | geo: ${m.geometries}` +
      ` | tex: ${m.textures}` +
      ` | meshes: ${meshCount}` +
      ` | lights: ${totalLights} (pt:${pointLights} dir:${dirLights} spot:${spotLights})` +
      ` | shadow casters: ${shadowCasters}` +
      `\n  ► ${bottlenecks.join('\n  ► ')}`
    )

    a.frames = 0
    a.since  = 0
    a.logged = true
  })

  return null
}
