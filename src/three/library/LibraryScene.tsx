// @ts-nocheck
import { Component, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { createNullSafeEvents } from '../safeEvents'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Vignette, N8AO, GodRays, Bloom, HueSaturation, BrightnessContrast } from '@react-three/postprocessing'
import type { Material, Mesh, Object3D, Texture } from 'three'
import { HalfFloatType, Vector3 } from 'three'

// DPR is fixed at mount time — no live re-scaling to avoid GPU stalls / context loss.
import { useSettings, type PostQuality } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useSeatFlow } from '../../store/seatFlow'
import { useWorld } from '../../store/world'
import { useSocialOverlay } from '../../features/social/store'

import { HALL } from './layout'
import { LibraryShell } from './LibraryShell'
import { Bookshelves } from './Bookshelf'
import { StudyTables } from './StudyTable'
import { Decor } from './Decor'
import { Lanterns } from './Lanterns'
import { KnowledgeTree } from './KnowledgeTree'
import { NightMagic } from './NightMagic'
import { Fireflies } from './Fireflies'
import { FlyingCandles } from './FlyingCandles'
import { Aurora } from './Aurora'
import { FloatingBooks } from './FloatingBooks'
import { FantasyLayer } from './FantasyLayer'
import { Exterior } from './Exterior'
import { DayNightWeather } from './DayNightWeather'

import { PlayerController } from './PlayerController'
import { avatarRoots } from '../../avatar/CharacterAvatar'
import { RemotePlayers } from './RemotePlayers'
import { NpcPlayers } from './NpcPlayers'
import { impostorBusy } from './ImpostorSprites'
import { SeasonalOverlay } from './SeasonalOverlay'
import { TableAccessories } from './TableAccessories'

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
 * Error boundary for use *inside* the R3F <Canvas> (the WebGL reconciler), where
 * only THREE objects are valid — a DOM <div> here throws "Div is not part of the
 * THREE namespace". If a child (e.g. the post-processing composer, after a GL
 * context loss) throws, we render `null` instead of a DOM node, so the scene
 * keeps running without post-FX rather than crashing the whole canvas.
 */
/**
 * Top-level guard inside the R3F Canvas. R3F v9 creates its own React sub-root.
 * If ANY child throws during React reconciliation (not useFrame — those are
 * caught by R3F), the *entire sub-root* crashes silently — the canvas DOM
 * element stays, showing the last frame frozen, while the main React tree
 * continues normally (FPS counter, DOM overlays all work). This guard prevents
 * the sub-root crash by catching any error and rendering a no-op instead.
 */
