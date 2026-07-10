// @ts-nocheck
import { useImperativeHandle, useMemo, useRef } from 'react'
import { Color, Group, MeshStandardMaterial } from 'three'
import {
  boxGeo,
  sphereGeo,
  taperGeo,
  torusGeo,
  latheGeo,
  torsoGeo,
  skinHex,
  hairHex,
  eyeHex,
  shoeHex,
  topHex,
  bottomHex,
  sharedMaterial,
  skinMaterial,
  hairMaterial,
  type AvatarConfig,
} from './config'
import { heightScale, proportionsFor, type BoneName, type Proportions } from './rig'
import { focusLilyChestTex, focusLilyBackTex, hairFrizzTex, skinReliefTex } from './logoTextures'

export type BoneMap = Partial<Record<BoneName, Group>>

export interface AvatarRigHandle {
  bones: BoneMap
  lids: Group | null
  root: Group | null
}

type Mat = MeshStandardMaterial
type V3 = [number, number, number]

/** Lighten (amt>0) or darken (amt<0) a hex colour, for iris shading. */
function shade(hex: string, amt: number): string {
  const c = new Color(hex)
  c.lerp(new Color(amt >= 0 ? '#ffffff' : '#000000'), Math.abs(amt))
  return `#${c.getHexString()}`
}

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

  // Dino costume: a cute blue mascot on the exact same skeleton/height — the whole
  // body is recoloured blue and dino features (snout head, back plates, tail) are
  // added, while the human face/hair are skipped.
  const isDino = config.characterId === 'dino'
  const dinoMain = sharedMaterial('#6cbf4a', 0.6)
  const dinoDark = sharedMaterial('#4f9f3a', 0.55)
  const dinoBelly = sharedMaterial('#eaf3c4', 0.65)
  const dinoSpot = sharedMaterial('#4a9a3a', 0.6)
  const dinoPlate = sharedMaterial('#f7b53d', 0.5)
  const dinoPlateTip = sharedMaterial('#ffd98a', 0.5)

  // Rabbit costume: a cute white toy bunny in a pink suit with a green rear cloth
  // flap and a fluffy cotton tail. White fur, pink suit, no human face.
  const isRabbit = config.characterId === 'rabbit'
  const bunFur = sharedMaterial('#f8f5f0', 0.75)
  const bunPink = sharedMaterial('#f2a3c0', 0.6)
  const bunInner = sharedMaterial('#f6c2d6', 0.6)
  const bunGreen = sharedMaterial('#7cc47b', 0.6)
  const bunNose = sharedMaterial('#e488a6', 0.5)

  const skin = isDino ? dinoMain : isRabbit ? bunFur : skinMaterial(skinHex(config.skin))
  const hairM = hairMaterial(hairHex(config.hairColor))
  const eyeCol = eyeHex(config.eyes)

  // Procedural strand/frizz texture kills the smooth "clay" hair look: used as a
  // bump map (surface relief) and a roughness map (sheen variation). The strong
  // bump + lower roughness make hair read as fibres with a soft sheen, not clay.
  const hairTex = hairFrizzTex()
  hairM.bumpMap = hairTex
  hairM.bumpScale = 0.14
  hairM.roughnessMap = hairTex
  hairM.roughness = 0.5
  // Subtle skin micro-relief so the face isn't plastic-smooth (human only).
  const skinTex = skinReliefTex()
  if (!isDino && !isRabbit) {
    skin.bumpMap = skinTex
    skin.bumpScale = 0.025
  }
  const topM = isDino ? dinoMain : isRabbit ? bunPink : sharedMaterial(topHex(config.top), 0.82)
  const botM = isDino ? dinoMain : isRabbit ? bunPink : sharedMaterial(bottomHex(config.bottom), 0.82)
  const shoeM = isDino ? dinoDark : isRabbit ? bunFur : sharedMaterial(shoeHex(config.shoes), 0.5)
  const shoeAccent = sharedMaterial('#f2efe8', 0.5)

  const bind = (name: BoneName) => (g: Group | null) => {
    if (g) bones[name] = g
  }

  const isSleeved = config.top !== 'tee'

  return (
    <group ref={rootRef} scale={s}>
      <group ref={bind('hips')} position={[0, P.hipsY, 0]}>
        <group ref={bind('spine')} position={[0, 0.04, 0]}>
          <mesh geometry={torsoGeo([
            { y: -0.07, hw: P.hipBoneW * 1.1, hd: P.torsoD * 0.88 },
            { y: -0.02, hw: P.hipBoneW * 1.02, hd: P.torsoD * 0.85 },
            { y: P.spineLen * 0.5, hw: P.waistW * 0.98, hd: P.torsoD * 0.88 },
            { y: P.spineLen, hw: P.chestW * 0.95, hd: P.torsoD * 0.95 },
            { y: P.spineLen + P.chestLen * 0.45, hw: P.chestW, hd: P.torsoD * 1.15 },
            { y: P.spineLen + P.chestLen * 0.8, hw: P.chestW * 1.08, hd: P.torsoD * 1.05 },
            { y: P.spineLen + P.chestLen, hw: P.shoulderW, hd: P.torsoD * 0.92 },
            { y: P.spineLen + P.chestLen * 1.06, hw: P.neckR * 2.2, hd: P.torsoD * 0.55 },
          ])} material={topM} castShadow />

          {/* Dino costume — creamy belly with tummy stripes, back spots and a row
              of stegosaurus-style back plates */}
          {isDino && (
            <group>
              {/* soft creamy belly panel */}
              <mesh geometry={sphereGeo(1)} material={dinoBelly} scale={[P.chestW * 0.7, P.chestLen * 0.78, P.torsoD * 0.62]} position={[0, P.spineLen + P.chestLen * 0.26, P.torsoD * 0.72]} />
              {/* tummy stripes across the belly */}
              {[0.08, 0.26, 0.44].map((t, i) => (
                <mesh key={`ts${i}`} geometry={boxGeo(P.chestW * (0.6 - i * 0.08), P.chestLen * 0.05, P.torsoD * 0.04)}
                  material={dinoDark} position={[0, P.spineLen + P.chestLen * t, P.torsoD * 1.02]} />
              ))}
              {/* darker spots scattered over the back and shoulders */}
              {[
                [-P.chestW * 0.5, P.spineLen + P.chestLen * 0.7, -P.torsoD * 0.7],
                [P.chestW * 0.45, P.spineLen + P.chestLen * 0.45, -P.torsoD * 0.8],
                [-P.chestW * 0.3, P.spineLen + P.chestLen * 0.2, -P.torsoD * 0.85],
                [P.chestW * 0.55, P.spineLen + P.chestLen * 0.9, -P.torsoD * 0.6],
              ].map((p, i) => (
                <mesh key={`sp${i}`} geometry={sphereGeo(1)} material={dinoSpot} scale={[P.chestW * 0.11, P.chestW * 0.11, P.torsoD * 0.06]} position={p as [number, number, number]} />
              ))}
              {/* back plates — warm golden stegosaurus plates, bigger in the middle */}
              {[
                { y: P.spineLen * 0.35, s: 0.5 },
                { y: P.spineLen * 0.8, s: 0.72 },
                { y: P.spineLen * 1.15, s: 0.92 },
                { y: P.spineLen + P.chestLen * 0.28, s: 1.0 },
                { y: P.spineLen + P.chestLen * 0.55, s: 0.85 },
                { y: P.spineLen + P.chestLen * 0.82, s: 0.62 },
              ].map((sp, i) => (
                <group key={i} position={[0, sp.y + P.chestLen * 0.2 * sp.s, -P.torsoD * 1.02]} rotation={[-0.35, 0, 0]}>
                  <mesh geometry={taperGeo(P.chestW * 0.02, P.chestW * 0.2 * sp.s, P.chestLen * 0.5 * sp.s)} material={dinoPlate} castShadow />
                  <mesh geometry={taperGeo(P.chestW * 0.01, P.chestW * 0.1 * sp.s, P.chestLen * 0.24 * sp.s)} material={dinoPlateTip} position={[0, P.chestLen * 0.14 * sp.s, P.torsoD * 0.02]} />
                </group>
              ))}
            </group>
          )}

          <group ref={bind('chest')} position={[0, P.spineLen, 0]}>
            {/* Costume characters (dino/rabbit) have no clothing overlays. */}
            {!isDino && !isRabbit && <Top config={config} P={P} topM={topM} skin={skin} />}

            <group ref={bind('neck')} position={[0, P.chestLen * 0.86, 0]}>
              {/* Collar — plugs the open torso top in the garment colour so the
                  neckline reads as part of the outfit rather than a bare skin ring. */}
              <mesh geometry={latheGeo([
                [P.neckR * 2.1, P.chestLen * 0.2 - P.neckLen * 0.4],
                [P.neckR * 1.75, P.chestLen * 0.2 + P.neckLen * 0.1],
                [P.neckR * 1.35, P.chestLen * 0.2 + P.neckLen * 0.5],
              ])} material={topM} castShadow />
              {/* Neck — skin, rises out of the collar and tapers up to the head. */}
              <mesh geometry={latheGeo([
                [P.neckR * 1.3, P.chestLen * 0.2 + P.neckLen * 0.3],
                [P.neckR * 1.18, P.chestLen * 0.2 + P.neckLen * 0.9],
                [P.neckR * 1.1, P.chestLen * 0.2 + P.neckLen * 1.4],
              ])} material={skin} castShadow />
              <group ref={bind('head')} position={[0, P.neckLen, 0]}>
                {isDino ? (
                  <DinoHead P={P} main={dinoMain} belly={dinoBelly} spike={dinoDark} />
                ) : isRabbit ? (
                  <RabbitHead P={P} fur={bunFur} inner={bunInner} nose={bunNose} />
                ) : (
                  <>
                    <Head P={P} skin={skin} hairM={hairM} bodyType={config.bodyType} lidsRef={lidsRef} characterId={config.characterId ?? 'james'} eyeHexVal={eyeCol} />
                    <Hair config={config} P={P} hairM={hairM} />
                    {config.characterId === 'wizard' ? <WizardHat P={P} />
                      : config.characterId === 'ruslan' ? <Kokoshnik P={P} />
                      : <BlueCap P={P} />}
                  </>
                )}
              </group>
            </group>
          </group>
        </group>

        <Leg side="L" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} />
        <Leg side="R" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} />

        {/* Dino tail — a thick tapering tail rooted at the lower back (overlapping
            the body so there's no gap), curving out and down, ridged with golden
            spikes to match the back plates */}
        {isDino && (
          <group position={[0, 0.04, -P.torsoD * 0.7]} rotation={[0.95, 0, 0]}>
            {/* wide root that overlaps into the body, tapering to a tip */}
            <mesh geometry={taperGeo(P.hipBoneW * 0.6, P.hipBoneW * 0.03, P.upperLeg * 1.5)} material={dinoMain} position={[0, -P.upperLeg * 0.68, 0]} castShadow />
            {/* creamy underside near the base */}
            <mesh geometry={sphereGeo(1)} material={dinoBelly} scale={[P.hipBoneW * 0.4, P.upperLeg * 0.36, P.hipBoneW * 0.28]} position={[0, -P.upperLeg * 0.24, P.hipBoneW * 0.26]} />
            {/* golden ridge spikes running down the tail */}
            {[0.12, 0.3, 0.48, 0.66].map((t, i) => (
              <mesh key={`k${i}`} geometry={taperGeo(P.hipBoneW * 0.01, P.hipBoneW * 0.12 * (1 - t * 0.55), P.hipBoneW * 0.34 * (1 - t * 0.45))}
                material={dinoPlate} position={[0, -P.upperLeg * 1.5 * t, -P.hipBoneW * 0.16 * (1 - t)]} rotation={[0.35, 0, 0]} />
            ))}
          </group>
        )}

        {/* Rabbit costume — a green rear cloth flap (onesie back flap) buttoned on
            the lower back, and a big fluffy white cotton tail */}
        {isRabbit && (
          <group>
            {/* green rear flap on the lower back */}
            <mesh geometry={sphereGeo(1)} material={bunGreen} scale={[P.hipBoneW * 0.85, P.hipBoneW * 0.9, P.torsoD * 0.4]} position={[0, -0.01, -P.torsoD * 0.85]} castShadow />
            {/* two little buttons on the flap */}
            {[-1, 1].map((sx) => (
              <mesh key={sx} geometry={sphereGeo(1)} material={bunFur} scale={[P.hipBoneW * 0.08, P.hipBoneW * 0.08, P.torsoD * 0.05]} position={[sx * P.hipBoneW * 0.4, P.hipBoneW * 0.42, -P.torsoD * 1.05]} />
            ))}
            {/* fluffy cotton tail — a cluster of white puffs behind the flap */}
            <group position={[0, P.hipBoneW * 0.15, -P.torsoD * 1.0]}>
              <mesh geometry={sphereGeo(1)} material={bunFur} scale={[P.hipBoneW * 0.5, P.hipBoneW * 0.5, P.hipBoneW * 0.42]} castShadow />
              {[[-0.3, 0.28], [0.32, 0.24], [0.0, 0.42], [-0.28, -0.24], [0.3, -0.26]].map(([dx, dy], i) => (
                <mesh key={i} geometry={sphereGeo(1)} material={bunFur} scale={[P.hipBoneW * 0.26, P.hipBoneW * 0.26, P.hipBoneW * 0.22]} position={[dx * P.hipBoneW, dy * P.hipBoneW, P.hipBoneW * 0.05]} />
              ))}
            </group>
          </group>
        )}

        {/* Frock skirt — short A-line, after legs before arms */}
        {config.top === 'frock' && (() => {
          const skirtLen = P.upperLeg * 0.7
          const pinkMat = new MeshStandardMaterial({ color: '#d4a0b8', roughness: 0.75, metalness: 0, side: 2 })
          const blackMat = new MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8, metalness: 0, side: 2 })
          return (
            <group position={[0, 0.01, 0]}>
              <mesh geometry={latheGeo([
                [P.waistW * 1.02, 0],
                [P.hipBoneW * 1.05, -skirtLen * 0.15],
                [P.hipBoneW * 1.12, -skirtLen * 0.4],
                [P.hipBoneW * 1.22, -skirtLen * 0.7],
                [P.hipBoneW * 1.55, -skirtLen],
              ])} material={blackMat} castShadow />
              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.55, -skirtLen],
                [P.hipBoneW * 1.58, -skirtLen * 1.015],
                [P.hipBoneW * 1.52, -skirtLen * 1.03],
              ])} material={pinkMat} />
            </group>
          )
        })()}

        {/* Sarafan long A-line skirt — flows to the ankles with an embroidered,
            gold-and-white folk hem over the red wool */}
        {config.top === 'sarafan' && (() => {
          const skirtLen = P.upperLeg * 1.7
          const redMat = new MeshStandardMaterial({ color: topHex(config.top), roughness: 0.85, metalness: 0, side: 2 })
          const goldMat = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.4, metalness: 0.2, side: 2 })
          const whiteMat = new MeshStandardMaterial({ color: '#f7f2e7', roughness: 0.85, metalness: 0, side: 2 })
          return (
            <group position={[0, 0.01, 0]}>
              <mesh geometry={latheGeo([
                [P.waistW * 1.04, 0],
                [P.hipBoneW * 1.06, -skirtLen * 0.15],
                [P.hipBoneW * 1.16, -skirtLen * 0.45],
                [P.hipBoneW * 1.32, -skirtLen * 0.78],
                [P.hipBoneW * 1.5, -skirtLen],
              ])} material={redMat} castShadow />
              {/* gold embroidered band above the hem */}
              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.44, -skirtLen * 0.9],
                [P.hipBoneW * 1.47, -skirtLen * 0.95],
                [P.hipBoneW * 1.5, -skirtLen],
              ])} material={goldMat} />
              {/* white folk trim at the very hem */}
              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.5, -skirtLen],
                [P.hipBoneW * 1.55, -skirtLen * 1.03],
                [P.hipBoneW * 1.48, -skirtLen * 1.07],
              ])} material={whiteMat} />
            </group>
          )
        })()}

        {/* Arms rendered LAST inside hips — always on top of clothing. The
            sarafan wears a white blouse, so its sleeves render white. */}
        <Arm side="L" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} clawM={dinoBelly} />
        <Arm side="R" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} clawM={dinoBelly} />

        {/* Wizard gold sparkle particles — 6 emitters: hands, robe hem, pouch */}
        {config.characterId === 'wizard' && (() => {
          const sparkleGold = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.6, metalness: 0, side: 2 })
          const sf = (2 * P.headR) / 28
          // Spec positions (in spec units): [-14,33,0], [14,33,0], [-8,22,10], [8,22,10], [0,22,-10], [10,28,8]
          const sparkles = [
            [-14 * sf, -P.chestLen * 0.3, 0],          // Left hand
            [14 * sf, -P.chestLen * 0.3, 0],           // Right hand
            [-8 * sf, -P.hipsY * 0.7, 10 * sf],        // Robe hem front left
            [8 * sf, -P.hipsY * 0.7, 10 * sf],         // Robe hem front right
            [0, -P.hipsY * 0.7, -10 * sf],             // Robe hem back
            [10 * sf, -P.chestLen * 0.2, 8 * sf],      // Pouch
          ]
          return (
            <group>
              {sparkles.map((pos, i) => (
                <mesh key={`sp${i}`} geometry={sphereGeo(1)} material={sparkleGold} scale={[2 * sf, 2 * sf, 0.5 * sf]} position={pos as [number, number, number]} />
              ))}
            </group>
          )
        })()}
      </group>
    </group>
  )
}

