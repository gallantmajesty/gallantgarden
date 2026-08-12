import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  getCachedProfileSettings,
  loadProfileSettings,
  patchProfileSettings,
} from '../lib/profileStore'
import {
  EMPTY_ONBOARDING,
  parseOnboarding,
  type OnboardingData,
} from '../lib/onboarding'
import {
  EMPTY_PROFILE_PUBLIC,
  parseProfilePublic,
  type ProfilePublic,
} from '../lib/types'
import { checkDailyLogin, claimDailyFocus, syncXpToDb } from '../lib/xpEngine'
import { DISPLAY_NAME_CHANGES_MAX } from '../lib/types'
import { isNameValid } from '../lib/displayName'

// Per-user public/onboarding profile state. Distinct from `useSettings` (UI
// prefs): this holds identity-ish fields set during onboarding — country (the
// one public field), rank, study goals, referral, and the private age.
//
// Source of truth is the cloud profile (settings.onboarding jsonb + the
// profiles.country column). We hydrate on sign-in (from appInit) and write once
// when the wizard finishes.

interface ProfileState {
  userId: string | null
  /** true when the current session is a guest (no Supabase auth) */
  isGuest: boolean
  /** false until we've hydrated from the cloud for the current user */
  ready: boolean
  data: OnboardingData
  /** true once the user has finished onboarding */
  onboarded: boolean

  // ---- public/social profile (mirrors the profiles columns + jsonb blob) ----
  /** unique numeric Player ID (assigned at signup, permanent). */
  playerId: number | null
  /** display name (also the auth profile name); NOT unique */
  displayName: string
  /** how many times the display name has been changed (capped at MAX). */
  displayNameChanges: number
  /** optional uploaded profile-picture URL */
  avatarUrl: string | null
  /** the intentionally-public profile blob */
  pub: ProfilePublic

  // ---- progression (synced from DB, authoritative) ----
  /** total leaves (regular XP, spendable wallet) */
  xp: number
  /** total golden leaves (premium XP, spendable wallet) */
  premiumXp: number
  /** lifetime rank XP (monotonic — never lowered by spending). Drives rank. */
  rankXp: number
  /** true when the current display name violates the new naming rules */
  nameWarning: boolean

  /** Load onboarding data for a user from the (already-fetched) profile cache. */
  hydrate: (userId: string, fallbackName?: string, isGuest?: boolean) => Promise<void>
  /** Persist a completed onboarding document (jsonb + country/rank columns). */
  complete: (data: Omit<OnboardingData, 'completed'>) => Promise<boolean>
  /** Assign the unique numeric Player ID (called once at signup). */
  setPlayerId: (playerId: number) => Promise<boolean>
  /** Update the (non-unique) display name. Enforces the free-change limit. */
  setDisplayName: (name: string) => Promise<boolean>
  /** Can the user still change their display name for free? */
  canChangeDisplayName: () => boolean
  /** Merge-patch the public profile blob and persist it. */
  savePublic: (patch: Partial<ProfilePublic>) => Promise<boolean>
  /** Set the uploaded profile-picture URL (or null to clear). */
  setAvatarUrl: (url: string | null) => Promise<boolean>
  /** Refresh XP from DB (called after magnet sync). */
  refreshXp: () => Promise<void>
  /** Apply wallet + rank deltas — the SINGLE source of truth for the spendable
   *  wallet. Clamps at 0, syncs to the DB (debounced) and mirrors into the
   *  Magnet snapshot via the profile→magnet subscription. `rankXp` defaults to
   *  the earned amount (max(0, leaves) + golden); pass it explicitly for
   *  penalties (negative) or purchases (0, so rank never demotes on spend). */
  applyXp: (patch: { leaves?: number; golden?: number; rankXp?: number }) => { xp: number; premiumXp: number; rankXp: number }
  /** Update study goals (editable after onboarding). */
  setStudyGoals: (goals: string[]) => Promise<boolean>
  /** Claim today's daily focus bonus (25+ focus min, once/day, RPC-gated). */
  claimDailyFocus: () => Promise<{ claimed: boolean; leaves: number }>
  /** Reset to empty on sign-out. */
  reset: () => void
}

