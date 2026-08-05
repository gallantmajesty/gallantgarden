// Legendary long robe for the elephant.
// 1) Add glowing gold material
// 2) Remove the old chest pendant (would poke through the robe)
// 3) Add the long navy robe with gold trim in the elephant tail block
import { readFileSync, writeFileSync } from 'node:fs'

const RIG = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'

const src = readFileSync(RIG, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

function rawIdxOf(i) {
  return i + (isCrlf ? (norm.slice(0, i).match(/\n/g) || []).length : 0)
}
function toRaw(s) {
  return isCrlf ? s.replace(/\n/g, '\r\n') : s
}

const edits = []
function replaceOne(oldStr, newStr, label) {
  const idx = norm.indexOf(oldStr)
  if (idx === -1) { console.error(`[${label}] PATTERN NOT FOUND`); process.exit(1) }
  if (norm.indexOf(oldStr, idx + oldStr.length) !== -1) { console.error(`[${label}] NOT UNIQUE`); process.exit(1) }
  edits.push({ rawIdx: rawIdxOf(idx), rawLen: toRaw(oldStr).length, rawNew: toRaw(newStr) })
  console.log(`[${label}] patched`)
}

// 1) Glowing gold material
replaceOne(
  `  const elGlassLens = new MeshStandardMaterial({ color: '#e8eef8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false })`,
  `  const elGlassLens = new MeshStandardMaterial({ color: '#e8eef8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false })
  const elGlowGold = glowMaterial('#ffd766', 1.0)`,
  'glow gold material',
)

// 2) Remove the old chest pendant (hidden/poking under the robe)
replaceOne(
  `              {/* Pendant — gold chain + rectangular tag */}
              <mesh geometry={torusGeo(P.neckR * 1.45, P.neckR * 0.09, 8, 20)} material={elTrim}
                position={[0, P.spineLen + P.chestLen * 0.85, P.torsoD * 1.7]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={boxGeo(P.neckR * 0.7, P.neckR * 0.9, P.torsoD * 0.03)} material={elTrim}
                position={[0, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.75]} />
`,
  ``,
  'remove pendant',
)

// 3) Legendary long robe
replaceOne(
  `        {isElephant && (
          <group>
            {/* Tail — rooted on lower back rump, angled clearly outward and down so it's always visible */}`,
  `        {isElephant && (
          <group>
            {/* Legendary long robe — full-length navy robe with gold trim and a glowing hem */}
            <group>
              {/* Robe body — A-line from the neck down to the calves */}
              <mesh geometry={latheGeo([
                [P.hipBoneW * 1.35, -0.31],
                [P.hipBoneW * 1.32, -0.18],
                [P.hipBoneW * 1.28, -0.04],
                [P.waistW * 1.28, 0.1],
                [P.chestW * 1.16, 0.22],
                [P.chestW * 1.1, 0.31],
                [P.neckR * 2.4, 0.35],
              ])} material={elNavy} position={[0, 0, 0]} castShadow />

              {/* Glowing gold hem band + a second gold trim above it */}
              <mesh geometry={torusGeo(P.hipBoneW * 1.35, P.hipBoneW * 0.07, 8, 28)} material={elGlowGold}
                position={[0, -0.31, 0]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={torusGeo(P.hipBoneW * 1.3, P.hipBoneW * 0.045, 8, 24)} material={elTrim}
                position={[0, -0.19, 0]} rotation={[Math.PI / 2, 0, 0]} />

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

              {/* Gold front placket down the robe centre */}
              <mesh geometry={boxGeo(P.chestW * 0.16, 0.5, P.torsoD * 0.03)} material={elTrim}
                position={[0, -0.12, P.torsoD * 1.42]} />
            </group>

            {/* Tail — rooted on lower back rump, angled clearly outward and down so it's always visible */}`,
  'legendary robe',
)

edits.sort((a, b) => b.rawIdx - a.rawIdx)
let out = src
for (const e of edits) out = out.slice(0, e.rawIdx) + e.rawNew + out.slice(e.rawIdx + e.rawLen)
writeFileSync(RIG, out, 'utf8')
console.log(`DONE: ${edits.length} edit(s) applied`)
