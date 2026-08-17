import { REFERRAL_OPTIONS, type ReferralOption } from './onboarding'
import { COUNTRIES } from './countries'
import { checkDisplayName } from './displayName'

// In-progress onboarding draft. The whole wizard previously lived in React
// state only, so any refresh during onboarding (browser reload, OAuth round
// trip, accidental back) restarted it from step 0 and re-asked for the
// username + every detail — which also re-spammed the name/account writes
// whenever the finish step ran more than once. Persisting the draft per user
// makes refresh resume exactly where the user left off.

export interface OnboardingDraft {
  step: number
  fullName: string
  fullNameOk: boolean
  country: string | null
  age: number | null
  guardianConsent: boolean
  characterId: string
  skinId: string
  goals: string[]
  referral: ReferralOption | null
  referralOther: string
  termsAccepted: boolean
}

export const EMPTY_DRAFT: OnboardingDraft = {
  step: 0,
  fullName: '',
  fullNameOk: false,
  country: null,
  age: null,
  guardianConsent: false,
  characterId: 'james',
  skinId: 'light',
  goals: [],
  referral: null,
  referralOther: '',
  termsAccepted: false,
}

const KEY_PREFIX = 'sf.onboarding.draft.v1'

function draftKey(userKey: string): string {
  return `${KEY_PREFIX}.${userKey}`
}

/** Restore a saved draft, sanitizing every field against the live rule sets. */
export function loadOnboardingDraft(userKey: string): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userKey))
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<OnboardingDraft>
    if (!v || typeof v !== 'object') return null

    const step = Math.min(7, Math.max(0, Math.floor(Number(v.step) || 0)))
    const fullName = typeof v.fullName === 'string' ? v.fullName.slice(0, 20) : ''
    const age = typeof v.age === 'number' && v.age >= 1 && v.age <= 100 ? v.age : null
    const characterId = typeof v.characterId === 'string' ? v.characterId : 'james'
    const skinId = typeof v.skinId === 'string' ? v.skinId : 'light'
    const goals = Array.isArray(v.goals) ? v.goals.filter((g): g is string => typeof g === 'string').slice(0, 20) : []
    const referral =
      typeof v.referral === 'string' && (REFERRAL_OPTIONS as readonly string[]).includes(v.referral)
        ? (v.referral as ReferralOption)
        : null
    const country = typeof v.country === 'string' && COUNTRIES.some((c) => c.code === v.country) ? v.country : null

    return {
      step,
      fullName,
      fullNameOk: checkDisplayName(fullName).ok,
      country,
      age,
      guardianConsent: v.guardianConsent === true,
      characterId,
      skinId,
      goals,
      referral,
      referralOther: typeof v.referralOther === 'string' ? v.referralOther.slice(0, 80) : '',
      termsAccepted: v.termsAccepted === true,
    }
  } catch {
    return null
  }
}

/** Persist the current wizard state so a refresh resumes where the user left off. */
export function saveOnboardingDraft(userKey: string, draft: OnboardingDraft): void {
  try {
    localStorage.setItem(draftKey(userKey), JSON.stringify(draft))
  } catch { /* storage blocked — draft stays in memory only */ }
}

/** Called once onboarding completes — the draft must never survive completion. */
export function clearOnboardingDraft(userKey: string): void {
  try {
    localStorage.removeItem(draftKey(userKey))
  } catch { /* ignore */ }
}