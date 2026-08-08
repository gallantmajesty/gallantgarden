import { supabase } from './supabase'

/**
 * Thin accessor for the per-user `profiles.settings` jsonb document.
 *
 * This is the single cloud-side bag of user preferences. We namespace keys
 * inside it (e.g. `app` for UI settings, `ranOnce` for run-once flags) so the
 * different writers — the settings store and the run-once system — never clobber
 * each other. An in-memory cache holds the last-known document so writers can do
 * a safe shallow merge without an extra round-trip.
 *
 * The `profiles` row is created on demand: `upsert` with just `{ id, settings }`
 * relies on the table's column defaults (display_name, avatar) to fill the rest,
 * and RLS restricts every row to its owner.
 */
export type ProfileSettings = Record<string, unknown>

let cache: ProfileSettings | null = null
let cacheUser: string | null = null

/** Load (and cache) the current user's settings document. Returns `{}` when the
 *  user has no profile row yet or the fetch fails (offline-tolerant).
 *
 *  Reads prefer the `get_my_settings()` RPC: the `settings` column is
 *  column-revoked from `authenticated` (see
 *  migrations/20260809000000_security-invoker-public-profiles.sql) so no one
 *  but the owner can read it. If that function isn't deployed yet (migration
 *  not applied), fall back to the direct column read. */
export async function loadProfileSettings(userId: string): Promise<ProfileSettings> {
  let settings: ProfileSettings | null = null

  const { data, error } = await supabase.rpc('get_my_settings')
  if (!error && data && typeof data === 'object') {
    settings = data as ProfileSettings
  } else {
    const { data: direct } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle()
    if (direct?.settings && typeof direct.settings === 'object') {
      settings = direct.settings as ProfileSettings
    }
  }

  const result = settings ?? {}
  cache = result
  cacheUser = userId
  return result
}

/** The last-loaded settings document for the active user, or `{}`. Synchronous. */
export function getCachedProfileSettings(userId?: string): ProfileSettings {
  if (userId && cacheUser !== userId) return {}
  return cache ?? {}
}

/** Shallow-merge `patch` into the user's settings document and persist it.
 *  Returns true on success. Updates the in-memory cache so subsequent patches
 *  build on the latest value. */
export async function patchProfileSettings(
  userId: string,
  patch: ProfileSettings,
): Promise<boolean> {
  const base = cacheUser === userId && cache ? cache : await loadProfileSettings(userId)
  const next: ProfileSettings = { ...base, ...patch }

  const { error } = await supabase
    .from('profiles')
    .upsert([{ id: userId, settings: next }], { onConflict: 'id' })

  if (!error) {
    cache = next
    cacheUser = userId
  }
  return !error
}

/** Drop the cache (call on sign-out so the next user starts clean). */
export function clearProfileSettingsCache(): void {
  cache = null
  cacheUser = null
}
