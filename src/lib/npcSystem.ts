// Deterministic NPC scholar system.
//
// Every library room hosts a SMALL, room-specific cast of ambient scholars —
// never more than 30 per room, and each hall has its own headcount so rooms
// don't all look identical (e.g. the busiest hall holds 30, the quietest 12).
// Each NPC has a seeded, stable identity (real-looking name + number, Common
// character body with a distinct rolled look — hair style/colour, skin, eyes,
// clothing colour, glasses — so no two scholars read as clones) AND a personal
// study schedule (2.5–3.5 h study, 13–15 h rest, staggered per NPC so they
// never come and go in a wave). NPCs are PERMANENT: NPC_ALWAYS_ONLINE keeps
// every scholar present in their room around the clock — the schedule remains
// only as deterministic flavor (tags/profile), it no longer drives presence.
//
// Everything is derived from the NPC's index alone (mulberry32 PRNG), so any
// browser, any reload, renders the exact same NPCs and schedules. Seats are
// assigned per room via a seeded shuffle, so scholars scatter across the hall
// instead of filing into consecutive desk rows.

import { characterById } from '../avatar/characters'
import { RANKS } from './ranks'
import { LIBRARY_ROOMS } from './realm'
import type { Seat } from '../three/library/furniture'

export const NPC_ROOMS = 10

// Headcount per room (max 30): every hall has its own cast size so the
// libraries don't all feel equally crowded. Order follows LIBRARY_ROOMS.
export const NPC_ROOM_CAPS = [30, 18, 26, 14, 30, 22, 16, 24, 20, 12]

const NPC_ROOM_STARTS = (() => {
  const out: number[] = []
  let acc = 0
  for (const cap of NPC_ROOM_CAPS) {
    out.push(acc)
    acc += cap
  }
  return out
})()

export const NPC_TOTAL = NPC_ROOM_CAPS.reduce((s, c) => s + c, 0)
export const NPC_MAX_PER_ROOM = Math.max(...NPC_ROOM_CAPS)

// NPCs are PERMANENT: every scholar is present in their room around the clock.
// Presence no longer depends on "which session they're in right now" — the
// session schedule survives only as deterministic flavor. With at most 30 NPCs
// and 128 seats per room, most of the hall always stays free for real players.
export const NPC_ALWAYS_ONLINE = true

// Study session: 2.5–3.5 h. Rest between sessions: 13–15 h.
const SESSION_MIN_MS = 2.5 * 3600_000
const SESSION_SPREAD_MS = 1 * 3600_000
const GAP_MIN_MS = 13 * 3600_000
const GAP_SPREAD_MS = 2 * 3600_000

// Fixed epoch so schedules never shift when the app is redeployed.
const EPOCH_MS = Date.UTC(2026, 0, 1)

/* ------------------------------------------------ deterministic PRNG */

