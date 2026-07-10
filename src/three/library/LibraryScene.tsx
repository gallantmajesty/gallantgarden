// @ts-nocheck
import { Component, useEffect, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, N8AO, GodRays } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import type { Material, Mesh, Object3D, Texture } from 'three'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useSeatFlow } from '../../store/seatFlow'

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
  // First-person only for the Ultra depth-of-field (blurring the avatar in
  // third-person looks wrong).
  const cameraMode = useSettings((s) => s.cameraMode)

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
      camera={{ position: [0, 1.7, 8], fov: 68, near: 0.08, far: preset.far }}
    >
      <color attach="background" args={['#0c0a0a']} />
      <SystemToggles />
      <ShadowManager enabled={preset.shadows} refreshInterval={8} />
      <TextureQualitySync anisotropy={preset.anisotropy} />

      <SoftBoundary>
        <ToggleGroup group="dayNight">
          <DayNightWeather fog={preset.fog} rainScale={preset.rainScale} shadowMap={preset.shadowMap} rainDrops={preset.rainDrops} sunRef={sunRef} onSunReady={() => setSunReady(true)} />
        </ToggleGroup>
        <ToggleGroup group="exterior">
          <Exterior count={preset.forest} mountains={preset.mountains} clouds={preset.clouds} />
        </ToggleGroup>
      </SoftBoundary>

      {/* warm interior fill so the hall is always cosily lit — the lanterns add
          the real pools of golden light against the dark night outside */}
      <ambientLight intensity={0.38} color="#ffd9a8" />

      <ToggleGroup group="interior">
        <LibraryShell />
        <Bookshelves />
        <StudyTables />
        <Decor />
        <KnowledgeTree />
      </ToggleGroup>

      <ToggleGroup group="lanterns">
        <Lanterns />
      </ToggleGroup>

      {/* Magical layer — all instanced/particle/shader, zero extra real lights and
          zero full-screen passes. Gated by the same particle/detail budget so they
          shed on low-end settings and Performance Mode. */}
      <ToggleGroup group="particles">
        {preset.particles && <Fireflies count={Math.round(12 + preset.dust * 0.8)} />}
        {preset.particles && <Aurora />}
        {preset.lodBias < 1 && <FloatingBooks count={preset.lodBias < 0.5 ? 8 : 5} />}
        {preset.dust > 0 && (
          <Sparkles count={preset.dust} scale={[HALL.halfW * 2, HALL.wallH, HALL.halfL * 2]} position={[0, HALL.wallH / 2, 0]} size={1.5} speed={0.12} color="#ffe6b0" opacity={0.35} />
        )}
      </ToggleGroup>

      <ToggleGroup group="seasonal">
        {preset.particles && (
          <SeasonalOverlay enabled={preset.particles} particleMultiplier={preset.lodBias < 1 ? 0.8 : 1} />
        )}
      </ToggleGroup>
      <PlayerController />
      <ToggleGroup group="remotePlayers">
        <RemotePlayers />
      </ToggleGroup>
      <PerfLogger />
      <DebugProbe />

      {/* Standard post tier (default): cheap mipmap bloom + vignette. multisampling
          0 disables the composer's expensive MSAA pass. */}
      <ToggleGroup group="post">
        {preset.bloom && !preset.ultra && (
          <EffectComposer enableNormalPass={false} multisampling={0}>
            <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.4} intensity={0.4} kernelSize={KernelSize.SMALL} mipmapBlur />
            <Vignette eskil={false} offset={0.16} darkness={0.8} />
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
              <N8AO key="ao" aoRadius={1.2} distanceFalloff={1} intensity={1.8} quality="medium" halfRes />,
              <Bloom key="bloom" luminanceThreshold={0.75} luminanceSmoothing={0.4} intensity={0.5} kernelSize={KernelSize.MEDIUM} mipmapBlur />,
              sunReady ? (
                <GodRays key="god" sun={sunRef as unknown as RefObject<Mesh>} samples={50} density={0.9} decay={0.9} weight={0.35} exposure={0.45} clampMax={1} />
              ) : null,
              <Vignette key="vig" eskil={false} offset={0.16} darkness={0.8} />,
            ].filter(Boolean) as ReactElement[]}
          </EffectComposer>
        )}
      </ToggleGroup>
    </Canvas>
    <SceneReady onReady={onReady} />
    <DebugHud />
    </>
  )
}

/**
 * Single owner of all shadow-map GL state. No other component may modify:
 *   - gl.shadowMap.enabled
 *   - gl.shadowMap.autoUpdate
 *   - gl.shadowMap.needsUpdate
 *   - directionalLight.shadow.map
 *   - directionalLight.castShadow
 *
 * When shadows are enabled, autoUpdate is turned off and the map is refreshed
 * only every `refreshInterval` frames — a ~8x GPU saving with no visible
 * difference since the sun barely moves per frame. When shadows are disabled,
 * autoUpdate is left at its default (true) and needsUpdate is not touched so
 * the renderer simply skips the shadow pass.
 */
