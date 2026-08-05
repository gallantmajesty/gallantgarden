// Apply the appearance upgrade list to the elephant character.
// Edits: BackSide import, materials (glossy glasses/gold, soft cheeks), grain +
// fabric textures, head/body ratio, name badge + belt stitching, head splice,
// harness rim light (preview only).
import { readFileSync, writeFileSync } from 'node:fs'

const RIG = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const HARNESS = 'C:/Users/taksh/studyforest/src/screens/ShotHarness.tsx'
const NEW_HEAD = 'C:/Users/taksh/studyforest/docs/_scripts/newElephantHead.txt'

function load(file) {
  const src = readFileSync(file, 'utf8')
  return { src, isCrlf: src.includes('\r\n'), norm: src.replace(/\r\n/g, '\n') }
}
function rawIdxOf(norm, normIdx, isCrlf) {
  return normIdx + (isCrlf ? (norm.slice(0, normIdx).match(/\n/g) || []).length : 0)
}
function toRaw(str, isCrlf) {
  return isCrlf ? str.replace(/\n/g, '\r\n') : str
}

function makePatcher(file) {
  const { src, isCrlf, norm } = load(file)
  const edits = []
  const replaceOne = (oldStr, newStr, label) => {
    const idx = norm.indexOf(oldStr)
    if (idx === -1) { console.error(`[${file}] [${label}] PATTERN NOT FOUND`); process.exit(1) }
    if (norm.indexOf(oldStr, idx + oldStr.length) !== -1) { console.error(`[${file}] [${label}] NOT UNIQUE`); process.exit(1) }
    edits.push({ rawIdx: rawIdxOf(norm, idx, isCrlf), rawLen: toRaw(oldStr, isCrlf).length, rawNew: toRaw(newStr, isCrlf) })
    console.log(`[${label}] patched`)
  }
  const splice = (startMarker, endMarker, newText, label) => {
    const s = norm.indexOf(startMarker)
    const e = norm.indexOf(endMarker)
    if (s === -1 || e === -1 || e <= s) { console.error(`[${label}] markers not found`); process.exit(1) }
    edits.push({
      rawIdx: rawIdxOf(norm, s, isCrlf),
      rawLen: rawIdxOf(norm, e, isCrlf) - rawIdxOf(norm, s, isCrlf),
      rawNew: toRaw(newText, isCrlf),
    })
    console.log(`[${label}] spliced`)
  }
  const apply = () => {
    edits.sort((a, b) => b.rawIdx - a.rawIdx)
    let out = src
    for (const e of edits) out = out.slice(0, e.rawIdx) + e.rawNew + out.slice(e.rawIdx + e.rawLen)
    writeFileSync(file, out, 'utf8')
    console.log(`${file}: ${edits.length} edit(s) written`)
  }
  return { replaceOne, splice, apply }
}

const rig = makePatcher(RIG)

// 1) BackSide import
rig.replaceOne(
  `Vector3, DoubleSide, PointsMaterial`,
  `Vector3, DoubleSide, BackSide, PointsMaterial`,
  'BackSide import',
)

// 2) Materials — soft cheeks, glossy gold trim, glossy metallic glasses
rig.replaceOne(
  `  const elCheek = sharedMaterial('#f48fb0', 0.55)
  const elNavy = sharedMaterial('#1B2B5A', 0.78)
  const elTrim = sharedMaterial('#D4AF37', 0.35, 0.5)
  const elGlasses = sharedMaterial('#2a2a2e', 0.3, 0.4)
  const elGlassLens = new MeshStandardMaterial({ color: '#dfe8f5', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false })`,
  `  const elCheek = sharedMaterial('#f2a0b0', 0.5)
  const elNavy = sharedMaterial('#1B2B5A', 0.78)
  const elTrim = sharedMaterial('#D4AF37', 0.3, 0.65)
  const elGlasses = sharedMaterial('#17171d', 0.22, 0.62)
  const elGlassLens = new MeshStandardMaterial({ color: '#e8eef8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false })`,
  'materials',
)

