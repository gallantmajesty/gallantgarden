// Refine the elephant to match the Pixar reference:
// 1) Splice refined ElephantHead (simpler trunk, rounder ears, brow bumps, no tuft)
// 2) Elephant hand: four chubby stubby fingers (was a paw with 3 toes)
// 3) Elephant feet: five round bulbous toes (was spike toenails)
// 4) Elephant leg: subtle natural skin fold above the ankle
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
  if (norm.indexOf(oldStr, idx + oldStr.length) !== -1) { console.error(`[${label}] PATTERN NOT UNIQUE`); process.exit(1) }
  const rawIdx = rawIdxOf(idx)
  const rawLen = toRaw(oldStr).length
  edits.push({ rawIdx, rawLen, rawNew: toRaw(newStr) })
  console.log(`[${label}] patched`)
}

// ---- 1) Head splice ----
const startMarker = '/* ================================================ ELEPHANT HEAD'
const endMarker = '/* ================================================ MONKEY HEAD'
const startIdx = norm.indexOf(startMarker)
const endIdx = norm.indexOf(endMarker)
if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  console.error('ELEPHANT HEAD markers not found')
  process.exit(1)
}
const newHead = readFileSync(NEW_HEAD, 'utf8').replace(/\r\n/g, '\n').trimEnd()
edits.push({
  rawIdx: rawIdxOf(startIdx),
  rawLen: rawIdxOf(endIdx) - rawIdxOf(startIdx),
  rawNew: toRaw(newHead + '\n\n'),
})
console.log('[head] spliced')

// ---- 2) Hand: four chubby stubby fingers ----
replaceOne(
  `          {isElephant ? (
            /* Elephant paw — smooth rounded mitt with three tiny stub toes */
            <>
              {[-P.wristR * 0.45, 0, P.wristR * 0.45].map((tx, i) => (
                <mesh key={'pt' + i} geometry={sphereGeo(1)} material={gloveM}
                  scale={[P.wristR * 0.34, P.wristR * 0.3, P.wristR * 0.3]}
                  position={[tx, -P.handLen * 0.38, P.wristR * 0.5]} />
              ))}
            </>
          ) : (`,
  `          {isElephant ? (
            /* Elephant hand — four chubby stubby fingers in a row */
            <>
              {[-P.wristR * 0.6, -P.wristR * 0.2, P.wristR * 0.2, P.wristR * 0.6].map((fx, i) => (
                <group key={'pf' + i} position={[fx, -P.handLen * 0.4, P.wristR * 0.18]}>
                  <mesh geometry={taperGeo(P.wristR * 0.28, P.wristR * 0.18, P.handLen * 0.3)} material={gloveM} position={[0, -P.handLen * 0.1, 0]} castShadow />
                  <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.25, P.wristR * 0.23, P.wristR * 0.25]} position={[0, -P.handLen * 0.28, 0]} />
                </group>
              ))}
            </>
          ) : (`,
  'hand fingers',
)

// ---- 3) Feet: five round bulbous toes ----
replaceOne(
  `              {/* 5 prominent ivory toenails on the pad's front arc */}
              {[-P.ankleR * 1.1, -P.ankleR * 0.55, 0, P.ankleR * 0.55, P.ankleR * 1.1].map((tx, i) => (
                <mesh key={i} geometry={taperGeo(P.ankleR * 0.16, P.ankleR * 0.06, P.ankleR * 0.4)} material={shoeAccent}
                  position={[tx, -P.ankleR * 0.5, P.ankleR * 2.7]}
                  rotation={[0.5, 0, tx * 0.035]} />
              ))}
              {/* Toenail tops — rounded cap for each */}
              {[-P.ankleR * 1.1, -P.ankleR * 0.55, 0, P.ankleR * 0.55, P.ankleR * 1.1].map((tx, i) => (
                <mesh key={\u0060tn\${i}\u0060} geometry={sphereGeo(1)} material={shoeAccent}
                  scale={[P.ankleR * 0.15, P.ankleR * 0.11, P.ankleR * 0.15]}
                  position={[tx, -P.ankleR * 0.4, P.ankleR * 3.0]} />
              ))}`,
  `              {/* 5 round bulbous toes poking out the front of the pad */}
              {[-P.ankleR * 1.15, -P.ankleR * 0.58, 0, P.ankleR * 0.58, P.ankleR * 1.15].map((tx, i) => (
                <group key={'toe' + i} position={[tx, -P.ankleR * 0.55, P.ankleR * 2.5]}>
                  <mesh geometry={sphereGeo(1)} material={botM}
                    scale={[P.ankleR * 0.42, P.ankleR * 0.38, P.ankleR * 0.4]} castShadow />
                  {/* soft ivory nail on each toe tip */}
                  <mesh geometry={sphereGeo(1)} material={shoeAccent}
                    scale={[P.ankleR * 0.17, P.ankleR * 0.12, P.ankleR * 0.15]}
                    position={[0, P.ankleR * 0.28, P.ankleR * 0.3]} />
                </group>
              ))}`,
  'foot toes',
)

// ---- 4) Leg: subtle natural skin fold above the ankle ----
replaceOne(
  `              [eKneeR * 1.02, -P.lowerLeg * 0.25 * eLegY],
              [eKneeR, 0],
            ])} material={calfMat} castShadow />
          </>`,
  `              [eKneeR * 1.02, -P.lowerLeg * 0.25 * eLegY],
              [eKneeR, 0],
            ])} material={calfMat} castShadow />
            {/* Natural skin fold just above the ankle — subtle, not a ring band */}
            <mesh geometry={torusGeo(eAnkleR * 1.06, eAnkleR * 0.028, 8, 24)} material={shoeM}
              position={[0, -P.lowerLeg * eLegY * 0.86, P.ankleR * 0.5]} rotation={[Math.PI / 2, 0, 0]} />
          </>`,
  'ankle fold',
)

// apply in descending rawIdx order
edits.sort((a, b) => b.rawIdx - a.rawIdx)
let out = src
for (const e of edits) {
  out = out.slice(0, e.rawIdx) + e.rawNew + out.slice(e.rawIdx + e.rawLen)
}
writeFileSync(RIG, out, 'utf8')
console.log(`DONE: ${edits.length} edit(s) applied`)