// ---- Guest persistence ----
// Guests have no cloud row, so identity + progression live in localStorage,
// keyed by the guest id so each "Continue as Guest" session starts fresh while
// refreshes of the same guest restore their onboarding, player ID and XP.

interface GuestSave {
  playerId: number | null
  displayName: string
  displayNameChanges: number
  data: OnboardingData
  onboarded: boolean
  avatarUrl: string | null
  pub: ProfilePublic
  xp: number
  premiumXp: number
  rankXp: number
}

function guestKey(id: string): string {
  return `sf.guest.profile.v1.${id}`
}

function persistGuest(s: ProfileState): void {
  try {
    const save: GuestSave = {
      playerId: s.playerId,
      displayName: s.displayName,
      displayNameChanges: s.displayNameChanges,
      data: s.data,
      onboarded: s.onboarded,
      avatarUrl: s.avatarUrl,
      pub: s.pub,
      xp: s.xp,
      premiumXp: s.premiumXp,
      rankXp: s.rankXp,
    }
    if (!s.userId) return
    localStorage.setItem(guestKey(s.userId), JSON.stringify(save))
  } catch { /* storage blocked — guest state stays in memory */ }
}

function loadGuest(id: string): GuestSave | null {
  try {
    const raw = localStorage.getItem(guestKey(id))
    if (!raw) return null
    const v = JSON.parse(raw) as GuestSave
    return v && typeof v === 'object' ? v : null
  } catch { return null }
}

