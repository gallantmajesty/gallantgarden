import { readFileSync, writeFileSync } from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const raw = readFileSync(FILE, 'utf8')
const crlf = raw.includes('\r\n')
let src = raw.replace(/\r\n/g, '\n')

let applied = 0
function replace(oldStr, newStr, label) {
  if (!src.includes(oldStr)) {
    console.error(`MISS: ${label}`)
    return
  }
  src = src.split(oldStr).join(newStr)
  applied++
  console.log(`ok: ${label}`)
}

// 1. REMOVE the explorer vest entirely (armor look) — keep clean fur + patches + belt
replace(
  `            {/* Explorer vest — tan panels with gold trim + buttons over the fur */}
            <mesh geometry={boxGeo(P.chestW * 0.4, P.chestLen * 0.72, P.torsoD * 0.06)}
              material={sharedMaterial('#c9a06b', 0.8)}
              position={[-P.chestW * 0.26, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.05]} />
            <mesh geometry={boxGeo(P.chestW * 0.4, P.chestLen * 0.72, P.torsoD * 0.06)}
              material={sharedMaterial('#c9a06b', 0.8)}
              position={[P.chestW * 0.26, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.05]} />
            {/* gold trim down the vest opening */}
            <mesh geometry={boxGeo(P.chestW * 0.018, P.chestLen * 0.72, P.torsoD * 0.09)}
              material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.07]} />
            {/* gold buttons down the front */}
            {[0.55, 0.75, 0.95].map((t, i) => (
              <mesh key={'vb' + i} geometry={sphereGeo(1)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
                scale={[P.neckR * 0.16, P.neckR * 0.16, P.neckR * 0.08]}
                position={[0, P.spineLen + P.chestLen * t, P.torsoD * 1.12]} />
            ))}
            {/* leather belt band + thick gold ring with a big buckle */}`,
  `            {/* leather belt band + thick gold ring with a big buckle */}`,
  'remove vest + buttons'
)

// 2. Bigger chest + belly fur patches (now the chest is clean fur)
replace(
  `            {/* lighter fur chest + belly patch — cream chest above the vest, tan belly below */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#F3DFC0', 0.85)} scale={[P.chestW * 0.52, P.chestLen * 0.3, P.torsoD * 0.2]} position={[0, P.spineLen + P.chestLen * 0.98, P.torsoD * 0.9]} />
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.75, P.chestLen * 0.5, P.torsoD * 0.26]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.9]} />`,
  `            {/* lighter fur chest + belly patch — cream chest, tan belly */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#F3DFC0', 0.85)} scale={[P.chestW * 0.6, P.chestLen * 0.34, P.torsoD * 0.22]} position={[0, P.spineLen + P.chestLen * 0.98, P.torsoD * 0.9]} />
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.85, P.chestLen * 0.55, P.torsoD * 0.28]} position={[0, P.spineLen + P.chestLen * 0.12, P.torsoD * 0.9]} />`,
  'bigger chest + belly patches'
)

// 3. Warmer face tone so it blends with the fur (was stark cream "visor")
replace(
  `  const monkeyFace = sharedMaterial('#F9DFBB', 0.85)`,
  `  const monkeyFace = sharedMaterial('#E8C69B', 0.85)`,
  'warmer face tone'
)

// 4. REMOVE the sideburn bumps (the odd nodes below the ears)
replace(
  `      {/* darker fur sideburns framing the tan face */}
      {[-1, 1].map((sx) => (
        <mesh key={'sd' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.85)}
          scale={[r * 0.32, r * 0.44, r * 0.28]} position={[sx * r * 0.85, -r * 0.12, r * 0.8]} />
      ))}

`,
  '',
  'remove sideburns'
)

// 5. Face mask — bigger, covers the whole front, pulled back so the features are NOT buried
replace(
  `      {/* tan face — rounded muzzle pushed forward past the head surface so it reads as a protruding snout */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.66, r * 0.72, r * 0.48]} position={[0, -r * 0.1, r * 0.82]} />`,
  `      {/* tan face — big bare-skin face covering the whole front of the head */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.8, r * 0.84, r * 0.5]} position={[0, -r * 0.06, r * 0.6]} />`,
  'face mask fixed + enlarged'
)

