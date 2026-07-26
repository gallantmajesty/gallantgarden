// @ts-nocheck
import { useImperativeHandle, useMemo, useRef } from 'react'
import { Color, Group, MeshStandardMaterial, CatmullRomCurve3, TubeGeometry, Vector3, DoubleSide } from 'three'
import {
  boxGeo,
  sphereGeo,
  circleGeo,
  taperGeo,
  torusGeo,
  latheGeo,
  torsoGeo,
  skirtGeo,
  skinHex,
  hairHex,
  eyeHex,
  shoeHex,
  topHex,
  bottomHex,
  sharedMaterial,
  glowMaterial,
  skinMaterial,
  hairMaterial,
  type AvatarConfig,
} from './config'
import { heightScale, proportionsFor, type BoneName, type Proportions } from './rig'
import { focusLilyChestTex, hairFrizzTex, skinReliefTex } from './logoTextures'

export type BoneMap = Partial<Record<BoneName, Group>>

export interface AvatarRigHandle {
  bones: BoneMap
  lids: Group | null
  root: Group | null
  skirt: Group | null
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
  hideAccessories,
}: {
  config: AvatarConfig
  ref?: React.Ref<AvatarRigHandle>
  hideAccessories?: boolean
}) {
  const rootRef = useRef<Group>(null)
  const lidsRef = useRef<Group>(null)
  const skirtRef = useRef<Group>(null)
  const bones = useMemo<BoneMap>(() => ({}), [])

  useImperativeHandle(ref, () => ({ bones, lids: lidsRef.current, root: rootRef.current, skirt: skirtRef.current }), [bones])

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

  // Robot: a sci-fi android on the same skeleton — black metal outfit with
  // glowing blue sci-fi accent lines, a visor head and no human face/shoes.
  const isRobot = config.characterId === 'robot'
  const robotDark = sharedMaterial('#0c0d10', 0.4, 0.85)
  const robotMetal = sharedMaterial('#3a3d44', 0.3, 0.95)
  const robotJoint = sharedMaterial('#23262b', 0.25, 1.0)
  const glowBlue = glowMaterial('#2fa8ff', 3.0)

  // Alien: a friendly green extraterrestrial — green skin, big black eyes,
  // antennae and a dark jumpsuit. No human face/hair/shoes.
  const isAlien = config.characterId === 'alien'
  const alienSkin = sharedMaterial('#4ec24a', 0.55, 0.0)
  const alienDark = sharedMaterial('#0c130d', 0.6, 0.2)
  const glowGreen = glowMaterial('#6dff7a', 2.5)

  // Pig: a cheerful pink piglet on the same skeleton — pink skin, a flat disc
  // snout with two nostrils, floppy ears, a curly tail and no human face/hair/shoes.
  const isPig = config.characterId === 'pig'
  const pigMain = sharedMaterial('#f2a6c4', 0.62)
  const pigDark = sharedMaterial('#de7ba3', 0.6)
  const pigBelly = sharedMaterial('#fbd9e7', 0.7)
  const pigNose = sharedMaterial('#e2739e', 0.55)

  // Angel: a radiant white seraph — porcelain skin, a flowing white robe with
  // gold trim, feathered wings, a glowing golden halo and soft blue eyes.
  // No human hair/hat (costume path), but keeps a serene human-style face.
  const isAngel = config.characterId === 'angel'
  const angelRobe = useMemo(() => new MeshStandardMaterial({ color: '#f6f1e6', roughness: 0.85, side: 2 }), [])
  const angelRobeShade = useMemo(() => new MeshStandardMaterial({ color: '#e6dcc6', roughness: 0.85, side: 2 }), [])
  const angelSkin = skinMaterial('#f3e6d8')
  const angelGold = sharedMaterial('#e8c878', 0.4, 0.45)
  const glowGold = glowMaterial('#ffe9a8', 2.6)
  const angelWing = sharedMaterial('#fbf7ee', 0.7)
  const angelWingShade = sharedMaterial('#e3dac6', 0.7)
  const angelWingEdge = sharedMaterial('#d8cdb2', 0.7)
  const angelHair = sharedMaterial('#f4e3a8', 0.5)
  const angelHairShade = sharedMaterial('#e6cf86', 0.55)
  const angelChest = useMemo(() => new MeshStandardMaterial({ color: '#efe6cf', roughness: 0.82, side: 2 }), [])
  const angelSash = sharedMaterial('#e8c878', 0.4, 0.45)

  // Hacker: a fully-clothed, masked cyber operator on the same skeleton. The
  // hood is pulled UP over the head, the lower face is covered by a balaclava
  // mask, the eyes hide behind a glowing green visor, the hands wear gloves and
  // the chest carries a glowing terminal keypad. Reads unmistakably as a hacker.
  const isHacker = config.characterId === 'hacker'

  // Sunflower: a cheerful full-body sunflower mascot — glowing yellow skin/body,
  // green leafy arms and skirt, earthy brown root feet and a big sunflower bloom head.
  const isSunflower = config.characterId === 'sunflower'
  const sfYellow = sharedMaterial('#ffcd00', 0.52)
  const sfYellowDark = sharedMaterial('#e8b800', 0.55)
  const sfBrown = sharedMaterial('#8c6c30', 0.72)
  const sfGreen = sharedMaterial('#5caa3a', 0.65)
  const sfGreenDouble = new MeshStandardMaterial({ color: '#5caa3a', roughness: 0.65, metalness: 0, flatShading: false, side: DoubleSide })
  const sfSeed = sharedMaterial('#603813', 0.6)
  const sfPetalEdge = sharedMaterial('#ffe680', 0.5)

  // Grim Reaper: chibi skeleton in a dark hooded cloak with gold armor, green
  // glowing eyes, a scythe and spectral green flames.
  const isGrim = config.characterId === 'grim'
  const grimBone = sharedMaterial('#e8dcc0', 0.6)
  const grimBoneDark = sharedMaterial('#c4b89a', 0.65)
  const grimCloak = sharedMaterial('#1a1a1e', 0.85)
  const grimCloakInner = sharedMaterial('#8b1a1a', 0.8)
  const grimArmor = sharedMaterial('#2a2a2e', 0.5, 0.8)
  const grimGold = sharedMaterial('#c9a84c', 0.35, 0.55)
  const grimGoldDark = sharedMaterial('#a08030', 0.4, 0.6)
  const grimGem = glowMaterial('#2ef060', 2.8)
  const grimGlow = glowMaterial('#39ff14', 3.0)
  const grimLeather = sharedMaterial('#3a2820', 0.82)
  const grimRedBoot = sharedMaterial('#7a1a1a', 0.7)
  const grimEyeOrbit = sharedMaterial('#0a0c08', 0.15)
  const grimSocket = sharedMaterial('#0a0a0c', 0.15)

  const hackerDark = sharedMaterial('#15171c', 0.7, 0.1)
  const hackerHood = sharedMaterial('#0b0d11', 0.85, 0.06)
  const hackerMask = sharedMaterial('#0e0f13', 0.8, 0.05)
  const hackerAccent = sharedMaterial('#1a2028', 0.6)
  const hackerGlow = glowMaterial('#39ff14', 3.0)
  const hackerVisorGlass = sharedMaterial('#0c2112', 0.2, 0.1)

  // Elephant: a gentle gray elephant — big round head, floppy ears, a long
  // trunk, tiny tusks and a thin tail with a tuft. No human face/hair/shoes.
  const isElephant = config.characterId === 'elephant'
  const elMain = sharedMaterial('#8a8f94', 0.65)
  const elDark = sharedMaterial('#6e7378', 0.6)
  const elBelly = sharedMaterial('#f0e8d8', 0.75)
  const elInner = sharedMaterial('#c4a0a0', 0.55)
  const elTusk = sharedMaterial('#f0ece0', 0.4)

  const isAnimal = isDino || isRabbit || isRobot || isAlien || isPig || isAngel || isSunflower || isGrim || isElephant
  const bunFur = sharedMaterial('#f8f5f0', 0.75)
  const bunPink = sharedMaterial('#f2a3c0', 0.6)
  const bunInner = sharedMaterial('#f6c2d6', 0.6)
  const bunGreen = sharedMaterial('#7cc47b', 0.6)
  const bunNose = sharedMaterial('#e488a6', 0.5)

  const skin = isDino ? dinoMain : isRabbit ? bunFur : isRobot ? robotMetal : isAlien ? alienSkin : isPig ? pigMain : isAngel ? angelSkin : isSunflower ? sfYellow : isGrim ? grimCloak : isElephant ? elMain : skinMaterial(config.skinColor ?? skinHex(config.skin))
  const hairM = hairMaterial(config.hairColorHex ?? hairHex(config.hairColor))
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
  if (!isDino && !isRabbit && !isRobot && !isAlien && !isPig && !isAngel && !isSunflower && !isGrim && !isElephant) {
    skin.bumpMap = skinTex
    skin.bumpScale = 0.025
  }
  // Elephant: subtle wrinkle/fold texture for organic skin feel
  if (isElephant) {
    const elSkinTex = skinReliefTex()
    elMain.bumpMap = elSkinTex
    elMain.bumpScale = 0.03
    elMain.roughness = 0.7
    elDark.roughness = 0.65
    elBelly.roughness = 0.75
  }
  const topM = isDino ? dinoMain : isRabbit ? bunPink : isRobot ? robotDark : isAlien ? alienDark : isPig ? pigMain : isAngel ? angelRobe : isSunflower ? sfGreen : isGrim ? grimCloak : isElephant ? elMain : sharedMaterial(config.topColor ?? topHex(config.top), 0.82)
  const botM = isDino ? dinoMain : isRabbit ? bunPink : isRobot ? robotDark : isAlien ? alienSkin : isPig ? pigMain : isAngel ? angelRobe : isSunflower ? sfBrown : isGrim ? grimCloak : isElephant ? elMain : sharedMaterial(config.bottomColor ?? bottomHex(config.bottom), 0.82)
  const shoeM = isDino ? dinoDark : isRabbit ? bunFur : isPig ? pigDark : isAngel ? angelRobeShade : isSunflower ? sfBrown : isGrim ? grimRedBoot : isElephant ? elDark : sharedMaterial(shoeHex(config.shoes), 0.5)
  const shoeAccent = sharedMaterial('#f2efe8', 0.5)

  const bind = (name: BoneName) => (g: Group | null) => {
    if (g) bones[name] = g
  }

  const isSleeved = config.top !== 'tee'

  return (
    <group ref={rootRef} scale={s}>
      <group ref={bind('hips')} position={[0, P.hipsY, 0]}>
        <group ref={bind('spine')} position={[0, 0.04, 0]}>
          {isElephant ? (
            <mesh geometry={torsoGeo([
              { y: -0.07, hw: P.hipBoneW * 1.3, hd: P.torsoD * 1.15 },
              { y: -0.02, hw: P.hipBoneW * 1.25, hd: P.torsoD * 1.12 },
              { y: P.spineLen * 0.5, hw: P.waistW * 1.15, hd: P.torsoD * 1.1 },
              { y: P.spineLen, hw: P.chestW * 1.2, hd: P.torsoD * 1.2 },
              { y: P.spineLen + P.chestLen * 0.45, hw: P.chestW * 1.25, hd: P.torsoD * 1.3 },
              { y: P.spineLen + P.chestLen * 0.8, hw: P.chestW * 1.3, hd: P.torsoD * 1.25 },
              { y: P.spineLen + P.chestLen, hw: P.shoulderW * 1.1, hd: P.torsoD * 1.1 },
              { y: P.spineLen + P.chestLen * 1.06, hw: P.neckR * 2.5, hd: P.torsoD * 0.7 },
            ])} material={topM} castShadow />
          ) : isSunflower ? (
            /* Sunflower: use default female torso — green dress bodice */
            <mesh geometry={torsoGeo([
              { y: -0.07, hw: P.hipBoneW * 1.1, hd: P.torsoD * 0.88 },
              { y: -0.02, hw: P.hipBoneW * 1.02, hd: P.torsoD * 0.85 },
              { y: P.spineLen * 0.5, hw: P.waistW * 0.98, hd: P.torsoD * 0.88 },
              { y: P.spineLen, hw: P.chestW * 0.95, hd: P.torsoD * 0.95 },
              { y: P.spineLen + P.chestLen * 0.45, hw: P.chestW, hd: P.torsoD * 1.15 },
              { y: P.spineLen + P.chestLen * 0.8, hw: P.chestW * 1.08, hd: P.torsoD * 1.05 },
              { y: P.spineLen + P.chestLen, hw: P.shoulderW * 0.82, hd: P.torsoD * 0.92 },
              { y: P.spineLen + P.chestLen * 1.06, hw: P.neckR * 2.2, hd: P.torsoD * 0.55 },
            ])} material={topM} castShadow />
          ) : (
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
          )}

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
            {/* Costume characters (dino/rabbit/robot/pig/angel/sunflower/grim) have no clothing overlays. */}
            {!isDino && !isRabbit && !isRobot && !isPig && !isAngel && !isSunflower && !isGrim && <Top config={config} P={P} topM={topM} skin={skin} />}

            {/* Robot sci-fi accents: glowing chest core + blue accent lines. */}
            {isRobot && (
              <group>
                {/* glowing reactor core on the chest */}
                <mesh geometry={sphereGeo(1)} material={glowBlue} scale={[P.chestW * 0.16, P.chestLen * 0.14, P.torsoD * 0.12]} position={[0, P.chestLen * 0.5, P.torsoD * 1.02]} />
                <mesh geometry={sphereGeo(1)} material={robotMetal} scale={[P.chestW * 0.22, P.chestLen * 0.2, P.torsoD * 0.1]} position={[0, P.chestLen * 0.5, P.torsoD * 0.98]} />
                {/* vertical blue line down the sternum */}
                <mesh geometry={boxGeo(P.chestW * 0.04, P.chestLen * 0.62, P.torsoD * 0.04)} material={glowBlue} position={[0, P.chestLen * 0.55, P.torsoD * 1.04]} />
                {/* diagonal shoulder accent lines */}
                <mesh geometry={boxGeo(P.chestW * 0.5, P.chestLen * 0.04, P.torsoD * 0.04)} material={glowBlue} position={[-P.chestW * 0.28, P.chestLen * 0.82, P.torsoD * 0.5]} rotation={[0, 0, 0.6]} />
                <mesh geometry={boxGeo(P.chestW * 0.5, P.chestLen * 0.04, P.torsoD * 0.04)} material={glowBlue} position={[P.chestW * 0.28, P.chestLen * 0.82, P.torsoD * 0.5]} rotation={[0, 0, -0.6]} />
              </group>
            )}

            {/* Alien: glowing green chest emblem on the dark jumpsuit. */}
            {isAlien && (
              <group>
                <mesh geometry={sphereGeo(1)} material={glowGreen} scale={[P.chestW * 0.16, P.chestLen * 0.14, P.torsoD * 0.12]} position={[0, P.chestLen * 0.5, P.torsoD * 1.02]} />
                <mesh geometry={sphereGeo(1)} material={alienDark} scale={[P.chestW * 0.22, P.chestLen * 0.2, P.torsoD * 0.1]} position={[0, P.chestLen * 0.5, P.torsoD * 0.98]} />
              </group>
            )}

            {/* Hacker: a big glowing green terminal panel on the chest + a keypad
                grid, with neon green shoulder/zip lines so the hoodie reads as a
                real hacker outfit instead of a dark blob. */}
            {isHacker && (
              <group>
                {/* chunky neon-green vertical zip line down the front */}
                <mesh geometry={boxGeo(P.chestW * 0.06, P.chestLen * 0.95, P.torsoD * 0.04)} material={hackerGlow} position={[0, P.chestLen * 0.45, P.torsoD * 1.02]} />
                {/* shoulder accent lines */}
                <mesh geometry={boxGeo(P.chestW * 0.55, P.chestLen * 0.05, P.torsoD * 0.04)} material={hackerGlow} position={[-P.chestW * 0.3, P.chestLen * 0.82, P.torsoD * 0.5]} rotation={[0, 0, 0.55]} />
                <mesh geometry={boxGeo(P.chestW * 0.55, P.chestLen * 0.05, P.torsoD * 0.04)} material={hackerGlow} position={[P.chestW * 0.3, P.chestLen * 0.82, P.torsoD * 0.5]} rotation={[0, 0, -0.55]} />
                {/* dark terminal panel */}
                <mesh geometry={boxGeo(P.chestW * 0.6, P.chestLen * 0.62, P.torsoD * 0.05)} material={hackerAccent} position={[0, P.chestLen * 0.42, P.torsoD * 0.99]} />
                {/* glowing screen */}
                <mesh geometry={boxGeo(P.chestW * 0.5, P.chestLen * 0.2, P.torsoD * 0.03)} material={hackerGlow} position={[0, P.chestLen * 0.58, P.torsoD * 1.03]} />
                {/* keypad grid */}
                {[0.34, 0.26, 0.18].map((y, r) => (
                  [-0.2, 0, 0.2].map((x, c) => (
                    <mesh key={`hk${r}${c}`} geometry={boxGeo(P.chestW * 0.11, P.chestLen * 0.06, P.torsoD * 0.03)} material={hackerGlow}
                      position={[x * P.chestW, P.chestLen * y, P.torsoD * 1.03]} />
                  ))
                ))}
              </group>
            )}

            {/* seamless body for animal mascots — torso + limbs render in their
                suit colour; heads and feet stay skin. No discs/plates. */}

            <group ref={bind('neck')} position={[0, P.chestLen * 0.86, 0]}>
              {/* Sunflower: green leafy collar with petal-like ruffles around the neck */}
              {isSunflower && (
                <group>
                  {[0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI, -Math.PI * 0.25, -Math.PI * 0.5, -Math.PI * 0.75].map((a, i) => (
                    <mesh key={`nlp${i}`} geometry={sphereGeo(1)} material={sfGreen}
                      scale={[P.neckR * 0.9, P.neckR * 0.6, P.torsoD * 0.18]}
                      position={[Math.sin(a) * P.neckR * 2.5, P.chestLen * 0.15, Math.cos(a) * P.torsoD * 0.6]}
                      rotation={[0, a, Math.sin(a) * 0.3]} />
                  ))}
                </group>
              )}
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
              {/* Cat: a cute pink bow worn at the throat */}
              <group ref={bind('head')} position={[0, P.neckLen, 0]}>
                {isDino ? (
                  <DinoHead P={P} main={dinoMain} belly={dinoBelly} spike={dinoDark} />
                ) : isRabbit ? (
                  <RabbitHead P={P} fur={bunFur} inner={bunInner} nose={bunNose} />
                ) : isRobot ? (
                  <RobotHead P={P} metal={robotMetal} glow={glowBlue} />
                ) : isAlien ? (
                  <AlienHead P={P} skin={alienSkin} glow={glowGreen} />
                ) : isPig ? (
                  <PigHead P={P} main={pigMain} belly={pigBelly} nose={pigNose} dark={pigDark} />
                ) : isAngel ? (
                  <AngelHead P={P} skin={angelSkin} hairM={angelHair} hairShade={angelHairShade} gold={angelGold} glow={glowGold} />
                ) : isSunflower ? (
                  <SunflowerHead P={P} yellow={sfYellow} dark={sfYellowDark} seed={sfSeed} green={sfGreen} petalEdge={sfPetalEdge} />
                ) : isGrim ? (
                  <GrimHead P={P} bone={grimBone} boneDark={grimBoneDark} cloak={grimCloak} glow={grimGlow} gold={grimGold} />
                ) : isElephant ? (
                  <ElephantHead P={P} main={elMain} dark={elDark} belly={elBelly} inner={elInner} tusk={elTusk} />
                ) : isHacker ? (
                  <HackerHead P={P} skin={skin} hairM={hairM} glow={hackerGlow} config={config} />
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

        <Leg side="L" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} showShoes={!isAnimal} isRobot={isRobot} isAlien={isAlien} isAngel={isAngel} sashM={angelSash} glowM={isAngel ? glowGold : glowBlue} isHacker={isHacker} hackerGlow={hackerGlow} hackerAccent={hackerAccent} isSunflower={isSunflower} sfBrown={sfBrown} sfGreen={sfGreen} isGrim={isGrim} grimCloak={grimCloak} grimRedBoot={grimRedBoot} grimGold={grimGold} grimGoldDark={grimGoldDark} isElephant={isElephant} />
        <Leg side="R" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} showShoes={!isAnimal} isRobot={isRobot} isAlien={isAlien} isAngel={isAngel} sashM={angelSash} glowM={isAngel ? glowGold : glowBlue} isHacker={isHacker} hackerGlow={hackerGlow} hackerAccent={hackerAccent} isSunflower={isSunflower} sfBrown={sfBrown} sfGreen={sfGreen} isGrim={isGrim} grimCloak={grimCloak} grimRedBoot={grimRedBoot} grimGold={grimGold} grimGoldDark={grimGoldDark} isElephant={isElephant} />

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

        {/* Pig costume — a curly corkscrew tail on the lower back */}
        {isPig && (
          <group position={[0, -0.02, -P.torsoD * 0.9]}>
            <mesh geometry={torusGeo(P.hipBoneW * 0.16, P.hipBoneW * 0.05, 8, 16)} material={pigMain} position={[0, 0, -P.hipBoneW * 0.1]} rotation={[Math.PI / 2, 0, 0.5]} />
            <mesh geometry={torusGeo(P.hipBoneW * 0.11, P.hipBoneW * 0.045, 8, 16)} material={pigMain} position={[P.hipBoneW * 0.05, P.hipBoneW * 0.16, -P.hipBoneW * 0.2]} rotation={[Math.PI / 2, 0, 0.9]} />
            <mesh geometry={torusGeo(P.hipBoneW * 0.07, P.hipBoneW * 0.04, 8, 16)} material={pigMain} position={[P.hipBoneW * 0.0, P.hipBoneW * 0.32, -P.hipBoneW * 0.28]} rotation={[Math.PI / 2, 0, 1.3]} />
          </group>
        )}

        {/* Elephant costume — chubby body with cute belly patch, stubby tail with fluffy tuft */}
        {isElephant && (
          <group>
            {/* round cream belly circle */}
            <mesh geometry={sphereGeo(1)} material={elBelly} scale={[P.chestW * 0.55, P.chestLen * 0.4, P.torsoD * 0.2]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.88]} />
            {/* tail on lower back — curved taper */}
            <group position={[0, 0.02, -P.torsoD * 0.85]}>
              <mesh geometry={taperGeo(P.hipBoneW * 0.04, P.hipBoneW * 0.015, P.upperLeg * 0.35)} material={elMain} position={[0, -P.upperLeg * 0.18, 0]} rotation={[0.95, 0, 0]} />
              {/* fluffy tail tuft — organic cluster */}
              <group position={[0, -P.upperLeg * 0.38, -P.hipBoneW * 0.1]}>
                <mesh geometry={sphereGeo(1)} material={elDark} scale={[P.hipBoneW * 0.08, P.hipBoneW * 0.1, P.hipBoneW * 0.06]} />
                {[[0.15, 0.05], [-0.12, 0.08], [0.0, 0.15], [-0.08, -0.08], [0.1, -0.1]].map(([dx, dy], i) => (
                  <mesh key={i} geometry={sphereGeo(1)} material={elDark} scale={[P.hipBoneW * 0.055, P.hipBoneW * 0.07, P.hipBoneW * 0.045]} position={[dx * P.hipBoneW, dy * P.hipBoneW, P.hipBoneW * 0.02]} />
                ))}
              </group>
            </group>
          </group>
        )}

        {isSunflower && (
          <group>
            {/* Flared A-line skirt — fitted at body hips, gentle flare to below knees */}
            <mesh geometry={latheGeo([
              [P.hipBoneW * 1.08, -P.upperLeg * 0.04],
              [P.hipBoneW * 1.12, -P.upperLeg * 0.15],
              [P.hipBoneW * 1.18, -P.upperLeg * 0.35],
              [P.hipBoneW * 1.22, -P.upperLeg * 0.55],
              [P.hipBoneW * 1.25, -P.upperLeg * 0.72],
              [P.hipBoneW * 1.22, -P.upperLeg * 0.82],
            ])} material={sfGreenDouble} castShadow />
            {/* Yellow neckline ring */}
            <mesh geometry={torusGeo(P.chestW * 0.35, P.chestW * 0.035, 8, 20)} material={sfYellow}
              position={[0, P.chestLen * 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} />
            {/* Leafy waist sash — sits at natural waist */}
            <mesh geometry={torusGeo(P.waistW * 0.88, P.hipBoneW * 0.045, 8, 24)} material={sfGreen}
              position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
            {/* Small yellow petals at waist */}
            {[0, Math.PI * 0.33, Math.PI * 0.67, Math.PI, -Math.PI * 0.33, -Math.PI * 0.67].map((a, i) => (
              <mesh key={`sp${i}`} geometry={sphereGeo(1)} material={sfYellow}
                scale={[P.hipBoneW * 0.1, P.hipBoneW * 0.07, P.torsoD * 0.06]}
                position={[Math.sin(a) * P.hipBoneW * 0.9, -P.upperLeg * 0.04, Math.cos(a) * P.torsoD * 0.5]} />
            ))}
          </group>
        )}

        {/* Grim Reaper costume — dark hooded cloak with red inner lining, gold
            trimmed armor, shoulder pads with spikes, green gem on chest, leather
            belt with skull buckle, and a scythe weapon */}
        {isGrim && (
          <group>
            {/* Dark cloak — flowing tattered robe, wider at the hem */}
            <mesh geometry={latheGeo([
              [P.waistW * 1.05, P.chestLen * 0.2],
              [P.hipBoneW * 1.2, 0],
              [P.hipBoneW * 1.5, -P.upperLeg * 0.4],
              [P.hipBoneW * 1.9, -P.upperLeg * 0.9],
              [P.hipBoneW * 2.2, -P.upperLeg * 1.4],
              [P.hipBoneW * 2.0, -P.upperLeg * 1.6],
            ])} material={grimCloak} castShadow />
            {/* Red inner lining visible at the hem */}
            <mesh geometry={latheGeo([
              [P.hipBoneW * 1.85, -P.upperLeg * 1.35],
              [P.hipBoneW * 2.15, -P.upperLeg * 1.45],
              [P.hipBoneW * 1.95, -P.upperLeg * 1.55],
            ])} material={grimCloakInner} />

            {/* Leather belt with skull buckle */}
            <mesh geometry={latheGeo([
              [P.hipBoneW * 1.08, -P.hipBoneW * 0.08],
              [P.hipBoneW * 1.12, -P.hipBoneW * 0.04],
              [P.hipBoneW * 1.12, P.hipBoneW * 0.04],
              [P.hipBoneW * 1.08, P.hipBoneW * 0.08],
            ])} material={grimLeather} position={[0, 0, 0]} />
            {/* Gold belt buckle — small skull shape (sphere + eye dots) */}
            <mesh geometry={sphereGeo(1)} material={grimGold} scale={[P.hipBoneW * 0.14, P.hipBoneW * 0.12, P.torsoD * 0.06]} position={[0, 0, P.torsoD * 1.02]} />
            <mesh geometry={sphereGeo(1)} material={grimEyeOrbit} scale={[P.hipBoneW * 0.03, P.hipBoneW * 0.03, P.torsoD * 0.03]} position={[-P.hipBoneW * 0.04, P.hipBoneW * 0.03, P.torsoD * 1.1]} />
            <mesh geometry={sphereGeo(1)} material={grimEyeOrbit} scale={[P.hipBoneW * 0.03, P.hipBoneW * 0.03, P.torsoD * 0.03]} position={[P.hipBoneW * 0.04, P.hipBoneW * 0.03, P.torsoD * 1.1]} />

            {/* Armor chest plate — dark metal */}
            <mesh geometry={latheGeo([
              [P.chestW * 0.4, P.chestLen * 0.3],
              [P.chestW * 0.48, P.chestLen * 0.5],
              [P.chestW * 0.52, P.chestLen * 0.7],
              [P.chestW * 0.44, P.chestLen * 0.9],
            ])} material={grimArmor} position={[0, 0, P.torsoD * 0.85]} castShadow />

            {/* Green gem on chest — pentagon shape */}
            <mesh geometry={sphereGeo(1)} material={grimGem} scale={[P.chestW * 0.12, P.chestLen * 0.12, P.torsoD * 0.06]} position={[0, P.chestLen * 0.55, P.torsoD * 1.08]} />
            {/* Gold gem setting */}
            <mesh geometry={torusGeo(P.chestW * 0.14, P.chestW * 0.02, 5, 12)} material={grimGold} position={[0, P.chestLen * 0.55, P.torsoD * 1.06]} />

            {/* Shoulder pads — gold with green gem accents and spikes */}
            {[-1, 1].map((sx) => (
              <group key={`spad${sx}`} position={[sx * P.shoulderW * 0.95, P.chestLen * 0.85, -P.torsoD * 0.2]}>
                {/* Gold shoulder plate */}
                <mesh geometry={sphereGeo(1)} material={grimGold} scale={[P.chestW * 0.22, P.chestLen * 0.16, P.torsoD * 0.2]} castShadow />
                {/* Gold spike on top */}
                <mesh geometry={taperGeo(P.chestW * 0.02, P.chestW * 0.08, P.chestLen * 0.22)} material={grimGold} position={[0, P.chestLen * 0.2, 0]} castShadow />
                {/* Green gem accent */}
                <mesh geometry={sphereGeo(1)} material={grimGem} scale={[P.chestW * 0.06, P.chestLen * 0.06, P.torsoD * 0.04]} position={[sx * -P.chestW * 0.08, 0, P.torsoD * 0.12]} />
              </group>
            ))}

            {/* Red tattered cloth strips hanging from the belt */}
            {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
              <mesh key={`ts${i}`} geometry={boxGeo(P.hipBoneW * 0.08, P.upperLeg * 0.5, P.torsoD * 0.02)} material={grimCloakInner}
                position={[x * P.hipBoneW, -P.upperLeg * 0.35, P.torsoD * 0.6]} rotation={[0, 0, Math.sin(i) * 0.15]} />
            ))}
          </group>
        )}

        {/* Angel costume — a flowing full-length white gown with gold trim, a
            sashed waist with a glowing gem, a soft shoulder cape, a chest emblem
            and two mathematically-fanned feathered wings. The halo floats above
            the head (drawn in AngelHead). The Top overlay is skipped (costume path). */}
        {isAngel && (
          <group>
            {/* FULL GOWN — a flowing A-line robe using a curved lathe profile
                (waist → hip → knee → flared hem), not a straight cone. The hem
                flares outward for a natural draped look. */}
            <mesh geometry={latheGeo([
              [P.waistW * 0.98, 0],
              [P.hipBoneW * 1.1, -P.upperLeg * 0.35],
              [P.hipBoneW * 1.5, -P.upperLeg * 0.85],
              [P.hipBoneW * 2.0, -P.upperLeg * 1.35],
              [P.hipBoneW * 2.6, -P.upperLeg * 1.6],
              [P.hipBoneW * 2.4, -P.upperLeg * 1.7],
            ])} material={angelRobe} position={[0, P.upperLeg * 0.45, 0]} castShadow />
            {/* inner layer for volume, slightly shorter */}
            <mesh geometry={latheGeo([
              [P.waistW * 0.92, 0],
              [P.hipBoneW * 1.0, -P.upperLeg * 0.3],
              [P.hipBoneW * 1.3, -P.upperLeg * 0.8],
              [P.hipBoneW * 1.7, -P.upperLeg * 1.25],
              [P.hipBoneW * 2.1, -P.upperLeg * 1.5],
              [P.hipBoneW * 1.95, -P.upperLeg * 1.6],
            ])} material={angelChest} position={[0, P.upperLeg * 0.45, 0]} />

            {/* CHEST EMBLEM — a softly raised gold sigil (radiant sun) on the sternum.
                Built from a central boss + 8 rays placed by angle. */}
            <group position={[0, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.0]}>
              <mesh geometry={sphereGeo(1)} material={angelSash} scale={[P.chestW * 0.12, P.chestLen * 0.1, P.torsoD * 0.04]} />
              {Array.from({ length: 8 }).map((_, i) => {
                const a = (i / 8) * Math.PI * 2
                return (
                  <mesh key={`ray${i}`} geometry={boxGeo(P.chestW * 0.03, P.chestLen * 0.16, P.torsoD * 0.03)} material={glowGold}
                    position={[Math.cos(a) * P.chestW * 0.16, Math.sin(a) * P.chestLen * 0.14, 0]}
                    rotation={[0, 0, a + Math.PI / 2]} />
                )
              })}
              <mesh geometry={sphereGeo(1)} material={glowGold} scale={[P.chestW * 0.07, P.chestLen * 0.06, P.torsoD * 0.04]} />
            </group>

            {/* FEATHERED WINGS — fanned, mirrored on both sides, mounted behind
                the shoulders. 5% bigger than default, pushed further back to
                clear the neck and hair. */}
            {[-1, 1].map((sx) => (
              <group key={`wing${sx}`}
                position={[sx * P.chestW * 0.5, P.spineLen + P.chestLen * 0.78, -P.torsoD * 0.35]}
                rotation={[0.25, sx * 0.55, 0]}
                scale={[sx * 1.2, 1.2, 1.2]}>
                <AngelWing P={P} mat={angelWing} shade={angelWingShade} edge={angelWingEdge} glow={glowGold} />
              </group>
            ))}
          </group>
        )}

        {/* Frock skirt — short A-line, after legs before arms */}
        {config.top === 'frock' && (() => {
          const skirtLen = P.upperLeg * 0.7
          const pinkMat = new MeshStandardMaterial({ color: '#d4a0b8', roughness: 0.75, metalness: 0, side: 2 })
          const blackMat = new MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8, metalness: 0, side: 2 })
          return (
            <group ref={skirtRef} position={[0, 0.01, 0]}>
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

        {/* Cat dress — short A-line pink skirt with a frilly white hem + waist bow */}
        {/* Sarafan long A-line skirt — flows to the ankles with an embroidered,
             gold-and-white folk hem over the red wool */}
        {config.top === 'sarafan' && (() => {
          const skirtLen = P.upperLeg * 1.7
          const redMat = new MeshStandardMaterial({ color: topHex(config.top), roughness: 0.85, metalness: 0, side: 2 })
          const goldMat = new MeshStandardMaterial({ color: '#D4AF37', roughness: 0.4, metalness: 0.2, side: 2 })
          const whiteMat = new MeshStandardMaterial({ color: '#f7f2e7', roughness: 0.85, metalness: 0, side: 2 })
          return (
            <group ref={skirtRef} position={[0, 0.01, 0]}>
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
        <Arm side="L" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} isAngel={isAngel} clawM={dinoBelly} isRobot={isRobot} glowM={glowBlue} isHacker={isHacker} />
        <Arm side="R" bind={bind} P={P} skin={skin} topM={config.top === 'sarafan' ? sharedMaterial('#f7f2e7', 0.85) : topM} isSleeved={isSleeved} isDino={isDino} isAngel={isAngel} clawM={dinoBelly} isRobot={isRobot} glowM={glowBlue} isHacker={isHacker} />

        {/* Grim Reaper scythe — a long dark handle with a curved blade and
            a skull pommel, held in the right hand */}
        {isGrim && (
          <group position={[P.shoulderW * 1.1, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.4]} rotation={[0, 0, -0.15]}>
            {/* Scythe handle — long dark rod */}
            <mesh geometry={taperGeo(P.chestW * 0.03, P.chestW * 0.025, P.chestLen * 3.8)} material={grimLeather} position={[0, -P.chestLen * 1.6, 0]} castShadow />
            {/* Gold grip bands along the handle */}
            {[0.0, 0.25, 0.5].map((t, i) => (
              <mesh key={`gb${i}`} geometry={torusGeo(P.chestW * 0.04, P.chestW * 0.008, 8, 16)} material={grimGold}
                position={[0, -P.chestLen * 1.6 + t * P.chestLen * 3.2, 0]} rotation={[Math.PI / 2, 0, 0]} />
            ))}
            {/* Scythe blade — curved crescent */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#b0b8c0', 0.2, 0.7)} scale={[P.chestW * 0.05, P.chestLen * 0.8, P.torsoD * 0.15]}
              position={[P.chestW * 0.2, P.chestLen * 1.2, 0]} rotation={[0, 0, 0.5]} castShadow />
            {/* Blade edge — thinner, sharper inner */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#d0d8e0', 0.15, 0.85)} scale={[P.chestW * 0.03, P.chestLen * 0.65, P.torsoD * 0.08]}
              position={[P.chestW * 0.22, P.chestLen * 1.2, P.torsoD * 0.05]} rotation={[0, 0, 0.5]} />
            {/* Skull pommel at the top */}
            <mesh geometry={sphereGeo(1)} material={grimBone} scale={[P.chestW * 0.1, P.chestLen * 0.1, P.torsoD * 0.08]} position={[0, P.chestLen * 1.5, 0]} castShadow />
            {/* Skull eye sockets */}
            <mesh geometry={sphereGeo(1)} material={grimSocket} scale={[P.chestW * 0.03, P.chestLen * 0.03, P.torsoD * 0.03]} position={[-P.chestW * 0.03, P.chestLen * 1.52, P.torsoD * 0.05]} />
            <mesh geometry={sphereGeo(1)} material={grimSocket} scale={[P.chestW * 0.03, P.chestLen * 0.03, P.torsoD * 0.03]} position={[P.chestW * 0.03, P.chestLen * 1.52, P.torsoD * 0.05]} />
            {/* Skull glowing green eyes */}
            <mesh geometry={sphereGeo(1)} material={grimGlow} scale={[P.chestW * 0.015, P.chestLen * 0.015, P.torsoD * 0.02]} position={[-P.chestW * 0.03, P.chestLen * 1.52, P.torsoD * 0.08]} />
            <mesh geometry={sphereGeo(1)} material={grimGlow} scale={[P.chestW * 0.015, P.chestLen * 0.015, P.torsoD * 0.02]} position={[P.chestW * 0.03, P.chestLen * 1.52, P.torsoD * 0.08]} />
          </group>
        )}

        {/* Grim Reaper green flame wisps — spectral green fire at the base */}
        {isGrim && (
          <group position={[0, -P.upperLeg * 0.8, 0]}>
            {[-P.hipBoneW * 1.2, -P.hipBoneW * 0.4, P.hipBoneW * 0.4, P.hipBoneW * 1.2].map((fx, i) => (
              <mesh key={`gfl${i}`} geometry={taperGeo(P.hipBoneW * 0.02, P.hipBoneW * 0.12, P.upperLeg * 0.45)} material={grimGlow}
                position={[fx, -P.upperLeg * 0.3, P.torsoD * 0.3]}
                rotation={[0.1, 0, Math.sin(i * 1.5) * 0.3]} />
            ))}
          </group>
        )}

        {/* Equipped accessories are now rendered on the library table surface
            by TableAccessories — no longer attached to the avatar. */}

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

/* Robot head: a sleek black metal helmet with a glowing blue visor band,
 * bright eye dots, a neck collar and a small antenna with a glowing tip.
 * No human face / hair. */
function RobotHead({ P, metal, glow }: { P: Proportions; metal: Mat; glow: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const fz = r * 0.88
  return (
    <group position={[0, cy, 0]}>
      {/* black metal helmet shell */}
      <mesh geometry={sphereGeo(1)} material={metal} scale={[r * 1.0, r * 1.02, r * 0.95]} castShadow />
      {/* glowing blue visor band across the eyes */}
      <mesh geometry={sphereGeo(1)} material={glow} scale={[r * 0.86, r * 0.26, r * 0.72]} position={[0, r * 0.02, fz * 0.82]} />
      {/* bright eye dots inside the visor */}
      <mesh geometry={sphereGeo(1)} material={glow} scale={[r * 0.13, r * 0.13, r * 0.05]} position={[-r * 0.3, r * 0.02, fz * 1.05]} />
      <mesh geometry={sphereGeo(1)} material={glow} scale={[r * 0.13, r * 0.13, r * 0.05]} position={[r * 0.3, r * 0.02, fz * 1.05]} />
      {/* side ear pods */}
      <mesh geometry={sphereGeo(1)} material={metal} scale={[r * 0.12, r * 0.2, r * 0.1]} position={[-r * 0.92, r * 0.05, -r * 0.05]} />
      <mesh geometry={sphereGeo(1)} material={metal} scale={[r * 0.12, r * 0.2, r * 0.1]} position={[r * 0.92, r * 0.05, -r * 0.05]} />
      {/* antenna with glowing tip */}
      <mesh geometry={taperGeo(r * 0.02, r * 0.05, r * 0.5)} material={metal} position={[0, r * 1.5, 0]} castShadow />
      <mesh geometry={sphereGeo(1)} material={glow} scale={[r * 0.12, r * 0.12, r * 0.12]} position={[0, r * 1.78, 0]} />
    </group>
  )
}

/* Alien head: round green skull with huge black teardrop eyes, small white
 * catchlights, short stubby antennae, no nose/mouth/ears. Classic "grey alien". */
function AlienHead({ P, skin, glow }: { P: Proportions; skin: Mat; glow: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const fz = r * 0.88
  const eyeBlack = sharedMaterial('#0a0a0c', 0.1)
  const eyeWhite = sharedMaterial('#ffffff', 0.08)
  /* head Z extent = r*0.92; eyes must sit ON that surface, not inside it */
  const eyeZ = r * 0.95
  return (
    <group position={[0, cy, 0]}>
      {/* round green head */}
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 1.05, r * 1.1, r * 0.92]} castShadow />
      {/* huge black teardrop eyes — sitting on the front face of the head */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * r * 0.28, -r * 0.06, eyeZ]}>
          {/* main eye — tall teardrop */}
          <mesh geometry={sphereGeo(1)} material={eyeBlack} scale={[r * 0.32, r * 0.52, r * 0.08]} />
          {/* small white catchlight near the top */}
          <mesh geometry={sphereGeo(1)} material={eyeWhite} scale={[r * 0.08, r * 0.08, r * 0.08]} position={[-r * 0.06, r * 0.18, r * 0.06]} />
        </group>
      ))}
      {/* short stubby antennae — clearly on top of the head, above the sphere surface */}
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 0.12, r * 0.22, r * 0.12]} position={[-r * 0.35, r * 1.18, 0]} />
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 0.12, r * 0.22, r * 0.12]} position={[r * 0.35, r * 1.18, 0]} />
    </group>
  )
}

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
      <group ref={lidsRef} scale={[0, 0, 0]} position={[0, eyeY, fz + r * 0.075]}>
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
    case 'short_neat': return <group>{texturedCap([r * 1.05, r * 0.95, r * 1.06], 0.12, 0.11)}{fringe(0.78)}</group>
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

