import fs from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const ORIG = 'C:/Users/taksh/studyforest/docs/_scripts/orig_rig_for_revert.tsx'
let src = fs.readFileSync(FILE, 'utf8')
const orig = fs.readFileSync(ORIG, 'utf8')

let applied = 0
function rep(oldStr, newStr, label) {
  const idx = src.indexOf(oldStr)
  if (idx === -1) {
    console.error('MISS:', label)
    return
  }
  src = src.slice(0, idx) + newStr + src.slice(idx + oldStr.length)
  applied++
  console.log('OK:', label)
}

// ---------------------------------------------------------------------------
// 1. Materials — back to the original warm-brown fur, cream face
// ---------------------------------------------------------------------------
rep(
  `  const monkeyFur = sharedMaterial('#96613F', 0.88)
  const monkeyFace = sharedMaterial('#E8C69B', 0.85)
  const monkeyFaceMask = new MeshStandardMaterial({ color: '#F5D6B4', roughness: 0.85, depthWrite: false, depthTest: true })
  const monkeyDark = sharedMaterial('#5C3A21', 0.75)`,
  `  const monkeyFur = sharedMaterial('#8B5E3C', 0.62)
  const monkeyFace = sharedMaterial('#F5D6B4', 0.68)
  const monkeyFaceMask = new MeshStandardMaterial({ color: '#F5D6B4', roughness: 0.68, depthWrite: false, depthTest: true })
  const monkeyDark = sharedMaterial('#5C3A21', 0.6)`,
  '1. materials'
)

// ---------------------------------------------------------------------------
// 2. Remove the fur-grain bump block that was added for the monkey
// ---------------------------------------------------------------------------
rep(
  `  // Monkey: soft fur grain so the coat reads as fur, not plastic
  if (isMonkey) {
    const mkTex = skinReliefTex()
    monkeyFur.bumpMap = mkTex
    monkeyFur.bumpScale = 0.16
    monkeyFur.roughnessMap = mkTex
    monkeyFur.roughness = 0.82
    monkeyDark.bumpMap = mkTex
    monkeyDark.bumpScale = 0.12
    monkeyDark.roughnessMap = mkTex
    monkeyDark.roughness = 0.75
  }
`,
  '',
  '2. remove fur-grain block'
)

// ---------------------------------------------------------------------------
// 3. Body costume — restore original belly patch + torus-ring tail
// ---------------------------------------------------------------------------
rep(
  `        {isMonkey && (
          <group>
            {/* lighter fur chest + belly patch — cream chest, tan belly */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#F3DFC0', 0.85)} scale={[P.chestW * 0.6, P.chestLen * 0.34, P.torsoD * 0.22]} position={[0, P.spineLen + P.chestLen * 0.98, P.torsoD * 0.95]} />
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.85, P.chestLen * 0.55, P.torsoD * 0.28]} position={[0, P.spineLen + P.chestLen * 0.12, P.torsoD * 0.95]} />

            {/* leather belt band + thick gold ring with a big buckle */}
            <mesh geometry={torusGeo(P.waistW * 1.3, P.hipBoneW * 0.1, 10, 24)} material={sharedMaterial('#4a2f17', 0.85)}
              position={[0, P.spineLen * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={torusGeo(P.waistW * 1.38, P.hipBoneW * 0.075, 10, 24)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={boxGeo(P.waistW * 0.34, P.waistW * 0.24, P.torsoD * 0.07)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, P.torsoD * 1.75]} />

            {/* long curling tail — a smooth tapered tube sweeping down into a curl */}
            <group position={[0, -0.02, -P.torsoD * 0.85]} rotation={[0.8, 0, 0]}>
              <MonkeyTail P={P} fur={monkeyFur} belly={monkeyBelly} />
            </group>
</group>
         )}`,
  `        {isMonkey && (
          <group>
            {/* tan belly patch */}
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.55, P.chestLen * 0.38, P.torsoD * 0.22]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.86]} />
            {/* long curling tail — a graceful spiral curve starting from lower back */}
            <group position={[0, -0.02, -P.torsoD * 0.85]} rotation={[0.8, 0, 0]}>
              {/* tail base — thick root */}
              <mesh geometry={taperGeo(P.hipBoneW * 0.1, P.hipBoneW * 0.07, P.upperLeg * 0.4)} material={monkeyFur} position={[0, -P.upperLeg * 0.2, 0]} castShadow />
              {/* first curl — torus ring */}
              <mesh geometry={torusGeo(P.hipBoneW * 0.22, P.hipBoneW * 0.045, 8, 20)} material={monkeyFur}
                position={[0, -P.upperLeg * 0.45, P.hipBoneW * 0.15]} rotation={[Math.PI / 2, 0, 0]} />
              {/* second curl — slightly smaller */}
              <mesh geometry={torusGeo(P.hipBoneW * 0.16, P.hipBoneW * 0.035, 8, 18)} material={monkeyDark}
                position={[0, -P.upperLeg * 0.55, P.hipBoneW * 0.3]} rotation={[Math.PI / 2, 0, 0.3]} />
              {/* tail tip — little curl */}
              <mesh geometry={torusGeo(P.hipBoneW * 0.1, P.hipBoneW * 0.028, 8, 14)} material={monkeyBelly}
                position={[P.hipBoneW * 0.04, -P.upperLeg * 0.58, P.hipBoneW * 0.4]} rotation={[Math.PI / 2.5, 0.3, 0.4]} />
            </group>
          </group>
        )}`,
  '3. body costume'
)