/* ================================================ HEAD ================================================ */

function Head({
  P, skin, hairM, bodyType, lidsRef, characterId, eyeHexVal,
}: {
  P: Proportions; skin: Mat; hairM: Mat
  bodyType: AvatarConfig['bodyType']; lidsRef: React.Ref<Group>; characterId: string; eyeHexVal: string
}) {
  const r = P.headR
  const isF = bodyType === 'female'
  const cy = r * 0.92
  const fz = r * 0.88

  const eyeX = r * 0.3
  const eyeY = -r * 0.04
  const eyeR = r * 0.18

  const blackDot = sharedMaterial('#1a1a1a', 0.6)

  return (
    <group position={[0, cy, 0]}>
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * (isF ? 1.0 : 0.98), r * 1.0, r * 0.95]} castShadow />
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * (isF ? 0.62 : 0.65), r * 0.5, r * 0.68]} position={[0, -r * 0.56, r * 0.02]} />

      {/* Eyes — white, coloured iris, pupil, catchlight (per character via eyeHexVal) */}
      <Eye r={r} x={-eyeX} y={eyeY} z={fz} iris={eyeHexVal} />
      <Eye r={r} x={eyeX} y={eyeY} z={fz} iris={eyeHexVal} />

      {/* Eyebrows — thin, hair-coloured, gentle arch */}
      <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[-eyeX, eyeY + r * 0.18, fz]} rotation={[0, 0, 0.14]} />
      <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[eyeX, eyeY + r * 0.18, fz]} rotation={[0, 0, -0.14]} />

      {/* Smile — different per character so each reads with its own expression.
          Lily (claire) = cute soft smile, Ruslana (ruslan) = same cute smile,
          Mia = wide bright grin, James = gentle upward smile. All are upward
          curves (ends higher than centre). */}
      {characterId === 'claire' || characterId === 'ruslan' ? (
        <>
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.045, r * 0.02, r * 0.01]} position={[0, -r * 0.51, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.028, r * 0.018, r * 0.01]} position={[-r * 0.07, -r * 0.49, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.028, r * 0.018, r * 0.01]} position={[r * 0.07, -r * 0.49, r * 0.83]} />
        </>
      ) : characterId === 'mia' ? (
        <>
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.07, r * 0.026, r * 0.01]} position={[0, -r * 0.49, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.04, r * 0.024, r * 0.01]} position={[-r * 0.11, -r * 0.45, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.04, r * 0.024, r * 0.01]} position={[r * 0.11, -r * 0.45, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.03, r * 0.02, r * 0.01]} position={[-r * 0.16, -r * 0.42, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.03, r * 0.02, r * 0.01]} position={[r * 0.16, -r * 0.42, r * 0.83]} />
        </>
      ) : (
        <>
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.05, r * 0.022, r * 0.01]} position={[0, -r * 0.50, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.034, r * 0.02, r * 0.01]} position={[-r * 0.085, -r * 0.47, r * 0.83]} />
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.034, r * 0.02, r * 0.01]} position={[r * 0.085, -r * 0.47, r * 0.83]} />
        </>
      )}

      {/* Ears — flatter lobe + a helical rim for a more ear-like shape */}
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 0.09, r * 0.12, r * 0.055]} position={[-r * 0.85, eyeY + r * 0.02, -r * 0.05]} />
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 0.09, r * 0.12, r * 0.055]} position={[r * 0.85, eyeY + r * 0.02, -r * 0.05]} />
      <mesh geometry={torusGeo(r * 0.075, r * 0.022, 6, 18)} material={skin} position={[-r * 0.85, eyeY + r * 0.03, -r * 0.05]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={torusGeo(r * 0.075, r * 0.022, 6, 18)} material={skin} position={[r * 0.85, eyeY + r * 0.03, -r * 0.05]} rotation={[0, Math.PI / 2, 0]} />
      {/* Inner ear */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} scale={[r * 0.04, r * 0.06, r * 0.03]} position={[-r * 0.88, eyeY + r * 0.02, -r * 0.03]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} scale={[r * 0.04, r * 0.06, r * 0.03]} position={[r * 0.88, eyeY + r * 0.02, -r * 0.03]} />

      {/* Eyelids for blink — sit just in front of the eye so they cover it */}
      <group ref={lidsRef} scale={[1, 0, 1]} position={[0, eyeY, fz + r * 0.075]}>
        <mesh geometry={sphereGeo(1)} material={skin} scale={[eyeR * 1.55, eyeR * 1.4, r * 0.015]} position={[-eyeX, 0, 0]} />
        <mesh geometry={sphereGeo(1)} material={skin} scale={[eyeR * 1.55, eyeR * 1.4, r * 0.015]} position={[eyeX, 0, 0]} />
      </group>
    </group>
  )
}

