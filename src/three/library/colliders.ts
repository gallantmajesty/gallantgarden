// Lightweight AABB collision — no physics engine. Static blockers (walls,
// furniture, shelves, columns, the tree, balcony rails) stop the player; floor
// surfaces (ground, balcony platforms, stair steps) provide standable ground
// with auto-stepping and gravity. A ray test pulls the third-person camera in
// when a wall would otherwise clip it.

import { HALL } from './layout'
import {
  SHELF,
  TABLE,
  balconyPlatforms,
  columns,
  groundShelves,
  groundTables,
  readingCorners,
  staircases,
  upperTables,
} from './furniture'

export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  minY: number
  maxY: number
}
export interface Surface {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  y: number
}
export interface Collision {
  blockers: AABB[]
  surfaces: Surface[]
}

export const STEP_UP = 0.62
export const PLAYER_RADIUS = 0.36

function box(cx: number, cz: number, hx: number, hz: number, minY: number, maxY: number): AABB {
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz, minY, maxY }
}

/** Footprint half-extents of a shelf accounting for its 0 / ±90° rotation. */
function shelfHalf(rotY: number): [number, number] {
  const sideways = Math.abs(Math.abs(rotY) - Math.PI / 2) < 0.1
  return sideways ? [SHELF.d / 2, SHELF.w / 2] : [SHELF.w / 2, SHELF.d / 2]
}

let cached: Collision | null = null

/** Build (and memoise) the static collision world from furniture placements. */
export function buildCollision(): Collision {
  if (cached) return cached
  const blockers: AABB[] = []
  const surfaces: Surface[] = []
  const { halfW, halfL, wallH, balconyY, balconyDepth } = HALL

  // ---- outer walls ----
  blockers.push(box(-halfW - 0.3, 0, 0.4, halfL, 0, wallH)) // left long wall
  blockers.push(box(halfW + 0.3, 0, 0.4, halfL, 0, wallH)) // right long wall
  blockers.push(box(0, -halfL - 0.3, halfW + 1, 0.4, 0, wallH)) // far end
  blockers.push(box(0, halfL + 0.3, halfW + 1, 0.4, 0, wallH)) // near end

  // ---- tables (solid table only; chairs stay walk-through so the narrow upper
  //      balcony walkway is never blocked) ----
  for (const t of [...groundTables(), ...upperTables()]) {
    const baseY = t.pos[1]
    blockers.push(box(t.pos[0], t.pos[2], TABLE.w / 2 + 0.12, TABLE.l / 2 + 0.12, baseY, baseY + TABLE.h))
  }

  // ---- bookshelves (ground only block the ground player) ----
  for (const s of groundShelves()) {
    const [hx, hz] = shelfHalf(s.rotY)
    blockers.push(box(s.pos[0], s.pos[2], hx, hz, 0, SHELF.h))
  }

  // ---- reading-corner sofas (block at their own floor: ground or balcony) ----
  for (const c of readingCorners()) {
    const baseY = c.pos[1]
    blockers.push(box(c.pos[0], c.pos[2], 1.1, 1.1, baseY, baseY + 0.9))
  }

  // ---- columns (footprint matches the carved plinth) ----
  for (const c of columns()) blockers.push(box(c[0], c[2], 0.85, 0.85, 0, wallH))

  // ---- knowledge tree trunk ----
  blockers.push(box(0, 0, 1.4, 1.4, 0, 7))

  // ---- ground floor + balcony platforms (surfaces) ----
  surfaces.push({ minX: -halfW, maxX: halfW, minZ: -halfL, maxZ: halfL, y: 0 })
  for (const p of balconyPlatforms()) {
    surfaces.push({
      minX: p.pos[0] - p.size[0] / 2,
      maxX: p.pos[0] + p.size[0] / 2,
      minZ: p.pos[2] - p.size[2] / 2,
      maxZ: p.pos[2] + p.size[2] / 2,
      y: balconyY + p.size[1] / 2, // stand on the platform TOP, not its centre
    })
  }

  // ---- staircase steps (surfaces) ----
  for (const sc of staircases()) {
    for (const st of sc.steps) {
      surfaces.push({
        minX: st.pos[0] - st.size[0] / 2,
        maxX: st.pos[0] + st.size[0] / 2,
        minZ: st.pos[2] - st.size[2] / 2,
        maxZ: st.pos[2] + st.size[2] / 2,
        y: st.pos[1] + st.size[1] / 2,
      })
    }
  }

  // ---- balcony railings (waist-high blockers ringing the inner edge) ----
  const railTop = balconyY + 1.25
  for (const sx of [-1, 1]) {
    blockers.push(box(sx * (halfW - balconyDepth), 0, 0.18, halfL - balconyDepth, balconyY, railTop))
  }
  for (const sz of [-1, 1]) {
    blockers.push(box(0, sz * (halfL - balconyDepth), halfW - balconyDepth, 0.18, balconyY, railTop))
  }

  cached = { blockers, surfaces }
  return cached
}

/** Is a player circle at (x,z) spanning [loY,hiY] intersecting any blocker? */
export function isBlocked(x: number, z: number, r: number, loY: number, hiY: number, blockers: AABB[]): boolean {
  for (const b of blockers) {
    if (loY < b.maxY && hiY > b.minY && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) {
      return true
    }
  }
  return false
}

/** Highest standable surface under (x,z) no more than STEP_UP above the feet. */
export function topSupport(x: number, z: number, feetY: number, surfaces: Surface[]): number {
  let best = -Infinity
  for (const s of surfaces) {
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && s.y <= feetY + STEP_UP) {
      if (s.y > best) best = s.y
    }
  }
  return best
}

/** Distance along a normalised ray to the nearest blocker (slab method). */
export function rayHit(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  blockers: AABB[],
): number {
  let nearest = maxDist
  for (const b of blockers) {
    let tmin = 0
    let tmax = maxDist
    const axes: [number, number, number, number][] = [
      [ox, dx, b.minX, b.maxX],
      [oy, dy, b.minY, b.maxY],
      [oz, dz, b.minZ, b.maxZ],
    ]
    let hit = true
    for (const [o, d, lo, hi] of axes) {
      if (Math.abs(d) < 1e-6) {
        if (o < lo || o > hi) {
          hit = false
          break
        }
      } else {
        let t1 = (lo - o) / d
        let t2 = (hi - o) / d
        if (t1 > t2) [t1, t2] = [t2, t1]
        tmin = Math.max(tmin, t1)
        tmax = Math.min(tmax, t2)
        if (tmin > tmax) {
          hit = false
          break
        }
      }
    }
    if (hit && tmin >= 0 && tmin < nearest) nearest = tmin
  }
  return nearest
}
