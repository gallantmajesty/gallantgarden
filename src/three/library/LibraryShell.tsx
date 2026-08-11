import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, type Mesh, type MeshBasicMaterial, type MeshStandardMaterial, type PointLight, ShaderMaterial, type Texture } from 'three'
import { HALL, WINDOW, windowStep, windowZs } from './layout'
import { balconyPlatforms, columns, GALLERY_FRONT_Z, staircases } from './furniture'
import { makeCarpetTexture, makeFlameTexture, makePlasterTexture, makeStainedGlassTexture, makeStoneNormalTexture, makeWoodNormalTexture, makeWoodRoughnessTexture, makeWoodTexture } from './textures'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from './Instanced'
import { env } from './env'
import { useScenePreset } from '../../store/quality'
import { useSettings } from '../../store/settings'

// Minimal flame shader: vertical UV distortion + color ramp (bulletproof)
const FLAME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FLAME_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D map;
  uniform float time;
  uniform float intensity;

  void main() {
    vec2 uv = vUv;
    // subtle vertical turbulence from noise
    float n = texture2D(map, uv * vec2(1.0, 0.5) + vec2(time * 0.03, -time * 0.08)).r;
    float n2 = texture2D(map, uv * vec2(2.0, 1.0) + vec2(-time * 0.02, -time * 0.12)).r;
    float distort = (n - 0.5) * 0.04 + (n2 - 0.5) * 0.02;
    uv.x += distort * (1.0 - uv.y) * 0.5;  // more sway at top
    uv.y += distort * 0.02;

    vec4 col = texture2D(map, uv);
    // boost the hottest parts slightly
    float heat = max(col.r, max(col.g, col.b));
    col.rgb += vec3(0.15, 0.08, 0.02) * heat * (1.0 - uv.y) * 0.5;
    col.a *= intensity;
    gl_FragColor = col;
  }
