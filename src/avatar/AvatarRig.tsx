import { useImperativeHandle, useMemo, useRef } from 'react'
import { Group, type MeshStandardMaterial } from 'three'
import {
  boxGeo,
  detailSphereGeo,
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
  skinMaterial,
  hairMaterial,
  eyeMaterial,
  type AvatarConfig,
  type TorsoRing,
} from './config'
import { heightScale, proportionsFor, type BoneName, type Proportions } from './rig'
import { BackAccessories, HandAccessory, HeadAccessories, NeckAccessories } from './accessories/render'
import type { EquippedAccessories } from './accessories/types'

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
    { y: -0.06, hw: P.hipBoneW * (female ? 1.06 : 1.03), hd: P.torsoD * 0.94 },
    // waist — natural taper
    { y: spine * 0.5, hw: P.waistW * (female ? 0.92 : 1.0), hd: P.torsoD * (female ? 0.82 : 0.86) },
    // chest — full volume
    { y: spine + chest * 0.38, hw: P.chestW, hd: P.torsoD * (female ? 1.0 : 0.96), cz: female ? P.bust * 0.6 : 0 },
    // shoulders — widest point
    { y: spine + chest * 0.72, hw: P.shoulderW * 0.84, hd: P.torsoD * 0.84 },
    // neck base — smooth taper to neck
    { y: spine + chest * 0.84, hw: P.neckR * 1.6, hd: P.neckR * 1.6 },
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

  // specialized material lookups (cached globally by colour/finish)
  const skin = skinMaterial(skinHex(config.skin))
  const hairM = hairMaterial(hairHex(config.hairColor))
  // Garment colour is a fixed property of the cosmetic item (no per-avatar picker).
  const topM = sharedMaterial(topHex(config.top), 0.82)
  const botM = sharedMaterial(bottomHex(config.bottom), 0.82)
  const shoeM = sharedMaterial(shoeHex(config.shoes), 0.5)
  const shoeAccent = sharedMaterial('#f2efe8', 0.5)
  const eyeWhite = eyeMaterial('#f6f3ec')
  const iris = eyeMaterial(eyeHex(config.eyes))
  const pupil = eyeMaterial('#1b1410')
  const mouthM = sharedMaterial('#c47068', 0.6)

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
            {/* neck-slot accessory (scarf/chain/tie…) below the head, and back-slot
                accessory (wings/cape/bag/aura) behind the torso */}
            <NeckAccessories eq={config.accessories} P={P} />
            <BackAccessories eq={config.accessories} P={P} />

            {/* neck + head */}
            <group ref={bind('neck')} position={[0, P.chestLen * 0.86, 0]}>
              <mesh geometry={taperGeo(P.neckR, P.neckR * 1.1, P.neckLen)} material={skin} position={[0, P.neckLen / 2, 0]} />
              {/* Adam's apple hint (male) - very subtle */}
              {config.bodyType === 'male' && <Blob m={skin} s={[P.neckR * 0.2, P.neckR * 0.25, P.neckR * 0.2]} p={[0, P.neckLen * 0.55, P.neckR * 0.7]} />}
              {/* Neck blend into shoulders */}
              <Blob m={skin} s={[P.neckR * 1.4, P.neckR * 0.7, P.neckR * 1.2]} p={[0, P.neckLen * 0.85, 0]} />
              <group ref={bind('head')} position={[0, P.neckLen, 0]}>
                <Head P={P} skin={skin} eyeWhite={eyeWhite} iris={iris} pupil={pupil} mouthM={mouthM} hairM={hairM} bodyType={config.bodyType} lidsRef={lidsRef} />
                <Hair config={config} P={P} hairM={hairM} />
                {/* head-slot accessories: face (over face) → eyewear → headwear (on top) */}
                <HeadAccessories eq={config.accessories} P={P} />
              </group>
            </group>
          </group>
        </group>

        {/* arms hang from the hips group so torso sway carries them (as before).
            The right hand carries the equipped handheld accessory. */}
        <Arm side="L" bind={bind} P={P} skin={skin} armMat={armMat} sleeved={sleeved} topM={topM} />
        <Arm side="R" bind={bind} P={P} skin={skin} armMat={armMat} sleeved={sleeved} topM={topM} hand={config.accessories} />
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
  const cy = r * 0.92
  const fz = r * 0.6 // face plane - flatter for Korean/Japanese profile
  const eyeX = r * 0.36
  const eyeY = -r * 0.04
  const browArch = bodyType === 'female' ? 0.15 : 0.06
  const isF = bodyType === 'female'
  
  // Korean/Japanese facial features: flatter profile, wider face
  const faceW = isF ? 1.0 : 0.98
  const jawW = isF ? 0.65 : 0.68
  const cheekW = isF ? 0.78 : 0.75
  
  return (
    <group position={[0, cy, 0]}>
      {/* Main head shape - egg-shaped cranium */}
      <Blob m={skin} s={[r * faceW, r * 1.0, r * 0.95]} p={[0, 0, 0]} cast />
      
      {/* Jaw - tapered lower face */}
      <Blob m={skin} s={[r * jawW, r * 0.52, r * 0.7]} p={[0, -r * 0.56, r * 0.02]} />
      
      {/* Cheekbones - subtle prominence */}
      <Blob m={skin} s={[r * cheekW, r * 0.3, r * 0.3]} p={[-r * 0.42, -r * 0.22, r * 0.25]} />
      <Blob m={skin} s={[r * cheekW, r * 0.3, r * 0.3]} p={[r * 0.42, -r * 0.22, r * 0.25]} />
      
      {/* Eyes - almond-shaped, properly recessed */}
      <Eye x={-eyeX} y={eyeY} z={fz} r={r} eyeWhite={eyeWhite} iris={iris} pupil={pupil} isF={isF} />
      <Eye x={eyeX} y={eyeY} z={fz} r={r} eyeWhite={eyeWhite} iris={iris} pupil={pupil} isF={isF} />
      
      {/* Eyebrows - natural arch */}
      <mesh geometry={boxGeo(r * 0.2, r * 0.03, r * 0.03)} material={hairM} position={[-eyeX, eyeY + r * 0.24, fz + r * 0.02]} rotation={[0, 0, browArch]} />
      <mesh geometry={boxGeo(r * 0.2, r * 0.03, r * 0.03)} material={hairM} position={[eyeX, eyeY + r * 0.24, fz + r * 0.02]} rotation={[0, 0, -browArch]} />
      
      {/* Nose - subtle bridge, not protruding */}
      <Blob m={skin} s={[r * 0.035, r * 0.1, r * 0.04]} p={[0, eyeY - r * 0.2, fz + r * 0.12]} />
      <Blob m={skin} s={[r * 0.05, r * 0.03, r * 0.04]} p={[0, eyeY - r * 0.28, fz + r * 0.13]} />
      {/* Nostrils - very subtle */}
      <Blob m={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} s={[r * 0.025, r * 0.018, r * 0.02]} p={[-r * 0.02, eyeY - r * 0.3, fz + r * 0.13]} />
      <Blob m={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} s={[r * 0.025, r * 0.018, r * 0.02]} p={[r * 0.02, eyeY - r * 0.3, fz + r * 0.13]} />
      
      {/* Lips - natural shape */}
      <Blob m={mouthM} s={[r * 0.09, r * 0.03, r * 0.025]} p={[0, -r * 0.38, fz + r * 0.03]} />
      <Blob m={sharedMaterial(isF ? '#d4887a' : '#c47068', 0.7)} s={[r * 0.07, r * 0.022, r * 0.02]} p={[0, -r * 0.4, fz + r * 0.035]} />
      
      {/* Chin - subtle */}
      <Blob m={skin} s={[r * 0.1, r * 0.08, r * 0.1]} p={[0, -r * 0.68, r * 0.03]} />
      
      {/* Ears - close to head */}
      <Ear x={-r * 0.82} y={eyeY + r * 0.02} z={-r * 0.02} r={r} skin={skin} isF={isF} />
      <Ear x={r * 0.82} y={eyeY + r * 0.02} z={-r * 0.02} r={r} skin={skin} isF={isF} />
      
      {/* Eyelids - for blink animation */}
      <group ref={lidsRef} scale={[1, 0, 1]} position={[0, eyeY + r * 0.03, fz + r * 0.04]}>
        <mesh geometry={boxGeo(r * 0.24, r * 0.22, r * 0.02)} material={skin} position={[-eyeX, 0, 0]} />
        <mesh geometry={boxGeo(r * 0.24, r * 0.22, r * 0.02)} material={skin} position={[eyeX, 0, 0]} />
      </group>
    </group>
  )
}

