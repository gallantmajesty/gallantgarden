// Monkey face layout v2: eyes higher, muzzle lower+smaller so the snout sits
// clearly below the eyes (real monkey proportions) with open cheek space.
import { readFileSync, writeFileSync } from 'fs'

const path = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
let count = 0

// 1) Raise eyes slightly: y 0.08 -> 0.13 (clear gap above the snout)
const OLD_EYE = `        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.08, r * 1.02]}>`
const NEW_EYE = `        <group key={\`eye\${sx}\`} position={[sx * r * 0.3, r * 0.13, r * 1.02]}>`
if (src.includes(OLD_EYE)) { src = src.replace(OLD_EYE, NEW_EYE); count++ } else console.log('MISS: eye y')

// 2) Lower + shrink the muzzle: center y -0.26 -> -0.34, half-y 0.34 -> 0.26,
//    half-z 0.24 -> 0.22. Top edge now -0.08r (below the eye bottom -0.13+0.25).
const OLD_MUZ = `<mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.5, r * 0.34, r * 0.24]} position={[0, -r * 0.26, r * 1.04]} />`
const NEW_MUZ = `<mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.46, r * 0.26, r * 0.22]} position={[0, -r * 0.34, r * 1.06]} />`
if (src.includes(OLD_MUZ)) { src = src.replace(OLD_MUZ, NEW_MUZ); count++ } else console.log('MISS: muzzle')

// 3) Nose re-seated on the lower muzzle (top area): y -0.16 -> -0.22, z 1.3 -> 1.32
const OLD_NOSE = `<mesh geometry={sphereGeo(1)} material={nosePad} scale={[r * 0.14, r * 0.09, r * 0.06]} position={[0, -r * 0.16, r * 1.3]} />`
const NEW_NOSE = `<mesh geometry={sphereGeo(1)} material={nosePad} scale={[r * 0.14, r * 0.09, r * 0.06]} position={[0, -r * 0.22, r * 1.32]} />`
if (src.includes(OLD_NOSE)) { src = src.replace(OLD_NOSE, NEW_NOSE); count++ } else console.log('MISS: nose')

// 4) Nose glint follows the nose: y -0.12 -> -0.18, z 1.36 -> 1.38
const OLD_GLINT = `<mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.03, r * 0.018, r * 0.01]} position={[-r * 0.035, -r * 0.12, r * 1.36]} />`
const NEW_GLINT = `<mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.03, r * 0.018, r * 0.01]} position={[-r * 0.035, -r * 0.18, r * 1.38]} />`
if (src.includes(OLD_GLINT)) { src = src.replace(OLD_GLINT, NEW_GLINT); count++ } else console.log('MISS: glint')

// 5) Nostrils follow: y -0.22 -> -0.28, z 1.34 -> 1.36
const OLD_NOST = `<mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.024, r * 0.014, r * 0.008]} position={[-r * 0.045, -r * 0.22, r * 1.34]} />
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.024, r * 0.014, r * 0.008]} position={[r * 0.045, -r * 0.22, r * 1.34]} />`
const NEW_NOST = `<mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.024, r * 0.014, r * 0.008]} position={[-r * 0.045, -r * 0.28, r * 1.36]} />
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.024, r * 0.014, r * 0.008]} position={[r * 0.045, -r * 0.28, r * 1.36]} />`
if (src.includes(OLD_NOST)) { src = src.replace(OLD_NOST, NEW_NOST); count++ } else console.log('MISS: nostrils')

// 6) Philtrum follows: y -0.27 -> -0.33, z 1.3 -> 1.32
const OLD_PHIL = `<mesh geometry={boxGeo(r * 0.014, r * 0.09, r * 0.01)} material={mouthM} position={[0, -r * 0.27, r * 1.3]} />`
const NEW_PHIL = `<mesh geometry={boxGeo(r * 0.014, r * 0.09, r * 0.01)} material={mouthM} position={[0, -r * 0.33, r * 1.32]} />`
if (src.includes(OLD_PHIL)) { src = src.replace(OLD_PHIL, NEW_PHIL); count++ } else console.log('MISS: philtrum')

// 7) Smile follows the muzzle front: y -0.3 -> -0.42, z 1.32 -> 1.34
const OLD_SMILE = `        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={mouthM}
          scale={[r * (i === 2 ? 0.045 : 0.035), r * 0.028, r * 0.012]}
          position={[dx * r, -r * 0.3 + Math.abs(dx) * r * 0.22, r * 1.32]} />`
const NEW_SMILE = `        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={mouthM}
          scale={[r * (i === 2 ? 0.045 : 0.035), r * 0.028, r * 0.012]}
          position={[dx * r, -r * 0.42 + Math.abs(dx) * r * 0.22, r * 1.34]} />`
if (src.includes(OLD_SMILE)) { src = src.replace(OLD_SMILE, NEW_SMILE); count++ } else console.log('MISS: smile')

// 8) Corner dimples follow: y -0.27 -> -0.39, z 1.3 -> 1.32
const OLD_CORNER = `        <mesh key={\`dm\${sx}\`} geometry={sphereGeo(1)} material={mouthM}
          scale={[r * 0.045, r * 0.022, r * 0.012]} position={[sx * r * 0.1, -r * 0.27, r * 1.3]} />`
const NEW_CORNER = `        <mesh key={\`dm\${sx}\`} geometry={sphereGeo(1)} material={mouthM}
          scale={[r * 0.045, r * 0.022, r * 0.012]} position={[sx * r * 0.1, -r * 0.39, r * 1.32]} />`
if (src.includes(OLD_CORNER)) { src = src.replace(OLD_CORNER, NEW_CORNER); count++ } else console.log('MISS: corner')

// 9) Lower lip follows: y -0.4 -> -0.52, z 1.26 -> 1.28
const OLD_LIP = `<mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.05, r * 0.07]} position={[0, -r * 0.4, r * 1.26]} />`
const NEW_LIP = `<mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.05, r * 0.07]} position={[0, -r * 0.52, r * 1.28]} />`
if (src.includes(OLD_LIP)) { src = src.replace(OLD_LIP, NEW_LIP); count++ } else console.log('MISS: lip')

// 10) Blush re-seated on the cheeks beside the lower snout: y -0.1 -> -0.16, z 0.92 -> 0.94
const OLD_BLUSH = `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.13, r * 0.09, r * 0.05]} position={[sx * r * 0.52, -r * 0.1, r * 0.92]} />`
const NEW_BLUSH = `        <mesh key={\`ch\${sx}\`} geometry={sphereGeo(1)} material={blush} scale={[r * 0.13, r * 0.09, r * 0.05]} position={[sx * r * 0.52, -r * 0.16, r * 0.94]} />`
if (src.includes(OLD_BLUSH)) { src = src.replace(OLD_BLUSH, NEW_BLUSH); count++ } else console.log('MISS: blush')

writeFileSync(path, src)
console.log(`applied ${count}/10`)