// ---------------------------------------------------------------------------
// 4. MonkeyHead — swap the whole function via start/end markers
// ---------------------------------------------------------------------------
function extractBetween(text, startMarker, endMarker) {
  const s = text.indexOf(startMarker)
  if (s === -1) throw new Error('start marker not found: ' + startMarker.slice(0, 50))
  const e = text.indexOf(endMarker, s + startMarker.length)
  if (e === -1) throw new Error('end marker not found: ' + endMarker.slice(0, 50))
  return text.slice(s, e)
}
// Current MonkeyHead: from the function decl to the PANDA HEAD banner
const curMH = extractBetween(
  src,
  'function MonkeyHead({ P, fur, face, dark, inner, belly }: { P: Proportions; fur: Mat; face: Mat; dark: Mat; inner: Mat; belly: Mat }) {',
  '/* ================================================ PANDA HEAD ================================================ */'
)
// Original MonkeyHead: from the function decl to the HACKER HEAD banner
const origMH = extractBetween(
  orig,
  'function MonkeyHead({ P, fur, face, dark, inner, belly }: { P: Proportions; fur: Mat; face: Mat; dark: Mat; inner: Mat; belly: Mat }) {',
  '/* ================================================ HACKER HEAD ================================================ */'
)
rep(curMH, origMH, '4. MonkeyHead')

// ---------------------------------------------------------------------------
// 5. Remove the MonkeyTail component entirely
// ---------------------------------------------------------------------------
const curTail = extractBetween(
  src,
  '/* ================================================ MONKEY TAIL ================================================ */',
  '/* ================================================ HACKER HEAD ================================================ */'
)
rep(curTail, '', '5. remove MonkeyTail')

// ---------------------------------------------------------------------------
// 6. Remove the monkey arm/leg proportion constants
// ---------------------------------------------------------------------------
rep(
  `const MONKEY_LEG_Y = 0.7
const MONKEY_ARM_Y = 0.72

`,
  `
`,
  '6. remove MONKEY_* constants'
)

// ---------------------------------------------------------------------------
// 7. Arm — drop the monkey arm-shape consts
// ---------------------------------------------------------------------------
rep(
  `   // Monkey arms — shorter, stubbier for plush toy silhouette
   const mArmY = isMonkey ? MONKEY_ARM_Y : 1
   const mArmW = isMonkey ? 0.85 : 1
`,
  ``,
  '7. remove monkey arm consts'
)

