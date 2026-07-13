// Shared furniture placements. Both the mesh components and the collision builder
// import these so what you see and what you bump into always agree.

import { HALL } from './layout'

export interface Placement {
  pos: [number, number, number]
  rotY: number
}

export interface Step {
  pos: [number, number, number]
  size: [number, number, number]
}

export const TABLE = { w: 2.0, l: 9, h: 0.95, seatsPerSide: 4 }
export const SHELF = { w: 2.4, h: 5.6, d: 0.55 }
export const STEP_RISE = 0.41
export const STEP_DEPTH = 0.6

// Generously spaced so the wide nave never feels crowded.
const TABLE_COLS = [-13, 13]
const TABLE_ROWS = [-36, -18, 0, 18, 36] // 2 × 5 = 10 tables × 8 seats = 80

export interface Seat {
  id: number
  pos: [number, number, number]
  yaw: number // facing the table
}

const CHAIR_CZ = [-TABLE.l / 2 + 1.4, -TABLE.l / 6, TABLE.l / 6, TABLE.l / 2 - 1.4]

/** Every sittable seat in the hall (ground + upper): the desk chairs plus the
 *  soft reading-corner armchairs, each matching its rendered chair. */
export function seatAnchors(): Seat[] {
  const out: Seat[] = []
  let id = 0
  for (const t of [...groundTables(), ...upperTables()]) {
    const [tx, ty, tz] = t.pos
    for (const sx of [-1, 1]) {
      for (const cz of CHAIR_CZ) {
        out.push({ id: id++, pos: [tx + sx * (TABLE.w / 2 + 0.5), ty, tz + cz], yaw: sx === 1 ? Math.PI / 2 : -Math.PI / 2 })
      }
    }
  }
  return out
}

/** Ground-floor reading tables (~80 seats). */
export function groundTables(): Placement[] {
  const out: Placement[] = []
  for (const x of TABLE_COLS) for (const z of TABLE_ROWS) out.push({ pos: [x, 0, z], rotY: 0 })
  return out
}

/** Upper-floor tables on the deep side balconies, clear of the staircases. */
export function upperTables(): Placement[] {
  const x = HALL.halfW - HALL.balconyDepth / 2 - 0.5
  const zs = [-32, -14, 4] // staircases occupy z ≈ 21…34, so keep tables away from there
  const out: Placement[] = []
  for (const sx of [-1, 1]) for (const z of zs) out.push({ pos: [sx * x, HALL.balconyY + 0.25, z], rotY: 0 })
  return out
}

/** Soft seating reading corners — ground floor + upper viewing galleries. */
export function readingCorners(): Placement[] {
  const x = HALL.halfW - 3
  const ux = HALL.halfW - HALL.balconyDepth + 1.4 // tucked against the upper rail
  return [
    // ground-floor cosy corners
    { pos: [-x, 0, -HALL.halfL + 5], rotY: Math.PI / 2 },
    { pos: [x, 0, -HALL.halfL + 5], rotY: -Math.PI / 2 },
    { pos: [-x, 0, HALL.halfL - 5], rotY: Math.PI / 2 },
    { pos: [x, 0, HALL.halfL - 5], rotY: -Math.PI / 2 },
    // upper viewing galleries overlooking the hall (kept clear of the open
    // near-end stairwell, z ≳ 22)
    { pos: [-ux, HALL.balconyY + 0.5, 12], rotY: -Math.PI / 2 },
    { pos: [ux, HALL.balconyY + 0.5, -8], rotY: Math.PI / 2 },
  ]
}

/** Bookshelf units: a wall of them on each end, plus piers between windows. */
export function groundShelves(): Placement[] {
  const out: Placement[] = []
  // end walls (z = ±halfL) — a row across x
  for (const sz of [-1, 1]) {
    const z = sz * (HALL.halfL - 0.5)
    const rotY = sz === 1 ? Math.PI : 0
    for (let x = -HALL.halfW + 2.5; x <= HALL.halfW - 2.5; x += SHELF.w + 0.2) {
      // leave a gap in the middle of the far wall for the fireplace
      if (sz === -1 && Math.abs(x) < 4.5) continue
      out.push({ pos: [x, 0, z], rotY })
    }
  }
  // piers between window bays on the long walls
  for (const sx of [-1, 1]) {
    const x = sx * (HALL.halfW - 0.5)
    const rotY = sx === 1 ? -Math.PI / 2 : Math.PI / 2
    for (const z of [-34, -20, 20, 34]) out.push({ pos: [x, 0, z], rotY })
  }
  return out
}

/** Upper-gallery shelves against the far end wall (the near end is the open
 *  double-height atrium over the stairwell, so it has no upper floor). */
export function upperShelves(): Placement[] {
  const out: Placement[] = []
  const z = -(HALL.halfL - 0.5)
  for (let x = -HALL.halfW + 4; x <= HALL.halfW - 4; x += SHELF.w + 0.2) {
    out.push({ pos: [x, HALL.balconyY, z], rotY: 0 })
  }
  return out
}

/** Balcony support columns down both sides — generously spaced so there is open
 *  air around every pillar. */
export function columns(): [number, number, number][] {
  const out: [number, number, number][] = []
  for (const sx of [-1, 1]) {
    for (let z = -HALL.halfL + 6; z <= HALL.halfL - 6; z += 10) {
      out.push([sx * (HALL.halfW - HALL.balconyDepth), 0, z])
    }
  }
  return out
}

/** Two grand staircases climbing to the side balconies, set in the clear bay
 *  between the columns and the outer wall — never crossing a pillar. */
export function staircases(): { side: number; steps: Step[] }[] {
  const n = Math.ceil(HALL.balconyY / STEP_RISE)
  const z0 = HALL.halfL - 11
  return [-1, 1].map((side) => {
    const x = side * (HALL.halfW - HALL.balconyDepth / 2)
    const steps: Step[] = []
    for (let i = 0; i < n; i++) {
      steps.push({
        pos: [x, (i + 0.5) * STEP_RISE, z0 - i * STEP_DEPTH],
        size: [4.6, STEP_RISE, STEP_DEPTH],
      })
    }
    return { side, steps }
  })
}

/** z where the two long side galleries stop, leaving the near end open as a
 *  double-height entrance atrium that the staircases sweep up into. The stair
 *  tops land here. */
export const GALLERY_FRONT_Z = 22

/** Walkable balcony gallery — a U around the far end + both long sides. The near
 *  end (+z) is intentionally open (no platform) so the grand staircases are fully
 *  visible climbing from the entrance floor up to the gallery. */
export function balconyPlatforms(): { pos: [number, number, number]; size: [number, number, number] }[] {
  const { halfW, halfL, balconyY, balconyDepth } = HALL
  const endW = halfW * 2 - 1
  const sideX = halfW - balconyDepth / 2
  const sideZ0 = -(halfL - 0.5)
  const sideLen = GALLERY_FRONT_Z - sideZ0
  const sideCz = (sideZ0 + GALLERY_FRONT_Z) / 2
  return [
    { pos: [-sideX, balconyY, sideCz], size: [balconyDepth, 0.5, sideLen] },
    { pos: [sideX, balconyY, sideCz], size: [balconyDepth, 0.5, sideLen] },
    { pos: [0, balconyY, -(halfL - balconyDepth / 2)], size: [endW, 0.5, balconyDepth] },
  ]
}
