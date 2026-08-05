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

// 1. Pass crease into the component
replace(
  `                    <ElephantHead P={P} main={elMain} dark={elDark} belly={elBelly} inner={elInner} tusk={elTusk} glasses={elGlasses} lens={elGlassLens} cheek={elCheek} />`,
  `                    <ElephantHead P={P} main={elMain} dark={elDark} belly={elBelly} inner={elInner} tusk={elTusk} glasses={elGlasses} lens={elGlassLens} cheek={elCheek} crease={elCrease} />`,
  'pass crease prop'
)

// 2. Destructure + type it in the signature
replace(
  `function ElephantHead({ P, main, dark, belly, inner, tusk, glasses, lens, cheek }: { P: Proportions; main: Mat; dark: Mat; belly: Mat; inner: Mat; tusk: Mat; glasses?: Mat; lens?: Mat; cheek?: Mat }) {`,
  `function ElephantHead({ P, main, dark, belly, inner, tusk, glasses, lens, cheek, crease }: { P: Proportions; main: Mat; dark: Mat; belly: Mat; inner: Mat; tusk: Mat; glasses?: Mat; lens?: Mat; cheek?: Mat; crease?: Mat }) {`,
  'destructure crease prop'
)

// 3. Use the prop in the crease meshes
replace(
  `        <mesh key={\`cr\${sx}\`} geometry={sphereGeo(1)} material={elCrease}`,
  `        <mesh key={\`cr\${sx}\`} geometry={sphereGeo(1)} material={crease ?? elCrease}`,
  'use crease prop'
)

writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src)
console.log(`\n${applied}/3 patches applied`)
