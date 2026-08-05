// Fantasy upgrade for the elephant's legendary robe:
//  - deep royal-purple cape flowing behind the shoulders
//  - ivory fur trim around the collar
//  - radiant arcane chest emblem (medallion + glowing rune ring)
//  - glowing arcane runes down the robe front + hem
//  - armored golden pauldrons (bigger than the old epaulettes)
//  - hanging jeweled belt charms
//  - golden royal crown on the head
// CRLF-aware. Each replacement is independent so failures are isolated.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
let out = src.replace(/\r\n/g, '\n')
let applied = 0
const B = '\u0060' // backtick placeholder

function rep(oldS, newS, label) {
  if (!out.includes(oldS)) { console.error('MISSING: ' + label); process.exit(1) }
  out = out.split(oldS).join(newS)
  applied++
  console.log('ok: ' + label)
}

// ---- 1. Fantasy materials after elGlowGold ----
rep(
  `  const elGlowGold = glowMaterial('#ffd766', 1.0)
`,
  `  const elGlowGold = glowMaterial('#ffd766', 1.0)
  const elCape = sharedMaterial('#4a2f7d', 0.62)
  const elFur = sharedMaterial('#f7f3ea', 0.85)
  const elGemRed = glowMaterial('#ff5a7a', 1.0)
  const elGlowBlue = glowMaterial('#7dd8ff', 1.0)
`,
  'fantasy materials'
)

// ---- 2. Ivory fur trim around the collar ----
rep(
  `              {/* Gold collar band — wraps the robe neckline (on the bodice) */}
              <mesh geometry={torusGeo(P.neckR * 2.62, P.neckR * 0.11, 8, 26)} material={elTrim}
                position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} />
`,
  `              {/* Gold collar band — wraps the robe neckline (on the bodice) */}
              <mesh geometry={torusGeo(P.neckR * 2.62, P.neckR * 0.11, 8, 26)} material={elTrim}
                position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} />
              {/* Ivory fur trim — fluffy ring around the collar */}
              {Array.from({ length: 14 }).map((_, i) => {
                const a = (i / 14) * Math.PI * 2
                return (
                  <mesh key={'fur' + i} geometry={sphereGeo(1)} material={elFur}
                    scale={[P.neckR * 0.85, P.neckR * 0.55, P.neckR * 0.7]}
                    position={[Math.sin(a) * P.neckR * 2.7, 0.31, Math.cos(a) * P.neckR * 2.7]} />
                )
              })}
`,
  'fur collar'
)

// ---- 3. Radiant arcane chest emblem (medallion + glow ring + star) ----
rep(
  `              {/* Glowing gold chest emblem — radiant medallion on the robe front */}
              <group position={[0, 0.2, P.torsoD * 1.58]}>
                <mesh geometry={torusGeo(P.waistW * 0.14, P.waistW * 0.04, 8, 22)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.1, P.waistW * 0.1, P.waistW * 0.02]} />
              </group>
`,
  `              {/* Radiant arcane chest emblem — gold medallion + glowing rune ring */}
              <group position={[0, 0.2, P.torsoD * 1.6]}>
                <mesh geometry={torusGeo(P.waistW * 0.17, P.waistW * 0.045, 8, 24)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.1, P.waistW * 0.1, P.waistW * 0.02]} />
                {/* 8 glowing rune dots around the medallion */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  return (
                    <mesh key={'em' + i} geometry={sphereGeo(1)} material={elGlowBlue}
                      scale={[P.waistW * 0.045, P.waistW * 0.045, P.waistW * 0.02]}
                      position={[Math.sin(a) * P.waistW * 0.24, Math.cos(a) * P.waistW * 0.24, 0]} />
                  )
                })}
                {/* star points on the medallion */}
                {[-1, 1].map((sx) => (
                  <mesh key={'st' + sx} geometry={taperGeo(P.waistW * 0.02, 0.0001, P.waistW * 0.12)} material={elTrim}
                    position={[0, 0, 0]} rotation={[0, 0, sx * 0.785]} />
                ))}
              </group>
`,
  'arcane emblem'
)

// ---- 4. Armored pauldrons (replace epaulettes) ----
rep(
`              {/* Gold shoulder epaulettes — small rimmed pads on the robe shoulders */}
              {[-1, 1].map((sx) => (
                <group key={'ep' + sx} position={[sx * P.chestW * 1.12, 0.32, 0]} rotation={[0, 0, sx * -0.3]}>
                  <mesh geometry={sphereGeo(1)} material={elTrim} scale={[P.waistW * 0.16, P.waistW * 0.07, P.waistW * 0.14]} />
                </group>
              ))}
`,
`              {/* Golden armored pauldrons — layered shoulder plates */}
              {[-1, 1].map((sx) => (
                <group key={'ep' + sx} position={[sx * P.chestW * 1.14, 0.32, 0]} rotation={[0, 0, sx * -0.25]}>
                  <mesh geometry={sphereGeo(1)} material={elTrim} scale={[P.waistW * 0.2, P.waistW * 0.08, P.waistW * 0.18]} />
                  <mesh geometry={torusGeo(P.waistW * 0.19, P.waistW * 0.025, 8, 20)} material={elTrim} rotation={[Math.PI / 2, 0, 0]} />
                  <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.05, P.waistW * 0.05, P.waistW * 0.03]}
                    position={[0, P.waistW * 0.03, P.waistW * 0.17]} />
                </group>
              ))}
`,
  'armored pauldrons'
)

