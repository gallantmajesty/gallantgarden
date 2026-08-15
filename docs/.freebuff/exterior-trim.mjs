import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/store/settings.ts'
let src = readFileSync(path, 'utf8')
let applied = 0

const edits = [
  {
    from: `    rainScale: 0.3 + 0.7 * vd,
    rainDrops: Math.round(50 + 150 * vd),
    forest: Math.round(35 + 165 * vd),
    mountains: Math.round(18 + 22 * vd),
    clouds: Math.round(4 + 5 * vd),`,
    to: `    // PERF (exterior-only, interior look identical): rain, pines, peaks and
    // clouds are all BEHIND the glazing — visible only through the windows — so
    // their counts are trimmed without touching anything inside the hall.
    rainScale: 0.3 + 0.7 * vd,
    rainDrops: Math.round(40 + 110 * vd),
    forest: Math.round(35 + 120 * vd),
    mountains: Math.round(18 + 16 * vd),
    clouds: Math.round(4 + 4 * vd),`,
  },
]

for (const e of edits) {
  if (!src.includes(e.from)) {
    console.error('NOT FOUND:\r\n---\r\n' + e.from.slice(0, 200) + '\r\n---')
    continue
  }
  src = src.replace(e.from, e.to)
  applied++
}
writeFileSync(path, src, 'utf8')
console.log(`Applied ${applied}/${edits.length} edits`)
