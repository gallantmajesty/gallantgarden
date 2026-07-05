// @ts-nocheck
import { useImperativeHandle, useMemo, useRef } from 'react'
import { Group, MeshStandardMaterial } from 'three'
import {
  boxGeo,
  sphereGeo,
  taperGeo,
  torusGeo,
  latheGeo,
  torsoGeo,
  skinHex,
  hairHex,
  shoeHex,
  topHex,
  bottomHex,
  sharedMaterial,
  skinMaterial,
  hairMaterial,
  type AvatarConfig,
} from './config'
import { heightScale, proportionsFor, type BoneName, type Proportions } from './rig'
import { focusLilyChestTex, focusLilyBackTex } from './logoTextures'

export type BoneMap = Partial<Record<BoneName, Group>>

export interface AvatarRigHandle {
  bones: BoneMap
  lids: Group | null
  root: Group | null
}

type Mat = MeshStandardMaterial
type V3 = [number, number, number]

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

  const skin = skinMaterial(skinHex(config.skin))
  const hairM = hairMaterial(hairHex(config.hairColor))
  const topM = sharedMaterial(topHex(config.top), 0.82)
  const botM = sharedMaterial(bottomHex(config.bottom), 0.82)
  const shoeM = sharedMaterial(shoeHex(config.shoes), 0.5)
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

          <group ref={bind('chest')} position={[0, P.spineLen, 0]}>
            <Top config={config} P={P} topM={topM} skin={skin} />

            <group ref={bind('neck')} position={[0, P.chestLen * 0.86, 0]}>
              <mesh geometry={latheGeo([
                [P.neckR * 2.0, 0],
                [P.neckR * 1.8, P.neckLen * 0.25],
                [P.neckR * 1.6, P.neckLen * 0.5],
                [P.headR * 0.8, P.neckLen * 0.8],
                [P.headR * 0.95, P.neckLen],
              ])} material={skin} castShadow />

              <group ref={bind('head')} position={[0, P.neckLen, 0]}>
                <Head P={P} skin={skin} hairM={hairM} bodyType={config.bodyType} lidsRef={lidsRef} />
                <Hair config={config} P={P} hairM={hairM} />
              </group>
            </group>
          </group>
        </group>

        <Leg side="L" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} />
        <Leg side="R" bind={bind} P={P} skin={skin} botM={botM} shoeM={shoeM} shoeAccent={shoeAccent} config={config} />

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

        {/* Arms rendered LAST inside hips — always on top of clothing */}
        <Arm side="L" bind={bind} P={P} skin={skin} topM={topM} isSleeved={isSleeved} />
        <Arm side="R" bind={bind} P={P} skin={skin} topM={topM} isSleeved={isSleeved} />
      </group>
    </group>
  )
}

/* ================================================ HEAD ================================================ */