// 6. Eyes — bigger, slightly wider apart so they read clearly on the face
const oldEyeOpen = `      {[-1, 1].map((sx) => {
        const er = r * 0.2
        return (
          <group key={` + '`me${sx}`' + `} position={[sx * r * 0.33, r * 0.06, r * 1.1]} rotation={[0, 0, sx * -0.06]}>`
const newEyeOpen = `      {[-1, 1].map((sx) => {
        const er = r * 0.25
        return (
          <group key={` + '`me${sx}`' + `} position={[sx * r * 0.37, r * 0.08, r * 1.1]} rotation={[0, 0, sx * -0.06]}>`
replace(oldEyeOpen, newEyeOpen, 'bigger eyes')

// 7. Nose — pull back onto the new face surface
replace(
  `      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.11, r * 0.08, r * 0.07]} position={[0, -r * 0.18, r * 1.12]} />`,
  `      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.11, r * 0.08, r * 0.07]} position={[0, -r * 0.18, r * 1.1]} />`,
  'nose on face'
)

// 8. Nostrils — pull back onto the new face surface
replace(
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.04, r * 0.03, r * 0.018]} position={[-r * 0.05, -r * 0.26, r * 1.16]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.04, r * 0.03, r * 0.018]} position={[r * 0.05, -r * 0.26, r * 1.16]} />`,
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.04, r * 0.03, r * 0.018]} position={[-r * 0.05, -r * 0.26, r * 1.14]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.04, r * 0.03, r * 0.018]} position={[r * 0.05, -r * 0.26, r * 1.14]} />`,
  'nostrils on face'
)

// 9. Smile — pull back onto the new face surface
const oldSmile = `        <mesh key={` + '`sm${i}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.03, r * 0.022]}
          position={[dx * r, -r * 0.4 + Math.abs(dx) * r * 0.55, r * 1.12]} />`
const newSmile = `        <mesh key={` + '`sm${i}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.03, r * 0.022]}
          position={[dx * r, -r * 0.4 + Math.abs(dx) * r * 0.55, r * 1.1]} />`
replace(oldSmile, newSmile, 'smile on face')

// 10. Dimples — pull back
const oldDm = `        <mesh key={` + '`dm${sx}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.032, r * 0.028, r * 0.022]} position={[sx * r * 0.18, -r * 0.34, r * 1.11]} />`
const newDm = `        <mesh key={` + '`dm${sx}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.032, r * 0.028, r * 0.022]} position={[sx * r * 0.18, -r * 0.34, r * 1.09]} />`
replace(oldDm, newDm, 'dimples on face')

// 11. Lower lip — pull back
replace(
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.07]} position={[0, -r * 0.5, r * 1.08]} />`,
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.07]} position={[0, -r * 0.5, r * 1.06]} />`,
  'lip on face'
)

// 12. Blush — out and forward onto the bigger face
const oldBlush = `        <mesh key={` + '`ch${sx}`' + `} geometry={sphereGeo(1)} material={blush} scale={[r * 0.16, r * 0.11, r * 0.05]} position={[sx * r * 0.62, -r * 0.4, r * 0.76]} />`
const newBlush = `        <mesh key={` + '`ch${sx}`' + `} geometry={sphereGeo(1)} material={blush} scale={[r * 0.16, r * 0.11, r * 0.05]} position={[sx * r * 0.66, -r * 0.4, r * 0.84]} />`
replace(oldBlush, newBlush, 'blush on face')

// 13. Tuft — bigger so it reads as a fur tuft, not a stitch
replace(
  `      {/* little tuft of fur on top of the head — seated flush on the skull */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.14, r * 0.13]} position={[0, r * 0.97, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.11, r * 0.1]} position={[-r * 0.1, r * 1.0, r * 0.26]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.11, r * 0.1]} position={[r * 0.1, r * 1.0, r * 0.26]} />`,
  `      {/* little tuft of fur on top of the head — seated flush on the skull */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.16, r * 0.18, r * 0.15]} position={[0, r * 0.95, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.14, r * 0.12]} position={[-r * 0.1, r * 1.0, r * 0.26]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.14, r * 0.12]} position={[r * 0.1, r * 1.0, r * 0.26]} />`,
  'bigger tuft'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied} replacements applied`)