/* ================================================ PIG HEAD ================================================ */

/** Cute pink piglet head: round head, big floppy ears, a flat disc snout with
 *  two nostrils and a row of freckles, a wide happy smile and a little curly
 *  tuft on top. No human face — reads purely as a friendly pig. */
function PigHead({ P, main, belly, nose, dark }: { P: Proportions; main: Mat; belly: Mat; nose: Mat; dark: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const black = sharedMaterial('#3a2f33', 0.25, 0.2)
  const white = sharedMaterial('#ffffff', 0.3)

  return (
    <group position={[0, cy, 0]}>
      {/* round head — wider than tall, pigs have a broad face */}
      <mesh geometry={sphereGeo(1)} material={main} scale={[r * 1.08, r * 0.98, r * 1.0]} castShadow />

      {/* soft muzzle / cheek pads */}
      <mesh geometry={sphereGeo(1)} material={main} scale={[r * 0.7, r * 0.5, r * 0.62]} position={[0, -r * 0.22, r * 0.62]} />

      {/* floppy ears — big triangular-ish paddles hanging to the sides */}
      {[-1, 1].map((sx) => (
        <group key={`ear${sx}`} position={[sx * r * 0.62, r * 0.62, -r * 0.05]} rotation={[0, 0, sx * 0.5]}>
          <mesh geometry={sphereGeo(1)} material={main} scale={[r * 0.46, r * 0.7, r * 0.16]} castShadow />
          <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.28, r * 0.5, r * 0.09]} position={[0, -r * 0.04, r * 0.12]} />
        </group>
      ))}

      {/* flat disc snout — the signature pig nose */}
      <mesh geometry={sphereGeo(1)} material={nose} scale={[r * 0.5, r * 0.38, r * 0.32]} position={[0, -r * 0.24, r * 1.02]} castShadow />
      {/* nostrils — two oval slits */}
      <mesh geometry={sphereGeo(1)} material={black} scale={[r * 0.07, r * 0.11, r * 0.04]} position={[-r * 0.16, -r * 0.24, r * 1.32]} />
      <mesh geometry={sphereGeo(1)} material={black} scale={[r * 0.07, r * 0.11, r * 0.04]} position={[r * 0.16, -r * 0.24, r * 1.32]} />

      {/* freckles scattered across the snout */}
      {[[-0.3, 0.05], [0.0, 0.12], [0.3, 0.05], [-0.18, -0.1], [0.18, -0.1]].map(([dx, dy], i) => (
        <mesh key={`fr${i}`} geometry={sphereGeo(1)} material={dark} scale={[r * 0.035, r * 0.035, r * 0.02]} position={[dx * r, -r * 0.18 + dy * r, r * 1.28]} />
      ))}

      {/* wide happy smile under the snout */}
      <mesh geometry={torusGeo(r * 0.34, r * 0.035, 8, 20)} material={black}
        position={[0, -r * 0.46, r * 0.98]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]} />

      {/* little curly tuft of hair on top */}
      <mesh geometry={torusGeo(r * 0.12, r * 0.04, 6, 12)} material={dark}
        position={[0, r * 1.02, 0]} rotation={[Math.PI / 2, 0, 0]} />

      {/* big friendly eyes with catchlights — flattened discs seated slightly
          inside the head so they read as on the face, not bulging out */}
      {[-1, 1].map((sx) => (
        <group key={`eye${sx}`} position={[sx * r * 0.38, r * 0.18, r * 0.88]}>
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.22, r * 0.26, r * 0.1]} />
          <mesh geometry={sphereGeo(1)} material={black} scale={[r * 0.11, r * 0.14, r * 0.07]} position={[0, 0, r * 0.07]} />
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.05, r * 0.05, r * 0.03]} position={[sx * -r * 0.04, r * 0.07, r * 0.11]} />
        </group>
      ))}

      {/* rosy cheeks */}
      {[-1, 1].map((sx) => (
        <mesh key={`ch${sx}`} geometry={sphereGeo(1)} material={sharedMaterial('#f48fb0', 0.6)} scale={[r * 0.13, r * 0.1, r * 0.06]} position={[sx * r * 0.52, -r * 0.08, r * 0.84]} />
      ))}
    </group>
  )
}

