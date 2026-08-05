// Fixes: (1) skirt now flares out wide right below the belt so the chunky
// elephant thighs (outer edge ~0.183) are fully covered — previously the skirt
// only reached 0.17 at hip level, so grey hips poked out around the robe;
// (2) corrected the puff sleeve (was inverted: narrow at shoulder, wide at hem)
// to a proper puff that is wide at the shoulder and tapers to the hem, with the
// gold cuff at the hem; (3) chunkier forearm with a gentle muscular swell.
// CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
let out = src.replace(/\r\n/g, '\n')

function rep(oldS, newS, label) {
  if (!out.includes(oldS)) { console.error('MISSING: ' + label); process.exit(1) }
  out = out.split(oldS).join(newS)
  console.log('ok: ' + label)
}

// ---- 1. Skirt profile — flare out immediately below the waist to cover the hips ----
rep(
  `                <mesh geometry={latheGeo([
                  [P.waistW * 1.32, 0.06],
                  [P.hipBoneW * 1.42, -0.1],
                  [P.hipBoneW * 1.58, -0.22],
                  [P.hipBoneW * 1.7, -0.35],
                ])} castShadow>`,
  `                <mesh geometry={latheGeo([
                  [P.waistW * 1.36, 0.06],
                  [P.hipBoneW * 1.55, -0.08],
                  [P.hipBoneW * 1.68, -0.2],
                  [P.hipBoneW * 1.82, -0.35],
                ])} castShadow>`,
  'skirt flare covers hips'
)

// ---- 2. Hem bands — match the new wider hem ----
rep(
  `                <mesh geometry={torusGeo(P.hipBoneW * 1.66, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                  position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={torusGeo(P.hipBoneW * 1.5, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                  position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
  `                <mesh geometry={torusGeo(P.hipBoneW * 1.78, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                  position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={torusGeo(P.hipBoneW * 1.6, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                  position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />`,
  'hem bands match flare'
)

// ---- 3. Fix the puff sleeve orientation (wide at shoulder, taper to hem) ----
rep(
  `          {/* Navy puff sleeve — rounded cap over the shoulder, flared hem */}
          <mesh geometry={latheGeo([
            [eArmElbowR * 1.08, -P.upperArm * 0.44 * eArmY],
            [eArmElbowR * 1.0, -P.upperArm * 0.3 * eArmY],
            [eArmTopR * 0.9, -P.upperArm * 0.12 * eArmY],
            [eArmTopR * 1.06, -P.upperArm * 0.02 * eArmY],
            [eArmTopR, P.upperArm * 0.08 * eArmY],
            [eArmTopR * 0.6, P.upperArm * 0.16 * eArmY],
            [eArmTopR * 0.25, P.upperArm * 0.2 * eArmY],
          ])} material={topM} castShadow />
          {/* Gold cuff ring at the sleeve hem */}
          <mesh geometry={torusGeo(eArmElbowR * 1.1, eArmElbowR * 0.04, 8, 20)} material={sharedMaterial('#D4AF37', 0.3, 0.65)}
            position={[0, -P.upperArm * 0.44 * eArmY, P.wristR * 0.4]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Bare grey forearm below the sleeve — clean column */}
          <mesh geometry={latheGeo([
            [eArmElbowR, -P.upperArm * eArmY],
            [eArmElbowR * 1.0, -P.upperArm * 0.45 * eArmY],
          ])} material={armM} castShadow />`,
  `          {/* Navy puff sleeve — wide rounded cap over the shoulder, tapering to a neat hem */}
          <mesh geometry={latheGeo([
            [eArmElbowR * 1.16, -P.upperArm * 0.46 * eArmY],
            [eArmTopR * 0.92, -P.upperArm * 0.3 * eArmY],
            [eArmTopR * 1.1, -P.upperArm * 0.14 * eArmY],
            [eArmTopR * 1.12, -P.upperArm * 0.0 * eArmY],
            [eArmTopR * 1.0, P.upperArm * 0.08 * eArmY],
            [eArmTopR * 0.7, P.upperArm * 0.16 * eArmY],
            [eArmTopR * 0.3, P.upperArm * 0.22 * eArmY],
          ])} material={topM} castShadow />
          {/* Gold cuff ring at the sleeve hem */}
          <mesh geometry={torusGeo(eArmElbowR * 1.2, eArmElbowR * 0.045, 8, 20)} material={sharedMaterial('#D4AF37', 0.3, 0.65)}
            position={[0, -P.upperArm * 0.46 * eArmY, P.wristR * 0.4]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Bare grey upper-arm below the sleeve — clean column */}
          <mesh geometry={latheGeo([
            [eArmElbowR, -P.upperArm * eArmY],
            [eArmElbowR * 1.02, -P.upperArm * 0.47 * eArmY],
          ])} material={armM} castShadow />`,
  'correct puff sleeve'
)

// ---- 4. Chunkier forearm with gentle muscular swell ----
rep(
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 0.97, -P.lowerArm * 0.75 * eArmY],
            [eArmElbowR * 0.93, -P.lowerArm * 0.5 * eArmY],
            [eArmWristR * 1.12, -P.lowerArm * 0.25 * eArmY],
            [eArmWristR * 1.08, 0],
          ])} material={skin} castShadow />`,
  `          <mesh geometry={latheGeo([
            [eArmElbowR * 1.02, -P.lowerArm * eArmY],
            [eArmElbowR * 1.08, -P.lowerArm * 0.72 * eArmY],
            [eArmElbowR * 1.02, -P.lowerArm * 0.48 * eArmY],
            [eArmWristR * 1.28, -P.lowerArm * 0.24 * eArmY],
            [eArmWristR * 1.16, 0],
          ])} material={skin} castShadow />`,
  'chunky forearm'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Hips + arms fixes applied')
