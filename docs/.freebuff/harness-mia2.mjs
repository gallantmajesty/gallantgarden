// ShotHarness: when bg=warm, keep the WebGL canvas transparent (no opaque scene
// background) so the warm CSS gradient + character can be composited into a
// thumbnail. Default (dark) behavior unchanged.
import { readFileSync, writeFileSync } from 'node:fs'

const p = 'src/screens/ShotHarness.tsx'
let s = readFileSync(p, 'utf8')
const eol = s.includes('\r\n') ? '\r\n' : '\n'
let text = s.replace(/\r\n/g, '\n')

const pairs = [
  ["        gl={{ antialias: true, preserveDrawingBuffer: true }}",
   "        gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}"],
  ["        <color attach=\"background\" args={['#1a1430']} />",
   "        {params.get('bg') !== 'warm' && <color attach=\"background\" args={['#1a1430']} />}"],
]

for (const [from, to] of pairs) {
  if (!text.includes(from)) {
    console.error('MISS:', JSON.stringify(from.slice(0, 80)))
    process.exit(1)
  }
  text = text.split(from).join(to)
}

writeFileSync(p, text.split('\n').join(eol))
console.log('patched ShotHarness.tsx (transparent warm mode)')
