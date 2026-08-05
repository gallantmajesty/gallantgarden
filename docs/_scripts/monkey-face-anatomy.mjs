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

// 1. Skull — flatter front-back face plane (not a ball)
replace(
  `      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.12, r * 1.08, r * 1.05]} castShadow />`,
  `      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.12, r * 1.1, r * 1.0]} castShadow />`,
  'skull flatter'
)

// 2. Face mask — taller, reaching up the forehead (macaque-style face)
replace(
  `      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.72, r * 0.72, r * 0.6]} position={[0, -r * 0.05, r * 0.5]} />`,
  `      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.72, r * 0.78, r * 0.58]} position={[0, -r * 0.08, r * 0.5]} />`,
  'face mask taller'
)

// 3. Brows — replace the two small bumps with a strong continuous brow ridge + angled tips
replace(
  `      {[-1, 1].map((sx) => (
        <mesh key={\`br\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.15, r * 0.09, r * 0.12]} position={[sx * r * 0.34, r * 0.36, r * 0.95]} rotation={[0, 0, sx * -0.15]} />
      ))}`,
  `      {/* strong monkey brow ridge — a continuous arc above the eyes */}
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.62, r * 0.1, r * 0.18]} position={[0, r * 0.42, r * 0.8]} />
      {/* expressive angled brow tips at the ridge ends */}
      {[-1, 1].map((sx) => (
        <mesh key={\`br\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.13, r * 0.09, r * 0.11]} position={[sx * r * 0.34, r * 0.46, r * 0.85]} rotation={[0, 0, sx * -0.2]} />
      ))}`,
  'brow ridge'
)

// 4. Muzzle — big protruding monkey snout with the nose/mouth on its front face
replace(
  `      {/* soft muzzle — small round tan oval around the nose and mouth */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.3, r * 0.26, r * 0.22]} position={[0, -r * 0.26, r * 0.9]} />`,
  `      {/* protruding monkey snout — round muzzle jutting forward, nose + mouth on its front face */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.44, r * 0.36, r * 0.32]} position={[0, -r * 0.34, r * 0.98]} />`,
  'protruding snout'
)

// 5. Nose — rounded nose pad at the top of the snout
replace(
  `      {/* tiny round button nose */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.11, r * 0.085, r * 0.1]} position={[0, -r * 0.24, r * 1.08]} />`,
  `      {/* rounded nose pad at the top of the snout */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.13, r * 0.1, r * 0.12]} position={[0, -r * 0.3, r * 1.22]} />`,
  'nose pad'
)

// 6. Nostrils — two front-facing dots on the snout tip (monkey nostrils)
replace(
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.028, r * 0.028, r * 0.012]} position={[-r * 0.045, -r * 0.24, r * 1.15]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.028, r * 0.028, r * 0.012]} position={[r * 0.045, -r * 0.24, r * 1.15]} />`,
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[-r * 0.06, -r * 0.32, r * 1.3]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[r * 0.06, -r * 0.32, r * 1.3]} />`,
  'front nostrils'
)

// 7. Smile — moved down and forward onto the snout
replace(
  `          position={[dx * r, -r * 0.44 + Math.abs(dx) * r * 0.7, r * 1.08]} />`,
  `          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.28]} />`,
  'smile on snout'
)

// 8. Dimples — follow the smile onto the snout
replace(
  `          scale={[r * 0.028, r * 0.024, r * 0.02]} position={[sx * r * 0.14, -r * 0.38, r * 1.09]} />`,
  `          scale={[r * 0.028, r * 0.024, r * 0.02]} position={[sx * r * 0.16, -r * 0.4, r * 1.28]} />`,
  'dimples on snout'
)

// 9. Lower lip — onto the snout bottom
replace(
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.045, r * 0.07]} position={[0, -r * 0.52, r * 1.0]} />`,
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.56, r * 1.2]} />`,
  'lower lip on snout'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/9 patches applied`)