function Eye({ x, y, z, r, eyeWhite, iris, pupil, isF }: { x: number; y: number; z: number; r: number; eyeWhite: Mat; iris: Mat; pupil: Mat; isF: boolean }) {
  // Korean/Japanese eyes: almond-shaped, properly recessed in the socket
  const eyeW = r * 0.16
  const eyeH = isF ? r * 0.12 : r * 0.11
  
  return (
    <group position={[x, y, z]}>
      {/* Eye socket depression */}
      <Blob m={sharedMaterial(isF ? '#e0c0b0' : '#d4b0a0', 0.85)} s={[eyeW * 1.2, eyeH * 1.1, r * 0.04]} p={[0, 0, -r * 0.02]} />
      
      {/* Eye white - almond shape */}
      <Blob m={eyeWhite} s={[eyeW, eyeH, r * 0.05]} p={[0, 0, r * 0.02]} />
      
      {/* Iris - colored part */}
      <Blob m={iris} s={[eyeW * 0.7, eyeH * 0.7, r * 0.04]} p={[0, -r * 0.005, r * 0.04]} />
      
      {/* Pupil - dark center */}
      <Blob m={pupil} s={[eyeW * 0.3, eyeH * 0.3, r * 0.03]} p={[0, -r * 0.005, r * 0.055]} />
      
      {/* Eye highlight - subtle reflection */}
      <Blob m={eyeWhite} s={[eyeW * 0.1, eyeH * 0.1, r * 0.01]} p={[eyeW * 0.15, eyeH * 0.15, r * 0.06]} />
      
      {/* Upper eyelid crease */}
      <Blob m={sharedMaterial(isF ? '#e0c0b0' : '#d4b0a0', 0.8)} s={[eyeW * 1.05, r * 0.012, r * 0.01]} p={[0, eyeH * 0.5, r * 0.01]} />
      
      {/* Lower eyelid */}
      <Blob m={sharedMaterial(isF ? '#e0c0b0' : '#d4b0a0', 0.8)} s={[eyeW * 0.85, r * 0.008, r * 0.008]} p={[0, -eyeH * 0.45, r * 0.015]} />
    </group>
  )
}