function hash(n: number, salt: number): number {
  let h = Math.imul(n + salt, 2654435761)
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------ zones */

export interface Zone { name: string; zCenter: number; weight: number }

export const ZONES: Zone[] = [
  { name: 'back',    zCenter: -36, weight: 1.0 },
  { name: 'midBack', zCenter: -18, weight: 0.5 },
  { name: 'center',  zCenter: 0,   weight: 0.8 },
  { name: 'front',   zCenter: 27,  weight: 0.6 },
]

const ZONE_WEIGHT_TOTAL = ZONES.reduce((s, z) => s + z.weight, 0)

function pickZoneIdx(r: () => number): number {
  let v = r() * ZONE_WEIGHT_TOTAL
  for (let i = 0; i < ZONES.length; i++) {
    v -= ZONES[i].weight
    if (v <= 0) return i
  }
  return 0
}

/* ------------------------------------------------ pools */

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Charlie', 'Robin', 'Skyler', 'Drew', 'Finley', 'Hayden', 'Rowan',
  'Emery', 'Sage', 'Blake', 'Dakota', 'Reese', 'Peyton', 'Jesse', 'Kai',
  'Leo', 'Mila', 'Noah', 'Zara', 'Felix', 'Iris', 'Oscar', 'Luna',
  'Hugo', 'Aria', 'Finn', 'Ivy', 'Owen', 'Ruby', 'Ezra', 'Stella',
  'Atlas', 'Clara', 'Jude', 'Lyra', 'Miles', 'Nora', 'Theo', 'Willow',
  'Arlo', 'Hazel', 'Jasper', 'Aurora', 'Silas', 'Isla', 'Beau', 'Wren',
  'Seth', 'Lena', 'Mark', 'Troy', 'Ella', 'Dean', 'Jake',
  'Tina', 'Derek', 'Nina', 'Omar', 'Fiona', 'Hector', 'Leah', 'Victor',
  'Mara', 'Neil', 'Sofia', 'Adam', 'Zoe', 'Liam', 'Maya', 'Ethan',
  'Priya', 'Amir', 'Yuki', 'Soo-Jin', 'Diego', 'Anika', 'Ravi',
]
// Reserved: these are the player character NAMES (James, Lily, Mia, Ruslana,
// Dino, Bunny, Black Robot, Alien, Piggy) — scholars must never be named after
// them, so players can't mistake an NPC for a real character.
const RESERVED_NAMES = new Set(['James', 'Lily', 'Mia', 'Ruslana', 'Dino', 'Bunny', 'Black Robot', 'Robot', 'Alien', 'Piggy', 'Seraphine', 'Sunny', 'Ellie', 'Monkey', 'Panda'])

const HANDLES = [
  'Bookworm', 'NightOwl', 'StudyBud', 'FocusMode', 'DeepWork',
  'QuietHours', 'PageTurner', 'PenPal', 'NoteTaker', 'MindPalace',
  'FlowState', 'ZenStudy', 'CalmFocus', 'StudyZen', 'LampLight',
  'DawnStudy', 'MidnightRead', 'TeaAndBooks', 'ReadingNook', 'InkDrop',
  'Cogito', 'Praxis', 'Lucerna', 'Codex', 'Stylus',
]

// Country distribution — natural, India-leaning hall (IN + JP are the two big
// ones, then China, then USA, then Türkiye, everything else tails off gently).
const COUNTRY_POOL: { code: string; weight: number }[] = [
  { code: 'IN', weight: 22 }, { code: 'JP', weight: 16 },
  { code: 'CN', weight: 10 }, { code: 'US', weight: 9 },
  { code: 'TR', weight: 6 },  { code: 'KR', weight: 4 },
  { code: 'GB', weight: 4 },  { code: 'FR', weight: 3 },
  { code: 'DE', weight: 3 },  { code: 'ID', weight: 3 },
  { code: 'BR', weight: 2 },  { code: 'CA', weight: 2 },
  { code: 'AU', weight: 2 },  { code: 'MX', weight: 2 },
  { code: 'TH', weight: 2 },  { code: 'PH', weight: 1.5 },
  { code: 'IT', weight: 1.5 },{ code: 'ES', weight: 1.5 },
  { code: 'NG', weight: 1.5 },{ code: 'AR', weight: 1 },
  { code: 'SE', weight: 1 },  { code: 'PL', weight: 1 },
  { code: 'CL', weight: 0.8 },{ code: 'NZ', weight: 0.8 },
  { code: 'NO', weight: 0.5 },{ code: 'DK', weight: 0.5 },
  { code: 'FI', weight: 0.5 },{ code: 'KE', weight: 0.5 },
]
const COUNTRY_WEIGHT_TOTAL = COUNTRY_POOL.reduce((s, c) => s + c.weight, 0)

const STUDY_TOPICS = [
  'Mathematics', 'Physics', 'Computer Science', 'Biology', 'Chemistry',
  'Literature', 'History', 'Philosophy', 'Economics', 'Psychology',
  'Art History', 'Music Theory', 'Linguistics', 'Political Science',
  'Environmental Science', 'Engineering', 'Medicine', 'Law',
  'Neuroscience', 'Astronomy', 'Data Science', 'Architecture',
]