`

const STONE = '#9c8158' // warmer honey-stone (was a washed-out cream)
const STONE_DARK = '#6f5a39'
const TRIM = '#5a3f26'
const CEIL = '#23170d'

/**
 * The cathedral-scale shell: floor, beamed ceiling, two long window-walls (sill +
 * lintel + mullions so the gaps are the windows), end walls with a fireplace,
 * balcony-supporting columns, a walkable upper-floor ring with railings, two
 * grand staircases, and big arched glass. All procedural.
 */
export function LibraryShell() {
  const preset = useScenePreset()
  // "not the lowest tier" — gates the one fireplace point-light, off only when
  // both shadows and post-processing are disabled (the Low preset / heavy custom).
  const realLights = preset.shadows || preset.bloom
  const wood = useMemo(() => makeWoodTexture(14, 7), [])
  const woodNormal = useMemo(() => makeWoodNormalTexture(14, 7), [])
  const woodRough = useMemo(() => makeWoodRoughnessTexture(14, 7), [])
  const balconyWood = useMemo(() => makeWoodTexture(10, 13), [])
  const plaster = useMemo(() => makePlasterTexture(4, 19), [])
  const stoneNormal = useMemo(() => makeStoneNormalTexture(4, 19), [])
  const glass = useMemo(() => makeStainedGlassTexture(5), [])
  const carpet = useMemo(() => makeCarpetTexture(1, 3), [])
  const { halfW, halfL, wallH, balconyY, balconyDepth } = HALL

  const cols = useMemo(() => columns(), [])
  const stairs = useMemo(() => staircases(), [])
  const platforms = useMemo(() => balconyPlatforms(), [])

  const beamZs = useMemo(() => {
    const out: number[] = []
    for (let z = -halfL + 4; z <= halfL - 4; z += 5) out.push(z)
    return out
  }, [halfL])

  // ceiling beams as one instanced batch (was ~17 separate meshes)
  const beamItems = useMemo<BoxItem[]>(
    () => beamZs.map((z) => ({ pos: [0, wallH - 0.4, z], size: [halfW * 2 - 0.5, 0.6, 0.6], color: TRIM })),
    [beamZs, wallH, halfW],
  )

  // balcony balusters along the inner edges (only where there is gallery floor —
  // the near-end atrium is open, so no railing floats there)
  const balusters = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    const innerX = halfW - balconyDepth
    for (let z = -halfL + 1; z <= GALLERY_FRONT_Z; z += 0.7) {
      items.push({ pos: [innerX, balconyY + 0.6, z], size: [0.1, 1.2, 0.1] })
      items.push({ pos: [-innerX, balconyY + 0.6, z], size: [0.1, 1.2, 0.1] })
    }
    const innerZ = halfL - balconyDepth
    for (let x = -halfW + 1; x <= halfW - 1; x += 0.7) {
      items.push({ pos: [x, balconyY + 0.6, -innerZ], size: [0.1, 1.2, 0.1] })
    }
    return items
  }, [halfW, halfL, balconyY, balconyDepth])

  return (
    <group>
      {/* floor — wood grain + a normal map so plank seams and grain catch the
          lantern light with real depth; a roughness map mixes polished and
          weathered boards so the speculars break up naturally. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial map={wood} normalMap={woodNormal} roughnessMap={woodRough} roughness={0.85} metalness={0.04} />
      </mesh>

      {/* grand carpet runner down the central aisle — one draw, tiled along its
          length. Sits a hair above the floor so it never z-fights the planks. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[5.2, halfL * 2 - 3]} />
        <meshStandardMaterial map={carpet} roughness={0.95} metalness={0} />
      </mesh>

      {/* ceiling + beams */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallH, 0]}>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial color={CEIL} roughness={1} side={DoubleSide} />
      </mesh>
      {/* ceiling beams — one instanced draw (was one mesh per beam).
          PERF: no castShadow — they sit flush under a dark ceiling where their
          shadow never reads, so they're dropped from the directional shadow pass. */}
      <InstancedBoxes items={beamItems} roughness={0.9} />

      {/* end walls */}
      {[-1, 1].map((s) => (
        <mesh key={`end-${s}`} position={[0, wallH / 2, s * (halfL + 0.3)]} receiveShadow>
          <boxGeometry args={[halfW * 2 + 1.2, wallH, 0.6]} />
          <meshStandardMaterial map={plaster} normalMap={stoneNormal} color={STONE} roughness={1} />
        </mesh>
      ))}

      {/* long window-walls — solid plaster spandrels above/below + every bay's
          glass, tracery and arch built as instanced batches (was ~6-9 meshes per
          bay × 22 bays). */}
      <WindowWalls glass={glass} plaster={plaster} stoneNormal={stoneNormal} windowDetail={preset.windowDetail} />

      {/* columns — carved magical pillars (plinth, fluted shaft, glowing rune
          band, capital). Every pillar in the hall is built from a handful of
          INSTANCED batches instead of ~12 meshes each (~216 → 6 draws). */}
      <Pillars cols={cols} h={wallH} stoneNormal={stoneNormal} />

      {/* balcony platforms + rails */}
      {platforms.map((pf, i) => (
        <mesh key={`plat-${i}`} position={pf.pos} receiveShadow castShadow>
          <boxGeometry args={pf.size} />
          <meshStandardMaterial map={balconyWood} color="#b89058" roughness={0.8} />
        </mesh>
      ))}
      {/* top rails — side rails run only over the galleries (stop at the open
          atrium); a single far-end rail (the near end is open) */}
      {[-1, 1].map((s) => (
        <mesh key={`railx-${s}`} position={[s * (halfW - balconyDepth), balconyY + 1.25, (GALLERY_FRONT_Z - (halfL - 1)) / 2]}>
          <boxGeometry args={[0.18, 0.18, GALLERY_FRONT_Z + halfL - 1]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, balconyY + 1.25, -(halfL - balconyDepth)]}>
        <boxGeometry args={[halfW * 2 - 1, 0.18, 0.18]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
      {/* PERF: thin balcony balusters dropped from the shadow pass — their hairline
          shadows are invisible at this scale but cost a full extra caster batch. */}
      <InstancedBoxes items={balusters} color={STONE_DARK} roughness={0.8} />

      {/* grand staircases with stringers, carved banisters, newels & lanterns */}
      {/* grand staircases — steps, stringers, banisters, balusters, newels &
          lanterns for both stairs as a handful of instanced batches */}
      <Staircases stairs={stairs} wood={balconyWood} />

      {/* grand hearth on the far wall — carved stone surround, arched
          firebox, a grate with logs & dancing flames, and a mantel dressed
          with brass candlesticks + a clock. See <Fireplace> below. */}
      <Fireplace stoneNormal={stoneNormal} realLights={realLights} />
    </group>
  )
}

// (The hearth fire uses a procedural canvas flame texture + a minimal
//  ShaderMaterial for living turbulence. See makeFlameTexture in textures.ts
//  and FLAME_FRAG/FLAME_VERT above.)

/**
 * The library's great hearth — a proper wizarding fireplace, not a plain box.
 * A honey-stone chimney breast carries a moulded arch over a dark firebox, with
 * jambs, a heavy mantel shelf on carved corbels, a keystone and an overmantel
 * panel. Inside: an iron grate, stacked logs, a glowing ember bed and a single
 * living flame — a procedural canvas texture with a minimal ShaderMaterial
 * that adds vertical turbulence and color boost — plus a warm firelight
 * point-light (gated to real GPUs) and a small mantel clock, for the cosy
 * Great-Hall feel.
 */
function Fireplace({ stoneNormal, realLights }: { stoneNormal: Texture; realLights: boolean }) {
  const { halfL } = HALL
  const fireLight = useRef<PointLight>(null)
  const emberRef = useRef<Mesh>(null)

  const openW = 3.2
  const archR = openW / 2
  const archBaseY = 2.2

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // firelight breathes — layered sines + a touch of noise, no harsh jitter
    const flick = 0.8 + Math.sin(t * 9.1) * 0.08 + Math.sin(t * 17.3 + 1.2) * 0.05 + (Math.random() - 0.5) * 0.06
    if (fireLight.current) fireLight.current.intensity = 8.5 * flick
    // drive the flame shader: time for turbulence, intensity for overall brightness
    if (flameMat.current) {
      flameMat.current.uniforms.time.value = t
      flameMat.current.uniforms.intensity.value = 0.9 + flick * 0.15
    }
    if (emberRef.current) {
      const mat = emberRef.current.material as MeshStandardMaterial
      mat.emissiveIntensity = 2.2 + Math.sin(t * 12.5) * 0.4 + (Math.random() - 0.5) * 0.3
    }
  })

  // a single living flame: a procedural canvas flame texture + minimal shader
  // for living turbulence (vertical noise distortion + color boost).
  const flameTex = useMemo(() => makeFlameTexture(3), [])
  const flameMat = useRef<ShaderMaterial>(null)
  // a few logs leaning in the grate
  const logs = [
    { x: -0.5, ry: 0.3, rz: 0.18 },
    { x: 0.5, ry: -0.35, rz: -0.15 },
    { x: 0.0, ry: 0.0, rz: 0.32 },
  ]

  return (
    <group position={[0, 0, -halfL + 0.4]}>
      {/* stone breast wings flanking the opening — built out from the wall but
          kept clear of the firebox so the cavity reads as a real recess, not a
          slab floating in front of the stone */}
      {[-1, 1].map((s) => (
        <mesh key={`breast-${s}`} position={[s * 4.1, 3.7, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 7.8, 1.0]} />
          <meshStandardMaterial color={STONE} normalMap={stoneNormal} roughness={1} />
        </mesh>
      ))}
      {/* dark firebox back — set INTO the wall so the opening is a true cavity */}
      <mesh position={[0, 2.3, -0.2]}>
        <boxGeometry args={[openW + 0.6, 4.4, 0.3]} />
        <meshStandardMaterial color="#0a0705" roughness={1} />
      </mesh>
      {/* hearth stone — slab on the floor, projecting into the room */}
      <mesh position={[0, 0.16, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[9.0, 0.32, 1.9]} />
        <meshStandardMaterial color={STONE_DARK} normalMap={stoneNormal} roughness={1} />
      </mesh>
      {/* jambs framing the opening (inner edge meets the arch spring) */}
      {[-1, 1].map((s) => (
        <mesh key={`jamb-${s}`} position={[s * 2.5, 2.6, 0.0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 5.0, 1.1]} />
          <meshStandardMaterial color={STONE} normalMap={stoneNormal} roughness={1} />
        </mesh>
      ))}
      {/* lintel stone above the arch, below the mantel */}
      <mesh position={[0, 4.0, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[6.8, 1.3, 1.0]} />
        <meshStandardMaterial color={STONE} normalMap={stoneNormal} roughness={1} />
      </mesh>
      {/* overmantel panel — a recessed, slightly darker stone field */}
      <mesh position={[0, 6.3, 0.15]} receiveShadow>
        <boxGeometry args={[5.0, 2.4, 0.7]} />
        <meshStandardMaterial color="#6f5a39" normalMap={stoneNormal} roughness={1} />
      </mesh>
      {/* carved relief inset on the overmantel */}
      <mesh position={[0, 6.3, 0.52]}>
        <boxGeometry args={[3.6, 1.4, 0.12]} />
        <meshStandardMaterial color="#8a7350" normalMap={stoneNormal} roughness={0.95} />
      </mesh>
      {/* heavy mantel shelf on carved corbels */}
      {[-1, 1].map((s) => (
        <mesh key={`corbel-${s}`} position={[s * 2.6, 4.55, 0.35]} castShadow>
          <boxGeometry args={[0.55, 0.5, 0.8]} />
          <meshStandardMaterial color={STONE_DARK} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 4.95, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[10.2, 0.5, 1.5]} />
        <meshStandardMaterial color={TRIM} roughness={0.85} />
      </mesh>
      {/* (the firebox cavity is the dark back panel set into the wall above) */}
      {/* moulded stone arch over the opening */}
      <mesh position={[0, archBaseY, 0.1]} castShadow>
        <torusGeometry args={[archR, 0.38, 14, 28, Math.PI]} />
        <meshStandardMaterial color={STONE} normalMap={stoneNormal} roughness={1} />
      </mesh>
      {/* keystone at the crown */}
      <mesh position={[0, archBaseY + archR + 0.05, 0.12]} castShadow>
        <boxGeometry args={[0.7, 0.95, 0.8]} />
        <meshStandardMaterial color={STONE_DARK} roughness={1} />
      </mesh>

      {/* ---- the fire ---- */}
      {/* iron grate: front bar + two andirons */}
      <mesh position={[0, 0.72, 0.4]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.7, 10]} />
        <meshStandardMaterial color="#2a2622" metalness={0.6} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`andiron-${s}`} position={[s * 1.15, 0.5, 0.4]} castShadow>
          <cylinderGeometry args={[0.08, 0.11, 0.95, 8]} />
          <meshStandardMaterial color="#2a2622" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* logs leaning in the embers */}
      {logs.map((l, i) => (
        <mesh key={`log-${i}`} position={[l.x, 0.82, 0.02]} rotation={[0, l.ry, l.rz]} castShadow>
          <cylinderGeometry args={[0.15, 0.18, 1.5, 10]} />
          <meshStandardMaterial color="#3a241a" roughness={1} />
        </mesh>
      ))}
      {/* glowing ember bed */}
      <mesh ref={emberRef} position={[0, 0.62, 0.05]}>
        <boxGeometry args={[2.6, 0.22, 0.7]} />
        <meshStandardMaterial color="#ff5a1e" emissive="#ff5a1e" emissiveIntensity={2.2} />
      </mesh>
      {/* a single, living flame — textured canvas + minimal shader for
          living turbulence and color boost */}
      <mesh ref={flameMat} position={[0, 0.7 + 3.0 / 2, 0.05]}>
        <planeGeometry args={[2.6, 3.2]} />
        <shaderMaterial
          vertexShader={FLAME_VERT}
          fragmentShader={FLAME_FRAG}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          toneMapped={false}
          uniforms={{\
            map: { value: flameTex },\
            time: { value: 0 },\
            intensity: { value: 1.0 },\
          }}
        />
      </mesh>

      {/* mantel clock */}
      <mesh position={[0, 5.5, 0.4]} castShadow>
        <boxGeometry args={[0.9, 0.8, 0.3]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.5, 0.56]}>
        <circleGeometry args={[0.3, 24]} />
        <meshStandardMaterial color="#efe2c0" emissive="#caa84a" emissiveIntensity={0.25} />
      </mesh>

      {/* real firelight — dropped on Low (embers + flames + bloom still read
          as a fire) so the weakest GPUs carry one fewer dynamic light */}
      {realLights && (
        <pointLight ref={fireLight} position={[0, 1.8, 1.4]} intensity={8.5} distance={16} decay={2} color="#ff8a3a" />
      )}
    </group>
  )
}

/** Both long window-walls as instanced batches. The solid plaster spandrels and
 *  the mullions/tracery/glass/arches for all ~22 bays collapse to a fixed handful
 *  of draw calls regardless of bay count (was ~6-9 meshes per bay). The
 *  high-quality ornamental ring/keystone/oculus stay gated behind `windowDetail`. */
function WindowWalls({ glass, plaster, stoneNormal, windowDetail }: { glass: Texture; plaster: Texture; stoneNormal: Texture; windowDetail: boolean }) {
  const { halfW, halfL, wallH } = HALL
  const glassMat = useRef<MeshStandardMaterial>(null)

  // make the stained glass read as a lit lantern wall after dark: subtle warm
  // wash by day, a soft candlelit glow that gently flickers at night.
  useFrame((state) => {
    if (glassMat.current) {
      const night = useSettings.getState().nightMode
      const nightTerm = night ? 0.6 : 2.8
      const base = 0.45 + (1 - env.dayFactor) * nightTerm
      // candle flicker — layered sines give a slow, living sway (no harsh
      // white-noise jitter); only audible once the glass is actually glowing
      // at night, and a touch of randomness keeps it from looping obviously.
      const t = state.clock.elapsedTime
      const flicker =
        1 +
        (1 - env.dayFactor) *
          (Math.sin(t * 6.7) * 0.045 + Math.sin(t * 11.3 + 1.7) * 0.028 + (Math.random() - 0.5) * 0.03)
      glassMat.current.emissiveIntensity = base * flicker
    }
  })
  const zs = useMemo(() => windowZs(), [])
  const step = windowStep()
  const R = step / 2 - 0.25
  const midY = (WINDOW.sillY + WINDOW.headY) / 2
  const h = WINDOW.headY - WINDOW.sillY
  const transomY = WINDOW.sillY + h * 0.62
  const arch: [number, number, number] = [0, 0, Math.PI / 2]
  const faceY: [number, number, number] = [0, Math.PI / 2, 0]

  const data = useMemo(() => {
    const mullions: BoxItem[] = []
    const bayBoxes: BoxItem[] = []
    const keystones: BoxItem[] = []
    const glassPanes: ShapeItem[] = []
    const arches: ShapeItem[] = []
    const outerRings: ShapeItem[] = []
    const oculi: ShapeItem[] = []
    const oculusRings: ShapeItem[] = []
    const mullionZs: number[] = []
    for (let i = 0; i <= WINDOW.bayCount; i++) mullionZs.push(-((halfL * 2 - 8) / 2) + i * step)

    for (const s of [-1, 1]) {
      const x = s * (halfW + 0.3)
      for (const z of mullionZs) mullions.push({ pos: [x, midY, z], size: [0.55, h, 0.5], color: STONE_DARK })
      for (const z of zs) {
        glassPanes.push({ pos: [x - s * 0.04, midY, z], rot: faceY })
        bayBoxes.push({ pos: [x, WINDOW.sillY + 0.06, z], size: [0.85, 0.2, step - 0.2], color: STONE })
        bayBoxes.push({ pos: [x, transomY, z], size: [0.62, 0.16, step - 0.5], color: STONE_DARK })
        bayBoxes.push({ pos: [x, midY, z], size: [0.6, h, 0.16], color: STONE_DARK })
        arches.push({ pos: [x - s * 0.06, WINDOW.headY, z], rot: arch })
        if (windowDetail) {
          outerRings.push({ pos: [x, WINDOW.headY, z], rot: arch })
          keystones.push({ pos: [x, WINDOW.headY + R - 0.1, z], size: [0.8, 0.8, 0.6], color: STONE })
          oculi.push({ pos: [x - s * 0.05, WINDOW.headY + R * 0.45, z], rot: faceY })
          oculusRings.push({ pos: [x, WINDOW.headY + R * 0.45, z], rot: faceY })
        }
      }
    }
    return { mullions, bayBoxes, keystones, glassPanes, arches, outerRings, oculi, oculusRings }
  }, [halfW, halfL, step, midY, h, transomY, R, windowDetail, zs])

  const segs = windowDetail ? 20 : 12

  return (
    <group>
      {/* solid plaster spandrels above the heads and below the sills (textured) */}
      {[-1, 1].map((s) => {
        const x = s * (halfW + 0.3)
        return (
          <group key={`spandrel-${s}`}>
            <mesh position={[x, WINDOW.sillY / 2, 0]} receiveShadow>
              <boxGeometry args={[0.6, WINDOW.sillY, halfL * 2]} />
              <meshStandardMaterial map={plaster} normalMap={stoneNormal} color={STONE} roughness={1} />
            </mesh>
            <mesh position={[x, (WINDOW.headY + wallH) / 2, 0]} receiveShadow>
              <boxGeometry args={[0.6, wallH - WINDOW.headY, halfL * 2]} />
              <meshStandardMaterial map={plaster} normalMap={stoneNormal} color={STONE} roughness={1} />
            </mesh>
          </group>
        )
      })}

      <InstancedBoxes items={data.mullions} roughness={1} />
      <InstancedBoxes items={data.bayBoxes} roughness={1} />

      {/* stained glass (main panels) — one instanced draw for every bay; its
           warm emissive glow is animated + candle-flickered at night (see
           useFrame above). PERF: kept OPAQUE on the Low/Medium tiers — transparency
           disables early-Z, so the whole forest/mountains/sky behind these
           bay-filling panes would still be shaded and blend-sorted over a huge
           slice of the screen (the hall's biggest fill-rate cost on integrated
           GPUs). On the High tier (windowDetail) we re-enable a light transparency
           so the warm candlelit glass reads see-through without hurting weak GPUs.
           emissive is tinted warm gold (#ffd9a0) so the night glow is candlelight,
           not white. DoubleSide stays so the one batch faces both window walls. */}
      <InstancedShape
        items={data.glassPanes}
        materialRef={glassMat}
        map={glass}
        emissiveMap={glass}
        emissive="#ffd9a0"
        emissiveIntensity={0.5}
        roughness={0.4}
        metalness={0.1}
        side={DoubleSide}
        transparent={windowDetail}
        opacity={windowDetail ? 0.8 : 1}
        depthWrite={!windowDetail}
      >
        <planeGeometry args={[step - 0.7, h]} />
      </InstancedShape>

      {/* molded gothic arches */}
      <InstancedShape items={data.arches} color={STONE} roughness={1} side={DoubleSide}>
        <cylinderGeometry args={[R, R, 0.68, segs, 1, false, 0, Math.PI]} />
      </InstancedShape>

      {/* ornamental outer ring + keystone + glowing oculus — high quality only */}
      {windowDetail && (
        <>
          <InstancedShape items={data.outerRings} color={STONE_DARK} roughness={1} side={DoubleSide}>
            <cylinderGeometry args={[R + 0.4, R + 0.4, 0.64, 20, 1, false, 0, Math.PI]} />
          </InstancedShape>
          <InstancedBoxes items={data.keystones} roughness={0.95} />
          <InstancedShape items={data.oculi} color="#ffe6b0" emissive="#ffce8a" emissiveIntensity={1.1} side={DoubleSide}>
            <circleGeometry args={[0.5, 18]} />
          </InstancedShape>
          <InstancedShape items={data.oculusRings} color={STONE_DARK} roughness={1}>
            <torusGeometry args={[0.52, 0.08, 8, 20]} />
          </InstancedShape>
        </>
      )}
    </group>
  )
}

type StairData = { side: number; steps: { pos: [number, number, number]; size: [number, number, number] }[] }

/** Both grand staircases rendered as instanced batches: every step, stringer,
 *  handrail, baluster, newel post and newel lantern across both stairs collapses
 *  to one draw per part. Only the steps (the big silhouette) cast shadow; the
 *  thin banister parts are dropped from the shadow pass to keep it cheap. */
function Staircases({ stairs, wood }: { stairs: StairData[]; wood: Texture }) {
  const data = useMemo(() => {
    const steps: ShapeItem[] = []
    const nosings: ShapeItem[] = []
    const stringers: ShapeItem[] = []
    const handrails: ShapeItem[] = []
    const balusters: BoxItem[] = []
    const newels: BoxItem[] = []
    const lanterns: ShapeItem[] = []

    for (const sc of stairs) {
      const first = sc.steps[0]
      const last = sc.steps[sc.steps.length - 1]
      const x = first.pos[0]
      const halfW = first.size[0] / 2
      const zB = first.pos[2]
      const yB = first.pos[1]
      const zT = last.pos[2]
      const yT = last.pos[1]
      const dz = zB - zT
      const dy = yT - yB
      const len = Math.hypot(dz, dy)
      const angle = Math.atan2(dy, dz)
      const midZ = (zB + zT) / 2
      const railY = (yB + yT) / 2 + 1.05

      for (const stp of sc.steps) {
        steps.push({ pos: stp.pos, scale: stp.size })
        // a bright nosing strip along each tread's leading edge so every step
        // reads as a distinct, sharp step instead of merging into a ramp
        const frontZ = stp.pos[2] + stp.size[2] / 2
        const topY = stp.pos[1] + stp.size[1] / 2
        nosings.push({ pos: [stp.pos[0], topY + 0.005, frontZ - 0.03], scale: [stp.size[0] + 0.06, 0.06, 0.12] })
      }

      for (const sx of [-1, 1]) {
        const rx = x + sx * (halfW - 0.12)
        stringers.push({ pos: [rx, (yB + yT) / 2 - 0.1, midZ], rot: [angle, 0, 0], scale: [0.22, 0.7, len + 0.6] })
        handrails.push({ pos: [rx, railY, midZ], rot: [angle, 0, 0], scale: [0.16, 0.16, len + 0.4] })
        for (let i = 1; i < 10; i++) {
          const f = i / 10
          balusters.push({ pos: [rx, yB + dy * f + 0.55, zB - dz * f], size: [0.07, 1.0, 0.07] })
        }
        for (const p of [
          { z: zB, y: yB },
          { z: zT, y: yT },
        ]) {
          newels.push({ pos: [rx, p.y + 0.7, p.z], size: [0.22, 1.4, 0.22] })
          lanterns.push({ pos: [rx, p.y + 1.55, p.z] })
        }
      }
    }
    return { steps, nosings, stringers, handrails, balusters, newels, lanterns }
  }, [stairs])

  return (
    <group>
      <InstancedShape items={data.steps} map={wood} color="#a9803f" roughness={0.8} castShadow receiveShadow>
        <boxGeometry />
      </InstancedShape>
      {/* bright tread nosings — make each step edge crisp and legible */}
      <InstancedShape items={data.nosings} color="#d8b06a" roughness={0.5} metalness={0.1}>
        <boxGeometry />
      </InstancedShape>
      <InstancedShape items={data.stringers} color="#6b4a25" roughness={0.85}>
        <boxGeometry />
      </InstancedShape>
      <InstancedShape items={data.handrails} color="#7a5230" roughness={0.6} metalness={0.1}>
        <boxGeometry />
      </InstancedShape>
      <InstancedBoxes items={data.balusters} color="#5a3d22" roughness={0.85} />
      <InstancedBoxes items={data.newels} color="#5a3d22" roughness={0.85} />
      <InstancedShape items={data.lanterns} color="#fff0c8" emissive="#ffb24a" emissiveIntensity={1.9}>
        <sphereGeometry args={[0.16, 12, 12]} />
      </InstancedShape>
    </group>
  )
}

/**
 * Every pillar in the hall, built as ancient weathered STONE — not smooth
 * cylinders. The shaft is a stack of instanced ashlar/rock blocks clustered
 * around the axis with per-block jitter (offset, scale, tilt, tone) so the
 * silhouette is irregular, chunky and rocky. A darker rocky core sits behind the
 * blocks so no gaps show through. Around it: a stepped worn plinth, carved
 * relief rings, a warm amber glyph band, a flared rocky capital with volutes,
 * plus cracks and moss for age. Everything is instanced — the whole hall of
 * pillars collapses to a handful of draw calls.
 */
function Pillars({ cols, h, stoneNormal }: { cols: [number, number, number][]; h: number; stoneNormal: Texture }) {
  const shaftH = h - 1.6
  const ROT_X: [number, number, number] = [Math.PI / 2, 0, 0]
  // ancient palette — warm weathered brown stone, dark worn base, mossy green, amber
  const STONE_ANC = '#8a7350'
  const STONE_ANC_DARK = '#5e4a30'
  const MOSS = '#566233'
  const CRACK = '#2c261d'
  const GLYPH = '#c9a24a'

  // stable per-(pillar,block) pseudo-random so the rock layout never shifts
  const rnd = (seed: number) => {
    let s = (seed * 2654435761) >>> 0
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 0xffffffff
    }
  }

  const { boxes, astragals, reliefRings, glyphAccents, cracks, moss, shafts } = useMemo(() => {
    const boxes: BoxItem[] = []
    const astragals: ShapeItem[] = []
    const reliefRings: ShapeItem[] = []
    const glyphAccents: ShapeItem[] = []
    const cracks: BoxItem[] = []
    const moss: BoxItem[] = []
    const shafts: ShapeItem[] = []

    const shaftBottom = 0.95
    // stop the shaft below the capital so it never grows up into the big
    // hanging lantern that sits near the top of the pillar
    const shaftTop = h - 2.6

    cols.forEach(([x, , z], i) => {
      const r = rnd(i * 131 + 17)
      // stepped, worn plinth (base plinth + cap slab)
      boxes.push({ pos: [x, 0.28, z], size: [1.95, 0.56, 1.95], color: STONE_ANC_DARK })
      boxes.push({ pos: [x, 0.7, z], size: [1.55, 0.34, 1.55], color: STONE_ANC })
      // capital abacus slab under the balcony
      boxes.push({ pos: [x, h - 0.22, z], size: [1.7, 0.44, 1.7], color: STONE_ANC_DARK })
      // worn, mossy plinth base — green patches clinging to the stone
      moss.push({ pos: [x - 0.7, 0.35, z - 0.7], size: [0.5, 0.18, 0.5], color: MOSS })
      moss.push({ pos: [x + 0.65, 0.3, z + 0.6], size: [0.45, 0.14, 0.45], color: MOSS })

      // plain fluted stone shaft — no rocky blocks
      shafts.push({ pos: [x, (shaftBottom + shaftTop) / 2, z] })

      // base & neck astragal moldings
      astragals.push({ pos: [x, 1.45, z], rot: ROT_X })
      astragals.push({ pos: [x, h - 2.0, z], rot: ROT_X })
      // carved meander-style relief rings down the shaft (ancient temple feel)
      reliefRings.push({ pos: [x, shaftH * 0.34 + 0.95, z], rot: ROT_X })
      reliefRings.push({ pos: [x, shaftH * 0.62 + 0.95, z], rot: ROT_X })
      // warm amber glyph band (carved symbols, faintly glowing — ancient, not sci-fi)
      glyphAccents.push({ pos: [x, 4.25, z], rot: ROT_X })
      glyphAccents.push({ pos: [x, 4.95, z], rot: ROT_X })
      // cracks — thin dark fissures climbing the weathered shaft
      const a1 = rnd(i * 7 + 3)() * Math.PI * 2
      const a2 = rnd(i * 7 + 11)() * Math.PI * 2
      cracks.push({
        pos: [x + Math.cos(a1) * 0.62, shaftH * 0.5 + 0.95, z + Math.sin(a1) * 0.62],
        size: [0.04, shaftH * 0.55, 0.04],
        rotY: -a1,
        color: CRACK,
      })
      cracks.push({
        pos: [x + Math.cos(a2) * 0.6, shaftH * 0.28 + 0.95, z + Math.sin(a2) * 0.6],
        size: [0.035, shaftH * 0.32, 0.035],
        rotY: -a2,
        color: CRACK,
      })
    })
    return { boxes, astragals, reliefRings, glyphAccents, cracks, moss, shafts }
  }, [cols, h, shaftH])

  const capitals = useMemo<ShapeItem[]>(() => cols.map(([x, , z]) => ({ pos: [x, h - 0.85, z] })), [cols, h])
  const volutes = useMemo<ShapeItem[]>(() => cols.flatMap(([x, , z]) => [
    { pos: [x - 0.62, h - 0.55, z], rot: [0, 0, Math.PI / 2] as [number, number, number] },
    { pos: [x + 0.62, h - 0.55, z], rot: [0, 0, Math.PI / 2] as [number, number, number] },
  ]), [cols, h])
  const glyphBands = useMemo<ShapeItem[]>(() => cols.map(([x, , z]) => ({ pos: [x, 4.6, z] })), [cols])

  return (
    <group>
      <InstancedBoxes items={boxes} roughness={0.92} castShadow receiveShadow />
      {/* mossy, weathered plinth patches */}
      <InstancedBoxes items={moss} roughness={1} metalness={0} />
      {/* cracks in the aged stone */}
      <InstancedBoxes items={cracks} roughness={1} />
      {/* plain fluted stone shaft — weathered stone normal map for carved depth */}
      <InstancedShape items={shafts} color={STONE_ANC} normalMap={stoneNormal} roughness={0.85} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.62, shaftH - 0.2, 24, 1]} />
      </InstancedShape>
      {/* flared capital — small ornamental cap, no shadow needed */}
      <InstancedShape items={capitals} color={STONE_ANC} normalMap={stoneNormal} roughness={0.88}>
        <cylinderGeometry args={[0.82, 0.5, 0.9, 24]} />
      </InstancedShape>
      {/* ionic-style volutes (scrolls) at the capital corners */}
      <InstancedShape items={volutes} color={STONE_ANC_DARK} roughness={0.85}>
        <torusGeometry args={[0.22, 0.08, 8, 16]} />
      </InstancedShape>
      {/* carved astragal moldings */}
      <InstancedShape items={astragals} color={STONE_ANC_DARK} roughness={0.88}>
        <torusGeometry args={[0.66, 0.09, 8, 24]} />
      </InstancedShape>
      {/* carved meander relief rings down the shaft */}
      <InstancedShape items={reliefRings} color={STONE_ANC_DARK} roughness={0.9}>
        <torusGeometry args={[0.64, 0.07, 8, 24]} />
      </InstancedShape>
      {/* warm amber glyph band — ancient carved symbols, faint glow */}
      <InstancedShape items={glyphBands} color="#3a2e16" emissive={GLYPH} emissiveIntensity={0.55} roughness={0.6} side={DoubleSide}>
        <cylinderGeometry args={[0.6, 0.6, 0.7, 24, 1, true]} />
      </InstancedShape>
      {/* amber accent rings framing the glyph band */}
      <InstancedShape items={glyphAccents} color={GLYPH} metalness={0.5} roughness={0.45} emissive="#3a2c10" emissiveIntensity={0.35}>
        <torusGeometry args={[0.61, 0.05, 8, 24]} />
      </InstancedShape>

    </group>
  )
}
