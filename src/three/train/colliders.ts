// @ts-nocheck
// Static AABB collision for the Train Station Realm. The whole walkable floor is
// a single flat level at FLOOR_Y, so there is no heightfield or stair maths here
// (unlike the Waterfall realm) — just blockers. The generic slab/AABB maths is
// shared with the Library realm; this file only assembles the boxes.
//
// Walkable shape: the concourse rectangle (south) opening through five mouths
// onto five island platforms that run north. Track beds between platforms are
// sealed off (buffer stops at the south mouths + full-height edge blockers down
// each platform), so the player walks platforms and concourse only and can never
// stray onto the rails. Boarding a train is a proximity-triggered transition
// (see PlayerController), not a walk-in, which keeps movement bulletproof.

import { isBlocked, rayHit, PLAYER_RADIUS, type AABB } from '../library/colliders'
import {
  CONCOURSE,
  CANOPY_H,
  PLAT_Z0,
  PLAT_Z1,
  platforms,
  concourseBenches,
  platformBenches,
  shedExtent,
  shedPillars,
  COFFEE_CORNER,
  BOOKSTALL,
  CLOCK_TOWER,
  TICKET_HALL,
  FLOOR_Y,
} from './layout'

export { isBlocked, rayHit, PLAYER_RADIUS }
export type { AABB }

export interface Collision {
  blockers: AABB[]
}

function box(cx: number, cz: number, hx: number, hz: number, minY: number, maxY: number): AABB {
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz, minY, maxY }
}

let cached: Collision | null = null

export function buildCollision(): Collision {
  if (cached) return cached
  const blockers: AABB[] = []
  const { z0, z1, minX, maxX, wallH } = CONCOURSE

  // ---- concourse outer walls ----
  // south entrance wall with a central opening (the grand entrance arch)
  const cxMid = (minX + maxX) / 2
  const gap = 9 // half-width of the entrance opening
  // left + right of the entrance
  blockers.push({ minX: minX - 0.4, maxX: cxMid - gap, minZ: z0 - 0.4, maxZ: z0 + 0.4, minY: 0, maxY: wallH })
  blockers.push({ minX: cxMid + gap, maxX: maxX + 0.4, minZ: z0 - 0.4, maxZ: z0 + 0.4, minY: 0, maxY: wallH })
  // east concourse wall
  blockers.push({ minX: maxX - 0.4, maxX: maxX + 0.4, minZ: z0 - 0.4, maxZ: z1, minY: 0, maxY: wallH })
  // west concourse wall — split with a wide gap for Platform 1 access
  // Platform 0 sits at x = -47.5..-37.5, concourse west wall is at x = -36.
  // The opening runs most of the concourse length so you can walk to P1 from anywhere.
  const pGapZ0 = -40  // start of gap (near south end)
  const pGapZ1 = -2   // end of gap (near north end)
  blockers.push({ minX: minX - 0.4, maxX: minX + 0.4, minZ: z0 - 0.4, maxZ: pGapZ0, minY: 0, maxY: wallH })
  blockers.push({ minX: minX - 0.4, maxX: minX + 0.4, minZ: pGapZ1, maxZ: z1, minY: 0, maxY: wallH })

  // ---- trainshed outer side walls (west of P1, east of P5) ----
  const { westX: westShed, eastX: eastShed } = shedExtent()
  blockers.push({ minX: westShed - 0.5, maxX: westShed + 0.2, minZ: PLAT_Z0, maxZ: PLAT_Z1, minY: 0, maxY: wallH })
  blockers.push({ minX: eastShed - 0.2, maxX: eastShed + 0.5, minZ: PLAT_Z0, maxZ: PLAT_Z1, minY: 0, maxY: wallH })

  // ---- per-platform edge blockers + track buffer stops ----
  for (const p of platforms()) {
    // west edge railing (interior platforms only; P0's west is the shed wall)
    if (p.index > 0) {
      blockers.push({ minX: p.westX - 0.25, maxX: p.westX + 0.25, minZ: PLAT_Z0, maxZ: PLAT_Z1, minY: 0, maxY: 2.4 })
    }
    // east edge: NO collider here — the train body itself blocks the player from
    // the tracks when it's berthed, and removing this lets the player walk right
    // up to the open doors for walk-through boarding.
    // buffer stop sealing the TRACK mouth at the concourse (between platforms)
    const trackWest = p.eastX
    const trackEast = p.trackX + 3
    blockers.push({ minX: trackWest, maxX: trackEast, minZ: PLAT_Z0 - 0.5, maxZ: PLAT_Z0 + 2.4, minY: 0, maxY: 1.6 })
  }

  // ---- concourse furniture ----
  // lounge benches face east/west (deeper than wide); platform benches run along Z
  for (const b of concourseBenches()) blockers.push(box(b.pos[0], b.pos[2], 0.7, 1.7, 0, 0.85))
  for (const p of platforms()) for (const b of platformBenches(p.index)) blockers.push(box(b.pos[0], b.pos[2], 0.6, 1.5, 0, 0.85))

  // ticket-hall booths along the south wall
  for (const bx of TICKET_HALL.booths) blockers.push(box(bx, TICKET_HALL.z + 1.6, 2.8, 1.4, 0, 2.6))
  // coffee corner + bookstall kiosks (set against the side walls)
  blockers.push(box(COFFEE_CORNER.pos[0], COFFEE_CORNER.pos[2], 2.6, 3.4, 0, 3.0))
  blockers.push(box(BOOKSTALL.pos[0], BOOKSTALL.pos[2], 2.6, 3.4, 0, 3.0))
  // clock tower / info column in the heart of the hall
  blockers.push(box(CLOCK_TOWER.pos[0], CLOCK_TOWER.pos[2], 1.1, 1.1, 0, CONCOURSE.wallH))

  // ---- shed support pillars (you can't walk through the cast-iron columns) ----
  for (const [px, pz] of shedPillars()) blockers.push(box(px, pz, 0.45, 0.45, 0, CANOPY_H))

  // ---- threshold columns between concourse and platforms ----
  for (const p of platforms()) {
    blockers.push(box(p.westX, PLAT_Z0 - 0.5, 0.6, 0.6, 0, CONCOURSE.wallH))
  }
  blockers.push(box(eastShed - 0.7, PLAT_Z0 - 0.5, 0.6, 0.6, 0, CONCOURSE.wallH))

  cached = { blockers }
  return cached
}

/** The floor is a single flat level everywhere the player can stand. */
export function groundAt(): number {
  return FLOOR_Y
}
