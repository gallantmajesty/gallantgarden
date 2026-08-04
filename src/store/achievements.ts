// Achievements store — lifetime counters + claimed-keys for the CoC-style
// achievement system (catalog: src/lib/achievements.ts).
//
// Two kinds of progress feed the catalog:
//   LIVE metrics  — read other stores on the fly (focus minutes, streak,
//                   friends, followers, rank…).
//   COUNTERS      — tracked here because no other store keeps the number
//                   (library visits/seats/minutes, login days, active days,
//                   realm visits…). Updated by event hooks bound in `bind()`.
//
// Progress is computed (never stored); only `counters` + `claimed` are
// persisted (localStorage `sf.achievements.v1` + `profiles.achievements`
// jsonb, debounced — same pattern as the shop inventory).

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { ACHIEVEMENTS, tierKey, type AchievementDef, type MetricKey } from '../lib/achievements'
import { usePomodoro } from './pomodoro'
import { useMagnet } from './magnet'
import { useFriends } from './friends'
import { useSocial } from './social'
import { useProfile } from './profile'
import { useRealm, type RealmWorld } from './realm'
import { useWorld } from './world'
import { useRealmNet } from '../multiplayer/net'
import { computeStreak } from '../lib/magnet/insights'
import { rankForLifetime, rankIndex } from '../lib/ranks'
import { useShop } from '../shop/store'
import { syncXpToDb } from '../lib/xpEngine'
import type { RealmKind } from '../lib/realm'

const STORAGE_KEY = 'sf.achievements.v1'

export interface AchievementCounters {
  libraryMin: number
  librarySessions: number
  libraryVisits: number
  librarySeats: number
  /** distinct desk ids sat at (drives the Explorer achievement) */
  deskSeatIds: string[]
  customRealms: number
  publicRealmVisits: number
  /** focus minutes completed while inside a public (global) realm */
  publicRealmMin: number
  /** longest single focus session completed in a public realm (min) */
  maxPublicSessionMin: number
  loginDays: number
  activeDays: number
  /** focus sessions that ran into the night (started at/after 22:00) */
  nightSessions: number
  /** logins made before 08:00 */
  earlyLogins: number
  /** most people ever present in a private room the user hosts */
  maxPrivatePpl: number
  trainVisits: number
  cafeVisits: number
}

const EMPTY_COUNTERS: AchievementCounters = {
  libraryMin: 0,
  librarySessions: 0,
  libraryVisits: 0,
  librarySeats: 0,
  deskSeatIds: [],
  customRealms: 0,
  publicRealmVisits: 0,
  publicRealmMin: 0,
  maxPublicSessionMin: 0,
  loginDays: 0,
  activeDays: 0,
  nightSessions: 0,
  earlyLogins: 0,
  maxPrivatePpl: 0,
  trainVisits: 0,
  cafeVisits: 0,
}

interface AchievementState {
  ready: boolean
  userId: string | null
  counters: AchievementCounters
  /** tierKey (`achId:idx`) → ISO timestamp claimed */
  claimed: Record<string, string>
  lastLoginDay: string
  lastActiveDay: string
  seedDone: boolean

  /** Load local + cloud state, backfill from existing history, bind hooks. */
  hydrate: (userId: string) => Promise<void>
  /** One-time backfill of counters from pre-existing focus history. */
  seedCounters: () => void
  /** Called once per calendar day the app is opened. */
  recordLogin: () => void
  /** Called on any meaningful activity (focus, realm, seat…). */
  recordActiveDay: () => void
  recordRealmVisit: (world: RealmWorld, kind: RealmKind) => void
  recordSeat: (seatId: number) => void
  /** Record a live headcount in the player's own private room (keeps the max). */
  recordPrivatePpl: (count: number) => void
  recordFocusComplete: (minutes: number, inLibrary: boolean, inPublicRealm: boolean, startHour: number) => void
  /** Current progress for a tier (0..threshold). */
  progressFor: (def: AchievementDef, idx: number) => number
  /** Grant the reward + persist. No-op when already claimed / not reached. */
  claim: (def: AchievementDef, idx: number) => Promise<boolean>
  reset: () => void
}

// ---- persistence -----------------------------------------------------------

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mergeCounters(...parts: Partial<AchievementCounters>[]): AchievementCounters {
  const out = { ...EMPTY_COUNTERS }
  const nums = out as Record<string, number | string[]>
  for (const p of parts) {
    for (const k of Object.keys(out) as (keyof AchievementCounters)[]) {
      const v = p[k]
      if (typeof v === 'number' && Number.isFinite(v)) {
        const cur = nums[k as string]
        if (typeof cur !== 'number' || v > cur) nums[k as string] = v
      }
    }
    if (Array.isArray(p.deskSeatIds)) {
      out.deskSeatIds = [...new Set([...out.deskSeatIds, ...p.deskSeatIds])]
    }
  }
  return out
}

