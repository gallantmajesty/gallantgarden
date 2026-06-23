import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  NormalBlending,
  type Points,
  type ShaderMaterial as TShaderMaterial,
  ShaderMaterial,
} from 'three'
import { FALLS } from './layout'
import { water } from './env'
import { makeWaterfallTexture, makeFoamSprite } from './textures'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * A scrolling falling-water material. The texture is a grayscale FLOW MASK; this
 * shader supplies all colour — cool blue-grey body water that only brightens to
 * soft off-white in the foam ribbons, and grows more translucent toward the top
 * of the drop. Two flow lanes scroll at different speeds for visible breakup.
 * Plain transparency (NOT additive) and modest brightness so it reads as water
 * in daylight, not a glowing energy beam, and does not trip the bloom pass.
 */
function makeFlowMaterial(speed: number, repeatY: number, opacity: number, deep: Color, light: Color) {
  const tex = makeWaterfallTexture()
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uTex: { value: tex },
      uSpeed: { value: speed },
      uRepeatY: { value: repeatY },
      uOpacity: { value: opacity },
      uDeep: { value: deep.clone() },
      uLight: { value: light.clone() },
      uFoam: { value: water.foam.clone() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      uniform float uTime; uniform float uSpeed; uniform float uRepeatY; uniform float uOpacity;
      uniform sampler2D uTex; uniform vec3 uDeep; uniform vec3 uLight; uniform vec3 uFoam;
      varying vec2 vUv;
      float hash(float x){ return fract(sin(x*127.1)*43758.5453); }
      void main(){
        // two flow lanes scrolling downward at different rates -> breakup & motion
        vec2 uv1 = vec2(vUv.x + sin(vUv.y*6.0 + uTime*0.5)*0.006, vUv.y*uRepeatY - uTime*uSpeed);
        vec2 uv2 = vec2(vUv.x*1.27 - 0.11 + sin(vUv.y*4.0 - uTime*0.4)*0.005, vUv.y*uRepeatY*1.7 - uTime*uSpeed*1.4);
        float s1 = texture2D(uTex, uv1).r;
        float s2 = texture2D(uTex, uv2).r;
        float flow = mix(s1, s2, 0.5);

        // plane uv.y: 1 at the crest (top), 0 at the plunge (bottom)
        float top = vUv.y;
        // foam only where flow piles up, concentrated toward the bottom & a faint crest line
        float foam = smoothstep(0.7, 0.97, flow) * (smoothstep(0.4, 0.0, top) + smoothstep(0.93, 1.0, top)*0.5);

        // body colour: shaded blue-grey, lightening along the bright ribbons
        vec3 col = mix(uDeep, uLight, flow*0.85);
        col = mix(col, uFoam, clamp(foam, 0.0, 1.0));
        // subtle per-ribbon colour variation for depth
        col *= 0.93 + 0.09 * hash(floor(vUv.x*16.0));

        // translucent up top, denser at the plunge; foam adds opacity
        float a = (0.22 + flow*0.4 + foam*0.5) * (0.45 + (1.0 - top)*0.55) * uOpacity;
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }
    `,
  })
}

/**
 * The HERO waterfall. Built from a few overlapping sheets so it reads with real
 * volume: two main curtain layers at slightly different depths/speeds, a curved
 * plunge apron bowing over the pool, a couple of flanking side cascades off the
 * cliff ledges, a soft foam lip at the crest and a churned foam disc in the pool,
 * plus a soft rising mist/spray plume at the base. Kept deliberately lean on
 * transparent layers + particles to stay cheap (fillrate is the cost here).
 */
export function Waterfall({ mist = 1, spray = 1 }: { mist?: number; spray?: number }) {
  const matsRef = useRef<TShaderMaterial[]>([])

  const { mainMats, sideMats } = useMemo(() => {
    const mainMats = [
      makeFlowMaterial(0.5, 3.2, 0.95, water.fallDeep, water.fallLight),
      makeFlowMaterial(0.64, 3.8, 0.8, water.fallDeep, new Color('#dceef3')),
    ]
    const sideMats = [
      makeFlowMaterial(0.74, 4.6, 0.85, water.fallDeep, new Color('#d4e9ef')),
      makeFlowMaterial(0.86, 5.2, 0.8, water.fallDeep, water.fallLight),
    ]
    matsRef.current = [...mainMats, ...sideMats]
    return { mainMats, sideMats }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (const m of matsRef.current) m.uniforms.uTime.value = t
  })

  const zFront = FALLS.wallZ + 6
  const w = FALLS.width
  const topY = FALLS.crestY
  const apronY = 7

  // side cascades: narrower curtains starting at the cliff ledges
  const cascades = useMemo(
    () => [
      { x: -w * 0.55, top: 32, w: 6, mat: 0 },
      { x: w * 0.6, top: 20, w: 5, mat: 1 },
    ],
    [w],
  )

  return (
    <group>
      {/* ---- main curtain: two stacked layers at slightly different depths/speeds ---- */}
      {mainMats.map((m, i) => (
        <mesh key={i} position={[FALLS.centerX, (topY + apronY) / 2, zFront - i * 0.8]}>
          <planeGeometry args={[w - i * 1.4, topY - apronY, 1, 1]} />
          <primitive object={m} attach="material" />
        </mesh>
      ))}

      {/* ---- curved plunge apron: the water bows outward over the pool ---- */}
      <mesh position={[FALLS.centerX, apronY / 2 + 0.2, zFront + 2.4]} rotation={[Math.PI * 0.12, 0, 0]}>
        <planeGeometry args={[w, apronY + 2.4, 1, 1]} />
        <primitive object={mainMats[0]} attach="material" />
      </mesh>

      {/* ---- side cascades ---- */}
      {cascades.map((c, i) => (
        <mesh key={i} position={[FALLS.centerX + c.x, c.top / 2 + 0.2, zFront + 1.5]}>
          <planeGeometry args={[c.w, c.top, 1, 1]} />
          <primitive object={sideMats[c.mat]} attach="material" />
        </mesh>
      ))}

      {/* ---- crest foam lip (soft, off-white) ---- */}
      <mesh position={[FALLS.centerX, topY - 0.5, zFront + 0.3]}>
        <boxGeometry args={[w + 1, 1.2, 1.4]} />
        <meshBasicMaterial color={water.foam.getHex()} transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* ---- churning plunge-pool foam disc ---- */}
      <mesh position={[FALLS.centerX, FALLS.baseY + 0.12, FALLS.poolZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[w * 0.6, 32]} />
        <meshBasicMaterial color={water.foam.getHex()} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* ---- soft mist + spray at the base only ---- */}
      {mist > 0 && <MistAndSpray mist={mist} spray={spray} />}
    </group>
  )
}

/**
 * A CPU-driven particle plume: fine rising MIST plus a little coarser SPRAY thrown
 * up from the impact zone, kept low and soft so it reads as atmospheric spray, not
 * explosion smoke. One Points object, soft round sprite, NORMAL blending and low
 * opacity so layers stack gently and blend into the scene instead of blowing out.
 */
function MistAndSpray({ mist, spray }: { mist: number; spray: number }) {
  const ref = useRef<Points>(null)
  const sprite = useMemo(() => makeFoamSprite(), [])

  const data = useMemo(() => {
    const nMist = Math.round(70 * mist)
    const nSpray = Math.round(45 * spray)
    const n = nMist + nSpray
    const rand = rng(5511)
    const pos = new Float32Array(n * 3)
    const vel = new Float32Array(n * 3)
    const life = new Float32Array(n)
    const seed0 = new Float32Array(n)
    const w = FALLS.width
    for (let i = 0; i < n; i++) {
      const heavy = i >= nMist // the spray portion: faster, taller
      const a = rand() * Math.PI * 2
      const r = rand() * w * 0.5
      pos[i * 3] = FALLS.centerX + Math.cos(a) * r
      pos[i * 3 + 1] = FALLS.baseY + rand() * 3
      pos[i * 3 + 2] = FALLS.poolZ + (rand() - 0.5) * 5
      const up = heavy ? 4 + rand() * 4 : 1.2 + rand() * 2
      vel[i * 3] = (rand() - 0.5) * (heavy ? 3 : 1.2)
      vel[i * 3 + 1] = up
      vel[i * 3 + 2] = (rand() - 0.5) * (heavy ? 3 : 1.2)
      life[i] = rand()
      seed0[i] = heavy ? 1 : 0
    }
    return { n, nMist, pos, vel, life, seed0 }
  }, [mist, spray])

  const geom = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(data.pos, 3))
    return g
  }, [data])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const { n, pos, vel, life, seed0 } = data
    for (let i = 0; i < n; i++) {
      life[i] += dt * (seed0[i] ? 0.5 : 0.32)
      pos[i * 3] += vel[i * 3] * dt
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      vel[i * 3 + 1] -= dt * (seed0[i] ? 6 : 1.0) // spray arcs, mist floats
      if (life[i] >= 1) {
        life[i] = 0
        pos[i * 3] = FALLS.centerX + Math.sin(i * 12.9) * FALLS.width * 0.42
        pos[i * 3 + 1] = FALLS.baseY + 0.5
        pos[i * 3 + 2] = FALLS.poolZ + Math.cos(i * 7.3) * 3
        vel[i * 3 + 1] = seed0[i] ? 4 + (i % 4) : 1.3 + (i % 3) * 0.4
      }
    }
    if (ref.current) (ref.current.geometry.attributes.position as BufferAttribute).needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        map={sprite}
        color={water.mist.getHex()}
        size={4.5}
        sizeAttenuation
        transparent
        opacity={0.22}
        depthWrite={false}
        blending={NormalBlending}
      />
    </points>
  )
}
