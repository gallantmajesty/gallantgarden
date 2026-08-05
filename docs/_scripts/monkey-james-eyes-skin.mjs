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

// 1. Fur — warmer, richer brown (less flat)
replace(
  `  const monkeyFur = sharedMaterial('#8B5E3C', 0.62)`,
  `  const monkeyFur = sharedMaterial('#96613F', 0.72)`,
  'warmer fur'
)

// 2. Face — warmer cream skin tone
replace(
  `  const monkeyFace = sharedMaterial('#F5D6B4', 0.68)`,
  `  const monkeyFace = sharedMaterial('#F9DFBB', 0.72)`,
  'warmer face skin'
)

// 3. Eyes — James's anime Eye component (shaded iris + upper lash line)
replace(
  `      {/* big friendly eyes — wide-set, expressive with catchlights, bulging
          off the mask surface (were buried inside the head/mask) */}
      {[-1, 1].map((sx) => (
        <group key={\`eye\${sx}\`} position={[sx * r * 0.32, r * 0.06, r * 1.02]}>
          {/* white sclera — big, round, baby-like */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.3, r * 0.33, r * 0.13]} />
          {/* dark limbal ring around the iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#3a2413', 0.5)} scale={[r * 0.21, r * 0.23, r * 0.11]} position={[0, 0, r * 0.02]} />
          {/* warm brown iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7a4a1e', 0.55)} scale={[r * 0.19, r * 0.21, r * 0.12]} position={[0, 0, r * 0.03]} />
          {/* dark pupil */}
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.1, r * 0.11, r * 0.12]} position={[0, 0, r * 0.04]} />
          {/* big top catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.07, r * 0.07, r * 0.11]} position={[sx * -r * 0.03, r * 0.05, r * 0.05]} />
          {/* small secondary catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.035, r * 0.035, r * 0.1]} position={[sx * r * 0.02, -r * 0.035, r * 0.05]} />
        </group>
      ))}`,
  `      {/* James-style anime eyes — shaded warm-brown iris, big glints, upper lash line */}
      {[-1, 1].map((sx) => (
        <Eye key={\`eye\${sx}\`} r={r * 1.15} x={sx * r * 0.32} y={r * 0.06} z={r * 1.02} iris="#7a4a1e" />
      ))}`,
  'James eyes'
)

// 4. Snout — deeper, warmer tan so it reads as skin against the fur
replace(
  `      {/* protruding monkey snout — round muzzle jutting forward, nose + mouth on its front face */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.44, r * 0.36, r * 0.32]} position={[0, -r * 0.34, r * 0.98]} />`,
  `      {/* protruding monkey snout — round muzzle jutting forward, nose + mouth on its front face */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#EDC9A0', 0.72)} scale={[r * 0.44, r * 0.36, r * 0.32]} position={[0, -r * 0.34, r * 0.98]} />`,
  'deeper snout skin'
)

// 5. Nostrils — move below the nose pad so the two front nostrils are visible on the snout tip
replace(
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[-r * 0.06, -r * 0.32, r * 1.3]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[r * 0.06, -r * 0.32, r * 1.3]} />`,
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[-r * 0.06, -r * 0.42, r * 1.3]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[r * 0.06, -r * 0.42, r * 1.3]} />`,
  'visible nostrils'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/5 patches applied`)
