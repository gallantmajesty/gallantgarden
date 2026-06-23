import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type MeshStandardMaterial, type Texture } from 'three'
import { HALL, WINDOW, windowStep, windowZs } from './layout'
import { balconyPlatforms, columns, GALLERY_FRONT_Z, staircases } from './furniture'
import { makePlasterTexture, makeStainedGlassTexture, makeWoodTexture } from './textures'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from './Instanced'
import { env } from './env'
import { useScenePreset } from '../../store/quality'

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
  const balconyWood = useMemo(() => makeWoodTexture(10, 13), [])
  const plaster = useMemo(() => makePlasterTexture(4, 19), [])
  const glass = useMemo(() => makeStainedGlassTexture(5), [])
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
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial map={wood} roughness={0.7} metalness={0.04} />
      </mesh>

      {/* ceiling + beams */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallH, 0]}>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial color={CEIL} roughness={1} side={DoubleSide} />
      </mesh>
      {/* ceiling beams — one instanced draw (was one mesh per beam) */}
      <InstancedBoxes items={beamItems} roughness={0.9} castShadow />

      {/* end walls */}
      {[-1, 1].map((s) => (
        <mesh key={`end-${s}`} position={[0, wallH / 2, s * (halfL + 0.3)]} receiveShadow>
          <boxGeometry args={[halfW * 2 + 1.2, wallH, 0.6]} />
          <meshStandardMaterial map={plaster} color={STONE} roughness={1} />
        </mesh>
      ))}

      {/* long window-walls — solid plaster spandrels above/below + every bay's
          glass, tracery and arch built as instanced batches (was ~6-9 meshes per
          bay × 22 bays). */}
      <WindowWalls glass={glass} plaster={plaster} windowDetail={preset.windowDetail} />

      {/* columns — carved magical pillars (plinth, fluted shaft, glowing rune
          band, capital). Every pillar in the hall is built from a handful of
          INSTANCED batches instead of ~12 meshes each (~216 → 6 draws). */}
      <Pillars cols={cols} h={wallH} />

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
      <InstancedBoxes items={balusters} color={STONE_DARK} roughness={0.8} castShadow />

      {/* grand staircases with stringers, carved banisters, newels & lanterns */}
      {/* grand staircases — steps, stringers, banisters, balusters, newels &
          lanterns for both stairs as a handful of instanced batches */}
      <Staircases stairs={stairs} wood={balconyWood} />

      {/* fireplace on the far wall */}
      <group position={[0, 0, -halfL + 0.4]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[6, 4, 1.2]} />
          <meshStandardMaterial color="#5b5048" roughness={1} />
        </mesh>
        <mesh position={[0, 1.2, 0.3]}>
          <boxGeometry args={[3.4, 2.2, 0.8]} />
          <meshStandardMaterial color="#0c0907" roughness={1} />
        </mesh>
        {/* embers (glow via bloom) */}
        <mesh position={[0, 0.5, 0.6]}>
          <boxGeometry args={[2.6, 0.5, 0.5]} />
          <meshStandardMaterial color="#ff7a2a" emissive="#ff7a2a" emissiveIntensity={2.6} />
        </mesh>
        {/* real firelight — dropped on Low (the emissive embers + bloom still
            read as a fire) so the weakest GPUs carry one fewer dynamic light */}
        {realLights && <pointLight position={[0, 1.2, 1.2]} intensity={9} distance={14} decay={2} color="#ff8a3a" />}
      </group>
    </group>
  )
}

/** Both long window-walls as instanced batches. The solid plaster spandrels and
 *  the mullions/tracery/glass/arches for all ~22 bays collapse to a fixed handful
 *  of draw calls regardless of bay count (was ~6-9 meshes per bay). The
 *  high-quality ornamental ring/keystone/oculus stay gated behind `windowDetail`. */
