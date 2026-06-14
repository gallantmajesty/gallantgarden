// Analytics derivations + a small rule-based "performance intelligence" engine.
// No real AI call — these are deterministic heuristics over the student's own
// history that read like personal coaching. Easy to swap for a real model later.

import type { MagnetData, Task, FocusSession, LifeArea } from './types'

export type RangeKey = 'today' | '7d' | '30d' | '90d' | '6m' | '1y' | 'lifetime'

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
  { key: '6m', label: '6 Months', days: 182 },
  { key: '1y', label: '1 Year', days: 365 },
  { key: 'lifetime', label: 'Lifetime', days: 100000 },
]

// `now` is always passed in so this module never touches Date.now() directly at
// import time — callers stamp the current time once and thread it through.
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

function inRange(iso: string | null, now: Date, days: number): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  const cutoff = now.getTime() - days * 86400000
  return t >= cutoff && t <= now.getTime() + 86400000
}

export interface Stats {
  completed: number
  created: number
  completionRate: number // 0..1
  focusMinutes: number
  deepWorkMinutes: number // focus sessions >= 45 min count as deep work
  activeDays: number
  perArea: Record<LifeArea, number>
  perSubject: { subject: string; minutes: number; tasks: number }[]
  daily: { day: string; tasks: number; minutes: number }[] // chronological
}

function tasksCompletedInRange(tasks: Task[], now: Date, days: number): Task[] {
  return tasks.filter((t) => t.done && inRange(t.completedAt, now, days))
}

export function computeStats(data: MagnetData, now: Date, days: number): Stats {
  const completedTasks = tasksCompletedInRange(data.tasks, now, days)
  const createdTasks = data.tasks.filter((t) => inRange(t.createdAt, now, days))
  const focus = data.focus.filter((f) => inRange(f.date, now, days))

  const focusMinutes = focus.reduce((s, f) => s + f.minutes, 0)
  const deepWorkMinutes = focus.filter((f) => f.minutes >= 45).reduce((s, f) => s + f.minutes, 0)

  const perArea = { academic: 0, personal: 0, health: 0, career: 0, creative: 0, social: 0 } as Record<
    LifeArea,
    number
  >
  for (const t of completedTasks) perArea[t.area] = (perArea[t.area] ?? 0) + 1

  // per subject (merge focus minutes + completed task counts)
  const subjMap = new Map<string, { minutes: number; tasks: number }>()
  for (const f of focus) {
    const key = f.subject || 'General'
    const cur = subjMap.get(key) ?? { minutes: 0, tasks: 0 }
    cur.minutes += f.minutes
    subjMap.set(key, cur)
  }
  for (const t of completedTasks) {
    const key = t.subject || 'General'
    const cur = subjMap.get(key) ?? { minutes: 0, tasks: 0 }
    cur.tasks += 1
    subjMap.set(key, cur)
  }
  const perSubject = [...subjMap.entries()]
    .map(([subject, v]) => ({ subject, ...v }))
    .sort((a, b) => b.minutes + b.tasks * 25 - (a.minutes + a.tasks * 25))

  // daily series (bounded so "lifetime" doesn't explode)
  const span = Math.min(days, 90)
  const daily: { day: string; tasks: number; minutes: number }[] = []
  const activeSet = new Set<string>()
  for (let i = span - 1; i >= 0; i--) {
    const d = addDays(now, -i)
    const key = dayKey(d)
    const dayTasks = completedTasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === key).length
    const dayMin = focus.filter((f) => f.date === key).reduce((s, f) => s + f.minutes, 0)
    if (dayTasks > 0 || dayMin > 0) activeSet.add(key)
    daily.push({ day: key, tasks: dayTasks, minutes: dayMin })
  }

  const completed = completedTasks.length
  const created = createdTasks.length
  return {
    completed,
    created,
    completionRate: created > 0 ? Math.min(1, completed / created) : completed > 0 ? 1 : 0,
    focusMinutes,
    deepWorkMinutes,
    activeDays: activeSet.size,
    perArea,
    perSubject,
    daily,
  }
}

