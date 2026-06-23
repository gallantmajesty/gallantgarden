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
// NOTE: realm multiplayer (shared presence + remote avatars) is NOT implemented
// yet. There is no live participant data, so the UI must never invent occupancy
// numbers or sample players. Rooms are presented as joinable solo spaces until a
// realtime presence channel lands (see "Still requires new development" below).

export const ROOM_CAPACITY = 30
export type RealmKind = 'global' | 'custom'

export interface GlobalRoom {
  id: string
  name: string
  blurb: string
}

// ~10 pre-created public rooms. Names lean into the calm, magical-library,
// brown-green nature aesthetic of Focus Lily.
export const GLOBAL_ROOMS: GlobalRoom[] = [
  { id: 'forest-hall', name: 'Forest Hall', blurb: 'The grand reading hall — busy and warm.' },
  { id: 'scholar-grove', name: 'Scholar Grove', blurb: 'Deep-focus desks under the canopy.' },
  { id: 'silent-valley', name: 'Silent Valley', blurb: 'Pin-drop quiet for hard problems.' },
  { id: 'mossy-archive', name: 'Mossy Archive', blurb: 'Old stacks, soft rain on the glass.' },
  { id: 'lantern-court', name: 'Lantern Court', blurb: 'Golden lamps, late-night study.' },
  { id: 'willow-study', name: 'Willow Study', blurb: 'Gentle pace, long focus blocks.' },
  { id: 'amber-loft', name: 'Amber Loft', blurb: 'Cosy upper gallery by the windows.' },
  { id: 'fern-atrium', name: 'Fern Atrium', blurb: 'Greenery and quiet conversation.' },
  { id: 'oakwood-den', name: 'Oakwood Den', blurb: 'Small, snug, distraction-free.' },
  { id: 'starlit-wing', name: 'Starlit Wing', blurb: 'Night-owls and dawn risers.' },
]

/** Realm multiplayer is not implemented yet — no live presence exists. This flag
 *  is the single switch the UI reads to decide between "live counts" and the
 *  honest "solo / not live yet" state. Flip to true only once a realtime
 *  presence channel actually populates room occupancy. */
export const REALM_PRESENCE_LIVE = false
