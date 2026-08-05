import { readFileSync, writeFileSync } from 'fs'

const FILE = 'C:/Users/taksh/studyforest/src/avatar/AvatarRig.tsx'
const raw = readFileSync(FILE, 'utf8')
const crlf = raw.includes('\r\n')
let src = raw.replace(/\r\n/g, '\n')

let applied = 0
function replace(oldStr, newStr, label) {
  if (!src.includes(oldStr)) {
    console.error(`MISS: ${label}`)
    return
  }
  src = src.split(oldStr).join(newStr)
  applied++
  console.log(`ok: ${label}`)
}

// 1. Smile — move forward onto the muzzle surface (muzzle front at smile height ~1.13r)
replace(
  `          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.04]} />`,
  `          position={[dx * r, -r * 0.46 + Math.abs(dx) * r * 0.7, r * 1.17]} />`,
  'smile z forward'
)

// 2. Lower lip — nudge forward so it reads on the muzzle
replace(
  `      {/* lower lip for a fuller smile */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.52, r * 1.0]} />`,
  `      {/* lower lip for a fuller smile */}
      <mesh geometry={sphereGeo(1)} material={belly} scale={[r * 0.18, r * 0.05, r * 0.08]} position={[0, -r * 0.52, r * 1.12]} />`,
  'lower lip z forward'
)

// 3. MonkeyTail — drop the unused dark param
replace(
  `function MonkeyTail({ P, fur, dark, belly }: { P: Proportions; fur: Mat; dark: Mat; belly: Mat }) {`,
  `function MonkeyTail({ P, fur, belly }: { P: Proportions; fur: Mat; belly: Mat }) {`,
  'tail drop dark param'
)

replace(
  `              <MonkeyTail P={P} fur={monkeyFur} dark={monkeyDark} belly={monkeyBelly} />`,
  `              <MonkeyTail P={P} fur={monkeyFur} belly={monkeyBelly} />`,
  'tail call drop dark prop'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/4 patches applied`)