interface Persisted {
  v?: number
  counters?: Partial<AchievementCounters>
  claimed?: Record<string, string>
  lastLoginDay?: string
  lastActiveDay?: string
  seedDone?: boolean
}

function loadLocal(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : {}
  } catch {
    return {}
  }
}

function saveLocal(state: AchievementState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        counters: state.counters,
        claimed: state.claimed,
        lastLoginDay: state.lastLoginDay,
        lastActiveDay: state.lastActiveDay,
        seedDone: state.seedDone,
      }),
    )
  } catch { /* ignore */ }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingBlob: Persisted | null = null

function syncToDb(userId: string, blob: Persisted) {
  pendingBlob = blob
  if (syncTimer) return
  syncTimer = setTimeout(async () => {
    syncTimer = null
    const toSave = pendingBlob
    try {
      await supabase
        .from('profiles')
        .upsert([{ id: userId, achievements: toSave }], { onConflict: 'id' })
    } catch {
      /* offline / column missing — localStorage is still authoritative */
    }
  }, 3000)
}

// ---- live metric values ------------------------------------------------------

/** Read the current value of a metric. Live metrics hit other stores; the rest
 *  come from this store's persisted counters. */
export function liveMetric(key: MetricKey): number {
  switch (key) {
    case 'focusMin':
      return usePomodoro.getState().totalFocusMin
    case 'focusSessions':
      return usePomodoro.getState().completed
    case 'streak':
      return computeStreak(useMagnet.getState().data, new Date())
    case 'marathonDay': {
      const byDay = new Map<string, number>()
      for (const f of useMagnet.getState().data.focus) {
        byDay.set(f.date, (byDay.get(f.date) ?? 0) + f.minutes)
      }
      for (const v of byDay.values()) if (v >= 180) return 1
      return 0
    }
    case 'friends':
      return useFriends.getState().friendIds.size
    case 'friendRequests':
      return useFriends.getState().outgoing.length
    case 'followers':
      return useSocial.getState().myCounts.followers
    case 'rankIndex': {
      const p = useProfile.getState()
      return rankIndex(rankForLifetime(p.rankXp, p.xp, p.premiumXp).id)
    }
    default: {
      const c = useAchievements.getState().counters
      switch (key) {
        case 'libraryMin': return c.libraryMin
        case 'librarySessions': return c.librarySessions
        case 'libraryVisits': return c.libraryVisits
        case 'librarySeats': return c.librarySeats
        case 'deskVariety': return c.deskSeatIds.length
        case 'customRealms': return c.customRealms
        case 'publicRealmVisits': return c.publicRealmVisits
        case 'publicRealmMin': return c.publicRealmMin
        case 'maxPublicSessionMin': return c.maxPublicSessionMin
        case 'loginDays': return c.loginDays
        case 'activeDays': return c.activeDays
        case 'nightSessions': return c.nightSessions
        case 'earlyLogins': return c.earlyLogins
        case 'maxPrivatePpl': return c.maxPrivatePpl
        case 'cafeVisits': return c.cafeVisits
        case 'worldsVisited':
          return Math.min(c.libraryVisits, c.trainVisits, c.cafeVisits) > 0 ? 1 : 0
        default: return 0
      }
    }
  }
}

// ---- event binding (once per app session) -------------------------------------

let bound = false