/* ================================================ ANGEL HEAD ================================================ */

/** Cute cartoon chibi angel: a big round head with huge sparkly eyes, a tiny
 *  gold halo sitting on top, little rosy cheeks and a big happy smile. Reads as
 *  a plush flying mascot, not a human — same family as Dino/Rabbit/Pig. */
function AngelHead({ P, skin, hairM, hairShade, gold, glow }: { P: Proportions; skin: Mat; hairM: Mat; hairShade: Mat; gold: Mat; glow: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const fz = r * 0.88
  const lidsRef = useRef<Group>(null)
  const blush = sharedMaterial('#f4a9c0', 0.5)

  // NOTE: <Head> self-offsets by cy. This group is at the head-bone origin.
  // We place hair/halo/circlet at +cy to sit on the actual skull.

  // HALO — flat glowing rings hovering clearly above the crown (gap so it never
  // touches the head).
  const haloR = r * 0.85
  const haloY = cy + r * 2.15

  // FLOWING GOLDEN HAIR — reuses the EXACT same proven pattern as the regular
  // Hair component (a skull-hugging cap + long back fall + side falls + fringe),
  // so it reads as real flowing hair instead of spikes/blobs. Anchors are the
  // same ones that work for every other character; materials are golden.
  const hairCap = (sx: number, sy: number, sz: number, lift: number) => (
    <mesh key="cap" geometry={sphereGeo(1)} material={hairM} scale={[r * sx, r * sy, r * sz * 0.86]} position={[0, cy + r * lift, -r * 0.12]} />
  )
  // crown volume so the top of the head isn't flat
  const crown = (
    <mesh key="crown" geometry={sphereGeo(1)} material={hairM} scale={[r * 0.5, r * 0.32, r * 0.46]} position={[0, cy + r * 0.74, -r * 0.1]} />
  )
  // soft bangs framing the forehead (sit at the hairline, face stays clear)
  const fringe = (
    <mesh key="fringe" geometry={sphereGeo(1)} material={hairM} scale={[r * 0.86, r * 0.3, r * 0.5]} position={[0, cy + r * 0.62, r * 0.42]} rotation={[0.26, 0, 0]} />
  )
  // long back fall (reaches past the shoulders) — shaded for depth
  const backFall = (
    <Strand key="back" m={hairShade} len={r * 3.6} rTop={r * 1.0} rBot={r * 0.45} p={[0, cy + r * 0.5, -r * 0.62]} rot={[-0.06, 0, 0]} />
  )
  // back volume puff so the long hair has body behind the neck
  const backVol = (
    <mesh key="backvol" geometry={sphereGeo(1)} material={hairM} scale={[r * 0.9, r * 0.62, r * 0.56]} position={[0, cy - r * 0.95, -r * 0.7]} />
  )
  // side falls (one per side) hanging down past the shoulders
  const sideFall = ([
    <Strand key="sl" m={hairM} len={r * 2.9} rTop={r * 0.42} rBot={r * 0.2} p={[-r * 0.97, cy + r * 0.32, -r * 0.08]} rot={[0, 0, 0.05]} />,
    <Strand key="sr" m={hairM} len={r * 2.9} rTop={r * 0.42} rBot={r * 0.2} p={[r * 0.97, cy + r * 0.32, -r * 0.08]} rot={[0, 0, -0.05]} />,
  ])
  // a few extra thin golden strands for the long, lush angel look
  const extraStrands = ([
    <Strand key="ex1" m={hairShade} len={r * 3.2} rTop={r * 0.3} rBot={r * 0.1} p={[-r * 0.5, cy + r * 0.4, -r * 0.55]} rot={[-0.1, 0, 0.12]} />,
    <Strand key="ex2" m={hairShade} len={r * 3.2} rTop={r * 0.3} rBot={r * 0.1} p={[r * 0.5, cy + r * 0.4, -r * 0.55]} rot={[-0.1, 0, -0.12]} />,
    <Strand key="ex3" m={hairM} len={r * 3.0} rTop={r * 0.26} rBot={r * 0.09} p={[0, cy + r * 0.46, -r * 0.7]} rot={[-0.14, 0, 0]} />,
  ])
  const locks = (
    <group>
      {hairCap(1.08, 1.01, 1.09, 0.18)}
      {crown}
      {fringe}
      {backFall}
      {backVol}
      {sideFall}
      {extraStrands}
    </group>
  )

  return (
    <group>
      {/* serene face (self-offsets by cy) */}
      <Head P={P} skin={skin} hairM={hairM} bodyType={'female'} lidsRef={lidsRef} characterId={'angel'} eyeHexVal={'#5aa6ff'} />

      {/* rosy cheeks */}
      {[-1, 1].map((sx) => (
        <mesh key={`ch${sx}`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.14, r * 0.1, r * 0.05]} position={[sx * r * 0.52, cy - r * 0.12, fz * 0.92]} />
      ))}

      {/* flowing golden hair */}
      <group>{locks}</group>

      {/* HALO — the only gold ring, floating above the crown. Thin + sharp
          with a bright glow rim so it reads as a crisp luminous ring. */}
      <group position={[0, haloY, 0]}>
        <mesh geometry={torusGeo(haloR, r * 0.03, 12, 48)} material={gold} rotation={[Math.PI / 2, 0, 0]} castShadow />
        <mesh geometry={torusGeo(haloR, r * 0.055, 12, 48)} material={glow} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  )
}

