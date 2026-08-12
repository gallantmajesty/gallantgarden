/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { useMemo, useId } from 'react'
import { Icon } from './Icon'
import { ProgressRing } from './ui'
import { computeStats, addDays, dayKey } from '../../lib/magnet/insights'
import type { MagnetData } from '../../lib/magnet/types'

// ─────────────────────────────────────────────────────────────────────────────
// Premium Korean-minimal building blocks for the redesigned Task Magnet.
// These layer a calm, spacious, "storytelling" surface on top of the existing
// --mg-* theme tokens. Every chart is deterministic over the student's own
// history (no network / no real AI call) — same philosophy as insights.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════ Sparkline ══════════════
export function Sparkline({
  data,
  color = 'var(--mg-accent)',
  height = 46,
  strokeWidth = 2.5,
  fill = true,
}: {
  data: number[]
  color?: string
  height?: number
  strokeWidth?: number
  fill?: boolean
}) {
  const W = 100
  const H = height
  const max = Math.max(1, ...data)
  const min = Math.min(0, ...data)
  const span = max - min || 1
  const pts = useMemo(() => {
    if (data.length === 0) return ''
    return data
      .map((v, i) => {
        const x = data.length === 1 ? W / 2 : (i / (data.length - 1)) * W
        const y = H - ((v - min) / span) * (H - 6) - 3
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }, [data, H, min, span])

  const area = `0,${H} ${pts} ${W},${H}`
  const rawId = useId()
  const id = `sl${rawId.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg className="mg-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={area} fill={`url(#${id})`} />}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ══════════════ Heatmap (GitHub-style study intensity) ══════════════
export interface HeatCell {
  date: string
  value: number
  level: 0 | 1 | 2 | 3 | 4
}
export function buildHeatmap(data: MagnetData, now: Date, weeks = 18): HeatCell[] {
  const goal = new Set<string>()
  for (const t of data.tasks) if (t.done && t.completedAt) goal.add(dayKey(new Date(t.completedAt)))
  for (const f of data.focus) goal.add(f.date)
  for (const h of data.habits) for (const d of h.history) goal.add(d)

  // per-day intensity score (tasks*1 + focus minutes/30 + habit hits)
  const score = new Map<string, number>()
  for (const t of data.tasks)
    if (t.done && t.completedAt) {
      const k = dayKey(new Date(t.completedAt))
      score.set(k, (score.get(k) ?? 0) + 1)
    }
  for (const f of data.focus) score.set(f.date, (score.get(f.date) ?? 0) + f.minutes / 30)
  for (const h of data.habits) for (const d of h.history) score.set(d, (score.get(d) ?? 0) + 0.6)

  const out: HeatCell[] = []
  // Anchor the grid to the Sunday of the current week, then back up (weeks-1)
  // full weeks — so the last column is always the live week and today gets a
  // real cell (previously the grid stopped at last Sunday and today never
  // rendered).
  const anchor = addDays(now, -now.getDay())
  const first = addDays(anchor, -(weeks - 1) * 7)
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(first, i)
    const k = dayKey(d)
    if (d > now) {
      out.push({ date: k, value: 0, level: 0 })
      continue
    }
    const v = score.get(k) ?? 0
    let level: HeatCell['level'] = 0
    if (v > 0) level = 1
    if (v >= 1.5) level = 2
    if (v >= 4) level = 3
    if (v >= 8) level = 4
    out.push({ date: k, value: Math.round(v * 10) / 10, level })
  }
  return out
}

export function Heatmap({
  cells,
  color = 'var(--mg-accent)',
  weeks = 18,
  today,
}: {
  cells: HeatCell[]
  color?: string
  weeks?: number
  today?: string
}) {
  const columns: HeatCell[][] = []
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7))
  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

  // Month labels, GitHub-style: label the week that contains the 1st or 15th.
  const monthAt = (c: HeatCell): string | null => {
    const d = new Date(c.date + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return null
    const dom = d.getDate()
    if (dom === 1 || dom === 15)
      return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(d)
    return null
  }
  const monthLabels = columns.map((col) => {
    for (const c of col) {
      const m = monthAt(c)
      if (m) return m
    }
    return ''
  })

  return (
    <div className="mg-heat">
      <div className="mg-heat-body">
        <div className="mg-heat-days">
          {dayLabels.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mg-heat-plot">
          <div className="mg-heat-months">
            {monthLabels.map((m, i) => (
              <span key={i} className="mg-heat-month">{m}</span>
            ))}
          </div>
          <div className="mg-heat-grid">
            {columns.map((col, ci) => (
              <div className="mg-heat-col" key={ci}>
                {col.map((c, ri) => (
                  <span
                    key={ri}
                    className={`mg-heat-cell lvl-${c.level}${c.date === today ? ' is-today' : ''}`}
                    title={`${c.date}${c.value ? ` · ${c.value} pts` : ''}`}
                    style={c.level > 0 ? ({ ['--cell' as string]: color } as React.CSSProperties) : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════ Trend chip ══════════════
export function Trend({ delta, invert = false, suffix = '%' }: { delta: number; invert?: boolean; suffix?: string }) {
  const up = delta >= 0
  const good = invert ? !up : up
  return (
    <span className={`mg-trend ${good ? 'good' : 'bad'}`}>
      <span className="mg-trend-ico" style={up ? { transform: 'rotate(-90deg)' } : { transform: 'rotate(90deg)' }}>
        <Icon name="chevron" size={12} />
      </span>
      {Math.abs(delta) >= 1000 ? `${(delta / 1000).toFixed(1)}k` : Math.round(Math.abs(delta))}
      {suffix}
    </span>
  )
}

// ══════════════ AI insight card ══════════════
export function AICard({
  title,
  body,
  tone = 'good',
  children,
}: {
  title: string
  body: string
  tone?: 'good' | 'watch' | 'tip'
  children?: ReactNode
}) {
  return (
    <div className={`mg-ai tone-${tone}`}>
      <div className="mg-ai-badge">
        <Icon name="sparkle" size={14} />
        <span>AI</span>
      </div>
      <strong className="mg-ai-title">{title}</strong>
      <p className="mg-ai-body">{body}</p>
      {children}
    </div>
  )
}

// ══════════════ Stat tile (with hierarchy sizes) ══════════════
export function StatTile({
  icon,
  label,
  value,
  sub,
  trend,
  spark,
  size = 'md',
  tone,
}: {
  icon: string
  label: string
  value: ReactNode
  sub?: ReactNode
  trend?: number
  spark?: number[]
  size?: 'sm' | 'md' | 'lg'
  tone?: string
}) {
  return (
    <div className={`mg-tile size-${size}`} style={tone ? ({ ['--mg-tile-tone' as string]: tone } as React.CSSProperties) : undefined}>
      <div className="mg-tile-top">
        <span className="mg-tile-icon">
          <Icon name={icon} size={size === 'sm' ? 15 : 18} />
        </span>
        <span className="mg-tile-label">{label}</span>
        {trend !== undefined && <Trend delta={trend} />}
      </div>
      <div className="mg-tile-value">{value}</div>
      {spark ? (
        <Sparkline data={spark} height={size === 'sm' ? 30 : 40} />
      ) : sub ? (
        <div className="mg-tile-sub">{sub}</div>
      ) : null}
    </div>
  )
}

// ══════════════ Score gauge (focus score 0..100) ══════════════
export function ScoreGauge({ score, label = 'Focus Score', size = 132 }: { score: number; label?: string; size?: number }) {
  const tone = score >= 75 ? '#46d6a0' : score >= 50 ? '#ffb454' : '#ff7a3d'
  return (
    <div className="mg-gauge" style={{ width: size }}>
      <ProgressRing pct={score / 100} size={size} label={String(score)} sub={label} />
      <span className="mg-gauge-tone" style={{ color: tone, borderColor: tone }}>
        {score >= 75 ? 'Strong' : score >= 50 ? 'Steady' : 'Recover'}
      </span>
    </div>
  )
}

// ══════════════ Donut / ring wrapper ══════════════
export function MiniRing({ pct, label, color = 'var(--mg-accent)', size = 64 }: { pct: number; label: string; color?: string; size?: number }) {
  return (
    <div className="mg-miniring" style={{ width: size }}>
      <ProgressRing pct={pct / 100} size={size} />
      <span className="mg-miniring-label">{label}</span>
    </div>
  )
}

// ══════════════ Timeline item ══════════════
export function TimelineItem({
  icon,
  title,
  meta,
  tone,
  time,
}: {
  icon: string
  title: string
  meta?: string
  tone?: string
  time?: string
}) {
  return (
    <li className="mg-tl-item">
      <span className="mg-tl-dot" style={tone ? { background: tone } : undefined}>
        <Icon name={icon} size={13} />
      </span>
      <div className="mg-tl-body">
        <span className="mg-tl-title">{title}</span>
        {meta && <span className="mg-tl-meta">{meta}</span>}
      </div>
      {time && <span className="mg-tl-time">{time}</span>}
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC ANALYTICS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Composite 0..100 "Focus Score" from the student's own signals.
export function focusScore(data: MagnetData, now: Date): number {
  const s30 = computeStats(data, now, 30)
  const s7 = computeStats(data, now, 7)
  const streak = computeStreakSafe(data, now)
  const completion = s30.completionRate
  const consistency = Math.min(1, s7.activeDays / 7)
  const habit = s30.habitConsistency
  const deep = s30.focusMinutes > 0 ? Math.min(1, s30.deepWorkMinutes / s30.focusMinutes) : 0
  const raw =
    completion * 0.3 + Math.min(1, streak / 30) * 0.25 + habit * 0.2 + consistency * 0.15 + deep * 0.1
  return Math.max(1, Math.min(100, Math.round(raw * 100)))
}

// 0..100 heuristic burnout risk. Higher = more at risk.
export function burnoutRisk(data: MagnetData, now: Date): number {
  const s = computeStats(data, now, 14)
  const prev = computeStats(data, addDays(now, -14), 14)
  const openHigh = data.tasks.filter((t) => !t.done && (t.priority === 'high' || t.priority === 'urgent')).length
  let risk = Math.min(1, openHigh / 9) * 38
  if (prev.focusMinutes > 0 && s.focusMinutes < prev.focusMinutes * 0.75) risk += 22
  if (computeStreakSafe(data, now) === 0) risk += 14
  const longSessions = data.focus.filter((f) => f.minutes >= 110).length
  risk += Math.min(1, longSessions / 6) * 16
  const lowSleep = s.completionRate < 0.4 && s.created >= 6 ? 10 : 0
  risk += lowSleep
  return Math.max(0, Math.min(100, Math.round(risk)))
}

function computeStreakSafe(data: MagnetData, now: Date): number {
  // inlined minimal streak (computeStreak lives in insights.ts but we avoid a
  // second import cycle by reusing the same logic here).
  const active = new Set<string>()
  for (const t of data.tasks) if (t.done && t.completedAt) active.add(dayKey(new Date(t.completedAt)))
  for (const f of data.focus) active.add(f.date)
  for (const h of data.habits) for (const d of h.history) active.add(d)
  let streak = 0
  let cursor = active.has(dayKey(now)) ? now : addDays(now, -1)
  while (active.has(dayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

// Compare this window to the previous equal-length window → signed % deltas.
export interface Trends {
  focus: number
  tasks: number
  deep: number
  consistency: number
  goals: number
}
export function windowTrends(data: MagnetData, now: Date, days: number): Trends {
  const cur = computeStats(data, now, days)
  const prev = computeStats(data, addDays(now, -days), days)
  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0)
  return {
    focus: pct(cur.focusMinutes, prev.focusMinutes),
    tasks: pct(cur.completed, prev.completed),
    deep: pct(cur.deepWorkMinutes, prev.deepWorkMinutes),
    consistency: pct(cur.habitConsistency, prev.habitConsistency),
    goals: pct(cur.avgGoalProgress, prev.avgGoalProgress),
  }
}

// Most productive day-of-week from the daily focus series.
export function peakDay(daily: { day: string; tasks: number; minutes: number }[]): { label: string; minutes: number } {
  const byDow = [0, 0, 0, 0, 0, 0, 0]
  for (const d of daily) {
    const dt = new Date(d.day + 'T00:00:00')
    if (Number.isNaN(dt.getTime())) continue
    byDow[dt.getDay()] += d.minutes + d.tasks * 25
  }
  let best = 0
  for (let i = 1; i < 7; i++) if (byDow[i] > byDow[best]) best = i
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return { label: byDow[best] > 0 ? names[best] : '—', minutes: byDow[best] }
}

// Forecast next-period focus hours assuming current daily pace continues.
export function forecastFocus(data: MagnetData, now: Date, days: number): { hours: number; confidence: number } {
  const s = computeStats(data, now, days)
  const active = Math.max(1, s.activeDays)
  const perDay = s.focusMinutes / active
  const projected = (perDay * days) / 60
  const confidence = Math.round(Math.min(1, s.activeDays / days + 0.25) * 100)
  return { hours: Math.round(projected * 10) / 10, confidence }
}
