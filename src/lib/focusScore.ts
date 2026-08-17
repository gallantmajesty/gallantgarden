// ─────────────────────────────────────────────────────────────────────────
// focusScore.ts — pure metric engine for the Focus Score dashboard.
//
// Every number on screen is derived here from real session history, so the
// panel is dumb rendering and each stat is provable in isolation. No
// localStorage, no React, no side effects — just functions of the history.
// ─────────────────────────────────────────────────────────────────────────

export type PeriodKey = 'today' | 'month' | 'year'

/** Minimal shape the engine needs — `SessionHistoryEntry` satisfies it. */
export interface FocusRecord {
  id?: string
  date: string // ISO timestamp of the session
  totalFocusMinutes: number
  leavesEarned?: number
  subject?: string
}

export interface RangeStats {
  minutes: number
  earned: number
  sessions: number
  activeDays: number
  /** focus minutes vs previous window, elapsed-days scaled */
  delta: number
  /** earned leaves vs previous window, elapsed-days scaled */
  earnedDelta: number
  /** false when the previous window had no activity at all ("New" chip) */
  hasPrev: boolean
  start: number
}

export interface LifetimeStats {
  minutes: number
  earned: number
  sessions: number
  activeDays: number
  avgSession: number
}

// ── small date helpers ────────────────────────────────────────────────────
export function dayKeyOf(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayKey(now: Date = new Date()): string {
  return dayKeyOf(now)
}

// ── window math ───────────────────────────────────────────────────────────
function windowOf(period: PeriodKey, now: Date): { start: number; prevStart: number; end: number } {
  const y = now.getFullYear()
  const m = now.getMonth()
  let start: number
  let prevStart: number
  if (period === 'today') {
    start = new Date(y, m, now.getDate()).getTime()
    prevStart = start - 86_400_000
  } else if (period === 'month') {
    start = new Date(y, m, 1).getTime()
    prevStart = new Date(y, m - 1, 1).getTime()
  } else {
    start = new Date(y, 0, 1).getTime()
    prevStart = new Date(y - 1, 0, 1).getTime()
  }
  return { start, prevStart, end: now.getTime() }
}

/**
 * Aggregate a period (today / month / year) plus the same-length window
 * before it. The previous window is scaled to the same elapsed days so the
 * delta is honest mid-period — "15% ahead of last month" on the 15th, not
 * just on the 31st.
 */
export function aggregateRange(records: FocusRecord[], period: PeriodKey, now: Date = new Date()): RangeStats {
  const { start, prevStart, end } = windowOf(period, now)
  let minutes = 0
  let earned = 0
  let sessions = 0
  let prevMinutes = 0
  let prevEarned = 0
  const days = new Set<string>()
  for (const r of records) {
    const t = new Date(r.date).getTime()
    if (t >= start && t <= end) {
      minutes += r.totalFocusMinutes
      earned += r.leavesEarned ?? 0
      sessions += 1
      days.add(r.date.slice(0, 10))
    } else if (t >= prevStart && t < start) {
      prevMinutes += r.totalFocusMinutes
      prevEarned += r.leavesEarned ?? 0
    }
  }
  const elapsedDays = Math.max(1, Math.round((end - start) / 86_400_000))
  const prevElapsedDays = Math.max(1, Math.round((start - prevStart) / 86_400_000))
  const k = elapsedDays / prevElapsedDays
  return {
    minutes,
    earned,
    sessions,
    activeDays: days.size,
    delta: prevMinutes > 0 ? (minutes - prevMinutes * k) / (prevMinutes * k) : minutes > 0 ? 1 : 0,
    earnedDelta: prevEarned > 0 ? (earned - prevEarned * k) / (prevEarned * k) : earned > 0 ? 1 : 0,
    hasPrev: prevMinutes > 0,
    start,
  }
}

// ── chart buckets ─────────────────────────────────────────────────────────
/**
 * Adaptive buckets for the area chart:
 * today → 24 hourly buckets; month → last 30 calendar days; year → 12 months.
 */
export function bucketize(records: FocusRecord[], period: PeriodKey, now: Date = new Date()): { label: string; value: number }[] {
  if (period === 'today') {
    const tk = todayKey(now)
    const buckets = new Array(24).fill(0) as number[]
    for (const r of records) {
      if (r.date.slice(0, 10) !== tk) continue
      buckets[new Date(r.date).getHours()] += r.totalFocusMinutes
    }
    return buckets.map((v, hour) => ({ label: `${String(hour).padStart(2, '0')}h`, value: v }))
  }
  if (period === 'year') {
    const y = now.getFullYear()
    const buckets = new Array(12).fill(0) as number[]
    for (const r of records) {
      const d = new Date(r.date)
      if (d.getFullYear() !== y) continue
      buckets[d.getMonth()] += r.totalFocusMinutes
    }
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return buckets.map((v, i) => ({ label: names[i], value: v }))
  }
  const byDay = new Map<string, number>()
  for (const r of records) byDay.set(r.date.slice(0, 10), (byDay.get(r.date.slice(0, 10)) ?? 0) + r.totalFocusMinutes)
  const out: { label: string; value: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push({ label: String(d.getDate()), value: byDay.get(dayKeyOf(d)) ?? 0 })
  }
  return out
}

/** Last `days` days of daily focus minutes, oldest → newest (for sparklines). */
export function dailySeries(records: FocusRecord[], days: number, now: Date = new Date()): number[] {
  const byDay = new Map<string, number>()
  for (const r of records) byDay.set(r.date.slice(0, 10), (byDay.get(r.date.slice(0, 10)) ?? 0) + r.totalFocusMinutes)
  const out: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push(byDay.get(dayKeyOf(d)) ?? 0)
  }
  return out
}

