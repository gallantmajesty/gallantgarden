// Shared dimensions & world geometry for the Train Station Realm — FocusLily's
// third flagship world. A cosy, lantern-lit terminus at golden dusk: a grand
// southern concourse (entrance, ticket hall, waiting hall, coffee corner,
// bookstall) opening onto five island platforms that run north under a vaulted
// canopy, each with its own scheduled magical train. Everything that renders AND
// everything you collide with reads these numbers, so the world you see and the
// world you bump into always agree.
//
// Axis convention (terminus): the concourse is at the SOUTH (−Z); the platforms
// and tracks run NORTH (+Z) away from it. Trains nose in from the far north and
// brake at the buffer end near the concourse. East is +X. Up is +Y. The whole
// walkable floor — concourse and every platform top — is flat at y = 0; the
// track beds are recessed below it, so the player walks a single level and can
// never fall through. Platform 1 is the western-most, Platform 5 the eastern-most.

import { TRAIN_LINES } from '../../lib/train/lines'

export const FLOOR_Y = 0

/** One platform + its track to the east form a repeating bay. Platforms are
 *  deliberately NARROW (an island platform you can cross in three strides) so the
 *  terminus reads intimate, not as a void — width is for crowds we don't have. */
export const PLAT_W = 10 // platform walkable width (X)
export const TRACK_W = 9 // track bed width (X) — wider for the bigger train
export const BAY_W = PLAT_W + TRACK_W

/** Platforms run from the concourse edge (z = 0) north to here. */
export const PLAT_Z0 = 0
export const PLAT_LEN = 130 // longer platform for the bigger train rake
export const PLAT_Z1 = PLAT_Z0 + PLAT_LEN

/** Where a berthed train comes to rest (its southern, buffer end). The train
 *  extends north from here; doors line up along the platform. */
export const TRAIN_REST_Z = 9
/** The track-bed floor sits below platform level so wheels recess realistically
 *  and the carriage floor lands flush with the platform top. */
export const TRACK_BED_Y = -1.05

/** The lit underground tunnel beyond the platform throats. The single track from
 *  each platform runs in, fans into branches at a junction, and each branch
 *  doubles into an outbound + return pair. The whole realm is now ENCLOSED: brick
 *  walls and a glazed vault all round, and the tunnel mouth is the only opening —
 *  so there is no void to look into and nothing "floats". */
export const TUNNEL_Z0 = PLAT_Z1 // tunnel mouth (north end of the platforms)
export const TUNNEL_LEN = 64
export const TUNNEL_Z1 = TUNNEL_Z0 + TUNNEL_LEN
/** Z at which each platform's single track fans out into the branch "fingers". */
export const JUNCTION_Z = TUNNEL_Z0 + 16
/** Z at which each branch splits once more into outbound + return rails. */
export const SPLIT_Z = TUNNEL_Z0 + 38

/** The grand concourse hall to the south. Proportioned to the trainshed it feeds
 *  (≈58 m of platforms) with generous-but-not-cavernous side aisles, so the hall
 *  reads as a warm room, not an airport. Lower ceiling than the shed canopy keeps
 *  it cosy and gives the platform mouths a taller, brighter "reveal". */
export const CONCOURSE = {
  z0: -46, // south wall (entrance)
  z1: 0, // north edge — the platform mouths
  minX: -36,
  maxX: 36,
  wallH: 13,
}

/** Vaulted train-shed canopy height over the platforms. Taller than the concourse
 *  so the platform mouths read as a bright, lofty reveal beyond the cosy hall. */
export const CANOPY_H = 16

/** Western edge of Platform 1. Five bays march east from here, centring the
 *  whole trainshed on x = 0. */
const WEST_EDGE = -(5 * BAY_W) / 2

/** Trainshed extent on X (the canopy span). Derived once so the canopy geometry,
 *  the side walls, the pillars and the colliders all agree on where the shed is. */
export function shedExtent(): { westX: number; eastX: number; cx: number; width: number } {
  const westX = platformWestX(0) - 0.5
  const eastX = platformWestX(TRAIN_LINES.length - 1) + PLAT_W + 5.5
  return { westX, eastX, cx: (westX + eastX) / 2, width: eastX - westX }
}

/** Z of each structural canopy rib/arch across the platforms (south→north). */
export function shedRibZ(): number[] {
  const n = 8
  const out: number[] = []
  for (let i = 0; i <= n; i++) out.push(PLAT_Z0 + (i / n) * PLAT_LEN)
  return out
}

/** Foot positions [x, z] of the shed support pillars down each side wall — used
 *  for BOTH the visible cast-iron columns and their colliders so you can't walk
 *  through them. One pair every other rib, set just inside the walls. */
export function shedPillars(): [number, number][] {
  const { westX, eastX } = shedExtent()
  const ribs = shedRibZ()
  const out: [number, number][] = []
  ribs.forEach((z, i) => {
    if (i > 0 && i < ribs.length - 1 && i % 2 === 0) {
      out.push([westX + 1.3, z])
      out.push([eastX - 1.3, z])
    }
  })
  return out
}

