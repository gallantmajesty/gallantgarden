// Removes the rgbCol const that became unused after the per-key hot-spot patch.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const file = path.resolve(here, '..', '..', 'src', 'avatar', 'Accessories.tsx')
let src = readFileSync(file, 'utf8')

const old = `      const rgbCol = (c: number, r: number) => RGB_WAVE[(c + r * 2) % RGB_WAVE.length]
      // Sculpted dish material shared by every cap (concave radial shading).`
const next = `      // Sculpted dish material shared by every cap (concave radial shading).`

const count = src.split(old).length - 1
if (count !== 1) {
  console.error(`expected exactly 1 match, found ${count} — aborting`)
  process.exit(1)
}
src = src.replace(old, next)
writeFileSync(file, src)
console.log('✓ removed unused rgbCol')
