// Achievement catalog — CoC-style tiered achievements with green-leaf rewards.
// Progress is derived live from the app's stores/counters (see
// src/store/achievements.ts); completing a tier makes it CLAIMABLE, and the
// reward is only credited when the player taps Claim (idempotent, persisted).
//
// Scope (v1): Library realm (public + private), daily login, universal study
// time (timer), friends, followers, private-room hosting, rank milestones.
// No blueprint / task-magnet / games achievements. Cafe + World Traveler are
// kept but flagged `comingSoon` — they unlock when those realms ship.

import { getOverride } from './ownerOverrides'

export type AchievementCategory =
  | 'library'
  | 'login'
  | 'activity'
  | 'friends'
  | 'followers'
  | 'host'
  | 'rank'
  | 'realm'

export const CATEGORY_META: Record<AchievementCategory, { label: string; icon: string }> = {
  library: { label: 'Library', icon: 'books' },
  login: { label: 'Login', icon: 'key' },
  activity: { label: 'Timer & Focus', icon: 'clock' },
  friends: { label: 'Friends', icon: 'people' },
  followers: { label: 'Followers', icon: 'star' },
  host: { label: 'Host', icon: 'crown' },
  rank: { label: 'Rank', icon: 'trophy' },
  realm: { label: 'Realm', icon: 'globe' },
}

/** Which metric an achievement's progress is read from. Live metrics read other
 *  stores on the fly; the rest are lifetime counters tracked by the
 *  achievements store (see store/achievements.ts `liveMetric`). */
export type MetricKey =
  | 'focusMin'
  | 'focusSessions'
  | 'libraryMin'
  | 'librarySessions'
  | 'libraryVisits'
  | 'librarySeats'
  | 'deskVariety'
  | 'customRealms'
  | 'publicRealmVisits'
  | 'publicRealmMin'
  | 'maxPublicSessionMin'
  | 'loginDays'
  | 'activeDays'
  | 'streak'
  | 'marathonDay'
  | 'nightSessions'
  | 'earlyLogins'
  | 'maxPrivatePpl'
  | 'worldsVisited'
  | 'friends'
  | 'friendRequests'
  | 'followers'
  | 'rankIndex'
  | 'cafeVisits'

/** Placeholder for future non-leaf rewards (characters / banners / logos /
 *  shop items). Kept so owner can attach real rewards later without a schema
 *  change — v1 pays out leaves only. */
export interface AchievementItemReward {
  kind: 'banner' | 'logo' | 'character' | 'item'
  id: string
}

export interface AchievementTierDef {
  /** stable unique key used to persist the claimed state (`${achId}:${idx}`) */
  key: string
  /** display name (Bronze / Silver / Gold / one-shot label) */
  name: string
  /** how much of the metric this tier requires */
  threshold: number
  /** green leaves granted on claim (golden leaves stay premium-only) */
  leaves: number
  /** exclusive items granted on claim — currently unused (leaves only). */
  items?: AchievementItemReward[]
}

export interface AchievementDef {
  id: string
  title: string
  detail: string
  icon: string
  category: AchievementCategory
  metric: MetricKey
  /** unit label shown next to the progress number (min / days / sessions…) */
  unit: string
  tiers: AchievementTierDef[]
  /** true = realm not built yet; rendered locked + excluded from totals. */
  comingSoon?: boolean
}

export function tierKey(achId: string, idx: number): string {
  return `${achId}:${idx}`
}

/** Get effective leaves for an achievement tier (applies owner overrides). */
export function effectiveLeaves(achId: string, tierIdx: number, defaultLeaves: number): number {
  const override = getOverride('achievements', `${achId}:${tierIdx}`, {} as { leaves?: number })
  return override?.leaves ?? defaultLeaves
}

/** Check if an achievement is overridden as comingSoon. */
export function effectiveComingSoon(achId: string, defaultComingSoon: boolean): boolean {
  const override = getOverride('achievements', achId, {} as { comingSoon?: boolean })
  return override?.comingSoon ?? defaultComingSoon
}

