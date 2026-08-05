// Premium robe upgrades: gold collar band at the neck, a glowing gold chest
// emblem, and gold shoulder epaulettes, inserted into the elephant robe group.
// CRLF-aware: normalize to \n, splice, convert back if the file was CRLF.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

const robeAnchor = `              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.35, -0.31],
                [P.hipBoneW * 1.32, -0.18],
                [P.hipBoneW * 1.28, -0.04],
                [P.waistW * 1.28, 0.1],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />

              {/* Glowing gold hem band + a second gold trim above it */}`

if (!norm.includes(robeAnchor)) {
  // Already applied previously (anchor moved) or never present.
  if (norm.includes('Gold collar band')) {
    console.log('Robe upgrades already applied — skipping')
    process.exit(0)
  }
  console.error('ROBE ANCHOR NOT FOUND')
  process.exit(1)
}

const robeInsert = `              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.35, -0.31],
                [P.hipBoneW * 1.32, -0.18],
                [P.hipBoneW * 1.28, -0.04],
                [P.waistW * 1.28, 0.1],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />

              {/* Gold collar band — wraps the robe neckline */}
              <mesh geometry={torusGeo(P.neckR * 2.62, P.neckR * 0.11, 8, 26)} material={elTrim}
                position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]} />

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

              {/* Glowing gold hem band + a second gold trim above it */}`

const out = norm.replace(robeAnchor, robeInsert)
writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Robe upgrades applied')
