// Study-room catalogue. Five public rooms (cap 100 each) plus custom rooms with
// no cap, joined by a short code. Presence/occupancy reuses the existing
// `realm_presence` table via roomKey() (see realmPresence.ts), and live sync
// runs on the realtime channel from channelFor().

export interface StudyRoomDef {
  id: string
  name: string
  blurb: string
  emoji: string
  accent: string
  cap: number
}

/** A public room is full at this many present students. */
export const ROOM_CAP = 100

export const STUDY_ROOMS: StudyRoomDef[] = [
  { id: 'deep-focus', name: 'Deep Focus Hall', blurb: 'Heads down, cameras on, pure focus.', emoji: '📘', accent: '#5aa2ff', cap: ROOM_CAP },
  { id: 'study-lounge', name: 'Study Lounge', blurb: 'Relaxed co-working with chill energy.', emoji: '🛋️', accent: '#b08bff', cap: ROOM_CAP },
  { id: 'exam-warriors', name: 'Exam Warriors', blurb: 'Grinding for the next big exam.', emoji: '⚔️', accent: '#f6964f', cap: ROOM_CAP },
  { id: 'night-owls', name: 'Late Night Owls', blurb: 'Burning the midnight oil together.', emoji: '🌙', accent: '#7c8dff', cap: ROOM_CAP },
  { id: 'math-grind', name: 'Math Grind', blurb: 'Problem sets, proofs, and practice.', emoji: '📐', accent: '#36d39a', cap: ROOM_CAP },
]

const BY_ID = new Map(STUDY_ROOMS.map((r) => [r.id, r]))

export function isCustom(id: string): boolean {
  return id.startsWith('custom-')
}

/** Resolve any room id to a definition — synthesises a no-cap custom room. */
export function getStudyRoom(id: string): StudyRoomDef {
  const fixed = BY_ID.get(id)
  if (fixed) return fixed
  const code = id.replace(/^custom-/, '').toUpperCase()
  return {
    id,
    name: code ? `Private Room · ${code}` : 'Private Room',
    blurb: 'A custom room — invite friends with the code.',
    emoji: '🔒',
    accent: '#f6b65c',
    cap: Infinity, // custom rooms have no limit
  }
}

/** presence key for the realm_presence table (occupancy counts + heartbeat). */
export function roomKey(id: string): string {
  return `study:${id}`
}

/** realtime channel for the live roster (studyRoomNet). */
export function channelFor(id: string): string {
  return `sr:${id}`
}

/** A short, friendly join code for a new custom room. */
export function newCustomCode(seed: number): string {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let n = Math.floor(seed)
  let s = ''
  for (let i = 0; i < 5; i++) {
    s += A[n % A.length]
    n = Math.floor(n / A.length) + (i + 1) * 7919
  }
  return s
}
