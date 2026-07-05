import { insforge } from './insforge'

// Username system. A username is a globally-unique, case-insensitive handle used
// for mentions, profile links (/u/:username), search and friend requests. It is
// distinct from the display name, which is NOT unique. Uniqueness is enforced at
// the DB level (unique index on lower(username)); these helpers add client-side
// validation + a live availability check against the public_profiles view.

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
const USERNAME_RE = /^[a-z0-9_]+$/

// Handles we never let a user claim (impersonation / routing collisions).
const RESERVED = new Set([
  'admin', 'root', 'system', 'support', 'help', 'about', 'profile', 'profiles',
  'user', 'users', 'me', 'you', 'settings', 'login', 'logout', 'signup', 'signin',
  'auth', 'api', 'app', 'home', 'lobby', 'realm', 'explore', 'focuslily', 'focus',
  'lily', 'studyforest', 'staff', 'mod', 'moderator', 'official', 'null', 'undefined',
])

/** Lowercase + trim a raw handle to its canonical form. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export interface UsernameCheck {
  ok: boolean
  error?: string
}

/** Validate the SHAPE of a username (not its availability). */
export function validateUsername(raw: string): UsernameCheck {
  const u = normalizeUsername(raw)
  if (u.length < USERNAME_MIN) return { ok: false, error: `At least ${USERNAME_MIN} characters` }
  if (u.length > USERNAME_MAX) return { ok: false, error: `At most ${USERNAME_MAX} characters` }
  if (!USERNAME_RE.test(u)) return { ok: false, error: 'Use letters, numbers and _ only' }
  if (u.startsWith('_') || u.endsWith('_')) return { ok: false, error: 'Cannot start or end with _' }
  if (RESERVED.has(u)) return { ok: false, error: 'That username is reserved' }
  return { ok: true }
}

/** Is this username free? Excludes the current user (so re-saving your own
 *  handle reads as available). Network-tolerant: on error we report available so
 *  the DB unique index remains the final guard. */
export async function isUsernameAvailable(raw: string, selfId?: string): Promise<boolean> {
  const u = normalizeUsername(raw)
  const { data, error } = await insforge.database
    .from('public_profiles')
    .select('id')
    .eq('username', u)
    .maybeSingle()
  if (error) return true
  if (!data) return true
  return selfId != null && (data as { id: string }).id === selfId
}

/** Full check: shape + availability. */
export async function checkUsername(raw: string, selfId?: string): Promise<UsernameCheck> {
  const shape = validateUsername(raw)
  if (!shape.ok) return shape
  const free = await isUsernameAvailable(raw, selfId)
  return free ? { ok: true } : { ok: false, error: 'That username is taken' }
}

/** Build a candidate handle from a seed (display name / email local-part). */
export function slugifyUsername(seed: string): string {
  const base = normalizeUsername(seed)
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, USERNAME_MAX)
  if (base.length >= USERNAME_MIN) return base
  return (base + 'explorer').slice(0, USERNAME_MAX)
}

/** Suggest an AVAILABLE username derived from a seed, probing numeric suffixes
 *  until one is free (bounded). Falls back to the bare slug if all probes fail. */
export async function suggestUsername(seed: string, selfId?: string): Promise<string> {
  const base = slugifyUsername(seed)
  if (await isUsernameAvailable(base, selfId)) return base
  for (let i = 2; i <= 50; i++) {
    const candidate = `${base.slice(0, USERNAME_MAX - String(i).length)}${i}`
    if (await isUsernameAvailable(candidate, selfId)) return candidate
  }
  return base
}

/** Generate a random unique username like `fl_7x2k9m`. Probes until free. */
export async function generateRandomUsername(): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomSegment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `fl_${randomSegment(6)}`
    if (await isUsernameAvailable(candidate)) return candidate
  }
  return `fl_${randomSegment(8)}`
}
