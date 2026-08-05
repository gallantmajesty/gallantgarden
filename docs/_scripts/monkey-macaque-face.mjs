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

// 1. Face mask — big flat tan face covering the whole face front (macaque, not a small circle)
replace(
  `      {/* tan monkey face — heart-shaped mask, narrower than a circle, with a
          bridge rising between the eyes like a real monkey's face */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.58, r * 0.6, r * 0.5]} position={[0, -r * 0.18, r * 0.54]} />
      {/* heart bridge point up the forehead */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.24, r * 0.34, r * 0.36]} position={[0, r * 0.24, r * 0.62]} />`,
  `      {/* big flat tan face — bare monkey skin covering the whole face front, like a macaque */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.66, r * 0.72, r * 0.5]} position={[0, -r * 0.12, r * 0.55]} />`,
  'flat macaque face'
)

// 2. Remove the dog-like protruding muzzle; nose + mouth sit FLAT on the face
replace(
  `      {/* protruding monkey snout — round muzzle jutting forward, nose + mouth on its front face */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#EDC9A0', 0.72)} scale={[r * 0.44, r * 0.36, r * 0.32]} position={[0, -r * 0.34, r * 0.98]} />

      {/* rounded nose pad at the top of the snout */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.13, r * 0.1, r * 0.12]} position={[0, -r * 0.3, r * 1.22]} />

      {/* nostrils — two tiny dots */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[-r * 0.06, -r * 0.42, r * 1.3]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.035, r * 0.03, r * 0.015]} position={[r * 0.06, -r * 0.42, r * 1.3]} />

      {/* wide cheeky grin — soft smile arc with lifted corners */}
      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.032, r * 0.025]}
          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.28]} />
      ))}
      {/* cute corner dimples */}
      {[-1, 1].map((sx) => (
        <mesh key={\`dm\${sx}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.028, r * 0.024, r * 0.02]} position={[sx * r * 0.16, -r * 0.4, r * 1.28]} />
      ))}

      {/* lower lip for a fuller smile */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.56, r * 1.2]} />`,
  `      {/* flat monkey face features — no protruding muzzle, nose + mouth sit flat */}
      {/* small flat nose */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.1, r * 0.07, r * 0.06]} position={[0, -r * 0.18, r * 1.08]} />
      {/* close-set nostrils just below the nose */}
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.032, r * 0.024, r * 0.014]} position={[-r * 0.045, -r * 0.26, r * 1.12]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.032, r * 0.024, r * 0.014]} position={[r * 0.045, -r * 0.26, r * 1.12]} />
      {/* wide flat smile */}
      {[-0.1, -0.05, 0, 0.05, 0.1].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.03, r * 0.022]}
          position={[dx * r, -r * 0.4 + Math.abs(dx) * r * 0.55, r * 1.06]} />
      ))}
      {/* cute corner dimples */}
      {[-1, 1].map((sx) => (
        <mesh key={\`dm\${sx}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.028, r * 0.024, r * 0.02]} position={[sx * r * 0.18, -r * 0.34, r * 1.06]} />
      ))}
      {/* lower lip for a fuller smile */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.04, r * 0.06]} position={[0, -r * 0.5, r * 1.02]} />`,
  'flat nose + mouth'
)

// 3. Sideburns — pull forward out of the skull so they actually show
replace(
  `        <mesh key={'sd' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)}
          scale={[r * 0.3, r * 0.42, r * 0.26]} position={[sx * r * 0.85, -r * 0.12, r * 0.25]} />`,
  `        <mesh key={'sd' + sx} geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)}
          scale={[r * 0.3, r * 0.42, r * 0.26]} position={[sx * r * 0.85, -r * 0.12, r * 0.75]} />`,
  'sideburns visible'
)

// 4. Crown cap — raised so it clearly caps the skull top
replace(
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)} scale={[r * 0.95, r * 0.45, r * 0.85]} position={[0, r * 0.68, -r * 0.15]} />`,
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7d4f30', 0.7)} scale={[r * 0.95, r * 0.5, r * 0.85]} position={[0, r * 0.7, -r * 0.15]} />`,
  'crown cap raised'
)

// 5. Blush — onto the flat tan face
replace(
  `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.14, r * 0.1, r * 0.05]} position={[sx * r * 0.58, -r * 0.35, r * 0.8]} />`,
  `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.15, r * 0.1, r * 0.05]} position={[sx * r * 0.6, -r * 0.4, r * 0.68]} />`,
  'blush on face'
)

// 6. Monkey palm pad — push forward onto the palm surface (was buried)
replace(
  `              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.wristR * 0.5, P.wristR * 0.45, P.wristR * 0.3]} position={[0, -P.handLen * 0.24, P.wristR * 0.5]} />`,
  `              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.wristR * 0.5, P.wristR * 0.45, P.wristR * 0.3]} position={[0, -P.handLen * 0.24, P.wristR * 1.0]} />`,
  'palm pad visible'
)

// 7. Feet — remove buried heel pad, push toes forward and bigger
replace(
  `              {/* tan heel pad */}
              <mesh geometry={sphereGeo(1)} material={sharedMaterial('#e8c9a2', 0.7)}
                scale={[P.ankleR * 0.75, P.ankleR * 0.3, P.footLen * 0.1]}
                position={[0, -P.ankleR * 0.62, P.footLen * 0.32]} />
              {/* visible round toes poking out the front */}
              {[-P.ankleR * 0.3, -P.ankleR * 0.1, P.ankleR * 0.1, P.ankleR * 0.3].map((tx, i) => (
                <mesh key={\`mt\${i}\`} geometry={sphereGeo(1)} material={monkeyDark}
                  scale={[P.ankleR * 0.14, P.ankleR * 0.16, P.ankleR * 0.14]}
                  position={[tx, -P.ankleR * 0.52, P.footLen * 0.68]} />
              ))}`,
  `              {/* visible round toes poking out the front */}
              {[-P.ankleR * 0.32, -P.ankleR * 0.11, P.ankleR * 0.11, P.ankleR * 0.32].map((tx, i) => (
                <mesh key={\`mt\${i}\`} geometry={sphereGeo(1)} material={monkeyDark}
                  scale={[P.ankleR * 0.17, P.ankleR * 0.19, P.ankleR * 0.17]}
                  position={[tx, -P.ankleR * 0.55, P.footLen * 0.8]} />
              ))}`,
  'feet toes visible'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/7 patches applied`)
