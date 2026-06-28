import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import {
  RANGES,
  computeStats,
  computeStreak,
  generateInsights,
  type RangeKey,
} from '../../../lib/magnet/insights'
import { AREA_META, type LifeArea } from '../../../lib/magnet/types'
import { SectionHead, Panel, StatCard, MiniBars, EmptyState, MgModal, Field } from '../ui'
import { Icon } from '../Icon'

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
  const streak = useMemo(() => computeStreak(data, now), [data, now])
  const insights = useMemo(() => generateInsights(data, now, days), [data, now, days])

  // condense the daily series for the bar charts (max ~14 columns)
  const bars = useMemo(() => {
    const d = stats.daily
    const step = Math.ceil(d.length / 14) || 1
    const out: { label: string; tasks: number; minutes: number }[] = []
    for (let i = 0; i < d.length; i += step) {
      const slice = d.slice(i, i + step)
      const tasks = slice.reduce((s, x) => s + x.tasks, 0)
      const minutes = slice.reduce((s, x) => s + x.minutes, 0)
      const day = slice[slice.length - 1].day.slice(5) // mm-dd
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

  // per-habit consistency over the selected window (same math as the engine,
  // surfaced here so each habit gets its own bar).
  const habitRows = useMemo(() => {
    const cutoff = now.getTime() - days * 86400000
    const ceil = now.getTime() + 86400000
    const windowDays = Math.max(1, Math.min(days, 90))
    return data.habits
      .map((h) => {
        const hits = h.history.filter((d) => {
          const t = new Date(d).getTime()
          return !Number.isNaN(t) && t >= cutoff && t <= ceil
        }).length
        return { id: h.id, title: h.title, color: h.color, icon: h.icon, hits, pct: Math.min(1, hits / windowDays) }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [data.habits, now, days])

  const activeGoals = useMemo(
    () =>
      data.goals
        .filter((g) => g.progress < 100)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 5),
    [data.goals],
  )

  function submitFocus(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(focusMin)
    if (!m || m <= 0) return
    logFocus(m, focusSubject.trim())
    setFocusOpen(false)
  }

  const hasData =
    data.tasks.length > 0 || data.focus.length > 0 || data.goals.length > 0 || data.habits.length > 0

  return (
    <div className="mg-view">
      <SectionHead
        icon="chart"
        title={t('analytics.title')}
        subtitle={t('analytics.subtitle')}
        action={
          <button className="mg-btn primary" onClick={() => setFocusOpen(true)}>
            <Icon name="clock" size={16} />{t('analytics.logFocus')}
          </button>
        }
      />

      <div className="mg-rangebar">
        {RANGES.map((r) => (
          <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <EmptyState
          icon="chart"
          title={t('analytics.noDataTitle')}
          body={t('analytics.noDataBody')}
        />
      ) : (
        <>
          <div className="mg-statrow wide">
            <StatCard icon="check" label={t('analytics.tasksDone')} value={stats.completed} />
            <StatCard icon="clock" label={t('analytics.focusHours')} value={totalFocus} tone={AREA_META.health.color} />
            <StatCard icon="brain" label={t('analytics.deepWorkHrs')} value={totalDeep} tone={AREA_META.creative.color} />
            <StatCard icon="calendar" label={t('analytics.activeDays')} value={stats.activeDays} tone={AREA_META.academic.color} />
            <StatCard
              icon="target"
              label={t('analytics.followThrough')}
              value={`${Math.round(stats.completionRate * 100)}%`}
              tone={AREA_META.career.color}
            />
            <StatCard icon="fire" label={t('analytics.streak')} value={streak} tone="#ff7a3d" />
            {data.goals.length > 0 && (
              <StatCard
                icon="target"
                label={t('analytics.goalProgress')}
                value={`${Math.round(stats.avgGoalProgress * 100)}%`}
                tone={AREA_META.personal.color}
              />
            )}
            {data.habits.length > 0 && (
              <StatCard
                icon="spark"
                label={t('analytics.habitConsistency')}
                value={`${Math.round(stats.habitConsistency * 100)}%`}
                tone={AREA_META.social.color}
              />
            )}
          </div>

          <div className="mg-analytics-grid">
            <Panel>
              <div className="mg-panel-head">
                <h3>
                  <Icon name="check" size={17} />{t('analytics.tasksCompleted')}
                </h3>
              </div>
              <MiniBars data={bars.map((b) => ({ label: b.label, value: b.tasks }))} color="var(--mg-accent)" height={120} />
            </Panel>
            <Panel>
              <div className="mg-panel-head">
                <h3>
                  <Icon name="clock" size={17} />{t('analytics.focusMinutes')}
                </h3>
              </div>
              <MiniBars data={bars.map((b) => ({ label: b.label, value: b.minutes }))} color="var(--mg-accent2)" height={120} />
            </Panel>

            <Panel>
              <div className="mg-panel-head">
                <h3>
                  <Icon name="book" size={17} />{t('analytics.bySubject')}
                </h3>
              </div>
              {stats.perSubject.length === 0 ? (
                <p className="mg-muted">t('analytics.tagTasksHint')</p>
              ) : (
                <ul className="mg-subjectlist">
                  {stats.perSubject.slice(0, 6).map((s) => {
                    const max = stats.perSubject[0].minutes + stats.perSubject[0].tasks * 25 || 1
                    const val = s.minutes + s.tasks * 25
                    return (
                      <li key={s.subject}>
                        <div className="mg-subject-top">
                          <span>{s.subject}</span>
                          <span className="mg-muted">
                            {s.tasks} task{s.tasks !== 1 ? 's' : ''}
                            {s.minutes > 0 ? ` · ${s.minutes}m` : ''}
                          </span>
                        </div>
                        <div className="mg-meter">
                          <div className="mg-meter-fill" style={{ width: `${(val / max) * 100}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            <Panel>
              <div className="mg-panel-head">
                <h3>
                  <Icon name="palette" size={17} />{t('analytics.lifeBalance')}
                </h3>
              </div>
              {areaTotal === 0 ? (
                <p className="mg-muted">t('analytics.completeAreasHint')</p>
              ) : (
                <ul className="mg-arealist">
                  {areaEntries.map((e) => (
                    <li key={e.area}>
                      <span className="mg-area-dot" style={{ background: AREA_META[e.area].color }} />
                      <span className="mg-area-label">{AREA_META[e.area].label}</span>
                      <div className="mg-meter">
                        <div
                          className="mg-meter-fill"
                          style={{ width: `${(e.count / areaTotal) * 100}%`, background: AREA_META[e.area].color }}
                        />
                      </div>
                      <span className="mg-muted">{Math.round((e.count / areaTotal) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <div className="mg-panel-head">
                <h3>
                  <Icon name="target" size={17} />{t('analytics.goalProgressPanel')}
                </h3>
              </div>
              {activeGoals.length === 0 ? (
                <p className="mg-muted">
                  {data.goals.length > 0
                    ? t('analytics.goalsComplete')
                    : t('analytics.setGoalHint')}
                </p>
              ) : (
                <ul className="mg-subjectlist">
                  {activeGoals.map((g) => {
                    const done = g.milestones.filter((m) => m.done).length
                    return (
                      <li key={g.id}>
                        <div className="mg-subject-top">
                          <span>{g.title}</span>
                          <span className="mg-muted">
                            {g.milestones.length > 0 ? `${done}/${g.milestones.length} · ` : ''}
                            {g.progress}%
                          </span>
                        </div>
                        <div className="mg-meter">
                          <div
                            className="mg-meter-fill"
                            style={{ width: `${g.progress}%`, background: g.color }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            <Panel>
              <div className="mg-panel-head">
                <h3>
                  <Icon name="fire" size={17} />{t('analytics.habitConsistencyPanel')}
                </h3>
              </div>
              {habitRows.length === 0 ? (
                <p className="mg-muted">t('analytics.buildHabitHint')</p>
              ) : (
                <ul className="mg-subjectlist">
                  {habitRows.slice(0, 6).map((h) => (
                    <li key={h.id}>
                      <div className="mg-subject-top">
                        <span>{h.title}</span>
                        <span className="mg-muted">
                          {h.hits} day{h.hits !== 1 ? 's' : ''} · {Math.round(h.pct * 100)}%
                        </span>
                      </div>
                      <div className="mg-meter">
                        <div className="mg-meter-fill" style={{ width: `${h.pct * 100}%`, background: h.color }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel className="mg-insightpanel">
            <div className="mg-panel-head">
              <h3>
                <Icon name="brain" size={18} />{t('analytics.performanceIntel')}
              </h3>
            </div>
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
          </Panel>
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
            <button type="button" className="mg-btn ghost" onClick={() => setFocusOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="mg-btn primary">
              Log session
            </button>
          </div>
        </form>
      </MgModal>
    </div>
  )
}