/** Anime-style eye: big coloured iris with a dark limbal ring, a brighter
 *  lower glow (anime shading), a small pupil, two catchlights and an upper
 *  lash line. Built from layered forward-facing discs so it reads flat-on. */
function Eye({ r, x, y, z, iris }: { r: number; x: number; y: number; z: number; iris: string }) {
  const eyeR = r * 0.18
  const irisDark = shade(iris, -0.5)
  const irisLight = shade(iris, 0.55)
  const white = sharedMaterial('#f7f3ea', 0.3)
  const irisEdge = sharedMaterial(irisDark, 0.28)
  const irisM = sharedMaterial(iris, 0.25)
  const irisGlow = sharedMaterial(irisLight, 0.22)
  const pupil = sharedMaterial('#0c0a08', 0.4)
  const glint = sharedMaterial('#ffffff', 0.08)
  const lash = sharedMaterial(irisDark, 0.45)
  return (
    <group position={[x, y, z]}>
      {/* sclera */}
      <mesh geometry={sphereGeo(1)} material={white} scale={[eyeR * 1.25, eyeR * 1.18, r * 0.06]} />
      {/* dark limbal ring at the iris edge */}
      <mesh geometry={sphereGeo(1)} material={irisEdge} scale={[eyeR, eyeR, r * 0.05]} position={[0, 0, r * 0.018]} />
      {/* main iris colour */}
      <mesh geometry={sphereGeo(1)} material={irisM} scale={[eyeR * 0.9, eyeR * 0.9, r * 0.055]} position={[0, 0, r * 0.022]} />
      {/* brighter lower glow (anime radial shading) */}
      <mesh geometry={sphereGeo(1)} material={irisGlow} scale={[eyeR * 0.62, eyeR * 0.5, r * 0.06]} position={[0, -eyeR * 0.2, r * 0.026]} />
      {/* pupil */}
      <mesh geometry={sphereGeo(1)} material={pupil} scale={[eyeR * 0.42, eyeR * 0.42, r * 0.06]} position={[0, 0, r * 0.03]} />
      {/* big + small catchlights */}
      <mesh geometry={sphereGeo(1)} material={glint} scale={[eyeR * 0.34, eyeR * 0.34, r * 0.06]} position={[-eyeR * 0.28, eyeR * 0.3, r * 0.035]} />
      <mesh geometry={sphereGeo(1)} material={glint} scale={[eyeR * 0.15, eyeR * 0.15, r * 0.06]} position={[eyeR * 0.26, -eyeR * 0.22, r * 0.035]} />
      {/* upper lash line */}
      <mesh geometry={sphereGeo(1)} material={lash} scale={[eyeR * 1.05, eyeR * 0.22, r * 0.07]} position={[0, eyeR * 0.92, r * 0.01]} />
    </group>
  )
}

/* ================================================ HAIR ================================================ */

function Strand({ m, len, rTop, rBot, p, rot }: { m: Mat; len: number; rTop: number; rBot: number; p: V3; rot?: V3 }) {
  return (
    <group position={p} rotation={rot}>
      <mesh geometry={taperGeo(rTop, rBot, len)} material={m} position={[0, -len / 2, 0]} castShadow />
    </group>
  )
}