/* ================================================ SUNFLOWER HEAD ================================================ */

/** Big single sunflower bloom head: a rounded yellow skull with a large brown
 *  seed disc in the centre, a ring of wide golden-yellow petals radiating outward,
 *  cute eyes on the disc, a happy smile and a small green leaf accent. The whole
 *  head reads as one giant cheerful sunflower. */
function SunflowerHead({ P, yellow, dark, seed, green, petalEdge }: { P: Proportions; yellow: Mat; dark: Mat; seed: Mat; green: Mat; petalEdge: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const fz = r * 0.88
  const blackDot = sharedMaterial('#1a1a1a', 0.6)

  return (
    <group position={[0, cy, 0]}>
      {/* rounded yellow skull (the face base behind the petals) */}
      <mesh geometry={sphereGeo(1)} material={yellow} scale={[r * 1.05, r * 1.08, r * 0.92]} castShadow />

      {/* Lily-style anime eyes — big coloured iris with dark limbal ring,
          brighter lower glow, small pupil, two catchlights, upper lash line */}
      <Eye r={r} x={-r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />
      <Eye r={r} x={r * 0.3} y={-r * 0.04} z={fz * 0.98} iris="#8c5a2e" />

      {/* Lily-style eyebrows — thin, dark, gentle arch */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[-r * 0.3, -r * 0.04 + r * 0.18, fz * 0.98]} rotation={[0, 0, 0.14]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.03, r * 0.02]} position={[r * 0.3, -r * 0.04 + r * 0.18, fz * 0.98]} rotation={[0, 0, -0.14]} />

      {/* Lily cute smile — a small centre dot + two side dots */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.045, r * 0.02, r * 0.01]} position={[0, -r * 0.51, fz * 0.92]} />
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.028, r * 0.018, r * 0.01]} position={[-r * 0.07, -r * 0.49, fz * 0.92]} />
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.028, r * 0.018, r * 0.01]} position={[r * 0.07, -r * 0.49, fz * 0.92]} />

      {/* rosy cheeks */}
      {[-1, 1].map((sx) => (
        <mesh key={`sch${sx}`} geometry={sphereGeo(1)} material={sharedMaterial('#f4a040', 0.5)} scale={[r * 0.13, r * 0.1, r * 0.05]} position={[sx * r * 0.5, -r * 0.12, fz * 0.8]} />
      ))}

      {/* tiny seed dots scattered across the face as texture (no disc) */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3
        const dist = r * 0.65
        return (
          <mesh key={`sd${i}`} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.04, r * 0.04, r * 0.03]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.7, fz * 0.8]} />
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.7
        const dist = r * 0.42
        return (
          <mesh key={`sd2${i}`} geometry={sphereGeo(1)} material={dark}
            scale={[r * 0.03, r * 0.03, r * 0.02]}
            position={[Math.cos(a) * dist, Math.sin(a) * dist * 0.7, fz * 0.84]} />
        )
      })}

      {/* BIG PETAL RING — petals radiating outward from the seed disc */}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2
        return (
          <mesh key={`petal${i}`} geometry={sphereGeo(1)} material={petalEdge}
            scale={[r * 0.28, r * 0.55, r * 0.05]}
            position={[Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.1, fz * 0.35]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}
      {/* inner ring of petals — slightly darker yellow, behind the outer ring */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.PI / 18
        return (
          <mesh key={`peti${i}`} geometry={sphereGeo(1)} material={yellow}
            scale={[r * 0.22, r * 0.42, r * 0.05]}
            position={[Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.92, fz * 0.24]}
            rotation={[0, 0, a + Math.PI / 2]} />
        )
      })}

      {/* small green leaf accent on the head */}
      <mesh geometry={sphereGeo(1)} material={green}
        scale={[r * 0.2, r * 0.35, r * 0.06]}
        position={[-r * 0.65, r * 0.85, -r * 0.55]}
        rotation={[0, 0.15, 0.3]} />
    </group>
  )
}

