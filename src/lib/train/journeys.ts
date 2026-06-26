import { insforge } from '../insforge'
import type { LineId } from './lines'

// Persistence for Train Station journeys. Local-first so it works instantly for
// guests and offline (the journey clock is wall-clock, so a localStorage snapshot
// is enough to restore an in-flight journey on reload), with best-effort sync to
// InsForge so a journey survives a device change and seat/occupancy can later be
// shared. Every server call is wrapped so a missing backend / signed-out user
// degrades silently to local-only — play never blocks on the network.
//
// Mirrors the realm-presence pattern (src/lib/realmPresence.ts): SELECT-able
// table, all writes through SECURITY DEFINER RPCs. See the migration
// `..._add-train-journeys.sql`.

export interface JournalEntry {
  id: string
  lineId: LineId
  route: string
  destination: string
  minutes: number
  distanceKm: number
  xp: number
  coins: number
  tickets: number
  activeFocusSec: number
  startedAt: number
  completedAt: number
}

export interface PersistedJourney {
  phase: 'browsing' | 'boarding' | 'traveling' | 'arrived'
  lineId: LineId | null
  seat: number | null
  startedAt: number | null
  endsAt: number | null
  activeFocusSec: number
  lastSeenAt: number
  coins: number
  tickets: number
  journal: JournalEntry[]
}

/* ----------------------------------------------------------------- local --- */

function key(userId: string | null): string {
  return `sf.train.journey.${userId ?? 'guest'}`
}

export function loadJourneyState(userId: string | null): PersistedJourney | null {
  try {
    const raw = localStorage.getItem(key(userId))
    return raw ? (JSON.parse(raw) as PersistedJourney) : null
  } catch {
    return null
  }
}

export function saveJourneyState(userId: string | null, data: PersistedJourney): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(data))
  } catch {
    /* storage blocked — server sync still covers signed-in players */
  }
}

export function pushJournalEntry(userId: string | null, entry: JournalEntry): void {
  const cur = loadJourneyState(userId)
  if (!cur) return
  const journal = [entry, ...cur.journal.filter((j) => j.id !== entry.id)].slice(0, 200)
  saveJourneyState(userId, { ...cur, journal })
}

/* ---------------------------------------------------------------- server --- */

interface StartArgs {
  lineId: LineId
  platform: number
  seat: number
  minutes: number
  startedAt: number
}

/** Begin a server-tracked journey (one active row per player). Best-effort. */
export async function syncStartJourney(userId: string | null, a: StartArgs): Promise<void> {
  if (!userId) return
  try {
    await insforge.database.rpc('start_train_journey', {
      p_line_id: a.lineId,
      p_platform: a.platform,
      p_seat: a.seat,
      p_minutes: a.minutes,
      p_started_at: new Date(a.startedAt).toISOString(),
      p_ends_at: new Date(a.startedAt + a.minutes * 60_000).toISOString(),
    })
  } catch {
    /* offline / backend not yet migrated — local snapshot is the fallback */
  }
}

/** Heartbeat: keep the active row fresh + accrue active focus (sleep detection). */
export async function syncHeartbeat(userId: string | null, activeFocusSec: number): Promise<void> {
  if (!userId) return
  try {
    await insforge.database.rpc('train_journey_heartbeat', { p_active_focus_sec: Math.round(activeFocusSec) })
  } catch {
    /* ignore */
  }
}

/** Finish: move the active journey into the history log + clear the active row. */
export async function syncCompleteJourney(userId: string | null, e: JournalEntry): Promise<void> {
  if (!userId) return
  try {
    await insforge.database.rpc('complete_train_journey', {
      p_line_id: e.lineId,
      p_minutes: e.minutes,
      p_distance_km: e.distanceKm,
      p_xp: e.xp,
      p_coins: e.coins,
      p_tickets: e.tickets,
      p_active_focus_sec: e.activeFocusSec,
      p_started_at: new Date(e.startedAt).toISOString(),
      p_completed_at: new Date(e.completedAt).toISOString(),
    })
  } catch {
    /* ignore */
  }
}

export async function syncAbandonJourney(userId: string | null): Promise<void> {
  if (!userId) return
  try {
    await insforge.database.rpc('abandon_train_journey', {})
  } catch {
    /* ignore */
  }
}

/** Restore an in-flight journey from the server (cross-device). Returns null
 *  when there is none / the backend is unavailable; the caller falls back to the
 *  local snapshot. We only need the fields required to resume the clock. */
export async function fetchActiveJourney(userId: string | null): Promise<PersistedJourney | null> {
  if (!userId) return null
  try {
    const { data, error } = await insforge.database.rpc('get_active_train_journey', {})
    if (error || !data || typeof data !== 'object') return null
    const r = data as Record<string, unknown>
    if (!r.line_id || !r.ends_at) return null
    const local = loadJourneyState(userId)
    return {
      phase: 'traveling',
      lineId: r.line_id as LineId,
      seat: typeof r.seat === 'number' ? (r.seat as number) : null,
      startedAt: r.started_at ? new Date(r.started_at as string).getTime() : null,
      endsAt: new Date(r.ends_at as string).getTime(),
      activeFocusSec: typeof r.active_focus_sec === 'number' ? (r.active_focus_sec as number) : 0,
      lastSeenAt: Date.now(),
      coins: local?.coins ?? 0,
      tickets: local?.tickets ?? 0,
      journal: local?.journal ?? [],
    }
  } catch {
    return null
  }
}