function Ear({ x, y, z, r, skin, isF }: { x: number; y: number; z: number; r: number; skin: Mat; isF: boolean }) {
  const earR = isF ? r * 0.065 : r * 0.07
  return (
    <group position={[x, y, z]}>
      {/* Outer ear - flat against head */}
      <Blob m={skin} s={[earR * 0.3, earR * 0.85, earR * 0.2]} p={[0, 0, 0]} />
      {/* Inner ear detail */}
      <Blob m={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} s={[earR * 0.18, earR * 0.55, earR * 0.12]} p={[0, 0, earR * 0.08]} />
      {/* Earlobe */}
      <Blob m={skin} s={[earR * 0.22, earR * 0.18, earR * 0.14]} p={[0, -earR * 0.75, 0]} />
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

/** A loose cluster of round curls at fixed (deterministic) offsets — the building
 *  block for curly styles. */
function Curls({ m, r, p, spread = 1, size = 0.34 }: { m: Mat; r: number; p: V3; spread?: number; size?: number }) {
  const o = r * 0.32 * spread
  const s = r * size
  const pts: V3[] = [
    [0, 0, 0],
    [o, o * 0.6, 0],
    [-o, o * 0.5, 0],
    [o * 0.6, -o * 0.6, o * 0.4],
    [-o * 0.6, -o * 0.5, o * 0.4],
    [0, -o, -o * 0.3],
  ]
  return (
    <group position={p}>
      {pts.map((q, i) => (
        <Blob key={i} m={m} s={[s, s, s]} p={q} />
      ))}
    </group>
  )
}

/** A braid: a tapering column of beads hanging from a point (back or side braid). */
function Braid({ m, r, p, len, beads = 6, rot }: { m: Mat; r: number; p: V3; len: number; beads?: number; rot?: V3 }) {
  const step = len / beads
  return (
    <group position={p} rotation={rot}>
      {Array.from({ length: beads }).map((_, i) => {
        const t = i / (beads - 1)
        const w = r * (0.36 - 0.18 * t)
        return <Blob key={i} m={m} s={[w, w * 1.15, w]} p={[0, -step * i, 0]} />
      })}
    </group>
  )
}

function Hair({ config, P, hairM }: { config: AvatarConfig; P: Proportions; hairM: Mat }) {
  const r = P.headR
  const cy = r * 0.95 // head-centre offset (matches Head)
  // scalp cap: an ellipsoid shell sitting over the crown, pushed up and back
  const cap = (scale: V3, lift = 0.18) => <Blob m={hairM} s={scale} p={[0, cy + r * lift, -r * 0.12]} />

  // Fringe: a THIN hairline band sitting high on the forehead (above the brows)
  // and barely tilted — reads as a clean hair edge, never a curtain over the eyes.
  const fringe = (w = 0.8, h = 0.13) => (
    <Blob m={hairM} s={[r * w, r * h, r * 0.36]} p={[0, cy + r * 0.66, r * 0.5]} r={[0.2, 0, 0]} />
  )
  // Length that falls at the SIDES and slightly BEHIND the face (wide x + negative
  // z) so long styles frame the face from behind the cheeks, never across it.
  const sideFall = (len: number, top: number, bot: number, y = 0.3) => (
    <>
      <Strand m={hairM} len={r * len} rTop={r * top} rBot={r * bot} p={[-r * 0.97, cy + r * y, -r * 0.08]} rot={[0, 0, 0.05]} />
      <Strand m={hairM} len={r * len} rTop={r * top} rBot={r * bot} p={[r * 0.97, cy + r * y, -r * 0.08]} rot={[0, 0, -0.05]} />
    </>
  )
  // The back curtain — the bulk of long hair, hanging straight down the back.
  const backFall = (len: number, top: number, bot: number) => (
    <Strand m={hairM} len={r * len} rTop={r * top} rBot={r * bot} p={[0, cy + r * 0.5, -r * 0.62]} rot={[-0.06, 0, 0]} />
  )

  switch (config.hair) {
    /* ---- shared neutral cuts ---- */
    case 'none':
      return null
    case 'crop':
      // tight even crop hugging the scalp
      return (
        <group>
          {cap([r * 1.0, r * 0.9, r * 1.02], 0.06)}
          {fringe(0.84)}
        </group>
      )
    case 'pixie':
      // short, with a high side-swept top + neat sideburns in front of the ears
      return (
        <group>
          {cap([r * 1.05, r * 0.98, r * 1.06], 0.12)}
          <Blob m={hairM} s={[r * 0.52, r * 0.16, r * 0.34]} p={[-r * 0.16, cy + r * 0.62, r * 0.52]} r={[0.22, 0, 0.2]} />
          <Blob m={hairM} s={[r * 0.18, r * 0.42, r * 0.34]} p={[-r * 0.9, cy + r * 0.04, -r * 0.02]} />
          <Blob m={hairM} s={[r * 0.18, r * 0.42, r * 0.34]} p={[r * 0.9, cy + r * 0.04, -r * 0.02]} />
        </group>
      )
    case 'bob':
      // chin-length bob: side curtains tucked behind the cheeks + a blunt fringe
      return (
        <group>
          {cap([r * 1.08, r * 1.03, r * 1.08], 0.16)}
          {sideFall(1.5, 0.42, 0.34, 0.34)}
          {backFall(1.4, 0.85, 0.6)}
          {fringe(0.88)}
        </group>
      )

    /* ---- male library ---- */
    case 'short_messy':
      return (
        <group>
          {cap([r * 1.06, r * 1.0, r * 1.06], 0.15)}
          {/* a couple of subtle tufts on the CROWN only (kept above the hairline) */}
          <Blob m={hairM} s={[r * 0.46, r * 0.22, r * 0.42]} p={[-r * 0.3, cy + r * 0.78, r * 0.16]} r={[0.2, 0.3, 0.2]} />
          <Blob m={hairM} s={[r * 0.42, r * 0.24, r * 0.4]} p={[r * 0.28, cy + r * 0.82, r * 0.1]} r={[0.15, -0.3, -0.2]} />
          {fringe(0.82)}
        </group>
      )
    case 'side_part':
      return (
        <group>
          {cap([r * 1.06, r * 1.02, r * 1.06], 0.15)}
          {/* combed top swept across a clean side part, sitting on the hairline */}
          <Blob m={hairM} s={[r * 0.7, r * 0.2, r * 0.42]} p={[-r * 0.16, cy + r * 0.64, r * 0.46]} r={[0.22, 0, 0.12]} />
          <Blob m={hairM} s={[r * 0.34, r * 0.22, r * 0.38]} p={[r * 0.46, cy + r * 0.6, r * 0.42]} r={[0.22, 0, -0.18]} />
        </group>
      )
    case 'curly':
      // short cropped curls — volume on the crown, tight to the head, off the face
      return (
        <group>
          {cap([r * 1.0, r * 0.96, r * 1.02], 0.12)}
          <Curls m={hairM} r={r} p={[0, cy + r * 0.66, -r * 0.02]} spread={1.1} size={0.26} />
          <Curls m={hairM} r={r} p={[-r * 0.5, cy + r * 0.42, -r * 0.12]} spread={0.8} size={0.24} />
          <Curls m={hairM} r={r} p={[r * 0.5, cy + r * 0.42, -r * 0.12]} spread={0.8} size={0.24} />
        </group>
      )
    case 'fade':
      // tight sides (low cap) + a little box on top
      return (
        <group>
          {cap([r * 0.98, r * 0.86, r * 1.0], 0.06)}
          <Blob m={hairM} s={[r * 0.78, r * 0.34, r * 0.8]} p={[0, cy + r * 0.5, r * 0.02]} />
          {fringe(0.74)}
        </group>
      )
    case 'medium_layered':
      // a fuller crown reaching the ears (still short — never past the jaw)
      return (
        <group>
          {cap([r * 1.1, r * 1.05, r * 1.1], 0.16)}
          <Blob m={hairM} s={[r * 0.28, r * 0.5, r * 0.42]} p={[-r * 0.92, cy + r * 0.16, -r * 0.04]} />
          <Blob m={hairM} s={[r * 0.28, r * 0.5, r * 0.42]} p={[r * 0.92, cy + r * 0.16, -r * 0.04]} />
          {fringe(0.86)}
        </group>
      )
    case 'spiky':
      return (
        <group>
          {cap([r * 1.02, r * 0.95, r * 1.02], 0.1)}
          {([[-0.45, 0.2], [0, 0.28], [0.45, 0.2], [-0.22, 0.45], [0.22, 0.45]] as const).map(([sx, sz], i) => (
            <Strand key={i} m={hairM} len={r * 0.62} rTop={r * 0.2} rBot={r * 0.02} p={[sx * r, cy + r * 0.82, sz * r]} rot={[-0.3 + sz * 0.2, 0, sx * 0.55]} />
          ))}
        </group>
      )
    case 'academic_neat':
      // very tidy, smooth, low-volume comb-over with a clean part
      return (
        <group>
          {cap([r * 1.04, r * 1.0, r * 1.05], 0.13)}
          <Blob m={hairM} s={[r * 0.82, r * 0.2, r * 0.46]} p={[r * 0.05, cy + r * 0.6, r * 0.46]} r={[0.22, 0, 0.05]} />
        </group>
      )
    case 'wavy':
      // short tousled waves on the crown — no long side pieces
      return (
        <group>
          {cap([r * 1.07, r * 1.02, r * 1.08], 0.15)}
          <Blob m={hairM} s={[r * 0.4, r * 0.22, r * 0.4]} p={[-r * 0.3, cy + r * 0.7, r * 0.26]} r={[0.2, 0, 0.25]} />
          <Blob m={hairM} s={[r * 0.4, r * 0.22, r * 0.4]} p={[r * 0.28, cy + r * 0.68, r * 0.26]} r={[0.2, 0, -0.25]} />
          {fringe(0.82)}
        </group>
      )

    /* ---- female library ---- */
    case 'long_straight':
      return (
        <group>
          {cap([r * 1.07, r * 1.02, r * 1.08], 0.18)}
          {backFall(3.3, 1.0, 0.55)}
          {sideFall(2.7, 0.4, 0.22)}
          {fringe(0.84)}
        </group>
      )
    case 'shoulder':
      return (
        <group>
          {cap([r * 1.08, r * 1.03, r * 1.08], 0.18)}
          {backFall(1.7, 0.85, 0.5)}
          {sideFall(2.0, 0.42, 0.26)}
          {fringe(0.84)}
        </group>
      )
    case 'wavy_long':
      return (
        <group>
          {cap([r * 1.07, r * 1.02, r * 1.08], 0.18)}
          {backFall(2.9, 0.95, 0.55)}
          {/* body/volume on the back fall, tucked behind the shoulders */}
          <Blob m={hairM} s={[r * 0.9, r * 0.6, r * 0.58]} p={[0, cy - r * 0.95, -r * 0.72]} />
          <Blob m={hairM} s={[r * 0.95, r * 0.58, r * 0.56]} p={[0, cy - r * 1.85, -r * 0.66]} />
          {sideFall(2.4, 0.42, 0.24)}
          {fringe(0.84)}
        </group>
      )
    case 'curly_long':
      return (
        <group>
          {cap([r * 1.08, r * 1.03, r * 1.08], 0.18)}
          {/* curl masses on the sides + back, all set BEHIND the face */}
          <Curls m={hairM} r={r} p={[-r * 0.82, cy + r * 0.1, -r * 0.12]} spread={1.2} size={0.36} />
          <Curls m={hairM} r={r} p={[r * 0.82, cy + r * 0.1, -r * 0.12]} spread={1.2} size={0.36} />
          <Curls m={hairM} r={r} p={[-r * 0.72, cy - r * 0.9, -r * 0.22]} spread={1.1} size={0.36} />
          <Curls m={hairM} r={r} p={[r * 0.72, cy - r * 0.9, -r * 0.22]} spread={1.1} size={0.36} />
          <Curls m={hairM} r={r} p={[0, cy - r * 0.55, -r * 0.7]} spread={1.3} size={0.36} />
          {fringe(0.84)}
        </group>
      )
    case 'ponytail':
      return (
        <group>
          {cap([r * 1.08, r * 1.04, r * 1.08], 0.15)}
          {/* smooth pulled-back top */}
          <Blob m={hairM} s={[r * 0.95, r * 0.5, r * 0.95]} p={[0, cy + r * 0.4, -r * 0.1]} />
          {/* tie + ponytail down the back */}
          <Blob m={hairM} s={[r * 0.3, r * 0.3, r * 0.3]} p={[0, cy + r * 0.5, -r * 0.8]} />
          <Strand m={hairM} len={r * 2.6} rTop={r * 0.46} rBot={r * 0.18} p={[0, cy + r * 0.45, -r * 0.85]} rot={[-0.25, 0, 0]} />
          {fringe(0.82)}
        </group>
      )
    case 'twintails':
      return (
        <group>
          {cap([r * 1.08, r * 1.04, r * 1.08], 0.15)}
          {fringe(0.84)}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <Blob m={hairM} s={[r * 0.28, r * 0.28, r * 0.28]} p={[sx * r * 0.92, cy + r * 0.55, -r * 0.08]} />
              <Strand m={hairM} len={r * 2.0} rTop={r * 0.4} rBot={r * 0.12} p={[sx * r * 1.0, cy + r * 0.48, -r * 0.12]} rot={[-0.15, 0, sx * 0.45]} />
            </group>
          ))}
        </group>
      )
    case 'bun':
      return (
        <group>
          {cap([r * 1.06, r * 1.02, r * 1.06], 0.13)}
          {/* top knot */}
          <Blob m={hairM} s={[r * 0.4, r * 0.4, r * 0.4]} p={[0, cy + r * 1.02, -r * 0.08]} />
          <mesh geometry={torusGeo(r * 0.4, r * 0.12)} material={hairM} position={[0, cy + r * 0.92, -r * 0.08]} rotation={[Math.PI / 2, 0, 0]} />
          {fringe(0.78)}
        </group>
      )
    case 'braided':
      return (
        <group>
          {cap([r * 1.08, r * 1.03, r * 1.08], 0.18)}
          {fringe(0.84)}
          {/* thin face-frame strands tucked behind + a thick back braid */}
          {sideFall(1.3, 0.18, 0.1)}
          <Braid m={hairM} r={r} p={[0, cy + r * 0.3, -r * 0.6]} len={r * 2.6} beads={6} rot={[-0.08, 0, 0]} />
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
  hand,
}: {
  side: 'L' | 'R'
  bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions
  skin: Mat
  armMat: Mat
  sleeved: boolean
  topM: Mat
  hand?: EquippedAccessories
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
      <Blob m={topM} s={[P.shoulderR * 1.0, P.shoulderR * 0.82, P.shoulderR * 1.0]} p={[0, 0, 0]} cast />
      <mesh geometry={taperGeo(P.shoulderR, P.elbowR, P.upperArm)} material={armMat} position={[0, -P.upperArm / 2, 0]} castShadow />
      {/* tee: a short sleeve over the top of the upper arm (forearm stays skin) */}
      {!sleeved && (
        <mesh geometry={taperGeo(P.shoulderR * 1.08, P.shoulderR * 0.9, P.upperArm * 0.44)} material={topM} position={[0, -P.upperArm * 0.22, 0]} castShadow />
      )}

      <group ref={bind(lower)} position={[0, -P.upperArm, 0]}>
        {/* elbow */}
        <Blob m={skin} s={[P.elbowR * 1.02, P.elbowR * 1.02, P.elbowR * 1.02]} p={[0, 0, 0]} />
        <mesh geometry={taperGeo(P.elbowR, P.wristR, P.lowerArm)} material={skin} position={[0, -P.lowerArm / 2, 0]} castShadow />
        {/* hand: realistic human hand with fingers */}
        <group position={[0, -P.lowerArm - P.wristR * 0.3, 0]}>
          {/* Palm */}
          <Blob m={skin} s={[P.wristR * 1.2, P.handLen * 0.45, P.wristR * 1.0]} p={[0, -P.handLen * 0.32, 0]} cast />
          
          {/* Thumb */}
          <Blob m={skin} s={[P.wristR * 0.28, P.wristR * 0.28, P.wristR * 0.28]} p={[P.wristR * 0.85, -P.handLen * 0.15, P.wristR * 0.3]} />
          <mesh geometry={taperGeo(P.wristR * 0.22, P.wristR * 0.18, P.handLen * 0.22)} material={skin} position={[P.wristR * 0.95, -P.handLen * 0.28, P.wristR * 0.3]} rotation={[0, 0, 0.3]} />
          
          {/* Fingers */}
          <Finger skin={skin} P={P} x={-P.wristR * 0.5} len={P.handLen * 0.32} />
          <Finger skin={skin} P={P} x={-P.wristR * 0.15} len={P.handLen * 0.38} />
          <Finger skin={skin} P={P} x={P.wristR * 0.15} len={P.handLen * 0.36} />
          <Finger skin={skin} P={P} x={P.wristR * 0.45} len={P.handLen * 0.28} />
          
          {hand && <HandAccessory eq={hand} P={P} />}
        </group>
      </group>
    </group>
  )
}

