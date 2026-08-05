// Fix robe structure: the collar/emblem/epaulettes/belt were accidentally inside
// the swaying skirt group. Rewrite so only skirt + hem bands + tassels sway.
// Also push the ear crease shading out of the pink pad, and nudge the placket
// forward so it isn't buried inside the robe. CRLF-aware.
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

// ---- 1. Rewrite the robe inner group: bodice stays put, skirt group wraps ONLY
//         the skirt lathe + hem bands + tassels ----
rep(
  `              {/* Upper robe — fitted bodice from chest to waist */}
              <mesh geometry={latheGeo([
                [P.waistW * 1.32, 0.02],
                [P.waistW * 1.3, 0.08],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />

              {/* Flowing skirt — flared wide over the hips and thighs (covers the
                  bum), hangs to just above the feet, and sways like cloth */}
              <group ref={robeSkirtRef} position={[0, -0.02, 0]}>
                <mesh geometry={latheGeo([
                  [P.waistW * 1.32, 0.06],
                  [P.hipBoneW * 1.42, -0.1],
                  [P.hipBoneW * 1.58, -0.22],
                  [P.hipBoneW * 1.7, -0.35],
                ])} material={elNavy} castShadow />

              {/* Gold collar band — wraps the robe neckline */}
              <mesh geometry={torusGeo(P.neckR * 2.62, P.neckR * 0.11, 8, 26)} material={elTrim}
                position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} />

              {/* Glowing gold chest emblem — radiant medallion on the robe front */}
              <group position={[0, 0.2, P.torsoD * 1.52]}>
                <mesh geometry={torusGeo(P.waistW * 0.14, P.waistW * 0.04, 8, 22)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.1, P.waistW * 0.1, P.waistW * 0.02]} />
              </group>

              {/* Gold shoulder epaulettes — small rimmed pads on the robe shoulders */}
              {[-1, 1].map((sx) => (
                <group key={'ep' + sx} position={[sx * P.chestW * 1.12, 0.32, 0]} rotation={[0, 0, sx * -0.3]}>
                  <mesh geometry={sphereGeo(1)} material={elTrim} scale={[P.waistW * 0.16, P.waistW * 0.07, P.waistW * 0.14]} />
                </group>
              ))}

              {/* Glowing gold hem band + a second gold trim above it (on the skirt) */}
              <mesh geometry={torusGeo(P.hipBoneW * 1.66, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={torusGeo(P.hipBoneW * 1.5, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />

              {/* Gold belt over the robe at the waist, with a glowing buckle + hanging tassel */}
              <mesh geometry={torusGeo(P.waistW * 1.28, P.hipBoneW * 0.055, 8, 24)} material={elTrim}
                position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={boxGeo(P.waistW * 0.26, P.waistW * 0.2, P.torsoD * 0.06)} material={elTrim}
                position={[0, 0.1, P.torsoD * 1.45]} />
              <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.08, P.waistW * 0.1, P.waistW * 0.06]}
                position={[0, 0.04, P.torsoD * 1.5]} />
              {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                  position={[tx, -0.02, P.torsoD * 1.52]} />
              ))}
              </group>

              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.34, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.02, P.torsoD * 1.42]} />
            </group>`,
  `              {/* Upper robe — fitted bodice from chest to waist (stays put) */}
              <mesh geometry={latheGeo([
                [P.waistW * 1.32, 0.02],
                [P.waistW * 1.3, 0.08],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />

              {/* Gold collar band — wraps the robe neckline (on the bodice) */}
              <mesh geometry={torusGeo(P.neckR * 2.62, P.neckR * 0.11, 8, 26)} material={elTrim}
                position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} />

              {/* Glowing gold chest emblem — radiant medallion on the robe front */}
              <group position={[0, 0.2, P.torsoD * 1.58]}>
                <mesh geometry={torusGeo(P.waistW * 0.14, P.waistW * 0.04, 8, 22)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.1, P.waistW * 0.1, P.waistW * 0.02]} />
              </group>

              {/* Gold shoulder epaulettes — small rimmed pads on the robe shoulders */}
              {[-1, 1].map((sx) => (
                <group key={'ep' + sx} position={[sx * P.chestW * 1.12, 0.32, 0]} rotation={[0, 0, sx * -0.3]}>
                  <mesh geometry={sphereGeo(1)} material={elTrim} scale={[P.waistW * 0.16, P.waistW * 0.07, P.waistW * 0.14]} />
                </group>
              ))}

              {/* Gold belt over the bodice at the waist, with a glowing buckle */}
              <mesh geometry={torusGeo(P.waistW * 1.28, P.hipBoneW * 0.055, 8, 24)} material={elTrim}
                position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={boxGeo(P.waistW * 0.26, P.waistW * 0.2, P.torsoD * 0.06)} material={elTrim}
                position={[0, 0.1, P.torsoD * 1.45]} />
              <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.08, P.waistW * 0.1, P.waistW * 0.06]}
                position={[0, 0.04, P.torsoD * 1.5]} />

              {/* Flowing skirt — flared wide over the hips and thighs (covers the
                  bum), hangs to just above the feet, and sways like cloth */}
              <group ref={robeSkirtRef} position={[0, -0.02, 0]}>
                <mesh geometry={latheGeo([
                  [P.waistW * 1.32, 0.06],
                  [P.hipBoneW * 1.42, -0.1],
                  [P.hipBoneW * 1.58, -0.22],
                  [P.hipBoneW * 1.7, -0.35],
                ])} material={elNavy} castShadow />

                {/* Glowing gold hem band + a second gold trim above it (rides the skirt) */}
                <mesh geometry={torusGeo(P.hipBoneW * 1.66, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                  position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={torusGeo(P.hipBoneW * 1.5, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                  position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]} />

                {/* hanging tassels that swing with the cloth */}
                {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                  <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                    position={[tx, -0.02, P.torsoD * 1.52]} />
                ))}
              </group>

              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.34, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.02, P.torsoD * 1.62]} />
            </group>`,
  'robe structure fixed'
)

// ---- 2. Ear creases: push out of the pink pad so they're visible ----
rep(
  `          {/* soft crease shading — thin darker ellipses, no visible rings */}
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.5, r * 0.12, r * 0.04]} position={[0, r * 0.34, r * 0.12]} rotation={[0.3, 0, 0]} />
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.42, r * 0.1, r * 0.04]} position={[0, r * 0.08, r * 0.13]} rotation={[0.42, 0, 0]} />`,
  `          {/* soft crease shading — thin darker ellipses sitting proud of the pad */}
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.5, r * 0.12, r * 0.06]} position={[0, r * 0.34, r * 0.3]} rotation={[0.3, 0, 0]} />
          <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.42, r * 0.1, r * 0.06]} position={[0, r * 0.08, r * 0.31]} rotation={[0.42, 0, 0]} />`,
  'ear creases visible'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Robe structure + ear fixes applied')
