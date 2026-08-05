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

// 1. Softer materials — raise roughness so the fur reads as cloth/fur, not shiny plastic
replace(
  `  const monkeyFur = sharedMaterial('#96613F', 0.72)
  const monkeyFace = sharedMaterial('#F9DFBB', 0.72)
  const monkeyFaceMask = new MeshStandardMaterial({ color: '#F5D6B4', roughness: 0.68, depthWrite: false, depthTest: true })
  const monkeyDark = sharedMaterial('#5C3A21', 0.6)`,
  `  const monkeyFur = sharedMaterial('#96613F', 0.88)
  const monkeyFace = sharedMaterial('#F9DFBB', 0.85)
  const monkeyFaceMask = new MeshStandardMaterial({ color: '#F5D6B4', roughness: 0.85, depthWrite: false, depthTest: true })
  const monkeyDark = sharedMaterial('#5C3A21', 0.75)`,
  'softer monkey materials'
)

// 2. REMOVE the red bandana entirely — that is the red ring clipping the neck
replace(
  `            {/* red explorer bandana around the neck */}
            <mesh geometry={torusGeo(P.neckR * 1.7, P.neckR * 0.32, 8, 20)} material={sharedMaterial('#d8433f', 0.75)}
              position={[0, P.spineLen + P.chestLen * 1.0, P.torsoD * 1.5]} rotation={[Math.PI / 2, 0, 0]} />
            {/* knot at the front */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#b83330', 0.75)}
              scale={[P.neckR * 0.5, P.neckR * 0.45, P.neckR * 0.4]}
              position={[0, P.spineLen + P.chestLen * 0.82, P.torsoD * 1.85]} />
            {/* two tails hanging down */}
            {[-1, 1].map((sx) => (
              <mesh key={'bt' + sx} geometry={taperGeo(P.neckR * 0.16, P.neckR * 0.06, P.chestLen * 0.9)}
                material={sharedMaterial('#d8433f', 0.75)}
                position={[sx * P.neckR * 0.28, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.7]}
                rotation={[0.2, 0, sx * 0.25]} />
            ))}

`,
  '',
  'remove red bandana'
)

// 3. Chest + belly fur patch — lighter cream chest above the vest, tan belly below
replace(
  `            {/* tan belly patch */}
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.55, P.chestLen * 0.38, P.torsoD * 0.22]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.86]} />`,
  `            {/* lighter fur chest + belly patch — cream chest above the vest, tan belly below */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#F3DFC0', 0.85)} scale={[P.chestW * 0.52, P.chestLen * 0.3, P.torsoD * 0.2]} position={[0, P.spineLen + P.chestLen * 0.98, P.torsoD * 0.9]} />
            <mesh geometry={sphereGeo(1)} material={monkeyBelly} scale={[P.chestW * 0.75, P.chestLen * 0.5, P.torsoD * 0.26]} position={[0, P.spineLen + P.chestLen * 0.15, P.torsoD * 0.9]} />`,
  'chest + belly fur patch'
)

// 4. Thick belt — leather band + chunky gold ring + big buckle (was a thin barely-visible ring)
replace(
  `            {/* gold belt with buckle at the waist */}
            <mesh geometry={torusGeo(P.waistW * 1.18, P.hipBoneW * 0.045, 8, 20)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={boxGeo(P.waistW * 0.22, P.waistW * 0.16, P.torsoD * 0.045)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, P.torsoD * 1.35]} />`,
  `            {/* leather belt band + thick gold ring with a big buckle */}
            <mesh geometry={torusGeo(P.waistW * 1.3, P.hipBoneW * 0.1, 10, 24)} material={sharedMaterial('#4a2f17', 0.85)}
              position={[0, P.spineLen * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={torusGeo(P.waistW * 1.38, P.hipBoneW * 0.075, 10, 24)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={boxGeo(P.waistW * 0.3, P.waistW * 0.22, P.torsoD * 0.06)} material={sharedMaterial('#F2C14E', 0.2, 0.9)}
              position={[0, P.spineLen * 0.55, P.torsoD * 1.45]} />`,
  'thick belt + buckle'
)

