import { readFileSync, writeFileSync } from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const raw = readFileSync(FILE, 'utf8')
const crlf = raw.includes('\r\n')
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

// Hoist the crease material beside the other shared elephant materials.
replace(
  `  const elGlassLens = new MeshStandardMaterial({ color: '#e8eef8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false })`,
  `  const elGlassLens = new MeshStandardMaterial({ color: '#e8eef8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false })
  const elCrease = new MeshStandardMaterial({ color: '#5f6a76', roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false })`,
  'hoist elCrease material'
)

// Use the hoisted material and place creases on skin below the eye (not on the sclera).
replace(
  `      {[-1, 1].map((sx) => (
        <mesh key={\`cr\${sx}\`} geometry={sphereGeo(1)}
          material={new MeshStandardMaterial({ color: '#5f6a76', roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false })}
          scale={[r * 0.3, r * 0.06, r * 0.03]} position={[sx * r * 0.4, r * 0.06, r * 1.18]} />
      ))}`,
  `      {[-1, 1].map((sx) => (
        <mesh key={\`cr\${sx}\`} geometry={sphereGeo(1)} material={elCrease}
          scale={[r * 0.3, r * 0.06, r * 0.03]} position={[sx * r * 0.4, r * 0.0, r * 1.22]} />
      ))}`,
  'crease material + position on skin'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/2 patches applied`)