const BIOS = [
  'Early bird study sessions are my thing. Coffee + textbooks = perfect morning.',
  'Night owl here. The library hits different at 2 AM.',
  'Trying to maintain a 30-day study streak. Send help.',
  'Physics major. If I can understand quantum mechanics, I can handle anything.',
  'Here to procrastinate productively. At least I look busy.',
  'Just vibes and flashcards. Currently surviving finals week.',
  'Believe in this journey. One chapter at a time.',
  'Taking a break from my break. Studies: 1, Sleep: 0.',
  'My notes have notes. It\'s a problem but I\'m committed.',
  'Studying something I love makes it feel less like work.',
  'The library is my second home. The wifi is good here.',
  'Goal: understand everything. Current progress: understanding some things.',
  'Currently powered by caffeine and academic pressure.',
  'In my productive procrastination era. Studying instead of doing laundry.',
  'Future doctor/engineer/lawyer. Today: student who needs more sleep.',
  'Taking breaks between study sessions. This counts as studying.',
  'My brain has too many tabs open. Mostly academic ones.',
  'The stack of books next to me is a cry for help.',
  'I study therefore I am... tired.',
  'Academic weapon or academic victim? Depends on the day.',
]

// The app launched in 2026 — no scholar may be joined before then.
const JOIN_DATES = [
  'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026',
  'Jun 2026', 'Jul 2026', 'Aug 2026',
]

const NPC_BANNER_IDS = [
  'default_banner', 'aurora', 'ember', 'forest', 'midnight', 'dawn',
  'tide', 'mystic', 'neon_glitch', 'crimson_flame',
  'cyberpunk_neon', 'ethereal_angel', 'moonlit_celestial',
  'neon_glitch_explosion', 'neon_rainy', 'vaporwave_glitch',
]

const NPC_LOGO_IDS = [
  '', 'neon_avatar', 'angel_logo', 'chibi_angel_2',
  'chibi_cat_girl', 'chibi_cyberpunk', 'chibi_mage', 'chibi_moon_spirit',
  'chibi_dragon', 'chibi_robot', 'chibi_samurai', 'cloud_angel',
  'glitch_chibi', 'kawaii_angel', 'neon_chibi_warrior', 'star_child',
]

// THE cast — exactly these nine characters, nothing else: James, Lily, Mia,
// Ruslana, Dino, Bunny, Black Robot, Alien, Piggy. Every scholar uses the
// character's REAL look (its default fallback) — same hair, same pony, same
// colours as the actual character — so what you see is what a real player
// with that character looks like. No rolled clone looks, no look mixing.
const NPC_CHAR_IDS = [
  'james', 'claire', 'mia', 'ruslan',
  'dino', 'rabbit', 'robot', 'alien', 'pig',
  'angel', 'sunflower', 'elephant', 'monkey', 'panda',
]
const CHAR_POOL: { id: string; w: number }[] = NPC_CHAR_IDS.map((id) => ({ id, w: 1 }))
const CHAR_WEIGHT_TOTAL = CHAR_POOL.reduce((s, c) => s + c.w, 0)

// Bronze + Silver only — every NPC stays under gold rank.
const RANK_POOL = RANKS.filter(
  (r) => r.id.startsWith('bronze') || r.id.startsWith('silver'),
)

// Scholars carry only BASIC desk items — normal laptop, phone, single book,
// book stack. No gaming laptops, no trading rigs, no premium gold items:
// those are player-earned.
const NPC_ACCESSORY_POOL = ['laptop', 'phone', 'book', 'book_stack']

/* ------------------------------------------------ profile */

export interface NpcLook {
  /** Guaranteed non-'none' hair style valid for the character's body type. */
  hair: string
  hairColor: string
  skin: string
  eyes: string
  glasses: boolean
  glassesColor?: string
  hairBand: boolean
  hairBandColor?: string
  topColor?: string
  bottomColor?: string
  shoeColor?: string
}

