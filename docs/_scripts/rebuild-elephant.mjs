// Rebuild the elephant character in the studyforest AvatarRig.tsx.
// CRLF-aware. Splices a new ElephantHead + patches arm/leg/hand geometry.
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
function replaceOne(oldStr, newStr, label, { optional = false } = {}) {
  const idx = norm.indexOf(oldStr)
  if (idx === -1) {
    if (optional) { console.log(`[${label}] (not found, skipped)`); return }
    console.error(`[${label}] PATTERN NOT FOUND`)
    process.exit(1)
  }
  if (norm.indexOf(oldStr, idx + oldStr.length) !== -1) {
    console.error(`[${label}] PATTERN NOT UNIQUE`)
    process.exit(1)
  }
  const rawIdx = rawIdxOf(idx)
  const rawLen = toRaw(oldStr).length
  return { rawIdx, rawLen, rawNew: toRaw(newStr) }
}
function apply(edits, file) {
  let out = file
  // apply in descending rawIdx order so earlier indices stay valid
  edits.sort((a, b) => b.rawIdx - a.rawIdx)
  for (const e of edits) {
    out = out.slice(0, e.rawIdx) + e.rawNew + out.slice(e.rawIdx + e.rawLen)
  }
  return out
}

const edits = []

// ---- 1) Splice in the new ElephantHead between the section markers ----
const startMarker = '/* ================================================ ELEPHANT HEAD'
const endMarker = '/* ================================================ MONKEY HEAD'
const startIdx = norm.indexOf(startMarker)
const endIdx = norm.indexOf(endMarker)
if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  console.error('ELEPHANT HEAD markers not found')
  process.exit(1)
}
const newHead = readFileSync(NEW_HEAD, 'utf8').replace(/\r\n/g, '\n').trimEnd()
const rawStart = rawIdxOf(startIdx)
const rawEnd = rawIdxOf(endIdx)
edits.push({
  rawIdx: rawStart,
  rawLen: rawEnd - rawStart,
  rawNew: toRaw(newHead + '\n\n'),
})
console.log('[head] spliced')

// ---- 2) Head mount: drop the tilt ----
edits.push({ ...replaceOne(
  `<group scale={1.24} rotation={[0, 0, 0.06]}>`,
  `<group scale={1.24}>`,
  'head mount',
) })

// ---- 3) Arm upper column: smooth profile ----
edits.push({ ...replaceOne(
  `        <mesh geometry={latheGeo([
          [eArmElbowR, -P.upperArm * eArmY],
          [eArmElbowR * 1.12, -P.upperArm * 0.7 * eArmY],
          [eArmTopR, -P.upperArm * 0.35 * eArmY],
          [eArmTopR * 1.05, -P.upperArm * 0.1 * eArmY],
          [eArmTopR * 0.8, P.upperArm * 0.12 * eArmY],
          [eArmTopR * 0.3, P.upperArm * 0.24 * eArmY],
        ])} material={armM} castShadow />`,
  `        <mesh geometry={latheGeo([
          [eArmElbowR, -P.upperArm * eArmY],
          [eArmElbowR * 1.08, -P.upperArm * 0.7 * eArmY],
          [eArmTopR * 0.92, -P.upperArm * 0.4 * eArmY],
          [eArmTopR, -P.upperArm * 0.12 * eArmY],
          [eArmTopR * 0.95, P.upperArm * 0.08 * eArmY],
          [eArmTopR * 0.5, P.upperArm * 0.18 * eArmY],
          [eArmTopR * 0.18, P.upperArm * 0.24 * eArmY],
        ])} material={armM} castShadow />`,
  'arm upper',
) })

// ---- 4) Arm forearm column: smooth taper ----
edits.push({ ...replaceOne(
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 1.12, -P.lowerArm * 0.7 * eArmY],
            [eArmWristR * 1.5, -P.lowerArm * 0.4 * eArmY],
            [eArmWristR * 1.35, -P.lowerArm * 0.15 * eArmY],
            [eArmWristR * 1.2, 0],
          ])} material={skin} castShadow />`,
  `          <mesh geometry={latheGeo([
            [eArmElbowR, -P.lowerArm * eArmY],
            [eArmElbowR * 1.06, -P.lowerArm * 0.65 * eArmY],
            [eArmWristR * 1.45, -P.lowerArm * 0.38 * eArmY],
            [eArmWristR * 1.3, -P.lowerArm * 0.15 * eArmY],
            [eArmWristR * 1.22, 0],
          ])} material={skin} castShadow />`,
  'arm forearm',
) })

// ---- 5) Remove the elephant elbow fold ring ----
edits.push({ ...replaceOne(
  `        {/* Elephant: subtle dark elbow fold ring */}
        {isElephant && (
          <mesh geometry={torusGeo(eArmElbowR * 1.06, eArmElbowR * 0.045, 8, 20)} material={sharedMaterial('#6e7378', 0.6)}
            position={[0, -P.lowerArm * eArmY * 0.05, P.wristR * 0.5]} rotation={[Math.PI / 2, 0, 0]} />
        )}
