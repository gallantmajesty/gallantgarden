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

/* ----------------------------------------------------- experimental realms */

/** Master launch switch for the still-experimental Waterfall Realm.
 *
 *  While `false` the realm is hidden from the public: no card in the chooser and
 *  the route shows an "under development" screen instead of the scene. NONE of
 *  its code, assets, routes or scenes are removed — the world stays fully
 *  functional and reachable by developers (see `isDevAccess`). Flip this single
 *  flag to `true` to expose it to everyone again, where it returns as the normal
 *  flagship card. This is the one switch to re-enable Waterfall at launch-time. */
export const ENABLE_WATERFALL_REALM = false

/** Developer access. Lets the team reach hidden experimental realms without
 *  exposing them to normal users: load the app once with `?dev=1` and it sticks
 *  (persisted to localStorage); `?dev=0` clears it. Public users never enable
 *  this, so anything gated behind it stays invisible to them. */
const DEV_ACCESS_KEY = 'sf.dev'
export function isDevAccess(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('dev')
    if (q === '1') localStorage.setItem(DEV_ACCESS_KEY, '1')
    else if (q === '0') localStorage.removeItem(DEV_ACCESS_KEY)
    return localStorage.getItem(DEV_ACCESS_KEY) === '1'
  } catch {
    return false
  }
}

/** Whether the Waterfall Realm may be shown and entered right now: publicly when
 *  the master flag is on, otherwise only for developers (`?dev=1`). Every place
 *  that exposes the card or guards the route reads this one helper, so the realm
 *  can never leak past it. */
export function waterfallEnabled(): boolean {
  return ENABLE_WATERFALL_REALM || isDevAccess()
}
