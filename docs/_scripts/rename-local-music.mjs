// Renames the local-* preset entries in presets.ts to random cozy names.
// Deterministic: a seeded shuffle of the name pool, assigned in file order.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const presetsPath = path.join(root, 'src/lib/music/presets.ts')

const POOL = [
  'Golden Hour', 'Velvet Dusk', 'Rainy Window', 'Cinnamon Café', 'Moonlit Study',
  'Amber Afternoon', 'Slow Morning', 'Hazel Grove', 'Quiet Pages', 'Fireside',
  'Cloud Nine', 'Soft Focus', 'Paper Lantern', 'Lavender Haze', 'Warm Blanket',
  'Night Owl', 'Daydream', 'Gentle Current', 'Sunbeam', 'Cozy Corner',
  'Whisper', 'Tranquil', 'Mossy Path', 'Maple Breeze', 'Candlelight',
  'Starlit', 'Porch Swing', 'Honeyed', 'Wind Chime', 'Morning Dew',
  'Fern & Fog', 'Pine Scent', 'Bookmark', 'Inkwell', 'Lamplit',
  'Willow', 'Meadow', 'Brook', 'Hearth', 'Solstice',
]

// Seeded PRNG (mulberry32) so the "random" names are stable across runs.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(20260811)
const shuffled = [...POOL]
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1))
  ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
}

const src = fs.readFileSync(presetsPath, 'utf8')
const lines = src.split('\n')

let count = 0
let localIdx = 0
for (let i = 0; i < lines.length; i++) {
  if (/^\s+id: 'local-/.test(lines[i])) {
    // find the name: line in this entry (within the next 8 lines)
    for (let j = i + 1; j < i + 9 && j < lines.length; j++) {
      if (/^\s+name: /.test(lines[j])) {
        const name = shuffled[localIdx % shuffled.length] ?? 'Cozy Track'
        lines[j] = `    name: '${name}',`
        localIdx++
        count++
        break
      }
    }
  }
}

fs.writeFileSync(presetsPath, lines.join('\n'))
console.log(`renamed ${count} local presets`)