`,
  ``,
  'arm elbow ring',
) })

// ---- 6) Elephant hand: paw with stub toes instead of glove fingers ----
edits.push({ ...replaceOne(
  `          <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * (isElephant ? 0.4 : 0.26), P.wristR * (isElephant ? 0.4 : 0.26), P.wristR * (isElephant ? 0.4 : 0.26)]} position={[P.wristR * (isElephant ? 1.2 : 0.88), -P.handLen * 0.12, P.wristR * (isElephant ? 0.35 : 0.26)]} />
          {[-P.wristR * 0.55, -P.wristR * 0.18, P.wristR * 0.18, P.wristR * 0.5].map((fx, i) => (
            <group key={i} position={[fx, -P.handLen * 0.45, 0]}>
              <mesh geometry={taperGeo(P.wristR * (isElephant ? 0.3 : 0.12), P.wristR * (isElephant ? 0.2 : 0.08), P.handLen * (isElephant ? 0.32 : 0.28 - i * 0.02))} material={gloveM} position={[0, -P.handLen * 0.12, 0]} />
              <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * (isElephant ? 0.2 : 0.08), P.wristR * (isElephant ? 0.2 : 0.08), P.wristR * (isElephant ? 0.2 : 0.08)]} position={[0, -P.handLen * (isElephant ? 0.3 : 0.26 - i * 0.02), 0]} />
              {/* dino claw tip */}
              {isDino && (
                <mesh geometry={taperGeo(P.wristR * 0.005, P.wristR * 0.09, P.handLen * 0.16)} material={clawM ?? skin} position={[0, -P.handLen * (0.32 - i * 0.02), P.wristR * 0.04]} rotation={[0.5, 0, 0]} />
              )}
            </group>
          ))}`,
  `          <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * (isElephant ? 0.4 : 0.26), P.wristR * (isElephant ? 0.4 : 0.26), P.wristR * (isElephant ? 0.4 : 0.26)]} position={[P.wristR * (isElephant ? 1.2 : 0.88), -P.handLen * 0.12, P.wristR * (isElephant ? 0.35 : 0.26)]} />
          {isElephant ? (
            /* Elephant paw — smooth rounded mitt with three tiny stub toes */
            <>
              {[-P.wristR * 0.45, 0, P.wristR * 0.45].map((tx, i) => (
                <mesh key={'pt' + i} geometry={sphereGeo(1)} material={gloveM}
                  scale={[P.wristR * 0.34, P.wristR * 0.3, P.wristR * 0.3]}
                  position={[tx, -P.handLen * 0.38, P.wristR * 0.5]} />
              ))}
            </>
          ) : (
            [-P.wristR * 0.55, -P.wristR * 0.18, P.wristR * 0.18, P.wristR * 0.5].map((fx, i) => (
              <group key={i} position={[fx, -P.handLen * 0.45, 0]}>
                <mesh geometry={taperGeo(P.wristR * 0.12, P.wristR * 0.08, P.handLen * (0.28 - i * 0.02))} material={gloveM} position={[0, -P.handLen * 0.12, 0]} />
                <mesh geometry={sphereGeo(1)} material={gloveM} scale={[P.wristR * 0.08, P.wristR * 0.08, P.wristR * 0.08]} position={[0, -P.handLen * (0.26 - i * 0.02), 0]} />
                {/* dino claw tip */}
                {isDino && (
                  <mesh geometry={taperGeo(P.wristR * 0.005, P.wristR * 0.09, P.handLen * 0.16)} material={clawM ?? skin} position={[0, -P.handLen * (0.32 - i * 0.02), P.wristR * 0.04]} rotation={[0.5, 0, 0]} />
                )}
              </group>
            ))
          )}`,
  'hand paw',
) })

// ---- 7) Remove elephant shin wrinkle rings (they read as springs) ----
edits.push({ ...replaceOne(
  `            {/* Elephant knee + shin skin folds — subtle dark wrinkle rings */}
            <mesh geometry={torusGeo(eKneeR * 1.03, eKneeR * 0.035, 8, 24)} material={shoeM}
              position={[0, -P.lowerLeg * eLegY * 0.05, P.ankleR * 0.6]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={torusGeo(eKneeR * 0.96, eKneeR * 0.028, 8, 24)} material={shoeM}
              position={[0, -P.lowerLeg * eLegY * 0.3, P.ankleR * 0.55]} rotation={[Math.PI / 2, 0, 0]} />
`,
  ``,
  'leg shin rings',
) })

const out = apply(edits, src)
writeFileSync(RIG, out, 'utf8')
console.log(`DONE: ${edits.length} edit(s) applied`)
