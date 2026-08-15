import { useMemo } from 'react'
import { ACCESSORIES, type AccessoryId } from '../../avatar/config'
import { useAvatar } from '../../avatar/store'
import { getTarget, useRealmNet } from '../../multiplayer/net'
import { useWorld } from '../../store/world'
import { InstancedAccessoryBatch, type PlacedAccessory } from '../library/InstancedAccessories'
import { chineseCafeSeatAnchors, type CafeSeat } from './layout'

function tablePose(seat: CafeSeat): { position: [number, number, number]; rotationY: number } {
  let tableX = seat.pos[0]
  let tableY: number
  const tableZ = seat.pos[2]

  if (seat.zone === 'communal') {
    tableX += seat.pos[0] < -8.4 ? 1.15 : -1.15
    tableY = 0.94
  } else if (seat.zone === 'booth') {
    tableX += seat.pos[0] < 14.8 ? 0.78 : -0.78
    tableY = 0.93
  } else if (seat.zone === 'window') {
    tableX = -19.18
    tableY = 0.9
  } else if (seat.zone === 'garden') {
    // round garden tables sit at x = -8.5; the accessory goes on the disc,
    // offset toward the table centre from the seat side
    const toward = seat.pos[0] < -8.5 ? 1 : -1
    tableX = seat.pos[0] + toward * 0.6
    tableY = 0.9
  } else {
    const deskX = seat.pos[0] < 0 ? -8.2 : 8.2
    tableX += seat.pos[0] < deskX ? 0.62 : -0.62
    tableY = 6.18
  }

  return {
    position: [tableX, tableY, tableZ],
    rotationY: -seat.yaw + Math.PI,
  }
}

export function ChineseCafeTableAccessories() {
  const seats = useMemo(() => chineseCafeSeatAnchors(), [])
  const localAccessories = useAvatar((state) => state.config.accessories)
  const localSeatId = useWorld((state) => state.seat)
  const roster = useRealmNet((state) => state.roster)

  const placements = useMemo<PlacedAccessory[]>(() => {
    const equippedBySeat = new Map<number, string[]>()
    if (localSeatId != null && localAccessories?.length) {
      equippedBySeat.set(localSeatId, localAccessories)
    }

    for (const player of Object.values(roster)) {
      const target = getTarget(player.id)
      if (!target?.seated || target.seatId == null || !player.avatar.accessories?.length) continue
      equippedBySeat.set(target.seatId, player.avatar.accessories)
    }

    const result: PlacedAccessory[] = []
    for (const [seatId, equipped] of equippedBySeat) {
      const seat = seats[seatId]
      if (!seat) continue
      const accessory = equipped.find((id) => ACCESSORIES.some((definition) => definition.id === id)) as AccessoryId | undefined
      if (!accessory) continue
      const pose = tablePose(seat)
      result.push({ kind: accessory, seatId, ...pose })
    }
    return result
  }, [localAccessories, localSeatId, roster, seats])

  return <InstancedAccessoryBatch placements={placements} />
}
