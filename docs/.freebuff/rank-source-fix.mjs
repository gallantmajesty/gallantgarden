// Make Profile.tsx read xp/premiumXp/rankXp from the profile store (source of
// truth) instead of the magnet store's mirror, so every surface agrees.
import fs from 'node:fs'

const p = 'src/screens/Profile.tsx'
let s = fs.readFileSync(p, 'utf8')

const replacements = [
  ['useMagnet((s) => s.data.xp)', 'useProfile((s) => s.xp)'],
  ['useMagnet((s) => s.data.premiumXp)', 'useProfile((s) => s.premiumXp)'],
  ['useMagnet((s) => s.data.rankXp)', 'useProfile((s) => s.rankXp)'],
]

let count = 0
for (const [from, to] of replacements) {
  const parts = s.split(from)
  if (parts.length > 1) {
    count += parts.length - 1
    s = parts.join(to)
  }
}

fs.writeFileSync(p, s)
console.log(`Applied ${count} replacements to ${p}`)