class CanvasGuard extends Component<{ children: ReactNode }, { failed: boolean; msg: string }> {
  state = { failed: false, msg: '' }
  static getDerivedStateFromError(error: Error) {
    return { failed: true, msg: error?.message ?? 'Unknown error' }
  }
  componentDidCatch(error: Error) {
    console.error('[LibraryScene] CanvasGuard caught — preventing R3F sub-root crash:', error)
    if (import.meta.env.DEV) ;(window as any).__libCanvasError = error.message
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean; msg: string }> {
  state = { failed: false, msg: '' }
  static getDerivedStateFromError(error: Error) {
    return { failed: true, msg: error?.message ?? 'Unknown error' }
  }
  componentDidCatch(error: Error) {
    console.error('[LibraryScene] post-processing disabled after error:', error)
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

/**
 * The International Realm great library. Composes the architecture, centrepiece
 * tree, furniture, exterior world, day/night + weather, player controller and
 * post-processing — scaling all of it to the chosen graphics quality.
 */
export function LibraryScene({ onReady, frameloop = 'always', roomId }: { onReady?: () => void; frameloop?: 'always' | 'demand' | 'never'; roomId?: string }) {
  // The merged quality budget (user's six axes + transient Ctrl+F perf override).
  const preset = useScenePreset()
  // First-person only for the Ultra depth-of-field (blurring the avatar in
  // third-person looks wrong).
  const cameraMode = useSettings((s) => s.cameraMode)
  // Bloom lives ONLY during the Cinematic Tour (key 9) — the rest of the time the
  // stack is bloom-free, because even a subtle always-on bloom used to cause the
  // angle-specific black blink at seated presets 3/4.
  const cinematic = useWorld((s) => s.cinematic)
  const bloomOn = useSettings((s) => s.bloom)
  const nightMode = useSettings((s) => s.nightMode)
  // The post-processing axis tiers the heavy Ultra effects: N8AO is cut below
  // medium, GodRays only survives on high. Bloom/Vignette are unaffected.
  const postTier = useSettings((s) => s.postProcessing)

  // During seat selection the 2D overlay covers the scene — skip heavy
  // subsystems (post-processing, shadows, exterior, particles) so the GPU
  // idles instead of spinning at 60 fps behind a DOM panel.
  const seatStage = useSeatFlow((s) => s.stage)
  const selecting = seatStage === 'selecting'

  // The sun disc mesh feeds the Ultra GodRays effect. It lives in DayNightWeather;
  // we hold a ref to it here and only mount GodRays once the mesh exists.
  const sunRef = useRef<Mesh | null>(null)
  const [sunReady, setSunReady] = useState(false)
  // Whether the GodRays sun disc is currently in front of the camera. GodRays
  // radial-blurs from the sun's *screen-space* position; once the sun goes
  // behind the lens (the behind/side seated presets 3/4 look away from the room's
  // window) that position is behind the camera (w < 0) and the effect divides by
  // it → NaN → floods the whole screen black. We drop GodRays while off-screen.
  const [sunVisible, setSunVisible] = useState(true)

  // WebGL context-loss recovery. A dropped GL context (GPU driver spike,
  // integrated/discrete GPU switch, tab throttling) shows the scene's near-black
  // background for a frame — the "whole screen blinks" while idle. We MUST
  // preventDefault on contextlost or the browser will never restore it, and on
  // contextrestored we remount the postprocessing composer so its lost render
  // targets are rebuilt (otherwise it stays black and the blink loops forever).
  const [composerKey, setComposerKey] = useState(0)
  const [canvasKey, setCanvasKey] = useState(0)

  // When the player commits to a seat (selecting → seated/walking) the scene is
  // NOT restarted: the frameloop flips back to 'always' and the already-mounted
  // scene simply resumes — PlayerController reads the seat from the world store
  // each frame and places the avatar + camera on it. An old version remounted
  // the whole Canvas here, which tore down and rebuilt the entire WebGL world on
  // every sit — the "scene restarts whenever I sit" blink. R3F 9.6.1's render
  // loop keeps running and roots resume on the frameloop flip, so the remount
  // was never needed (RenderHeartbeat invalidates the instant the loop thaws).

  // Fixed DPR from mount — never changes at runtime. Live DPR changes reallocate
  // the WebGL drawing buffer, which stalls integrated GPUs and can freeze the
  // render loop. The preset value is determined at build/setting time and stays
  // constant for the lifetime of this Canvas.
  const dpr = preset.dpr

  const renderPaused = useWorld((s) => s.renderPaused)
  // Pause the 3D render loop while the social hub (chat / Explore) is open so the
  // background world stops drawing behind the overlay.
  const socialOpen = useSocialOverlay((s) => s.open)

  // Pause the render loop entirely while the browser tab is hidden (Settings →
  // "Pause rendering when tab is hidden", on by default) to save GPU/battery.
  // The RenderHeartbeat's 1 s invalidate() resumes it instantly on focus.
  const pauseWhenHidden = useSettings((s) => s.pauseWhenHidden)
  const [tabHidden, setTabHidden] = useState(false)
  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    onVis()
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Freeze the render loop during seat selection to save GPU. When a seat is
  // committed, the frameloop prop flips to 'always' and RenderHeartbeat
  // invalidates a frame immediately — R3F 9.6.1 stops its loop while every root
  // is frameloop='never', so the flip back alone would leave the scene dead
  // until the next 1 s heartbeat tick.

  const handleReady = () => {
    onReady?.()
  }

  // Canvas health check: monitors actual rendered frames via rAF.
  // If no frame is rendered for 4 seconds, force-remounts the Canvas.
  useEffect(() => {
    let lastFrame = -1
    let lastChange = performance.now()
    let running = true

    const check = () => {
      if (!running) return
      // A deliberately-paused loop (social hub open, tab hidden, or seat
      // selection) isn't a freeze — keep the watchdog calm instead of forcing a
      // remount that would reload the world behind the chat overlay.
      if (useSocialOverlay.getState().open || selecting || (pauseWhenHidden && tabHidden)) {
        lastChange = performance.now()
        lastFrame = libFrameTs
        requestAnimationFrame(check)
        return
      }
      const currentFrame = libFrameTs

      // Only real heartbeat timestamps (>0) count as proof of life. RenderHeartbeat
      // zeroes the global on mount, so a slow first load would otherwise look like
      // "no new frames" and force-remount the Canvas in an endless restart loop.
      if (currentFrame > 0 && currentFrame !== lastFrame) {
        lastChange = performance.now()
        lastFrame = currentFrame
      } else if (lastFrame > 0 && performance.now() - lastChange > 4000) {
        console.warn('[LibraryScene] Canvas not rendering new frames — remounting')
        setCanvasKey((k) => k + 1)
        lastChange = performance.now()
      }

      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
    return () => { running = false }
  }, [canvasKey])

  return (
    <>
    <Canvas
      key={canvasKey}
      events={createNullSafeEvents}
      frameloop={(selecting || (pauseWhenHidden && tabHidden) || socialOpen) ? 'never' : frameloop}
      shadows={preset.shadows ? 'soft' : false}
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 1.7, 8], fov: 68, near: 0.08, far: preset.far }}
      onCreated={(state) => {
        const canvas = state.gl.domElement
        // Track context loss/restore with a recovery fallback. If contextrestored
        // never fires within 3 seconds, force-remount the Canvas by bumping a key.
        let restoreTimer: ReturnType<typeof setTimeout> | null = null
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          console.warn('[LibraryScene] WebGL context lost — will restore')
          // If context isn't restored within 3s, force a full Canvas remount
          restoreTimer = setTimeout(() => {
            console.warn('[LibraryScene] WebGL context NOT restored in 3s — remounting Canvas')
            setCanvasKey((k) => k + 1) // force full Canvas remount
          }, 3000)
        })
        canvas.addEventListener('webglcontextrestored', () => {
          if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null }
          console.warn('[LibraryScene] WebGL context restored — rebuilding postprocessing')
          let frames = 0
          const rebuild = () => {
            if (++frames >= 6) { setComposerKey((k) => k + 1); return }
            requestAnimationFrame(rebuild)
          }
          requestAnimationFrame(rebuild)
        })
      }}
    >
      <CanvasGuard>
      <color attach="background" args={['#0c0a0a']} />
      <SystemToggles />
      <ShadowManager enabled={preset.shadows && !selecting} cinematic={cinematic} refreshInterval={8} />
      <TextureQualitySync anisotropy={preset.anisotropy} />

      {!selecting && (
      <SoftBoundary>
        <ToggleGroup group="dayNight">
          <DayNightWeather fog={preset.fog} rainScale={preset.rainScale} shadowMap={preset.shadowMap} rainDrops={preset.rainDrops} sunRef={sunRef} onSunReady={() => setSunReady(true)} />
        </ToggleGroup>
        <ToggleGroup group="exterior">
          {/* At NIGHT the exterior (forest, mountains, castle, clouds) is invisible
              through the windows and just costs draw calls + real-light shadows, so
              we skip it entirely. The bright daytime scene is untouched. */}
          {!nightMode && <Exterior count={preset.forest} mountains={preset.mountains} clouds={preset.clouds} />}
        </ToggleGroup>
      </SoftBoundary>
      )}

      {/* Warm, cozy interior fill — the heart of the "magical library" feel.
          A hemisphere light (cool sky / WARM ground) gives vertical surfaces
          real form, and a generous warm ambient keeps the hall glowing golden
          instead of going murky. The lanterns + jewelled glass add the real
          pools of light against the night. Zero extra draw calls.
At NIGHT the interior fill is dimmed way down so the hall reads dark
           and is lit only by lanterns + floating candles (textures stay visible,
           just less washed-out). Daytime is untouched. */}
       <hemisphereLight args={['#aebfe0', '#6b4a2a', nightMode ? 0.18 : 0.4]} />
       <ambientLight intensity={nightMode ? 0.22 : 0.46} color="#ffd9a8" />

      <ToggleGroup group="interior">
        <LibraryShell />
        <Bookshelves />
        <StudyTables />
        <TableAccessories />
        <Decor />
        <KnowledgeTree />
      </ToggleGroup>

      <ToggleGroup group="lanterns">
        <Lanterns />
      </ToggleGroup>

      {/* Harry-Potter night magic — only mounted when night mode is on (enchanted
          ceiling, glowing floor rune ring, moving portraits). Zero cost by day. */}
      <NightMagic />

      {/* Magical layer — all instanced/particle/shader, zero extra real lights and
          zero full-screen passes. Gated by the same particle/detail budget so they
          shed on low-end settings and Performance Mode.
          At NIGHT we drop the extra particle/overdraw effects (Fireflies, Aurora,
          FantasyLayer, FloatingBooks, Sparkles) so the FPS freed by skipping the
          exterior + cutting real lights isn't eaten by transparent-glass overdraw.
          The signature floating candles stay. Daytime is unchanged & full. */}
      {!selecting && (
      <ToggleGroup group="particles">
        {!nightMode && preset.particles && <Fireflies count={Math.min(Math.round(8 + preset.dust * 0.6), 12)} />}
        {!nightMode && preset.particles && (
          <SoftBoundary>
            <FantasyLayer />
          </SoftBoundary>
        )}
        {/* FloatingBooks (transparent overdraw) is now high-tier only — it shed on
            medium/low so the weakest GPUs skip the extra draw + fill cost. */}
        {!nightMode && preset.lodBias < 0.5 && <FloatingBooks count={8} />}
        {!nightMode && preset.dust > 0 && (
          <Sparkles count={Math.min(preset.dust, 20)} scale={[HALL.halfW * 2, HALL.wallH, HALL.halfL * 2]} position={[0, HALL.wallH / 2, 0]} size={1.5} speed={0.12} color="#ffe6b0" opacity={0.35} />
        )}
        {/* tiny enchanted candles drifting upward — only at night, so the daytime
            look is never touched. This is the signature night atmosphere.
            PERF: 70→30 (full particles) / 40→15 (reduced) — half the instanced
            matrices re-uploaded per tick; imperceptible at night density. */}
        {nightMode && <FlyingCandles count={preset.particles ? 30 : 15} night={nightMode} />}
      </ToggleGroup>
      )}

      {!selecting && (
      <ToggleGroup group="seasonal">
        {preset.particles && (
          <SeasonalOverlay enabled={preset.particles} particleMultiplier={preset.lodBias < 1 ? 0.8 : 1} />
        )}
      </ToggleGroup>
      )}
      <PlayerController />
       <ToggleGroup group="remotePlayers">
         <RemotePlayers />
         <NpcPlayers roomId={roomId} />
       </ToggleGroup>
      {/* PerfLogger is a DEV-only audit tool — its scene-graph traversals and
          console reports are dead weight in production builds. */}
      {import.meta.env.DEV && <PerfLogger />}
      <RenderHeartbeat />
      <DisableFrustumCulling />
      <SunTracker sunRef={sunRef} onVisible={setSunVisible} />

      {/* Standard post tier (default): cheap mipmap bloom + vignette. multisampling
          0 disables the composer's expensive MSAA pass. */}
      {!selecting && (
        <CanvasBoundary>
          <PostEffects preset={preset} postTier={postTier} composerKey={composerKey} sunReady={sunReady} sunVisible={sunVisible} sunRef={sunRef} cinematic={cinematic} bloom={bloomOn} nightMode={nightMode} />
        </CanvasBoundary>
      )}
      <SceneReady onReady={handleReady} />
      </CanvasGuard>
    </Canvas>
    </>
  )
}

