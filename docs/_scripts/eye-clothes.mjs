// Eye + clothes upgrade for the elephant:
// 1) Re-splice the head (upgraded eyes + eyelid caps)
// 2) Navy short sleeves with gold cuff rings on the elephant arms
// 3) Subtle placket strip down the shirt front
import { readFileSync, writeFileSync } from 'node:fs'

const RIG = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const NEW_HEAD = 'C:/Users/taksh/studyforest/docs/_scripts/newElephantHead.txt'

const src = readFileSync(RIG, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

function rawIdxOf(normIdx) {
  return normIdx + (isCrlf ? (norm.slice(0, normIdx).match(/\n/g) || []).length : 0)
}
function toRaw(str) {
  return isCrlf ? str.replace(/\n/g, '\r\n') : str
}

const edits = []
function replaceOne(oldStr, newStr, label) {
  const idx = norm.indexOf(oldStr)
  if (idx === -1) { console.error(`[${label}] PATTERN NOT FOUND`); process.exit(1) }
  if (norm.indexOf(oldStr, idx + oldStr.length) !== -1) { console.error(`[${label}] NOT UNIQUE`); process.exit(1) }
  edits.push({ rawIdx: rawIdxOf(idx), rawLen: toRaw(oldStr).length, rawNew: toRaw(newStr) })
  console.log(`[${label}] patched`)
}

// ---- 1) Head splice ----
const startMarker = '/* ================================================ ELEPHANT HEAD'
const endMarker = '/* ================================================ MONKEY HEAD'
const s = norm.indexOf(startMarker)
const e = norm.indexOf(endMarker)
if (s === -1 || e === -1 || e <= s) { console.error('head markers missing'); process.exit(1) }
const newHead = readFileSync(NEW_HEAD, 'utf8').replace(/\r\n/g, '\n').trimEnd()
edits.push({
  rawIdx: rawIdxOf(s),
  rawLen: rawIdxOf(e) - rawIdxOf(s),
  rawNew: toRaw(newHead + '\n\n'),
})
console.log('[head] spliced')

// ---- 2) Navy short sleeves + gold cuffs on the elephant upper arms ----
replaceOne(
  `      {isElephant ? (
        <mesh geometry={latheGeo([
          [eArmElbowR, -P.upperArm * eArmY],
          [eArmElbowR * 1.08, -P.upperArm * 0.7 * eArmY],
          [eArmTopR * 0.92, -P.upperArm * 0.4 * eArmY],
          [eArmTopR, -P.upperArm * 0.12 * eArmY],
          [eArmTopR * 0.95, P.upperArm * 0.08 * eArmY],
          [eArmTopR * 0.5, P.upperArm * 0.18 * eArmY],
          [eArmTopR * 0.18, P.upperArm * 0.24 * eArmY],
        ])} material={armM} castShadow />
      ) : (`,
  `      {isElephant ? (
        <>
          {/* Short navy sleeve over the shoulder — matches the shirt */}
          <mesh geometry={latheGeo([
            [eArmElbowR * 1.04, -P.upperArm * 0.42 * eArmY],
            [eArmTopR * 0.94, -P.upperArm * 0.25 * eArmY],
            [eArmTopR, -P.upperArm * 0.08 * eArmY],
            [eArmTopR * 0.95, P.upperArm * 0.1 * eArmY],
            [eArmTopR * 0.5, P.upperArm * 0.2 * eArmY],
            [eArmTopR * 0.18, P.upperArm * 0.24 * eArmY],
          ])} material={topM} castShadow />
          {/* Gold cuff ring at the sleeve hem */}
          <mesh geometry={torusGeo(eArmElbowR * 1.06, eArmElbowR * 0.035, 8, 20)} material={sharedMaterial('#D4AF37', 0.3, 0.65)}
            position={[0, -P.upperArm * 0.42 * eArmY, P.wristR * 0.4]} rotation={[Math.PI / 2, 0, 0]} />
          {/* Bare grey forearm below the sleeve */}
          <mesh geometry={latheGeo([
            [eArmElbowR, -P.upperArm * eArmY],
            [eArmElbowR * 1.04, -P.upperArm * 0.42 * eArmY],
          ])} material={armM} castShadow />
        </>
      ) : (`,
  'arm sleeves',
)

// ---- 3) Placket strip down the shirt front (before the pendant) ----
// eslint-disable-next-line no-template-curly-in-string
const btnKey = 'key={\u0060btn\u0024{i}\u0060}'
replaceOne(
  `              {/* Buttons — 3 gold studs down the shirt front */}
              {[0.35, 0.55, 0.75].map((t, i) => (
                <mesh ${btnKey} geometry={sphereGeo(1)} material={elTrim}
                  scale={[P.neckR * 0.28, P.neckR * 0.28, P.neckR * 0.14]}
                  position={[0, P.spineLen + P.chestLen * t, P.torsoD * 1.55]} />
              ))}

              {/* Pendant — gold chain + rectangular tag */}`,
  `              {/* Buttons — 3 gold studs down the shirt front */}
              {[0.35, 0.55, 0.75].map((t, i) => (
                <mesh ${btnKey} geometry={sphereGeo(1)} material={elTrim}
                  scale={[P.neckR * 0.28, P.neckR * 0.28, P.neckR * 0.14]}
                  position={[0, P.spineLen + P.chestLen * t, P.torsoD * 1.55]} />
              ))}
              {/* Subtle placket — slightly lighter navy strip down the shirt front */}
              <mesh geometry={boxGeo(P.chestW * 0.14, P.chestLen * 1.15, P.torsoD * 0.02)}
                material={sharedMaterial('#2a3d78', 0.85)}
                position={[0, P.spineLen + P.chestLen * 0.42, P.torsoD * 1.5]} />

              {/* Pendant — gold chain + rectangular tag */}`,
  'shirt placket',
)

// apply in descending rawIdx order
edits.sort((a, b) => b.rawIdx - a.rawIdx)
let out = src
for (const ed of edits) {
  out = out.slice(0, ed.rawIdx) + ed.rawNew + out.slice(ed.rawIdx + ed.rawLen)
}
writeFileSync(RIG, out, 'utf8')
console.log(`DONE: ${edits.length} edit(s) applied`)
