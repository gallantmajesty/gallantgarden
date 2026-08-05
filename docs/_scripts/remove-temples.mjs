// Remove the floating black glasses temple arms (their tips poke through the
// head surface near the eyes). CRLF-aware.
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const src = readFileSync(FILE, 'utf8')
const isCrlf = src.includes('\r\n')
const norm = src.replace(/\r\n/g, '\n')

const old = `            {/* temple arm back along the head */}
            <mesh geometry={boxGeo(r * 0.028, r * 0.02, r * 0.4)} material={glasses ?? sharedMaterial('#17171d', 0.18, 0.7)}
              position={[sx * r * 0.7, r * 0.24, r * 0.85]} rotation={[0.4, 0, 0]} />
`
if (!norm.includes(old)) {
  console.error('TEMPLE ARM PATTERN NOT FOUND')
  process.exit(1)
}
const out = norm.replace(old, '')
writeFileSync(FILE, isCrlf ? out.replace(/\n/g, '\r\n') : out, 'utf8')
console.log('Temple arms removed')
