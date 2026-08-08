import { supabase } from './supabase'

// Typed client for the owner-analytics RPCs (migrations/20260808_add-owner-analytics.sql).
// admin_* calls are guarded server-side by _is_owner(); record_* calls act on
// the caller's own row (auth.uid()).

export interface AnalyticsUser {
  id: string
  player_id: string | null
  display_name: string | null
  country: string | null
  age: number | null
  study_goals: string[]
  referral: string | null
  referral_other: string | null
  paid: boolean
  ads_viewed: number
  xp: number
  premium_xp: number
  rank_xp: number
  created_at: string
  last_seen_at: string | null
}

export interface AnalyticsDailyPoint {
  day: string
  active_users: number
  active_minutes: number
}

/** Full per-user analytics roster (owner only). */
export async function fetchOwnerAnalyticsUsers(): Promise<AnalyticsUser[]> {
  const { data, error } = await supabase.rpc('admin_analytics_users')
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as AnalyticsUser[]
}

/** Last N-day active series (owner only). */
export async function fetchOwnerAnalyticsDaily(days = 30): Promise<AnalyticsDailyPoint[]> {
  const { data, error } = await supabase.rpc('admin_analytics_daily', { p_days: days })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as AnalyticsDailyPoint[]
}

/** Report today's active minutes for the signed-in user (upsert ledger). */
export async function recordDailyActivity(activeMinutes: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.rpc('record_daily_activity', {
    p_day: today,
    p_active_minutes: Math.max(0, Math.round(activeMinutes)),
  })
  if (error) {
    // Non-fatal — analytics must never block the game.
    console.warn('[analytics] recordDailyActivity failed', error.message)
  }
}

/** Bump the signed-in user's lifetime ad-view counter. */
export async function recordAdView(): Promise<void> {
  const { error } = await supabase.rpc('record_ad_view')
  if (error) console.warn('[analytics] recordAdView failed', error.message)
}
