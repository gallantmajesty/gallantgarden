// Cloud sync for Task Magnet — mirrors a user's private MagnetData to InsForge
// (Postgres) behind row-level security, so the same world appears on every
// device. Best-effort: if Supabase isn't configured or the table is missing,
// every call silently no-ops and localStorage remains the source of truth.
//
// Privacy note: this is intentionally the SAME private data that already lives
// per-user in localStorage. RLS restricts each row to its owner (auth.uid()).

import { supabase, supabaseConfigured } from '../supabase'
import type { MagnetData } from './types'

const TABLE = 'magnet_data'

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pending: { userId: string; data: MagnetData } | null = null

/** Debounced push of the latest data for a user. */
export function pushMagnet(userId: string, data: MagnetData) {
  if (!supabaseConfigured) return
  pending = { userId, data }
  if (pushTimer) return
  pushTimer = setTimeout(() => {
    pushTimer = null
    const job = pending
    pending = null
    if (!job) return
    void doPush(job.userId, job.data)
  }, 1500)
}

async function doPush(userId: string, data: MagnetData) {
  try {
    await supabase
      .from(TABLE)
      .upsert([{ id: userId, data, synced_at: new Date().toISOString() }], { onConflict: 'id' })
  } catch {
    /* offline / table missing — localStorage stays authoritative */
  }
}

/**
 * Pull remote data for a user. Resolves to the payload if a remote row exists,
 * otherwise null. Used on hydrate for a fresh device; an existing local world is
 * never overwritten (last-writer-per-device wins) to avoid clobbering offline edits.
 */
export async function pullMagnet(userId: string): Promise<MagnetData | null> {
  if (!supabaseConfigured) return null
  try {
    const { data, error } = await supabase.from(TABLE).select('data').eq('id', userId).maybeSingle()
    if (error || !data) return null
    return (data as { data: MagnetData }).data ?? null
  } catch {
    return null
  }
}