export interface NpcProfile {
  /** Global index — identity and schedule derive from this alone. */
  idx: number
  id: string
  name: string
  characterId: string
  /** Rolled, distinct look applied on top of the character's fallback. */
  look: NpcLook
  accessories: string[]
  rank: string
  country: string
  studyTopic: string
  banner: string
  logo: string
  bio: string
  joinDate: string
  totalXp: number
  sessionsCompleted: number
  streak: number
  status: 'studying' | 'on-break' | 'offline'
  preferredZone: number
  /** Personal study schedule (ms, anchored at EPOCH_MS). */
  sessionDurationMs: number
  sessionGapMs: number
  sessionPhaseMs: number
}

const cache = new Map<number, NpcProfile>()

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]
}

/** Deterministic full profile for global NPC index. Cached per session. */
export function npcProfile(idx: number): NpcProfile {
  const hit = cache.get(idx)
  if (hit) return hit

  const r = mulberry32(hash(idx, 0x5eed))

  const freeNames = FIRST_NAMES.filter((n) => !RESERVED_NAMES.has(n))
  const base = r() < 0.7 ? pick(r, freeNames) : pick(r, HANDLES)
  const num = 10 + Math.floor(r() * 90)
  const name = `${base}${num}`

  let cr = r() * CHAR_WEIGHT_TOTAL
  let characterId = CHAR_POOL[0].id
  for (const c of CHAR_POOL) {
    cr -= c.w
    if (cr <= 0) { characterId = c.id; break }
  }

  const ch = characterById(characterId)
  // The REAL character look — no rolling. NPCs wearing a character look exactly
  // like that character (hair, pony, skin, clothes all come from the fallback),
  // so a scholar with Lily's body is Lily, not "a stranger with a ponytail".
  const look: NpcLook = {
    hair: ch.fallback.hair,
    hairColor: ch.fallback.hairColor,
    skin: ch.fallback.skin,
    eyes: ch.fallback.eyes,
    glasses: false,
    hairBand: false,
  }

  const rankW = (id: string) => (id.startsWith('bronze') ? 5 : 2.5)
  const rankTotal = RANK_POOL.reduce((s, rk) => s + rankW(rk.id), 0)
  let rr = r() * rankTotal
  let rankId = RANK_POOL[0].id
  for (const rk of RANK_POOL) {
    rr -= rankW(rk.id)
    if (rr <= 0) { rankId = rk.id; break }
  }
  const xp = RANKS.find((rk) => rk.id === rankId)?.threshold ?? 0

  const n = Math.floor(r() * 2) + 1
  const accessories: string[] = []
  for (let i = 0; i < n; i++) {
    const id = pick(r, NPC_ACCESSORY_POOL)
    if (!accessories.includes(id)) accessories.push(id)
  }

  const sessionDurationMs = SESSION_MIN_MS + r() * SESSION_SPREAD_MS
  const sessionGapMs = GAP_MIN_MS + r() * GAP_SPREAD_MS
  const cycle = sessionDurationMs + sessionGapMs

  const p: NpcProfile = {
    idx,
    id: `npc_${idx}`,
    name,
    characterId,
    look,
    accessories,
    rank: rankId,
    country: pick(r, COUNTRY_POOL).code,
    studyTopic: pick(r, STUDY_TOPICS),
    banner: pick(r, NPC_BANNER_IDS),
    logo: pick(r, NPC_LOGO_IDS),
    bio: pick(r, BIOS),
    joinDate: pick(r, JOIN_DATES),
    totalXp: xp + Math.floor(r() * 2000),
    sessionsCompleted: Math.floor(r() * 200) + 10,
    streak: Math.floor(r() * 60) + 1,
    status: r() < 0.8 ? 'studying' : 'on-break',
    preferredZone: pickZoneIdx(r),
    sessionDurationMs,
    sessionGapMs,
    sessionPhaseMs: r() * cycle,
  }
  cache.set(idx, p)
  return p
}

/* ------------------------------------------------ schedule + rooms */

export interface NpcSession {
  online: boolean
  /** Start of the current (or next) session, ms. */
  start: number
  /** End of the current session (start + duration), ms. */
  end: number
  /** Start of the session after next. */
  next: number
}

