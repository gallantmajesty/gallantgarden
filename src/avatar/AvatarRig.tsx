import { useImperativeHandle, useMemo, useRef } from 'react'
import { Group, type MeshStandardMaterial } from 'three'
import {
  boxGeo,
  eyeHex,
  hairHex,
  shoeHex,
  skinHex,
  skirtGeo,
  sphereGeo,
  taperGeo,
  torsoGeo,
  torusGeo,
  topHex,
  bottomHex,
  sharedMaterial,
  type AvatarConfig,
  type TorsoRing,
} from './config'
import { heightScale, proportionsFor, type BoneName, type Proportions } from './rig'

// The animator drives the avatar by writing rotations onto these groups every
// frame. Collecting them into a typed map (filled once on mount) avoids any
// per-frame scene-graph traversal.
export type BoneMap = Partial<Record<BoneName, Group>>

export interface AvatarRigHandle {
  bones: BoneMap
  /** the eye-lid group, toggled by the blink driver (scale.y 0 open → 1 closed) */
  lids: Group | null
  root: Group | null
}

type Mat = MeshStandardMaterial
type V3 = [number, number, number]

/**
 * Cross-section rings for the single-mesh torso (see config.torsoGeo), expressed
 * in SPINE-LOCAL space (the mesh is parented to the spine bone, which sits at
 * hips + 0.05). The profile is deliberately simple — hips → slight waist pinch →
 * chest → slightly-wider shoulders → taper to the neck base — so the body reads
 * as one clean Roblox-style volume, never a stack of segments. Female gets a
 * forward-offset, slightly deeper chest ring (`cz`) for a subtle bust without
 * thickening the back. Widths stay inside the arm pivots (±shoulderW) so straight
 * arms still hang clear of the torso.
 */
function torsoRings(P: Proportions, bodyType: AvatarConfig['bodyType']): TorsoRing[] {
  const female = bodyType === 'female'
  const spine = P.spineLen
  const chest = P.chestLen
  return [
    // hips — meets the pelvis/leg tops
    { y: -0.06, hw: P.hipBoneW * 1.04, hd: P.torsoD * 0.92 },
    // waist — the slight taper
    { y: spine * 0.5, hw: P.waistW * 1.02, hd: P.torsoD * 0.84 },
    // chest — full volume (bust pushes forward for female)
    { y: spine + chest * 0.38, hw: P.chestW, hd: P.torsoD * (female ? 1.0 : 0.96), cz: female ? P.bust * 0.6 : 0 },
    // shoulders — widest, but well inside the ±shoulderW arm pivots
    { y: spine + chest * 0.72, hw: P.shoulderW * 0.82, hd: P.torsoD * 0.82 },
    // neck base — taper in so the shoulders round into the neck (ends just below
    // the neck joint at chest*0.86 so the neck stays visible above the torso)
    { y: spine + chest * 0.82, hw: P.neckR * 1.55, hd: P.neckR * 1.55 },
  ]
}

/**
 * A stylized fantasy humanoid assembled from a handful of shared primitive
 * geometries (ellipsoids, tapered limb tubes, domes) and shared/cached materials.
 * No geometry or material is allocated per-avatar beyond the small set of <group>
 * bones, so many avatars stay cheap — the single biggest 60-FPS lever.
 *
 * The bone hierarchy still mirrors rig.ts so the procedural animator is unchanged:
 *   root > hips > spine > chest > (neck > head) + arms ; legs hang from root.
 * Each "bone" is a Group at its joint; the visible segment hangs below the joint
 * so a rotation swings the limb naturally (shoulder / hip / knee / elbow).
 *
 * Visual goals over the old box-mannequin: an egg-shaped head with aligned eyes,
 * brows, nose, mouth and ears; flowing multi-strand hair; tapered limbs with
 * sphere joints; real hands and feet; and clothing that hugs the silhouette.
 */