function Hair({ config, P, hairM }: { config: AvatarConfig; P: Proportions; hairM: Mat }) {
  const r = P.headR
  const cy = r * 0.95
  // The boy (James) gets a dedicated anime spiky hairstyle with highlights.
  if (config.characterId === 'james') {
    return <AnimeSpikyHair P={P} hairM={hairM} />
  }
  // Cap stays centred on the head (z = -0.12r) but is flattened in depth (Z ×0.86)
  // so it hugs the skull: the front stops at the hairline (face shows) while the
  // back still fully covers the head — no "big head from behind", no face covered.
  const cap = (scale: V3, lift = 0.18) => {
    const [sx, sy, sz] = scale
    return <mesh geometry={sphereGeo(1)} material={hairM} scale={[sx, sy, sz * 0.86]} position={[0, cy + r * lift, -r * 0.12]} />
  }
  // Bangs sit higher and shorter so they frame the crown, not the face. Kept at
  // the forehead surface (~z 0.5r) so they still read as bangs, just smaller.
  const fringe = (w = 0.7, h = 0.1) => (
    <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * w, r * h, r * 0.32]} position={[0, cy + r * 0.72, r * 0.5]} rotation={[0.14, 0, 0]} />
  )
  const sideFall = (len: number, top: number, bot: number, y = 0.3) => (
    <>
      <Strand m={hairM} len={r * len} rTop={r * top} rBot={r * bot} p={[-r * 0.97, cy + r * y, -r * 0.08]} rot={[0, 0, 0.05]} />
      <Strand m={hairM} len={r * len} rTop={r * top} rBot={r * bot} p={[r * 0.97, cy + r * y, -r * 0.08]} rot={[0, 0, -0.05]} />
    </>
  )
  const backFall = (len: number, top: number, bot: number) => (
    <Strand m={hairM} len={r * len} rTop={r * top} rBot={r * bot} p={[0, cy + r * 0.5, -r * 0.62]} rot={[-0.06, 0, 0]} />
  )
  const texturedCap = (scale: V3, lift: number, detailR: number) => (
    <group>
      {cap(scale, lift)}
      {[0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6].map((a, i) => {
        const x = Math.sin(a) * r * 0.82
        const z = Math.cos(a) * r * 0.42 - r * 0.1
        const y = cy + r * (0.5 + Math.sin(a * 0.8) * 0.25)
        return <mesh key={i} geometry={sphereGeo(1)} material={hairM} scale={[r * detailR, r * detailR * 0.7, r * detailR]} position={[x, y, z]} />
      })}
    </group>
  )

  switch (config.hair) {
    case 'none': return null
    case 'crop': return <group>{texturedCap([r * 1.02, r * 0.88, r * 1.04], 0.06, 0.12)}{fringe(0.84)}</group>
    case 'pixie': return <group>{texturedCap([r * 1.06, r * 0.96, r * 1.07], 0.12, 0.1)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.5, r * 0.15, r * 0.32]} position={[-r * 0.16, cy + r * 0.62, r * 0.52]} rotation={[0.22, 0, 0.2]} />{fringe(0.82)}</group>
    case 'bob': return <group>{texturedCap([r * 1.09, r * 1.02, r * 1.09], 0.16, 0.11)}{sideFall(1.5, 0.42, 0.34, 0.34)}{backFall(1.4, 0.85, 0.6)}{fringe(0.88)}</group>
    case 'short_messy': return <group>{texturedCap([r * 1.07, r * 0.98, r * 1.07], 0.15, 0.13)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.44, r * 0.2, r * 0.4]} position={[-r * 0.3, cy + r * 0.78, r * 0.16]} />{fringe(0.82)}</group>
    case 'side_part': return <group>{texturedCap([r * 1.07, r * 1.01, r * 1.07], 0.15, 0.12)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.68, r * 0.18, r * 0.4]} position={[-r * 0.16, cy + r * 0.64, r * 0.46]} />{fringe(0.8)}</group>
    case 'curly': return <group>{texturedCap([r * 1.02, r * 0.94, r * 1.04], 0.12, 0.14)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.8, r * 0.4, r * 0.8]} position={[0, cy + r * 0.5, -r * 0.05]} />{fringe(0.82)}</group>
    case 'fade': return <group>{texturedCap([r * 1.0, r * 0.84, r * 1.02], 0.06, 0.1)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.76, r * 0.32, r * 0.78]} position={[0, cy + r * 0.5, r * 0.02]} />{fringe(0.74)}</group>
    case 'medium_layered': return <group>{texturedCap([r * 1.11, r * 1.04, r * 1.11], 0.16, 0.11)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.26, r * 0.48, r * 0.4]} position={[-r * 0.92, cy + r * 0.16, -r * 0.04]} /><mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.26, r * 0.48, r * 0.4]} position={[r * 0.92, cy + r * 0.16, -r * 0.04]} />{fringe(0.86)}</group>
    case 'spiky': return <group>{texturedCap([r * 1.03, r * 0.93, r * 1.03], 0.1, 0.12)}{([[-0.45, 0.2], [0, 0.28], [0.45, 0.2], [-0.22, 0.45], [0.22, 0.45]] as const).map(([sx, sz], i) => <Strand key={i} m={hairM} len={r * 0.6} rTop={r * 0.18} rBot={r * 0.02} p={[sx * r, cy + r * 0.82, sz * r]} rot={[-0.3 + sz * 0.2, 0, sx * 0.55]} />)}</group>
    case 'academic_neat': return <group>{texturedCap([r * 1.05, r * 0.99, r * 1.06], 0.13, 0.11)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.8, r * 0.18, r * 0.44]} position={[r * 0.05, cy + r * 0.6, r * 0.46]} />{fringe(0.82)}</group>
    case 'wavy': return <group>{texturedCap([r * 1.08, r * 1.01, r * 1.09], 0.15, 0.12)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.38, r * 0.2, r * 0.38]} position={[-r * 0.3, cy + r * 0.7, r * 0.26]} /><mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.38, r * 0.2, r * 0.38]} position={[r * 0.28, cy + r * 0.68, r * 0.26]} />{fringe(0.82)}</group>
    case 'long_straight': return <group>{texturedCap([r * 1.08, r * 1.01, r * 1.09], 0.18, 0.11)}{backFall(3.3, 1.0, 0.55)}{sideFall(2.7, 0.4, 0.22)}{fringe(0.84)}</group>
    case 'shoulder': return <group>{texturedCap([r * 1.09, r * 1.02, r * 1.09], 0.18, 0.11)}{backFall(1.7, 0.85, 0.5)}{sideFall(2.0, 0.42, 0.26)}{fringe(0.84)}</group>
    case 'wavy_long': return <group>{texturedCap([r * 1.08, r * 1.01, r * 1.09], 0.18, 0.11)}{backFall(2.9, 0.95, 0.55)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.88, r * 0.58, r * 0.56]} position={[0, cy - r * 0.95, -r * 0.72]} />{sideFall(2.4, 0.42, 0.24)}{fringe(0.84)}</group>
    case 'curly_long': return <group>{texturedCap([r * 1.09, r * 1.02, r * 1.09], 0.18, 0.14)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 1.2, r * 0.8, r * 1.0]} position={[0, cy - r * 0.3, -r * 0.3]} />{fringe(0.84)}</group>
    case 'ponytail': {
      const ribbonM = sharedMaterial('#f4b8cf', 0.55)
      return (
      <group>
        {/* Full scalp cap — covers crown/back/sides, leaves the face open */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 1.12, r * 1.05, r * 0.95]} position={[0, cy + r * 0.14, -r * 0.14]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 1.08, r * 1.0, r * 0.9]} position={[0, cy + r * 0.2, -r * 0.18]} />

        {/* Crown volume so the top isn't flat */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.5, r * 0.3, r * 0.46]} position={[0, cy + r * 0.74, -r * 0.12]} />

        {/* Soft bangs framing the forehead */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.92, r * 0.32, r * 0.5]} position={[0, cy + r * 0.62, r * 0.4]} rotation={[0.28, 0, 0]} />

        {/* Side temples — natural hairline */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.2, r * 0.4, r * 0.14]} position={[-r * 0.84, cy + r * 0.42, 0.0]} rotation={[0, 0, 0.12]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.2, r * 0.4, r * 0.14]} position={[r * 0.84, cy + r * 0.42, 0.0]} rotation={[0, 0, -0.12]} />

        {/* Scrunchie / hair tie */}
        <mesh geometry={sphereGeo(1)} material={ribbonM} scale={[r * 0.28, r * 0.22, r * 0.28]} position={[0, cy + r * 0.52, -r * 0.8]} />

        {/* High ponytail — smooth, thick, flowing */}
        <Strand m={hairM} len={r * 3.2} rTop={r * 0.28} rBot={r * 0.05} p={[0, cy + r * 0.54, -r * 0.86]} rot={[-0.12, 0, 0]} />
        <Strand m={hairM} len={r * 3.0} rTop={r * 0.24} rBot={r * 0.04} p={[r * 0.12, cy + r * 0.5, -r * 0.9]} rot={[-0.18, 0.04, 0]} />
        <Strand m={hairM} len={r * 2.8} rTop={r * 0.22} rBot={r * 0.035} p={[-r * 0.12, cy + r * 0.51, -r * 0.88]} rot={[-0.22, -0.04, 0]} />
        <Strand m={hairM} len={r * 2.4} rTop={r * 0.18} rBot={r * 0.03} p={[-r * 0.2, cy + r * 0.48, -r * 0.92]} rot={[-0.28, -0.05, -0.18]} />
        <Strand m={hairM} len={r * 2.4} rTop={r * 0.18} rBot={r * 0.03} p={[r * 0.2, cy + r * 0.48, -r * 0.92]} rot={[-0.28, 0.05, 0.18]} />

        {/* Loose face-framing wisps */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.15, r * 0.06, r * 0.09]} position={[-r * 0.34, cy + r * 0.58, r * 0.5]} rotation={[0.2, 0, 0.12]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.13, r * 0.05, r * 0.08]} position={[r * 0.32, cy + r * 0.6, r * 0.52]} rotation={[0.18, 0, -0.12]} />
      </group>
      )
    }
    case 'twintails': return <group>{texturedCap([r * 1.09, r * 1.03, r * 1.09], 0.15, 0.11)}{fringe(0.84)}{[-1, 1].map((sx) => <group key={sx}><mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.26, r * 0.26, r * 0.26]} position={[sx * r * 0.92, cy + r * 0.55, -r * 0.08]} /><Strand m={hairM} len={r * 2.0} rTop={r * 0.38} rBot={r * 0.1} p={[sx * r * 1.0, cy + r * 0.48, -r * 0.12]} rot={[-0.15, 0, sx * 0.45]} /></group>)}</group>
    case 'bun': return <group>{texturedCap([r * 1.07, r * 1.01, r * 1.07], 0.13, 0.1)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.38, r * 0.38, r * 0.38]} position={[0, cy + r * 1.02, -r * 0.08]} />{fringe(0.78)}</group>
    case 'braided': return <group>{texturedCap([r * 1.09, r * 1.02, r * 1.09], 0.18, 0.11)}{fringe(0.84)}{sideFall(1.3, 0.18, 0.1)}<Strand m={hairM} len={r * 2.5} rTop={r * 0.32} rBot={r * 0.08} p={[0, cy + r * 0.3, -r * 0.6]} rot={[-0.08, 0, 0]} /></group>
    default: return null
  }
}

/* Anime boy hair: layered spiky strands (a thick crown ring + outer ring +
 * sideburns). All strands use the single hair colour (no recoloured tips, no
 * front cowlick) so there are no stray coloured spikes. The frizz bump/rough
 * on hairM keeps it reading as fibres, not clay. */