function bindTracking(): void {
  if (bound) return
  bound = true

  // Realm visits: whenever `active` transitions null → non-null, log a visit.
  let prevRealm: ReturnType<typeof useRealm.getState>['active'] = null
  useRealm.subscribe((s) => {
    if (s.active && s.active !== prevRealm) {
      useAchievements.getState().recordRealmVisit(s.active.world, s.active.kind)
    }
    prevRealm = s.active
  })

  // Library desk sits (the 3D world seat lives in useWorld). Track each sit,
  // plus the set of distinct desks for the Explorer achievement.
  let prevSeat: number | null = null
  useWorld.subscribe((s) => {
    if (s.seat != null && s.seat !== prevSeat) useAchievements.getState().recordSeat(s.seat)
    prevSeat = s.seat
  })

  // Private-room hosting: while the player is inside a private (custom) room
  // they own, keep the highest live headcount (live roster + self).
  const updatePrivateRoomPpl = () => {
    const s = useAchievements.getState()
    const active = useRealm.getState().active
    if (!active || active.kind !== 'custom') return
    const mine = active.roomId
      ? useRealm.getState().custom.find((r) => r.id === active.roomId)
      : null
    if (!mine || (mine.ownerId && mine.ownerId !== s.userId)) return
    const count = Object.keys(useRealmNet.getState().roster).length + 1
    if (count > s.counters.maxPrivatePpl) useAchievements.getState().recordPrivatePpl(count)
  }
  useRealmNet.subscribe(updatePrivateRoomPpl)

  // Focus sessions: count library study when the player is in a library world
  // or sitting at a library desk, and public-realm time when inside a global
  // realm (universal time for the Crowd Focuser + Night Owl achievements).
  let prevCompleted = usePomodoro.getState().completed
  usePomodoro.subscribe((s) => {
    if (s.completed > prevCompleted) {
      const active = useRealm.getState().active
      const inLibrary =
        active?.world === 'library' || useWorld.getState().seat != null
      const inPublicRealm = active?.kind === 'global'
      const startHour = s.startedAt ? new Date(s.startedAt).getHours() : new Date().getHours()
      useAchievements.getState().recordFocusComplete(s.sessionMinutes, !!inLibrary, !!inPublicRealm, startHour)
    }
    prevCompleted = s.completed
  })

  // Reopening the tab counts as "returning" — one login per calendar day.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) useAchievements.getState().recordLogin()
    })
  }
}

// ---- store -------------------------------------------------------------------