// 5. Wider, sturdier monkey torso (monkey currently uses the default slim torso)
replace(
  `              { y: P.spineLen + P.chestLen * 0.8, hw: P.chestW * 1.08, hd: P.torsoD * 1.05 },
              { y: P.spineLen + P.chestLen, hw: P.shoulderW * 0.82, hd: P.torsoD * 0.92 },
              { y: P.spineLen + P.chestLen * 1.06, hw: P.neckR * 2.2, hd: P.torsoD * 0.55 },
            ])} material={topM} castShadow />
          ) : (
            <mesh geometry={torsoGeo([`,
  `              { y: P.spineLen + P.chestLen * 0.8, hw: P.chestW * 1.08, hd: P.torsoD * 1.05 },
              { y: P.spineLen + P.chestLen, hw: P.shoulderW * 0.82, hd: P.torsoD * 0.92 },
              { y: P.spineLen + P.chestLen * 1.06, hw: P.neckR * 2.2, hd: P.torsoD * 0.55 },
            ])} material={topM} castShadow />
          ) : isMonkey ? (
            /* Monkey: wider, sturdier torso so the big head doesn't look top-heavy */
            <mesh geometry={torsoGeo([
              { y: -0.07, hw: P.hipBoneW * 1.16, hd: P.torsoD * 0.95 },
              { y: -0.02, hw: P.hipBoneW * 1.1, hd: P.torsoD * 0.92 },
              { y: P.spineLen * 0.5, hw: P.waistW * 1.12, hd: P.torsoD * 0.95 },
              { y: P.spineLen, hw: P.chestW * 1.12, hd: P.torsoD * 1.0 },
              { y: P.spineLen + P.chestLen * 0.45, hw: P.chestW * 1.16, hd: P.torsoD * 1.18 },
              { y: P.spineLen + P.chestLen * 0.8, hw: P.chestW * 1.2, hd: P.torsoD * 1.1 },
              { y: P.spineLen + P.chestLen, hw: P.shoulderW * 1.04, hd: P.torsoD * 0.95 },
              { y: P.spineLen + P.chestLen * 1.06, hw: P.neckR * 2.3, hd: P.torsoD * 0.6 },
            ])} material={topM} castShadow />
          ) : (
            <mesh geometry={torsoGeo([`,
  'wider monkey torso'
)

// 6. Crown cap — embed into the skull so it no longer floats as a "hat"
replace(
  `      {/* darker fur crown cap — richer shading on the top-back of the head */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)} scale={[r * 0.95, r * 0.5, r * 0.85]} position={[0, r * 0.7, -r * 0.15]} />`,
  `      {/* darker fur crown shading — blended into the skull so no floating cap */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.85)} scale={[r * 1.0, r * 0.44, r * 0.92]} position={[0, r * 0.52, -r * 0.12]} />`,
  'crown cap embedded'
)

// 7. Sideburns — slightly bigger, pulled forward to frame the face
replace(
  `      {[-1, 1].map((sx) => (
        <mesh key={'sd' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)}
          scale={[r * 0.3, r * 0.42, r * 0.26]} position={[sx * r * 0.85, -r * 0.12, r * 0.75]} />
      ))}`,
  `      {[-1, 1].map((sx) => (
        <mesh key={'sd' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.85)}
          scale={[r * 0.32, r * 0.44, r * 0.28]} position={[sx * r * 0.85, -r * 0.12, r * 0.8]} />
      ))}`,
  'sideburns'
)

// 8. Face — push the whole face plane forward so it has real depth, not a painted-on mask
replace(
  `      {/* big flat tan face — bare monkey skin covering the whole face front, like a macaque */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.66, r * 0.72, r * 0.5]} position={[0, -r * 0.12, r * 0.55]} />`,
  `      {/* tan face — rounded forward face plane with real depth, not a painted-on mask */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.7, r * 0.78, r * 0.54]} position={[0, -r * 0.1, r * 0.62]} />`,
  'face pushed forward'
)

