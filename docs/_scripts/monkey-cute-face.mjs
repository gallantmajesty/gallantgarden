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

// 1. Head — rounder and slightly bigger for baby proportions
replace(
  `      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.1, r * 1.05, r * 1.02]} castShadow />`,
  `      <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 1.12, r * 1.08, r * 1.05]} castShadow />`,
  'head rounder'
)

// 2. Face mask — rounder, slightly fuller
replace(
  `      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.7, r * 0.7, r * 0.62]} position={[0, -r * 0.06, r * 0.5]} />`,
  `      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.72, r * 0.72, r * 0.6]} position={[0, -r * 0.05, r * 0.5]} />`,
  'face mask rounder'
)

// 3. Ears — slightly bigger, rounder, baby-like
replace(
  `        <group key={\`ear\${sx}\`} position={[sx * r * 1.0, r * 0.3, -r * 0.05]} rotation={[0.12, sx * -0.08, sx * 0.14]}>`,
  `        <group key={\`ear\${sx}\`} position={[sx * r * 1.05, r * 0.28, -r * 0.06]} rotation={[0.12, sx * -0.08, sx * 0.14]}>`,
  'ear position'
)
replace(
  `          <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.4, r * 0.5, r * 0.1]} />`,
  `          <mesh geometry={sphereGeo(1)} material={fur} scale={[r * 0.44, r * 0.54, r * 0.11]} />`,
  'outer ear rounder'
)
replace(
  `          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.26, r * 0.34, r * 0.06]} position={[sx * -r * 0.02, -r * 0.02, r * 0.05]} />`,
  `          <mesh geometry={sphereGeo(1)} material={inner} scale={[r * 0.3, r * 0.38, r * 0.07]} position={[sx * -r * 0.02, -r * 0.02, r * 0.05]} />`,
  'inner ear rounder'
)

// 4. Eyes — bigger, lower, baby-face placement with bigger catchlights
replace(
  `        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]}>`,
  `        <group key={\`eye\${sx}\`} position={[sx * r * 0.32, r * 0.06, r * 1.02]}>`,
  'eye position'
)
replace(
  `          {/* white sclera — big and round */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.24, r * 0.27, r * 0.12]} />
          {/* dark limbal ring around the iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#3a2413', 0.5)} scale={[r * 0.17, r * 0.19, r * 0.1]} position={[0, 0, r * 0.02]} />
          {/* warm brown iris */}
          <mesh geometry={sphereGeo(1)} material={sharedMaterial('#7a4a1e', 0.55)} scale={[r * 0.15, r * 0.17, r * 0.11]} position={[0, 0, r * 0.03]} />
          {/* dark pupil */}
          <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.08, r * 0.09, r * 0.11]} position={[0, 0, r * 0.04]} />
          {/* big top catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.055, r * 0.055, r * 0.1]} position={[sx * -r * 0.025, r * 0.045, r * 0.05]} />
          {/* small secondary catchlight */}
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.028, r * 0.028, r * 0.09]} position={[sx * r * 0.015, -r * 0.03, r * 0.05]} />`,
  `          {/* white sclera — big, round, baby-like */}
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
          <mesh geometry={sphereGeo(1)} material={white} scale={[r * 0.035, r * 0.035, r * 0.1]} position={[sx * r * 0.02, -r * 0.035, r * 0.05]} />`,
  'bigger baby eyes'
)

// 5. Brows — raised to frame the bigger eyes
replace(
  `          scale={[r * 0.14, r * 0.08, r * 0.12]} position={[sx * r * 0.3, r * 0.3, r * 0.95]} rotation={[0, 0, sx * -0.15]} />`,
  `          scale={[r * 0.15, r * 0.09, r * 0.12]} position={[sx * r * 0.34, r * 0.36, r * 0.95]} rotation={[0, 0, sx * -0.15]} />`,
  'brows raised'
)

