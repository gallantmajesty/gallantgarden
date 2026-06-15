import {
  getCachedProfileSettings,
  loadProfileSettings,
  patchProfileSettings,
} from './profileStore'

/**
 * "Run once" initialization system.
 *
 * Two scopes:
 *  - **global**  — once per device/browser, persisted in `localStorage`. Good for
 *    first-launch configuration that has no user yet.
 *  - **per-user** — once per account, persisted in `profiles.settings.ranOnce`
 *    (so it follows the user across devices), with a `localStorage` mirror as a
 *    fast cache. Good for first-time onboarding and one-off seeding.
 *
 * Both expose a high-level `*RunOnce(key, fn)` helper (run the side-effect at most
 * once) and low-level `has*Run` / `mark*Run` primitives for cases where the UI
 * itself is the "action" (e.g. a welcome modal that marks the flag when closed).
 */

type OnceMap = Record<string, boolean>

/* ----------------------------------------------------------------- global */

const GLOBAL_PREFIX = 'fl.once.global.'

export function hasGlobalRun(key: string): boolean {
  try {
    return localStorage.getItem(GLOBAL_PREFIX + key) === '1'
  } catch {
    return false
  }
}

export function markGlobalRun(key: string): void {
  try {
    localStorage.setItem(GLOBAL_PREFIX + key, '1')
  } catch {
    /* storage blocked — treat as "not yet run"; worst case the action repeats */
  }
}

/** Run `fn` at most once per device. Returns true if it ran this time. */
export async function globalRunOnce(
  key: string,
  fn: () => void | Promise<void>,
): Promise<boolean> {
  if (hasGlobalRun(key)) return false
  await fn()
  markGlobalRun(key)
  return true
}

/* --------------------------------------------------------------- per-user */

const USER_CACHE_PREFIX = 'fl.once.user.'

function readUserCache(userId: string): OnceMap {
  try {
    const raw = localStorage.getItem(USER_CACHE_PREFIX + userId)
    return raw ? (JSON.parse(raw) as OnceMap) : {}
  } catch {
    return {}
  }
}

function writeUserCache(userId: string, map: OnceMap): void {
  try {
    localStorage.setItem(USER_CACHE_PREFIX + userId, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function ranOnceFrom(settings: Record<string, unknown>): OnceMap {
  const r = settings.ranOnce
  return r && typeof r === 'object' ? (r as OnceMap) : {}
}

/** Synchronous best-effort check from the cached profile + local mirror. Call
 *  after `loadProfileSettings(userId)` (done during app init) for an accurate
 *  answer; before that it only reflects the local cache. */
export function hasUserRun(userId: string, key: string): boolean {
  if (readUserCache(userId)[key]) return true
  return !!ranOnceFrom(getCachedProfileSettings(userId))[key]
}

/** Persist a per-user run-once flag (cloud + local mirror). */
export async function markUserRun(userId: string, key: string): Promise<void> {
  const cache = readUserCache(userId)
  cache[key] = true
  writeUserCache(userId, cache)

  const ranOnce = ranOnceFrom(getCachedProfileSettings(userId))
  if (!ranOnce[key]) {
    await patchProfileSettings(userId, { ranOnce: { ...ranOnce, [key]: true } })
  }
}

/** Run `fn` at most once per user. Returns true if it ran this time.
 *  Checks the local cache first, then the authoritative profile document. */
export async function userRunOnce(
  userId: string,
  key: string,
  fn: () => void | Promise<void>,
): Promise<boolean> {
  if (readUserCache(userId)[key]) return false

  // Authoritative check against the cloud document (load it if init hasn't).
  const settings = getCachedProfileSettings(userId)
  const ranOnce = ranOnceFrom(
    Object.keys(settings).length ? settings : await loadProfileSettings(userId),
  )
  if (ranOnce[key]) {
    const cache = readUserCache(userId)
    cache[key] = true
    writeUserCache(userId, cache)
    return false
  }

  await fn()
  await markUserRun(userId, key)
  return true
}