function WindowWalls({ glass, plaster, windowDetail }: { glass: Texture; plaster: Texture; windowDetail: boolean }) {
  const { halfW, halfL, wallH } = HALL
  const glassMat = useRef<MeshStandardMaterial>(null)

  // make the stained glass read as a lit lantern wall after dark: subtle wash by
  // day, a strong warm glow at night so the hall is bathed in jewelled light.
  useFrame(() => {
    if (glassMat.current) glassMat.current.emissiveIntensity = 0.45 + (1 - env.dayFactor) * 2.1
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
              <meshStandardMaterial map={plaster} color={STONE} roughness={1} />
            </mesh>
            <mesh position={[x, (WINDOW.headY + wallH) / 2, 0]} receiveShadow>
              <boxGeometry args={[0.6, wallH - WINDOW.headY, halfL * 2]} />
              <meshStandardMaterial map={plaster} color={STONE} roughness={1} />
            </mesh>
          </group>
        )
      })}

      <InstancedBoxes items={data.mullions} roughness={1} />
      <InstancedBoxes items={data.bayBoxes} roughness={1} />

      {/* stained glass (main panels) — one instanced draw for every bay; its
          emissive glow is animated up at night (see useFrame above) */}
      <InstancedShape items={data.glassPanes} materialRef={glassMat} map={glass} emissiveMap={glass} emissive="#ffffff" emissiveIntensity={0.5} transparent opacity={0.92} roughness={0.4} metalness={0.1} side={DoubleSide}>
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

/** Every carved pillar in the hall, rendered as a few instanced batches: stepped
 *  plinth, gently tapered fluted shaft, a band of softly glowing runes at eye
 *  level, and a flared capital under the balcony. One draw per distinct part
 *  across all columns instead of ~12 meshes per pillar. */
function Pillars({ cols, h }: { cols: [number, number, number][]; h: number }) {
  const shaftH = h - 1.6
  const ROT_X: [number, number, number] = [Math.PI / 2, 0, 0]

  const { boxes, astragals, runeAccents } = useMemo(() => {
    const boxes: BoxItem[] = []
    const astragals: ShapeItem[] = []
    const runeAccents: ShapeItem[] = []
    for (const [x, , z] of cols) {
      // plinth (base + cap) and capital abacus — all boxes
      boxes.push({ pos: [x, 0.3, z], size: [1.7, 0.6, 1.7], color: STONE_DARK })
      boxes.push({ pos: [x, 0.75, z], size: [1.4, 0.3, 1.4], color: STONE })
      boxes.push({ pos: [x, h - 0.2, z], size: [1.5, 0.4, 1.5], color: STONE_DARK })
      // base & neck astragal rings
      astragals.push({ pos: [x, 1.4, z], rot: ROT_X })
      astragals.push({ pos: [x, h - 1.9, z], rot: ROT_X })
      // magical accent rings framing the runes
      runeAccents.push({ pos: [x, 4.25, z], rot: ROT_X })
      runeAccents.push({ pos: [x, 4.95, z], rot: ROT_X })
    }
    return { boxes, astragals, runeAccents }
  }, [cols, h])

  const shafts = useMemo<ShapeItem[]>(() => cols.map(([x, , z]) => ({ pos: [x, 0.9 + shaftH / 2, z] })), [cols, shaftH])
  const capitals = useMemo<ShapeItem[]>(() => cols.map(([x, , z]) => ({ pos: [x, h - 0.7, z] })), [cols, h])
  const runeBands = useMemo<ShapeItem[]>(() => cols.map(([x, , z]) => ({ pos: [x, 4.6, z] })), [cols])

  return (
    <group>
      <InstancedBoxes items={boxes} roughness={0.9} castShadow receiveShadow />
      {/* fluted shaft */}
      <InstancedShape items={shafts} color={STONE} roughness={0.8} castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.66, shaftH, 24, 1]} />
      </InstancedShape>
      {/* flared capital */}
      <InstancedShape items={capitals} color={STONE} roughness={0.85} castShadow>
        <cylinderGeometry args={[0.78, 0.5, 0.8, 24]} />
      </InstancedShape>
      {/* carved astragal moldings */}
      <InstancedShape items={astragals} color={STONE_DARK} roughness={0.85}>
        <torusGeometry args={[0.66, 0.09, 8, 24]} />
      </InstancedShape>
      {/* glowing rune band at eye level */}
      <InstancedShape items={runeBands} color="#5a4a8a" emissive="#8a6cff" emissiveIntensity={0.85} roughness={0.5} side={DoubleSide}>
        <cylinderGeometry args={[0.6, 0.6, 0.7, 24, 1, true]} />
      </InstancedShape>
      {/* magical accent rings framing the runes */}
      <InstancedShape items={runeAccents} color="#caa84a" metalness={0.6} roughness={0.35} emissive="#3a2c10" emissiveIntensity={0.4}>
        <torusGeometry args={[0.61, 0.05, 8, 24]} />
      </InstancedShape>
    </group>
  )
}
