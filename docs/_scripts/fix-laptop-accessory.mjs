// Fixes two review findings in ../src/avatar/Accessories.tsx:
//  1. brushedMetalMaterial shared a single cached CanvasTexture; each call
//     mutated repeat on the same instance, so every brushed part ended up with
//     whatever repeat was set last. Fix: clone the texture per material.
//  2. The warm table-spill plane had rotation [-PI/2,0,0], which turns the
//     flat box into a 0.2-tall vertical wall. Fix: drop the rotation.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(here, '..', '..', 'src', 'avatar', 'Accessories.tsx')
let src = readFileSync(file, 'utf8')

const patches = [
  [
    'brushed texture clone',
    `function brushedMetalMaterial(hex: string, rough: number, metal: number, rx: number, ry: number) {
  return laptopMaterial(\`brush:\${hex}:\${rough}:\${metal}:\${rx}:\${ry}\`, () => {
    const t = brushedMetalTex()
    t.repeat.set(rx, ry)
    return new MeshStandardMaterial({ color: hex, map: t, roughness: rough, metalness: metal })
  })
}`,
    `function brushedMetalMaterial(hex: string, rough: number, metal: number, rx: number, ry: number) {
  return laptopMaterial(\`brush:\${hex}:\${rough}:\${metal}:\${rx}:\${ry}\`, () => {
    // Clone the shared grain texture per material so each chassis part keeps
    // its own repeat — mutating the cached texture would clobber all parts.
    const t = brushedMetalTex().clone()
    t.needsUpdate = true
    t.repeat.set(rx, ry)
    return new MeshStandardMaterial({ color: hex, map: t, roughness: rough, metalness: metal })
  })
}`,
  ],
  [
    'table spill rotation',
    `            <mesh geometry={boxGeo(0.5, 0.0015, 0.2)} material={additiveGlow('#ffb066', 0.14)} position={[0, -0.0005, 0.22]} rotation={[-Math.PI / 2, 0, 0]} />`,
    `            <mesh geometry={boxGeo(0.5, 0.0015, 0.2)} material={additiveGlow('#ffb066', 0.14)} position={[0, -0.0005, 0.22]} />`,
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