// 6. Muzzle — smaller and rounder for a cuter face
replace(
  `      {/* soft muzzle — gently raised tan oval around the nose and mouth */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.34, r * 0.3, r * 0.26]} position={[0, -r * 0.28, r * 0.92]} />`,
  `      {/* soft muzzle — small round tan oval around the nose and mouth */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.3, r * 0.26, r * 0.22]} position={[0, -r * 0.26, r * 0.9]} />`,
  'muzzle smaller'
)

// 7. Nose — tiny round button
replace(
  `      {/* small dark nose — slightly protruding on the muzzle */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.13, r * 0.1, r * 0.12]} position={[0, -r * 0.26, r * 1.1]} />`,
  `      {/* tiny round button nose */}
      <mesh geometry={sphereGeo(1)} material={blackDot} scale={[r * 0.11, r * 0.085, r * 0.1]} position={[0, -r * 0.24, r * 1.08]} />`,
  'tiny button nose'
)

// 8. Nostrils — sit on the smaller muzzle
replace(
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.03, r * 0.03, r * 0.012]} position={[-r * 0.045, -r * 0.26, r * 1.19]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.03, r * 0.03, r * 0.012]} position={[r * 0.045, -r * 0.26, r * 1.19]} />`,
  `      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.028, r * 0.028, r * 0.012]} position={[-r * 0.045, -r * 0.24, r * 1.15]} />
      <mesh geometry={sphereGeo(1)} material={sharedMaterial('#0a0a0a', 0.2)} scale={[r * 0.028, r * 0.028, r * 0.012]} position={[r * 0.045, -r * 0.24, r * 1.15]} />`,
  'nostrils on muzzle'
)

// 9. Smile — sweet arc seated on the smaller muzzle, with corner dimples
replace(
  `      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.032, r * 0.025]}
          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.17]} />
      ))}`,
  `      {[-0.09, -0.045, 0, 0.045, 0.09].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * (i === 2 ? 0.05 : 0.045), r * 0.032, r * 0.025]}
          position={[dx * r, -r * 0.44 + Math.abs(dx) * r * 0.7, r * 1.08]} />
      ))}
      {/* cute corner dimples */}
      {[-1, 1].map((sx) => (
        <mesh key={\`dm\${sx}\`} geometry={sphereGeo(1)} material={blackDot}
          scale={[r * 0.028, r * 0.024, r * 0.02]} position={[sx * r * 0.14, -r * 0.38, r * 1.09]} />
      ))}`,
  'sweet smile + dimples'
)

// 10. Lower lip — seated on the smaller muzzle
replace(
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.52, r * 1.12]} />`,
  `      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.045, r * 0.07]} position={[0, -r * 0.52, r * 1.06]} />`,
  'lower lip seated'
)

// 11. Blush — bigger, softer, clearly on the cheeks
replace(
  `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.13, r * 0.09, r * 0.05]} position={[sx * r * 0.52, -r * 0.1, r * 0.92]} />`,
  `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.16, r * 0.11, r * 0.05]} position={[sx * r * 0.55, -r * 0.12, r * 1.05]} />`,
  'rosy blush'
)

// 12. Tuft — fluffier
replace(
  `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.14, r * 0.14, r * 0.14]} position={[0, r * 1.0, r * 0.35]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[-r * 0.08, r * 1.05, r * 0.3]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.1, r * 0.1, r * 0.1]} position={[r * 0.08, r * 1.05, r * 0.3]} />`,
  `      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.15, r * 0.16, r * 0.15]} position={[0, r * 1.1, r * 0.38]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.11, r * 0.13, r * 0.11]} position={[-r * 0.09, r * 1.16, r * 0.33]} />
      <mesh geometry={sphereGeo(1)} material={dark} scale={[r * 0.11, r * 0.13, r * 0.11]} position={[r * 0.09, r * 1.16, r * 0.33]} />`,
  'fluffy tuft'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/12 patches applied`)