// 9. Eyes — dedicated bright monkey eye: white sclera, warm iris, dark pupil, big highlights
const oldEye = `      {/* James-style anime eyes — shaded warm-brown iris, big glints, upper lash line */}
      {[-1, 1].map((sx) => (
        <Eye key={` + '`eye${sx}`' + `} r={r * 1.15} x={sx * r * 0.32} y={r * 0.06} z={r * 1.02} iris="#7a4a1e" />
      ))}`
const newEye = `      {/* Monkey eyes — bright sclera, warm iris, clear dark pupil + white highlights */}
      {[-1, 1].map((sx) => {
        const er = r * 0.2
        return (
          <group key={` + '`me${sx}`' + `} position={[sx * r * 0.33, r * 0.06, r * 1.1]} rotation={[0, 0, sx * -0.06]}>
            {/* white sclera */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#ffffff', 0.35)} scale={[er * 1.22, er * 1.12, r * 0.07]} />
            {/* warm iris */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#c08a4e', 0.3)} scale={[er * 0.95, er * 0.9, r * 0.06]} position={[0, 0, r * 0.024]} />
            {/* darker iris ring */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#8a5a26', 0.3)} scale={[er * 0.62, er * 0.56, r * 0.062]} position={[0, 0, r * 0.028]} />
            {/* dark pupil */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#140d06', 0.45)} scale={[er * 0.42, er * 0.42, r * 0.065]} position={[0, 0, r * 0.033]} />
            {/* big top highlight + small bottom sparkle */}
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#ffffff', 0.1)} scale={[er * 0.32, er * 0.32, r * 0.068]} position={[-er * 0.26, er * 0.28, r * 0.037]} />
            <mesh geometry={sphereGeo(1)} material={sharedMaterial('#ffffff', 0.1)} scale={[er * 0.14, er * 0.14, r * 0.068]} position={[er * 0.24, -er * 0.2, r * 0.037]} />
          </group>
        )
      })}`
replace(oldEye, newEye, 'bright monkey eyes')

// 10. Nose — slightly bigger, sits on the new forward face
replace(
  `      {/* small flat nose */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.1, r * 0.07, r * 0.06]} position={[0, -r * 0.18, r * 1.08]} />`,
  `      {/* small flat nose */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.11, r * 0.08, r * 0.07]} position={[0, -r * 0.18, r * 1.12]} />`,
  'nose forward'
)

// 11. Nostrils — bigger, on the new face front
replace(
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.032, r * 0.024, r * 0.014]} position={[-r * 0.045, -r * 0.26, r * 1.12]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.032, r * 0.024, r * 0.014]} position={[r * 0.045, -r * 0.26, r * 1.12]} />`,
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.04, r * 0.03, r * 0.018]} position={[-r * 0.05, -r * 0.26, r * 1.16]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.04, r * 0.03, r * 0.018]} position={[r * 0.05, -r * 0.26, r * 1.16]} />`,
  'nostrils forward'
)

