import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { AdditiveBlending, DoubleSide, MeshBasicMaterial } from 'three'

// god-ray slab material (module-level so it can be animated each frame)
const SHAFT_MAT = new MeshBasicMaterial({
  color: '#ffe7b0',
  transparent: true,
  opacity: 0,
  blending: AdditiveBlending,
  depthWrite: false,
  side: DoubleSide,
})
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
import { env } from './env'
import { QUALITY_PRESET } from '../../store/settings'
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

  return (
    <Canvas
      shadows={preset.shadows ? 'soft' : false}
      dpr={[1, preset.dpr]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={() => onReady?.()}
    >
      <SoftBoundary>
        <Suspense fallback={null}>
          <DayNightWeather quality={quality} cinematic={cinematic} rainScale={preset.rainScale} shadowMap={preset.shadowMap} rainDrops={preset.rainDrops} />
          <Exterior count={preset.forest} />
        </Suspense>
      </SoftBoundary>

      {/* warm interior fill so the hall is always cosily lit — never pitch-black
          at night — while the lanterns add the real pools of light */}
      <ambientLight intensity={0.34} color="#ffd9a8" />

      <LibraryShell />
      <Bookshelves />
      <StudyTables />
      <Decor />
      <Lanterns />
      <KnowledgeTree />

      {preset.dust > 0 && (
        <Sparkles count={preset.dust} scale={[HALL.halfW * 2, HALL.wallH, HALL.halfL * 2]} position={[0, HALL.wallH / 2, 0]} size={2.6} speed={0.16} color="#ffe6b0" opacity={0.5} />
      )}
      {preset.godRays && <LightShafts />}

      <PlayerController />
      <PerfLogger />

      {cinematic && preset.bloom && (
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.72} luminanceSmoothing={0.32} intensity={0.55} mipmapBlur />
          <Vignette eskil={false} offset={0.12} darkness={0.9} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

/** Faux volumetric god-rays: soft additive slabs slanting in through the windows,
 *  brightening with daylight and fading at night / in fog. */
function LightShafts() {
  const mat = SHAFT_MAT

  const shafts = useMemo(() => {
    const out: { pos: [number, number, number]; rotY: number }[] = []
    for (const sx of [-1, 1]) {
      for (let z = -24; z <= 24; z += 12) {
        out.push({ pos: [sx * (HALL.halfW - 4), HALL.wallH / 2 - 1, z], rotY: sx > 0 ? -0.5 : 0.5 })
      }
    }
    return out
  }, [])

  useFrame(() => {
    mat.opacity = Math.max(0, env.dayFactor * 0.05 * (1 - env.fog * 0.7))
  })

  return (
    <group>
      {shafts.map((sh, i) => (
        <mesh key={i} position={sh.pos} rotation={[0, sh.rotY, 0.3]} material={mat}>
          <planeGeometry args={[5, HALL.wallH]} />
        </mesh>
      ))}
    </group>
  )
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