export function AvatarRig({
  config,
  ref,
}: {
  config: AvatarConfig
  ref?: React.Ref<AvatarRigHandle>
}) {
  const rootRef = useRef<Group>(null)
  const lidsRef = useRef<Group>(null)
  const bones = useMemo<BoneMap>(() => ({}), [])

  useImperativeHandle(ref, () => ({ bones, lids: lidsRef.current, root: rootRef.current }), [bones])

  const P = proportionsFor(config.bodyType)
  const s = heightScale(config.height)

  // shared material lookups (cached globally by colour/finish)
  const skin = sharedMaterial(skinHex(config.skin), 0.78)
  const hairM = sharedMaterial(hairHex(config.hairColor), 0.62)
  // Garment colour is a fixed property of the cosmetic item (no per-avatar picker).
  const topM = sharedMaterial(topHex(config.top), 0.82)
  const botM = sharedMaterial(bottomHex(config.bottom), 0.82)
  const shoeM = sharedMaterial(shoeHex(config.shoes), 0.5)
  const shoeAccent = sharedMaterial('#f2efe8', 0.5)
  const eyeWhite = sharedMaterial('#f6f3ec', 0.3)
  const iris = sharedMaterial(eyeHex(config.eyes), 0.25)
  const pupil = sharedMaterial('#1b1410', 0.2)
  const mouthM = sharedMaterial('#9c5b54', 0.55)

  const bind = (name: BoneName) => (g: Group | null) => {
    if (g) bones[name] = g
  }

  const sleeved = config.top !== 'tee'
  const armMat = sleeved ? topM : skin

  return (
    <group ref={rootRef} scale={s}>
      {/* hips: pelvis pivot. spine rises from here; legs hang from root below. */}
      <group ref={bind('hips')} position={[0, P.hipsY, 0]}>
        {/* pelvis: a slim pants waistband under the shirt (the only torso piece in
            the bottom colour) — it tucks under the single torso mesh and meets the
            leg tops, so there is no same-colour stacked segment. */}
        <Blob m={botM} s={[P.hipBoneW, 0.13, P.torsoD * 0.9]} p={[0, -0.04, 0]} cast />

        {/* spine -> chest -> neck -> head */}
        <group ref={bind('spine')} position={[0, 0.05, 0]}>
          {/* ONE continuous torso mesh (hips -> waist -> chest -> shoulders),
              replacing the old stack of ellipsoids — clean Roblox-style silhouette. */}
          <mesh geometry={torsoGeo(torsoRings(P, config.bodyType))} material={topM} castShadow />

          <group ref={bind('chest')} position={[0, P.spineLen, 0]}>
            <Top config={config} P={P} topM={topM} />

            {/* neck + head */}
            <group ref={bind('neck')} position={[0, P.chestLen * 0.86, 0]}>
              <mesh geometry={taperGeo(P.neckR, P.neckR * 1.15, P.neckLen)} material={skin} position={[0, P.neckLen / 2, 0]} />
              <group ref={bind('head')} position={[0, P.neckLen, 0]}>
                <Head P={P} skin={skin} eyeWhite={eyeWhite} iris={iris} pupil={pupil} mouthM={mouthM} hairM={hairM} bodyType={config.bodyType} lidsRef={lidsRef} />
                <Hair config={config} P={P} hairM={hairM} />
              </group>
            </group>
          </group>
        </group>

        {/* skirt sways with the hips */}
        <Bottom config={config} P={P} botM={botM} />

        {/* arms hang from the hips group so torso sway carries them (as before) */}
        <Arm side="L" bind={bind} P={P} skin={skin} armMat={armMat} sleeved={sleeved} topM={topM} />
        <Arm side="R" bind={bind} P={P} skin={skin} armMat={armMat} sleeved={sleeved} topM={topM} />
      </group>

      {/* legs hang from the root at hip height (independent of torso lean) */}
      <Leg side="L" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} />
      <Leg side="R" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} />
    </group>
  )
}

/* ------------------------------------------------------------- shared shapes */

