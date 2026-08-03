// Renders equipped accessories placed ON the library table surface for each
// seated player. Each accessory appears in front of the seat, sitting on the
// tabletop — replacing the old AccessoryTray that floated at the avatar's feet.
//
// Rendering is delegated to InstancedAccessoryBatch: seats near the camera keep
// the full original AccessoryModel (text, lights, shadows) while distant seats
// are drawn from a handful of merged InstancedMeshes — identical appearance,
// a fraction of the draw calls at 100+ players.
import { useMemo } from 'react'
import { ACCESSORIES, type AccessoryId } from '../../avatar/config'
import { useAvatar } from '../../avatar/store'
import { useWorld } from '../../store/world'
import { seatAnchors, TABLE } from './furniture'
import { getTarget, useRealmNet } from '../../multiplayer/net'
import { InstancedAccessoryBatch, type PlacedAccessory } from './InstancedAccessories'

// Table top Y = floor (0) + table height (0.95) + top slab (0.12) = 1.07
const TABLE_TOP_Y = TABLE.h + 0.12
// Extra clearance so the accessory sits just above the sigil / rune inlay
const ELEVATION = 0.02
// Inward offset from the table edge toward the centre (metres) so the item
// doesn't hover over the edge where it clips the brass trim.
const EDGE_INSET = 0.35

export function TableAccessories() {
  const seats = useMemo(() => seatAnchors(), [])
  const localAccessories = useAvatar((s) => s.config.accessories)
  const localSeatId = useWorld((s) => s.seat)
  const roster = useRealmNet((s) => s.roster)

  // Build a seatId → accessory placement for every seated player. Recomputes
  // only on join/leave/seat changes (the roster slice is stable across moves),
  // so accessory rendering stays quiet while players walk around.
  const placements = useMemo<PlacedAccessory[]>(() => {
    const map = new Map<number, string[]>()

    // Local player
    if (localSeatId != null && localAccessories && localAccessories.length > 0) {
      map.set(localSeatId, localAccessories)
    }

    // Remote players — match their position to the nearest seat.
    const entries = Object.values(roster)
    for (const p of entries) {
      const t = getTarget(p.id)
      if (!t || !t.seated || !p.avatar?.accessories || p.avatar.accessories.length === 0) continue
      let bestSeat = -1
      let bestDist = Infinity
      for (let i = 0; i < seats.length; i++) {
        const s = seats[i]
        const dx = t.x - s.pos[0]
        const dz = t.z - s.pos[2]
        const d = dx * dx + dz * dz
        if (d < bestDist) { bestDist = d; bestSeat = i }
      }
      if (bestSeat >= 0 && bestDist < 4) {
        map.set(bestSeat, p.avatar.accessories)
      }
    }

    const list: PlacedAccessory[] = []
    for (const [seatId, accessories] of map) {
      const seat = seats[seatId]
      if (!seat) continue
      const accIds = accessories.filter((a) => ACCESSORIES.some((d) => d.id === a)) as AccessoryId[]
      if (accIds.length === 0) continue

      // Place the accessory on the table in front of this seat.
      // Seat yaw > 0 means left side of table (facing right), so offset toward
      // table centre (inward from the left edge). Vice versa for right side.
      const tableX = seat.pos[0] + (seat.yaw > 0 ? -1 : 1) * (TABLE.w / 2 - EDGE_INSET)
      const tableZ = seat.pos[2]

      // Render the first equipped accessory on the table (max 1 shown).
      // Rotate 180° from the seat direction so the accessory faces the user.
      list.push({
        kind: accIds[0],
        seatId,
        position: [tableX, TABLE_TOP_Y + ELEVATION, tableZ],
        rotationY: -seat.yaw + Math.PI,
      })
    }
    return list
  }, [localSeatId, localAccessories, roster, seats])

  return <InstancedAccessoryBatch placements={placements} />
}
