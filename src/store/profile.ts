import { create } from 'zustand'
import { insforge } from '../lib/insforge'
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
import { normalizeUsername } from '../lib/usernames'

// Per-user public/onboarding profile state. Distinct from `useSettings` (UI
// prefs): this holds identity-ish fields set during onboarding — country (the
// one public field), rank, study goals, referral, and the private age.
//
// Source of truth is the cloud profile (settings.onboarding jsonb + the
// profiles.country column). We hydrate on sign-in (from appInit) and write once
// when the wizard finishes.

interface ProfileState {
  userId: string | null
  /** false until we've hydrated from the cloud for the current user */
  ready: boolean
  data: OnboardingData
  /** true once the user has finished onboarding */
  onboarded: boolean

  // ---- public/social profile (mirrors the profiles columns + jsonb blob) ----
  /** globally-unique handle; null until claimed */
  username: string | null
  /** display name (also the auth profile name); NOT unique */
  displayName: string
  /** optional uploaded profile-picture URL */
  avatarUrl: string | null
  /** the intentionally-public profile blob */
  pub: ProfilePublic

  // ---- progression (synced from DB, authoritative) ----
  /** total leaves (regular XP) */
  xp: number
  /** total golden leaves (premium XP) */
  premiumXp: number

  /** Load onboarding data for a user from the (already-fetched) profile cache. */
  hydrate: (userId: string) => Promise<void>
  /** Persist a completed onboarding document (jsonb + country/rank columns). */
  complete: (data: Omit<OnboardingData, 'completed'>) => Promise<boolean>
  /** Claim/replace the globally-unique username (caller pre-validates). */
  setUsername: (username: string) => Promise<boolean>
  /** Update the (non-unique) display name. */
  setDisplayName: (name: string) => Promise<boolean>
  /** Merge-patch the public profile blob and persist it. */
  savePublic: (patch: Partial<ProfilePublic>) => Promise<boolean>
  /** Set the uploaded profile-picture URL (or null to clear). */
  setAvatarUrl: (url: string | null) => Promise<boolean>
  /** Refresh XP from DB (called after magnet sync). */
  refreshXp: () => Promise<void>
  /** Update study goals (editable after onboarding). */
  setStudyGoals: (goals: string[]) => Promise<boolean>
  /** Reset to empty on sign-out. */
  reset: () => void
}

export const useProfile = create<ProfileState>((set, get) => ({
  userId: null,
  ready: false,
  data: { ...EMPTY_ONBOARDING },
  onboarded: false,
  username: null,
  displayName: 'Explorer',
  avatarUrl: null,
  pub: { ...EMPTY_PROFILE_PUBLIC },
  xp: 0,
  premiumXp: 0,

  hydrate: async (userId) => {
    // runUserInit calls loadProfileSettings() before this, so the cache is
    // usually warm; fall back to a load if not (e.g. hydrate called standalone).
    let settings = getCachedProfileSettings(userId)
    if (!Object.keys(settings).length) settings = await loadProfileSettings(userId)
    const data = parseOnboarding(settings.onboarding)

    // Read the public/social columns straight from the owner's own profile row.
    let username: string | null = null
    let displayName = 'Explorer'
    let avatarUrl: string | null = null
    let pub = { ...EMPTY_PROFILE_PUBLIC }
    let xp = 0
    let premiumXp = 0
    try {
      const { data: row } = await insforge.database
        .from('profiles')
        .select('username, display_name, avatar_url, public_profile, xp, premium_xp')
        .eq('id', userId)
        .maybeSingle()
      if (row) {
        const r = row as Record<string, unknown>
        username = (r.username as string | null) ?? null
        displayName = (r.display_name as string) || 'Explorer'
        avatarUrl = (r.avatar_url as string | null) ?? null
        pub = parseProfilePublic(r.public_profile)
        xp = (r.xp as number) ?? 0
        premiumXp = (r.premium_xp as number) ?? 0
      }
    } catch {
      /* offline / columns missing — fall back to empties */
    }

    set({ userId, data, onboarded: data.completed, ready: true, username, displayName, avatarUrl, pub, xp, premiumXp })
  },

  complete: async (partial) => {
    const userId = get().userId
    if (!userId) return false
    const data: OnboardingData = { ...partial, completed: true }

    // 1. canonical app-side document in settings jsonb
    const ok = await patchProfileSettings(userId, { onboarding: data })

    // 2. mirror the public onboarding fields to first-class columns (best-effort;
    //    the jsonb copy is authoritative, so a column failure must not block
    //    entry). country + rank both feed the public_profiles view.
    try {
      const row: Record<string, unknown> = { id: userId }
      if (data.country) row.country = data.country
      if (data.rank) row.rank = data.rank
      await insforge.database.from('profiles').upsert([row], { onConflict: 'id' })
    } catch {
      /* column missing / offline — jsonb copy still has it */
    }

    if (ok) set({ data, onboarded: true })
    return ok
  },

  setUsername: async (raw) => {
    const userId = get().userId
    if (!userId) return false
    const username = normalizeUsername(raw)
    const { error } = await insforge.database
      .from('profiles')
      .upsert([{ id: userId, username }], { onConflict: 'id' })
    if (error) return false // likely a unique-violation race — caller re-checks
    set({ username })
    return true
  },

  setDisplayName: async (raw) => {
    const userId = get().userId
    const name = raw.trim().slice(0, 40)
    if (!userId || !name) return false
    const { error } = await insforge.database
      .from('profiles')
      .upsert([{ id: userId, display_name: name }], { onConflict: 'id' })
    if (error) return false
    set({ displayName: name })
    return true
  },

  savePublic: async (patch) => {
    const userId = get().userId
    if (!userId) return false
    const pub: ProfilePublic = { ...get().pub, ...patch }
    const { error } = await insforge.database
      .from('profiles')
      .upsert([{ id: userId, public_profile: pub }], { onConflict: 'id' })
    if (error) return false
    set({ pub })
    return true
  },

  setAvatarUrl: async (url) => {
    const userId = get().userId
    if (!userId) return false
    const { error } = await insforge.database
      .from('profiles')
      .upsert([{ id: userId, avatar_url: url }], { onConflict: 'id' })
    if (error) return false
    set({ avatarUrl: url })
    return true
  },

  refreshXp: async () => {
    const userId = get().userId
    if (!userId) return
    try {
      const { data: row } = await insforge.database
        .from('profiles')
        .select('xp, premium_xp')
        .eq('id', userId)
        .maybeSingle()
      if (row) {
        const r = row as Record<string, unknown>
        set({ xp: (r.xp as number) ?? 0, premiumXp: (r.premium_xp as number) ?? 0 })
      }
    } catch { /* offline */ }
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

  reset: () =>
    set({
      userId: null,
      ready: false,
      data: { ...EMPTY_ONBOARDING },
      onboarded: false,
      username: null,
      displayName: 'Explorer',
      avatarUrl: null,
      pub: { ...EMPTY_PROFILE_PUBLIC },
      xp: 0,
      premiumXp: 0,
    }),
}))