// 12. Smile — wider, forward on the face
const oldSmile = `      {/* wide flat smile */}
      {[-0.1, -0.05, 0, 0.05, 0.1].map((dx, i) => (
        <mesh key={` + '`sm${i}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.03, r * 0.022]}
          position={[dx * r, -r * 0.4 + Math.abs(dx) * r * 0.55, r * 1.06]} />
      ))}`
const newSmile = `      {/* wide flat smile */}
      {[-0.12, -0.06, 0, 0.06, 0.12].map((dx, i) => (
        <mesh key={` + '`sm${i}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.03, r * 0.022]}
          position={[dx * r, -r * 0.4 + Math.abs(dx) * r * 0.55, r * 1.11]} />
      ))}`
replace(oldSmile, newSmile, 'smile forward + wider')

// 13. Dimples — forward, slightly bigger
const oldDm = `      {[-1, 1].map((sx) => (
        <mesh key={` + '`dm${sx}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.028, r * 0.024, r * 0.02]} position={[sx * r * 0.18, -r * 0.34, r * 1.06]} />
      ))}`
const newDm = `      {[-1, 1].map((sx) => (
        <mesh key={` + '`dm${sx}`' + `} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.032, r * 0.028, r * 0.022]} position={[sx * r * 0.18, -r * 0.34, r * 1.11]} />
      ))}`
replace(oldDm, newDm, 'dimples forward')

// 14. Lower lip — bigger, forward
replace(
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.04, r * 0.06]} position={[0, -r * 0.5, r * 1.02]} />`,
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.07]} position={[0, -r * 0.5, r * 1.08]} />`,
  'lower lip forward'
)

// 15. Blush — moved out and forward onto the cheek surface
const oldBlush = `      {[-1, 1].map((sx) => (
        <mesh key={` + '`ch${sx}`' + `} geometry={sphereGeo(1)} material={blush} scale={[r * 0.15, r * 0.1, r * 0.05]} position={[sx * r * 0.6, -r * 0.4, r * 0.68]} />
      ))}`
const newBlush = `      {[-1, 1].map((sx) => (
        <mesh key={` + '`ch${sx}`' + `} geometry={sphereGeo(1)} material={blush} scale={[r * 0.16, r * 0.11, r * 0.05]} position={[sx * r * 0.62, -r * 0.4, r * 0.76]} />
      ))}`
replace(oldBlush, newBlush, 'blush on cheek')

// 16. Tuft — seated flush on the skull instead of floating above it
replace(
  `      {/* little tuft of fur on top of the head */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.15, r * 0.16, r * 0.15]} position={[0, r * 1.1, r * 0.38]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.11, r * 0.13, r * 0.11]} position={[-r * 0.09, r * 1.16, r * 0.33]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.11, r * 0.13, r * 0.11]} position={[r * 0.09, r * 1.16, r * 0.33]} />`,
  `      {/* little tuft of fur on top of the head — seated flush on the skull */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.13, r * 0.14, r * 0.13]} position={[0, r * 0.97, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.11, r * 0.1]} position={[-r * 0.1, r * 1.0, r * 0.26]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.11, r * 0.1]} position={[r * 0.1, r * 1.0, r * 0.26]} />`,
  'tuft flush on skull'
)

// 17. Monkey hands — thicker, longer, clearly curved fingers so they read as fingers
replace(
  `              {[-P.wristR * 0.55, -P.wristR * 0.28, 0, P.wristR * 0.28, P.wristR * 0.55].map((fx, i) => (
                <group key={'mkf' + i} position={[fx, -P.handLen * 0.42, P.wristR * 0.05]} rotation={[0.3, 0, (i - 2) * 0.08]}>
                  {/* knuckle */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.11, P.wristR * 0.12, P.wristR * 0.11]} position={[0, -P.handLen * 0.03, 0]} />
                  {/* long finger */}
                  <mesh geometry={taperGeo(P.wristR * 0.09, P.wristR * 0.05, P.handLen * 0.3)} material={gloveM} position={[0, -P.handLen * 0.17, 0]} />
                  {/* rounded fingertip */}
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.07, P.wristR * 0.08, P.wristR * 0.08]} position={[0, -P.handLen * 0.32, 0]} />
                </group>
              ))}
              {/* lighter palm pad */}
              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.wristR * 0.5, P.wristR * 0.45, P.wristR * 0.3]} position={[0, -P.handLen * 0.24, P.wristR * 1.0]} />`,
  `              {[-P.wristR * 0.62, -P.wristR * 0.31, 0, P.wristR * 0.31, P.wristR * 0.62].map((fx, i) => (
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
                scale={[P.wristR * 0.6, P.wristR * 0.5, P.wristR * 0.36]} position={[0, -P.handLen * 0.26, P.wristR * 1.05]} />`,
  'monkey hand fingers'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied} replacements applied`)