/** A unit-sphere scaled into an ellipsoid. One geometry shared by the whole body. */
function Blob({ m, s, p, r, cast }: { m: Mat; s: V3; p: V3; r?: V3; cast?: boolean }) {
  return <mesh geometry={sphereGeo(1)} material={m} scale={s} position={p} rotation={r} castShadow={cast} />
}

/* --------------------------------------------------------------------- head */

function Head({
  P,
  skin,
  eyeWhite,
  iris,
  pupil,
  mouthM,
  hairM,
  bodyType,
  lidsRef,
}: {
  P: Proportions
  skin: Mat
  eyeWhite: Mat
  iris: Mat
  pupil: Mat
  mouthM: Mat
  hairM: Mat
  bodyType: AvatarConfig['bodyType']
  lidsRef: React.Ref<Group>
}) {
  const r = P.headR
  // the head sits above the neck joint; everything below is in head-centre space
  const cy = r * 0.92
  const fz = r * 0.72 // face plane (front +Z), eyes/nose/mouth ride near here
  // big, low-set chibi eyes spaced wide across the face
  const eyeX = r * 0.4
  const eyeY = -r * 0.05
  const browArch = bodyType === 'female' ? 0.16 : 0.06
  return (
    <group position={[0, cy, 0]}>
      {/* cranium: a big, near-round chibi head (the silhouette's defining mass) */}
      <Blob m={skin} s={[r * 0.99, r * 1.0, r * 0.97]} p={[0, 0, 0]} cast />
      {/* soft, gentle jaw — no harsh chin, just rounds the lower head */}
      <Blob m={skin} s={[r * 0.74, r * 0.5, r * 0.74]} p={[0, -r * 0.64, r * 0.04]} />

      {/* eyes: big and shiny, both clearly visible on a common line */}
      <Eye x={-eyeX} y={eyeY} z={fz} r={r} eyeWhite={eyeWhite} iris={iris} pupil={pupil} />
      <Eye x={eyeX} y={eyeY} z={fz} r={r} eyeWhite={eyeWhite} iris={iris} pupil={pupil} />

      {/* brows: short, soft strokes above each eye */}
      <mesh geometry={boxGeo(r * 0.3, r * 0.055, r * 0.06)} material={hairM} position={[-eyeX, eyeY + r * 0.34, fz + r * 0.04]} rotation={[0, 0, browArch]} />
      <mesh geometry={boxGeo(r * 0.3, r * 0.055, r * 0.06)} material={hairM} position={[eyeX, eyeY + r * 0.34, fz + r * 0.04]} rotation={[0, 0, -browArch]} />

      {/* nose: a single tiny soft tip (no bridge — keeps the face clean) */}
      <Blob m={skin} s={[r * 0.07, r * 0.06, r * 0.08]} p={[0, eyeY - r * 0.26, fz + r * 0.12]} />

      {/* mouth: a small soft smile (fuller for female) */}
      <Blob m={mouthM} s={[r * 0.16, bodyType === 'female' ? r * 0.06 : r * 0.045, r * 0.05]} p={[0, -r * 0.5, fz + r * 0.04]} />

      {/* ears: small, tucked to the sides */}
      <Blob m={skin} s={[r * 0.09, r * 0.16, r * 0.12]} p={[-r * 0.95, eyeY, -r * 0.04]} />
      <Blob m={skin} s={[r * 0.09, r * 0.16, r * 0.12]} p={[r * 0.95, eyeY, -r * 0.04]} />

      {/* blink lids: skin quads that drop over the eyes (scale.y 0 open → 1 closed) */}
      <group ref={lidsRef} scale={[1, 0, 1]} position={[0, eyeY + r * 0.04, fz + r * 0.06]}>
        <mesh geometry={boxGeo(r * 0.36, r * 0.34, r * 0.05)} material={skin} position={[-eyeX, 0, 0]} />
        <mesh geometry={boxGeo(r * 0.36, r * 0.34, r * 0.05)} material={skin} position={[eyeX, 0, 0]} />
      </group>
    </group>
  )
}

