// The Realm system. A "Realm" is a shared 3D study world (the great library
// scene). There are two flavours:
//
//   • Global Realm  — a set of pre-created public rooms anyone can drop into,
//     each capped at ROOM_CAPACITY students. Occupancy is shown *before* you
//     join so you can pick a lively or a quiet room.
//   • Custom Realm  — a private world the student creates for themselves (and,
//     later, invites friends to). No payment gating today, but the shape is
//     ready to later restrict creation to premium / ultimate tiers.
//
// NOTE (localhost dev): real participant counts need backend presence sync,
// which isn't wired yet. Until then Global rooms show *mock* occupancy so the
// UI and room structure can be built and reviewed. `mockOccupancy()` returns a
// stable-per-load-but-believable number; swap it for a live presence query when
// the backend is ready (see realmPresence TODO below).

export const ROOM_CAPACITY = 30
export type RealmKind = 'global' | 'custom'

export interface GlobalRoom {
  id: string
  name: string
  blurb: string
  /** A seed for the mock occupancy so each room reads differently but stays
   *  stable for the life of the page (no flicker between renders). */
  seed: number
}

// ~10 pre-created public rooms. Names lean into the calm, magical-library,
// brown-green nature aesthetic of Focus Lily.
export const GLOBAL_ROOMS: GlobalRoom[] = [
  { id: 'forest-hall', name: 'Forest Hall', blurb: 'The grand reading hall — busy and warm.', seed: 12 },
  { id: 'scholar-grove', name: 'Scholar Grove', blurb: 'Deep-focus desks under the canopy.', seed: 21 },
  { id: 'silent-valley', name: 'Silent Valley', blurb: 'Pin-drop quiet for hard problems.', seed: 8 },
  { id: 'mossy-archive', name: 'Mossy Archive', blurb: 'Old stacks, soft rain on the glass.', seed: 15 },
  { id: 'lantern-court', name: 'Lantern Court', blurb: 'Golden lamps, late-night study.', seed: 27 },
  { id: 'willow-study', name: 'Willow Study', blurb: 'Gentle pace, long focus blocks.', seed: 6 },
  { id: 'amber-loft', name: 'Amber Loft', blurb: 'Cosy upper gallery by the windows.', seed: 19 },
  { id: 'fern-atrium', name: 'Fern Atrium', blurb: 'Greenery and quiet conversation.', seed: 11 },
  { id: 'oakwood-den', name: 'Oakwood Den', blurb: 'Small, snug, distraction-free.', seed: 4 },
  { id: 'starlit-wing', name: 'Starlit Wing', blurb: 'Night-owls and dawn risers.', seed: 23 },
]

// Deterministic pseudo-random in [0,1) from an integer seed — no Math.random so
// occupancy is stable across re-renders (won't jitter every paint).
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 99.137 + 17.31) * 43758.5453
  return x - Math.floor(x)
}

/** Mock "people currently here" for a room, 0..ROOM_CAPACITY. Believable spread
 *  weighted toward mid-occupancy. Replace with live presence when the backend
 *  sync lands. */
export function mockOccupancy(seed: number): number {
  const u = seededUnit(seed)
  // bias toward the middle so most rooms look active but not full
  const shaped = 0.15 + u * 0.7
  return Math.min(ROOM_CAPACITY, Math.max(1, Math.round(shaped * ROOM_CAPACITY)))
}

export function roomIsFull(seed: number): boolean {
  return mockOccupancy(seed) >= ROOM_CAPACITY
}