function AnimeSpikyHair({ P, hairM }: { P: Proportions; hairM: Mat }) {
  const r = P.headR
  const cy = r * 0.95

  const spikes: any[] = []
  const ring = (count: number, yLift: number, baseLen: number, spread: number, tiltAmt: number) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.2
      const len = baseLen + ((i * 31) % 7) * 0.05
      const x = Math.sin(a) * r * spread
      const z = Math.cos(a) * r * (spread * 0.7) - r * 0.08
      spikes.push(
        <Strand
          key={`${yLift}-${i}`}
          m={hairM}
          len={r * len}
          rTop={r * 0.16}
          rBot={r * 0.02}
          p={[x, cy + r * yLift, z]}
          rot={[-Math.cos(a) * tiltAmt, 0, Math.sin(a) * tiltAmt]}
        />,
      )
    }
  }
  ring(16, 0.82, 0.62, 0.6, 0.5)
  ring(11, 0.68, 0.5, 0.78, 0.55)
  // sideburns
  spikes.push(<Strand key="sb1" m={hairM} len={r * 0.5} rTop={r * 0.12} rBot={r * 0.03} p={[-r * 0.92, cy + r * 0.4, r * 0.02]} rot={[0, 0, 0.08]} />)
  spikes.push(<Strand key="sb2" m={hairM} len={r * 0.5} rTop={r * 0.12} rBot={r * 0.03} p={[r * 0.92, cy + r * 0.4, r * 0.02]} rot={[0, 0, -0.08]} />)

  return (
    <group>
      {/* scalp base hugging the skull */}
      <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 1.05, r * 0.96, r * 1.03]} position={[0, cy + r * 0.2, -r * 0.08]} />
      {spikes}
    </group>
  )
}

/* ================================================ DINO HEAD ================================================ */

/** Cute blue dinosaur head (mascot costume): a rounded head with a snout, big
 *  friendly eyes, nostrils, a smiley mouth and a row of little head spikes. No
 *  human face — it reads purely as a dinosaur. Sized to P.headR like the head. */
function DinoHead({ P, main, belly, spike }: { P: Proportions; main: Mat; belly: Mat; spike: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const dark = sharedMaterial('#173a52', 0.5)
  const white = sharedMaterial('#ffffff', 0.35)

  return (
    <group position={[0, cy, 0]}>
      {/* rounded head */}
      <mesh geometry={sphereGeo(1)} material={main} scale={[r * 1.02, r * 1.0, r * 1.0]} castShadow />

      {/* snout + lighter muzzle underside */}
      <mesh geometry={sphereGeo(1)} material={main} scale={[r * 0.6, r * 0.5, r * 0.6]} position={[0, -r * 0.16, r * 0.72]} castShadow />
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.5, r * 0.32, r * 0.52]} position={[0, -r * 0.32, r * 0.76]} />

      {/* nostrils */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.05, r * 0.05, r * 0.03]} position={[-r * 0.15, -r * 0.02, r * 1.28]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.05, r * 0.05, r * 0.03]} position={[r * 0.15, -r * 0.02, r * 1.28]} />

      {/* smiley mouth line */}
      <mesh geometry={boxGeo(r * 0.5, r * 0.03, r * 0.02)} material={dark} position={[0, -r * 0.4, r * 1.02]} />

      {/* a few cute little teeth peeking over the lip */}
      {[-0.16, -0.05, 0.05, 0.16].map((tx, i) => (
        <mesh key={`t${i}`} geometry={taperGeo(r * 0.005, r * 0.035, r * 0.09)} material={white}
          position={[tx * r, -r * 0.34, r * 1.02]} rotation={[Math.PI, 0, 0]} />
      ))}

      {/* rosy cheeks */}
      {[-1, 1].map((sx) => (
        <mesh key={`c${sx}`} geometry={sphereGeo(1)} material={sharedMaterial('#e88a6a', 0.6)} scale={[r * 0.11, r * 0.08, r * 0.04]} position={[sx * r * 0.5, -r * 0.18, r * 0.78]} />
      ))}

      {/* big friendly eyes: white + pupil + catchlight, with a brow ridge */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * r * 0.4, r * 0.2, r * 0.68]}>
          <mesh geometry={sphereGeo(1)} material={main} scale={[r * 0.26, r * 0.16, r * 0.14]} position={[0, r * 0.17, 0]} />
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.2, r * 0.25, r * 0.16]} />
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.14, r * 0.1]} position={[0, 0, r * 0.12]} />
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.04, r * 0.04, r * 0.02]} position={[sx * -r * 0.03, r * 0.07, r * 0.2]} />
        </group>
      ))}

      {/* two little nub horns on the snout */}
      {[-1, 1].map((sx) => (
        <mesh key={`h${sx}`} geometry={taperGeo(r * 0.02, r * 0.07, r * 0.16)} material={spike} position={[sx * r * 0.14, r * 0.12, r * 0.9]} rotation={[0.6, 0, 0]} />
      ))}

      {/* little head spikes marching back over the crown */}
      {[0, 1, 2].map((i) => {
        const sc = 1 - i * 0.22
        return (
          <mesh key={i} geometry={taperGeo(r * 0.015, r * 0.13 * sc, r * 0.34 * sc)} material={spike}
            position={[0, r * 0.82 - i * r * 0.16, -r * 0.02 - i * r * 0.3]} rotation={[-0.6, 0, 0]} castShadow />
        )
      })}
    </group>
  )
}

/* ================================================ RABBIT HEAD ================================================ */

/** Cute white toy-rabbit head: round fluffy head, tall upright ears with pink
 *  inner lining, shiny button eyes, a little pink nose, buck teeth, whiskers and
 *  rosy cheeks. No human face — reads purely as a plush bunny. */
function RabbitHead({ P, fur, inner, nose }: { P: Proportions; fur: Mat; inner: Mat; nose: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const dark = sharedMaterial('#3a2f33', 0.25, 0.2)
  const white = sharedMaterial('#ffffff', 0.3)

  return (
    <group position={[0, cy, 0]}>
      {/* round fluffy head */}
      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.02, r * 1.05, r * 1.0]} castShadow />
      {/* soft muzzle / cheeks */}
      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.55, r * 0.42, r * 0.5]} position={[0, -r * 0.26, r * 0.68]} />

      {/* tall upright ears with pink inner lining */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * r * 0.34, r * 0.95, -r * 0.02]} rotation={[-0.12, 0, sx * 0.16]}>
          <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.24, r * 0.72, r * 0.16]} castShadow />
          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.13, r * 0.56, r * 0.09]} position={[0, 0, r * 0.09]} />
        </group>
      ))}

      {/* shiny button eyes with catchlights — on the head surface, bulging out */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * r * 0.32, r * 0.16, r * 0.9]}>
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.15, r * 0.18, r * 0.13]} />
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.05, r * 0.05, r * 0.03]} position={[sx * -r * 0.04, r * 0.06, r * 0.11]} />
        </group>
      ))}

      {/* little pink nose */}
      <mesh geometry={sphereGeo(1)} material={nose} scale={[r * 0.11, r * 0.09, r * 0.09]} position={[0, -r * 0.12, r * 1.08]} />
      {/* mouth split below the nose */}
      <mesh geometry={boxGeo(r * 0.016, r * 0.1, r * 0.02)} material={dark} position={[0, -r * 0.26, r * 1.02]} />

      {/* buck teeth */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={boxGeo(r * 0.07, r * 0.11, r * 0.04)} material={white} position={[sx * r * 0.045, -r * 0.36, r * 1.0]} />
      ))}

      {/* rosy cheeks */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={sphereGeo(1)} material={sharedMaterial('#f4b0c4', 0.6)} scale={[r * 0.13, r * 0.1, r * 0.06]} position={[sx * r * 0.46, -r * 0.14, r * 0.86]} />
      ))}

      {/* whiskers */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {[0.06, -0.02, -0.1].map((wy, i) => (
            <mesh key={i} geometry={boxGeo(r * 0.42, r * 0.008, r * 0.008)} material={dark} position={[sx * r * 0.58, -r * 0.12 + wy * r, r * 0.92]} rotation={[0, 0, sx * (0.12 - i * 0.1)]} />
          ))}
        </group>
      ))}
    </group>
  )
}

/* ================================================ BLUE CAP ================================================ */

