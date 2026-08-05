import { readFileSync, writeFileSync } from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const raw = readFileSync(FILE, 'utf8')
const crlf = raw.includes('\r\n')
// Normalize line endings so multi-line anchors match, then restore the file's EOL.
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

// 1. Head scale — balance head vs body (slightly less dominant)
replace(
  `                ) : isElephant ? (
                  <group scale={1.14}>`,
  `                ) : isElephant ? (
                  <group scale={1.06}>`,
  'head scale 1.14 -> 1.06'
)

// 2. Trunk — gentler bow and softer tip curl (no geometry rings)
replace(
  `      new Vector3(0, -r * 0.05, r * 1.12),
      new Vector3(0, -r * 0.4, r * 1.26),
      new Vector3(0, -r * 0.75, r * 1.28),
      new Vector3(0, -r * 1.0, r * 1.2),
      new Vector3(0, -r * 1.15, r * 1.06),
      new Vector3(0, -r * 1.2, r * 0.96),`,
  `      new Vector3(0, -r * 0.05, r * 1.12),
      new Vector3(0, -r * 0.4, r * 1.24),
      new Vector3(0, -r * 0.75, r * 1.24),
      new Vector3(0, -r * 1.0, r * 1.16),
      new Vector3(0, -r * 1.15, r * 1.06),
      new Vector3(0, -r * 1.2, r * 1.0),`,
  'trunk curve softened'
)

replace(
  `    const baseR = r * 0.25
    const taperRate = 0.52`,
  `    const baseR = r * 0.235
    const taperRate = 0.5`,
  'trunk taper slimmer'
)

// 3. Glasses — thinner, glossy dark-metallic frames
replace(
  `  const elGlasses = sharedMaterial('#17171d', 0.22, 0.62)`,
  `  const elGlasses = sharedMaterial('#2a2f3a', 0.16, 0.92)`,
  'glasses material metallic glossy'
)

replace(
  `            <mesh geometry={torusGeo(r * 0.39, r * 0.024, 8, 24)} material={glasses ?? sharedMaterial('#17171d', 0.18, 0.7)} rotation={[0.1, sx * 0.08, 0]} />`,
  `            <mesh geometry={torusGeo(r * 0.39, r * 0.017, 8, 24)} material={glasses ?? sharedMaterial('#2a2f3a', 0.16, 0.92)} rotation={[0.1, sx * 0.08, 0]} />`,
  'glasses frame thinner'
)

replace(
  `        <mesh geometry={boxGeo(r * 0.2, r * 0.028, r * 0.022)} material={glasses ?? sharedMaterial('#17171d', 0.18, 0.7)}`,
  `        <mesh geometry={boxGeo(r * 0.2, r * 0.02, r * 0.018)} material={glasses ?? sharedMaterial('#2a2f3a', 0.16, 0.92)}`,
  'glasses bridge thinner'
)

// 4. Gold trim — brighter, higher metallic shine (buttons, buckle, badge pin)
replace(
  `  const elTrim = sharedMaterial('#D4AF37', 0.3, 0.65)`,
  `  const elTrim = sharedMaterial('#F2C14E', 0.2, 0.9)`,
  'gold trim metallic shine'
)

// 5. Navy fabric — richer grain so the uniform doesn't look flat
replace(
  `  const elNavy = sharedMaterial('#1B2B5A', 0.78)`,
  `  const elNavy = sharedMaterial('#1B2B5A', 0.82)`,
  'navy roughness up'
)

replace(
  `    elNavy.bumpMap = elSkinTex
    elNavy.bumpScale = 0.05
    elNavy.roughnessMap = elSkinTex
    elNavy.roughness = 0.9`,
  `    elNavy.bumpMap = elSkinTex
    elNavy.bumpScale = 0.085
    elNavy.roughnessMap = elSkinTex
    elNavy.roughness = 0.94`,
  'navy fabric grain deeper'
)

// 6. Under-eye creases — subtle soft shading for depth
replace(
  `      {[-1, 1].map((sx) => (
        <mesh key={\`brow\${sx}\`} geometry={sphereGeo(1)} material={main}
          scale={[r * 0.15, r * 0.09, r * 0.12]} position={[sx * r * 0.4, r * 0.49, r * 1.08]} />
      ))}

      {/* Round glasses`,
  `      {[-1, 1].map((sx) => (
        <mesh key={\`brow\${sx}\`} geometry={sphereGeo(1)} material={main}
          scale={[r * 0.15, r * 0.09, r * 0.12]} position={[sx * r * 0.4, r * 0.49, r * 1.08]} />
      ))}
      {/* Soft under-eye creases — gentle shading below the eyes for depth */}
      {[-1, 1].map((sx) => (
        <mesh key={\`cr\${sx}\`} geometry={sphereGeo(1)}
          material={new MeshStandardMaterial({ color: '#5f6a76', roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false })}
          scale={[r * 0.3, r * 0.06, r * 0.03]} position={[sx * r * 0.4, r * 0.06, r * 1.18]} />
      ))}

      {/* Round glasses`,
  'under-eye creases added'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/8 patches applied`)