function Finger({ skin, P, x, len }: { skin: Mat; P: Proportions; x: number; len: number }) {
  const r = P.wristR * 0.14
  return (
    <group position={[x, -P.handLen * 0.5, 0]}>
      {/* Finger base */}
      <mesh geometry={taperGeo(r * 1.2, r, len * 0.6)} material={skin} position={[0, -len * 0.3, 0]} />
      {/* Finger tip */}
      <Blob m={skin} s={[r * 0.9, r * 0.9, r * 0.9]} p={[0, -len * 0.55, 0]} />
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
  // shorts bare the calf (thigh stays clothed); pants & leggings clothe the full leg
  const thighMat = botM
  const calfMat = config.bottom === 'shorts' ? skin : botM
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
      {/* instep / upper - smoother shoe body */}
      <Blob m={shoeM} s={[w * 1.05, P.ankleR * 0.85, fl * 0.44]} p={[0, -P.ankleR * 0.08, fl * 0.2]} cast />
      {/* rounded toe - more natural curve */}
      <Blob m={shoeM} s={[w * 0.92, P.ankleR * 0.68, fl * 0.28]} p={[0, -P.ankleR * 0.24, fl * 0.64]} cast />
      {/* tongue */}
      <Blob m={shoeM} s={[w * 0.55, P.ankleR * 0.4, fl * 0.32]} p={[0, P.ankleR * 0.2, fl * 0.12]} />
      {/* sole with tread detail */}
      <mesh geometry={boxGeo(w * 2.1, P.ankleR * 0.45, fl * 1.0)} material={shoeAccent} position={[0, -P.ankleR * 0.65, fl * 0.28]} castShadow />
      {/* sole heel lift */}
      <mesh geometry={boxGeo(w * 1.8, P.ankleR * 0.2, fl * 0.35)} material={shoeAccent} position={[0, -P.ankleR * 0.48, -fl * 0.08]} />
      {style === 'boots' ? (
        <>
          {/* boot shaft up the ankle */}
          <mesh geometry={taperGeo(w * 1.18, w * 1.05, P.lowerLeg * 0.42)} material={shoeM} position={[0, P.lowerLeg * 0.22, -fl * 0.02]} />
          {/* boot collar */}
          <Blob m={shoeM} s={[w * 1.2, P.ankleR * 0.35, w * 1.2]} p={[0, P.lowerLeg * 0.42, -fl * 0.02]} />
        </>
      ) : (
        <>
          {/* sneaker toe cap accent */}
          <Blob m={shoeAccent} s={[w * 0.88, P.ankleR * 0.48, fl * 0.14]} p={[0, -P.ankleR * 0.36, fl * 0.8]} />
          {/* sneaker side stripe */}
          <Blob m={shoeAccent} s={[w * 0.05, P.ankleR * 0.5, fl * 0.35]} p={[w * 1.02, -P.ankleR * 0.1, fl * 0.25]} />
          <Blob m={shoeAccent} s={[w * 0.05, P.ankleR * 0.5, fl * 0.35]} p={[-w * 1.02, -P.ankleR * 0.1, fl * 0.25]} />
        </>
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
    case 'blazer':
      // tidy academic blazer: structured shoulders, notched lapels, collar band
      return (
        <group>
          <mesh geometry={boxGeo(P.chestW * 0.2, P.chestLen * 0.85, P.torsoD * 0.12)} material={topM} position={[-P.chestW * 0.32, P.chestLen * 0.38, P.torsoD * 0.95]} rotation={[0, 0, 0.16]} />
          <mesh geometry={boxGeo(P.chestW * 0.2, P.chestLen * 0.85, P.torsoD * 0.12)} material={topM} position={[P.chestW * 0.32, P.chestLen * 0.38, P.torsoD * 0.95]} rotation={[0, 0, -0.16]} />
          <Blob m={topM} s={[P.chestW * 0.78, P.chestLen * 0.16, P.torsoD * 0.62]} p={[0, P.chestLen * 0.8, P.torsoD * 0.18]} />
          <Blob m={topM} s={[P.chestW * 0.42, P.chestLen * 0.16, P.torsoD * 0.5]} p={[0, P.chestLen * 0.7, 0]} />
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