// 3) Elephant textures — stronger grain + soft fabric weave on the shirt
rig.replaceOne(
  `  // Elephant: subtle wrinkle/fold texture for organic skin feel
  if (isElephant) {
    const elSkinTex = skinReliefTex()
    elMain.bumpMap = elSkinTex
    elMain.bumpScale = 0.03
    elMain.roughness = 0.7
    elDark.roughness = 0.65
    elBelly.roughness = 0.75
  }`,
  `  // Elephant: light grain texture for organic skin + soft fabric grain on the shirt
  if (isElephant) {
    const elSkinTex = skinReliefTex()
    elMain.bumpMap = elSkinTex
    elMain.bumpScale = 0.045
    elMain.roughnessMap = elSkinTex
    elMain.roughness = 0.72
    elDark.bumpMap = elSkinTex
    elDark.bumpScale = 0.04
    elDark.roughnessMap = elSkinTex
    elDark.roughness = 0.7
    elBelly.roughness = 0.78
    elNavy.bumpMap = elSkinTex
    elNavy.bumpScale = 0.05
    elNavy.roughnessMap = elSkinTex
    elNavy.roughness = 0.9
  }`,
  'skin grain + fabric',
)

// 4) Head/body ratio — slightly smaller head
rig.replaceOne(
  `                  <group scale={1.24}>`,
  `                  <group scale={1.14}>`,
  'head scale',
)

// 5) Torso — name badge + belt stitching
rig.replaceOne(
  `              {/* Pendant — gold chain + rectangular tag */}
              <mesh geometry={torusGeo(P.neckR * 1.45, P.neckR * 0.09, 8, 20)} material={elTrim}
                position={[0, P.spineLen + P.chestLen * 0.85, P.torsoD * 1.7]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={boxGeo(P.neckR * 0.7, P.neckR * 0.9, P.torsoD * 0.03)} material={elTrim}
                position={[0, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.75]} />
            </>`,
  `              {/* Pendant — gold chain + rectangular tag */}
              <mesh geometry={torusGeo(P.neckR * 1.45, P.neckR * 0.09, 8, 20)} material={elTrim}
                position={[0, P.spineLen + P.chestLen * 0.85, P.torsoD * 1.7]} rotation={[Math.PI / 2, 0, 0]} />
              <mesh geometry={boxGeo(P.neckR * 0.7, P.neckR * 0.9, P.torsoD * 0.03)} material={elTrim}
                position={[0, P.spineLen + P.chestLen * 0.5, P.torsoD * 1.75]} />

              {/* Name badge — small cream tag with a gold pin on the left chest */}
              <mesh geometry={boxGeo(P.chestW * 0.34, P.chestW * 0.24, P.torsoD * 0.05)} material={sharedMaterial('#f5f2ea', 0.85)}
                position={[-P.chestW * 0.42, P.spineLen + P.chestLen * 0.7, P.torsoD * 1.38]} />
              <mesh geometry={sphereGeo(1)} material={elTrim} scale={[P.chestW * 0.06, P.chestW * 0.06, P.chestW * 0.03]}
                position={[-P.chestW * 0.42, P.spineLen + P.chestLen * 0.52, P.torsoD * 1.41]} />

              {/* Stitching — small dark dashes along the gold belt */}
              {[-0.9, -0.5, -0.1, 0.3, 0.7].map((t, i) => (
                <mesh key={'st' + i} geometry={boxGeo(P.waistW * 0.03, P.waistW * 0.05, P.torsoD * 0.02)}
                  material={sharedMaterial('#7a5f18', 0.45)}
                  position={[t * P.waistW * 0.85, P.spineLen * 0.55, P.torsoD * 1.32]} rotation={[0, 0, 0.6]} />
              ))}
            </>`,
  'badge + stitching',
)

// 6) Head splice
const newHead = readFileSync(NEW_HEAD, 'utf8').replace(/\r\n/g, '\n').trimEnd()
rig.splice(
  '/* ================================================ ELEPHANT HEAD',
  '/* ================================================ MONKEY HEAD',
  newHead + '\n\n',
  'head',
)
rig.apply()

// 7) Harness rim light (temporary preview tooling)
const harness = makePatcher(HARNESS)
harness.replaceOne(
  `        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#9a8cff" />`,
  `        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#9a8cff" />
        <directionalLight position={[0, 2.5, -4]} intensity={0.8} color="#7fa8ff" />`,
  'harness rim light',
)
harness.apply()
