import { supabase } from './supabase'

// Custom realms — the client side of the `realms` table + its RPCs
// (see migrations/..._add-realms.sql). Realms are persisted server-side so an
// invite code/link resolves to the same realm on anyone's device.

export type RealmVisibility = 'public' | 'private'

/** A realm row as returned by the RPCs (snake_case, straight from Postgres). */
export interface Realm {
  id: string
  code: string
  name: string
  owner_id: string
  world: string
  visibility: RealmVisibility
  player_limit: number
  password: string | null
  expires_at: string | null
  created_at: string
  closed_at: string | null
}

/** The shareable invite link for a realm code: `<origin>/realm/<code>`. */
export function inviteLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/realm/${code}`
}

/** Create a realm owned by the caller. Returns the realm (with its code) or null. */
export async function createRealm(
  name: string,
  visibility: RealmVisibility,
  playerLimit: number,
  password?: string,
): Promise<Realm | null> {
  try {
    const { data, error } = await supabase.rpc('create_realm', {
      p_name: name,
      p_visibility: visibility,
      p_limit: playerLimit,
      p_password: password || null,
    })
    if (error || !data) return null
    return data as Realm
  } catch {
    return null
  }
}

/** Resolve an invite code and join as a member. Returns the realm or an error
 *  string ('realm not found' | 'realm closed' | 'wrong password' | 'realm expired' | …). */
export async function getRealmByCode(
  code: string,
  password?: string,
): Promise<{ realm?: Realm; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_realm_by_code', {
      p_code: code,
      p_password: password || null,
    })
    if (error) return { error: error.message || 'could not open realm' }
    if (!data) return { error: 'realm not found' }
    return { realm: data as Realm }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'could not open realm' }
  }
}

/** Owner-only: rename / change visibility / change player limit. */
export async function updateRealm(
  id: string,
  patch: { name?: string; visibility?: RealmVisibility; playerLimit?: number; password?: string },
): Promise<Realm | null> {
  try {
    const { data, error } = await supabase.rpc('update_realm', {
      p_id: id,
      p_name: patch.name ?? null,
      p_visibility: patch.visibility ?? null,
      p_limit: patch.playerLimit ?? null,
      p_password: patch.password !== undefined ? patch.password : undefined,
    })
    if (error || !data) return null
    return data as Realm
  } catch {
    return null
  }
}

/** Owner-only: close a realm (drops it from discovery and rejects new joins). */
export async function closeRealm(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('close_realm', { p_id: id })
    return !error
  } catch {
    return false
  }
}

/** Open, public realms for the discovery feed (excludes expired). */
export async function listPublicRealms(): Promise<Realm[]> {
  try {
    const { data, error } = await supabase.rpc('list_public_realms', {})
    if (error || !Array.isArray(data)) return []
    return data as Realm[]
  } catch {
    return []
  }
}

/** Search public realms by name (excludes expired). */
export async function searchPublicRealms(query: string): Promise<Realm[]> {
  try {
    const { data, error } = await supabase.rpc('search_public_realms', {
      p_query: query,
    })
    if (error || !Array.isArray(data)) return []
    return data as Realm[]
  } catch {
    return []
  }
}
