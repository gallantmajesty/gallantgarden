// Static collision for the Waterfall Realm. Reuses the generic AABB math that
// already ships with the Library (isBlocked / topSupport / rayHit live in
// ../library/colliders) — we only build a DIFFERENT world here: cliffs, hero
// rocks, campfire centres and the elevated stone terrace are blockers; the camp
// platforms, study decks, bridges, islet and terrace stairs are standable
// surfaces. The walkable GROUND itself is the continuous terrain heightfield
// (layout.terrainHeight), evaluated by the player controller — so it isn't
// listed here as a surface.

import type { AABB, Collision, Surface } from '../library/colliders'
import { BRIDGES, CAMPS, FALLS, HERO_ROCKS, STUDY_DECKS, VALLEY, WORLD, terrainHeight } from './layout'

/** A vertical box from (cx,cz) with half-extents (hx,hz) spanning [minY,maxY]. */
function box(cx: number, cz: number, hx: number, hz: number, minY: number, maxY: number): AABB {
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz, minY, maxY }
}

/** A flat standable rectangle centred at (cx,cz). */
function surf(cx: number, cz: number, hx: number, hz: number, y: number): Surface {
  return { minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz, y }
}

const STEP_RISE = 0.42
const STEP_DEPTH = 0.62

/** Steps climbing the south face of the elevated Stone Terrace, from terrain up
 *  to its platform top. Exported so the renderer can draw matching stone treads. */
export function terraceStairs(): Surface[] {
  const camp = CAMPS[3] // Stone Terrace
  const [cx, cz] = camp.center
  const top = camp.y
  const startZ = cz + camp.plat + 0.5 // approach from the lake (south) side
  const n = Math.ceil(top / STEP_RISE)
  const steps: Surface[] = []
  for (let i = 0; i < n; i++) {
    const y = (i + 1) * STEP_RISE
    const z = startZ + (n - i) * STEP_DEPTH
    steps.push(surf(cx, z, 2.6, STEP_DEPTH / 2 + 0.02, y))
  }
  return steps
}

let cached: Collision | null = null

export function buildCollision(): Collision {
  if (cached) return cached
  const blockers: AABB[] = []
  const surfaces: Surface[] = []

  // ---- world boundary: a tall fence just outside the playable extent ----
  const by = 40
  blockers.push(box(WORLD.minX - 1, 0, 1, 200, 0, by))
  blockers.push(box(WORLD.maxX + 1, 0, 1, 200, 0, by))
  blockers.push(box(0, WORLD.minZ - 1, 200, 1, 0, by))
  blockers.push(box(0, WORLD.maxZ + 1, 200, 1, 0, by))

  // ---- valley walls: a ring of blockers following the cliff arc, so the curved
  //      rock you see is solid — you can't slip past it into the void ----
  {
    const N = 26
    const top = VALLEY.height
    for (let i = 0; i < N; i++) {
      const ang = VALLEY.arcStart + (i / (N - 1)) * VALLEY.arcLen
      const x = VALLEY.cx + Math.sin(ang) * VALLEY.r
      const z = VALLEY.cz + Math.cos(ang) * VALLEY.r
      blockers.push(box(x, z, 8, 8, 0, top)) // overlapping boxes seal the gaps
    }
    // seal the falls notch at the back so nobody walks out through the waterfall
    blockers.push(box(FALLS.centerX, VALLEY.cz - VALLEY.r + 2, FALLS.width * 0.6 + 8, 5, 0, top))
  }

  // ---- hero shoreline boulders ----
  for (const [x, z, r] of HERO_ROCKS) blockers.push(box(x, z, r * 0.8, r * 0.8, 0, 6))

  // ---- per-camp pieces ----
  for (const camp of CAMPS) {
    const [cx, cz] = camp.center
    if (camp.elevated) {
      // a solid stone plinth (blocker) with a walkable top (surface) + stairs
      blockers.push(box(cx, cz, camp.plat, camp.plat, 0, camp.y))
      surfaces.push(surf(cx, cz, camp.plat, camp.plat, camp.y))
      surfaces.push(...terraceStairs())
    } else {
      // low platform: just a standable disc (square collision) sitting on terrain
      surfaces.push(surf(cx, cz, camp.plat, camp.plat, camp.y))
    }
    // don't let anyone stand in the campfire
    blockers.push(box(cx, cz, 0.8, 0.8, camp.y, camp.y + 1.3))
  }

  // ---- solo study decks ----
  for (const d of STUDY_DECKS) {
    surfaces.push(surf(d.center[0], d.center[1], d.size[0] / 2, d.size[1] / 2, d.y))
  }

  // ---- bridges: axis-aligned plank spans ----
  for (const b of BRIDGES) {
    const minX = Math.min(b.a[0], b.b[0]) - b.width / 2
    const maxX = Math.max(b.a[0], b.b[0]) + b.width / 2
    const minZ = Math.min(b.a[1], b.b[1]) - b.width / 2
    const maxZ = Math.max(b.a[1], b.b[1]) + b.width / 2
    surfaces.push({ minX, maxX, minZ, maxZ, y: b.y })
  }

  cached = { blockers, surfaces }
  return cached
}

/** Ground support at (x,z): the higher of the terrain heightfield and any raised
 *  platform/bridge/stair surface within reach. The controller adds its own
 *  step-up tolerance on top of this. */
export function groundAt(x: number, z: number, feetY: number, stepUp: number, surfaces: Surface[]): number {
  let best = terrainHeight(x, z)
  for (const s of surfaces) {
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && s.y <= feetY + stepUp && s.y > best) {
      best = s.y
    }
  }
  return best
}
