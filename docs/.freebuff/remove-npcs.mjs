import { readFileSync, writeFileSync } from 'node:fs'

function patch(path, edits) {
  let src = readFileSync(path, 'utf8')
  let applied = 0
  for (const e of edits) {
    if (!src.includes(e.from)) {
      console.error(`NOT FOUND in ${path}:\n---\n${e.from.slice(0, 200)}\n---`)
      continue
    }
    src = src.replace(e.from, e.to)
    applied++
  }
  writeFileSync(path, src, 'utf8')
  return applied
}

// ── 1) LibraryScene — stop rendering the NPC rigs ───────────────────────────
const libScene = 'src/three/library/LibraryScene.tsx'
const n1 = patch(libScene, [
  {
    from: `       <ToggleGroup group="remotePlayers">\n         <RemotePlayers />\n         <NpcPlayers roomId={roomId} />\n       </ToggleGroup>`,
    to: `       <ToggleGroup group="remotePlayers">\n         <RemotePlayers />\n       </ToggleGroup>`,
  },
  {
    from: `import { RemotePlayers } from './RemotePlayers'\nimport { NpcPlayers } from './NpcPlayers'\n`,
    to: `import { RemotePlayers } from './RemotePlayers'\n`,
  },
])

// ── 2) Explore — NPCs no longer block seats in the picker ──────────────────
const explore = 'src/screens/Explore.tsx'
const n2 = patch(explore, [
  {
    from: `      const occupied = { ...remote }
      // NPC scholars sitting at their permanent desks show up as occupants too,
      // so the seat picker never offers a seat an online NPC owns — and the
      // NPCs never move because of a player.
      const roomIdx = libraryRoomIndex(useRealm.getState().active?.roomId)
      if (roomIdx >= 0) {
        const seats = useSeatFlow.getState().seats
        const mySeat = useWorld.getState().seat
        const npcs = npcOnlineInRoom(roomIdx, Date.now())
        const takenByUser = new Set<number>(Object.keys(remote).map(Number))
        if (mySeat != null) takenByUser.add(mySeat)
        const assignments = assignNpcSeats(
          npcs.map((n) => n.idx),
          seats,
          takenByUser,
        )
        for (const npc of npcs) {
          const seat = assignments.get(npc.idx)
          if (seat && !occupied[seat.id]) occupied[seat.id] = npc.name
        }
      }
      useSeatFlow.getState().setOccupied(occupied)`,
    to: `      const occupied = { ...remote }
      useSeatFlow.getState().setOccupied(occupied)`,
  },
  {
    from: `import { npcOnlineInRoom, assignNpcSeats, libraryRoomIndex } from '../lib/npcSystem'\n`,
    to: ``,
  },
])

console.log(`LibraryScene: ${n1}/2 edits, Explore: ${n2}/2 edits`)