function BlueCap({ P }: { P: Proportions }) {
  const r = P.headR
  const cy = r * 0.92
  const strawLight = sharedMaterial('#e8d5a3', 0.78)
  const strawMid = sharedMaterial('#d4c090', 0.78)
  const strawDark = sharedMaterial('#c4a870', 0.78)
  const ribbonMat = sharedMaterial('#1a1a1a', 0.6)

  return (
    <group position={[0, cy + r * 0.68, 0]}>
      {/* Flat top disc */}
      <mesh geometry={boxGeo(r * 0.95, r * 0.03, r * 0.95)} material={strawLight} position={[0, r * 0.16, 0]} castShadow />

      {/* Crown — short cylinder */}
      <mesh geometry={latheGeo([
        [r * 0.48, -r * 0.01],
        [r * 0.48, r * 0.15],
      ])} material={strawMid} position={[0, 0, 0]} castShadow />

      {/* Black ribbon — sits right on the brim at crown base */}
      <mesh geometry={latheGeo([
        [r * 0.485, -r * 0.025],
        [r * 0.505, -r * 0.025],
        [r * 0.505, r * 0.015],
        [r * 0.485, r * 0.015],
      ])} material={ribbonMat} position={[0, 0, 0]} />

      {/* Subtle straw rings on top disc */}
      {[0.18, 0.32].map((s, i) => (
        <mesh key={`t${i}`} geometry={torusGeo(r * s, r * 0.003, 6, 32)} material={i % 2 === 0 ? strawDark : strawMid} position={[0, r * 0.178, 0]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
    </group>
  )
}

/* ================================================ KOKOSHNIK ================================================ */

/** Traditional Russian kokoshnik: a tall fan-shaped crest that rises above the
 *  forehead, sitting on top of the hair (braid stays visible). Rich red fabric
 *  with a gold border, white pearl beading and a warm fur base band for winter. */
function Kokoshnik({ P }: { P: Proportions }) {
  const r = P.headR
  const cy = r * 0.92
  const red = new MeshStandardMaterial({ color: '#b4202f', roughness: 0.7, metalness: 0, side: 2 })
  const gold = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.35, metalness: 0.35, side: 2 })
  const pearl = sharedMaterial('#f7f2e7', 0.4)
  const fur = sharedMaterial('#efe7d3', 0.95)
  const crest: [number, number, number] = [0, r * 1.45, r * 0.18]
  const tilt: [number, number, number] = [-0.32, 0, 0]

  return (
    <group position={[0, cy, 0]}>
      {/* warm fur / wool base band along the hairline */}
      <mesh geometry={torusGeo(r * 0.98, r * 0.12)} material={fur} position={[0, r * 0.62, r * 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow />

      {/* fan-shaped crest — red fabric plate rising above the forehead */}
      <mesh geometry={sphereGeo(1)} material={red} scale={[r * 1.25, r * 1.0, r * 0.06]} position={crest} rotation={tilt} castShadow />
      {/* gold border arch around the crest */}
      <mesh geometry={torusGeo(r * 1.0, r * 0.07)} material={gold} scale={[1.2, 1.0, 1]} position={crest} rotation={tilt} />
      {/* central gold sunburst ornament */}
      <mesh geometry={sphereGeo(1)} material={gold} scale={[r * 0.22, r * 0.22, r * 0.05]} position={[0, r * 1.4, r * 0.24]} rotation={tilt} />

      {/* arc of white pearls along the crest's upper edge */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = Math.PI * (0.15 + (i / 8) * 0.7)
        return (
          <mesh key={`kp${i}`} geometry={sphereGeo(1)} material={pearl}
            scale={[r * 0.07, r * 0.07, r * 0.07]}
            position={[Math.cos(a) * r * 1.18, r * 1.45 + Math.sin(a) * r * 1.05, r * 0.3]} />
        )
      })}

      {/* hanging pearl strands framing the temples */}
      {[-1, 1].map((sx) => (
        <group key={`ks${sx}`}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} geometry={sphereGeo(1)} material={pearl}
              scale={[r * 0.06, r * 0.06, r * 0.06]}
              position={[sx * r * 0.92, r * 0.5 - j * r * 0.16, r * 0.32]} />
          ))}
        </group>
      ))}
    </group>
  )
}

/* ================================================ WIZARD HAT ================================================ */

function WizardHat({ P }: { P: Proportions }) {
  const r = P.headR
  const hatNavy = new MeshStandardMaterial({ color: '#1B2B5A', roughness: 0.55, metalness: 0, side: 2 })
  const hatGold = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.35, metalness: 0.1, side: 2 })

  // Spec: brim radius = head width + 10, head width = 28 units → rig head width = 2 * r
  // Scale factor from spec units: head_width_rig / 28 = (2 * r) / 28 ≈ r / 14
  const sf = (2 * r) / 28
  const brimR = 24 * sf
  const coneBaseR = 14 * sf
  const coneH = 33 * sf

  // Position hat on top of head — head center is at r*0.92, head extends to r*1.92
  // BlueCap sits at r*1.6, wizard hat goes slightly higher for the tall cone
  const hatY = r * 1.65

  return (
    <group position={[0, hatY, 0]}>
      {/* Brim — flat cylinder */}
      <mesh geometry={latheGeo([
        [coneBaseR * 0.6, 0],
        [brimR, 0],
        [brimR, -2 * sf],
        [coneBaseR * 0.6, -2 * sf],
      ])} material={hatNavy} castShadow />

      {/* Cone — tall pointed */}
      <mesh geometry={latheGeo([
        [0, coneH],
        [coneBaseR * 0.1, coneH * 0.85],
        [coneBaseR * 0.25, coneH * 0.65],
        [coneBaseR * 0.5, coneH * 0.45],
        [coneBaseR * 0.75, coneH * 0.2],
        [coneBaseR, 0],
      ])} material={hatNavy} castShadow />

      {/* Gold torus trim at base of cone */}
      <mesh geometry={torusGeo(coneBaseR, 0.5 * sf)} material={hatGold} position={[0, 0.5 * sf, 0]} rotation={[Math.PI / 2, 0, 0]} />

      {/* 3x crescent moons at 0°, 120°, 240° */}
      {[0, 120, 240].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const moonH = coneH * 0.4
        const moonDist = coneBaseR * 0.65
        return (
          <group key={`moon${i}`} position={[Math.sin(rad) * moonDist, moonH, Math.cos(rad) * moonDist]}>
            <mesh geometry={sphereGeo(1)} material={hatGold} scale={[2 * sf, 2 * sf, 0.3 * sf]} />
            <mesh geometry={sphereGeo(1)} material={hatNavy} scale={[1.5 * sf, 1.5 * sf, 0.4 * sf]} position={[0.8 * sf, 0.5 * sf, 0]} />
          </group>
        )
      })}

      {/* 12x 4-point gold stars scattered */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + 0.2
        const height = coneH * 0.15 + ((i % 4) / 4) * coneH * 0.6
        const starDist = coneBaseR * 0.8 * (1 - height / coneH)
        return (
          <mesh
            key={`star${i}`}
            geometry={sphereGeo(1)}
            material={hatGold}
            scale={[0.75 * sf, 0.75 * sf, 0.2 * sf]}
            position={[Math.sin(angle) * starDist, height, Math.cos(angle) * starDist]}
          />
        )
      })}
    </group>
  )
}

/* ================================================ ARMS ================================================ */

function Arm({ side, bind, P, skin, topM, isSleeved, isDino, clawM }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; topM: Mat; isSleeved: boolean; isDino?: boolean; clawM?: Mat
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'armUpperL' : 'armUpperR'
  const lower: BoneName = side === 'L' ? 'armLowerL' : 'armLowerR'
  const armM = isSleeved ? topM : skin

  return (
    <group ref={bind(upper)} position={[sign * P.shoulderW, 0.04 + P.spineLen + P.chestLen * 0.65, 0]}>
      {/* Upper arm (bicep + deltoid) — ONE continuous mesh: smooth taper from the
          seamless elbow up through the bicep to a deltoid that domes over and
          closes to a rounded top, which tucks up inside the torso. No separate
          shoulder ball, so the shoulder flows naturally into the arm. */}
      <mesh geometry={latheGeo([
        [P.elbowR, -P.upperArm],
        [P.elbowR * 1.08, -P.upperArm * 0.85],
        [P.shoulderR * 1.3, -P.upperArm * 0.58],
        [P.shoulderR * 1.6, -P.upperArm * 0.3],
        [P.shoulderR * 1.8, -P.upperArm * 0.08],
        [P.shoulderR * 1.7, P.upperArm * 0.06],
        [P.shoulderR * 1.3, P.upperArm * 0.16],
        [P.shoulderR * 0.7, P.upperArm * 0.24],
        [P.shoulderR * 0.15, P.upperArm * 0.3],
      ])} material={armM} castShadow />

      <group ref={bind(lower)} position={[0, -P.upperArm, 0]}>
        {/* Forearm — mirrors the shin's clean profile: a swell near the elbow that
            tapers to the wrist. Top radius is exactly P.elbowR so it matches the
            upper arm's bottom for a seamless elbow joint (like the knee). */}
        <mesh geometry={latheGeo([
          [P.wristR, -P.lowerArm],
          [P.wristR * 1.02, -P.lowerArm * 0.9],
          [P.wristR * 1.15, -P.lowerArm * 0.7],
          [P.elbowR * 1.05, -P.lowerArm * 0.35],
          [P.elbowR * 1.08, -P.lowerArm * 0.2],
          [P.elbowR, 0],
        ])} material={skin} castShadow />

        {/* Hand */}
        <group position={[0, -P.lowerArm - P.wristR * 0.3, 0]}>
          <mesh geometry={sphereGeo(1)} material={skin} scale={[P.wristR * 1.3, P.handLen * 0.48, P.wristR * 1.1]} position={[0, -P.handLen * 0.3, 0]} castShadow />
          <mesh geometry={sphereGeo(1)} material={skin} scale={[P.wristR * 0.26, P.wristR * 0.26, P.wristR * 0.26]} position={[P.wristR * 0.88, -P.handLen * 0.12, P.wristR * 0.26]} />
          {[-P.wristR * 0.46, -P.wristR * 0.14, P.wristR * 0.14, P.wristR * 0.4].map((fx, i) => (
            <group key={i} position={[fx, -P.handLen * 0.45, 0]}>
              <mesh geometry={taperGeo(P.wristR * 0.12, P.wristR * 0.08, P.handLen * (0.28 - i * 0.02))} material={skin} position={[0, -P.handLen * 0.12, 0]} />
              <mesh geometry={sphereGeo(1)} material={skin} scale={[P.wristR * 0.08, P.wristR * 0.08, P.wristR * 0.08]} position={[0, -P.handLen * (0.26 - i * 0.02), 0]} />
              {/* dino claw tip */}
              {isDino && (
                <mesh geometry={taperGeo(P.wristR * 0.005, P.wristR * 0.09, P.handLen * 0.16)} material={clawM ?? skin} position={[0, -P.handLen * (0.32 - i * 0.02), P.wristR * 0.04]} rotation={[0.5, 0, 0]} />
              )}
            </group>
          ))}
        </group>
      </group>
    </group>
  )
}

