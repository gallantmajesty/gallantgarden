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

// 1. Remove the brow ridge + tips (the dark line above the eyes)
replace(
  `      {/* soft arched brows — one per eye, raised and friendly */}
      {/* strong monkey brow ridge — a continuous arc above the eyes */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.62, r * 0.1, r * 0.18]} position={[0, r * 0.42, r * 0.8]} />
      {/* expressive angled brow tips at the ridge ends */}
      {[-1, 1].map((sx) => (
        <mesh key={\`br\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.13, r * 0.09, r * 0.11]} position={[sx * r * 0.34, r * 0.46, r * 0.85]} rotation={[0, 0, sx * -0.2]} />
      ))}
`,
  ``,
  'brow line removed'
)

// 2. Replace the big cream circle with a heart-shaped tan face + forehead bridge point
replace(
  `      {/* lighter tan face mask — heart/oval shaped, centred on the front */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.72, r * 0.78, r * 0.58]} position={[0, -r * 0.08, r * 0.5]} />`,
  `      {/* tan monkey face — heart-shaped mask, narrower than a circle, with a
          bridge rising between the eyes like a real monkey's face */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.58, r * 0.6, r * 0.5]} position={[0, -r * 0.18, r * 0.54]} />
      {/* heart bridge point up the forehead */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.24, r * 0.34, r * 0.36]} position={[0, r * 0.24, r * 0.62]} />`,
  'heart-shaped face'
)

// 3. Blush — repositioned onto the lower outer cheeks, clear of the snout
replace(
  `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.16, r * 0.11, r * 0.05]} position={[sx * r * 0.55, -r * 0.12, r * 0.93]} />`,
  `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.14, r * 0.1, r * 0.05]} position={[sx * r * 0.58, -r * 0.35, r * 0.8]} />`,
  'blush on lower cheeks'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/3 patches applied`)