function Head({
  P, skin, hairM, bodyType, lidsRef,
}: {
  P: Proportions; skin: Mat; hairM: Mat
  bodyType: AvatarConfig['bodyType']; lidsRef: React.Ref<Group>
}) {
  const r = P.headR
  const isF = bodyType === 'female'
  const cy = r * 0.92
  const fz = r * 0.88

  const eyeX = r * 0.3
  const eyeY = -r * 0.04
  const eyeR = r * 0.14

  const blackDot = sharedMaterial('#1a1a1a', 0.6)

  return (
    <group position={[0, cy, 0]}>
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * (isF ? 1.0 : 0.98), r * 1.0, r * 0.95]} castShadow />
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * (isF ? 0.62 : 0.65), r * 0.5, r * 0.68]} position={[0, -r * 0.56, r * 0.02]} />

      {/* Black dot eyes */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[eyeR, eyeR, r * 0.02]} position={[-eyeX, eyeY, fz]} />
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[eyeR, eyeR, r * 0.02]} position={[eyeX, eyeY, fz]} />

      {/* Smile */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.06, r * 0.015, r * 0.01]} position={[0, -r * 0.32, fz + r * 0.01]} />

      {/* Small ears */}
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 0.08, r * 0.1, r * 0.06]} position={[-r * 0.86, eyeY + r * 0.02, -r * 0.04]} />
      <mesh geometry={sphereGeo(1)} material={skin} scale={[r * 0.08, r * 0.1, r * 0.06]} position={[r * 0.86, eyeY + r * 0.02, -r * 0.04]} />
      {/* Inner ear */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} scale={[r * 0.04, r * 0.06, r * 0.03]} position={[-r * 0.88, eyeY + r * 0.02, -r * 0.03]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial(isF ? '#d4a090' : '#c49080', 0.8)} scale={[r * 0.04, r * 0.06, r * 0.03]} position={[r * 0.88, eyeY + r * 0.02, -r * 0.03]} />

      {/* Eyelids for blink */}
      <group ref={lidsRef} scale={[1, 0, 1]} position={[0, eyeY, fz + r * 0.012]}>
        <mesh geometry={sphereGeo(1)} material={skin} scale={[eyeR * 1.3, eyeR * 1.3, r * 0.015]} position={[-eyeX, 0, 0]} />
        <mesh geometry={sphereGeo(1)} material={skin} scale={[eyeR * 1.3, eyeR * 1.3, r * 0.015]} position={[eyeX, 0, 0]} />
      </group>
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
  const cap = (scale: V3, lift = 0.18) => <mesh geometry={sphereGeo(1)} material={hairM} scale={scale} position={[0, cy + r * lift, -r * 0.12]} />
  const fringe = (w = 0.8, h = 0.13) => (
    <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * w, r * h, r * 0.36]} position={[0, cy + r * 0.66, r * 0.5]} rotation={[0.2, 0, 0]} />
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
    case 'ponytail': return (
      <group>
        {/* Base hair cap */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 1.08, r * 1.02, r * 0.92]} position={[0, cy + r * 0.12, -r * 0.12]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 1.05, r * 0.95, r * 0.88]} position={[0, cy + r * 0.18, -r * 0.16]} />

        {/* Crown detail — slight volume at top */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.35, r * 0.2, r * 0.35]} position={[0, cy + r * 0.72, -r * 0.15]} />

        {/* Side temples — natural hairline */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.18, r * 0.3, r * 0.12]} position={[-r * 0.82, cy + r * 0.45, -r * 0.02]} rotation={[0, 0, 0.15]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.18, r * 0.3, r * 0.12]} position={[r * 0.82, cy + r * 0.45, -r * 0.02]} rotation={[0, 0, -0.15]} />

        {/* Ponytail base / hair tie at back of head */}
        <mesh geometry={torusGeo(r * 0.2, r * 0.03, 8, 16)} material={hairM} position={[0, cy + r * 0.28, -r * 0.72]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.22, r * 0.14, r * 0.22]} position={[0, cy + r * 0.3, -r * 0.75]} />

        {/* Ponytail strands — individual flowing hair */}
        {/* Center strands */}
        <Strand m={hairM} len={r * 3.0} rTop={r * 0.14} rBot={r * 0.02} p={[0, cy + r * 0.3, -r * 0.8]} rot={[-0.15, 0, 0]} />
        <Strand m={hairM} len={r * 2.8} rTop={r * 0.12} rBot={r * 0.02} p={[r * 0.06, cy + r * 0.32, -r * 0.83]} rot={[-0.2, 0.02, 0]} />
        <Strand m={hairM} len={r * 2.6} rTop={r * 0.11} rBot={r * 0.015} p={[-r * 0.06, cy + r * 0.31, -r * 0.82]} rot={[-0.25, -0.02, 0]} />

        {/* Left side strands */}
        <Strand m={hairM} len={r * 2.5} rTop={r * 0.1} rBot={r * 0.015} p={[-r * 0.14, cy + r * 0.3, -r * 0.82]} rot={[-0.18, 0, -0.15]} />
        <Strand m={hairM} len={r * 2.2} rTop={r * 0.09} rBot={r * 0.01} p={[-r * 0.2, cy + r * 0.33, -r * 0.84]} rot={[-0.25, 0, -0.2]} />
        <Strand m={hairM} len={r * 1.8} rTop={r * 0.07} rBot={r * 0.01} p={[-r * 0.25, cy + r * 0.35, -r * 0.86]} rot={[-0.3, 0, -0.25]} />

        {/* Right side strands */}
        <Strand m={hairM} len={r * 2.5} rTop={r * 0.1} rBot={r * 0.015} p={[r * 0.14, cy + r * 0.3, -r * 0.82]} rot={[-0.18, 0, 0.15]} />
        <Strand m={hairM} len={r * 2.2} rTop={r * 0.09} rBot={r * 0.01} p={[r * 0.2, cy + r * 0.33, -r * 0.84]} rot={[-0.25, 0, 0.2]} />
        <Strand m={hairM} len={r * 1.8} rTop={r * 0.07} rBot={r * 0.01} p={[r * 0.25, cy + r * 0.35, -r * 0.86]} rot={[-0.3, 0, 0.25]} />

        {/* Outer loose strands — natural flyaways */}
        <Strand m={hairM} len={r * 1.5} rTop={r * 0.05} rBot={r * 0.005} p={[-r * 0.32, cy + r * 0.25, -r * 0.78]} rot={[-0.1, 0, -0.35]} />
        <Strand m={hairM} len={r * 1.3} rTop={r * 0.04} rBot={r * 0.005} p={[r * 0.34, cy + r * 0.28, -r * 0.8]} rot={[-0.15, 0, 0.4]} />
        <Strand m={hairM} len={r * 1.8} rTop={r * 0.05} rBot={r * 0.005} p={[-r * 0.22, cy + r * 0.38, -r * 0.88]} rot={[-0.35, 0, -0.3]} />
        <Strand m={hairM} len={r * 1.4} rTop={r * 0.04} rBot={r * 0.005} p={[r * 0.26, cy + r * 0.36, -r * 0.9]} rot={[-0.4, 0, 0.35]} />

        {/* Lower strands — movement at bottom */}
        <Strand m={hairM} len={r * 2.0} rTop={r * 0.08} rBot={r * 0.01} p={[0.04, cy + r * 0.33, -r * 0.85]} rot={[-0.32, 0.05, 0.02]} />
        <Strand m={hairM} len={r * 1.8} rTop={r * 0.07} rBot={r * 0.01} p={[-0.04, cy + r * 0.35, -r * 0.87]} rot={[-0.38, -0.05, -0.02]} />

        {/* Face-framing wisps — above eyes, not covering */}
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.15, r * 0.06, r * 0.08]} position={[-r * 0.3, cy + r * 0.62, r * 0.55]} rotation={[0.2, 0, 0.15]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.13, r * 0.05, r * 0.07]} position={[r * 0.26, cy + r * 0.64, r * 0.57]} rotation={[0.18, 0, -0.13]} />
        <mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.11, r * 0.04, r * 0.06]} position={[0, cy + r * 0.66, r * 0.58]} rotation={[0.15, 0, 0]} />

        {/* Ear-side loose hairs */}
        <Strand m={hairM} len={r * 1.2} rTop={r * 0.08} rBot={r * 0.01} p={[-r * 0.8, cy + r * 0.35, -r * 0.05]} rot={[0.1, 0, -0.25]} />
        <Strand m={hairM} len={r * 1.0} rTop={r * 0.07} rBot={r * 0.01} p={[r * 0.82, cy + r * 0.38, -r * 0.05]} rot={[0.1, 0, 0.28]} />
      </group>
    )
    case 'twintails': return <group>{texturedCap([r * 1.09, r * 1.03, r * 1.09], 0.15, 0.11)}{fringe(0.84)}{[-1, 1].map((sx) => <group key={sx}><mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.26, r * 0.26, r * 0.26]} position={[sx * r * 0.92, cy + r * 0.55, -r * 0.08]} /><Strand m={hairM} len={r * 2.0} rTop={r * 0.38} rBot={r * 0.1} p={[sx * r * 1.0, cy + r * 0.48, -r * 0.12]} rot={[-0.15, 0, sx * 0.45]} /></group>)}</group>
    case 'bun': return <group>{texturedCap([r * 1.07, r * 1.01, r * 1.07], 0.13, 0.1)}<mesh geometry={sphereGeo(1)} material={hairM} scale={[r * 0.38, r * 0.38, r * 0.38]} position={[0, cy + r * 1.02, -r * 0.08]} />{fringe(0.78)}</group>
    case 'braided': return <group>{texturedCap([r * 1.09, r * 1.02, r * 1.09], 0.18, 0.11)}{fringe(0.84)}{sideFall(1.3, 0.18, 0.1)}<Strand m={hairM} len={r * 2.5} rTop={r * 0.32} rBot={r * 0.08} p={[0, cy + r * 0.3, -r * 0.6]} rot={[-0.08, 0, 0]} /></group>
    default: return null
  }
}