// Current streak: consecutive days (ending today or yesterday) with any activity.
export function computeStreak(data: MagnetData, now: Date): number {
  const active = new Set<string>()
  for (const t of data.tasks) if (t.done && t.completedAt) active.add(dayKey(new Date(t.completedAt)))
  for (const f of data.focus) active.add(f.date)
  for (const h of data.habits) for (const d of h.history) active.add(d)

  let streak = 0
  // allow today to be empty (streak continues from yesterday)
  let cursor = active.has(dayKey(now)) ? now : addDays(now, -1)
  while (active.has(dayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface Insight {
  tone: 'good' | 'watch' | 'tip'
  title: string
  body: string
}

// Compare this window against the one immediately before it.
function prevWindowFocus(focus: FocusSession[], now: Date, days: number): number {
  const start = now.getTime() - 2 * days * 86400000
  const end = now.getTime() - days * 86400000
  return focus
    .filter((f) => {
      const t = new Date(f.date).getTime()
      return t >= start && t < end
    })
    .reduce((s, f) => s + f.minutes, 0)
}

export function generateInsights(data: MagnetData, now: Date, days: number): Insight[] {
  const out: Insight[] = []
  const stats = computeStats(data, now, days)
  const streak = computeStreak(data, now)

  // 1. Momentum vs previous window
  const prevFocus = prevWindowFocus(data.focus, now, days)
  if (stats.focusMinutes > 0 || prevFocus > 0) {
    if (stats.focusMinutes >= prevFocus * 1.15 && prevFocus > 0) {
      const up = Math.round(((stats.focusMinutes - prevFocus) / prevFocus) * 100)
      out.push({
        tone: 'good',
        title: 'You’re accelerating',
        body: `Focus time is up ${up}% versus the previous period. Whatever you changed, keep it — your future self is already thanking you.`,
      })
    } else if (prevFocus > 0 && stats.focusMinutes < prevFocus * 0.7) {
      const down = Math.round(((prevFocus - stats.focusMinutes) / prevFocus) * 100)
      out.push({
        tone: 'watch',
        title: 'Momentum dipped',
        body: `Focus time fell ${down}% from the last period. No guilt — just plant one 25-minute session today to restart the streak.`,
      })
    }
  }

  // 2. Streak
  if (streak >= 3) {
    out.push({
      tone: 'good',
      title: `${streak}-day streak`,
      body: `You’ve shown up ${streak} days in a row. Consistency like this compounds faster than intensity ever will.`,
    })
  } else if (streak === 0 && data.tasks.length > 0) {
    out.push({
      tone: 'tip',
      title: 'Restart gently',
      body: 'A streak begins with a single finished task. Pick the smallest one on your list and check it off — that’s all today needs.',
    })
  }

  // 3. Strong / weak subjects
  if (stats.perSubject.length >= 2) {
    const strong = stats.perSubject[0]
    const weak = stats.perSubject[stats.perSubject.length - 1]
    if (strong.subject !== weak.subject) {
      out.push({
        tone: 'tip',
        title: `${weak.subject} needs love`,
        body: `You’ve poured energy into ${strong.subject}, but ${weak.subject} is getting the least attention. A short, scheduled session this week will balance things out.`,
      })
    }
  }

  // 4. Deep work quality
  if (stats.focusMinutes >= 60) {
    const deepPct = Math.round((stats.deepWorkMinutes / stats.focusMinutes) * 100)
    if (deepPct >= 50) {
      out.push({
        tone: 'good',
        title: 'Deep work specialist',
        body: `${deepPct}% of your focus came in long, uninterrupted blocks. That’s where real understanding is built.`,
      })
    } else if (deepPct < 20) {
      out.push({
        tone: 'tip',
        title: 'Try longer blocks',
        body: 'Most of your sessions are short. One 45-minute block beats three scattered ones for hard material — protect a single distraction-free window.',
      })
    }
  }

  // 5. Burnout / overload watch
  const openHigh = data.tasks.filter((t) => !t.done && (t.priority === 'high' || t.priority === 'urgent')).length
  if (openHigh >= 8) {
    out.push({
      tone: 'watch',
      title: 'Heavy load detected',
      body: `${openHigh} high-priority tasks are open at once. That’s a recipe for overwhelm — pick the top 3 for today and let the rest wait without guilt.`,
    })
  }

  // 6. Completion rate
  if (stats.created >= 5) {
    const rate = Math.round(stats.completionRate * 100)
    if (rate >= 80) {
      out.push({
        tone: 'good',
        title: `${rate}% follow-through`,
        body: 'You finish what you start. That reliability is a rare and powerful study habit.',
      })
    } else if (rate < 40) {
      out.push({
        tone: 'tip',
        title: 'Plan fewer, finish more',
        body: 'You’re adding more than you complete. Try capping today at five tasks — a short finished list beats a long unfinished one.',
      })
    }
  }

  if (out.length === 0) {
    out.push({
      tone: 'tip',
      title: 'Your story starts here',
      body: 'Add a few tasks and log a focus session — within days, this space fills with insights drawn entirely from your own patterns.',
    })
  }
  return out.slice(0, 5)
}