// ---- 5. Hanging jeweled belt charms ----
rep(
  `              <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.08, P.waistW * 0.1, P.waistW * 0.06]}
                position={[0, 0.04, P.torsoD * 1.5]} />
`,
  `              <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.08, P.waistW * 0.1, P.waistW * 0.06]}
                position={[0, 0.04, P.torsoD * 1.5]} />
              {/* jeweled belt charms — tiny gems hanging from the belt */}
              {[-1, 0, 1].map((cx, i) => (
                <mesh key={'ch' + i} geometry={sphereGeo(1)} material={i === 1 ? elGemRed : elGlowBlue}
                  scale={[P.waistW * 0.04, P.waistW * 0.06, P.waistW * 0.03]}
                  position={[cx * P.waistW * 0.16, -0.1, P.torsoD * 1.5]} />
              ))}
`,
  'belt charms'
)

// ---- 6. Glowing arcane runes on the skirt (hem ring) ----
rep(
  `                {/* hanging tassels that swing with the cloth */}
                {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                  <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                    position={[tx, -0.02, P.torsoD * 1.52]} />
                ))}
              </group>
`,
  `                {/* hanging tassels that swing with the cloth */}
                {[-P.waistW * 0.05, 0, P.waistW * 0.05].map((tx, i) => (
                  <mesh key={'ts' + i} geometry={taperGeo(P.waistW * 0.02, P.waistW * 0.005, P.waistW * 0.24)} material={elTrim}
                    position={[tx, -0.02, P.torsoD * 1.52]} />
                ))}
                {/* glowing arcane runes around the hem */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2
                  return (
                    <mesh key={'hr' + i} geometry={sphereGeo(1)} material={elGlowBlue}
                      scale={[P.hipBoneW * 0.045, P.hipBoneW * 0.045, P.hipBoneW * 0.02]}
                      position={[Math.sin(a) * P.hipBoneW * 1.75, -0.3, Math.cos(a) * P.hipBoneW * 1.75]} />
                  )
                })}
              </group>
`,
  'hem runes'
)

// ---- 7. Royal cape behind the shoulders ----
rep(
  `              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.34, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.02, P.torsoD * 1.62]} />
            </group>
`,
  `              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.34, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.02, P.torsoD * 1.62]} />

              {/* Royal cape — deep purple flowing behind the shoulders */}
              <group position={[0, 0.26, -P.torsoD * 0.95]} rotation={[0.08, 0, 0]}>
                <mesh geometry={latheGeo([
                  [P.neckR * 2.6, 0.0],
                  [P.hipBoneW * 1.5, -0.12],
                  [P.hipBoneW * 1.75, -0.3],
                  [P.hipBoneW * 1.85, -0.42],
                ])} material={elCape} scale={[0.8, 1, 0.35]} castShadow />
                {/* gold trim at the cape hem */}
                <mesh geometry={torusGeo(P.hipBoneW * 1.75, P.hipBoneW * 0.05, 8, 26)} material={elTrim}
                  position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 1, 0.35]} />
                {/* glowing clasp at the cape top */}
                <mesh geometry={sphereGeo(1)} material={elGlowGold} scale={[P.waistW * 0.09, P.waistW * 0.09, P.waistW * 0.09]}
                  position={[0, 0.02, P.neckR * 2.3]} />
              </group>
            </group>
`,
  'royal cape'
)

// ---- 8. Golden royal crown on the head ----
rep(
  `                ) : isElephant ? (
                  <group scale={1.14}>
                    <ElephantHead P={P} main={elMain} dark={elDark} belly={elBelly} inner={elInner} tusk={elTusk} glasses={elGlasses} lens={elGlassLens} cheek={elCheek} />
                  </group>
`,
  `                ) : isElephant ? (
                  <group scale={1.14}>
                    <ElephantHead P={P} main={elMain} dark={elDark} belly={elBelly} inner={elInner} tusk={elTusk} glasses={elGlasses} lens={elGlassLens} cheek={elCheek} />
                    {/* Golden royal crown */}
                    <group position={[0, P.headR * 2.0, 0]}>
                      {/* crown band */}
                      <mesh geometry={torusGeo(P.headR * 0.58, P.headR * 0.06, 8, 26)} material={elTrim}
                        position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
                      {/* crown points */}
                      {[0, 1, 2, 3, 4].map((i) => {
                        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
                        return (
                          <group key={'cr' + i} position={[Math.sin(a) * P.headR * 0.52, P.headR * 0.08, Math.cos(a) * P.headR * 0.52]}>
                            <mesh geometry={taperGeo(P.headR * 0.07, P.headR * 0.015, P.headR * 0.32)} material={elTrim}
                              position={[0, P.headR * 0.16, 0]} />
                          </group>
                        )
                      })}
                      {/* glowing gem on the crown */}
                      <mesh geometry={sphereGeo(1)} material={elGemRed} scale={[P.headR * 0.12, P.headR * 0.12, P.headR * 0.12]}
                        position={[0, P.headR * 0.22, 0]} />
                    </group>
                  </group>
`,
  'royal crown'
)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log(`Applied ${applied} fantasy upgrades`)