// ── lifetime ──────────────────────────────────────────────────────────────
export function lifetimeStats(records: FocusRecord[]): LifetimeStats {
  let minutes = 0
  let earned = 0
  const days = new Set<string>()
  for (const r of records) {
    minutes += r.totalFocusMinutes
    earned += r.leavesEarned ?? 0
    days.add(r.date.slice(0, 10))
  }
  return {
    minutes,
    earned,
    sessions: records.length,
    activeDays: days.size,
    avgSession: records.length ? minutes / records.length : 0,
  }
}

// ── formatting (exact — never collapse minutes into hours alone) ──────────
export function fmtDuration(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

/** Stopwatch readout: exact hours/minutes/seconds, e.g. "1h 05m 26s". */
export function fmtClock(min: number): string {
  const totalSec = Math.max(0, Math.round(min * 60))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}h ${mm}m ${ss}s`
  if (m > 0) return `${m}m ${ss}s`
  return `${s}s`
}

export function fmtDelta(delta: number): string {
  const pct = Math.round(delta * 100)
  if (pct === 0) return '±0%'
  return `${pct > 0 ? '+' : ''}${pct}%`
}

// ── insight line (deterministic coaching, like the magnet's "why") ───────
export function buildInsight(range: RangeStats, streak: number, life: LifetimeStats, period: PeriodKey): string {
  if (life.sessions === 0) {
    return 'Start a focus session — this dashboard fills in live from your real sessions.'
  }
  if (period === 'today' && range.minutes === 0) {
    if (streak === 0) {
      return `No focus logged today yet — and your streak has lapsed. Return within 24 hours of your last session to start a new one.`
    }
    return `No focus logged today yet. Your ${streak}-day streak is safe — a day counts as long as you return within 24 hours.`
  }
  if (!range.hasPrev) {
    return `Fresh start — ${range.sessions} session${range.sessions === 1 ? '' : 's'} logged this ${period}. Every minute grows your forest.`
  }
  const prevLabel = period === 'today' ? 'yesterday' : period === 'month' ? 'last month' : 'last year'
  if (range.delta >= 0.1) {
    return `You're ${Math.round(range.delta * 100)}% ahead of ${prevLabel} in focus time. Keep the rhythm going.`
  }
  if (range.delta <= -0.1) {
    return `Focus is ${Math.abs(Math.round(range.delta * 100))}% behind ${prevLabel}. One 25-minute session today starts the comeback.`
  }
  return `Steady pace — ${fmtDuration(range.minutes)} focused this ${period}, ${life.activeDays} active days overall.`
}
