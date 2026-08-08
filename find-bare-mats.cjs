const fs = require('fs')
const path = require('path')
const roots = [
  'node_modules/@react-three/drei',
  'node_modules/three-stdlib',
  'node_modules/n8ao',
  'node_modules/troika-three-text',
  'node_modules/troika-three-utils',
  'node_modules/meshline',
  'node_modules/stats-gl',
  'node_modules/camera-controls',
  'node_modules/three-mesh-bvh',
  'node_modules/maath',
  'node_modules/@monogrid/gainmap-js',
  'node_modules/ogl',
]
const hits = []
function walk(d) {
  let ents
  try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { return }
  for (const ent of ents) {
    const p = path.join(d, ent.name)
    if (ent.isDirectory()) {
      if (ent.name !== 'node_modules' && ent.name !== '.vite') walk(p)
    } else if (/\.(js|cjs|mjs)$/.test(ent.name)) {
      try {
        const c = fs.readFileSync(p, 'utf8')
        if (c.length > 2000000) continue
        let i = 0
        while ((i = c.indexOf('MeshStandardMaterial(', i)) !== -1) {
          const before = c.slice(Math.max(0, i - 60), i)
          if (!/new\s*$/.test(before)) {
            hits.push(p.replace(/\\/g, '/') + '  ...' + before.slice(-60) + ' >>> MeshStandardMaterial(')
          }
          i += 1
        }
      } catch (e) {}
    }
  }
}
roots.forEach(walk)
console.log(hits.length ? hits.join('\n') : 'NO BARE CALLS FOUND')