export const useProfile = create<ProfileState>((set, get) => ({
  userId: null,
  isGuest: false,
  ready: false,
  data: { ...EMPTY_ONBOARDING },
  onboarded: false,
  playerId: null,
  displayName: 'Explorer',
  displayNameChanges: 0,
  avatarUrl: null,
  pub: { ...EMPTY_PROFILE_PUBLIC },
  xp: 0,
  premiumXp: 0,
  rankXp: 0,
  nameWarning: false,

  hydrate: async (userId, fallbackName, isGuest = false) => {
    // Guests have no real Supabase session — skip all DB reads.
    if (isGuest) {
      const guestName = fallbackName || 'Guest'
      const saved = loadGuest(userId)
      set({
        userId,
        isGuest: true,
        data: { ...EMPTY_ONBOARDING, ...(saved?.data ?? {}) },
        onboarded: !!(saved?.data?.completed),
        ready: true,
        playerId: saved?.playerId ?? Math.floor(100000000 + Math.random() * 900000000),
        displayName: saved?.displayName || guestName,
        displayNameChanges: saved?.displayNameChanges ?? 0,
        avatarUrl: saved?.avatarUrl ?? null,
        pub: saved?.pub ?? { ...EMPTY_PROFILE_PUBLIC },
        xp: saved?.xp ?? 0,
        premiumXp: saved?.premiumXp ?? 0,
        rankXp: saved?.rankXp ?? 0,
      })
      // Persist immediately so a fresh (random) player ID stays stable.
      persistGuest(get())
      return
    }

    // runUserInit calls loadProfileSettings() before this, so the cache is
    // usually warm; fall back to a load if not (e.g. hydrate called standalone).
    let settings = getCachedProfileSettings(userId)
    if (!Object.keys(settings).length) settings = await loadProfileSettings(userId)
    const data = parseOnboarding(settings.onboarding)

    // Read the public/social columns straight from the owner's own profile row.
    let playerId: number | null = null
    let displayName = 'Explorer'
    let displayNameChanges = 0
    let avatarUrl: string | null = null
    let pub = { ...EMPTY_PROFILE_PUBLIC }
    let xp = 0
    let premiumXp = 0
    let rankXp = 0
    try {
      const { data: row } = await supabase
        .from('profiles')
        .select('player_id, display_name_changes, display_name, avatar_url, public_profile, xp, premium_xp, rank_xp')
        .eq('id', userId)
        .maybeSingle()
      if (row) {
        const r = row as Record<string, unknown>
        playerId = (r.player_id as number | null) ?? null
        displayName = (r.display_name as string) || fallbackName || 'Explorer'
        displayNameChanges = (r.display_name_changes as number) ?? 0
        avatarUrl = (r.avatar_url as string | null) ?? null
        pub = parseProfilePublic(r.public_profile)
        xp = (r.xp as number) ?? 0
        premiumXp = (r.premium_xp as number) ?? 0
        rankXp = (r.rank_xp as number) ?? 0
      }
    } catch {
      /* offline / columns missing — fall back to empties */
    }

    // If the DB didn't have a display name, use the auth metadata fallback
    if (!displayName || displayName === 'Explorer') {
      displayName = fallbackName || 'Explorer'
    }

    set({ userId, data, onboarded: data.completed, ready: true, playerId, displayName, displayNameChanges, avatarUrl, pub, xp, premiumXp, rankXp, nameWarning: !isNameValid(displayName) })

    // Award daily login GREEN leaves (first open of the day). Golden is
    // purchase/rank-up only, so this stays a green grind-track reward.
    // The server-side claim_daily_login() gate (one per user+day) stops the
    // "clear localStorage to re-earn" farm; falls back to the local gate if the
    // function isn't deployed yet.
    try {
      const loginResult = checkDailyLogin(xp, premiumXp, data.rank || 'bronze-1')
      if (loginResult.leaves > 0) {
        let allow = true
        try {
          const { data: serverOk, error } = await supabase.rpc('claim_daily_login')
          if (!error) allow = !!serverOk
        } catch {
          /* RPC not deployed yet — local gate is the fallback */
        }
        if (allow) {
          get().applyXp({ leaves: loginResult.leaves })
        }
      }
    } catch { /* ignore — login bonus is best-effort */ }
  },

  complete: async (partial) => {
    const userId = get().userId
    if (!userId) return false
    const data: OnboardingData = { ...partial, completed: true }

    // Guests: just set local state
    if (get().isGuest) {
      set({ data, onboarded: true })
      persistGuest(get())
      return true
    }

    // 1. canonical app-side document in settings jsonb
    const ok = await patchProfileSettings(userId, { onboarding: data })

    // 2. mirror the public onboarding fields to first-class columns (best-effort;
    //    the jsonb copy is authoritative, so a column failure must not block
    //    entry). country + rank both feed the public_profiles view.
    try {
      const row: Record<string, unknown> = { id: userId }
      if (data.country) row.country = data.country
      if (data.rank) row.rank = data.rank
      await supabase.from('profiles').upsert([row], { onConflict: 'id' })
    } catch {
      /* column missing / offline — jsonb copy still has it */
    }

    if (ok) set({ data, onboarded: true })
    return ok
  },

  setPlayerId: async (playerId) => {
    const userId = get().userId
    if (!userId) return false
    if (get().isGuest) { set({ playerId }); persistGuest(get()); return true }
    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: userId, player_id: playerId }], { onConflict: 'id' })
    if (error) return false
    set({ playerId })
    return true
  },

  canChangeDisplayName: () => get().nameWarning || get().displayNameChanges < DISPLAY_NAME_CHANGES_MAX,

  setDisplayName: async (raw) => {
    const userId = get().userId
    const name = raw.trim().slice(0, 20)
    if (!userId || !name) return false
    const changes = get().displayNameChanges
    const warningActive = get().nameWarning
    // Block only if no warning AND changes used up
    if (!warningActive && changes >= DISPLAY_NAME_CHANGES_MAX) return false
    if (get().isGuest) { set({ displayName: name, displayNameChanges: changes + 1, nameWarning: false }); persistGuest(get()); return true }
    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: userId, display_name: name, display_name_changes: changes + 1 }], { onConflict: 'id' })
    if (error) return false
    set({ displayName: name, displayNameChanges: changes + 1, nameWarning: false })
    return true
  },

  savePublic: async (patch) => {
    const userId = get().userId
    if (!userId) return false
    const pub: ProfilePublic = { ...get().pub, ...patch }
    if (get().isGuest) { set({ pub }); persistGuest(get()); return true }
    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: userId, public_profile: pub }], { onConflict: 'id' })
    if (error) { console.error('[profile] savePublic failed:', error.message); return false }
    set({ pub })
    return true
  },

  setAvatarUrl: async (url) => {
    const userId = get().userId
    if (!userId) return false
    if (get().isGuest) { set({ avatarUrl: url }); persistGuest(get()); return true }
    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: userId, avatar_url: url }], { onConflict: 'id' })
    if (error) { console.error('[profile] setAvatarUrl failed:', error.message); return false }
    set({ avatarUrl: url })
    return true
  },

  refreshXp: async () => {
    const userId = get().userId
    if (!userId || get().isGuest) return
    try {
      const { data: row } = await supabase
        .from('profiles')
        .select('xp, premium_xp, rank_xp')
        .eq('id', userId)
        .maybeSingle()
      if (row) {
        const r = row as Record<string, unknown>
        set({
          xp: (r.xp as number) ?? 0,
          premiumXp: (r.premium_xp as number) ?? 0,
          rankXp: (r.rank_xp as number) ?? 0,
        })
      }
    } catch { /* offline */ }
  },

  applyXp: (patch) => {
    const { userId, isGuest, xp, premiumXp, rankXp } = get()
    const leaves = Math.round(patch.leaves ?? 0)
    const golden = Math.round(patch.golden ?? 0)
    const rankDelta = patch.rankXp !== undefined ? Math.round(patch.rankXp) : Math.max(0, leaves) + golden
    // Pre-migration accounts (rankXp 0 with a wallet) fall back to the wallet
    // total so spending never demotes and early earnings still count.
    const rankBase = rankXp > 0 ? rankXp : xp + premiumXp
    const newXp = Math.max(0, xp + leaves)
    const newPremiumXp = Math.max(0, premiumXp + golden)
    const newRankXp = Math.max(0, rankBase + rankDelta)
    set({ xp: newXp, premiumXp: newPremiumXp, rankXp: newRankXp })
    if (isGuest) persistGuest(get())
    if (userId && !isGuest) syncXpToDb(userId, newXp, newPremiumXp, newRankXp)
    return { xp: newXp, premiumXp: newPremiumXp, rankXp: newRankXp }
  },

  // Update study goals after onboarding (editable in profile). Damps into the
  // same `profiles.settings.onboarding` blob so the onboarding data model stays
  // the single source of truth.
  setStudyGoals: async (goals: string[]) => {
    const userId = get().userId
    if (!userId) return false
    // Load current settings (cached or fresh) to merge.
    const current = await loadProfileSettings(userId)
    const onboarding = (current.onboarding as Partial<OnboardingData>) || {}
    const newOnboarding = { ...onboarding, studyGoals: goals }
    const ok = await patchProfileSettings(userId, { onboarding: newOnboarding })
    if (ok) set((state) => ({ data: { ...state.data, studyGoals: goals } }))
    return ok
  },

  claimDailyFocus: async () => {
    const userId = get().userId
    const { xp, premiumXp, rankXp } = get()
    const rankId = get().data.rank || 'bronze-1'
    if (!userId) return { claimed: false, leaves: 0 }
    const result = claimDailyFocus(xp, premiumXp, rankId)
    if (result.leaves <= 0) return { claimed: false, leaves: 0 }
    // Server-side one-per-day gate (mirrors claim_daily_login). Falls back to
    // the local gate if the function isn't deployed yet.
    let allow = true
    try {
      const { data: serverOk, error } = await supabase.rpc('claim_daily_focus')
      if (!error) allow = !!serverOk
    } catch {
      /* RPC not deployed yet — local gate is the fallback */
    }
    if (!allow) return { claimed: false, leaves: 0 }
    get().applyXp({ leaves: result.leaves })
    return { claimed: true, leaves: result.leaves }
  },

  reset: () =>
    set({
      userId: null,
      ready: false,
      data: { ...EMPTY_ONBOARDING },
      onboarded: false,
      playerId: null,
      displayName: 'Explorer',
      displayNameChanges: 0,
      avatarUrl: null,
      pub: { ...EMPTY_PROFILE_PUBLIC },
      xp: 0,
      premiumXp: 0,
      rankXp: 0,
      nameWarning: false,
    }),
}))
