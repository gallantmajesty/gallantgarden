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
// Realm multiplayer is LIVE: entering a global room joins that room's realtime
// channel (see multiplayer/net.ts) where players see each other move, animate and
// wear their avatar cosmetics in real time. The roster shows only REAL connected
// players — never fabricated counts or sample avatars. Pre-join room occupancy
// counts (showing 8/50 before you enter) are the next step (capacity/instancing).

// Per-room capacity. A room auto-instances (Forest Hall #1, #2, …) once every
// existing instance is full — see src/lib/realmPresence.ts (REALM_CAPACITY is the
// runtime value passed to assign_realm_instance; keep these in sync).
export const ROOM_CAPACITY = 100
export type RealmKind = 'global' | 'custom'

/** Which flagship world a global room renders. */
export type GlobalRoomWorld = 'library' | 'train-station'

export interface GlobalRoom {
  id: string
  name: string
  blurb: string
  world: GlobalRoomWorld
}

// Library-themed global rooms (the original "Global Realm").
export const LIBRARY_ROOMS: GlobalRoom[] = [
  { id: 'forest-hall', name: 'Forest Hall', blurb: 'The grand reading hall — busy and warm.', world: 'library' },
  { id: 'scholar-grove', name: 'Scholar Grove', blurb: 'Deep-focus desks under the canopy.', world: 'library' },
  { id: 'silent-valley', name: 'Silent Valley', blurb: 'Pin-drop quiet for hard problems.', world: 'library' },
  { id: 'mossy-archive', name: 'Mossy Archive', blurb: 'Old stacks, soft rain on the glass.', world: 'library' },
  { id: 'lantern-court', name: 'Lantern Court', blurb: 'Golden lamps, late-night study.', world: 'library' },
  { id: 'willow-study', name: 'Willow Study', blurb: 'Gentle pace, long focus blocks.', world: 'library' },
  { id: 'amber-loft', name: 'Amber Loft', blurb: 'Cosy upper gallery by the windows.', world: 'library' },
  { id: 'fern-atrium', name: 'Fern Atrium', blurb: 'Greenery and quiet conversation.', world: 'library' },
  { id: 'oakwood-den', name: 'Oakwood Den', blurb: 'Small, snug, distraction-free.', world: 'library' },
  { id: 'starlit-wing', name: 'Starlit Wing', blurb: 'Night-owls and dawn risers.', world: 'library' },
]

// Train Station global rooms — the station concourse and platforms as shared study spaces.
export const TRAIN_ROOMS: GlobalRoom[] = [
  { id: 'station-concourse', name: 'Station Concourse', blurb: 'The grand hall — benches, departure board, coffee & books.', world: 'train-station' },
  { id: 'platform-1', name: 'Platform 1 — Express', blurb: 'Open-air platform for quick 20–60 min study sprints.', world: 'train-station' },
  { id: 'platform-2', name: 'Platform 2 — Journey', blurb: 'Covered platform for 2–4 hour deep-focus journeys.', world: 'train-station' },
  { id: 'platform-3', name: 'Platform 3 — Grand Journey', blurb: 'Reserved platform for 8–12 hour grand study voyages.', world: 'train-station' },
]

// Combined list for backward compatibility (legacy code paths).
export const GLOBAL_ROOMS: GlobalRoom[] = [...LIBRARY_ROOMS, ...TRAIN_ROOMS]

/** Realm multiplayer presence is live (see multiplayer/net.ts). Retained as a
 *  single kill-switch in case presence needs to be disabled in an incident. */
export const REALM_PRESENCE_LIVE = true

/* ----------------------------------------------------- experimental realms */

/** Developer access. Restricted to production builds via build-time gating.
 *  In production, this always returns false. */
export function isDevAccess(): boolean {
  if (!import.meta.env.DEV) return false
  try {
    const q = new URLSearchParams(window.location.search).get('dev')
    if (q === '1') return true
    if (q === '0') return false
  } catch { /* ignore */ }
  return false
}

/** Master launch switch for the Train Station Realm — FocusLily's third flagship
 *  world. Enabled by default so it appears in the chooser alongside the Library
 *  as a headline study world (the brief: "give two options, Library or Train").
 *  Set to `false` to hide it from the public while keeping all of its code,
 *  routes and scenes intact (developers still reach it via `?dev=1`). */
export const ENABLE_TRAIN_STATION_REALM = true

/** Whether the Train Station Realm may be shown and entered right now. Every
 *  place that exposes the card or guards the route reads this one helper. */
export function trainStationEnabled(): boolean {
  return ENABLE_TRAIN_STATION_REALM || isDevAccess()
}
