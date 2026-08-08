// Owner Overrides — runtime-tunable config values persisted in localStorage.
//
// When the owner edits XP values, rank thresholds, achievement rewards, train
// line durations, etc. in the /owner panel, those overrides land here. Every
// system reads its values via getOverride() which falls back to the hardcoded
// default when no override exists.
//
// Format: { [system]: { [key]: value } }
// Persisted at sf.owner.overrides.v1
// Synced to DB via ownerContent.ts (SECURITY DEFINER RPCs).

import { getOwnerContent, setOwnerContent } from './ownerContent'

const STORAGE_KEY = 'sf.owner.overrides.v1'

export interface OwnerOverrides {
  xp?: Record<string, number>
  pomoRewards?: Record<string, number>
  dailyCaps?: Record<string, number>
  streakTiers?: { minDays: number; mult: number }[]
  ranks?: Record<string, number>
  hardcore?: Record<string, number>
  achievements?: Record<string, { leaves?: number; comingSoon?: boolean }>
  train?: {
    lines?: Record<string, { minutes?: number; cadenceSec?: number; boardSec?: number }>
    rewards?: Record<string, number>
  }
  characters?: Record<string, { price?: number; rarity?: string; currency?: 'green' | 'gold'; visible?: boolean }>
  themes?: Record<string, { price?: number; unlockLevel?: number; visible?: boolean }>
  banners?: Record<string, { price?: number; currency?: 'green' | 'gold'; visible?: boolean }>
  logos?: Record<string, { price?: number; currency?: 'green' | 'gold'; visible?: boolean }>
}

let cache: OwnerOverrides = {}
let loaded = false

function load(): OwnerOverrides {
  if (loaded) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? JSON.parse(raw) : {}
  } catch {
    cache = {}
  }
  loaded = true
  return cache
}

function save(data: OwnerOverrides) {
  cache = data
  loaded = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  // Debounced DB push
  syncToDb(data)
}

let dbTimer: ReturnType<typeof setTimeout> | null = null
function syncToDb(data: OwnerOverrides) {
  if (dbTimer) clearTimeout(dbTimer)
  dbTimer = setTimeout(() => {
    setOwnerContent('overrides', data as unknown as Record<string, unknown>)
  }, 1000)
}

/**
 * Fetch overrides from DB and merge with localStorage.
 * Call once on app init (e.g. in App.tsx or OwnerPanel mount).
 * DB wins if newer; localStorage used as fallback when offline.
 */
export async function syncOverridesFromDb(): Promise<void> {
  const dbData = await getOwnerContent('overrides')
  if (!dbData) return
  // DB data takes precedence over localStorage
  cache = dbData as unknown as OwnerOverrides
  loaded = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
}

/** Get a single override value. Returns fallback if no override exists. */
export function getOverride<K extends keyof OwnerOverrides, V>(
  system: K,
  key: string,
  fallback: V,
): V {
  const data = load()
  const group = data[system] as Record<string, unknown> | undefined
  if (group && key in group) return group[key] as V
  return fallback
}

/** Get a nested override value (e.g. getNestedOverride('train', 'lines', 'express', 'minutes', 20)) */
export function getNestedOverride(
  system: keyof OwnerOverrides,
  group: string,
  id: string,
  field: string,
  fallback: number,
): number {
  const data = load()
  const sysGroup = (data as Record<string, unknown>)[system] as Record<string, unknown> | undefined
  if (!sysGroup) return fallback
  const sub = sysGroup[group] as Record<string, unknown> | undefined
  if (!sub) return fallback
  const item = sub[id] as Record<string, unknown> | undefined
  if (!item || !(field in item)) return fallback
  return item[field] as number
}

/** Get the full override for a system group. */
export function getSystemGroup<K extends keyof OwnerOverrides>(
  system: K,
): OwnerOverrides[K] {
  const data = load()
  return (data[system] ?? {}) as OwnerOverrides[K]
}

/** Set a single override value. */
export function setOverride(
  system: keyof OwnerOverrides,
  key: string,
  value: unknown,
) {
  const data = load()
  if (!data[system]) (data as Record<string, unknown>)[system] = {}
  ;(data[system] as Record<string, unknown>)[key] = value
  save(data)
}

/** Set a nested override value. */
export function setNestedOverride(
  system: keyof OwnerOverrides,
  group: string,
  id: string,
  field: string,
  value: number,
) {
  const data = load()
  if (!data[system]) (data as Record<string, unknown>)[system] = {}
  const sysGroup = (data[system] as Record<string, unknown>)[group] as Record<string, unknown> | undefined
  if (!sysGroup) {
    (data[system] as Record<string, unknown>)[group] = { [id]: { [field]: value } }
    save(data)
    return
  }
  if (!sysGroup[id]) sysGroup[id] = {}
  ;(sysGroup[id] as Record<string, unknown>)[field] = value
  save(data)
}

/** Clear all overrides for a system. */
export function clearSystem(system: keyof OwnerOverrides) {
  const data = load()
  delete data[system]
  save(data)
}

/** Clear a specific override. */
export function clearOverride(system: keyof OwnerOverrides, key: string) {
  const data = load()
  const group = data[system] as Record<string, unknown> | undefined
  if (group) {
    delete group[key]
    save(data)
  }
}

/** Reset everything to defaults. */
export function clearAllOverrides() {
  cache = {}
  loaded = true
  localStorage.removeItem(STORAGE_KEY)
}

/** Get the full raw overrides object (for the Data tab display). */
export function getAllOverrides(): OwnerOverrides {
  return load()
}