export function achIdFromKey(key: string): string {
  return key.slice(0, key.lastIndexOf(':'))
}

export function tierIndexFromKey(key: string): number {
  return Number(key.slice(key.lastIndexOf(':') + 1)) || 0
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Library realm ─────────────────────────────────────────────────────────
  {
    id: 'library-visits',
    title: 'Library Visitor',
    detail: 'Step into the Grand Library and wander the stacks.',
    icon: 'door',
    category: 'library',
    metric: 'libraryVisits',
    unit: 'visits',
    tiers: [
      { key: 'library-visits:0', name: 'Bronze', threshold: 1, leaves: 10 },
      { key: 'library-visits:1', name: 'Silver', threshold: 10, leaves: 25 },
      { key: 'library-visits:2', name: 'Gold', threshold: 50, leaves: 50 },
    ],
  },
  {
    id: 'library-hours',
    title: 'Nest Among the Shelves',
    detail: 'Spend focused study hours inside the Library.',
    icon: 'book',
    category: 'library',
    metric: 'libraryMin',
    unit: 'min',
    tiers: [
      { key: 'library-hours:0', name: 'Bronze', threshold: 60, leaves: 15 },
      { key: 'library-hours:1', name: 'Silver', threshold: 600, leaves: 50 },
      { key: 'library-hours:2', name: 'Gold', threshold: 3000, leaves: 150 },
    ],
  },
  {
    id: 'library-sessions',
    title: 'Bookworm',
    detail: 'Complete focus sessions while settled in the Library.',
    icon: 'books',
    category: 'library',
    metric: 'librarySessions',
    unit: 'sessions',
    tiers: [
      { key: 'library-sessions:0', name: 'Bronze', threshold: 1, leaves: 10 },
      { key: 'library-sessions:1', name: 'Silver', threshold: 25, leaves: 30 },
      { key: 'library-sessions:2', name: 'Gold', threshold: 100, leaves: 100 },
    ],
  },
  {
    id: 'desk-seats',
    title: 'Take a Seat',
    detail: 'Claim a desk in the Library and settle in to study.',
    icon: 'chair',
    category: 'library',
    metric: 'librarySeats',
    unit: 'seats',
    tiers: [
      { key: 'desk-seats:0', name: 'Bronze', threshold: 1, leaves: 5 },
      { key: 'desk-seats:1', name: 'Silver', threshold: 10, leaves: 20 },
      { key: 'desk-seats:2', name: 'Gold', threshold: 25, leaves: 75 },
    ],
  },
  {
    id: 'desk-variety',
    title: 'Explorer',
    detail: 'Sit at many different desks across the Library.',
    icon: 'compass',
    category: 'library',
    metric: 'deskVariety',
    unit: 'desks',
    tiers: [
      { key: 'desk-variety:0', name: 'Bronze', threshold: 5, leaves: 15 },
      { key: 'desk-variety:1', name: 'Silver', threshold: 15, leaves: 40 },
      { key: 'desk-variety:2', name: 'Gold', threshold: 30, leaves: 100 },
    ],
  },
  {
    id: 'private-room',
    title: 'Private Scholar',
    detail: 'Join a private (invite-only) study realm.',
    icon: 'lock',
    category: 'library',
    metric: 'customRealms',
    unit: 'realms',
    tiers: [{ key: 'private-room:0', name: 'Claim', threshold: 1, leaves: 30 }],
  },
  {
    id: 'public-realm',
    title: 'Public Scholar',
    detail: 'Enter a public Library realm and study with the crowd.',
    icon: 'columns',
    category: 'library',
    metric: 'publicRealmVisits',
    unit: 'visits',
    tiers: [{ key: 'public-realm:0', name: 'Claim', threshold: 1, leaves: 30 }],
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  {
    id: 'first-login',
    title: 'First Steps',
    detail: 'Log in for the very first time — here is some starter money.',
    icon: 'sprout',
    category: 'login',
    metric: 'loginDays',
    unit: 'days',
    tiers: [{ key: 'first-login:0', name: 'Claim', threshold: 1, leaves: 50 }],
  },
  {
    id: 'login-days',
    title: 'Daily Scholar',
    detail: 'Return to the Grove — log in on different days.',
    icon: 'calendar',
    category: 'login',
    metric: 'loginDays',
    unit: 'days',
    tiers: [
      { key: 'login-days:0', name: 'Bronze', threshold: 7, leaves: 20 },
      { key: 'login-days:1', name: 'Silver', threshold: 30, leaves: 60 },
      { key: 'login-days:2', name: 'Gold', threshold: 45, leaves: 100 },
      { key: 'login-days:3', name: 'Platinum', threshold: 100, leaves: 200 },
    ],
  },

  // ── Activity / Timer (universal time — counts every realm) ────────────────
  {
    id: 'timeless-scholar',
    title: 'Timeless Scholar',
    detail: 'Bank lifetime study minutes — time is universal across all realms.',
    icon: 'hourglass',
    category: 'activity',
    metric: 'focusMin',
    unit: 'min',
    tiers: [
      { key: 'timeless-scholar:0', name: '1 · 10h', threshold: 600, leaves: 25 },
      { key: 'timeless-scholar:1', name: '2 · 45h', threshold: 2700, leaves: 60 },
      { key: 'timeless-scholar:2', name: '3 · 100h', threshold: 6000, leaves: 120 },
      { key: 'timeless-scholar:3', name: '4 · 200h', threshold: 12000, leaves: 200 },
      { key: 'timeless-scholar:4', name: '5 · 345h', threshold: 20700, leaves: 350 },
      { key: 'timeless-scholar:5', name: '6 · 545h', threshold: 32700, leaves: 600 },
    ],
  },
  {
    id: 'session-stacker',
    title: 'Session Stacker',
    detail: 'Complete focus sessions of any length.',
    icon: 'books',
    category: 'activity',
    metric: 'focusSessions',
    unit: 'sessions',
    tiers: [
      { key: 'session-stacker:0', name: 'Bronze', threshold: 5, leaves: 10 },
      { key: 'session-stacker:1', name: 'Silver', threshold: 50, leaves: 40 },
      { key: 'session-stacker:2', name: 'Gold', threshold: 250, leaves: 150 },
    ],
  },
  {
    id: 'crowd-focuser',
    title: 'Crowd Focuser',
    detail: 'Complete one very long focus session (4h+) inside a public realm.',
    icon: 'group',
    category: 'activity',
    metric: 'maxPublicSessionMin',
    unit: 'min',
    tiers: [
      { key: 'crowd-focuser:0', name: '4 Hours', threshold: 240, leaves: 40 },
      { key: 'crowd-focuser:1', name: '5 Hours', threshold: 300, leaves: 80 },
    ],
  },
  {
    id: 'marathon-day',
    title: 'Marathon Scholar',
    detail: 'Focus for 3+ hours in a single day.',
    icon: 'runner',
    category: 'activity',
    metric: 'marathonDay',
    unit: 'day',
    tiers: [{ key: 'marathon-day:0', name: 'Claim', threshold: 1, leaves: 30 }],
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    detail: 'Complete focus sessions that run late into the night.',
    icon: 'moon',
    category: 'activity',
    metric: 'nightSessions',
    unit: 'sessions',
    tiers: [
      { key: 'night-owl:0', name: 'Bronze', threshold: 5, leaves: 15 },
      { key: 'night-owl:1', name: 'Silver', threshold: 20, leaves: 50 },
      { key: 'night-owl:2', name: 'Gold', threshold: 50, leaves: 120 },
    ],
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    detail: 'Log in bright and early, before 8 AM.',
    icon: 'sun',
    category: 'activity',
    metric: 'earlyLogins',
    unit: 'logins',
    tiers: [
      { key: 'early-bird:0', name: 'Bronze', threshold: 5, leaves: 15 },
      { key: 'early-bird:1', name: 'Silver', threshold: 15, leaves: 40 },
      { key: 'early-bird:2', name: 'Gold', threshold: 30, leaves: 90 },
    ],
  },
  {
    id: 'streak',
    title: 'Streak Keeper',
    detail: 'Keep your study streak alive day after day.',
    icon: 'link',
    category: 'activity',
    metric: 'streak',
    unit: 'days',
    tiers: [
      { key: 'streak:0', name: 'Bronze', threshold: 3, leaves: 10 },
      { key: 'streak:1', name: 'Silver', threshold: 7, leaves: 50 },
      { key: 'streak:2', name: 'Gold', threshold: 30, leaves: 200 },
    ],
  },
  {
    id: 'active-days',
    title: 'Warming Up',
    detail: 'Be active in the Grove on different days.',
    icon: 'flame',
    category: 'activity',
    metric: 'activeDays',
    unit: 'days',
    tiers: [
      { key: 'active-days:0', name: 'Bronze', threshold: 3, leaves: 10 },
      { key: 'active-days:1', name: 'Silver', threshold: 30, leaves: 40 },
      { key: 'active-days:2', name: 'Gold', threshold: 100, leaves: 100 },
    ],
  },

  // ── Friends ───────────────────────────────────────────────────────────────
  {
    id: 'first-friend',
    title: 'Study Buddy',
    detail: 'Make your first friend.',
    icon: 'heart',
    category: 'friends',
    metric: 'friends',
    unit: 'friends',
    tiers: [{ key: 'first-friend:0', name: 'Claim', threshold: 1, leaves: 20 }],
  },
  {
    id: 'friend-circle',
    title: 'Friend Circle',
    detail: 'Grow your circle of study friends.',
    icon: 'group',
    category: 'friends',
    metric: 'friends',
    unit: 'friends',
    tiers: [
      { key: 'friend-circle:0', name: 'Bronze', threshold: 5, leaves: 20 },
      { key: 'friend-circle:1', name: 'Silver', threshold: 20, leaves: 60 },
      { key: 'friend-circle:2', name: 'Gold', threshold: 100, leaves: 200 },
    ],
  },
  {
    id: 'friendly',
    title: 'Friendly',
    detail: 'Send friend requests to other explorers.',
    icon: 'mail',
    category: 'friends',
    metric: 'friendRequests',
    unit: 'requests',
    tiers: [
      { key: 'friendly:0', name: 'Bronze', threshold: 1, leaves: 10 },
      { key: 'friendly:1', name: 'Silver', threshold: 25, leaves: 30 },
      { key: 'friendly:2', name: 'Gold', threshold: 100, leaves: 80 },
    ],
  },

  // ── Followers ─────────────────────────────────────────────────────────────
  {
    id: 'follower-climb',
    title: 'Getting Noticed',
    detail: 'Grow your follower count.',
    icon: 'star',
    category: 'followers',
    metric: 'followers',
    unit: 'followers',
    tiers: [
      { key: 'follower-climb:0', name: 'Bronze', threshold: 50, leaves: 40 },
      { key: 'follower-climb:1', name: 'Silver', threshold: 130, leaves: 100 },
      { key: 'follower-climb:2', name: 'Gold', threshold: 200, leaves: 180 },
    ],
  },
  {
    id: 'follower-star',
    title: 'Social Star',
    detail: 'Reach a big follower milestone.',
    icon: 'sparkle',
    category: 'followers',
    metric: 'followers',
    unit: 'followers',
    tiers: [
      { key: 'follower-star:0', name: 'Silver', threshold: 500, leaves: 300 },
      { key: 'follower-star:1', name: 'Gold', threshold: 1000, leaves: 500 },
    ],
  },

  // ── Host (private rooms) ──────────────────────────────────────────────────
  {
    id: 'squad-leader',
    title: 'Squad Leader',
    detail: 'Fill your own private room with fellow students.',
    icon: 'crown',
    category: 'host',
    metric: 'maxPrivatePpl',
    unit: 'people',
    tiers: [
      { key: 'squad-leader:0', name: 'Bronze', threshold: 10, leaves: 50 },
      { key: 'squad-leader:1', name: 'Silver', threshold: 50, leaves: 120 },
      { key: 'squad-leader:2', name: 'Gold', threshold: 80, leaves: 250 },
    ],
  },

  // ── Rank ──────────────────────────────────────────────────────────────────
  {
    id: 'rank-climb',
    title: 'Rising Star',
    detail: 'Climb the rank ladder.',
    icon: 'arrow-up',
    category: 'rank',
    metric: 'rankIndex',
    unit: 'rank',
    tiers: [
      { key: 'rank-climb:0', name: 'Silver I', threshold: 3, leaves: 50 },
      { key: 'rank-climb:1', name: 'Gold I', threshold: 6, leaves: 100 },
      { key: 'rank-climb:2', name: 'Platinum I', threshold: 9, leaves: 200 },
    ],
  },
  {
    id: 'rank-crusader',
    title: 'Rank Crusader',
    detail: 'Every rank step is an achievement — keep climbing.',
    icon: 'medal',
    category: 'rank',
    metric: 'rankIndex',
    unit: 'rank',
    tiers: [
      { key: 'rank-crusader:0', name: 'Step 1', threshold: 2, leaves: 30 },
      { key: 'rank-crusader:1', name: 'Step 2', threshold: 5, leaves: 60 },
      { key: 'rank-crusader:2', name: 'Step 3', threshold: 8, leaves: 100 },
      { key: 'rank-crusader:3', name: 'Step 4', threshold: 11, leaves: 150 },
      { key: 'rank-crusader:4', name: 'Step 5', threshold: 14, leaves: 220 },
      { key: 'rank-crusader:5', name: 'Step 6', threshold: 17, leaves: 300 },
    ],
  },
  {
    id: 'rank-legend',
    title: "Focuster's Ascent",
    detail: 'Reach the highest echelons of the ladder.',
    icon: 'rosette',
    category: 'rank',
    metric: 'rankIndex',
    unit: 'rank',
    tiers: [
      { key: 'rank-legend:0', name: 'Diamond I', threshold: 12, leaves: 400 },
      { key: 'rank-legend:1', name: 'Crystal I', threshold: 15, leaves: 700 },
      { key: 'rank-legend:2', name: 'Focuster', threshold: 18, leaves: 1000 },
    ],
  },

  // ── Realm exploration (coming soon — realms not built yet) ───────────────
  {
    id: 'world-traveler',
    title: 'World Traveler',
    detail: 'Visit all three worlds: Library, Train Station and UK Cafe.',
    icon: 'globe',
    category: 'realm',
    metric: 'worldsVisited',
    unit: 'worlds',
    comingSoon: true,
    tiers: [{ key: 'world-traveler:0', name: 'Claim', threshold: 1, leaves: 50 }],
  },
  {
    id: 'cafe-regular',
    title: 'Cafe Regular',
    detail: 'Visit the UK Cafe — the cozy third world.',
    icon: 'cup',
    category: 'realm',
    metric: 'cafeVisits',
    unit: 'visits',
    comingSoon: true,
    tiers: [
      { key: 'cafe-regular:0', name: 'Bronze', threshold: 1, leaves: 10 },
      { key: 'cafe-regular:1', name: 'Silver', threshold: 5, leaves: 20 },
    ],
  },
]

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export function getAchievement(id: string): AchievementDef | undefined {
  return BY_ID.get(id)
}

/** Claimable (non-coming-soon) catalog used for totals/progress bars. */
const CLAIMABLE = ACHIEVEMENTS.filter((a) => !a.comingSoon)

/** Total claimable tiers across the catalog (the "out of N" denominator). */
export const TOTAL_TIERS = CLAIMABLE.reduce((n, a) => n + a.tiers.length, 0)

/** Total green leaves the claimable catalog can ever pay out. */
export const TOTAL_LEAVES = CLAIMABLE.reduce(
  (n, a) => n + a.tiers.reduce((m, t) => m + t.leaves, 0),
  0,
)