/* ================================================ LEGS ================================================ */

function Leg({ side, bind, P, skin, botM, shoeM, shoeAccent, config }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; botM: Mat; shoeM: Mat; shoeAccent: Mat; config: AvatarConfig
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'legUpperL' : 'legUpperR'
  const lower: BoneName = side === 'L' ? 'legLowerL' : 'legLowerR'
  const foot: BoneName = side === 'L' ? 'footL' : 'footR'
  const isDino = config.characterId === 'dino'
  const calfMat = config.bottom === 'shorts' ? skin : botM
  const legMat = config.top === 'frock' ? skin : botM

  return (
    <group ref={bind(upper)} position={[sign * P.hipW * 0.7, -0.02, 0]}>
      {/* Thigh — lathe profile bottom→top (ascending Y) */}
      <mesh geometry={latheGeo([
        [P.kneeR, -P.upperLeg],
        [P.kneeR * 1.05, -P.upperLeg * 0.88],
        [P.thighR * 1.0, -P.upperLeg * 0.6],
        [P.thighR * 1.12, -P.upperLeg * 0.35],
        [P.thighR * 1.18, -P.upperLeg * 0.15],
        [P.thighR * 1.15, 0],
      ])} material={legMat} castShadow />

      <group ref={bind(lower)} position={[0, -P.upperLeg, 0]}>
        {/* Shin — top radius matches thigh bottom exactly */}
        <mesh geometry={latheGeo([
          [P.ankleR, -P.lowerLeg],
          [P.ankleR * 1.02, -P.lowerLeg * 0.9],
          [P.ankleR * 1.1, -P.lowerLeg * 0.7],
          [P.kneeR * 1.08, -P.lowerLeg * 0.35],
          [P.kneeR * 1.1, -P.lowerLeg * 0.2],
          [P.kneeR, 0],
        ])} material={calfMat} castShadow />

        <group ref={bind(foot)} position={[0, -P.lowerLeg - P.ankleR * 0.4, 0]}>
          <mesh geometry={sphereGeo(1)} material={config.shoes === 'boots' ? shoeM : skin} scale={[P.ankleR * 1.1, P.ankleR * 1.1, P.ankleR * 1.1]} />
          <mesh geometry={sphereGeo(1)} material={shoeM} scale={[P.ankleR * 1.2, P.ankleR * 0.8, P.footLen * 0.45]} position={[0, -P.ankleR * 0.08, P.footLen * 0.22]} castShadow />
          <mesh geometry={sphereGeo(1)} material={shoeM} scale={[P.ankleR * 1.0, P.ankleR * 0.65, P.footLen * 0.3]} position={[0, -P.ankleR * 0.22, P.footLen * 0.62]} castShadow />
          {!isDino && (
            <mesh geometry={boxGeo(P.ankleR * 2.2, P.ankleR * 0.4, P.footLen * 1.0)} material={shoeAccent} position={[0, -P.ankleR * 0.6, P.footLen * 0.28]} castShadow />
          )}
          {config.shoes === 'boots' && !isDino && (
            <mesh geometry={taperGeo(P.ankleR * 1.2, P.ankleR * 1.05, P.lowerLeg * 0.4)} material={shoeM} position={[0, P.lowerLeg * 0.2, -P.footLen * 0.02]} />
          )}
          {/* dino toe claws — three cream claws pointing forward */}
          {isDino && [-1, 0, 1].map((tx, i) => (
            <mesh key={i} geometry={taperGeo(P.ankleR * 0.02, P.ankleR * 0.17, P.footLen * 0.38)} material={shoeAccent}
              position={[tx * P.ankleR * 0.52, -P.ankleR * 0.3, P.footLen * 0.92]} rotation={[1.4, 0, 0]} castShadow />
          ))}
        </group>
      </group>
    </group>
  )
}

/* ================================================ TOP OVERLAYS ================================================ */

