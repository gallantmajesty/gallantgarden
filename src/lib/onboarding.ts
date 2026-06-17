import { DEFAULT_RANK_ID } from './ranks'

// Onboarding data model + persistence helpers. The whole onboarding document
// lives under the `onboarding` namespace of `profiles.settings` (jsonb), which
// is the canonical app-side read. `country` is ALSO mirrored to a first-class
// `profiles.country` column (the one publicly-visible field) so it can later be
// surfaced in public lobbies without a schema change.
//
// PRIVACY: `age` is stored here for personalization only. It must never be put
// in any public component, lobby, leaderboard, chat, or summary shown to others.

export const REFERRAL_OPTIONS = [
  'YouTube', 'Instagram', 'TikTok', 'X (Twitter)', 'Reddit', 'Discord', 'Google Search',
  'Friend', 'School / College', 'Teacher', 'Blog / Article', 'Advertisement', 'Other',
] as const

export type ReferralOption = (typeof REFERRAL_OPTIONS)[number]

export interface OnboardingData {
  /** completion flag — the app gate reads this */
  completed: boolean
  /** ISO 3166-1 alpha-2 country code (UPPERCASE). Public. */
  country: string | null
  /** PRIVATE — personalization only, never shown publicly */
  age: number | null
  /** study-goal ids (see studyGoals.ts) */
  studyGoals: string[]
  /** how the user discovered FocusLily */
  referral: ReferralOption | null
  /** free-text when referral === 'Other' */
  referralOther: string | null
  /** rank id — everyone starts at the lowest tier; display only for now */
  rank: string
}

export const EMPTY_ONBOARDING: OnboardingData = {
  completed: false,
  country: null,
  age: null,
  studyGoals: [],
  referral: null,
  referralOther: null,
  rank: DEFAULT_RANK_ID,
}

/** Parse a raw `settings.onboarding` value into a well-formed OnboardingData. */
export function parseOnboarding(raw: unknown): OnboardingData {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_ONBOARDING }
  const o = raw as Record<string, unknown>
  return {
    completed: o.completed === true,
    country: typeof o.country === 'string' ? o.country : null,
    age: typeof o.age === 'number' ? o.age : null,
    studyGoals: Array.isArray(o.studyGoals) ? o.studyGoals.filter((x): x is string => typeof x === 'string') : [],
    referral: typeof o.referral === 'string' ? (o.referral as ReferralOption) : null,
    referralOther: typeof o.referralOther === 'string' ? o.referralOther : null,
    rank: typeof o.rank === 'string' ? o.rank : DEFAULT_RANK_ID,
  }
}

export const MIN_AGE = 5
export const MAX_AGE = 100