/** Where a global NPC lives: which library room index they belong to. */
export function npcRoom(idx: number): number {
  for (let r = 0; r < NPC_ROOMS; r++) {
    if (idx < NPC_ROOM_STARTS[r] + NPC_ROOM_CAPS[r]) return r
  }
  return 0
}

/** The global indices assigned to a library room. */
export function roomNpcIndices(roomIdx: number): number[] {
  const out: number[] = []
  const from = NPC_ROOM_STARTS[roomIdx]
  for (let i = from; i < from + NPC_ROOM_CAPS[roomIdx]; i++) out.push(i)
  return out
}

/** Current session window for a global NPC. */
export function npcSession(idx: number, now: number): NpcSession {
  const p = npcProfile(idx)
  const cycle = p.sessionDurationMs + p.sessionGapMs
  const k = Math.floor((now - EPOCH_MS - p.sessionPhaseMs) / cycle)
  const start = EPOCH_MS + p.sessionPhaseMs + k * cycle
  const end = start + p.sessionDurationMs
  return { online: NPC_ALWAYS_ONLINE || (now >= start && now < end), start, end, next: start + cycle }
}

/** How many NPCs in a room are present right now (all of them when permanent). */
export function npcOnlineCount(roomIdx: number, now: number): number {
  let n = 0
  for (const i of roomNpcIndices(roomIdx)) if (npcSession(i, now).online) n++
  return n
}

/** All NPCs in a room that are present right now, sorted by index. */
export function npcOnlineInRoom(roomIdx: number, now: number): NpcProfile[] {
  const out: NpcProfile[] = []
  for (const i of roomNpcIndices(roomIdx)) {
    if (npcSession(i, now).online) out.push(npcProfile(i))
  }
  return out
}

/* ------------------------------------------------ seat assignment */

// NPCs get PERMANENT seats: seat id = (npcIdx * STEP) % seatCount. STEP is
// coprime with any plausible seat count, so every NPC in a room owns a unique
// seat forever. The seat depends ONLY on the NPC's own index — no user input,
// no session state — so no player can ever change an NPC's spot. (NPCs sit
// scattered across the hall because 37 strides through the seat list.)
const NPC_SEAT_STEP = 37

/** The seat id an NPC permanently owns. Deterministic, immutable. */
export function npcSeatId(idx: number, seatCount: number): number {
  if (seatCount <= 0) return -1
  return (idx * NPC_SEAT_STEP) % seatCount
}

/** True if a present NPC in the room permanently owns this seat right now. */
export function npcSeatOccupied(
  roomIdx: number,
  seatId: number,
  now: number,
  seatCount: number
): boolean {
  for (const i of roomNpcIndices(roomIdx)) {
    if (npcSession(i, now).online && npcSeatId(i, seatCount) === seatId) return true
  }
  return false
}

/**
 * Map NPC indices to their permanent seats. `takenByUser` (players' seats) is
 * the ONLY user input and is consulted as a last resort: if a user is
 * physically sitting in an NPC's permanent seat — only possible if they took it
 * while the NPC was offline — the NPC claims their next permanent slot instead,
 * skipping seats other NPCs own. Everyone else keeps their own seat, always.
 */
export function assignNpcSeats(
  indices: number[],
  seats: Seat[],
  takenByUser?: ReadonlySet<number>
): Map<number, Seat> {
  const out = new Map<number, Seat>()
  const n = seats.length
  if (n === 0) return out
  const permanent = new Set<number>(indices.map((i) => npcSeatId(i, n)))
  for (const idx of indices) {
    let k = 0
    if (takenByUser?.has(seats[npcSeatId(idx, n)].id)) {
      while (k < n) {
        const cid = npcSeatId(idx + k, n)
        if (cid !== npcSeatId(idx, n) && !permanent.has(cid) && !takenByUser.has(seats[cid].id)) break
        k++
      }
    }
    out.set(idx, seats[npcSeatId(idx + k, n)])
  }
  return out
}

/** Library room index (0-based) for a realm room id; -1 if not a library room. */
export function libraryRoomIndex(roomId: string | null | undefined): number {
  const i = roomId ? LIBRARY_ROOMS.findIndex((r) => r.id === roomId) : -1
  return i
}