/* ================================================ GRIM REAPER HEAD ================================================ */

/** Chibi Grim Reaper: a skull face with glowing green eyes, dark hollow eye
 *  sockets, a triangular nose hole, a teeth/jaw row, all wrapped in a dark
 *  tattered hood. Reads as a cute but menacing skeleton reaper. */
function GrimHead({ P, bone, boneDark, cloak, glow, gold }: { P: Proportions; bone: Mat; boneDark: Mat; cloak: Mat; glow: Mat; gold: Mat }) {
  const r = P.headR
  const cy = r * 0.92
  const fz = r * 0.88
  const eyeSocket = sharedMaterial('#0a0a0c', 0.15)
  const teethMat = sharedMaterial('#d8ccb0', 0.55)
  const noseHole = sharedMaterial('#0c0c0a', 0.12)

  return (
    <group position={[0, cy, 0]}>
      {/* Dark hood — large draped cowl over the skull */}
      <mesh geometry={sphereGeo(1)} material={cloak} scale={[r * 1.25, r * 1.3, r * 1.15]} castShadow />
      {/* Hood opening — slightly darker inner surface */}
      <mesh geometry={sphereGeo(1)} material={eyeSocket} scale={[r * 0.92, r * 1.0, r * 0.72]} position={[0, -r * 0.05, r * 0.35]} />

      {/* Skull face — rounded bone-coloured dome */}
      <mesh geometry={sphereGeo(1)} material={bone} scale={[r * 0.88, r * 0.92, r * 0.7]} position={[0, -r * 0.08, r * 0.38]} castShadow />

      {/* Brow ridge — thick bone shelf over the eyes */}
      <mesh geometry={sphereGeo(1)} material={boneDark} scale={[r * 0.85, r * 0.14, r * 0.42]} position={[0, r * 0.22, r * 0.5]} />

      {/* Eye sockets — deep hollow dark ovals */}
      {[-1, 1].map((sx) => (
        <group key={`gs${sx}`} position={[sx * r * 0.28, r * 0.08, r * 0.62]}>
          <mesh geometry={sphereGeo(1)} material={eyeSocket} scale={[r * 0.22, r * 0.26, r * 0.18]} castShadow />
          {/* Glowing green eye — the iris floating in the socket */}
          <mesh geometry={sphereGeo(1)} material={glow} scale={[r * 0.14, r * 0.16, r * 0.1]} position={[0, 0, r * 0.08]} />
          {/* Eye catchlight */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#ffffff', 0.08)} scale={[r * 0.04, r * 0.04, r * 0.02]} position={[sx * -r * 0.03, r * 0.04, r * 0.16]} />
        </group>
      ))}

      {/* Nose hole — triangular/heart-shaped */}
      <mesh geometry={sphereGeo(1)} material={noseHole} scale={[r * 0.1, r * 0.14, r * 0.06]} position={[0, -r * 0.12, r * 0.7]} />

      {/* Teeth row — a row of small rectangular bone segments */}
      {[-0.16, -0.08, 0, 0.08, 0.16].map((tx, i) => (
        <mesh key={`gt${i}`} geometry={boxGeo(r * 0.065, r * 0.07, r * 0.04)} material={teethMat}
          position={[tx * r, -r * 0.32, r * 0.66]} />
      ))}

      {/* Lower jaw — a thin curved bone plate */}
      <mesh geometry={sphereGeo(1)} material={boneDark} scale={[r * 0.52, r * 0.12, r * 0.22]} position={[0, -r * 0.38, r * 0.5]} />

      {/* Gold hood clasp at the throat */}
      <mesh geometry={sphereGeo(1)} material={gold} scale={[r * 0.08, r * 0.08, r * 0.05]} position={[0, -r * 0.58, r * 0.6]} />

      {/* Green flame wisps rising from behind the hood */}
      {[-0.5, 0, 0.5].map((fx, i) => (
        <mesh key={`gf${i}`} geometry={taperGeo(r * 0.02, r * 0.08, r * 0.4)} material={glow}
          position={[fx * r, r * 1.15 + i * r * 0.12, -r * 0.2]}
          rotation={[0.2, 0, fx * 0.3]} />
      ))}
    </group>
  )
}

/* ================================================ ELEPHANT HEAD ================================================ */

/** Cute chibi elephant — simple spheres like DinoHead. */
function ElephantHead({ P, main, dark, belly, inner, tusk }: { P: Proportions; main: Mat; dark: Mat; belly: Mat; inner: Mat; tusk: Mat }) {
  const r = P.headR
  const cy = r * 0.92

  const elephantEye = '#6b4423'

  const trunkGeo = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, -r * 0.16, r * 1.07),
      new Vector3(0, -r * 0.3, r * 1.12),
      new Vector3(0, -r * 0.48, r * 1.08),
      new Vector3(0, -r * 0.65, r * 0.95),
      new Vector3(0, -r * 0.8, r * 0.82),
      new Vector3(0, -r * 0.92, r * 0.7),
      new Vector3(0, -r * 1.0, r * 0.62),
    ])
    const geo = new TubeGeometry(curve, 56, r * 0.24, 16, false)
    const pos = geo.attributes.position
    const radialSegs = 16
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (radialSegs + 1))
      const t = ring / 56
      const taper = 1.0 - t * 0.55
      const cp = curve.getPoint(t)
      const dx = pos.getX(i) - cp.x
      const dz = pos.getZ(i) - cp.z
      pos.setX(i, cp.x + dx * taper)
      pos.setZ(i, cp.z + dz * taper)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [r])

  return (
    <group position={[0, cy, 0]}>
      <mesh geometry={sphereGeo(1)} material={main} scale={[r * 1.1, r * 1.05, r * 1.05]} castShadow />

      {/* ears — huge floppy baby elephant ears */}
      {[-1, 1].map((sx) => (
        <group key={`ear${sx}`} position={[sx * r * 0.92, -r * 0.05, -r * 0.1]} rotation={[0.2, 0, sx * 0.4]}>
          <mesh geometry={sphereGeo(1)} material={main} scale={[r * 0.7, r * 0.9, r * 0.12]} castShadow />
          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.5, r * 0.65, r * 0.08]} position={[0, -r * 0.05, r * 0.05]} />
        </group>
      ))}