/* ================================================ ARMS ================================================ */

function Arm({ side, bind, P, skin, topM, isSleeved }: {
  side: 'L' | 'R'; bind: (n: BoneName) => (g: Group | null) => void
  P: Proportions; skin: Mat; topM: Mat; isSleeved: boolean
}) {
  const sign = side === 'L' ? -1 : 1
  const upper: BoneName = side === 'L' ? 'armUpperL' : 'armUpperR'
  const lower: BoneName = side === 'L' ? 'armLowerL' : 'armLowerR'
  const armM = isSleeved ? topM : skin

  return (
    <group ref={bind(upper)} position={[sign * P.shoulderW, 0.04 + P.spineLen + P.chestLen * 0.65, 0]}>
      {/* Upper arm — base shape with bicep bulge */}
      <mesh geometry={latheGeo([
        [P.elbowR, -P.upperArm],
        [P.elbowR * 1.15, -P.upperArm * 0.82],
        [P.elbowR * 1.4, -P.upperArm * 0.55],
        [P.shoulderR * 1.3, -P.upperArm * 0.3],
        [P.shoulderR * 2.0, -P.upperArm * 0.12],
        [P.shoulderR * 2.3, -P.upperArm * 0.04],
        [P.shoulderR * 1.95, 0],
      ])} material={armM} castShadow />

      {/* Shoulder ball — connects arm to torso visually */}
      <mesh geometry={sphereGeo(1)} material={armM} scale={[P.shoulderR * 1.44, P.shoulderR * 1.44, P.shoulderR * 1.44]} position={[0, 0, 0]} castShadow />

      <group ref={bind(lower)} position={[0, -P.upperArm, 0]}>
        {/* Forearm — flexor/extensor bulge near elbow, tapers to wrist */}
        <mesh geometry={latheGeo([
          [P.wristR, -P.lowerArm],
          [P.wristR * 1.12, -P.lowerArm * 0.78],
          [P.wristR * 1.3, -P.lowerArm * 0.5],
          [P.elbowR * 1.25, -P.lowerArm * 0.22],
          [P.elbowR * 1.35, -P.lowerArm * 0.08],
          [P.elbowR * 1.2, 0],
        ])} material={skin} castShadow />

        {/* Hand */}
        <group position={[0, -P.lowerArm - P.wristR * 0.3, 0]}>
          <mesh geometry={sphereGeo(1)} material={skin} scale={[P.wristR * 1.3, P.handLen * 0.48, P.wristR * 1.1]} position={[0, -P.handLen * 0.3, 0]} castShadow />
          <mesh geometry={sphereGeo(1)} material={skin} scale={[P.wristR * 0.26, P.wristR * 0.26, P.wristR * 0.26]} position={[P.wristR * 0.88, -P.handLen * 0.12, P.wristR * 0.26]} />
          {[-P.wristR * 0.46, -P.wristR * 0.14, P.wristR * 0.14, P.wristR * 0.4].map((fx, i) => (
            <group key={i} position={[fx, -P.handLen * 0.45, 0]}>
              <mesh geometry={taperGeo(P.wristR * 0.12, P.wristR * 0.08, P.handLen * (0.28 - i * 0.02))} material={skin} position={[0, -P.handLen * 0.12, 0]} />
              <mesh geometry={sphereGeo(1)} material={skin} scale={[P.wristR * 0.08, P.wristR * 0.08, P.wristR * 0.08]} position={[0, -P.handLen * (0.26 - i * 0.02), 0]} />
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
          <mesh geometry={boxGeo(P.ankleR * 2.2, P.ankleR * 0.4, P.footLen * 1.0)} material={shoeAccent} position={[0, -P.ankleR * 0.6, P.footLen * 0.28]} castShadow />
          {config.shoes === 'boots' && (
            <mesh geometry={taperGeo(P.ankleR * 1.2, P.ankleR * 1.05, P.lowerLeg * 0.4)} material={shoeM} position={[0, P.lowerLeg * 0.2, -P.footLen * 0.02]} />
          )}
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

    case 'robe': {
      const robeLen = P.chestLen * 1.7
      const goldTrim = sharedMaterial('#d4a84b', 0.4, 0.15)
      return (
        <group>
          <mesh geometry={taperGeo(P.chestW * 0.9, P.hipBoneW * 1.6, robeLen)} material={topM} position={[0, -robeLen * 0.35, 0]} castShadow />
          <mesh geometry={boxGeo(P.chestW * 0.04, robeLen * 0.88, P.torsoD * 0.03)} material={goldTrim} position={[-P.chestW * 0.44, -robeLen * 0.35, P.torsoD * 0.88]} />
          <mesh geometry={boxGeo(P.chestW * 0.04, robeLen * 0.88, P.torsoD * 0.03)} material={goldTrim} position={[P.chestW * 0.44, -robeLen * 0.35, P.torsoD * 0.88]} />
          <mesh geometry={sphereGeo(1)} material={topM} scale={[P.chestW * 0.58, P.chestLen * 0.34, P.torsoD * 0.46]} position={[0, P.chestLen * 0.9, -P.torsoD * 0.54]} />
          <mesh geometry={sphereGeo(1)} material={goldTrim} scale={[P.chestW * 0.1, P.chestLen * 0.1, P.torsoD * 0.01]} position={[0, P.chestLen * 0.44, P.torsoD * 0.97]} />
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#8b0000', 0.6)} scale={[P.chestW * 0.065, P.chestLen * 0.065, P.torsoD * 0.005]} position={[0, P.chestLen * 0.44, P.torsoD * 0.98]} />
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
