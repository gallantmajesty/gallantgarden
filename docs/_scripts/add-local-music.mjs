// One-off generator: adds a preset entry per local MP3 in public/audio/cozy/
// plus the standalone downloads, then inserts them into presets.ts.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const presetsPath = path.join(root, 'src/lib/music/presets.ts')

const TINTS = [
  ['#5a3a1f', '#8a6b3f'],
  ['#4a2f1a', '#7a5533'],
  ['#3f2a1c', '#6b4a30'],
  ['#4a3520', '#7a5f3a'],
  ['#55301a', '#8a5a35'],
  ['#3d2b18', '#6e5330'],
]

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function titleCase(s) {
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// name from filename: strip extension, drop trailing numeric track id
function displayName(file) {
  let base = file.replace(/\.mp3$/i, '')
  base = base.replace(/[-_]\d+$/, '') // trailing track id like -517090
  return titleCase(base)
}

function entry(file, idx) {
  const name = displayName(file)
  const tint = TINTS[idx % TINTS.length]
  return `  {
    id: 'local-${slug(file.replace(/\.mp3$/i, ''))}',
    name: '${name.replace(/'/g, "\\'")}',
    subtitle: 'Coffee-shop lofi · your music',
    glyph: '🎧',
    tint: ['${tint[0]}', '${tint[1]}'],
    source: { kind: 'loop', url: '/audio/cozy/${file}' },
    available: true,
  },`
}

const dir = path.join(root, 'public/audio/cozy')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).sort()

const extra = [
  { file: 'Where_Sunlight_Meets_Stone.mp3', name: 'Where Sunlight Meets Stone' },
  { file: 'Walk_Beneath_the_Ancient_Arch.mp3', name: 'Walk Beneath the Ancient Arch' },
  { file: 'Sunday_Morning_Parchment.mp3', name: 'Sunday Morning Parchment' },
]

const lines = [
  '',
  '  // ── Your coffee-shop lofi library (local files, public/audio/cozy/) ────',
  ...files.map((f, i) => entry(f, i)),
  ...extra.map((e, i) => `  {
    id: 'local-${slug(e.file.replace(/\.mp3$/i, ''))}',
    name: '${e.name}',
    subtitle: 'Your music · local file',
    glyph: '🎧',
    tint: ['${TINTS[(i + 2) % TINTS.length][0]}', '${TINTS[(i + 2) % TINTS.length][1]}'],
    source: { kind: 'loop', url: '/audio/${e.file}' },
    available: true,
  },`),
  '',
]

let src = fs.readFileSync(presetsPath, 'utf8')
const anchor = ']\n\nexport function getPreset'
if (!src.includes(anchor)) {
  console.error('anchor not found — aborting')
  process.exit(1)
}
src = src.replace(anchor, lines.join('\n') + anchor)
fs.writeFileSync(presetsPath, src)
console.log(`inserted ${files.length + extra.length} local presets into ${presetsPath}`)
