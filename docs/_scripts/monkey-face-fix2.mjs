import { readFileSync, writeFileSync } from 'node:fs'

const p = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
let src = readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const edits = [
  {
    from: `position={[sx * r * 0.3, r * 0.2, r * 1.02]}\n          rotation={[0, 0, sx * 0.3]} />`,
    to: `position={[sx * r * 0.3, r * 0.2, r * 1.07]}\n          rotation={[0, 0, sx * 0.3]} />`,
  },
  {
    from: `position={[0, -r * 0.46, r * 1.0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]} />`,
    to: `position={[0, -r * 0.46, r * 1.04]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]} />`,
  },
]

let n = 0
for (const { from, to } of edits) {
  if (!src.includes(from)) throw new Error('anchor not found: ' + JSON.stringify(from))
  src = src.split(from).join(to)
  n++
}
writeFileSync(p, src.replace(/\n/g, '\r\n'), 'utf8')
console.log('OK, applied:', n)