function Eye({ x, y, z, r, eyeWhite, iris, pupil }: { x: number; y: number; z: number; r: number; eyeWhite: Mat; iris: Mat; pupil: Mat }) {
  // Big chibi eye: a tall white oval, a large coloured iris, a pupil, and a small
  // white catchlight (the eyeWhite material) that gives it a lively, shiny read.
  return (
    <group position={[x, y, z]}>
      <Blob m={eyeWhite} s={[r * 0.24, r * 0.3, r * 0.13]} p={[0, 0, 0]} />
      <Blob m={iris} s={[r * 0.18, r * 0.21, r * 0.1]} p={[0, -r * 0.02, r * 0.06]} />
      <Blob m={pupil} s={[r * 0.09, r * 0.11, r * 0.06]} p={[0, -r * 0.02, r * 0.11]} />
      <Blob m={eyeWhite} s={[r * 0.05, r * 0.06, r * 0.03]} p={[r * 0.06, r * 0.08, r * 0.14]} />
    </group>
  )
}

/* --------------------------------------------------------------------- hair */
// Multi-piece flowing hair: a scalp cap that hugs the crown plus style-specific
// fringe / sweep / fall / bun made from soft ellipsoids and tapered strands —
// intentionally rounded, never boxy.

function Strand({ m, len, rTop, rBot, p, rot }: { m: Mat; len: number; rTop: number; rBot: number; p: V3; rot?: V3 }) {
  return (
    <group position={p} rotation={rot}>
      <mesh geometry={taperGeo(rTop, rBot, len)} material={m} position={[0, -len / 2, 0]} />
    </group>
  )
}