// ---------------------------------------------------------------------------
// 8. Arm — remove the monkey upper-arm branch (falls back to generic arm)
// ---------------------------------------------------------------------------
rep(
  `       ) : isMonkey ? (
         /* Monkey: shorter, chunkier arms */
         <mesh geometry={latheGeo([
           [P.elbowR * mArmW, -P.upperArm * mArmY],
           [P.elbowR * 1.08 * mArmW, -P.upperArm * 0.85 * mArmY],
           [P.shoulderR * 1.3 * mArmW, -P.upperArm * 0.58 * mArmY],
           [P.shoulderR * 1.6 * mArmW, -P.upperArm * 0.3 * mArmY],
           [P.shoulderR * 1.8 * mArmW, -P.upperArm * 0.08 * mArmY],
           [P.shoulderR * 1.7 * mArmW, P.upperArm * 0.06 * mArmY],
           [P.shoulderR * 1.3 * mArmW, P.upperArm * 0.16 * mArmY],
           [P.shoulderR * 0.7 * mArmW, P.upperArm * 0.24 * mArmY],
           [P.shoulderR * 0.15 * mArmW, P.upperArm * 0.3 * mArmY],
         ])} material={armM} castShadow />
       ) : isPanda ? (`,
  `       ) : isPanda ? (`,
  '8. remove monkey upper-arm branch'
)

// ---------------------------------------------------------------------------
// 9. Arm — bind(lower) position drops monkey arm length
// ---------------------------------------------------------------------------
rep(
  `<group ref={bind(lower)} position={[0, -P.upperArm * (isPanda ? pArmY : isMonkey ? mArmY : eArmY), 0]}>`,
  `<group ref={bind(lower)} position={[0, -P.upperArm * (isPanda ? pArmY : eArmY), 0]}>`,
  '9. bind(lower) monkey removal'
)

// ---------------------------------------------------------------------------
// 10. Arm — remove the monkey forearm branch
// ---------------------------------------------------------------------------
rep(
  `         ) : isMonkey ? (
           /* Monkey: shorter, chunkier forearm */
           <mesh geometry={latheGeo([
             [P.wristR * mArmW, -P.lowerArm * mArmY],
             [P.wristR * 1.02 * mArmW, -P.lowerArm * 0.9 * mArmY],
             [P.wristR * 1.15 * mArmW, -P.lowerArm * 0.7 * mArmY],
             [P.elbowR * 1.05 * mArmW, -P.lowerArm * 0.35 * mArmY],
             [P.elbowR * 1.08 * mArmW, -P.lowerArm * 0.2 * mArmY],
             [P.elbowR * mArmW, 0],
           ])} material={armM} castShadow />
         ) : isPanda ? (`,
  `         ) : isPanda ? (`,
  '10. remove monkey forearm branch'
)

// ---------------------------------------------------------------------------
// 11. Arm — hand group position drops monkey arm length
// ---------------------------------------------------------------------------
rep(
  `<group position={[0, -P.lowerArm * (isPanda ? pArmY : isMonkey ? mArmY : eArmY) - P.wristR * 0.2, P.wristR * 0.3]}>`,
  `<group position={[0, -P.lowerArm * (isPanda ? pArmY : eArmY) - P.wristR * 0.2, P.wristR * 0.3]}>`,
  '11. hand group position monkey removal'
)

