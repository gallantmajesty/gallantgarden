import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/screens/Realm.tsx'
let src = readFileSync(path, 'utf8')
let applied = 0

const edits = [
  {
    from: `          const rows = occ[r.id] ?? []
          const theme = roomTheme(r.id)
          // Each room hosts its own small cast of ambient scholars (max 30,
          // different headcount per hall) — always present, so every room shows
          // its own live number.
          const npc = npcOnlineCount(roomIdx, Date.now())
          const here = totalOccupants(rows) + npc
          const instances = rows.length
          const lead = (rows.find((x) => x.instance === 1)?.count ?? 0) + npc
          const full = instances > 0 && rows.every((x) => x.count + npc >= REALM_CAPACITY)
          // Live mood of the room, from the scholars actually there right now.
          const mood = here < 6 ? { label: 'Quiet', cls: 'muted' } : here < 15 ? { label: 'Focused', cls: '' } : { label: 'Lively', cls: 'hot' }`,
    to: `          const rows = occ[r.id] ?? []
          const theme = roomTheme(r.id)
          const here = totalOccupants(rows)
          const instances = rows.length
          const lead = rows.find((x) => x.instance === 1)?.count ?? 0
          const full = instances > 0 && rows.every((x) => x.count >= REALM_CAPACITY)
          // Live mood of the room, from the people actually there right now.
          const mood = here < 6 ? { label: 'Quiet', cls: 'muted' } : here < 15 ? { label: 'Focused', cls: '' } : { label: 'Lively', cls: 'hot' }`,
  },
  {
    from: `import { npcOnlineCount } from '../lib/npcSystem'\n`,
    to: ``,
  },
]

for (const e of edits) {
  if (!src.includes(e.from)) {
    console.error('NOT FOUND:\n---\n' + e.from.slice(0, 200) + '\n---')
    continue
  }
  src = src.replace(e.from, e.to)
  applied++
}
writeFileSync(path, src, 'utf8')
console.log(`Applied ${applied}/${edits.length} edits`)
