// Disable ContactShadows when bg=warm so thumbnails have a clean alpha channel
// (no dark blob over the warm gradient) — matching the original James/Lily shots.
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'C:/Users/taksh/studyforest/src/screens/ShotHarness.tsx'
let s = readFileSync(file, 'utf8')

const before = `          <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={3} blur={2.4} far={2} resolution={256} color="#1a1430" />`
const after = `          {params.get('bg') !== 'warm' && (
            <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={3} blur={2.4} far={2} resolution={256} color="#1a1430" />
          )}`

if (!s.includes(before)) {
  console.log('ANCHOR NOT FOUND — current ContactShadows line:')
  const i = s.indexOf('ContactShadows')
  console.log(JSON.stringify(s.slice(i - 40, i + 200)))
  process.exit(1)
}
s = s.replace(before, after)
writeFileSync(file, s)
console.log('patched: ContactShadows now skipped when bg=warm')
