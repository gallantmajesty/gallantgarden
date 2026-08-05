// Remove the torus wrinkle rings from the elephant trunk — they rendered as
// visible donut-shaped circles wrapping the tube (the "mess"). Keep the clean
// smooth tube, tip cap, and nostrils. CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

let out = norm

// ---- 1. Remove the render block (the circles) ----
const renderOld = `      {/* Trunk wrinkle rings — hugging the tube along its length */}
      {trunk.rings.map((ring, i) => (
        <mesh key={\`twr\${i}\`} geometry={torusGeo(ring.rr * 1.03, r * 0.012, 8, 24)} material={dark}
          position={[ring.x, ring.y, ring.z]} rotation={[Math.PI / 2, 0, 0]} />
      ))}

`
if (!out.includes(renderOld)) {
  console.error('RENDER RINGS BLOCK NOT FOUND')
  process.exit(1)
}
out = out.replace(renderOld, '')

// ---- 2. Remove the rings computation from the useMemo ----
const memoOld = `    // Wrinkle rings — every ring sits exactly on the tube surface
    const rings = [0.12, 0.28, 0.44, 0.6, 0.76].map((t) => {
      const p = curve.getPointAt(t)
      return { x: p.x, y: p.y, z: p.z, rr: baseR * (1 - t * taperRate) }
    })
    // Tip cap anchor — end of the curve
    const tip = curve.getPointAt(1)
    // Nostril anchor — near the tip on the front face of the tube
    const np = curve.getPointAt(0.86)
    const nr = baseR * (1 - 0.86 * taperRate)
    return { geo, rings, tip, np, nr }`

const memoNew = `    // Tip cap anchor — end of the curve
    const tip = curve.getPointAt(1)
    // Nostril anchor — near the tip on the front face of the tube
    const np = curve.getPointAt(0.86)
    const nr = baseR * (1 - 0.86 * taperRate)
    return { geo, tip, np, nr }`

if (!out.includes(memoOld)) {
  console.error('MEMO RINGS BLOCK NOT FOUND')
  process.exit(1)
}
out = out.replace(memoOld, memoNew)

writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Trunk rings removed')
