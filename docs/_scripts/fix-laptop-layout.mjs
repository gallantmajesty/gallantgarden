// Fixes the laptop accessory layout in ../src/avatar/Accessories.tsx:
//  1. The volumetric halo planes (0.52×0.29 / 0.46×0.25) are BIGGER than the
//     lid (0.44×0.24) and even the base body (0.48) — they render as a glowing
//     "fat frame" rim around the screen. Shrink them to the screen footprint.
//  2. The screen assembly group sat at z=-0.17, so the hinge floated ~0.05
//     behind the deck's back edge (z=-0.12) and ~0.02 behind the base back
//     (z=-0.15) — a visible gap between the body and the lid. Move the group
//     so the hinge lands on the deck's rear edge (connects to the body).
//  3. The bottom-bezel glow strip was at local y=0.0175 (below the lid bottom
//     edge 0.028) — floating in mid-air. Seat it on the bottom bezel instead.
//  4. Top bezel bar poked 0.002 above the lid top; tuck it inside the lid.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(here, '..', '..', 'src', 'avatar', 'Accessories.tsx')
let src = readFileSync(file, 'utf8')

const patches = [
  // 1. Shrink the halo planes to the screen footprint (0.42×0.23) with a
  //    smaller inner glow — no more glowing rim poking past the lid.
  [
    'halo planes',
    `              <mesh geometry={boxGeo(0.46, 0.25, 0.0008)} material={additiveGlow('#00e5ff', 0.1)} position={[0, 0.148, 0.006]} />
              <mesh geometry={boxGeo(0.52, 0.29, 0.001)} material={additiveGlow('#00e5ff', 0.05)} position={[0, 0.148, 0.008]} />`,
    `              <mesh geometry={boxGeo(0.42, 0.23, 0.0008)} material={additiveGlow('#00e5ff', 0.1)} position={[0, 0.148, 0.006]} />
              <mesh geometry={boxGeo(0.34, 0.19, 0.001)} material={additiveGlow('#00e5ff', 0.06)} position={[0, 0.148, 0.008]} />`,
  ],
  // 2. Reconnect the screen assembly: hinge now lands on the deck rear edge
  //    (deck top 0.014, back -0.12) instead of floating behind the base.
  [
    'screen group origin',
    `<group position={[0, 0.011, -0.17]} rotation={[-0.55, 0, 0]}>`,
    `<group position={[0, 0.004, -0.135]} rotation={[-0.55, 0, 0]}>`,
  ],
  // 3. Seat the bottom-bezel glow strip on the bezel (below screen edge 0.033),
  //    not floating in the gap under the lid.
  [
    'bottom bezel glow strip',
    `<mesh geometry={boxGeo(0.42, 0.002, 0.0005)} material={glowMaterial('#bfdcff', 0.9)} position={[0, 0.0175, 0.0082]} />`,
    `<mesh geometry={boxGeo(0.42, 0.002, 0.0005)} material={glowMaterial('#bfdcff', 0.9)} position={[0, 0.031, 0.0045]} />`,
  ],
  // 4. Top bezel bar: lower it so it sits inside the lid (lid top 0.268).
  [
    'top bezel bar',
    `<mesh geometry={boxGeo(0.44, 0.026, 0.004)} material={bezelMat} position={[0, 0.257, 0.0045]} />`,
    `<mesh geometry={boxGeo(0.44, 0.024, 0.004)} material={bezelMat} position={[0, 0.254, 0.0045]} />`,
  ],
]

let failed = false
for (const [name, old, next] of patches) {
  const count = src.split(old).length - 1
  if (count !== 1) {
    console.error(`✗ ${name}: expected exactly 1 match, found ${count}`)
    failed = true
    continue
  }
  src = src.replace(old, next)
  console.log(`✓ ${name}`)
}

if (failed) {
  console.error('\nAborting — no changes written.')
  process.exit(1)
}

writeFileSync(file, src)
console.log(`\nWrote ${file}`)