function Hair({ config, P, hairM }: { config: AvatarConfig; P: Proportions; hairM: Mat }) {
  const r = P.headR
  const cy = r * 0.95 // head-centre offset (matches Head)
  // scalp cap: an ellipsoid shell sitting over the crown, pushed up and back
  const cap = (scale: V3, lift = 0.18) => <Blob m={hairM} s={scale} p={[0, cy + r * lift, -r * 0.06]} />

  switch (config.hair) {
    case 'none':
      return null
    case 'buzz':
      return cap([r * 1.0, r * 0.92, r * 1.02], 0.08)
    case 'short':
      return (
        <group>
          {cap([r * 1.06, r * 1.0, r * 1.06], 0.14)}
          {/* soft fringe across the forehead */}
          <Blob m={hairM} s={[r * 0.9, r * 0.28, r * 0.4]} p={[0, cy + r * 0.5, r * 0.66]} r={[0.5, 0, 0]} />
          <Blob m={hairM} s={[r * 0.4, r * 0.26, r * 0.36]} p={[-r * 0.5, cy + r * 0.46, r * 0.5]} r={[0.4, 0, 0.3]} />
          <Blob m={hairM} s={[r * 0.4, r * 0.26, r * 0.36]} p={[r * 0.5, cy + r * 0.46, r * 0.5]} r={[0.4, 0, -0.3]} />
        </group>
      )
    case 'medium':
      // side-swept: a cap plus a sweep of strands arcing across the brow
      return (
        <group>
          {cap([r * 1.08, r * 1.04, r * 1.08], 0.16)}
          <Strand m={hairM} len={r * 1.3} rTop={r * 0.34} rBot={r * 0.12} p={[r * 0.55, cy + r * 0.8, r * 0.5]} rot={[0.5, 0, -0.9]} />
          <Strand m={hairM} len={r * 1.1} rTop={r * 0.28} rBot={r * 0.1} p={[r * 0.2, cy + r * 0.86, r * 0.62]} rot={[0.7, 0, -0.6]} />
          <Blob m={hairM} s={[r * 0.5, r * 0.7, r * 0.55]} p={[-r * 0.78, cy + r * 0.1, -r * 0.05]} />
        </group>
      )
    case 'long':
      // a fuller cap, face-framing side strands, and a back fall to the shoulders
      return (
        <group>
          {cap([r * 1.12, r * 1.08, r * 1.12], 0.16)}
          {/* back fall */}
          <Strand m={hairM} len={r * 3.0} rTop={r * 1.0} rBot={r * 0.5} p={[0, cy + r * 0.5, -r * 0.7]} rot={[-0.12, 0, 0]} />
          {/* face-framing strands */}
          <Strand m={hairM} len={r * 2.2} rTop={r * 0.36} rBot={r * 0.16} p={[-r * 0.85, cy + r * 0.35, r * 0.1]} rot={[0, 0, 0.12]} />
          <Strand m={hairM} len={r * 2.2} rTop={r * 0.36} rBot={r * 0.16} p={[r * 0.85, cy + r * 0.35, r * 0.1]} rot={[0, 0, -0.12]} />
          {/* fringe */}
          <Blob m={hairM} s={[r * 0.85, r * 0.26, r * 0.4]} p={[0, cy + r * 0.55, r * 0.62]} r={[0.5, 0, 0]} />
        </group>
      )
    case 'bun':
      return (
        <group>
          {cap([r * 1.04, r * 1.0, r * 1.04], 0.12)}
          {/* top knot */}
          <Blob m={hairM} s={[r * 0.42, r * 0.42, r * 0.42]} p={[0, cy + r * 1.05, -r * 0.05]} />
          <mesh geometry={torusGeo(r * 0.42, r * 0.12)} material={hairM} position={[0, cy + r * 0.95, -r * 0.05]} rotation={[Math.PI / 2, 0, 0]} />
          {/* small fringe */}
          <Blob m={hairM} s={[r * 0.8, r * 0.2, r * 0.36]} p={[0, cy + r * 0.52, r * 0.62]} r={[0.5, 0, 0]} />
        </group>
      )
    case 'twintails':
      // a soft cap + forehead fringe, with a bunched ponytail tied high on each
      // side that tapers down past the shoulders — the female starter look.
      return (
        <group>
          {cap([r * 1.08, r * 1.04, r * 1.08], 0.15)}
          {/* fringe across the forehead */}
          <Blob m={hairM} s={[r * 0.88, r * 0.26, r * 0.4]} p={[0, cy + r * 0.5, r * 0.64]} r={[0.5, 0, 0]} />
          {/* face-framing wisps */}
          <Blob m={hairM} s={[r * 0.34, r * 0.6, r * 0.4]} p={[-r * 0.86, cy + r * 0.15, r * 0.12]} />
          <Blob m={hairM} s={[r * 0.34, r * 0.6, r * 0.4]} p={[r * 0.86, cy + r * 0.15, r * 0.12]} />
          {[-1, 1].map((sx) => (
            <group key={sx}>
              {/* tie knot high on the side of the head */}
              <Blob m={hairM} s={[r * 0.3, r * 0.3, r * 0.3]} p={[sx * r * 0.95, cy + r * 0.6, -r * 0.02]} />
              {/* ponytail: a fuller upper bunch tapering to a tip, angled outward */}
              <Strand m={hairM} len={r * 2.0} rTop={r * 0.44} rBot={r * 0.13} p={[sx * r * 1.08, cy + r * 0.52, -r * 0.05]} rot={[-0.12, 0, sx * 0.5]} />
            </group>
          ))}
        </group>
      )
    default:
      return null
  }
}

/* --------------------------------------------------------------------- arms */

