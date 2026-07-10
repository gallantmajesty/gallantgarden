import { type MutableRefObject, useMemo, useRef } from 'react'
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
  ShaderMaterial,
  Vector3,
} from 'three'
import { HALL } from './layout'
import { env } from './env'
import { useSettings } from '../../store/settings'

// reusable temporaries (allocated once)
const cTop = new Color()
const cHorizon = new Color()
const cNightTop = new Color('#172a4d')
const cNightHor = new Color('#4a3522')
const tmp = new Color()

/**
 * Night-only atmosphere. The sky dome is permanently dark, stars and moon are
 * always visible, rain falls perpetually, and the only directional light is a
 * faint cool moonlight. The hall glows warm from its lanterns.
 */
export function DayNightWeather({ fog: fogOn, rainScale, shadowMap, rainDrops, sunRef, onSunReady }: { fog: boolean; rainScale: number; shadowMap: number; rainDrops: number; sunRef?: MutableRefObject<Mesh | null>; onSunReady?: () => void }) {
  const dir = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const fog = useRef<FogExp2>(null)
  const sun = useRef<Mesh>(null)
  const moon = useRef<Mesh>(null)
  const stars = useRef<Group>(null)

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new Color('#172a4d') },
          horizon: { value: new Color('#4a3522') },
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

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = useSettings.getState()

    // ---- NIGHT ONLY: time is frozen, dayFactor always 0 ----
    env.t = 0.0
    env.dayFactor = 0.0

    // moon sits high in the sky — a cool silver disc
    sunDir.set(0.3, 0.65, 0.2).normalize()
    env.sun.x = sunDir.x
    env.sun.y = sunDir.y
    env.sun.z = sunDir.z

    // ---- weather targets ----
    if (s.weatherAuto) {
      // slowly drifting rain/fog at night
      const tt = env.t * Math.PI * 2
      env.rainTarget = 0.45 + 0.35 * Math.sin(tt * 1.3 + 2)
      env.fogTarget = 0.3 + 0.25 * Math.sin(tt * 0.7 + 2)
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

    // ---- sky colours: always night ----
    cTop.copy(cNightTop)
    cHorizon.copy(cNightHor)
    // grey out with fog
    tmp.set('#1a1e2a')
    cHorizon.lerp(tmp, env.fog * 0.5)
    cTop.lerp(tmp, env.fog * 0.3)
    ;(skyMat.uniforms.top.value as Color).copy(cTop)
    ;(skyMat.uniforms.horizon.value as Color).copy(cHorizon)

    // ---- lights: faint cool moonlight + warm interior fill ----
    if (dir.current) {
      // moonlight — very faint, cool blue-white
      // Only update position if it actually changed to reduce unnecessary calculations
      const newPos = new Vector3(sunDir.x * 120, sunDir.y * 120, sunDir.z * 120)
      if (!dir.current.position.equals(newPos)) {
        dir.current.position.copy(newPos)
      }
      dir.current.intensity = 0.12 * (1 - env.fog * 0.55)
      dir.current.color.set('#b0c4de')
    }
    if (hemi.current) {
      // dark cool sky fill — the hall is lit by lanterns, not the sky
      hemi.current.intensity = 0.18 + env.lightning * env.lightning * 1.6
      const hc = hemi.current.color as Color
      hc.set('#1a1e2e')
      tmp.set('#0a0e18')
      hc.lerp(tmp, 0.5)
    }
    if (fog.current) {
      ;(fog.current.color as Color).copy(cHorizon)
      fog.current.density = fogOn ? 0.006 + env.fog * 0.022 : 0.002
    }

    // ---- sun hidden, moon + stars always visible ----
    if (sun.current) {
      sun.current.visible = false
    }
    if (moon.current) {
      moon.current.position.set(sunDir.x * 360, sunDir.y * 360, sunDir.z * 360)
      moon.current.visible = true
    }
    if (stars.current) {
      stars.current.visible = true
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
  })

  return (
    <group>
      {/* sky dome — always night */}
      <mesh material={skyMat} scale={600}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>

      {/* stars always visible */}
      <group ref={stars}>
        <Stars radius={300} depth={60} count={1800} factor={6} saturation={0} fade speed={0.4} />
      </group>

      {/* sun (hidden) — keep mesh for compat but invisible */}
      <mesh
        ref={(m) => {
          sun.current = m
          if (sunRef) sunRef.current = m
          if (m && onSunReady) onSunReady()
        }}
        visible={false}
      >
        <sphereGeometry args={[14, 16, 16]} />
        <meshBasicMaterial color="#fff3c8" />
      </mesh>

      {/* moon — bright silver disc, always visible */}
      <mesh ref={moon}>
        <sphereGeometry args={[12, 20, 20]} />
        <meshBasicMaterial color="#e8eef8" />
      </mesh>

      <hemisphereLight ref={hemi} args={['#1a1e2e', '#0a0e18', 0.22]} />
      <directionalLight
        ref={dir}
        intensity={0.15}
        color="#b0c4de"
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
      <fogExp2 ref={fog} attach="fog" args={['#131c33', 0.006]} />

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
  const wasActive = useRef(false)
  if (dropsRef.current == null) dropsRef.current = buildDrops(side, count)

  useFrame((_, dtRaw) => {
    const mesh = ref.current
    const drops = dropsRef.current
    if (!mesh || !drops) return
    const dt = Math.min(dtRaw, 0.05)
    const active = Math.floor(drops.length * env.rain * scale)
    // PERF: when it isn't raining, don't rewrite + re-upload the whole instance
    // buffer every frame. Park the drops once on the transition to dry, then idle.
    if (active === 0) {
      if (!wasActive.current) return
      for (let i = 0; i < drops.length; i++) {
        dummy.position.set(0, -9999, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      wasActive.current = false
      return
    }
    wasActive.current = true
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
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
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
  const wasActive = useRef(false)
  if (streaksRef.current == null) streaksRef.current = buildStreaks()
  const streaks = streaksRef.current

  useFrame((_, dtRaw) => {
    const mesh = ref.current
    if (!mesh) return
    const dt = Math.min(dtRaw, 0.05)
    const active = Math.floor(streaks.length * env.rain)
    // PERF: skip the per-frame rewrite + buffer upload while dry (see RainSide).
    if (active === 0) {
      if (!wasActive.current) return
      for (let i = 0; i < streaks.length; i++) {
        dummy.position.set(0, -9999, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      wasActive.current = false
      return
    }
    wasActive.current = true
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
    <instancedMesh ref={ref} args={[undefined, undefined, 160]} frustumCulled={false}>
      <boxGeometry args={[0.07, 1, 0.06]} />
      <meshBasicMaterial color="#dbeaf6" transparent opacity={0.36} />
    </instancedMesh>
  )
}