/** Western edge of Platform 1. Five bays march east from here, centring the
 *  whole trainshed on x = 0. */ // -35

/** West x of platform i's walkable strip (i = 0..4). */
export function platformWestX(i: number): number {
  return WEST_EDGE + i * BAY_W
}
/** Centre x of platform i's walkable strip. */
export function platformX(i: number): number {
  return platformWestX(i) + PLAT_W / 2
}
/** Centre x of the track east of platform i (where its train berths). */
export function trackX(i: number): number {
  return platformWestX(i) + PLAT_W + TRACK_W / 2
}

/** Five spawn points spread across the concourse so arriving players fan out
 *  instead of piling onto one spot. All look north up the platforms toward the
 *  great departure board and the waiting trains beyond. */
export const SPAWN_POINTS: { pos: [number, number, number]; yaw: number }[] = [
  { pos: [0, FLOOR_Y, -30], yaw: Math.PI },
  { pos: [-15, FLOOR_Y, -28], yaw: Math.PI },
  { pos: [15, FLOOR_Y, -28], yaw: Math.PI },
  { pos: [-24, FLOOR_Y, -34], yaw: Math.PI },
  { pos: [24, FLOOR_Y, -34], yaw: Math.PI },
]

/** Pick a spawn — by a stable seed (e.g. hashed player id) when given, else at
 *  random. Call ONCE per session (memoise in the controller), not per frame. */
export function pickSpawn(seed?: number): { pos: [number, number, number]; yaw: number } {
  const n = SPAWN_POINTS.length
  const i = seed != null ? Math.abs(Math.floor(seed)) % n : Math.floor(Math.random() * n)
  return SPAWN_POINTS[i]
}

/** Back-compat default spawn (heart of the concourse). */
export const SPAWN = SPAWN_POINTS[0]

export const EYE_HEIGHT = 1.62

/** Outer playable extent (boundary blockers sit just outside).
 *  minX extends west to cover Platform 1 access. */
export const PLAYER_BOUNDS = {
  minX: -50,
  maxX: CONCOURSE.maxX - 1.2,
  minZ: CONCOURSE.z0 + 1.2,
  maxZ: PLAT_Z1 - 1.2,
}

/** A fully-resolved platform: its line + computed world geometry. The scene,
 *  colliders, signage and train all read this so nothing drifts. */
export interface PlatformGeo {
  index: number // 0..4
  /** the line/train that serves this platform */
  lineIndex: number
  platformX: number
  westX: number
  eastX: number // platform east edge = track side (doors open here)
  trackX: number
  z0: number
  z1: number
  /** south gateway sign position (at the concourse mouth) */
  gate: [number, number, number]
  /** the hanging platform clock */
  clock: [number, number, number]
}

export function platforms(): PlatformGeo[] {
  return TRAIN_LINES.map((_, i) => {
    const westX = platformWestX(i)
    const eastX = westX + PLAT_W
    return {
      index: i,
      lineIndex: i,
      platformX: platformX(i),
      westX,
      eastX,
      trackX: trackX(i),
      z0: PLAT_Z0,
      z1: PLAT_Z1,
      gate: [platformX(i), 0, PLAT_Z0 + 1.5],
      clock: [platformX(i), 5.6, PLAT_Z0 + 6],
    }
  })
}

/** Lantern post positions along a platform (both long edges, evenly spaced).
 *  On a narrow platform the posts hug the very edges so the spine stays clear. */
export function platformLanterns(i: number): { pos: [number, number, number] }[] {
  const westX = platformWestX(i)
  const eastX = westX + PLAT_W
  const out: { pos: [number, number, number] }[] = []
  const count = 4
  for (let s = 0; s < count; s++) {
    const z = PLAT_Z0 + 10 + (s / (count - 1)) * (PLAT_LEN - 22)
    // stagger sides so a single row of posts zig-zags the platform (cheaper, livelier)
    out.push({ pos: [s % 2 === 0 ? westX + 0.5 : eastX - 0.5, 0, z] })
  }
  return out
}

/** Platform seating. The platform spine is kept CLEAR for walking — seating
 *  lives only in the train and in the concourse corners — so this is empty by
 *  design (kept as a function so callers/colliders need no change). */
export function platformBenches(_i: number): { pos: [number, number, number]; yaw: number }[] {
  return []
}

// ---------------------------------------------------------------------------
// Concourse zones. The hall is read as four deliberate rooms rather than one
// empty box: a WAITING LOUNGE on centre (benches + rug + plants facing the
// board), a COFFEE corner (east), a BOOKSTALL (west), and the TICKET hall along
// the south wall by the entrance. Every collider + prop reads these so the world
// you bump into matches the world you see.
// ---------------------------------------------------------------------------

/** Concourse benches: placed along the east and west walls (facing inward)
 *  and a few near the south entrance — keeps the central lounge open. */
