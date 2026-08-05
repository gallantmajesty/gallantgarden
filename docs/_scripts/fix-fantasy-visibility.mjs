// Fix the fantasy elements that were invisible due to geometry:
//  - belt charms pushed forward (they were buried inside the flared skirt)
//  - tassels pushed forward (same reason)
//  - placket shortened so its lower half isn't hidden by the skirt
//  - hem runes moved to sit ON the skirt surface (were inside the fabric)
//  - cape clasp moved to the back of the cape (was on the front, inside torso)
//  - tail moved further out so the purple cape doesn't swallow it
//  - crown raised so the band sits on the skull (was sunk inside the head)
//  - emblem star arms lengthened + pushed forward (were buried in the medallion)
// CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
let out = src.replace(/\r\n/g, '\n')
let applied = 0

function rep(oldS, newS, label) {
  if (!out.includes(oldS)) { console.error('MISSING: ' + label); process.exit(1) }
  out = out.split(oldS).join(newS)
  applied++
  console.log('ok: ' + label)
}

// ---- 1. Belt charms -> forward of the skirt (z ~2.0*torsoD) ----
rep(
  `              {/* jeweled belt charms — tiny gems hanging from the belt */}
              {[-1, 0, 1].map((cx, i) => (
                <mesh key={'ch' + i} geometry={sphereGeo(1)} material={i === 1 ? elGemRed : elGlowBlue}
                  scale={[P.waistW * 0.04, P.waistW * 0.06, P.waistW * 0.03]}
                  position={[cx * P.waistW * 0.16, -0.1, P.torsoD * 1.5]} />
              ))}`,
  `              {/* jeweled belt charms — tiny gems hanging in front of the skirt */}
              {[-1, 0, 1].map((cx, i) => (
                <mesh key={'ch' + i} geometry={sphereGeo(1)} material={i === 1 ? elGemRed : elGlowBlue}
                  scale={[P.waistW * 0.05, P.waistW * 0.07, P.waistW * 0.04]}
                  position={[cx * P.waistW * 0.18, -0.02, P.torsoD * 2.0]} />
              ))}`,
  'belt charms forward'
)

// ---- 2. Tassels -> forward of the skirt ----
rep(
  `                {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                  <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                    position={[tx, -0.02, P.torsoD * 1.52]} />
                ))}`,
  `                {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                  <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.025, P.waistW * 0.006, P.waistW * 0.28)} material={elTrim}
                    position={[tx, -0.04, P.torsoD * 2.1]} />
                ))}`,
  'tassels forward'
)

// ---- 3. Placket -> shorten so the lower half isn't hidden ----
rep(
  `              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.34, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.02, P.torsoD * 1.62]} />`,
  `              {/* Gold front placket down the bodice centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.26, P.torsoD * 0.03)} material={elTrim}
                position={[0, 0.1, P.torsoD * 1.62]} />`,
  'placket on bodice'
)

// ---- 4. Hem runes -> sit on the skirt surface (radius ~1.85, hem edge) ----
rep(
  `                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  return (
                    <mesh key={'hr' + i} geometry={sphereGeo(1)} material={elGlowBlue}
                      scale={[P.hipBoneW * 0.045, P.hipBoneW * 0.045, P.hipBoneW * 0.02]}
                      position={[Math.sin(a) * P.hipBoneW * 1.75, -0.3, Math.cos(a) * P.hipBoneW * 1.75]} />
                  )
                })}`,
  `                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  return (
                    <mesh key={'hr' + i} geometry={sphereGeo(1)} material={elGlowBlue}
                      scale={[P.hipBoneW * 0.05, P.hipBoneW * 0.05, P.hipBoneW * 0.02]}
                      position={[Math.sin(a) * P.hipBoneW * 1.86, -0.32, Math.cos(a) * P.hipBoneW * 1.86]} />
                  )
                })}`,
  'hem runes on surface'
)

// ---- 5. Cape clasp -> behind (negative local z) ----
rep(
  `                {/* glowing clasp at the cape top */}
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.09, P.waistW * 0.09, P.waistW * 0.09]}
                  position={[0, 0.02, P.neckR * 2.3]} />`,
  `                {/* glowing clasp at the cape top, on the back */}
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.09, P.waistW * 0.09, P.waistW * 0.09]}
                  position={[0, 0.02, -P.neckR * 2.0]} />`,
  'cape clasp behind'
)

// ---- 6. Tail -> move further out/behind so the cape doesn't cover it ----
rep(
  `            <group position={[0, -P.spineLen * 0.18, -P.torsoD * 0.90]} rotation={[0.32, 0, 0]}>`,
  `            <group position={[0, -P.spineLen * 0.18, -P.torsoD * 1.55]} rotation={[0.42, 0, 0]}>`,
  'tail behind cape'
)

// ---- 7. Crown -> raise so the band sits on the skull (head top ~2.10r) ----
rep(
  `                    {/* Golden royal crown */}
                    <group position={[0, P.headR * 2.0, 0]}>`,
  `                    {/* Golden royal crown */}
                    <group position={[0, P.headR * 2.14, 0]}>`,
  'crown raised'
)

// ---- 8. Emblem star arms -> longer and forward of the medallion ----
rep(
  `                {/* star points on the medallion */}
                {[-1, 1].map((sx) => (
                  <mesh key={'st' + sx} geometry={taperGeo(P.waistW * 0.02, 0.0001, P.waistW * 0.12)} material={elTrim}
                    position={[0, 0, 0]} rotation={[0, 0, sx * 0.785]} />
                ))}`,
  `                {/* star arms on the medallion — long enough to reach past the ring */}
                {[-1, 1].map((sx) => (
                  <mesh key={'st' + sx} geometry={taperGeo(P.waistW * 0.035, P.waistW * 0.005, P.waistW * 0.5)} material={elTrim}
                    position={[0, 0, 0]} rotation={[0, 0, sx * 0.785]} />
                ))}`,
  'star arms visible'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log(`Applied ${applied} visibility fixes`)
