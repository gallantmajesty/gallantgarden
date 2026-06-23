// Shared dimensions & world geometry for the Waterfall Realm — FocusLily's
// second flagship realm. A bright, open daytime nature world: a gigantic
// waterfall pours off northern cliffs into a shallow crystal-turquoise lake,
// ringed by five campfire camps, with a giant floating Focus Lily as the
// landmark. Everything that renders AND everything you collide with reads these
// numbers, so the world you see and the world you bump into always agree.
//
// Axes: north (the falls) is −Z, south (spawn) is +Z. Up is +Y. Water sits at
// WATER_LEVEL; the lake is a shallow wadeable basin so the player can never fall
// through or get trapped, while raised camps/decks/the islet stay comfortably dry.

export const WATER_LEVEL = 0

/** Outer playable extent (the boundary blockers sit just outside this). */
export const WORLD = { minX: -96, maxX: 96, minZ: -90, maxZ: 66 }

export const PLAYER_BOUNDS = {
  minX: WORLD.minX + 2,
  maxX: WORLD.maxX - 2,
  minZ: WORLD.minZ + 2,
  maxZ: WORLD.maxZ - 2,
}

export const EYE_HEIGHT = 1.62

/** The lake: a shallow turquoise basin. The plunge pool of the falls is its
 *  northern lobe. Radius is generous so the lake dominates the centre. */
export const LAKE = { cx: 0, cz: -26, r: 46 }

/** The northern cliff wall + the hero waterfall. The crest pours from `crestY`
 *  at the back wall (z = `wallZ`) down into the plunge pool at the lake's north
 *  edge. `width` is the main sheet width; side cascades flank it. */
export const FALLS = {
  wallZ: -84, // cliff face plane
  crestY: 46, // top of the main drop
  baseY: WATER_LEVEL, // plunge pool surface
  centerX: 0,
  width: 26, // main curtain width
  poolZ: -64, // where the curtain meets the water
}

/** The valley walls. Instead of a flat back wall + two side boxes (which read as
 *  a "room"), the cliffs wrap the lake in a broad arc — a natural amphitheatre
 *  open to the south (toward spawn) and closed around the north where the falls
 *  pour in. Both the renderer (curved rock shell + arc-scattered chunks) and the
 *  collider (arc of blockers) read these numbers so the wall you see is the wall
 *  you bump into. Angle convention matches three's cylinder: 0 = +Z (south),
 *  π = −Z (north, the falls). */
export const VALLEY = {
  cx: 0,
  cz: -8,
  r: 86, // wall radius from (cx,cz)
  height: 70,
  arcStart: Math.PI * 0.36, // ~65° — east edge of the southern opening
  arcLen: Math.PI * 1.28, // ~230° wrap; leaves a ~130° opening to the south
}

/** Spawn: a low rise on the south shore, looking due north straight down the
 *  lake at the Focus Lily and the falls beyond — the immediate "wow". */
export const SPAWN = { pos: [0, 2.0, 52] as [number, number, number], yaw: Math.PI }

/** The landmark: a giant Focus Lily floating in open water, north-central, so
 *  it's visible from spawn and from every camp. Sits ON the water surface. */
export const FOCUS_LILY = { pos: [-7, WATER_LEVEL, -30] as [number, number, number], scale: 1 }

export interface CampDef {
  id: number
  key: string
  name: string
  /** platform centre (x, z) */
  center: [number, number]
  /** platform top height (player stands here) */
  y: number
  /** seating ring radius */
  radius: number
  /** platform disc radius (a little larger than the seating ring) */
  plat: number
  /** 'stone' raised shelf, 'deck' wood over water, 'earth' forest floor, 'islet' island */
  kind: 'stone' | 'deck' | 'earth' | 'islet'
  /** true → reached by a staircase (elevated); else a gentle step-up from terrain */
  elevated?: boolean
}

/** Exactly five camps, ten seats each (50 study seats). Arranged in a clear ring
 *  around the lake so all are reachable by natural stone paths — no maze. */
export const CAMPS: CampDef[] = [
  { id: 0, key: 'falls', name: 'Falls Circle', center: [-32, -52], y: 0.8, radius: 5.4, plat: 7.2, kind: 'stone' },
  { id: 1, key: 'riverside', name: 'Riverside Deck', center: [30, 4], y: 0.8, radius: 5.0, plat: 6.6, kind: 'deck' },
  { id: 2, key: 'forest', name: 'Forest Clearing', center: [50, -16], y: 1.6, radius: 5.2, plat: 7.0, kind: 'earth' },
  { id: 3, key: 'terrace', name: 'Stone Terrace', center: [40, -54], y: 8.5, radius: 5.0, plat: 6.8, kind: 'stone', elevated: true },
  { id: 4, key: 'islet', name: 'Lake Islet', center: [8, -18], y: 0.9, radius: 4.6, plat: 6.0, kind: 'islet' },
]

