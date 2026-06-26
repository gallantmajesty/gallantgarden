// Geometry for the train CARRIAGE interior — the cosy cabin you study in once a
// journey begins. Its own little coordinate world (independent of the station):
// the carriage runs along Z, the direction of travel is +Z (the world streams
// toward you out the windows), the floor is at y = 0. Seats face forward toward
// the panoramic front glass with a small study table, a reading lamp and a warm
// window at their shoulder — the "watch the journey unfold" study nook.
//
// The seat INDEX a player picks while boarding (store: confirmBoard(seat)) maps
// straight into SEATS[index], so the seat they chose on the boarding card is the
// seat they wake up in — and the same index is broadcast to other passengers for
// shared, synced seating.

import type { Seat } from '../library/furniture'

export const CARRIAGE = {
  halfW: 2.3, // interior half-width (X)
  z0: -11, // rear wall
  z1: 11, // front wall (panoramic glass)
  floorY: 0,
  ceilY: 2.5,
  /** two seating columns either side of a central aisle */
  colX: 1.45,
  aisleHalf: 0.55,
}

/** Five rows × two columns = ten study seats per carriage, all facing forward
 *  (+Z). Window seats sit against the side glass; the aisle runs up the middle. */
export const ROWS = 5
export const COLS = 2
export const ROW_DZ = 4.0
const ROW_Z0 = -7.5

/** Forward-facing: a seated camera at yaw = π looks down +Z, into the world ahead. */
const FACING_YAW = Math.PI

export interface CarriageSeat extends Seat {
  col: 0 | 1 // 0 = left (−X), 1 = right (+X)
  row: number
}

export function carriageSeats(): CarriageSeat[] {
  const out: CarriageSeat[] = []
  let id = 0
  for (let r = 0; r < ROWS; r++) {
    const z = ROW_Z0 + r * ROW_DZ
    for (let c = 0; c < COLS; c++) {
      const x = c === 0 ? -CARRIAGE.colX : CARRIAGE.colX
      out.push({ id: id++, pos: [x, 0, z], yaw: FACING_YAW, col: c as 0 | 1, row: r })
    }
  }
  return out
}

/** The little study table that sits in front of each seat. */
export function seatTable(seat: CarriageSeat): { pos: [number, number, number] } {
  return { pos: [seat.pos[0], 0, seat.pos[2] + 0.9] }
}

/** Window centres down each side wall, aligned to the seat rows. */
export function carriageWindows(): { pos: [number, number, number]; side: -1 | 1 }[] {
  const out: { pos: [number, number, number]; side: -1 | 1 }[] = []
  for (let r = 0; r < ROWS; r++) {
    const z = ROW_Z0 + r * ROW_DZ + 0.4
    out.push({ pos: [-CARRIAGE.halfW, 1.35, z], side: -1 })
    out.push({ pos: [CARRIAGE.halfW, 1.35, z], side: 1 })
  }
  return out
}

/** Where the player stands the instant they board, before choosing/taking a seat
 *  (the rear vestibule, looking up the aisle). */
export const VESTIBULE = { pos: [0, 0, CARRIAGE.z0 + 1.4] as [number, number, number], yaw: Math.PI }
