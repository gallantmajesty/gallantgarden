// Owner Content — DB helper for reading/writing owner-managed content via
// SECURITY DEFINER RPCs. Falls back to localStorage when offline or unauthenticated.
//
// Content keys:
//   "events"    — the full event catalog (FocusEvent[])
//   "bundles"   — saved bundles (SavedBundle[])
//   "overrides" — runtime config overrides (xp, ranks, achievements, etc.)

import { supabase } from './supabase'

const LS_KEYS = {
  events: 'sf.owner.content.events',
  bundles: 'sf.owner.content.bundles',
  overrides: 'sf.owner.content.overrides',
} as const

export type ContentKey = keyof typeof LS_KEYS

/** Read owner content from DB, falling back to localStorage. */
export async function getOwnerContent(key: ContentKey): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase.rpc('owner_get_content', { p_key: key })
    if (error || data === null || data === undefined) {
      // Fallback to localStorage
      const raw = localStorage.getItem(LS_KEYS[key])
      return raw ? JSON.parse(raw) : null
    }
    // Cache in localStorage for offline
    localStorage.setItem(LS_KEYS[key], JSON.stringify(data))
    return data as Record<string, unknown>
  } catch {
    const raw = localStorage.getItem(LS_KEYS[key])
    return raw ? JSON.parse(raw) : null
  }
}

/** Write owner content to DB + localStorage cache. */
export async function setOwnerContent(key: ContentKey, data: Record<string, unknown>): Promise<boolean> {
  // Always save to localStorage first (instant, works offline)
  localStorage.setItem(LS_KEYS[key], JSON.stringify(data))

  try {
    const { error } = await supabase.rpc('owner_upsert_content', { p_key: key, p_data: data })
    return !error
  } catch {
    return false
  }
}

/** Delete owner content from DB + localStorage. */
export async function deleteOwnerContent(key: ContentKey): Promise<boolean> {
  localStorage.removeItem(LS_KEYS[key])
  try {
    const { error } = await supabase.rpc('owner_delete_content', { p_key: key })
    return !error
  } catch {
    return false
  }
}

/** List all content keys (owner only). */
export async function listOwnerKeys(): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('owner_list_keys')
    if (error || !data) return []
    return data as string[]
  } catch {
    return []
  }
}

/** Fetch and cache all owner content (called on app init). */
export async function syncOwnerContent(): Promise<void> {
  const events = await getOwnerContent('events')
  if (events) localStorage.setItem(LS_KEYS.events, JSON.stringify(events))

  const overrides = await getOwnerContent('overrides')
  if (overrides) localStorage.setItem(LS_KEYS.overrides, JSON.stringify(overrides))
}