function Top({ config, P, topM, skin: _skin }: { config: AvatarConfig; P: Proportions; topM: Mat; skin: Mat }) {
  const chestLogoTex = focusLilyChestTex()
  const backLogoTex = focusLilyBackTex()

  switch (config.top) {
    case 'hoodie':
      return (
        <group>
          <mesh geometry={sphereGeo(1)} material={topM} scale={[P.chestW * 0.6, P.chestLen * 0.35, P.torsoD * 0.48]} position={[0, P.chestLen * 0.92, -P.torsoD * 0.52]} />
          <mesh geometry={sphereGeo(1)} material={sharedMaterial(topHex(config.top), 0.75)} scale={[P.chestW * 0.45, P.chestLen * 0.16, P.torsoD * 0.14]} position={[0, P.chestLen * 0.08, P.torsoD * 0.76]} />
          <mesh geometry={boxGeo(P.chestW * 0.01, P.chestLen * 0.68, P.torsoD * 0.012)} material={sharedMaterial('#8a8a8a', 0.3, 0.2)} position={[0, P.chestLen * 0.4, P.torsoD * 0.96]} />
          <mesh geometry={boxGeo(P.chestW * 0.006, P.chestLen * 0.2, P.torsoD * 0.006)} material={sharedMaterial('#e0ddd5', 0.7)} position={[-P.chestW * 0.03, P.chestLen * 0.58, P.torsoD * 0.97]} />
          <mesh geometry={boxGeo(P.chestW * 0.006, P.chestLen * 0.2, P.torsoD * 0.006)} material={sharedMaterial('#e0ddd5', 0.7)} position={[P.chestW * 0.03, P.chestLen * 0.58, P.torsoD * 0.97]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), chestLogoTex)} scale={[P.chestW * 0.18, P.chestLen * 0.18, 0.015]} position={[-P.chestW * 0.3, P.chestLen * 0.52, P.torsoD * 0.98]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), backLogoTex)} scale={[P.chestW * 0.55, P.chestLen * 0.55, 0.015]} position={[0, P.chestLen * 0.35, -P.torsoD * 0.92]} rotation={[0, Math.PI, 0]} />
        </group>
      )

    case 'jacket':
      return (
        <group>
          <mesh geometry={boxGeo(P.chestW * 0.16, P.chestLen * 0.7, P.torsoD * 0.06)} material={topM} position={[-P.chestW * 0.32, P.chestLen * 0.4, P.torsoD * 0.94]} rotation={[0, 0, 0.14]} />
          <mesh geometry={boxGeo(P.chestW * 0.16, P.chestLen * 0.7, P.torsoD * 0.06)} material={topM} position={[P.chestW * 0.32, P.chestLen * 0.4, P.torsoD * 0.94]} rotation={[0, 0, -0.14]} />
          <mesh geometry={sphereGeo(1)} material={topM} scale={[P.chestW * 0.65, P.chestLen * 0.12, P.torsoD * 0.52]} position={[0, P.chestLen * 0.78, P.torsoD * 0.16]} />
          <mesh geometry={boxGeo(P.chestW * 0.01, P.chestLen * 0.68, P.torsoD * 0.012)} material={sharedMaterial('#8a8a8a', 0.3, 0.2)} position={[0, P.chestLen * 0.4, P.torsoD * 0.96]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), chestLogoTex)} scale={[P.chestW * 0.15, P.chestLen * 0.15, 0.015]} position={[-P.chestW * 0.28, P.chestLen * 0.52, P.torsoD * 0.98]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), backLogoTex)} scale={[P.chestW * 0.5, P.chestLen * 0.5, 0.015]} position={[0, P.chestLen * 0.35, -P.torsoD * 0.92]} rotation={[0, Math.PI, 0]} />
        </group>
      )

    case 'blazer':
      return (
        <group>
          <mesh geometry={boxGeo(P.chestW * 0.18, P.chestLen * 0.76, P.torsoD * 0.08)} material={topM} position={[-P.chestW * 0.32, P.chestLen * 0.38, P.torsoD * 0.96]} rotation={[0, 0, 0.16]} />
          <mesh geometry={boxGeo(P.chestW * 0.18, P.chestLen * 0.76, P.torsoD * 0.08)} material={topM} position={[P.chestW * 0.32, P.chestLen * 0.38, P.torsoD * 0.96]} rotation={[0, 0, -0.16]} />
          <mesh geometry={sphereGeo(1)} material={topM} scale={[P.chestW * 0.72, P.chestLen * 0.13, P.torsoD * 0.56]} position={[0, P.chestLen * 0.78, P.torsoD * 0.16]} />
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#2a2a2a', 0.3, 0.1)} scale={[P.chestW * 0.02, P.chestLen * 0.02, P.torsoD * 0.015]} position={[0, P.chestLen * 0.35, P.torsoD * 0.98]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), chestLogoTex)} scale={[P.chestW * 0.14, P.chestLen * 0.14, 0.015]} position={[P.chestW * 0.26, P.chestLen * 0.54, P.torsoD * 0.98]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), backLogoTex)} scale={[P.chestW * 0.48, P.chestLen * 0.48, 0.015]} position={[0, P.chestLen * 0.35, -P.torsoD * 0.92]} rotation={[0, Math.PI, 0]} />
        </group>
      )

    case 'sarafan': {
      // Traditional Russian sarafan: a white blouse (rubakha) under a rich red
      // pinafore with shoulder straps, a gold+white embroidered central band and
      // gold buttons, finished with a warm cream fur collar for winter. The long
      // A-line skirt is rendered down by the legs.
      const white = sharedMaterial('#f7f2e7', 0.85)
      const fur = sharedMaterial('#efe7d3', 0.95)
      const gold = sharedMaterial('#D4AF37', 0.35, 0.5)
      const embroidery = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.4, metalness: 0.2, side: 2 })
      return (
        <group>
          {/* white blouse chest + neckline showing above the sarafan */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[P.chestW * 0.66, P.chestLen * 0.42, P.torsoD * 0.5]} position={[0, P.chestLen * 0.88, -P.torsoD * 0.5]} />
          {/* warm fur collar around the neckline */}
          <mesh geometry={torusGeo(P.neckR * 2.0, P.neckR * 0.7)} material={fur} position={[0, P.chestLen * 0.92, P.torsoD * 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow />
          {/* red sarafan shoulder straps over the white blouse */}
          <mesh geometry={boxGeo(P.chestW * 0.16, P.chestLen * 0.5, P.torsoD * 0.06)} material={topM} position={[-P.chestW * 0.34, P.chestLen * 0.66, P.torsoD * 0.9]} rotation={[0, 0, 0.06]} />
          <mesh geometry={boxGeo(P.chestW * 0.16, P.chestLen * 0.5, P.torsoD * 0.06)} material={topM} position={[P.chestW * 0.34, P.chestLen * 0.66, P.torsoD * 0.9]} rotation={[0, 0, -0.06]} />
          {/* central embroidered band down the front (gold on red) */}
          <mesh geometry={boxGeo(P.chestW * 0.2, P.chestLen * 0.78, P.torsoD * 0.02)} material={embroidery} position={[0, P.chestLen * 0.42, P.torsoD * 0.99]} />
          <mesh geometry={boxGeo(P.chestW * 0.26, P.chestLen * 0.06, P.torsoD * 0.02)} material={embroidery} position={[0, P.chestLen * 0.74, P.torsoD * 0.99]} />
          {/* row of gold buttons down the embroidered band */}
          {[0.66, 0.5, 0.34, 0.18].map((y, i) => (
            <mesh key={`sb${i}`} geometry={sphereGeo(1)} material={gold} scale={[P.chestW * 0.045, P.chestLen * 0.045, P.torsoD * 0.02]} position={[0, P.chestLen * y, P.torsoD * 1.0]} />
          ))}
          {/* white embroidered folk motifs flanking the band */}
          {[0.6, 0.4, 0.2].map((y, i) => (
            <group key={`sm${i}`}>
              <mesh geometry={sphereGeo(1)} material={white} scale={[P.chestW * 0.04, P.chestLen * 0.04, P.torsoD * 0.015]} position={[-P.chestW * 0.22, P.chestLen * y, P.torsoD * 0.99]} />
              <mesh geometry={sphereGeo(1)} material={white} scale={[P.chestW * 0.04, P.chestLen * 0.04, P.torsoD * 0.015]} position={[P.chestW * 0.22, P.chestLen * y, P.torsoD * 0.99]} />
            </group>
          ))}
        </group>
      )
    }

    case 'robe': {
      const robeLen = P.chestLen * 1.7
      const goldTrim = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.4, metalness: 0.15, side: 2 })
      const starGold = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.5, metalness: 0, side: 2 })
      const blackShirt = new MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8, metalness: 0, side: 2 })
      const robeMat = new MeshStandardMaterial({ color: topHex(config.top), roughness: 0.82, metalness: 0, side: 2 })
      return (
        <group>
          {/* Black undershirt visible under open robe */}
          <mesh geometry={taperGeo(P.chestW * 0.82, P.hipBoneW * 1.4, robeLen * 0.95)} material={blackShirt} position={[0, -robeLen * 0.33, 0]} />
          {/* Navy robe outer layer */}
          <mesh geometry={taperGeo(P.chestW * 0.9, P.hipBoneW * 1.6, robeLen)} material={robeMat} position={[0, -robeLen * 0.35, 0]} castShadow />
          {/* Gold trim edges */}
          <mesh geometry={boxGeo(P.chestW * 0.04, robeLen * 0.88, P.torsoD * 0.03)} material={goldTrim} position={[-P.chestW * 0.44, -robeLen * 0.35, P.torsoD * 0.88]} />
          <mesh geometry={boxGeo(P.chestW * 0.04, robeLen * 0.88, P.torsoD * 0.03)} material={goldTrim} position={[P.chestW * 0.44, -robeLen * 0.35, P.torsoD * 0.88]} />
          {/* Black undershirt chest panel */}
          <mesh geometry={sphereGeo(1)} material={blackShirt} scale={[P.chestW * 0.52, P.chestLen * 0.3, P.torsoD * 0.42]} position={[0, P.chestLen * 0.9, -P.torsoD * 0.5]} />
          {/* Navy robe chest panel */}
          <mesh geometry={sphereGeo(1)} material={topM} scale={[P.chestW * 0.58, P.chestLen * 0.34, P.torsoD * 0.46]} position={[0, P.chestLen * 0.9, -P.torsoD * 0.54]} />
          {/* Gold star/moon constellation patterns on robe front */}
          {[
            [-P.chestW * 0.25, -robeLen * 0.15, P.torsoD * 0.85],
            [P.chestW * 0.2, -robeLen * 0.05, P.torsoD * 0.82],
            [-P.chestW * 0.15, -robeLen * 0.4, P.torsoD * 0.9],
            [P.chestW * 0.28, -robeLen * 0.3, P.torsoD * 0.88],
            [-P.chestW * 0.3, -robeLen * 0.55, P.torsoD * 0.92],
            [P.chestW * 0.1, -robeLen * 0.5, P.torsoD * 0.91],
            [0, -robeLen * 0.25, P.torsoD * 0.95],
            [-P.chestW * 0.08, -robeLen * 0.65, P.torsoD * 0.93],
            [P.chestW * 0.32, -robeLen * 0.6, P.torsoD * 0.9],
          ].map((pos, i) => (
            <mesh key={`rs${i}`} geometry={sphereGeo(1)} material={starGold} scale={[P.chestW * 0.025, P.chestLen * 0.025, P.torsoD * 0.01]} position={pos as [number, number, number]} />
          ))}
          {/* Crescent moons on robe */}
          {[
            [-P.chestW * 0.18, -robeLen * 0.1, P.torsoD * 0.92],
            [P.chestW * 0.15, -robeLen * 0.45, P.torsoD * 0.94],
          ].map((pos, i) => (
            <mesh key={`rm${i}`} geometry={sphereGeo(1)} material={goldTrim} scale={[P.chestW * 0.04, P.chestLen * 0.04, P.torsoD * 0.01]} position={pos as [number, number, number]} />
          ))}
          {/* Constellation lines connecting stars */}
          <mesh geometry={boxGeo(P.chestW * 0.005, robeLen * 0.12, P.torsoD * 0.005)} material={goldTrim} position={[-P.chestW * 0.08, -robeLen * 0.2, P.torsoD * 0.93]} rotation={[0, 0, 0.3]} />
          <mesh geometry={boxGeo(P.chestW * 0.005, robeLen * 0.1, P.torsoD * 0.005)} material={goldTrim} position={[P.chestW * 0.18, -robeLen * 0.35, P.torsoD * 0.91]} rotation={[0, 0, -0.2]} />
          {/* Gold clasp */}
          <mesh geometry={sphereGeo(1)} material={goldTrim} scale={[P.chestW * 0.1, P.chestLen * 0.1, P.torsoD * 0.01]} position={[0, P.chestLen * 0.44, P.torsoD * 0.97]} />
        </group>
      )
    }

    case 'tee':
    default:
      return (
        <group>
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), chestLogoTex)} scale={[P.chestW * 0.17, P.chestLen * 0.17, 0.015]} position={[-P.chestW * 0.28, P.chestLen * 0.54, P.torsoD * 0.98]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), backLogoTex)} scale={[P.chestW * 0.52, P.chestLen * 0.52, 0.015]} position={[0, P.chestLen * 0.35, -P.torsoD * 0.92]} rotation={[0, Math.PI, 0]} />
        </group>
      )

    case 'frock': {
      const frockM = sharedMaterial(topHex(config.top), 0.8)
      const ribbonM = sharedMaterial('#ffffff', 0.5)
      return (
        <group>
          {/* Fitted bodice */}
          <mesh geometry={sphereGeo(1)} material={frockM} scale={[P.chestW * 0.72, P.chestLen * 0.22, P.torsoD * 0.62]} position={[0, P.chestLen * 0.45, P.torsoD * 0.12]} />
          {/* Ribbon bow at center */}
          <mesh geometry={sphereGeo(1)} material={ribbonM} scale={[P.chestW * 0.06, P.chestLen * 0.04, P.torsoD * 0.01]} position={[0, P.chestLen * 0.65, P.torsoD * 0.96]} />
          {/* Logo patches */}
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), chestLogoTex)} scale={[P.chestW * 0.14, P.chestLen * 0.14, 0.015]} position={[-P.chestW * 0.26, P.chestLen * 0.52, P.torsoD * 0.98]} />
          <mesh geometry={sphereGeo(1)} material={texMat(topHex(config.top), backLogoTex)} scale={[P.chestW * 0.46, P.chestLen * 0.46, 0.015]} position={[0, P.chestLen * 0.35, -P.torsoD * 0.92]} rotation={[0, Math.PI, 0]} />
        </group>
      )
    }
  }
}

function texMat(hex: string, tex: ReturnType<typeof focusLilyChestTex>): Mat {
  const m = sharedMaterial(hex, 0.82)
  m.map = tex
  m.needsUpdate = true
  return m
}
