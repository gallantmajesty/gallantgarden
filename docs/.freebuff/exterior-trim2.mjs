import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/store/settings.ts'
let src = readFileSync(path, 'utf8')

const NL = '\r\n'

const from = [
  '    rainScale: 0.3 + 0.7 * vd,',
  '    rainDrops: Math.round(50 + 150 * vd),',
  '    forest: Math.round(35 + 165 * vd),',
  '    mountains: Math.round(18 + 22 * vd),',
  '    clouds: Math.round(4 + 5 * vd),',
].join(NL)

const to = [
  '    // PERF (exterior-only, interior look identical): rain, pines, peaks and',
  '    // clouds are all BEHIND the glazing — visible only through the windows — so',
  '    // their counts are trimmed without touching anything inside the hall.',
  '    rainScale: 0.3 + 0.7 * vd,',
  '    rainDrops: Math.round(40 + 110 * vd),',
  '    forest: Math.round(35 + 120 * vd),',
  '    mountains: Math.round(18 + 16 * vd),',
  '    clouds: Math.round(4 + 4 * vd),',
].join(NL)

if (!src.includes(from)) {
  console.error('NOT FOUND — dumping context:')
  const i = src.indexOf('rainDrops: Math.round')
  console.error(JSON.stringify(src.slice(i - 30, i + 160)))
  process.exit(1)
}

src = src.replace(from, to)
writeFileSync(path, src, 'utf8')
console.log('Applied 1/1 edits')
