const fs = require('fs')
const path = require('path')
const hits = []
let scanned = 0
function walk(d, depth) {
  if (depth > 6) return
  let ents
  try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { return }
  for (const ent of ents) {
    const p = path.join(d, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === '.vite' || ent.name === '.bin' || ent.name === '@types') continue
      walk(p, depth + 1)
    } else if (/\.(js|cjs|mjs)$/.test(ent.name) && !ent.name.includes('.min.')) {
      try {
        const c = fs.readFileSync(p, 'utf8')
        if (c.length > 3000000) continue
        scanned++
        let i = 0
        while ((i = c.indexOf('MeshStandardMaterial(', i)) !== -1) {
          const before = c.slice(Math.max(0, i - 40), i)
          if (!/new\s*$/.test(before) && !/\.MeshStandardMaterial\s*$/.test(before) && !/extend\(\s*$/.test(before)) {
            hits.push(p.replace(/\\/g, '/') + ' ...' + before.slice(-40) + ' >>>')
          }
          i += 1
        }
      } catch (e) {}
    }
  }
}
walk('node_modules', 0)
console.log('files scanned:', scanned)
console.log(hits.length ? hits.join('\n') : 'NO BARE CALLS IN node_modules')
