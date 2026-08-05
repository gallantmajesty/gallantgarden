import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import {
  RANGES,
  computeStats,
  generateInsights,
  addDays,
  type RangeKey,
} from '../../../lib/magnet/insights'
import { AREA_META, type LifeArea } from '../../../lib/magnet/types'
import { SectionHead, Panel, MgModal, Field, MiniBars, EmptyState } from '../ui'
import { Icon } from '../Icon'
import {
  Sparkline,
  Heatmap,
  buildHeatmap,
  AICard,
  Trend,
  windowTrends,
  forecastFocus,
  peakDay,
  focusScore,
  burnoutRisk,
  type HeatCell,
} from '../premium'
import '../premium.css'

const TONE_ICON: Record<string, string> = { good: 'star', watch: 'fire', tip: 'bulb' }

export function AnalyticsView() {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const logFocus = useMagnet((s) => s.logFocus)

  const [range, setRange] = useState<RangeKey>('30d')
  const [focusOpen, setFocusOpen] = useState(false)
  const [focusMin, setFocusMin] = useState(25)
  const [focusSubject, setFocusSubject] = useState('')

  const now = useMemo(() => new Date(), [])
  const days = RANGES.find((r) => r.key === range)?.days ?? 30

  const stats = useMemo(() => computeStats(data, now, days), [data, now, days])
  const streak = useMemo(() => computeStreakSafe(data, now), [data, now])
  const insights = useMemo(() => generateInsights(data, now, days), [data, now, days])
  const trends = useMemo(() => windowTrends(data, now, days), [data, now, days])
  const heat = useMemo<HeatCell[]>(() => buildHeatmap(data, now, 18), [data, now])
  const peak = useMemo(() => peakDay(stats.daily), [stats.daily])
  const forecast = useMemo(() => forecastFocus(data, now, days), [data, now, days])
  const score = useMemo(() => focusScore(data, now), [data, now])
  const burnout = useMemo(() => burnoutRisk(data, now), [data, now])

  // condense the daily series for the bar charts (max ~14 columns)
  const bars = useMemo(() => {
    const d = stats.daily
    const step = Math.ceil(d.length / 14) || 1
    const out: { label: string; tasks: number; minutes: number }[] = []
    for (let i = 0; i < d.length; i += step) {
      const slice = d.slice(i, i + step)
      const tasks = slice.reduce((s, x) => s + x.tasks, 0)
      const minutes = slice.reduce((s, x) => s + x.minutes, 0)
      const day = slice[slice.length - 1].day.slice(5)
      out.push({ label: day, tasks, minutes })
    }
    return out
  }, [stats.daily])

  const totalDeep = Math.round((stats.deepWorkMinutes / 60) * 10) / 10
  const totalFocus = Math.round((stats.focusMinutes / 60) * 10) / 10
  const areaEntries = (Object.keys(stats.perArea) as LifeArea[])
    .map((a) => ({ area: a, count: stats.perArea[a] }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
  const areaTotal = areaEntries.reduce((s, x) => s + x.count, 0)

  const habitRows = useMemo(() => {
    const cutoff = now.getTime() - days * 86400000
    const ceil = now.getTime() + 86400000
    const windowDays = Math.max(1, Math.min(days, 90))
    return data.habits
      .map((h) => {
        const hits = h.history.filter((d) => {
          const tt = new Date(d).getTime()
          return !Number.isNaN(tt) && tt >= cutoff && tt <= ceil
        }).length
        return { id: h.id, title: h.title, color: h.color, icon: h.icon, hits, pct: Math.min(1, hits / windowDays) }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [data.habits, now, days])

  const hasData =
    data.tasks.length > 0 || data.focus.length > 0 || data.goals.length > 0 || data.habits.length > 0

  function submitFocus(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(focusMin)
    if (!m || m <= 0) return
    logFocus(m, focusSubject.trim(), { award: true })
    setFocusOpen(false)
  }

  const whyFocus = (): string => {
    if (stats.focusMinutes === 0) return t('growth.whyEmpty')
    const dir = trends.focus >= 0 ? `up ${trends.focus}%` : `down ${Math.abs(trends.focus)}%`
    return t('growth.whyFocus', { dir, peak: peak.label })
  }

  return (
    <div className="mg-studio">
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
            {r.label}
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
              <span className="mg-kpi-label"><Icon name="brain" size={16} />{t('growth.deepWork')}</span>
              <span className="mg-kpi-val">{totalDeep}<small>h</small></span>
              <div className="mg-kpi-foot">
                <Trend delta={trends.deep} />
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
          </section>

          {/* ═══ FOCUS TIME (big chart + WHY) ═══ */}
          <section className="mg-duo">
            <Panel>
              <div className="mg-pr-head">
                <h3><Icon name="clock" size={18} />{t('growth.focusTime')}</h3>
                <span className="mg-muted" style={{ fontSize: 12 }}>{t('growth.perDay')}</span>
              </div>
              <Sparkline data={stats.daily.map((d) => d.minutes)} height={120} />
              <div style={{ marginTop: 14 }}>
                <MiniBars data={bars.map((b) => ({ label: b.label, value: b.minutes }))} color="var(--mg-accent2)" height={96} />
              </div>
            </Panel>
            <div className="mg-ai-stack">
              <div className="mg-why">
                <Icon name="bulb" size={18} />
                <span>{whyFocus()}</span>
              </div>
              <AICard title={insights[0]?.title ?? t('growth.aiTitle')} body={insights[0]?.body ?? t('growth.aiBody')} tone={insights[0]?.tone ?? 'tip'} />
              <Panel className="pad-sm">
                <div className="mg-pr-head tight" style={{ marginBottom: 10 }}>
                  <h4><Icon name="sun" size={15} />{t('growth.peakDay')}</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <strong style={{ fontSize: 22 }}>{peak.label}</strong>
                  <span className="mg-muted" style={{ fontSize: 12.5 }}>{peak.minutes > 0 ? `${Math.round(peak.minutes / 60)}h avg focus` : t('growth.notEnough')}</span>
                </div>
              </Panel>
            </div>
          </section>

          {/* ═══ SUBJECT + LIFE BALANCE ═══ */}
          <section className="mg-duo">
            <Panel>
              <div className="mg-pr-head">
                <h3><Icon name="book" size={18} />{t('growth.bySubject')}</h3>
              </div>
              {stats.perSubject.length === 0 ? (
                <p className="mg-muted">{t('analytics.tagTasksHint')}</p>
              ) : (
                <ul className="mg-meterlist">
                  {stats.perSubject.slice(0, 6).map((s) => {
                    const max = stats.perSubject[0].minutes + stats.perSubject[0].tasks * 25 || 1
                    const val = s.minutes + s.tasks * 25
                    return (
                      <li key={s.subject}>
                        <span>{s.subject}</span>
                        <span className="mg-muted">{s.tasks}t · {s.minutes}m</span>
                        <span className="mg-msub"><i style={{ width: `${(val / max) * 100}%`, background: 'var(--mg-accent)' }} /></span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
            <Panel>
              <div className="mg-pr-head">
                <h3><Icon name="palette" size={18} />{t('growth.lifeBalance')}</h3>
              </div>
              {areaTotal === 0 ? (
                <p className="mg-muted">{t('analytics.completeAreasHint')}</p>
              ) : (
                <ul className="mg-meterlist">
                  {areaEntries.map((e) => (
                    <li key={e.area}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="mg-pill-dot" style={{ background: AREA_META[e.area].color }} />
                        {AREA_META[e.area].label}
                      </span>
                      <span className="mg-muted">{Math.round((e.count / areaTotal) * 100)}%</span>
                      <span className="mg-msub"><i style={{ width: `${(e.count / areaTotal) * 100}%`, background: AREA_META[e.area].color }} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          {/* ═══ STUDY MAP (GitHub-style heatmap) ═══ */}
          <section className="mg-pr">
            <div className="mg-pr-head">
              <h3><Icon name="grid" size={18} />{t('growth.studyMap')}</h3>
              <span className="mg-muted" style={{ fontSize: 12 }}>18 weeks</span>
            </div>
            <Heatmap cells={heat} />
            <div className="mg-heat-legend">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className={`mg-heat-cell lvl-${l}`} />
              ))}
              <span>More</span>
            </div>
          </section>

          {/* ═══ DEEP WORK + HABITS + BURNOUT ═══ */}
          <section className="mg-trio">
            <Panel>
              <div className="mg-pr-head"><h3><Icon name="brain" size={18} />{t('growth.deepRatio')}</h3></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 30 }}>{stats.focusMinutes > 0 ? Math.round((stats.deepWorkMinutes / stats.focusMinutes) * 100) : 0}%</strong>
                <span className="mg-muted" style={{ fontSize: 12.5 }}>{t('growth.ofFocus')}</span>
              </div>
              <p className="mg-muted" style={{ fontSize: 12.5, marginTop: 8 }}>{t('growth.deepHint')}</p>
            </Panel>
            <Panel>
              <div className="mg-pr-head"><h3><Icon name="fire" size={18} />{t('growth.habitConsistency')}</h3></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 30 }}>{Math.round(stats.habitConsistency * 100)}%</strong>
                <span className="mg-muted" style={{ fontSize: 12.5 }}>{t('growth.thisWindow')}</span>
              </div>
              <div className="mg-pillrow" style={{ marginTop: 10 }}>
                {habitRows.slice(0, 4).map((h) => (
                  <span key={h.id} className="mg-pill" style={{ ['--mg-tag' as string]: h.color }}>
                    <span className="mg-pill-dot" style={{ background: h.color }} /> {h.title}
                  </span>
                ))}
              </div>
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
            <div className="mg-duo" style={{ alignItems: 'center' }}>
              <div className="mg-forecast">
                <span className="mg-kicker"><Icon name="rocket" size={13} />{t('growth.forecast')}</span>
                <div className="mg-forecast-big">
                  {forecast.hours}<small>h projected</small>
                </div>
                <p className="mg-muted" style={{ fontSize: 13, margin: 0 }}>
                  {t('growth.forecastBody', { days })}
                </p>
              </div>
              <div className="mg-ai-stack">
                <AICard title={t('growth.forecastAiTitle')} body={t('growth.forecastAiBody', { conf: forecast.confidence })} tone="good" />
                <div className="mg-why">
                  <Icon name="target" size={18} />
                  <span>{t('growth.focusScoreNote', { score })}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ PERFORMANCE INTELLIGENCE ═══ */}
          <section>
            <SectionHead icon="brain" title={t('analytics.performanceIntel')} />
            <div className="mg-insightgrid">
              {insights.map((ins, i) => (
                <div key={i} className={`mg-insight tone-${ins.tone}`}>
                  <span className="mg-insight-icon">
                    <Icon name={TONE_ICON[ins.tone] ?? 'bulb'} size={16} />
                  </span>
                  <div>
                    <strong>{ins.title}</strong>
                    <p>{ins.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <MgModal open={focusOpen} title={t('analytics.logFocusTitle')} onClose={() => setFocusOpen(false)}>
        <form className="mg-form" onSubmit={submitFocus}>
          <Field label={t('analytics.minutesFocused')}>
            <input type="number" min={1} step={5} value={focusMin} onChange={(e) => setFocusMin(Number(e.target.value))} autoFocus />
          </Field>
          <Field label={t('analytics.subjectLabel')}>
            <input
              list="mg-subjects-an"
              value={focusSubject}
              onChange={(e) => setFocusSubject(e.target.value)}
              placeholder={t('analytics.subjectPlaceholder')}
            />
            <datalist id="mg-subjects-an">
              {data.subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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

// inlined streak (mirrors insights.computeStreak) to avoid an extra import path
function computeStreakSafe(data: Parameters<typeof computeStats>[0], now: Date): number {
  const active = new Set<string>()
  for (const t of data.tasks) if (t.done && t.completedAt) active.add(dayKeySafe(t.completedAt))
  for (const f of data.focus) active.add(f.date)
  for (const h of data.habits) for (const d of h.history) active.add(d)
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
