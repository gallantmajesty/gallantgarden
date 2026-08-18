import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import {
  RANGES,
  computeStats,
  addDays,
  type RangeKey,
} from '../../../lib/magnet/insights'
import { PRIORITY_META, type Priority } from '../../../lib/magnet/types'
import { Panel, MgModal, Field, EmptyState } from '../ui'
import { Icon } from '../Icon'
import {
  ColumnChart,
  Trend,
  windowTrends,
  forecastFocus,
  focusScore,
  burnoutRisk,
} from '../premium'
import '../premium.css'
import './AnalyticsView.css'
import { useNow } from '../useNow'

const MAX_MANUAL_SESSION = 240

// Compact labels for the range bar (quiet, no clutter).
const SHORT_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  '6m': '6M',
  '1y': '1Y',
}

const SESSION_BUCKETS = [
  { label: '≤15m', min: 0, max: 15 },
  { label: '16–30m', min: 15, max: 30 },
  { label: '31–45m', min: 30, max: 45 },
  { label: '46–60m', min: 45, max: 60 },
  { label: '61–90m', min: 60, max: 90 },
  { label: '90m+', min: 90, max: Infinity },
]

export function AnalyticsView() {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const logFocus = useMagnet((s) => s.logFocus)

  const [range, setRange] = useState<RangeKey>('30d')
  const [focusOpen, setFocusOpen] = useState(false)
  const [focusMin, setFocusMin] = useState(25)

  // Live clock — refreshes every 30s so every window (today / streak / weekly)
  // stays real-time and rolls over at midnight while the view is open.
  const now = useNow()
  const days = RANGES.find((r) => r.key === range)?.days ?? 30

  const stats = useMemo(() => computeStats(data, now, days), [data, now, days])
  const streak = useMemo(() => computeStreakSafe(data, now), [data, now])
  const trends = useMemo(() => windowTrends(data, now, days), [data, now, days])
  const forecast = useMemo(() => forecastFocus(data, now, days), [data, now, days])
  const score = useMemo(() => focusScore(data, now), [data, now])
  const burnout = useMemo(() => burnoutRisk(data, now), [data, now])

  // Window helper: is this yyyy-mm-dd date inside the current window?
  const inWindow = (day: string, cutoff: number, ceil: number): boolean => {
    const tt = new Date(day + 'T00:00:00').getTime()
    return !Number.isNaN(tt) && tt >= cutoff && tt <= ceil
  }
  const cutoff = now.getTime() - days * 86400000
  const ceil = now.getTime() + 86400000

  // condense the daily series for the focus chart (max ~14 columns)
  const bars = useMemo(() => {
    const d = stats.daily
    const tk = dayKeySafe(now.toISOString())
    const step = Math.ceil(d.length / 14) || 1
    const out: { label: string; minutes: number; today: boolean }[] = []
    for (let i = 0; i < d.length; i += step) {
      const slice = d.slice(i, i + step)
      const minutes = slice.reduce((s, x) => s + x.minutes, 0)
      const day = slice[slice.length - 1].day.slice(5)
      out.push({ label: day, minutes, today: slice.some((x) => x.day === tk) })
    }
    return out
  }, [stats.daily, now])

  const totalFocus = Math.round((stats.focusMinutes / 60) * 10) / 10

  // ── Goal-centered analysis: every goal's progress + the tasks completed
  // towards it inside the current window.
  const goalRows = useMemo(() => {
    return data.goals
      .map((g) => {
        const inWin = data.tasks.filter(
          (task) =>
            task.projectId === g.projectId &&
            task.done &&
            !!task.completedAt &&
            inWindow(dayKeySafe(task.completedAt), cutoff, ceil),
        ).length
        const doneM = g.milestones.filter((m) => m.done).length
        return { goal: g, inWin, doneM, totalM: g.milestones.length }
      })
      .sort((a, b) => b.goal.progress - a.goal.progress)
  }, [data, cutoff, ceil])

  // ── Session length distribution (focus sessions in the window, bucketed).
  const sessions = useMemo(() => {
    const inWin = data.focus.filter((f) => inWindow(f.date, cutoff, ceil))
    const buckets = SESSION_BUCKETS.map((b) => ({
      label: b.label,
      count: inWin.filter((f) => f.minutes > b.min && f.minutes <= b.max).length,
    }))
    const total = inWin.reduce((s, f) => s + f.minutes, 0)
    return {
      total: inWin.length,
      minutes: total,
      buckets,
      max: Math.max(1, ...buckets.map((b) => b.count)),
    }
  }, [data.focus, cutoff, ceil])

  // ── Completed tasks by priority (within the window).
  const prioEntries = useMemo(() => {
    const counts = new Map<Priority, number>()
    for (const tk of data.tasks) {
      if (!tk.done || !tk.completedAt) continue
      const tt = new Date(tk.completedAt).getTime()
      if (Number.isNaN(tt) || tt < cutoff || tt > ceil) continue
      counts.set(tk.priority, (counts.get(tk.priority) ?? 0) + 1)
    }
    return (['urgent', 'high', 'medium', 'low'] as Priority[])
      .map((p) => ({ p, count: counts.get(p) ?? 0 }))
      .filter((x) => x.count > 0)
  }, [data.tasks, cutoff, ceil])
  const prioTotal = prioEntries.reduce((s, x) => s + x.count, 0)

  // ── Daily study bars (in place of the old heatmap).
  const studyBars = useMemo(() => {
    const d = stats.daily
    return {
      values: d.map((x) => x.minutes),
      labels: d.map((x) => String(new Date(x.day + 'T00:00:00').getDate())),
    }
  }, [stats.daily])

  const hasData = data.tasks.length > 0 || data.focus.length > 0 || data.goals.length > 0

  function submitFocus(e: React.FormEvent) {
    e.preventDefault()
    const m = Math.min(MAX_MANUAL_SESSION, Math.max(1, Number(focusMin) || 0))
    if (!m || m <= 0) return
    logFocus(m, '', { award: true })
    setFocusOpen(false)
  }

  return (
    <div className="mg-studio an">
      <div className="mg-studio-hero">
        <div>
          <span className="mg-kicker"><Icon name="chart" size={13} />{t('growth.kicker')}</span>
          <h2>{t('growth.title')}</h2>
          <p>{t('growth.subtitle')}</p>
        </div>
        <button className="mg-btn primary" onClick={() => setFocusOpen(true)}>
          <Icon name="clock" size={16} />{t('analytics.logFocus')}
        </button>
      </div>

      <div className="mg-rangebar2">
        {RANGES.map((r) => (
          <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
            {SHORT_LABELS[r.key]}
          </button>
        ))}
      </div>

      {!hasData ? (
        <Panel>
          <EmptyState icon="chart" title={t('analytics.noDataTitle')} body={t('analytics.noDataBody')} />
        </Panel>
      ) : (
        <>
          {/* ═══ BIG KPIs (YouTube Studio style) ═══ */}
          <section className="mg-kpis">
            <div className="mg-kpi">
              <span className="mg-kpi-label"><Icon name="clock" size={16} />{t('growth.focusHours')}</span>
              <span className="mg-kpi-val">{totalFocus}<small>h</small></span>
              <div className="mg-kpi-foot">
                <Trend delta={trends.focus} />
                <span>{t('growth.vsPrev')}</span>
              </div>
            </div>
            <div className="mg-kpi">
              <span className="mg-kpi-label"><Icon name="check" size={16} />{t('growth.tasksDone')}</span>
              <span className="mg-kpi-val">{stats.completed}</span>
              <div className="mg-kpi-foot">
                <Trend delta={trends.tasks} />
                <span>{t('growth.vsPrev')}</span>
              </div>
            </div>
            <div className="mg-kpi">
              <span className="mg-kpi-label"><Icon name="target" size={16} />{t('growth.followThrough')}</span>
              <span className="mg-kpi-val">{Math.round(stats.completionRate * 100)}<small>%</small></span>
              <div className="mg-kpi-foot">
                <span>{streak} {t('growth.dayStreakShort')}</span>
                <span>{stats.activeDays} {t('growth.activeDaysShort')}</span>
              </div>
            </div>
            <div className="mg-kpi">
              <span className="mg-kpi-label"><Icon name="timer" size={16} />{t('analytics.sessionsKpi')}</span>
              <span className="mg-kpi-val">{sessions.total}</span>
              <div className="mg-kpi-foot">
                <span>{sessions.total > 0 ? `${Math.round(sessions.minutes / sessions.total)}m ${t('analytics.avgSession')}` : t('growth.notEnough')}</span>
              </div>
            </div>
          </section>

          {/* ═══ FOCUS TIME (big chart) ═══ */}
          <section className="mg-pr">
            <div className="mg-pr-head">
              <h3><Icon name="clock" size={18} />{t('growth.focusTime')}</h3>
              <span className="mg-muted" style={{ fontSize: 12 }}>{t('growth.perDay')}</span>
            </div>
            <FocusAreaChart bars={bars} />
          </section>

          {/* ═══ DAILY STUDY (vertical bars — replaces the heatmap) ═══ */}
          <section className="mg-pr">
            <div className="mg-pr-head">
              <h3><Icon name="chart" size={18} />{t('analytics.studyBars')}</h3>
              <span className="mg-muted" style={{ fontSize: 12 }}>{t('growth.perDay')}</span>
            </div>
            {Math.max(...studyBars.values) === 0 ? (
              <div className="mg-chart-empty">{t('dashboard.hoursEmpty')}</div>
            ) : (
              <ColumnChart
                values={studyBars.values}
                labels={studyBars.labels}
                format={(v) => (v >= 60 ? `${(v / 60).toFixed(1)}h` : `${v}m`)}
                highlight={studyBars.values.length - 1}
              />
            )}
          </section>

          {/* ═══ SESSION LENGTHS + PRIORITY SPLIT ═══ */}
          <section className="mg-duo">
            <Panel>
              <div className="mg-pr-head">
                <h3><Icon name="timer" size={18} />{t('analytics.sessionLengths')}</h3>
              </div>
              {sessions.total === 0 ? (
                <p className="mg-muted">{t('analytics.sessionsEmpty')}</p>
              ) : (
                <ul className="mg-meterlist">
                  {sessions.buckets.map((b) => (
                    <li key={b.label}>
                      <span>{b.label}</span>
                      <span className="mg-muted">{b.count} · {Math.round((b.count / sessions.total) * 100)}%</span>
                      <span className="mg-msub"><i style={{ width: `${(b.count / sessions.max) * 100}%`, background: 'var(--mg-accent)' }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel>
              <div className="mg-pr-head">
                <h3><Icon name="target" size={18} />{t('analytics.prioritySplit')}</h3>
              </div>
              {prioTotal === 0 ? (
                <p className="mg-muted">{t('analytics.priorityEmpty')}</p>
              ) : (
                <ul className="mg-meterlist">
                  {prioEntries.map((e) => (
                    <li key={e.p}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="mg-pill-dot" style={{ background: PRIORITY_META[e.p].color }} />
                        {PRIORITY_META[e.p].label}
                      </span>
                      <span className="mg-muted">{Math.round((e.count / prioTotal) * 100)}%</span>
                      <span className="mg-msub"><i style={{ width: `${(e.count / prioTotal) * 100}%`, background: PRIORITY_META[e.p].color }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          {/* ═══ GOAL-CENTERED ANALYSIS ═══ */}
          <section className="mg-pr">
            <div className="mg-pr-head">
              <h3><Icon name="target" size={18} />{t('analytics.goalProgress')}</h3>
            </div>
            {goalRows.length === 0 ? (
              <p className="mg-muted">{t('analytics.goalEmpty')}</p>
            ) : (
              <ul className="mg-meterlist">
                {goalRows.map(({ goal, inWin, doneM, totalM }) => (
                  <li key={goal.id}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span className="mg-pill-dot" style={{ background: goal.color || 'var(--mg-accent)' }} />
                      {goal.title}
                    </span>
                    <span className="mg-muted">
                      {totalM > 0 && `${doneM}/${totalM} ${t('analytics.milestones')} · `}
                      {inWin > 0 && `${inWin} ${t('analytics.tasksThisWin')}`}
                    </span>
                    <span className="mg-msub"><i style={{ width: `${Math.min(100, goal.progress)}%`, background: goal.color || 'var(--mg-accent)' }} /></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ═══ CONSISTENCY + BURNOUT ═══ */}
          <section className="mg-duo">
            <Panel>
              <div className="mg-pr-head"><h3><Icon name="fire" size={18} />{t('analytics.consistency')}</h3></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 30 }}>{streak}</strong>
                <span className="mg-muted" style={{ fontSize: 12.5 }}>{t('growth.dayStreakShort')}</span>
              </div>
              <p className="mg-muted" style={{ fontSize: 12.5, marginTop: 8 }}>{t('analytics.consistencyHint')}</p>
            </Panel>
            <Panel>
              <div className="mg-pr-head"><h3><Icon name="bulb" size={18} />{t('growth.burnoutRisk')}</h3></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 30, color: burnout >= 60 ? '#ff5d6c' : burnout >= 35 ? '#ffb454' : '#46d6a0' }}>{burnout}</strong>
                <span className="mg-muted" style={{ fontSize: 12.5 }}>/ 100</span>
              </div>
              <p className="mg-muted" style={{ fontSize: 12.5, marginTop: 8 }}>{burnout >= 60 ? t('growth.burnHigh') : burnout >= 35 ? t('growth.burnMid') : t('growth.burnLow')}</p>
            </Panel>
          </section>

          {/* ═══ GROWTH FORECAST ═══ */}
          <section className="mg-pr">
            <div className="mg-forecast">
              <span className="mg-kicker"><Icon name="rocket" size={13} />{t('growth.forecast')}</span>
              <div className="mg-forecast-big">
                {forecast.hours}<small>h projected</small>
              </div>
              <p className="mg-muted" style={{ fontSize: 13, margin: 0 }}>
                {t('growth.forecastBody', { days })}
                {score != null && ` ${t('growth.focusScoreNote', { score })}`}
              </p>
            </div>
          </section>
        </>
      )}

      <MgModal open={focusOpen} title={t('analytics.logFocusTitle')} onClose={() => setFocusOpen(false)}>
        <form className="mg-form" onSubmit={submitFocus}>
          <Field label={t('analytics.minutesFocused')}>
            <input
              type="number"
              min={1}
              max={MAX_MANUAL_SESSION}
              step={5}
              value={focusMin}
              onChange={(e) => setFocusMin(Number(e.target.value))}
              autoFocus
            />
            <p className="mg-muted" style={{ fontSize: 12, marginTop: 6 }}>
              {t('analytics.manualCap', { max: MAX_MANUAL_SESSION })}
            </p>
          </Field>
          <div className="mg-form-actions">
            <button type="button" className="mg-btn glass" onClick={() => setFocusOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              {t('analytics.logSession')}
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}

// A clean, readable focus-time chart: a single area+line over a hairline grid,
// axis ticks, and a hover guide + tooltip. The live "today" point is filled.
function FocusAreaChart({ bars }: { bars: { label: string; minutes: number; today: boolean }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 760
  const H = 240
  const padL = 48
  const padR = 12
  const padT = 16
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const maxRaw = Math.max(1, ...bars.map((b) => b.minutes))
  const max = Math.max(60, Math.ceil(maxRaw / 60) * 60)
  const n = bars.length
  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (innerW * i) / (n - 1))
  const yAt = (v: number) => padT + innerH * (1 - v / max)

  const pts = bars.map((b, i) => ({ x: xAt(i), y: yAt(b.minutes), ...b }))
  const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `M${padL} ${padT + innerH} ${pts
    .map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')} L${(padL + innerW).toFixed(1)} ${padT + innerH} Z`

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + innerH * f,
    v: Math.round(max * (1 - f)),
  }))
  const labelStep = Math.max(1, Math.ceil(n / 7))
  const colW = n <= 1 ? innerW : innerW / (n - 1)
  const active = hover != null ? pts[hover] : null

  return (
    <div className="an-areachart">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)} role="img" aria-label="Daily focus minutes">
        <defs>
          <linearGradient id="anFocusFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mg-accent)" stopOpacity={0.26} />
            <stop offset="100%" stopColor="var(--mg-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridVals.map((g, i) => (
          <g key={i}>
            <line className="an-grid" x1={padL} x2={padL + innerW} y1={g.y} y2={g.y} />
            <text className="an-axis" x={padL - 8} y={g.y + 3} textAnchor="end">
              {g.v}m
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#anFocusFill)" />
        <path className="an-line" d={linePath} />

        {pts.map((p, i) =>
          i % labelStep === 0 || p.today ? (
            <text
              key={`x${i}`}
              className={`an-xlabel${p.today ? ' today' : ''}`}
              x={p.x}
              y={H - 9}
            >
              {p.today ? 'Today' : p.label}
            </text>
          ) : null,
        )}

        {active && (
          <line className="an-guide" x1={active.x} x2={active.x} y1={padT} y2={padT + innerH} />
        )}
        {pts.map((p, i) => (
          <circle key={`d${i}`} className={`an-dot${p.today ? ' today' : ''}`} cx={p.x} cy={p.y} r={p.today ? 4 : 2.6} />
        ))}

        {/* invisible hover targets spanning each column */}
        {pts.map((p, i) => (
          <rect
            key={`h${i}`}
            x={p.x - colW / 2}
            y={padT}
            width={colW}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {active && (
        <div className="an-tip" style={{ left: `${(active.x / W) * 100}%` }}>
          <span className="an-tip-day">{active.today ? 'Today' : active.label}</span>
          <span className="an-tip-val">
            {active.minutes}m{active.minutes >= 60 ? ` · ${(active.minutes / 60).toFixed(1)}h` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

function computeStreakSafe(data: Parameters<typeof computeStats>[0], now: Date): number {
  const active = new Set<string>()
  for (const t of data.tasks) if (t.done && t.completedAt) active.add(dayKeySafe(t.completedAt))
  for (const f of data.focus) active.add(f.date)
  let streak = 0
  let cursor = active.has(dayKeySafe(now.toISOString())) ? now : addDays(now, -1)
  while (active.has(dayKeySafe(cursor.toISOString()))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
function dayKeySafe(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}