export const SEATS_PER_CAMP = 10

/** Solo focus decks cantilevered over the water, facing the falls — quiet spots
 *  away from the social camps. Each adds a couple of non-camp study seats. */
export interface DeckDef {
  center: [number, number]
  y: number
  size: [number, number] // x, z extent of the planking
  faceYaw: number // direction a seated student looks (toward the falls)
}
export const STUDY_DECKS: DeckDef[] = [
  { center: [-16, 10], y: 0.8, size: [6, 5], faceYaw: Math.PI }, // south-west, looks north
  { center: [22, -42], y: 0.8, size: [5.5, 5], faceYaw: Math.PI },
  { center: [-48, -20], y: 0.85, size: [5, 5.5], faceYaw: Math.PI * 0.72 },
]

/** Wooden bridges. Each is a straight plank span between two points at a shared
 *  deck height; colliders turn them into walkable surfaces and the renderer lays
 *  planks + rope rails along them. The islet bridge is the only dry route to
 *  Camp 5. */
export interface BridgeDef {
  a: [number, number]
  b: [number, number]
  y: number
  width: number
}
export const BRIDGES: BridgeDef[] = [
  { a: [8, -11], b: [10, 2], y: 0.85, width: 2.6 }, // south shore → Lake Islet
  { a: [40, 12], b: [40, 26], y: 0.7, width: 2.8 }, // over the river outflow (south-east)
]

/** Stone-path spine: a polyline loop from spawn around the lake touching every
 *  camp. Rendered as flat stone discs; purely cosmetic (terrain is walkable
 *  everywhere) but it makes the intended route obvious. */
export const PATH_NODES: [number, number][] = [
  [0, 50],
  [-16, 30],
  [-30, 2],
  [-32, -40], // → Falls Circle
  [-10, -58],
  [20, -54], // → Stone Terrace approach
  [44, -34],
  [50, -16], // → Forest Clearing
  [38, 6], // → Riverside Deck
  [16, 22],
  [0, 50],
]

/** Big decorative shoreline boulders / mossy rocks (also collision blockers).
 *  [x, z, radius, height] */
export const HERO_ROCKS: [number, number, number, number][] = [
  [-52, -48, 3.2, 4.5],
  [48, -40, 3.6, 5.0],
  [-20, -62, 2.6, 3.2],
  [22, -60, 2.8, 3.6],
  [-58, -10, 3.0, 4.0],
  [60, -6, 3.4, 4.6],
]

/**
 * Continuous terrain height at (x, z) — the single source of ground elevation
 * for both the rendered mesh and the player controller's support test. Land
 * rises gently away from the lake; the lake itself is a shallow basin (≤ ~0.6 m
 * below the water surface) so wading is always possible and nobody falls through.
 * Deterministic and cheap (a couple of trig terms) so it's safe to call per
 * vertex and per frame.
 */
export function terrainHeight(x: number, z: number): number {
  const dLake = Math.hypot(x - LAKE.cx, z - LAKE.cz)

  // --- inside the lake: shallow bowl, deepest (~0.6) at centre, 0 at the shore.
  if (dLake < LAKE.r) {
    const t = dLake / LAKE.r // 0 centre … 1 shore
    return -0.6 * (1 - t * t)
  }

  // --- land: gentle rise outward from the shore, capped so it stays walkable.
  const fromShore = dLake - LAKE.r
  let h = Math.min(7, fromShore * 0.18)

  // spawn rise in the deep south so spawn looks slightly down over the lake
  const dSpawn = Math.hypot(x - SPAWN.pos[0], z - SPAWN.pos[2])
  h += Math.max(0, 2.0 - dSpawn * 0.05)

  // a ramp climbing toward the northern cliff base
  if (z < LAKE.cz) h += Math.max(0, (LAKE.cz - z) * 0.06)

  // soft natural undulation (small amplitude → smooth to walk on)
  h += Math.sin(x * 0.07) * Math.cos(z * 0.06) * 0.5 + Math.sin((x + z) * 0.11) * 0.25

  return Math.max(WATER_LEVEL + 0.05, h)
}

/** Seat ring for one camp: ten anchors evenly around the campfire, each facing
 *  inward toward the fire (yaw points at the centre). */
export function campRing(camp: CampDef): { pos: [number, number, number]; yaw: number }[] {
  const out: { pos: [number, number, number]; yaw: number }[] = []
  for (let i = 0; i < SEATS_PER_CAMP; i++) {
    const a = (i / SEATS_PER_CAMP) * Math.PI * 2
    const x = camp.center[0] + Math.cos(a) * camp.radius
    const z = camp.center[1] + Math.sin(a) * camp.radius
    // face the fire: a seat at angle a sits on the ring and looks toward centre
    out.push({ pos: [x, camp.y, z], yaw: a + Math.PI })
  }
  return out
}