export const useAchievements = create<AchievementState>((set, get) => ({
  ready: false,
  userId: null,
  counters: { ...EMPTY_COUNTERS },
  claimed: {},
  lastLoginDay: '',
  lastActiveDay: '',
  seedDone: false,

  hydrate: async (userId) => {
    if (get().userId === userId && get().ready) return

    const local = loadLocal()
    let db: Persisted = {}
    try {
      const { data: row } = await supabase
        .from('profiles')
        .select('achievements')
        .eq('id', userId)
        .maybeSingle()
      if (row && typeof (row as Record<string, unknown>).achievements === 'object') {
        db = ((row as Record<string, unknown>).achievements ?? {}) as Persisted
      }
    } catch { /* offline — local is fine */ }

    const counters = mergeCounters(local.counters ?? {}, db.counters ?? {})
    const claimed = { ...(db.claimed ?? {}), ...(local.claimed ?? {}) }

    set({
      userId,
      ready: true,
      counters,
      claimed,
      lastLoginDay: local.lastLoginDay || db.lastLoginDay || '',
      lastActiveDay: local.lastActiveDay || db.lastActiveDay || '',
      seedDone: local.seedDone || db.seedDone || false,
    })

    bindTracking()
    get().seedCounters()
    get().recordLogin()
  },

  // One-time backfill from existing history so veteran players already have
  // progress. `max` keeps any already-tracked counter intact.
  seedCounters: () => {
    const s = get()
    if (s.seedDone) return
    const magnet = useMagnet.getState().data
    const days = new Set<string>(magnet.focus.map((f) => f.date))
    const next = mergeCounters(s.counters, {
      loginDays: days.size,
      activeDays: days.size,
    })
    const seedDone = true
    set({ counters: next, seedDone })
    saveLocal(get())
  },

  recordLogin: () => {
    const today = todayStr()
    const s = get()
    if (s.lastLoginDay === today) return
    const counters = { ...s.counters }
    counters.loginDays += 1
    counters.activeDays += 1
    if (new Date().getHours() < 8) counters.earlyLogins += 1
    set({ counters, lastLoginDay: today, lastActiveDay: today })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters, claimed: get().claimed, lastLoginDay: today, lastActiveDay: today, seedDone: get().seedDone })
  },

  recordActiveDay: () => {
    const today = todayStr()
    const s = get()
    if (s.lastActiveDay === today) return
    const counters = { ...s.counters, activeDays: s.counters.activeDays + 1 }
    set({ counters, lastActiveDay: today })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters, claimed: get().claimed, lastLoginDay: get().lastLoginDay, lastActiveDay: today, seedDone: get().seedDone })
  },

  recordRealmVisit: (world, kind) => {
    const s = get()
    const counters = { ...s.counters }
    if (world === 'library') counters.libraryVisits += 1
    if (world === 'train-station') counters.trainVisits += 1
    if (world === 'uk-cafe') counters.cafeVisits += 1
    if (kind === 'custom') counters.customRealms += 1
    else counters.publicRealmVisits += 1
    set({ counters })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters, claimed: get().claimed, lastLoginDay: get().lastLoginDay, lastActiveDay: get().lastActiveDay, seedDone: get().seedDone })
    get().recordActiveDay()
  },

  recordSeat: (seatId) => {
    const s = get()
    const deskSeatIds = s.counters.deskSeatIds.includes(String(seatId))
      ? s.counters.deskSeatIds
      : [...s.counters.deskSeatIds, String(seatId)]
    set({ counters: { ...s.counters, librarySeats: s.counters.librarySeats + 1, deskSeatIds } })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters: get().counters, claimed: get().claimed, lastLoginDay: get().lastLoginDay, lastActiveDay: get().lastActiveDay, seedDone: get().seedDone })
    get().recordActiveDay()
  },

  recordPrivatePpl: (count) => {
    const s = get()
    if (count <= s.counters.maxPrivatePpl) return
    const counters = { ...s.counters, maxPrivatePpl: count }
    set({ counters })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters, claimed: get().claimed, lastLoginDay: get().lastLoginDay, lastActiveDay: get().lastActiveDay, seedDone: get().seedDone })
    get().recordActiveDay()
  },

  recordFocusComplete: (minutes, inLibrary, inPublicRealm, startHour) => {
    if ((!inLibrary && !inPublicRealm) || minutes <= 0) return
    const s = get()
    const counters = { ...s.counters }
    if (inLibrary) {
      counters.libraryMin += minutes
      counters.librarySessions += 1
    }
    if (inPublicRealm) {
      counters.publicRealmMin += minutes
      if (minutes > counters.maxPublicSessionMin) counters.maxPublicSessionMin = minutes
    }
    if (startHour >= 22) counters.nightSessions += 1
    set({ counters })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters, claimed: get().claimed, lastLoginDay: get().lastLoginDay, lastActiveDay: get().lastActiveDay, seedDone: get().seedDone })
    get().recordActiveDay()
  },

  progressFor: (def, idx) => {
    const tier = def.tiers[idx]
    if (!tier) return 0
    return Math.min(liveMetric(def.metric), tier.threshold)
  },

  claim: async (def, idx) => {
    const tier = def.tiers[idx]
    if (!tier) return false
    if (def.comingSoon) return false
    const key = tierKey(def.id, idx)
    const s = get()
    if (s.claimed[key]) return true
    if (liveMetric(def.metric) < tier.threshold) return false

    // 1. Green leaves — never golden (golden stays premium-only). Both the
    //    profile wallet and the magnet snapshot get the credit so the profile
    //    top bar + rank bar stay consistent.
    if (tier.leaves > 0) {
      const p = useProfile.getState()
      const newXp = p.xp + tier.leaves
      const newRankXp = p.rankXp + tier.leaves
      useProfile.setState({ xp: newXp, rankXp: newRankXp })
      try {
        const md = useMagnet.getState().data
        if (md) {
          useMagnet.setState({
            data: {
              ...md,
              xp: (md.xp ?? 0) + tier.leaves,
              rankXp: (md.rankXp ?? 0) + tier.leaves,
            },
          })
        }
      } catch { /* magnet data optional */ }
      if (p.userId && !p.isGuest) syncXpToDb(p.userId, newXp, p.premiumXp, newRankXp)
    }

    // 2. Exclusive items straight into the shop inventory.
    if (tier.items && tier.items.length > 0) {
      useShop.getState().grantItems(tier.items.map((i) => i.id))
    }

    // 3. Mark claimed + persist.
    const claimed = { ...s.claimed, [key]: new Date().toISOString() }
    set({ claimed })
    saveLocal(get())
    if (s.userId) syncToDb(s.userId, { v: 1, counters: get().counters, claimed, lastLoginDay: get().lastLoginDay, lastActiveDay: get().lastActiveDay, seedDone: get().seedDone })
    return true
  },

  reset: () => {
    bound = false
    set({
      ready: false,
      userId: null,
      counters: { ...EMPTY_COUNTERS },
      claimed: {},
      lastLoginDay: '',
      lastActiveDay: '',
      seedDone: false,
    })
  },
}))

export { ACHIEVEMENTS }

/** Number of achievements whose next tier is already claimable (reached but not
 *  yet claimed) — drives the green notification dots across the app. */
export function pendingClaimCount(
  claimed: Record<string, string> = useAchievements.getState().claimed,
): number {
  let n = 0
  for (const ach of ACHIEVEMENTS) {
    if (ach.comingSoon) continue
    const nextIdx = ach.tiers.findIndex((t) => !claimed[t.key])
    if (nextIdx < 0) continue
    if (liveMetric(ach.metric) >= ach.tiers[nextIdx].threshold) n++
  }
  return n
}
