import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/components/ScorePanel.tsx'
let src = readFileSync(path, 'utf8')

const from = `function todayKey(): string {
  const d = new Date()
  return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`
}`
const to = from + `

/** Readable short date for a session-history ISO string ("Aug 15, 2026"). */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}`

if (!src.includes(from)) {
  console.error('ANCHOR NOT FOUND')
  process.exit(1)
}
src = src.replace(from, to)
writeFileSync(path, src, 'utf8')
console.log('Added formatDate helper')