/**
 * Post-processing stack with live per-effect kill-switches (Alt+Q/W/E/R →
 * Bloom / Vignette / GodRays / N8AO). Each effect can be toggled off without
 * remounting the whole app, so we can isolate which single pass causes the
 * angle-specific blink at seated presets 3/4. The component re-renders on a
 * short poll of the `_postToggles` global; only the composer re-renders, not
 * the scene graph.
 */
function usePostToggleState() {
  const [s, setS] = useState({ ..._postToggles })
  useEffect(() => {
    // Poll the debug kill-switch globals, but ONLY re-render when a value has
    // actually changed. Previously this pushed a fresh object every 100ms, which
    // re-rendered PostEffects 10x/sec and — because the composer's passes were
    // rebuilt as new element objects each render — forced EffectComposer to tear
    // down and reallocate its GPU render targets 10x/sec (the cinematic hang).
    const iv = setInterval(() => {
      setS((prev) => {
        if (
          prev.vignette === _postToggles.vignette &&
          prev.godrays === _postToggles.godrays &&
          prev.n8ao === _postToggles.n8ao
        ) {
          return prev // no change → same reference → no re-render
        }
        return { ..._postToggles }
      })
    }, 100)
    return () => clearInterval(iv)
  }, [])
  return s
}

function PostEffects({
  preset, postTier, composerKey, sunReady, sunVisible, sunRef, cinematic, bloom, nightMode,
}: {
  preset: ReturnType<typeof useScenePreset>
  postTier: PostQuality
  composerKey: number
  sunReady: boolean
  sunVisible: boolean
  sunRef: React.MutableRefObject<Mesh | null>
  cinematic: boolean
  bloom: boolean
  nightMode: boolean
}) {
  const pt = usePostToggleState()
  const gl = useThree((s) => s.gl)

  // Night mode gets an automatic cinematic bloom + grade (the Harry-Potter
  // glowing-hall look) so the emissive lanterns / candles / runes glow. Daytime
  // is unchanged — bloom only during the Cinematic Tour there.
  const nightCine = nightMode
  const showBloom = (cinematic && bloom) || nightCine
  // The Ultra tier's heavy passes are further gated by the post-processing axis:
  // SSAO needs at least a 'low' (medium-preset) tier, the 30-sample GodRays pass
  // only survives on 'high' — the single most expensive full-screen shader here.
  const ultraPasses = useMemo(() => {
    return [
      pt.n8ao && postTier !== 'off' ? <N8AO key="ao" aoRadius={1.2} distanceFalloff={1} intensity={1.8} quality="low" halfRes /> : null,
      sunReady && sunVisible && pt.godrays && postTier === 'high' ? (
        <GodRays key="god" sun={sunRef as unknown as RefObject<Mesh>} samples={30} density={0.9} decay={0.9} weight={0.35} exposure={0.45} clampMax={1} />
      ) : null,
      pt.vignette ? <Vignette key="vig" eskil={false} offset={0.16} darkness={0.8} /> : null,
      showBloom ? <Bloom key="bloom" mipmapBlur intensity={nightCine ? 1.15 : 0.95} luminanceThreshold={nightCine ? 0.4 : 0.5} luminanceSmoothing={0.25} radius={0.6} /> : null,
    ].filter(Boolean) as ReactElement[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pt.n8ao, pt.godrays, pt.vignette, sunReady, sunVisible, showBloom, nightCine, postTier])

  const bloomPasses = useMemo(() => {
    const bloomEl = showBloom ? (
      <Bloom key="bloom" mipmapBlur intensity={nightCine ? 1.15 : 0.95} luminanceThreshold={nightCine ? 0.4 : 0.5} luminanceSmoothing={0.25} radius={0.6} />
    ) : null
    // Filmic grade: during the Cinematic Tour AND at night (the HP glow) we add a
    // richer saturation + soft contrast lift + deeper vignette. Cheap full-screen
    // passes that only exist when wanted.
    const grade =
      cinematic || nightCine
        ? [
            pt.vignette ? <Vignette key="vig" eskil={false} offset={nightCine ? 0.2 : 0.14} darkness={nightCine ? 0.95 : 0.55} /> : null,
            <HueSaturation key="sat" saturation={nightCine ? 0.22 : 0.16} />,
            <BrightnessContrast key="bc" brightness={0.01} contrast={nightCine ? 0.12 : 0.08} />,
          ]
        : [pt.vignette ? <Vignette key="vig" eskil={false} offset={0.16} darkness={0.8} /> : null]
    return [bloomEl, ...grade].filter(Boolean) as ReactElement[]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBloom, cinematic, nightCine, pt.vignette])

  if (!gl) return null
  // Bloom is mounted during the Cinematic Tour, in Ultra mode, or at NIGHT (for
  // the cinematic glow). Otherwise the composer is bloom-free.
  if (!preset.bloom && !preset.ultra && !cinematic && !nightMode) return null

  if (preset.ultra) {
    return (
      <EffectComposer key={`ultra-${composerKey}`} enableNormalPass={false} multisampling={2}>
        {ultraPasses}
      </EffectComposer>
    )
  }
  return (
    <EffectComposer key={`bloom-${composerKey}`} enableNormalPass={false} multisampling={0}>
      {bloomPasses}
    </EffectComposer>
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
function ShadowManager({ enabled, cinematic, refreshInterval = 300 }: { enabled: boolean; cinematic: boolean; refreshInterval?: number }) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const frame = useRef(0)
  const lastCam = useRef(new Vector3())
  const prevShould = useRef<boolean | null>(null)
  // During the Cinematic Tour the camera flies constantly, which would force a
  // full ~48-caster shadow-map rebuild every frame — a major, sustained stall.
  // The tour is a soft, moving "shot", so frozen shadows are imperceptible; we
  // simply stop refreshing while cinematic is on. (enabled still gates shadows
  // entirely when the user has them off.)
  const freeze = cinematic

  useEffect(() => {
    if (enabled) {
      // Throttle: disable automatic rebuild, force ONE immediate refresh, then
      // freeze. The library is static (sun barely moves, lanterns fixed), so the
      // shadow maps only need to be computed once — not every few frames.
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
    // Debug toggle (key 7) — reads the global; mutation happens only here.
    const toggleOn = _sysToggles.shadows
    const shouldRender = enabled && toggleOn

    // On (re)enable, render the shadow maps once so they're not stale.
    if (prevShould.current !== null && prevShould.current !== shouldRender) {
      gl.shadowMap.enabled = shouldRender
      if (shouldRender) gl.shadowMap.needsUpdate = true
    }
    prevShould.current = shouldRender

    if (!shouldRender) return

    // Only refresh the (very expensive — 48 shadow casters) maps when the
    // camera has actually moved. While idle/sitting still the camera is
    // stationary, so the maps freeze after the first render and we never pay
    // the periodic multi-frame GPU stall that showed the near-black background
    // as a "whole-screen blink". A rare safety refresh keeps things correct
    // if something animated ever changes the lighting.
    const moved = lastCam.current.distanceToSquared(camera.position) > 1e-4
    if (moved && !freeze) {
      gl.shadowMap.needsUpdate = true
      lastCam.current.copy(camera.position)
    }
    // NOTE: we do NOT refresh on a fixed timer while idle. The old code did
    // `needsUpdate = true` every `refreshInterval` frames even when the camera
    // was perfectly still — that periodic shadow-map re-render of ~48 casters is
    // a multi-frame GPU stall that dropped a frame and showed the near-black
    // background as a "whole-screen blink". The library/sun are static, so once
    // the camera stops moving the maps stay frozen and the stall is gone.
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
 * System elimination toggles — press Alt + number keys to disable/enable
 * subsystems. The Alt modifier is REQUIRED so these never collide with the
 * in-canvas camera-preset keys 1-4 (handled in PlayerController), which was
 * previously causing the library to randomly drop its sky/lighting/interior
 * whenever the user switched seated camera angles.
 *   Alt+1 = DayNightWeather   Alt+2 = Exterior   Alt+3 = LibraryShell+Bookshelves+Decor
 *   Alt+4 = Lanterns          Alt+5 = Fireflies/Aurora/Sparkles   Alt+6 = SeasonalOverlay
 *   Alt+7 = Shadows           Alt+8 = PostProcessing              Alt+9 = RemotePlayers
 *   Alt+0 = Fog
 *
 * Shadow toggle (Alt+7) is read by ShadowManager on each frame — this component
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
if (typeof window !== 'undefined' && import.meta.env.DEV) (window as any).__sysToggles = _sysToggles

// Per-effect post-processing kill-switches — used to isolate which single
// EffectComposer pass is causing the angle-specific blink at seated presets 3/4.
//   Alt+W = Vignette   Alt+E = GodRays   Alt+R = N8AO
// Bloom is no longer a kill-switch: it only renders during the Cinematic Tour
// (key 9), so it can't flicker the seated presets anymore.
const _postToggles: Record<string, boolean> = {
  vignette: true, godrays: true, n8ao: true,
}
if (typeof window !== 'undefined' && import.meta.env.DEV) (window as any).__postToggles = _postToggles

function SystemToggles() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        Object.keys(_sysToggles).forEach(k => _sysToggles[k] = true)
        _postToggles.vignette = _postToggles.godrays = _postToggles.n8ao = true
        return
      }
      // Debug subsystem toggles require Alt so they don't fire on the
      // camera-preset keys 1-4 used while seated (see PlayerController).
      if (!e.altKey) return
      const map: Record<string, string> = {
        '1': 'dayNight', '2': 'exterior', '3': 'interior',
        '4': 'lanterns', '5': 'particles', '6': 'seasonal',
        '7': 'shadows', '8': 'post', '9': 'remotePlayers', '0': 'fog',
      }
      const postMap: Record<string, string> = {
        'w': 'vignette', 'e': 'godrays', 'r': 'n8ao',
      }
      const key = map[e.key] ?? postMap[e.key.toLowerCase()]
      if (key) {
        if (_sysToggles[key] !== undefined) {
          _sysToggles[key] = !_sysToggles[key]
        } else if (_postToggles[key] !== undefined) {
          _postToggles[key] = !_postToggles[key]
        }
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
 * Minimal useFrame component that writes a timestamp to a global every frame.
 * The watchdog outside the Canvas reads this to detect a frozen render loop.
 * If 3 seconds pass without a new heartbeat, the Canvas is force-remounted.
 */
// Internal freeze-detector state — module-scoped so no window global leaks into
// production. The window mirror below exists only in development for profiling.
let libFrameTs = -1
function RenderHeartbeat() {
  const invalidate = useThree((s) => s.invalidate)
  const frameloop = useThree((s) => s.frameloop)
  useFrame(() => {
    libFrameTs = performance.now()
    if (import.meta.env.DEV) {
      ;(window as any).__libHeartbeat = Date.now()
      ;(window as any).__libFrame = libFrameTs
    }
  })
  useEffect(() => {
    libFrameTs = 0
    if (import.meta.env.DEV) {
      ;(window as any).__libHeartbeat = Date.now()
      ;(window as any).__libFrame = 0
    }
    // Keep the render loop ticking while the tab is backgrounded/paused so it
    // resumes instantly on focus. The old code also repainted a debug dot here
    // every second — that green/yellow flash was the "blinking" in the corner.
    const iv = setInterval(() => {
      invalidate()
    }, 1000)
    return () => clearInterval(iv)
  }, [invalidate])
  // R3F 9.6.1's loop cancels its own RAF while every root is frameloop='never'
  // (invalidate() is also a no-op under 'never'), so after a freeze (seat
  // selection, social hub, hidden tab) the flip back to 'always' alone would
  // leave the scene stalled for up to the 1 s heartbeat tick. Invalidate the
  // instant the loop unfreezes so sitting / reopening the hub resumes the scene
  // immediately — no dead frame behind the closing overlay.
  useEffect(() => {
    if (frameloop === 'always') invalidate()
  }, [frameloop, invalidate])
  return null
}

/**
 * SceneReady — fires onReady after the scene has actually rendered a few frames,
 * the camera has settled into its final position, AND the impostor sprite bakes
 * (the last heavy async work a mount does) have drained. The loading veil stays
 * until the room is genuinely ready to look at — not a fraction of a second in.
 *
 * We wait for 3 actual rendered frames after the camera has settled, with a 7 s
 * cap on the bake wait (a slow GPU shouldn't hang the loader forever) and a 10 s
 * safety timeout as the final fallback.
 */
function SceneReady({ onReady }: { onReady?: () => void }) {
  const frameCount = useRef(0)
  const readyCalled = useRef(false)
  const lastPos = useRef(new Vector3())
  const hasStarted = useRef(false)
  const start = useRef(performance.now())

  // Get access to the camera position from the R3F store
  const camera = useThree((s) => s.camera)
  
  useFrame(() => {
    const currentPos = camera.position.clone()
    
    if (!hasStarted.current) {
      lastPos.current.copy(camera.position)
      hasStarted.current = true
      frameCount.current = 0
      return
    }

    const delta = camera.position.distanceTo(lastPos.current)
    lastPos.current.copy(camera.position)

    // Camera has settled if movement is negligible
    if (delta < 0.001) {
      frameCount.current += 1
    } else {
      // Camera still moving, reset frame counter
      frameCount.current = 0
    }

    const bakesDone = !impostorBusy()
    const elapsed = performance.now() - start.current
    if (!readyCalled.current && frameCount.current >= 3 && (bakesDone || elapsed > 7000)) {
      readyCalled.current = true
      onReady?.()
    }
  })

  // Safety timeout: if frames don't arrive in 10 seconds, force ready
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!readyCalled.current) {
        readyCalled.current = true
        onReady?.()
      }
    }, 10000)

    return () => {
      clearTimeout(timeout)
    }
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

    a.frames = 0
    a.since  = 0
    a.logged = true
  })

  return null
}

/**
 * Disable frustum culling on every skinned AVATAR mesh, on a slow interval. For
 * a static, enclosed interior culling itself is fine — the problem is avatar-
 * specific:
 *
 *   A skinned mesh's bounding sphere is computed at its bind pose / origin, NOT
 *   at the seat where the avatar is actually placed. When the camera looks AWAY
 *   from the origin (presets 3/4: behind / side), that sphere leaves the frustum
 *   and the avatar gets culled for a frame → it vanishes, revealing the dark
 *   background → "blink". Front presets (1/2) look toward the origin, so the
 *   avatar stays in frustum and never flickers.
 *
 * The scan walks ONLY the registered CharacterAvatar roots (local player, remote
 * players, NPCs — see `avatarRoots`) instead of the entire scene graph, so every
 * static mesh keeps its default culling and off-screen geometry is still skipped.
 * The 500 ms re-scan covers late-loaded GLTF bodies, whose real SkinnedMesh is
 * created after the model loads.
 */
function DisableFrustumCulling() {
  useEffect(() => {
    const scan = () => {
      for (const root of avatarRoots) {
        root.traverse((o: Object3D) => {
          const mesh = o as unknown as { isSkinnedMesh?: boolean; frustumCulled?: boolean }
          if (mesh.isSkinnedMesh && mesh.frustumCulled) mesh.frustumCulled = false
        })
      }
    }
    scan()
    const iv = setInterval(scan, 500)
    return () => clearInterval(iv)
  }, [])
  return null
}

/**
 * Tracks whether the GodRays sun disc is in front of the camera. GodRays does a
 * radial blur from the sun's *screen-space* position; when the sun goes behind
 * the camera (e.g. the behind/side seated presets 3/4, which look away from the
 * room's main window), that position is behind the lens (w < 0) and the effect
 * divides by it → NaN/garbage that floods the whole screen black — the
 * angle-specific "blink" at presets 3/4. We simply drop GodRays while the sun is
 * off-screen so the rest of the post stack (bloom / vignette / N8AO) keeps running.
 */
function SunTracker({ sunRef, onVisible }: { sunRef: React.MutableRefObject<Mesh | null>; onVisible: (v: boolean) => void }) {
  const camera = useThree((s) => s.camera)
  const prev = useRef(true)
  const ndc = useRef(new Vector3())
  useFrame(() => {
    const sun = sunRef.current
    if (!sun) {
      if (prev.current) { prev.current = false; onVisible(false) }
      return
    }
    // Project the sun's world position into normalized device coords. Behind the
    // camera yields z > 1 (and flipped x/y), so the z test alone rejects it; the
    // x/y bounds reject the screen EDGE, where the radial blur still reads
    // off-canvas garbage and floods the screen black (the preset 3/4 blink).
    sun.getWorldPosition(ndc.current)
    ndc.current.project(camera)
    const onScreen =
      ndc.current.z < 1 &&
      ndc.current.x > -0.75 && ndc.current.x < 0.75 &&
      ndc.current.y > -0.75 && ndc.current.y < 0.75
    if (onScreen !== prev.current) {
      prev.current = onScreen
      onVisible(onScreen)
    }
  })
  return null
}