function Arm({
  side,
  bind,
  P,
  skin,
  armMat,
  sleeved,
  topM,
}: {
  side: 'L' | 'R'
  bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions
  skin: Mat
  armMat: Mat
  sleeved: boolean
  topM: Mat
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'armUpperL' : 'armUpperR'
  const lower: BoneName = side === 'L' ? 'armLowerL' : 'armLowerR'
  // shoulder pivot near the top of the chest, just outside the torso.
  // Y is relative to the hips group (which already sits at P.hipsY).
  return (
    <group ref={bind(upper)} position={[sign * P.shoulderW, 0.05 + P.spineLen + P.chestLen * 0.72, 0]}>
      {/* shoulder is ALWAYS clothed (every top is a garment): a smooth, modest
          deltoid in the top colour, sized to merge into the torso's shoulder ring
          rather than read as a ball. (Previously this used the arm colour, so a tee
          exposed a big skin sphere where the old shirt yoke used to cover it.) */}
      <Blob m={topM} s={[P.shoulderR * 1.05, P.shoulderR * 0.95, P.shoulderR * 1.05]} p={[0, 0, 0]} cast />
      <mesh geometry={taperGeo(P.shoulderR, P.elbowR, P.upperArm)} material={armMat} position={[0, -P.upperArm / 2, 0]} castShadow />
      {/* tee: a short sleeve over the top of the upper arm (forearm stays skin) */}
      {!sleeved && (
        <mesh geometry={taperGeo(P.shoulderR * 1.08, P.shoulderR * 0.9, P.upperArm * 0.44)} material={topM} position={[0, -P.upperArm * 0.22, 0]} castShadow />
      )}

      <group ref={bind(lower)} position={[0, -P.upperArm, 0]}>
        {/* elbow */}
        <Blob m={skin} s={[P.elbowR, P.elbowR, P.elbowR]} p={[0, 0, 0]} />
        <mesh geometry={taperGeo(P.elbowR, P.wristR, P.lowerArm)} material={skin} position={[0, -P.lowerArm / 2, 0]} castShadow />
        {/* hand: a single rounded chibi mitt */}
        <group position={[0, -P.lowerArm - P.wristR * 0.3, 0]}>
          <Blob m={skin} s={[P.wristR * 1.15, P.handLen * 0.62, P.wristR * 0.95]} p={[0, -P.handLen * 0.42, 0]} cast />
        </group>
      </group>
    </group>
  )
}

/* --------------------------------------------------------------------- legs */

function Leg({
  side,
  bind,
  P,
  skin,
  botM,
  shoeM,
  shoeAccent,
  config,
}: {
  side: 'L' | 'R'
  bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions
  skin: Mat
  botM: Mat
  shoeM: Mat
  shoeAccent: Mat
  config: AvatarConfig
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'legUpperL' : 'legUpperR'
  const lower: BoneName = side === 'L' ? 'legLowerL' : 'legLowerR'
  const foot: BoneName = side === 'L' ? 'footL' : 'footR'
  // skirt/shorts bare the calf; a skirt also bares the thigh
  const bareLower = config.bottom === 'shorts' || config.bottom === 'skirt'
  const thighMat = config.bottom === 'skirt' ? skin : botM
  const calfMat = bareLower ? skin : botM
  return (
    <group ref={bind(upper)} position={[sign * P.hipW, P.hipsY - 0.06, 0]}>
      {/* hip joint */}
      <Blob m={thighMat} s={[P.thighR, P.thighR, P.thighR]} p={[0, 0, 0]} />
      <mesh geometry={taperGeo(P.thighR, P.kneeR, P.upperLeg)} material={thighMat} position={[0, -P.upperLeg / 2, 0]} castShadow />

      <group ref={bind(lower)} position={[0, -P.upperLeg, 0]}>
        {/* knee */}
        <Blob m={calfMat} s={[P.kneeR, P.kneeR, P.kneeR]} p={[0, 0, 0]} />
        <mesh geometry={taperGeo(P.kneeR, P.ankleR, P.lowerLeg)} material={calfMat} position={[0, -P.lowerLeg / 2, 0]} castShadow />

        <group ref={bind(foot)} position={[0, -P.lowerLeg - P.ankleR * 0.4, 0]}>
          <Shoe P={P} shoeM={shoeM} shoeAccent={shoeAccent} skin={skin} style={config.shoes} />
        </group>
      </group>
    </group>
  )
}

function Shoe({ P, shoeM, shoeAccent, skin, style }: { P: Proportions; shoeM: Mat; shoeAccent: Mat; skin: Mat; style: string }) {
  const w = P.ankleR * 1.15
  const fl = P.footLen
  return (
    <group>
      {/* ankle / heel */}
      <Blob m={style === 'boots' ? shoeM : skin} s={[w, P.ankleR * 1.1, w]} p={[0, P.ankleR * 0.1, -fl * 0.05]} />
      {/* instep / upper */}
      <Blob m={shoeM} s={[w, P.ankleR * 0.9, fl * 0.42]} p={[0, -P.ankleR * 0.05, fl * 0.22]} cast />
      {/* rounded toe */}
      <Blob m={shoeM} s={[w * 0.96, P.ankleR * 0.72, fl * 0.3]} p={[0, -P.ankleR * 0.22, fl * 0.62]} cast />
      {/* sole */}
      <mesh geometry={boxGeo(w * 2.05, P.ankleR * 0.5, fl * 0.96)} material={shoeAccent} position={[0, -P.ankleR * 0.6, fl * 0.28]} castShadow />
      {style === 'boots' ? (
        // boot shaft up the ankle
        <mesh geometry={taperGeo(w * 1.18, w * 1.05, P.lowerLeg * 0.42)} material={shoeM} position={[0, P.lowerLeg * 0.22, -fl * 0.02]} />
      ) : (
        // sneaker toe cap accent
        <Blob m={shoeAccent} s={[w * 0.92, P.ankleR * 0.5, fl * 0.16]} p={[0, -P.ankleR * 0.34, fl * 0.78]} />
      )}
    </group>
  )
}

/* ------------------------------------------------------------- top overlays */
// Style-specific bulk over the base torso (hood, lapels, robe skirt) that hugs
// the body rather than floating as a separate box.

function Top({ config, P, topM }: { config: AvatarConfig; P: Proportions; topM: Mat }) {
  switch (config.top) {
    case 'hoodie':
      return (
        <group>
          {/* hood draped behind the neck */}
          <Blob m={topM} s={[P.chestW * 0.62, P.chestLen * 0.34, P.torsoD * 0.5]} p={[0, P.chestLen * 0.92, -P.torsoD * 0.55]} />
          {/* kangaroo pocket hint */}
          <Blob m={topM} s={[P.chestW * 0.55, P.chestLen * 0.2, P.torsoD * 0.2]} p={[0, P.chestLen * 0.06, P.torsoD * 0.78]} />
        </group>
      )
    case 'jacket':
      return (
        <group>
          {/* lapels down the chest front */}
          <mesh geometry={boxGeo(P.chestW * 0.18, P.chestLen * 0.8, P.torsoD * 0.12)} material={topM} position={[-P.chestW * 0.34, P.chestLen * 0.4, P.torsoD * 0.92]} rotation={[0, 0, 0.12]} />
          <mesh geometry={boxGeo(P.chestW * 0.18, P.chestLen * 0.8, P.torsoD * 0.12)} material={topM} position={[P.chestW * 0.34, P.chestLen * 0.4, P.torsoD * 0.92]} rotation={[0, 0, -0.12]} />
          {/* collar */}
          <Blob m={topM} s={[P.chestW * 0.7, P.chestLen * 0.14, P.torsoD * 0.6]} p={[0, P.chestLen * 0.78, P.torsoD * 0.2]} />
        </group>
      )
    case 'robe':
      // flowing scholar-robe skirt falling below the waist
      return (
        <mesh geometry={skirtGeo(P.chestW * 0.92, P.hipBoneW * 1.7, P.chestLen * 1.7)} material={topM} position={[0, -P.chestLen * 0.65, 0]} />
      )
    case 'tee':
    default:
      return null
  }
}

/* ----------------------------------------------------------- bottom overlays */

function Bottom({ config, P, botM }: { config: AvatarConfig; P: Proportions; botM: Mat }) {
  if (config.bottom !== 'skirt') return null
  // a flared skirt that hangs from the hips and sways with them
  return (
    <mesh geometry={skirtGeo(P.hipBoneW * 1.1, P.hipBoneW * 1.9, 0.34)} material={botM} position={[0, -0.16, 0]} />
  )
}