// ---------------------------------------------------------------------------
// 12. Arm — remove the monkey 5-finger hand branch (falls back to generic hand)
// ---------------------------------------------------------------------------
rep(
  `          ) : isMonkey ? (
            /* Monkey hand — five long curved fingers with knuckles + a lighter palm pad */
            <>
              {[-P.wristR * 0.62, -P.wristR * 0.31, 0, P.wristR * 0.31, P.wristR * 0.62].map((fx, i) => (
                <group key={'mkf' + i} position={[fx, -P.handLen * 0.44, P.wristR * 0.06]} rotation={[0.55, 0, (i - 2) * 0.12]}>
                  {/* knuckle */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.16, P.wristR * 0.17, P.wristR * 0.15]} position={[0, -P.handLen * 0.02, 0]} />
                  {/* long curved finger */}
                  <mesh geometry={taperGeo(P.wristR * 0.13, P.wristR * 0.08, P.handLen * 0.34)} material={gloveM} position={[0, -P.handLen * 0.18, 0]} />
                  {/* rounded fingertip */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.1, P.wristR * 0.11, P.wristR * 0.11]} position={[0, -P.handLen * 0.36, 0]} />
                </group>
              ))}
{/* lighter palm pad — visible monkey grip pad */}
               <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.75)}
                 scale={[P.wristR * 0.6, P.wristR * 0.5, P.wristR * 0.36]} position={[0, -P.handLen * 0.26, P.wristR * 1.05]} />
             </>
           ) : isPanda ? (`,
  `           ) : isPanda ? (`,
  '12. remove monkey hand branch'
)

// ---------------------------------------------------------------------------
// 13. Leg — drop monkey leg const
// ---------------------------------------------------------------------------
rep(
  `   // Monkey legs — shorter, stubbier for plush toy silhouette
   const mLegY = isMonkey ? MONKEY_LEG_Y : 1
`,
  ``,
  '13. remove monkey leg const'
)

// ---------------------------------------------------------------------------
// 14. Leg — foot bind position drops monkey leg length
// ---------------------------------------------------------------------------
rep(
  `<group ref={bind(foot)} position={[0, -P.lowerLeg * (isPanda ? pLegY : isMonkey ? mLegY : eLegY) - P.ankleR * 0.4, 0]}>`,
  `<group ref={bind(foot)} position={[0, -P.lowerLeg * (isPanda ? pLegY : eLegY) - P.ankleR * 0.4, 0]}>`,
  '14. foot bind monkey removal'
)

// ---------------------------------------------------------------------------
// 15. Leg — revert monkey foot to the original dark feet + toe bumps
// ---------------------------------------------------------------------------
rep(
  `{/* Monkey: dark feet with visible round toes + tan pads */}
           {isMonkey && (
             <group>
               {/* foot bulb */}
               <mesh geometry={sphereGeo(1)} material={monkeyDark}
                 scale={[P.ankleR * 1.2, P.ankleR * 0.95, P.footLen * 0.75]}
                 position={[0, -P.ankleR * 0.4, P.footLen * 0.3]} castShadow />
               {/* visible round toes poking out the front */}
               {[-P.ankleR * 0.32, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.32].map((tx, i) => (
                 <mesh key={\`mt${'${i}'}\`} geometry={sphereGeo(1)} material={monkeyDark}
                   scale={[P.ankleR * 0.17, P.ankleR * 0.19, P.ankleR * 0.17]}
                   position={[tx, -P.ankleR * 0.55, P.footLen * 0.8]} />
               ))}
             </group>
           )}`,
  `          {/* Monkey: darker brown feet like a real monkey's dark hands/feet */}
          {isMonkey && (
            <group>
              <mesh geometry={sphereGeo(1)} material={monkeyDark}
                scale={[P.ankleR * 1.15, P.ankleR * 0.9, P.footLen * 0.7]}
                position={[0, -P.ankleR * 0.4, P.footLen * 0.25]} castShadow />
              {/* toe bumps */}
              {[-P.ankleR * 0.2, -P.ankleR * 0.07, P.ankleR * 0.07, P.ankleR * 0.2].map((tx, i) => (
                <mesh key={\`mt${'${i}'}\`} geometry={sphereGeo(1)} material={monkeyDark}
                  scale={[P.ankleR * 0.12, P.ankleR * 0.1, P.footLen * 0.12]}
                  position={[tx, -P.ankleR * 0.55, P.footLen * 0.55]} />
              ))}
            </group>
          )}`,
  '15. revert monkey foot'
)

fs.writeFileSync(FILE, src)
console.log('TOTAL APPLIED:', applied)
