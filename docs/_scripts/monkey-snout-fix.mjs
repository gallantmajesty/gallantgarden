// Rebuild MonkeyHead face: fix angry brows, add protruding muzzle (snout),
// replace the torus "handle" smile with the panda-style sphere-arc smile.
import { readFileSync, writeFileSync } from 'fs'

const path = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = readFileSync(path, 'utf8')

// Normalize CRLF -> LF for matching, keep file LF (project already mixed)
src = src.replace(/\r\n/g, '\n')

const OLD_BROWS = `      {/* two angled brows — soft dark tufts sweeping outward for a confident,
          masculine (but friendly) look; replaces the old flat bar */}
      {[-1, 1].map((sx) => (
        <mesh key={\`brow\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.2, r * 0.05, r * 0.09]}
          position={[sx * r * 0.3, r * 0.2, r * 1.07]}
          rotation={[0, 0, sx * 0.3]} />
      ))}`

const NEW_BROWS = `      {/* two soft friendly brows — gentle outer-up tilt for a cute male
          look (NOT angry): inner ends sit a touch high, outer ends drop */}
      {[-1, 1].map((sx) => (
        <mesh key={\`brow\${sx}\`} geometry={sphereGeo(1)} material={dark}
          scale={[r * 0.2, r * 0.05, r * 0.09]}
          position={[sx * r * 0.3, r * 0.2, r * 1.07]}
          rotation={[0, 0, -sx * 0.22]} />
      ))}`

const OLD_SNOUT = `      {/* glossy dark nose pad, slightly protruding (front 1.14r) */}
      <mesh geometry={sphereGeo(1)} material={nosePad} scale={[r * 0.12, r * 0.09, r * 0.1]} position={[0, -r * 0.24, r * 1.04]} />
      {/* nose glint — small wet highlight */}
      <mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.025, r * 0.015, r * 0.01]} position={[-r * 0.035, -r * 0.21, r * 1.14]} />

      {/* nostrils — two dark slits on the nose tip, pushed OUT past the pad
          (pad front 1.14r; nostril front 1.17r+0.012 so they never bury) */}
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.03, r * 0.024, r * 0.012]} position={[-r * 0.042, -r * 0.245, r * 1.17]} />
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.03, r * 0.024, r * 0.012]} position={[r * 0.042, -r * 0.245, r * 1.17]} />

      {/* wide cheeky grin — warm curved smile line (front 1.03r vs mask 1.009r) */}
      <mesh geometry={torusGeo(r * 0.3, r * 0.03, 8, 20)} material={mouthM}
        position={[0, -r * 0.46, r * 1.04]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]} />

      {/* lower lip for a fuller smile (front 1.08r vs mask 0.967r) */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.52, r * 1.0]} />`

const NEW_SNOUT = `      {/* protruding tan muzzle — the classic monkey snout. An ellipsoid that
          bulges past the face mask (mask front 1.12r, muzzle front 1.28r) so
          the nose & mouth sit on a real snout instead of flat on the face */}
      <mesh geometry={sphereGeo(1)} material={face} scale={[r * 0.5, r * 0.34, r * 0.24]} position={[0, -r * 0.26, r * 1.04]} />

      {/* glossy dark-brown nose at the TOP of the muzzle (front 1.36r) */}
      <mesh geometry={sphereGeo(1)} material={nosePad} scale={[r * 0.14, r * 0.09, r * 0.06]} position={[0, -r * 0.16, r * 1.3]} />
      {/* nose glint — small wet highlight */}
      <mesh geometry={sphereGeo(1)} material={glint} scale={[r * 0.03, r * 0.018, r * 0.01]} position={[-r * 0.035, -r * 0.12, r * 1.34]} />

      {/* nostrils — two dark slits just under the nose (proud of muzzle front) */}
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.024, r * 0.014, r * 0.008]} position={[-r * 0.045, -r * 0.22, r * 1.34]} />
      <mesh geometry={sphereGeo(1)} material={nostrilM} scale={[r * 0.024, r * 0.014, r * 0.008]} position={[r * 0.045, -r * 0.22, r * 1.34]} />

      {/* philtrum — the thin groove running nose → mouth, like real monkeys */}
      <mesh geometry={boxGeo(r * 0.014, r * 0.09, r * 0.01)} material={mouthM} position={[0, -r * 0.27, r * 1.3]} />

      {/* gentle upward smile — five small spheres tracing a soft curve with the
          corners lifted (panda technique). Reads as a warm smile, not a ring */}
      {[-0.09, -0.04, 0, 0.04, 0.09].map((dx, i) => (
        <mesh key={\`sm\${i}\`} geometry={sphereGeo(1)} material={mouthM}
          scale={[r * (i === 2 ? 0.045 : 0.035), r * 0.028, r * 0.012]}
          position={[dx * r, -r * 0.3 + Math.abs(dx) * r * 0.22, r * 1.32]} />
      ))}
      {/* mouth corners accent — little dimple puffs at each end */}
      {[-1, 1].map((sx) => (
        <mesh key={\`dm\${sx}\`} geometry={sphereGeo(1)} material={mouthM}
          scale={[r * 0.045, r * 0.022, r * 0.012]} position={[sx * r * 0.1, -r * 0.27, r * 1.3]} />
      ))}

      {/* lower lip — fuller, sitting right under the smile */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.16, r * 0.05, r * 0.07]} position={[0, -r * 0.4, r * 1.26]} />`

let count = 0
if (src.includes(OLD_BROWS)) { src = src.replace(OLD_BROWS, NEW_BROWS); count++ }
else console.log('MISS: brows block')
if (src.includes(OLD_SNOUT)) { src = src.replace(OLD_SNOUT, NEW_SNOUT); count++ }
else console.log('MISS: snout block')

writeFileSync(path, src)
console.log(`applied ${count}/2`)
