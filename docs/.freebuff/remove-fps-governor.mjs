import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/three/library/LibraryScene.tsx'
let src = readFileSync(path, 'utf8')

let applied = 0

// 1) Remove the <FpsGovernor /> mount.
const mount = '       <FpsGovernor />\n'
if (src.includes(mount)) {
  src = src.replace(mount, '')
  applied++
} else {
  console.error('MOUNT NOT FOUND')
}

// 2) Remove the whole FpsGovernor component + its doc comment,
//    keeping RenderHeartbeat intact.
const startMarker = '/**\n * Live FPS governor'
const endMarker = 'function RenderHeartbeat() {'
const s = src.indexOf(startMarker)
const e = src.indexOf(endMarker)
if (s !== -1 && e !== -1 && e > s) {
  src = src.slice(0, s) + src.slice(e)
  applied++
} else {
  console.error('COMPONENT BOUNDS NOT FOUND', s, e)
}

writeFileSync(path, src, 'utf8')
console.log(`Applied ${applied}/2 edits`)