function ShadowManager({ enabled, refreshInterval = 8 }: { enabled: boolean; refreshInterval?: number }) {
  const gl = useThree((s) => s.gl)
  const frame = useRef(0)

  useEffect(() => {
    if (enabled) {
      // Throttle: disable automatic rebuild, force one immediate refresh, then
      // let the useFrame cadence take over.
      gl.shadowMap.autoUpdate = false
      gl.shadowMap.needsUpdate = true
    } else {
      // Shadows off: restore defaults so the renderer skips the shadow pass
      // cleanly without leaving stale state.
      gl.shadowMap.autoUpdate = true
      gl.shadowMap.enabled = false
    }
    return () => {
      // Clean up on unmount: restore auto-update so other scenes aren't broken.
      gl.shadowMap.autoUpdate = true
    }
  }, [gl, enabled])

  useFrame(() => {
    // Check the debug toggle (key 7) — reads the global without touching GL
    // state directly. The actual mutation happens only here in ShadowManager.
    const toggleOn = _sysToggles.shadows
    const shouldRender = enabled && toggleOn

    if (gl.shadowMap.enabled !== shouldRender) {
      gl.shadowMap.enabled = shouldRender
      gl.shadowMap.needsUpdate = true
    }

    if (!shouldRender) return

    frame.current = (frame.current + 1) % refreshInterval
    if (frame.current === 0) gl.shadowMap.needsUpdate = true
  })

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
 * System elimination toggles — press number keys to disable/enable subsystems.
 *   1 = DayNightWeather  2 = Exterior  3 = LibraryShell+Bookshelves+Decor
 *   4 = Lanterns         5 = Fireflies/Aurora/Sparkles  6 = SeasonalOverlay
 *   7 = Shadows          8 = PostProcessing              9 = RemotePlayers
 *   0 = Fog
 *
 * Shadow toggle (key 7) is read by ShadowManager on each frame — this component
 * only flips the boolean, it never touches gl.shadowMap directly.
 *
 * The toggle state is stored in a global so it survives re-renders.
 * Press Ctrl+Shift+R to reset all toggles to ON.
 */
const _sysToggles: Record<string, boolean> = {
  dayNight: true, exterior: true, interior: true, lanterns: true,
  particles: true, seasonal: true, shadows: true, post: true,
  remotePlayers: true, fog: true,
}
if (typeof window !== 'undefined') (window as any).__sysToggles = _sysToggles

function SystemToggles() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const map: Record<string, string> = {
        '1': 'dayNight', '2': 'exterior', '3': 'interior',
        '4': 'lanterns', '5': 'particles', '6': 'seasonal',
        '7': 'shadows', '8': 'post', '9': 'remotePlayers', '0': 'fog',
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        Object.keys(_sysToggles).forEach(k => _sysToggles[k] = true)
        console.log('[Toggles] All systems ON')
        return
      }
      const key = map[e.key]
      if (key) {
        _sysToggles[key] = !_sysToggles[key]
        console.log(`[Toggles] ${key}: ${_sysToggles[key] ? 'ON' : 'OFF'}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

/** Wrapper that conditionally renders children based on system toggle state. */
function ToggleGroup({ group, children }: { group: string; children: ReactNode }) {
  const [enabled, setEnabled] = useState(_sysToggles[group] ?? true)
  useEffect(() => {
    const iv = setInterval(() => setEnabled(_sysToggles[group] ?? true), 100)
    return () => clearInterval(iv)
  }, [group])
  if (!enabled) return null
  return <>{children}</>
}

/** Hook to check a system toggle — returns false when the system is disabled. */
export function useSystemToggle(key: string): boolean {
  const [enabled, setEnabled] = useState(_sysToggles[key] ?? true)
  useEffect(() => {
    const iv = setInterval(() => {
      const cur = _sysToggles[key] ?? true
      setEnabled(prev => prev === cur ? prev : cur)
    }, 100)
    return () => clearInterval(iv)
  }, [key])
  return enabled
}

/**
 * Fires onReady once it mounts — which only happens after Suspense resolves
 * DayNightWeather + Exterior. This prevents the explore-veil from disappearing
 * while the scene is still partially black.
 *
 * Also fires after a 5 s timeout as a safety net: if Suspense hangs or
 * a component error keeps this from mounting, the veil still lifts so the
 * user isn't stuck on a permanent dark screen. The Explore screen has its
 * own 8 s fallback, but firing earlier here gives a faster recovery.
 */
function SceneReady({ onReady }: { onReady?: () => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onReady?.() }, [])
  useEffect(() => {
    const t = setTimeout(() => onReady?.(), 5000)
    return () => clearTimeout(t)
  }, [onReady])
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
  // Only in development — never expose engine internals in production.
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__perfStore = { gl, scene }
    }
    return () => {
      if (import.meta.env.DEV) {
        try { delete (window as unknown as Record<string, unknown>).__perfStore } catch { /* ignore */ }
      }
    }
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
