import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import {
  BackSide,
  Color,
  type DirectionalLight,
  type FogExp2,
  type Group,
  type HemisphereLight,
  type InstancedMesh,
  type Mesh,
  Object3D,
  type PointLight,
  ShaderMaterial,
  Vector3,
} from 'three'
import { HALL } from './layout'
import { env } from './env'
import { useSettings } from '../../store/settings'

// reusable temporaries (allocated once)
const cTop = new Color()
const cHorizon = new Color()
const cNightTop = new Color('#070b18')
const cNightHor = new Color('#131c33')
const cDayTop = new Color('#3f7fd6')
const cDayHor = new Color('#cfe2ee')
const cDusk = new Color('#ff8a4a')
const tmp = new Color()

function smooth(x: number) {
  return Math.max(0, Math.min(1, x))
}

/**
 * Continuous day/night cycle + dynamic weather. Drives the sky dome, sun, moon,
 * stars, all global lights, and fog imperatively through refs (no per-frame
 * re-renders), and renders rain through the windows + streaks on the glass.
 */
export function DayNightWeather({ quality, cinematic, rainScale, shadowMap, rainDrops }: { quality: string; cinematic: boolean; rainScale: number; shadowMap: number; rainDrops: number }) {
  const dir = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const fog = useRef<FogExp2>(null)
  const sun = useRef<Mesh>(null)
  const moon = useRef<Mesh>(null)
  const stars = useRef<Group>(null)
  const bolt = useRef<PointLight>(null)

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new Color('#3f7fd6') },
          horizon: { value: new Color('#cfe2ee') },
        },
        vertexShader: `
          varying vec3 vP;
          void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: `
          varying vec3 vP;
          uniform vec3 top; uniform vec3 horizon;
          void main(){
            float h = clamp((normalize(vP).y + 0.1) / 0.9, 0.0, 1.0);
            gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0);
          }
        `,
      }),
    [],
  )

  const sunDir = useMemo(() => new Vector3(), [])
  const wnext = useRef({ t: 4, seed: 0x9e37 >>> 0 })

  // When the graphics quality changes the directional shadow-map resolution, the
  // GPU render-target was already allocated at the old size and won't resize on
  // its own. Dispose it so three rebuilds it (the renderer auto-updates the
  // shadow map each frame) at the new size — otherwise the "Quality" setting
  // visibly does nothing to shadow sharpness until a full reload. (Enabling /
  // disabling shadows wholesale is handled by the Canvas `shadows` prop.)
  useEffect(() => {
    const d = dir.current
    if (!d) return
    const size = shadowMap || 1024
    d.shadow.mapSize.set(size, size)
    d.shadow.map?.dispose()
    d.shadow.map = null as unknown as typeof d.shadow.map
    d.castShadow = quality !== 'low'
  }, [shadowMap, quality])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = useSettings.getState()

    // ---- advance time of day ----
    if (!s.timePaused) env.t = (env.t + (dt / 300) * s.timeSpeed) % 1 // ~5 min/cycle at 1×
    const angle = (env.t - 0.25) * Math.PI * 2
    const elev = Math.sin(angle)
    sunDir.set(Math.cos(angle), Math.max(-0.35, elev), 0.28).normalize()
    env.sun.x = sunDir.x
    env.sun.y = sunDir.y
    env.sun.z = sunDir.z
    const day = smooth(elev * 1.4 + 0.15)
    env.dayFactor = day
    const dusk = Math.exp(-(elev * elev) / 0.05) // golden-hour weight

    // ---- weather targets ----
    if (s.weatherAuto) {
      // continuously evolving rain/fog via layered slow sines
      const tt = env.t * Math.PI * 2
      env.rainTarget = smooth(0.45 + 0.5 * Math.sin(tt * 1.3) + 0.25 * Math.sin(tt * 0.5 + 1))
      env.fogTarget = smooth(0.2 + 0.3 * Math.sin(tt * 0.7 + 2))
    } else {
      const map: Record<string, [number, number]> = {
        clear: [0, 0.08],
        'light-rain': [0.4, 0.25],
        'heavy-rain': [1, 0.5],
        fog: [0.05, 0.9],
      }
      const [r, f] = map[s.weather] ?? [0.4, 0.25]
      env.rainTarget = r
      env.fogTarget = f
    }
    env.rain += (env.rainTarget - env.rain) * Math.min(1, dt * 0.4)
    env.fog += (env.fogTarget - env.fog) * Math.min(1, dt * 0.4)

    // ---- sky colours ----
    cTop.copy(cNightTop).lerp(cDayTop, day)
    cHorizon.copy(cNightHor).lerp(cDayHor, day)
    tmp.copy(cDusk)
    cHorizon.lerp(tmp, dusk * 0.6 * day)
    cTop.lerp(tmp, dusk * 0.25 * day)
    // grey out with fog
    tmp.set('#8a9098')
    cHorizon.lerp(tmp, env.fog * 0.5)
    cTop.lerp(tmp, env.fog * 0.3)
    ;(skyMat.uniforms.top.value as Color).copy(cTop)
    ;(skyMat.uniforms.horizon.value as Color).copy(cHorizon)

    // ---- lights (kept soft & warm — cosy, never a showroom) ----
    if (dir.current) {
      dir.current.position.set(sunDir.x * 120, Math.max(6, sunDir.y * 120), sunDir.z * 120)
      // very gentle, warm sun — just enough to model the outdoor world and lift
      // the interior; never the harsh white shafts the user disliked
      dir.current.intensity = day * 0.34 * (1 - env.fog * 0.55)
      tmp.set('#ffe1b2').lerp(cDusk, dusk * 0.7)
      dir.current.color.copy(tmp)
      dir.current.castShadow = quality !== 'low'
    }
    if (hemi.current) {
      // generous warm sky fill so the hall reads soft & cosy, not high-contrast
      hemi.current.intensity = 0.28 + day * 0.3
      ;(hemi.current.color as Color).copy(cHorizon)
    }
    if (fog.current) {
      ;(fog.current.color as Color).copy(cHorizon)
      fog.current.density = cinematic ? 0.004 + env.fog * 0.022 + (1 - day) * 0.004 : 0.0016
    }

    // ---- sun / moon / stars ----
    if (sun.current) {
      sun.current.position.set(sunDir.x * 360, sunDir.y * 360, sunDir.z * 360)
      sun.current.visible = sunDir.y > -0.1
    }
    if (moon.current) {
      moon.current.position.set(-sunDir.x * 360, -sunDir.y * 360, -sunDir.z * 360)
      moon.current.visible = sunDir.y < 0.1
    }
    if (stars.current) {
      stars.current.visible = day < 0.35
    }

    // ---- lightning (storms / night) ----
    const w = wnext.current
    w.t -= dt
    env.lightning = Math.max(0, env.lightning - dt * 3)
    if (w.t <= 0) {
      w.seed = (w.seed * 1664525 + 1013904223) >>> 0
      const stormy = env.rain
      w.t = 5 + (w.seed / 0xffffffff) * 16 - stormy * 3
      if (stormy > 0.55) env.lightning = 1
    }
    if (bolt.current) bolt.current.intensity = env.lightning * env.lightning * 6
  })

  return (
    <group>
      {/* sky dome */}
      <mesh material={skyMat} scale={600}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>

      <group ref={stars}>
        <Stars radius={300} depth={60} count={1800} factor={6} saturation={0} fade speed={0.5} />
      </group>

      {/* sun + moon discs (glow via bloom) */}
      <mesh ref={sun}>
        <sphereGeometry args={[14, 16, 16]} />
        <meshBasicMaterial color="#fff3c8" />
      </mesh>
      <mesh ref={moon}>
        <sphereGeometry args={[10, 16, 16]} />
        <meshBasicMaterial color="#d8e4f0" />
      </mesh>

      <hemisphereLight ref={hemi} args={['#cfe2ee', '#241a10', 0.5]} />
      <directionalLight
        ref={dir}
        intensity={1.5}
        color="#fff2d8"
        castShadow
        shadow-radius={6}
        shadow-mapSize={[shadowMap || 1024, shadowMap || 1024]}
        shadow-camera-left={-44}
        shadow-camera-right={44}
        shadow-camera-top={44}
        shadow-camera-bottom={-44}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0004}
      />
      <pointLight ref={bolt} position={[-60, 50, 0]} color="#e6efff" intensity={0} />

      <fogExp2 ref={fog} attach="fog" args={['#cfe2ee', 0.006]} />

      <Rain scale={rainScale} drops={rainDrops} />
      <GlassStreaks />
    </group>
  )
}

interface Drop {
  x: number
  y: number
  z: number
  speed: number
  len: number
}

function buildDrops(side: number, count: number): Drop[] {
  let s = (side === 1 ? 991 : 1777) >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  return Array.from({ length: count }, () => ({
    x: side * (HALL.halfW + 1.5 + rand() * 14),
    y: rand() * 26,
    z: -HALL.halfL - 4 + rand() * (HALL.halfL * 2 + 8),
    speed: 14 + rand() * 12,
    len: 0.9 + rand() * 1.4,
  }))
}

function Rain({ scale, drops }: { scale: number; drops: number }) {
  return (
    <group>
      <RainSide side={1} scale={scale} count={drops} />
      <RainSide side={-1} scale={scale} count={drops} />
    </group>
  )
}

function RainSide({ side, scale, count }: { side: number; scale: number; count: number }) {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const dropsRef = useRef<Drop[] | null>(null)
  if (dropsRef.current == null) dropsRef.current = buildDrops(side, count)

  useFrame((_, dtRaw) => {
    const mesh = ref.current
    const drops = dropsRef.current
    if (!mesh || !drops) return
    const dt = Math.min(dtRaw, 0.05)
    const active = Math.floor(drops.length * env.rain * scale)
    for (let i = 0; i < drops.length; i++) {
      if (i >= active) {
        dummy.position.set(0, -9999, 0)
        dummy.scale.set(0, 0, 0)
      } else {
        const d = drops[i]
        d.y -= d.speed * dt
        if (d.y < -1) d.y += 27
        dummy.position.set(d.x, d.y, d.z)
        dummy.scale.set(1, d.len, 1)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.03, 1.2, 0.03]} />
      <meshBasicMaterial color="#dbeaf6" transparent opacity={0.55} />
    </instancedMesh>
  )
}

interface Streak {
  x: number
  y: number
  z: number
  speed: number
  len: number
}

function buildStreaks(): Streak[] {
  let s = 0x51ea >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  const out: Streak[] = []
  for (const side of [-1, 1]) {
    for (let i = 0; i < 80; i++) {
      out.push({
        x: side * (HALL.halfW - 0.1),
        y: rand() * (HALL.wallH - 4) + 3,
        z: -HALL.halfL + 2 + rand() * (HALL.halfL * 2 - 4),
        speed: 0.6 + rand() * 1.2,
        len: 0.4 + rand() * 0.8,
      })
    }
  }
  return out
}

/** Slow droplet trails crawling down the inner face of the windows. */
function GlassStreaks() {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const streaksRef = useRef<Streak[] | null>(null)
  if (streaksRef.current == null) streaksRef.current = buildStreaks()
  const streaks = streaksRef.current

  useFrame((_, dtRaw) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = Math.min(dtRaw, 0.05)
    const active = Math.floor(streaks.length * env.rain)
    for (let i = 0; i < streaks.length; i++) {
      const st = streaks[i]
      if (i >= active) {
        dummy.position.set(0, -9999, 0)
        dummy.scale.set(0, 0, 0)
      } else {
        st.y -= st.speed * dt
        if (st.y < 2.6) st.y = HALL.wallH - 3.5
        dummy.position.set(st.x, st.y, st.z)
        dummy.scale.set(1, st.len, 1)
      }
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 160]}>
      <boxGeometry args={[0.07, 1, 0.06]} />
      <meshBasicMaterial color="#dbeaf6" transparent opacity={0.36} />
    </instancedMesh>
  )
}