export function concourseBenches(): { pos: [number, number, number]; yaw: number }[] {
  const out: { pos: [number, number, number]; yaw: number }[] = []
  // east wall benches (facing west, toward centre)
  for (let r = 0; r < 3; r++) {
    out.push({ pos: [32, 0, -16 - r * 10], yaw: -Math.PI / 2 })
  }
  // west wall benches (facing east, toward centre)
  for (let r = 0; r < 3; r++) {
    out.push({ pos: [-32, 0, -16 - r * 10], yaw: Math.PI / 2 })
  }
  // south entrance flanking benches (facing north toward platforms)
  out.push({ pos: [-10, 0, -40], yaw: 0 })
  out.push({ pos: [10, 0, -40], yaw: 0 })
  return out
}

/** The waiting-lounge rug centre + size (a warm runner under the benches). */
export const LOUNGE_RUG = { pos: [0, 0, -21.5] as [number, number, number], w: 18, d: 16 }

/** Sittable waiting chairs clustered on the lounge rug, BEFORE the platforms, in
 *  two back-to-back rows so the lounge reads as a place to sit and wait (facing
 *  the departure board to the north, and the entrance to the south). */
export function waitingChairs(): { pos: [number, number, number]; yaw: number }[] {
  // Chairs are NOT placed in the central walking area any more (they blocked the
  // concourse). Seating lives in the train and along the concourse side walls
  // (see concourseBenches). Tuck two small rows into the far corners, hard against
  // the side walls, so the middle of the hall stays open to walk through.
  const out: { pos: [number, number, number]; yaw: number }[] = []
  for (const dz of [-30, -24]) {
    out.push({ pos: [CONCOURSE.minX + 3, 0, dz], yaw: Math.PI / 2 }) // west corner, facing in
    out.push({ pos: [CONCOURSE.maxX - 3, 0, dz], yaw: -Math.PI / 2 }) // east corner, facing in
  }
  return out
}

/** Decorative potted plants — flanking the entrance, softening wall corners,
 *  and marking the platform mouths. Organized, not scattered. */
export const CONCOURSE_PLANTS: [number, number, number][] = [
  // flanking the grand entrance (both sides)
  [-10, 0, -43],
  [10, 0, -43],
  [-18, 0, -43],
  [18, 0, -43],
  // east + west wall corners
  [-33, 0, -10],
  [33, 0, -10],
  [-33, 0, -36],
  [33, 0, -36],
  // platform mouth softening
  [-30, 0, -2],
  [30, 0, -2],
]

/** The great hanging departure board, centred over the platform mouths. */
export const DEPARTURE_BOARD = { pos: [0, 8.4, -3] as [number, number, number], width: 22, height: 4.4 }

/** Coffee corner (east aisle) + bookstall (west aisle) — set against the side
 *  walls so the central lounge stays open and each is its own little shop. */
export const COFFEE_CORNER = { pos: [29, 0, -22] as [number, number, number], yaw: -Math.PI / 2 }
export const BOOKSTALL = { pos: [-29, 0, -22] as [number, number, number], yaw: Math.PI / 2 }

/** Clock tower / info column anchoring the centre of the hall. */
export const CLOCK_TOWER = { pos: [0, 0, -38] as [number, number, number] }

/** Ticket-hall counter run along the south wall, flanking the entrance. */
export const TICKET_HALL = { z: -43, y: 0, booths: [-26, -19, 19, 26] }

/** Vending machines along platform spines (each platform gets one). */
export function vendingMachines(): { pos: [number, number, number]; yaw: number }[] {
  return TRAIN_LINES.map((_, i) => {
    const westX = platformWestX(i)
    const eastX = westX + PLAT_W
    // on the platform spine, just south of centre, facing the walkway
    return { pos: [(westX + eastX) / 2, 0, PLAT_Z0 + 35], yaw: Math.PI / 2 }
  })
}

/** Trash cans near benches / gathering spots on each platform. */
export function platformTrashCans(): { pos: [number, number, number] }[] {
  return TRAIN_LINES.map((_, i) => {
    const westX = platformWestX(i)
    const eastX = westX + PLAT_W
    const cx = (westX + eastX) / 2
    return { pos: [cx + 2.8, 0, PLAT_Z0 + 28] }
  })
}

/** Platform railings: posts + top rail along the WEST edge of each platform
 *  (between platforms). The east/track side has NO railing — the train body
 *  serves as the barrier when berthed, and removing the railing lets players
 *  walk up to the open doors for walk-through boarding. */
export function platformRailings(): { pos: [number, number, number]; yaw: number; len: number }[] {
  const out: { pos: [number, number, number]; yaw: number; len: number }[] = []
  TRAIN_LINES.forEach((_, i) => {
    const westX = platformWestX(i)
    // west edge railing (between platforms, not on the first platform's west wall)
    if (i > 0) {
      const westSideX = westX - 0.4
      for (let z = PLAT_Z0 + 4; z < PLAT_Z1; z += 4) {
        out.push({ pos: [westSideX, 0.55, z], yaw: 0, len: 0 }) // post
      }
      out.push({ pos: [westSideX, 1.1, PLAT_Z0 + PLAT_LEN / 2], yaw: 0, len: PLAT_LEN })
    }
  })
  return out
}