{/* trunk base — dome flush with face surface */}
      <mesh geometry={sphereGeo(1)} material={main} scale={[r * 0.25, r * 0.19, r * 0.11]} position={[0, -r * 0.14, r * 1.01]} castShadow />
      {/* subtle wrinkle rings — darker, barely visible */}
      {[0, 1].map((i) => (
        <mesh key={`wr${i}`} geometry={torusGeo(r * (0.16 - i * 0.008), r * 0.008, 8, 24)} material={dark}
          position={[0, -r * (0.22 + i * 0.035), r * (1.02 - i * 0.01)]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
      {/* trunk tube — natural S-curve: forward bulge, then down, tip curls inward */}
      <mesh geometry={trunkGeo} material={main} castShadow />
      {/* trunk tip — curls slightly inward like real elephant */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.07, r * 0.09]} position={[0, -r * 1.0, r * 0.62]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#1a1a1a', 0.15)} scale={[r * 0.035, r * 0.018, r * 0.01]} position={[-r * 0.03, -r * 0.98, r * 0.68]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#1a1a1a', 0.15)} scale={[r * 0.035, r * 0.018, r * 0.01]} position={[r * 0.03, -r * 0.98, r * 0.68]} />

      {/* tusks — flanking trunk base, curving outward */}
      {[-1, 1].map((sx) => (
        <mesh key={`tusk${sx}`} geometry={taperGeo(r * 0.008, r * 0.028, r * 0.2)} material={tusk}
          position={[sx * r * 0.18, -r * 0.3, r * 1.0]} rotation={[0.5, 0, sx * -0.35]} castShadow />
      ))}

      {/* eyes — extra big glossy baby eyes */}
      <Eye r={r} x={-r * 0.32} y={r * 0.08} z={r * 0.98} iris={elephantEye} />
      <Eye r={r} x={r * 0.32} y={r * 0.08} z={r * 0.98} iris={elephantEye} />

      {/* rosy cheeks — extra pink for baby look */}
      {[-1, 1].map((sx) => (
        <mesh key={`ch${sx}`} geometry={sphereGeo(1)} material={sharedMaterial('#f09090', 0.55)} scale={[r * 0.14, r * 0.1, r * 0.05]} position={[sx * r * 0.5, -r * 0.08, r * 0.98]} />
      ))}

      {/* happy smile — below trunk base */}
      <mesh geometry={boxGeo(r * 0.18, r * 0.022, r * 0.012)} material={dark} position={[0, -r * 0.08, r * 1.06]} />
    </group>
  )
}
 
/* ================================================ HACKER HEAD ================================================ */
/** Hacker head: a normal human face (skin + black eyes, like James) with the
 *  hoodie hood DOWN around the neck/shoulders, and a pair of chunky neon-green
 *  headphones (band + ear cups + mic boom). Not a mask — you can see the face.
 *  Black hair, fully clothed, never naked. */
function HackerHead({ P, skin, hairM, glow, config }: { P: Proportions; skin: Mat; hairM: Mat; glow: Mat; config: AvatarConfig }) {
  const r = P.headR
  const cy = r * 0.92
  const fz = r * 0.88
  const lidsRef = useRef<Group>(null)
  const cupM = sharedMaterial('#15171c', 0.6, 0.1)

  return (
    <group>
      {/* normal human head + face + hair */}
      <Head P={P} skin={skin} hairM={hairM} bodyType={'male'} lidsRef={lidsRef} characterId={'hacker'} eyeHexVal={'#0a0a0a'} />
      <Hair config={config} P={P} hairM={hairM} />

      {/* HEADPHONE BAND — arcs over the top of the head (neon green) */}
      <mesh geometry={torusGeo(r * 1.1, r * 0.09, 12, 40)} material={glow}
        position={[0, cy + r * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      {/* headphone band core (dark) just under the glow */}
      <mesh geometry={torusGeo(r * 1.06, r * 0.05, 12, 36)} material={cupM}
        position={[0, cy + r * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />

      {/* EAR CUPS (chunky green) over each ear */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh geometry={boxGeo(r * 0.28, r * 0.52, r * 0.36)} material={cupM} position={[sx * r * 1.02, cy - r * 0.02, 0]} castShadow />
          <mesh geometry={boxGeo(r * 0.14, r * 0.34, r * 0.22)} material={glow} position={[sx * r * 0.94, cy - r * 0.02, 0]} />
          {/* mic boom curving toward the mouth */}
          <mesh geometry={boxGeo(r * 0.05, r * 0.48, r * 0.05)} material={cupM} position={[sx * r * 0.82, cy - r * 0.42, fz * 0.55]} rotation={[0.2, 0, sx * 0.5]} />
          <mesh geometry={sphereGeo(1)} material={glow} scale={[r * 0.09, r * 0.09, r * 0.09]} position={[sx * r * 0.6, cy - r * 0.6, fz * 0.78]} />
        </group>
      ))}

      {/* HOOD (down) — a soft hood collar resting on the shoulders behind the neck */}
      <mesh geometry={torusGeo(P.neckR * 2.5, P.neckR * 0.55)} material={cupM} position={[0, P.chestLen * 0.88, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      {/* neon green drawstrings hanging from the hood */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} geometry={boxGeo(r * 0.04, r * 0.6, r * 0.04)} material={glow} position={[sx * r * 0.36, P.chestLen * 0.55, fz * 0.5]} />
      ))}
    </group>
  )
}

/* ================================================ ANGEL WING ================================================ */

/** A single feathered angel wing: a fan of overlapping ellipsoid "feathers"
 *  radiating from a root at the shoulder, sweeping from up-and-out at the top to
 *  down-and-out at the bottom. Built in local +X space (the parent mirrors it to
 *  the other side). The long axis of each feather is X; rotation around Z aims it
 *  along its fan angle so the cluster reads as a classic cartoon wing, not a blob. */
/**
 * A single solid angel wing in local +X / +Y space (parent mirrors it).
 * Built from THREE big overlapping rounded lobes (primaries / secondaries /
 * coverts) fanned from the shoulder root + a small root puff. Fewer, larger,
 * smoothly-shaded lobes read as a clean feathered wing — not a tangle of
 * thin meshes. Each lobe is a scaled sphere lying in the wing plane.
 */
function AngelWing({ P, mat, shade, edge, glow }: { P: Proportions; mat: Mat; shade: Mat; edge: Mat; glow: Mat }) {
  const L = P.chestW * 2.1
  const D2R = Math.PI / 180
  const feats: JSX.Element[] = []
  let key = 0

  // one feather: a long scaled ellipsoid (the vane) + a thin quill line down its
  // centre so each feather reads as a detailed plume, not a blob.
  const feather = (phi: number, len: number, wid: number, m: Mat, z: number, quill = true) => {
    const reach = len * 0.5
    const fx = Math.cos(phi) * reach
    const fy = Math.sin(phi) * reach
    feats.push(
      <mesh key={key++} geometry={sphereGeo(1)} material={m}
        position={[fx, fy, z]}
        rotation={[0, 0, phi - Math.PI / 2]}
        scale={[len, wid, P.chestW * 0.42]} castShadow />,
    )
    if (quill) {
      feats.push(
        <mesh key={key++} geometry={boxGeo(len * 0.96, wid * 0.12, P.chestW * 0.06)} material={edge}
          position={[fx, fy, z + P.chestW * 0.02]}
          rotation={[0, 0, phi - Math.PI / 2]} />,
      )
    }
  }

  // BACK ROW — long primaries fanning outward at shoulder level, curving down.
  // Each carries a visible quill for detail.
  const N1 = 9
  for (let i = 0; i < N1; i++) {
    const t = i / (N1 - 1)
    const phi = (50 - 104 * t) * D2R
    const len = L * (0.78 + 0.36 * Math.sin(Math.PI * (0.1 + 0.82 * t)))
    feather(phi, len, len * 0.26, i < 2 ? shade : mat, P.chestW * 0.05)
  }

  // MIDDLE ROW — secondaries, slightly inward, also quilled.
  const N2 = 8
  for (let i = 0; i < N2; i++) {
    const t = i / (N2 - 1)
    const phi = (42 - 90 * t) * D2R
    const len = L * (0.62 + 0.32 * Math.sin(Math.PI * (0.12 + 0.76 * t)))
    feather(phi, len, len * 0.3, shade, P.chestW * 0.01)
  }

  // FRONT ROW — short coverts covering the wing root (no quill, soft).
  const N3 = 7
  for (let i = 0; i < N3; i++) {
    const t = i / (N3 - 1)
    const phi = (36 - 78 * t) * D2R
    const len = L * (0.4 + 0.26 * Math.sin(Math.PI * t))
    feather(phi, len, len * 0.36, edge, P.chestW * 0.07, false)
  }

  // Smooth fill sphere behind all feathers so the wing reads as one solid shape.
  feats.push(
    <mesh key={key++} geometry={sphereGeo(1)} material={shade}
      position={[L * 0.36, L * 0.0, -P.chestW * 0.06]}
      scale={[L * 0.52, L * 0.38, P.chestW * 0.38]} castShadow />,
  )

  // WING ARM — tapered strut from root up the leading edge to the highest primary tip.
  const tipPhi = 50 * D2R
  const tipReach = L * 0.5
  const tipX = Math.cos(tipPhi) * tipReach
  const tipY = Math.sin(tipPhi) * tipReach
  const armLen = Math.hypot(tipX, tipY)
  const armAng = Math.atan2(tipY, tipX)

  return (
    <group>
      {feats}
      <mesh geometry={taperGeo(P.chestW * 0.055, P.chestW * 0.022, armLen)} material={glow}
        position={[tipX * 0.5, tipY * 0.5, P.chestW * 0.04]}
        rotation={[0, 0, armAng - Math.PI / 2]} />
      <mesh geometry={sphereGeo(1)} material={mat} scale={[P.chestW * 0.34, P.chestW * 0.28, P.chestW * 0.22]} castShadow />
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

function Arm({ side, bind, P, skin, topM, isSleeved, isDino, isAngel, clawM, isRobot, glowM, isHacker }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; topM: Mat; isSleeved: boolean; isDino?: boolean; isAngel?: boolean; clawM?: Mat; isRobot?: boolean; glowM?: Mat; isHacker?: boolean
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'armUpperL' : 'armUpperR'
  const lower: BoneName = side === 'L' ? 'armLowerL' : 'armLowerR'
  const armM = isSleeved ? topM : skin
  const gloveM = isHacker ? sharedMaterial('#0e0f13', 0.7, 0.05) : skin

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
            upper arm's bottom for a seamless elbow joint (like the knee). Angel
            sleeves are robe-coloured and flare into a bell at the wrist. */}
        <mesh geometry={latheGeo([
          [P.wristR * (isAngel ? 1.3 : 1), -P.lowerArm],
          [P.wristR * (isAngel ? 1.25 : 1.02), -P.lowerArm * 0.9],
          [P.wristR * (isAngel ? 1.4 : 1.15), -P.lowerArm * 0.7],
          [P.elbowR * 1.05, -P.lowerArm * 0.35],
          [P.elbowR * 1.08, -P.lowerArm * 0.2],
          [P.elbowR, 0],
        ])} material={isAngel ? topM : skin} castShadow />
        {/* Angel: flowing bell sleeve flared cone at the wrist */}
        {isAngel && (
          <mesh geometry={skirtGeo(P.wristR * 1.1, P.wristR * 2.4, P.wristR * 2.2)} material={topM}
            position={[0, -P.lowerArm - P.wristR * 0.3, 0]} castShadow />
        )}

        {/* Hand — pushed slightly forward (+Z) off the sleeve's centre line and
            given a short exposed skin wrist so it never buries inside a long
            sleeve (sleeved tops paint the whole forearm in the garment colour,
            which otherwise made the hand read as "merged into the clothes"). */}
        <group position={[0, -P.lowerArm - P.wristR * 0.2, P.wristR * 0.3]}>
          {/* exposed wrist cuff between the sleeve end and the palm (gloved for hacker) */}
          <mesh geometry={taperGeo(P.wristR * 0.95, P.wristR * 0.7, P.wristR * 1.5)} material={gloveM} position={[0, P.wristR * 0.55, 0]} castShadow />
          <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 1.3, P.handLen * 0.48, P.wristR * 1.1]} position={[0, -P.handLen * 0.3, 0]} castShadow />
          <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.26, P.wristR * 0.26, P.wristR * 0.26]} position={[P.wristR * 0.88, -P.handLen * 0.12, P.wristR * 0.26]} />
          {[-P.wristR * 0.46, -P.wristR * 0.14, P.wristR * 0.14, P.wristR * 0.4].map((fx, i) => (
            <group key={i} position={[fx, -P.handLen * 0.45, 0]}>
              <mesh geometry={taperGeo(P.wristR * 0.12, P.wristR * 0.08, P.handLen * (0.28 - i * 0.02))} material={gloveM} position={[0, -P.handLen * 0.12, 0]} />
              <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.08, P.wristR * 0.08, P.wristR * 0.08]} position={[0, -P.handLen * (0.26 - i * 0.02), 0]} />
              {/* dino claw tip */}
              {isDino && (
                <mesh geometry={taperGeo(P.wristR * 0.005, P.wristR * 0.09, P.handLen * 0.16)} material={clawM ?? skin} position={[0, -P.handLen * (0.32 - i * 0.02), P.wristR * 0.04]} rotation={[0.5, 0, 0]} />
              )}
            </group>
          ))}
          {/* Robot: block hand (no fingers) + glowing blue line on the forearm. */}
          {isRobot && glowM && (
            <group>
              <mesh geometry={boxGeo(P.wristR * 1.8, P.handLen * 0.7, P.wristR * 1.4)} material={skin} position={[0, -P.handLen * 0.4, 0]} castShadow />
              <mesh geometry={boxGeo(P.wristR * 0.18, P.lowerArm * 0.8, P.wristR * 0.18)} material={glowM} position={[0, P.lowerArm * 0.45, P.wristR * 1.05]} />
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

/* ================================================ LEGS ================================================ */

function Leg({ side, bind, P, skin, botM, shoeM, shoeAccent, config, showShoes, isRobot, isAlien, isAngel, sashM, glowM, isHacker, hackerGlow, hackerAccent, isSunflower, sfBrown, sfGreen, isGrim, grimCloak, grimRedBoot, grimGold, grimGoldDark, isElephant }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; botM: Mat; shoeM: Mat; shoeAccent: Mat; config: AvatarConfig; showShoes: boolean; isRobot?: boolean; isAlien?: boolean; isAngel?: boolean; sashM?: Mat; glowM?: Mat; isHacker?: boolean; hackerGlow?: Mat; hackerAccent?: Mat; isSunflower?: boolean; sfBrown?: Mat; sfGreen?: Mat; isGrim?: boolean; grimCloak?: Mat; grimRedBoot?: Mat; grimGold?: Mat; grimGoldDark?: Mat; isElephant?: boolean
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'legUpperL' : 'legUpperR'
  const lower: BoneName = side === 'L' ? 'legLowerL' : 'legLowerR'
  const foot: BoneName = side === 'L' ? 'footL' : 'footR'
  const isDino = config.characterId === 'dino'
  const calfMat = config.bottom === 'shorts' ? skin : botM
  const legMat = config.top === 'frock' ? skin : botM

  const eM = isElephant ? 1.35 : 1.0  // chubbier legs

  return (
    <group ref={bind(upper)} position={[sign * P.hipW * 0.7, -0.02, 0]}>
      {isElephant ? (
        <>
          {/* Elephant: single continuous pillar leg — hip to ankle, no knee joint */}
          <mesh geometry={taperGeo(P.kneeR * 1.15, P.ankleR * 1.08, P.upperLeg + P.lowerLeg)} material={legMat}
            position={[0, -(P.upperLeg + P.lowerLeg) * 0.5, 0]} castShadow />
        </>
      ) : (
        <>
          {/* Thigh — lathe profile bottom→top (ascending Y) */}
          <mesh geometry={latheGeo([
            [P.kneeR * eM, -P.upperLeg],
            [P.kneeR * 1.05 * eM, -P.upperLeg * 0.88],
            [P.thighR * 1.0 * eM, -P.upperLeg * 0.6],
            [P.thighR * 1.12 * eM, -P.upperLeg * 0.35],
            [P.thighR * 1.18 * eM, -P.upperLeg * 0.15],
            [P.thighR * 1.15 * eM, 0],
          ])} material={legMat} castShadow />
        </>
      )}

      <group ref={bind(lower)} position={[0, -P.upperLeg, 0]}>
        {isElephant ? (
          <>
            {/* Elephant: shin hidden — leg is single piece above */}
          </>
        ) : (
          <>
            {/* Shin — top radius matches thigh bottom exactly */}
            <mesh geometry={latheGeo([
              [P.ankleR * eM, -P.lowerLeg],
              [P.ankleR * 1.02 * eM, -P.lowerLeg * 0.9],
              [P.ankleR * 1.1 * eM, -P.lowerLeg * 0.7],
              [P.kneeR * 1.08 * eM, -P.lowerLeg * 0.35],
              [P.kneeR * 1.1 * eM, -P.lowerLeg * 0.2],
              [P.kneeR * eM, 0],
            ])} material={calfMat} castShadow />
          </>
        )}

        {/* Hacker cargo pockets + neon-green side stripes on the leg */}
        {isHacker && hackerGlow && (
          <group>
            {/* thigh cargo pocket (front of thigh) */}
            <mesh geometry={boxGeo(P.thighR * 0.7, P.upperLeg * 0.28, P.torsoD * 0.06)} material={hackerAccent}
              position={[sign * P.thighR * 0.3, -P.upperLeg * 0.45, P.torsoD * 0.5]} castShadow />
            {/* green side stripe down the outer thigh — flush against the leg surface */}
            <mesh geometry={boxGeo(P.thighR * 0.1, P.upperLeg * 0.85, P.torsoD * 0.03)} material={hackerGlow}
              position={[sign * P.thighR * 1.15, -P.upperLeg * 0.5, 0]} />
            {/* green side stripe down the outer calf — flush against the leg surface */}
            <mesh geometry={boxGeo(P.ankleR * 0.1, P.lowerLeg * 0.9, P.torsoD * 0.03)} material={hackerGlow}
              position={[sign * P.kneeR * 1.1, -P.lowerLeg * 0.5, 0]} />
          </group>
        )}

        <group ref={bind(foot)} position={[0, -P.lowerLeg - P.ankleR * 0.4, 0]}>
          {/* ankle / foot — skin when bare (animals), shoe colour when booted; hidden for alien */}
          {!isAlien && (
            <mesh geometry={sphereGeo(1)} material={showShoes && !isHacker ? shoeM : skin}
              scale={Array(3).fill(P.ankleR * (isRobot ? 0.65 : 1.1)) as [number, number, number]} />
          )}
          {/* Sunflower: earthy brown root-like feet */}
          {isSunflower && sfBrown && (
            <group>
              <mesh geometry={sphereGeo(1)} material={sfBrown}
                scale={[P.ankleR * 1.2, P.ankleR * 1.0, P.footLen * 0.8]}
                position={[0, -P.ankleR * 0.5, P.footLen * 0.3]} castShadow />
              {[-P.ankleR * 0.35, P.ankleR * 0.35].map((tx, i) => (
                <mesh key={`rt${i}`} geometry={taperGeo(P.ankleR * 0.04, P.ankleR * 0.1, P.ankleR * 0.6)} material={sfBrown}
                  position={[tx, -P.ankleR * 0.65, P.footLen * 0.45]}
                  rotation={[0.6, 0, Math.sin(i * Math.PI) * 0.5]} />
              ))}
              <mesh geometry={torusGeo(P.ankleR * 1.1, P.ankleR * 0.08, 8, 18)} material={sfGreen}
                position={[0, P.ankleR * 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
          )}
          {/* Grim Reaper: dark boots with gold buckles + red accents */}
          {isGrim && (
            <group>
              {/* Main boot body — dark with rounded toe */}
              <mesh geometry={sphereGeo(1)} material={grimCloak}
                scale={[P.ankleR * 1.25, P.ankleR * 1.1, P.footLen * 0.65]}
                position={[0, -P.ankleR * 0.35, P.footLen * 0.35]} castShadow />
              {/* Red boot toe cap */}
              <mesh geometry={sphereGeo(1)} material={grimRedBoot}
                scale={[P.ankleR * 0.8, P.ankleR * 0.6, P.footLen * 0.35]}
                position={[0, -P.ankleR * 0.55, P.footLen * 0.7]} castShadow />
              {/* Gold buckle strap across the ankle */}
              <mesh geometry={boxGeo(P.ankleR * 2.0, P.ankleR * 0.22, P.footLen * 0.04)} material={grimGold}
                position={[0, P.ankleR * 0.1, P.footLen * 0.45]} />
              {/* Gold buckle square */}
              <mesh geometry={boxGeo(P.ankleR * 0.22, P.ankleR * 0.22, P.footLen * 0.06)} material={grimGoldDark}
                position={[0, P.ankleR * 0.1, P.footLen * 0.5]} />
              {/* Gold sole trim */}
              <mesh geometry={boxGeo(P.ankleR * 2.2, P.ankleR * 0.14, P.footLen * 1.0)} material={grimGold}
                position={[0, -P.ankleR * 0.6, P.footLen * 0.35]} castShadow />
              {/* Boot shaft — wraps up the shin */}
              <mesh geometry={latheGeo([
                [P.ankleR * 1.1, P.lowerLeg * 0.15],
                [P.ankleR * 1.0, P.lowerLeg * 0.05],
                [P.ankleR * 0.95, -P.ankleR * 0.2],
                [P.ankleR * 1.1, -P.ankleR * 0.5],
              ])} material={grimCloak} position={[0, 0, -P.footLen * 0.1]} castShadow />
              {/* Gold armor plate on the shin */}
              <mesh geometry={boxGeo(P.ankleR * 0.6, P.lowerLeg * 0.3, P.torsoD * 0.05)} material={grimGold}
                position={[0, P.lowerLeg * 0.2, P.ankleR * 0.85]} castShadow />
            </group>
          )}
          {/* Elephant: wide flat feet with toenails */}
          {isElephant && (
            <group>
              {/* main foot — wide, slightly flattened oval */}
              <mesh geometry={sphereGeo(1)} material={botM}
                scale={[P.ankleR * 1.5, P.ankleR * 0.6, P.ankleR * 1.3]}
                position={[0, -P.ankleR * 0.2, P.ankleR * 0.2]} castShadow />
              {/* heel — slightly raised back */}
              <mesh geometry={sphereGeo(1)} material={botM}
                scale={[P.ankleR * 0.7, P.ankleR * 0.35, P.ankleR * 0.5]}
                position={[0, -P.ankleR * 0.25, -P.ankleR * 0.4]} castShadow />
              {/* toenails — 4 semi-circular bumps on front edge */}
              {[-P.ankleR * 0.35, -P.ankleR * 0.12, P.ankleR * 0.12, P.ankleR * 0.35].map((tx, i) => (
                <mesh key={i} geometry={sphereGeo(1)} material={shoeM}
                  scale={[P.ankleR * 0.12, P.ankleR * 0.06, P.ankleR * 0.08]}
                  position={[tx, -P.ankleR * 0.45, P.ankleR * 1.05]} />
              ))}
            </group>
          )}
          {showShoes && !isHacker && !isSunflower && !isGrim && !isElephant && (() => {
            const ar = P.ankleR
            const fl = P.footLen
            const zS = fl / (ar * 1.7)

            if (config.shoes === 'boots') {
              const bootProfile: [number, number][] = [
                [0, -ar * 0.65],
                [ar * 0.9, -ar * 0.65],
                [ar * 0.95, -ar * 0.6],
                [ar * 0.95, -ar * 0.1],
                [ar * 0.85, ar * 0.15],
                [ar * 0.6, ar * 0.3],
                [ar * 0.25, ar * 0.38],
                [0, ar * 0.4],
              ]
              return (
                <group>
                  <mesh geometry={taperGeo(ar * 0.85, ar * 0.95, fl * 0.55)}
                    material={shoeM} position={[0, fl * 0.22, 0]} castShadow />
                  <mesh geometry={latheGeo(bootProfile)} material={shoeM}
                    scale={[1.15, 1.15, zS * 0.9]} position={[0, 0, fl * 0.18]} castShadow />
                </group>
              )
            }
            if (config.shoes === 'whiteshoes') {
              const whiteProfile: [number, number][] = [
                [0, -ar * 0.65],
                [ar * 0.9, -ar * 0.65],
                [ar * 0.95, -ar * 0.6],
                [ar * 0.95, -ar * 0.1],
                [ar * 0.85, ar * 0.15],
                [ar * 0.6, ar * 0.3],
                [ar * 0.25, ar * 0.38],
                [0, ar * 0.4],
              ]
              return (
                <group>
                  <mesh geometry={latheGeo(whiteProfile)} material={shoeM}
                    scale={[1.15, 1.15, zS * 0.9]} position={[0, 0, fl * 0.18]} castShadow />
                </group>
              )
            }
            const sneakerProfile: [number, number][] = [
              [0, -ar * 0.65],
              [ar * 0.9, -ar * 0.65],
              [ar * 0.95, -ar * 0.6],
              [ar * 0.95, -ar * 0.1],
              [ar * 0.85, ar * 0.15],
              [ar * 0.6, ar * 0.3],
              [ar * 0.25, ar * 0.38],
              [0, ar * 0.4],
            ]
            return (
              <group>
                <mesh geometry={latheGeo(sneakerProfile)} material={shoeM}
                  scale={[1.15, 1.15, zS * 0.9]} position={[0, 0, fl * 0.18]} castShadow />
                {[-0.18, 0, 0.18].map((offset, i) => (
                  <mesh key={`rs${i}`} geometry={boxGeo(ar * 0.03, ar * 0.35, fl * 0.3)}
                    material={shoeAccent}
                    position={[ar * 0.92, -ar * 0.1, fl * (0.18 + offset * 0.28)]}
                    rotation={[0, 0.12, 0]} castShadow />
                ))}
                {[-0.18, 0, 0.18].map((offset, i) => (
                  <mesh key={`ls${i}`} geometry={boxGeo(ar * 0.03, ar * 0.35, fl * 0.3)}
                    material={shoeAccent}
                    position={[-ar * 0.92, -ar * 0.1, fl * (0.18 + offset * 0.28)]}
                    rotation={[0, -0.12, 0]} castShadow />
                ))}
              </group>
            )
          })()}
          {/* dino toe claws — three cream claws pointing forward */}
          {isDino && [-1, 0, 1].map((tx, i) => (
            <mesh key={i} geometry={taperGeo(P.ankleR * 0.02, P.ankleR * 0.17, P.footLen * 0.38)} material={shoeAccent}
              position={[tx * P.ankleR * 0.52, -P.ankleR * 0.3, P.footLen * 0.92]} rotation={[1.4, 0, 0]} castShadow />
          ))}
          {/* Robot: glowing blue sci-fi line down the calf + glowing boot sole. */}
          {isRobot && glowM && (
            <group>
              <mesh geometry={boxGeo(P.ankleR * 0.22, P.lowerLeg * 0.7, P.ankleR * 0.22)} material={glowM} position={[0, P.lowerLeg * 0.5, P.ankleR * 1.05]} />
              <mesh geometry={boxGeo(P.ankleR * 2.2, P.ankleR * 0.4, P.footLen * 1.0)} material={shoeM} position={[0, -P.ankleR * 0.6, P.footLen * 0.28]} castShadow />
              <mesh geometry={boxGeo(P.ankleR * 2.0, P.ankleR * 0.18, P.footLen * 0.9)} material={glowM} position={[0, -P.ankleR * 0.78, P.footLen * 0.28]} />
            </group>
          )}
          {/* Hacker: clean high-top sneaker — dark body, neon-green sole +
              side accent. No floating panels, everything flush on the foot. */}
          {isHacker && hackerGlow && (() => {
            const shoeDark = sharedMaterial('#16181d', 0.6, 0.05)
            return (
              <group>
                {/* main shoe body — one smooth rounded shape */}
                <mesh geometry={sphereGeo(1)} material={shoeDark}
                  scale={[P.ankleR * 1.2, P.ankleR * 0.95, P.footLen * 0.52]}
                  position={[0, -P.ankleR * 0.25, P.footLen * 0.35]} castShadow />
                {/* ankle collar / high-top cuff */}
                <mesh geometry={latheGeo([
                  [P.ankleR * 0.85, P.ankleR * 0.45],
                  [P.ankleR * 1.05, P.ankleR * 0.05],
                  [P.ankleR * 0.95, -P.ankleR * 0.35],
                ])} material={shoeDark} position={[0, -P.ankleR * 0.05, P.footLen * 0.1]} castShadow />
                {/* neon-green sole — flush at the bottom */}
                <mesh geometry={boxGeo(P.ankleR * 2.2, P.ankleR * 0.22, P.footLen * 1.05)}
                  material={hackerGlow} position={[0, -P.ankleR * 0.6, P.footLen * 0.35]} castShadow />
                {/* green accent line on outer side — flush on the shoe surface */}
                <mesh geometry={boxGeo(P.ankleR * 0.06, P.ankleR * 0.8, P.footLen * 0.04)}
                  material={hackerGlow} position={[sign * P.ankleR * 1.05, -P.ankleR * 0.2, P.footLen * 0.35]} />
              </group>
            )
          })()}
          {/* Alien: a slim rounded green foot that connects smoothly to the shin. */}
          {isAlien && (
            <group>
              {/* rounded sole — compact, not protruding forward */}
              <mesh geometry={sphereGeo(1)} material={skin} scale={[P.ankleR * 1.1, P.ankleR * 0.5, P.ankleR * 1.6]} position={[0, -P.ankleR * 0.35, P.footLen * 0.15]} castShadow />
              {/* three small toe bumps */}
              {[-P.ankleR * 0.3, 0, P.ankleR * 0.3].map((tx, i) => (
                <mesh key={i} geometry={sphereGeo(1)} material={skin} scale={[P.ankleR * 0.22, P.ankleR * 0.2, P.ankleR * 0.28]} position={[tx, -P.ankleR * 0.35, P.ankleR * 1.2]} castShadow />
              ))}
            </group>
          )}
          {/* Angel: bare feet in a gown, wrapped with a delicate gold anklet + a
              thin criss-cross sandal strap and a tiny gold toe-ring for detail. */}
          {isAngel && (
            <group>
              {/* bare foot — a soft rounded sole so the foot actually reads */}
              <mesh geometry={sphereGeo(1)} material={skin} scale={[P.ankleR * 1.05, P.ankleR * 0.5, P.footLen * 0.62]} position={[0, -P.ankleR * 0.4, P.footLen * 0.22]} castShadow />
              {/* little rounded toes at the front */}
              {[-P.ankleR * 0.32, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.32].map((tx, i) => (
                <mesh key={`toe${i}`} geometry={sphereGeo(1)} material={skin} scale={[P.ankleR * 0.2, P.ankleR * 0.18, P.ankleR * 0.26]} position={[tx, -P.ankleR * 0.4, P.ankleR * 1.05]} castShadow />
              ))}
              {/* delicate gold sandal sole (flush under the foot) */}
              <mesh geometry={boxGeo(P.ankleR * 2.1, P.ankleR * 0.16, P.footLen * 1.0)} material={sashM ?? angelSash}
                position={[0, -P.ankleR * 0.62, P.footLen * 0.25]} castShadow />
              {/* gold anklet ring around the ankle */}
              <mesh geometry={torusGeo(P.ankleR * 1.05, P.ankleR * 0.12, 10, 28)} material={sashM ?? angelSash}
                position={[0, -P.ankleR * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
              <mesh geometry={torusGeo(P.ankleR * 1.05, P.ankleR * 0.05, 10, 28)} material={glowM ?? sashM ?? angelSash}
                position={[0, -P.ankleR * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
              {/* soft gold instep strap — a thin flattened band hugging the foot,
                  not a spike. Arches from ankle down across the instep. */}
              <mesh geometry={torusGeo(P.ankleR * 1.1, P.ankleR * 0.07, 10, 24, Math.PI)}
                material={sashM ?? angelSash}
                position={[0, -P.ankleR * 0.15, P.ankleR * 0.55]}
                rotation={[Math.PI / 2, 0, 0]} />
              {/* little gold toe-rings */}
              {[-P.ankleR * 0.32, 0, P.ankleR * 0.32].map((tx, i) => (
                <mesh key={i} geometry={torusGeo(P.ankleR * 0.18, P.ankleR * 0.04, 8, 16)} material={sashM ?? angelSash}
                  position={[tx, -P.ankleR * 0.32, P.ankleR * 1.05]} rotation={[Math.PI / 2, 0, 0]} />
              ))}
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

/* ================================================ TOP OVERLAYS ================================================ */

function Top({ config, P, topM, skin: _skin }: { config: AvatarConfig; P: Proportions; topM: Mat; skin: Mat }) {
  const chestLogoTex = focusLilyChestTex()

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
