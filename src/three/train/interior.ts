// Geometry for the train CARRIAGE interior — the spacious cabin you study in
// once a journey begins. Its own little coordinate world (independent of the
// station): the carriage runs along Z, the direction of travel is +Z (the world
// streams toward you out the windows), the floor is at y = 0. Seats face forward
// toward the panoramic front glass with a study table, a reading lamp and a warm
// window at their shoulder.
//
// The seat INDEX a player picks while boarding (store: seat) maps straight into
// SEATS[index], so the seat they chose is the seat they wake up in — and the same
// index is broadcast to other passengers for shared, synced seating.
//
// Layout: 5 rows × 4 columns = 20 seats per carriage (2+2 across the aisle).
// Columns 0,1 = left side (window, aisle). Columns 2,3 = right side (aisle, window).
//
// The carriage is deliberately GRAND — wide body, tall ceiling, broad aisle and
// generous legroom — to feel like a premium observation coach. Doors open on
// BOTH sides at the rear vestibule so the player can board from either side.

import type { Seat } from '../library/furniture'

export const CARRIAGE = {
  halfW: 2.8, // interior half-width (X) — wider cabin
  z0: -11, // rear wall
  z1: 11, // front wall (panoramic glass)
  floorY: 0,
  ceilY: 3.2, // taller ceiling for a grand feel
  aisleHalf: 0.7, // wider aisle
}

// ── seat column X positions (2+2 layout) ──────────────────────────────────
// Left side:  window (−2.3),  aisle (−1.3)
// Right side: aisle (+1.3),   window (+2.3)
const COL_X = [-2.3, -1.3, 1.3, 2.3] as const

export const ROWS = 5
export const COLS = 4
export const ROW_DZ = 4.2 // more legroom
const ROW_Z0 = -7.5

/** Door opening Z-positions on both sides of the carriage (at the rear
 *  vestibule area). These are where sliding doors appear in the interior
 *  shell, aligned to the exterior train doors. */
export const DOOR_Z = [-1.5, 2.0]

/** Forward-facing: a seated camera at yaw = π looks down +Z, into the world ahead. */
const FACING_YAW = Math.PI

export interface CarriageSeat extends Seat {
  col: 0 | 1 | 2 | 3 // 0=window-left, 1=aisle-left, 2=aisle-right, 3=window-right
  row: number
}

export function carriageSeats(): CarriageSeat[] {
  const out: CarriageSeat[] = []
  let id = 0
  for (let r = 0; r < ROWS; r++) {
    const z = ROW_Z0 + r * ROW_DZ
    for (let c = 0; c < COLS; c++) {
      out.push({ id: id++, pos: [COL_X[c], 0, z], yaw: FACING_YAW, col: c as CarriageSeat['col'], row: r })
    }
  }
  return out
}

/** The little study table that sits in front of each seat-pair (left pair shares
 *  a table, right pair shares a table). */
export function seatTable(seat: CarriageSeat): { pos: [number, number, number] } {
  const sideX = seat.col <= 1 ? -1.8 : 1.8
  return { pos: [sideX, 0, seat.pos[2] + 0.9] }
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

/** Aisle walkable bounds — the corridor between the 2+2 seat columns that the
 *  player walks down to reach their seat after boarding. */
export const AISLE = {
  minX: -0.7,
  maxX: 0.7,
  minZ: CARRIAGE.z0 + 1.4,
  maxZ: CARRIAGE.z1 - 1,
}

export const AISLE_WALK_SPEED = 3.0

/** Shared ref written by InteriorController every frame so the seat glow in
 *  CarriageInterior knows which seat to highlight. null = no seat near enough. */
export const nearestSeatRef: { current: { id: number; pos: [number, number, number] } | null } = { current: null }

// ── seat occupancy state ──────────────────────────────────────────────────
// Tracks which seats are empty, taken, locked, or reserved. In single-player
// this is simple; multiplayer syncs via Realtime events later.

export type SeatState = 'empty' | 'taken' | 'locked' | 'reserved'

export interface SeatOccupancy {
  playerId: string
  displayName: string
  seatIndex: number
  state: SeatState
}

let _seatMap = new Map<number, SeatOccupancy>()

export function getSeatMap(): Map<number, SeatOccupancy> { return _seatMap }
export function resetSeatMap(): void { _seatMap.clear() }

export function isSeatTaken(index: number): boolean {
  const occ = _seatMap.get(index)
  return occ !== undefined && (occ.state === 'taken' || occ.state === 'locked')
}

export function claimSeat(index: number, playerId: string, displayName: string): boolean {
  const occ = _seatMap.get(index)
  if (occ && (occ.state === 'taken' || occ.state === 'locked')) return false
  _seatMap.set(index, { playerId, displayName, seatIndex: index, state: 'taken' })
  return true
}

export function releaseSeat(index: number): void {
  _seatMap.delete(index)
}

/** Lock every occupied seat — called when doors close and the journey begins. */
export function lockAllSeats(): void {
  for (const [idx, occ] of _seatMap) {
    if (occ.state === 'taken') _seatMap.set(idx, { ...occ, state: 'locked' })
  }
}

/** Find a free seat preferring window columns (0 or 3), then any empty seat.
 *  Returns the seat index or -1 if the carriage is full. */
export function findFreeSeat(): number {
  const seats = carriageSeats()
  // pass 1: window seats (col 0 or 3)
  for (const s of seats) {
    if ((s.col === 0 || s.col === 3) && !isSeatTaken(s.id)) return s.id
  }
  // pass 2: any seat
  for (const s of seats) {
    if (!isSeatTaken(s.id)) return s.id
  }
  return -1
}

/** Find the closest empty seat to a given world-position within the carriage.
 *  Returns { seat, dist } or null if no seat is within range or all are taken. */
export function findNearestSeat(
  px: number,
  pz: number,
  seats: CarriageSeat[],
  maxDist = 2.5,
): { seat: CarriageSeat; dist: number } | null {
  let best: { seat: CarriageSeat; dist: number } | null = null
  for (const s of seats) {
    if (isSeatTaken(s.id)) continue
    const dx = px - s.pos[0]
    const dz = pz - s.pos[2]
    const d = Math.hypot(dx, dz)
    if (d < maxDist && (!best || d < best.dist)) best = { seat: s, dist: d }
  }
  return best
}
