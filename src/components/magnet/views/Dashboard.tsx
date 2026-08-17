import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MagnetView } from '../../../screens/TaskMagnet'
import { useMagnet } from '../../../store/magnet'
import { computeStats, computeStreak, generateInsights } from '../../../lib/magnet/insights'
import { AREA_META, PRIORITY_META } from '../../../lib/magnet/types'
import { Panel, EmptyState, ProgressRing } from '../ui'
import type { MagnetData } from '../../../lib/magnet/types'
import { Icon } from '../Icon'
import { WeeklyReview } from './WeeklyReview'
import {
  Sparkline,
  Heatmap,
  buildHeatmap,
  AICard,
  StatTile,
  ScoreGauge,
  TimelineItem,
  focusScore,
  burnoutRisk,
  windowTrends,
  peakDay,
  type HeatCell,
} from '../premium'
import '../premium.css'
import { awardWeeklyWarrior } from '../../../lib/xpEngine'
import { rankForTotalXp } from '../../../lib/ranks'
import { useProfile } from '../../../store/profile'
import { useNow } from '../useNow'
import { taskPower, habitPower } from '../../../lib/magnet/score'
import { useMxpFloat } from '../MxpFeedback'

// The emotional "home" of the world — redone in the calm, story-telling Korean
// minimal style: a big hero that answers "how is my life today?", a performance
// overview with real hierarchy, an activity timeline, a live analytics preview,
// and a quiet motivation corner. AI is woven through every block.

function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Winding down'
}

function todayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const QUOTES = [
  { q: 'Small steps every day beat a sprint you quit.', a: 'FocusLily' },
  { q: 'Discipline is choosing what you want most over what you want now.', a: 'A. N. Unknown' },
  { q: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
  { q: 'Calm mind, sharp focus — that is the whole game.', a: 'FocusLily' },
  { q: 'You do not rise to your goals. You fall to your systems.', a: 'James Clear' },
]

export function Dashboard({ name, onNavigate }: { name: string; onNavigate: (v: MagnetView) => void }) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  // The username is the logged-in user's OWN profile name — read it straight
  // from the profile store (synced from the DB `display_name` column) so the
  // Headquarters always greets the person who is signed in, never a fallback.
  const profileName = useProfile((s) => s.displayName)
  const who = profileName && profileName.trim() && profileName !== 'Explorer' ? profileName : name
  const addTask = useMagnet((s) => s.addTask)
  const toggleTask = useMagnet((s) => s.toggleTask)
  const toggleHabitToday = useMagnet((s) => s.toggleHabitToday)

  const [quick, setQuick] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const float = useMxpFloat()

  // Auto-suggest a weekly review on Sunday evenings (a natural reflection point).
  useEffect(() => {
    const d = new Date()
    if (d.getDay() === 0 && d.getHours() >= 17) setReviewOpen(true)
  }, [])

  // Live clock — refreshes every 30s so "today", streak and weekly numbers
  // stay real-time (and roll over correctly at midnight) while the app is open.
  const now = useNow()
  const tk = todayKey(now)

  const today = useMemo(() => computeStats(data, now, 1), [data, now])
  const s30 = useMemo(() => computeStats(data, now, 30), [data, now])
  const s7 = useMemo(() => computeStats(data, now, 7), [data, now])
  const streak = useMemo(() => computeStreak(data, now), [data, now])

  // Weekly warrior: check if 5+ days studied this week
  useEffect(() => {
    if (streak < 5) return
    const { xp, premiumXp, rankXp } = useProfile.getState()
    const rankBase = rankXp > 0 ? rankXp : xp + premiumXp
    const currentRank = rankForTotalXp(rankBase)
    const result = awardWeeklyWarrior(xp, premiumXp, streak, currentRank.id)
    if (result.leaves > 0) {
      useProfile.getState().applyXp({ leaves: result.leaves })
    }
  }, [streak])
  const insights = useMemo(() => generateInsights(data, now, 30), [data, now])
  const trends = useMemo(() => windowTrends(data, now, 30), [data, now])
  const score = useMemo(() => focusScore(data, now), [data, now])
  const burnout = useMemo(() => burnoutRisk(data, now), [data, now])
  const heat = useMemo<HeatCell[]>(() => buildHeatmap(data, now, 18), [data, now])
  const peak = useMemo(() => peakDay(s30.daily), [s30.daily])

  const spark14 = useMemo(() => s30.daily.slice(-14).map((d) => d.minutes + d.tasks * 25), [s30.daily])
  const sparkFocus = useMemo(() => s30.daily.slice(-14).map((d) => d.minutes), [s30.daily])
  const sparkTasks = useMemo(() => s30.daily.slice(-14).map((d) => d.tasks), [s30.daily])

  const hasData = data.tasks.length > 0 || data.focus.length > 0 || data.habits.length > 0

  // Next planned session = the soonest open task (due soonest first).
  const nextSession = useMemo(() => {
    const open = data.tasks.filter((t) => !t.done)
    if (open.length === 0) return null
    return [...open].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))[0]
  }, [data.tasks])

  // today's agenda: overdue + due-today + undated open tasks, priority-sorted
  const agenda = useMemo(() => {
    const open = data.tasks.filter((t) => !t.done)
    const scored = open
      .map((t) => {
        let bucket = 2
        if (t.due && t.due < tk) bucket = 0
        else if (t.due === tk) bucket = 1
        return { t, bucket }
      })
      .filter((x) => x.bucket < 2 || !x.t.due)
      .sort((a, b) => a.bucket - b.bucket || PRIORITY_META[b.t.priority].weight - PRIORITY_META[a.t.priority].weight)
    return scored.slice(0, 4)
  }, [data.tasks, tk])

  const quote = useMemo(() => QUOTES[now.getDate() % QUOTES.length], [now])
  const focusH = Math.floor(today.focusMinutes / 60)
  const focusM = today.focusMinutes % 60
  const weekH = Math.round((s7.focusMinutes / 60) * 10) / 10
  const velocity = Math.round((s7.completed / 7) * 10) / 10
  // Magnet Power earned today (local-only progression currency).
  const todayPower = data.mxpDay.date === tk ? data.mxpDay.value : 0

  const dateLine = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(now),
    [now],
  )

  function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    addTask({ title, due: tk })
    setQuick('')
  }

  return (
    <div className="mg-today">
      {!hasData ? (
        <div className="mg-pr mg-welcome">
          <span className="mg-kicker"><Icon name="sparkle" size={13} />{t('dashboard.headquarters')}</span>
          <h1 className="mg-hero-hello">{greeting(now)}, <span className="mg-name-accent">{who}</span></h1>
          <p className="mg-hero-date">{dateLine}</p>
          <p className="mg-hero-sub">A clear horizon. Plant one small intention and watch your world grow.</p>
          <form className="mg-quick2" onSubmit={submitQuick}>
            <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={t('dashboard.quickCapturePlaceholder')} />
            <button type="submit" aria-label={t('common.add')}><Icon name="plus" size={18} /></button>
          </form>
          <div className="mg-welcome-start">
            <span className="mg-welcome-start-ico"><Icon name="leaf" size={26} /></span>
            <div>
              <h3>{t('dashboard.notStartedTitle')}</h3>
              <p>{t('dashboard.notStartedBody')}</p>
              <div className="mg-welcome-actions">
                <button className="mg-welcome-btn" onClick={() => onNavigate('tasks')}>{t('dashboard.planDay')}</button>
                <button className="mg-welcome-btn ghost" onClick={() => onNavigate('habits')}>{t('dashboard.buildHabit')}</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {reviewOpen && <WeeklyReview onClose={() => setReviewOpen(false)} />}

          {/* ═══ HERO ═══ */}
          <section className="mg-pr">
            <div className="mg-hero2">
              <div className="mg-hero2-main">
                <span className="mg-kicker"><Icon name="sparkle" size={13} />{t('dashboard.headquarters')}</span>
                <h1 className="mg-hero-hello mg-anim">{greeting(now)}, <span className="mg-name-accent">{who}</span></h1>
                <p className="mg-hero-date">{dateLine}</p>
                <p className="mg-hero-sub">{agenda.length > 0 ? `You have ${agenda.length} thing${agenda.length > 1 ? 's' : ''} waiting — let's make today count.` : 'A clear horizon today. Protect one deep session and the rest flows.'}</p>
                <form className="mg-quick2" onSubmit={submitQuick}>
                  <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={t('dashboard.quickCapturePlaceholder')} />
                  <button type="submit" aria-label={t('common.add')}><Icon name="plus" size={18} /></button>
                </form>
              </div>

              <div className="mg-hero2-side">
                <div className="mg-pr pad-sm">
                  <div className="mg-hero-card">
                    <ScoreGauge score={score} />
                    <div className="mg-hero-scoretext">
                      <h4>{t('dashboard.focusScore')}</h4>
                      <p>{score == null ? 'No history yet — finish a task or log a focus session and this gauge comes alive.' : score >= 75 ? 'You are in a strong, sustainable rhythm.' : score >= 50 ? 'Steady progress — protect your deep blocks.' : 'Time to recover — one small win resets the curve.'}</p>
                    </div>
                  </div>
                </div>
                <div className="mg-chiprow">
                  <div className="mg-chip">
                    <span className="mg-chip-ico"><Icon name="fire" size={18} /></span>
                    <b>{streak}</b>
                    <span>{t('dashboard.dayStreak')}</span>
                  </div>
                  <div className="mg-chip">
                    <span className="mg-chip-ico"><Icon name="clock" size={18} /></span>
                    <b>{weekH}h</b>
                    <span>{t('dashboard.weekFocus')}</span>
                  </div>
                  <div className="mg-chip">
                    <span className="mg-chip-ico"><Icon name="target" size={18} /></span>
                    <b>{data.goals.filter((g) => g.progress < 100).length}</b>
                    <span>{t('dashboard.activeGoals')}</span>
                  </div>
                  <div className="mg-chip" title={t('dashboard.powerHint')}>
                    <span className="mg-chip-ico"><Icon name="spark" size={18} /></span>
                    <b>{todayPower}</b>
                    <span>{t('dashboard.powerToday')}</span>
                  </div>
                  <button className="mg-chip mg-chip-cta" onClick={() => onNavigate('tasks')} title={nextSession ? nextSession.title : ''}>
                    <span className="mg-chip-ico"><Icon name="play" size={18} /></span>
                    <b>{nextSession ? `${nextSession.estimateMin > 0 ? nextSession.estimateMin : 25}m` : '—'}</b>
                    <span>{nextSession ? nextSession.title : t('dashboard.nextSession')}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ PERFORMANCE OVERVIEW ═══ */}
          <section className="mg-perf">
            <StatTile
              size="lg"
              icon="clock"
              label={t('dashboard.focusToday')}
              value={`${focusH ? focusH + 'h ' : ''}${focusM}m`}
              tone={AREA_META.health.color}
              spark={sparkFocus}
            />
            <StatTile
              icon="check"
              label={t('dashboard.doneToday')}
              value={today.completed}
              trend={trends.tasks}
              tone={AREA_META.academic.color}
              spark={sparkTasks}
            />
            <StatTile
              icon="brain"
              label={t('dashboard.deepWork')}
              value={`${Math.round((s30.deepWorkMinutes / 60) * 10) / 10}h`}
              trend={trends.deep}
              tone={AREA_META.creative.color}
              spark={spark14}
            />
            <div className="mg-contextline">
              <span className="mg-ctx">
                <span className="mg-ctx-dot" style={{ background: AREA_META.social.color }} />
                {t('dashboard.consistency')} <b>{Math.round(s30.habitConsistency * 100)}%</b>
              </span>
              <span className="mg-ctx">
                <span className="mg-ctx-dot" style={{ background: AREA_META.career.color }} />
                {t('dashboard.velocity')} <b>{velocity}</b> {t('dashboard.perWeek')}
              </span>
              <span className="mg-ctx">
                <span
                  className="mg-ctx-dot"
                  style={{ background: burnout >= 60 ? '#ff5d6c' : burnout >= 35 ? '#ffb454' : '#46d6a0' }}
                />
                {t('dashboard.burnoutRisk')} <b>{burnout}%</b>
              </span>
            </div>
          </section>

          {/* ═══ MISSION + AI ═══ */}
          <section className="mg-duo">
            <Panel className="mg-mission-wrap">
              <div className="mg-panel-head">
                <h3><Icon name="calendar" size={18} />{t('dashboard.onToday')}</h3>
                <button className="mg-link" onClick={() => onNavigate('tasks')}>{t('dashboard.allTasks')} <Icon name="chevron" size={14} /></button>
              </div>
              {agenda.length === 0 ? (
                <EmptyState icon="leaf" title={t('dashboard.nothingScheduled')} body={t('dashboard.nothingScheduledBody')} />
              ) : (
                <div className="mg-mission">
                  {agenda.map(({ t: task, bucket }) => {
                    const a = AREA_META[task.area]
                    return (
                      <div key={task.id} className="mg-mission-item">
                        <button
                          className={`mg-check2 ${task.done ? 'done' : ''}`}
                          onClick={(e) => {
                            toggleTask(task.id)
                            const eligible = !task.due || task.due === tk
                            if (!task.done && eligible) float.push(e, taskPower(task))
                          }}
                          aria-label="Complete"
                          style={{ ['--mg-accent' as string]: PRIORITY_META[task.priority].color }}
                        >
                          <Icon name="check" size={14} />
                        </button>
                        <span className={`mg-mission-title ${task.done ? 'done' : ''}`}>{task.title}</span>
                        <span className="mg-tag" style={{ ['--mg-tag' as string]: a.color }}>
                          <Icon name={a.icon} size={12} /> {a.label}
                        </span>
                        {bucket === 0 && <span className="mg-agenda-overdue">Overdue</span>}
                        <span className="mg-mission-prio" style={{ background: PRIORITY_META[task.priority].color }} title={PRIORITY_META[task.priority].label} />
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            <div className="mg-ai-stack">
              <AICard title={insights[0]?.title ?? t('dashboard.aiTitle')} body={insights[0]?.body ?? t('dashboard.aiBody')} tone={insights[0]?.tone ?? 'tip'} />
              <Panel className="pad-sm">
                <div className="mg-panel-head tight" style={{ marginBottom: 10 }}>
                  <h4><Icon name="fire" size={15} /> {t('dashboard.habitsToday')}</h4>
                  <button className="mg-link" onClick={() => onNavigate('habits')}>{t('common.edit')}</button>
                </div>
                {data.habits.length === 0 ? (
                  <p className="mg-muted">{t('dashboard.noHabits')}</p>
                ) : (
                  <div className="mg-habit-chips">
                    {data.habits.slice(0, 6).map((h) => {
                      const done = h.history.includes(tk)
                      return (
                        <button key={h.id} className={`mg-habit-chip ${done ? 'done' : ''}`} onClick={(e) => {
                          toggleHabitToday(h.id)
                          if (!done) float.push(e, habitPower())
                        }} style={{ ['--mg-tag' as string]: h.color }}>
                          <Icon name={done ? 'check' : h.icon} size={14} /> {h.title}
                        </button>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>
          </section>

          {/* ═══ ACTIVITY TIMELINE + ANALYTICS PREVIEW ═══ */}
          <section className="mg-duo">
            <Panel>
              <div className="mg-panel-head">
                <h3><Icon name="journal" size={18} />{t('dashboard.recentActivity')}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="mg-link" onClick={() => setReviewOpen(true)}>
                    <Icon name="sparkle" size={13} /> {t('taskMagnet.weeklyReview')}
                  </button>
                  <button className="mg-link" onClick={() => onNavigate('analytics')}>{t('dashboard.more')} <Icon name="chevron" size={14} /></button>
                </div>
              </div>
              <ul className="mg-timeline">
                {timelineItems(data, now).map((it, i) => (
                  <TimelineItem key={i} icon={it.icon} title={it.title} meta={it.meta} tone={it.tone} time={it.time} />
                ))}
                {timelineItems(data, now).length === 0 && (
                  <EmptyState icon="sparkle" title={t('dashboard.quietYet')} body={t('dashboard.quietYetBody')} />
                )}
              </ul>
            </Panel>

            <Panel>
              <div className="mg-panel-head">
                <h3><Icon name="chart" size={18} />{t('dashboard.weeklyPulse')}</h3>
                <span className="mg-muted" style={{ fontSize: 12 }}>{peak.label}</span>
              </div>
              <Sparkline data={spark14} height={64} />
              <div className="mg-ringrow" style={{ marginTop: 16 }}>
                <MiniRingLive pct={Math.round(s30.completionRate * 100)} label={t('dashboard.followThrough')} />
                <MiniRingLive pct={Math.round(s30.avgGoalProgress * 100)} label={t('dashboard.goalAvg')} />
                <MiniRingLive pct={Math.round((s30.deepWorkMinutes / Math.max(1, s30.focusMinutes)) * 100)} label={t('dashboard.deepRatio')} />
              </div>
            </Panel>
          </section>

          {/* ═══ STUDY HEATMAP ═══ */}
          <section className="mg-pr">
            <div className="mg-pr-head">
              <h3><Icon name="grid" size={18} />{t('dashboard.studyMap')}</h3>
              <span className="mg-muted" style={{ fontSize: 12 }}>18 weeks · {t('dashboard.lighterLess')}</span>
            </div>
            <Heatmap cells={heat} today={tk} />
            <div className="mg-heat-legend">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className={`mg-heat-cell lvl-${l}`} />
              ))}
              <span>More</span>
            </div>
          </section>

          {/* ═══ MOTIVATION ═══ */}
          <section className="mg-trio">
            <div className="mg-pr mg-quote">
              <span className="mg-kicker"><Icon name="sparkle" size={13} />{t('dashboard.dailyQuote')}</span>
              <blockquote>“{quote.q}”</blockquote>
              <cite>— {quote.a}</cite>
            </div>
            <Panel className="mg-quote">
              <div className="mg-pr-head"><h3><Icon name="heart" size={18} />{t('dashboard.todayMood')}</h3></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="mg-mood-ico" style={{ ['--mg-mood' as string]: moodColor(score) }}>
                  <Icon name={moodIcon(score, streak)} size={22} />
                </span>
                <div>
                  <strong style={{ fontSize: 15 }}>{moodLabel(score, streak)}</strong>
                  <p className="mg-muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{t('dashboard.moodSub')}</p>
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="mg-pr-head"><h3><Icon name="trophy" size={18} />{t('dashboard.wins')}</h3></div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>{data.achievements.length}</span>
                <span className="mg-muted" style={{ fontSize: 13 }}>{t('dashboard.earned')}</span>
              </div>
            </Panel>
          </section>
        </>
      )}

      {float.node}
    </div>
  )
}

function MiniRingLive({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mg-miniring" style={{ width: 72 }}>
      <ProgressRing pct={Math.max(0, Math.min(100, pct)) / 100} size={72} label={`${Math.round(pct)}%`} />
      <span className="mg-miniring-label">{label}</span>
    </div>
  )
}

function moodIcon(score: number | null, streak: number): string {
  if (score == null) return 'moon'
  if (score >= 75 && streak >= 5) return 'sun'
  if (score >= 60) return 'spark'
  if (score >= 40) return 'leaf'
  return 'moon'
}
function moodColor(score: number | null): string {
  if (score == null) return '#8a8f98'
  if (score >= 60) return '#d8a657'
  if (score >= 40) return '#9b6dff'
  return '#46d6a0'
}
function moodLabel(score: number | null, streak: number): string {
  if (score == null) return 'Getting started'
  if (score >= 75 && streak >= 5) return 'Thriving'
  if (score >= 60) return 'Balanced'
  if (score >= 40) return 'Steady'
  return 'Recovering'
}

interface TLItem {
  icon: string
  title: string
  meta?: string
  tone?: string
  time?: string
}
function timelineItems(data: MagnetData, now: Date): TLItem[] {
  const items: TLItem[] = []
  const recent = [...data.tasks]
    .filter((t) => t.done && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 4)
  for (const t of recent) {
    items.push({ icon: 'check', title: t.title, meta: 'Task done', tone: AREA_META[t.area].color, time: relTime(new Date(t.completedAt!), now) })
  }
  const focus = [...data.focus].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 2)
  for (const f of focus) {
    items.push({ icon: 'clock', title: `${f.minutes}m focus${f.subject ? ` · ${f.subject}` : ''}`, meta: 'Focus session', tone: AREA_META.health.color, time: relTime(new Date(f.date + 'T12:00:00'), now) })
  }
  const ach = [...data.achievements].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 1)
  for (const a of ach) {
    items.push({ icon: 'trophy', title: a.title, meta: 'Achievement', tone: AREA_META.career.color, time: relTime(new Date(a.at), now) })
  }
  return items.slice(0, 6)
}

function relTime(d: Date, now: Date): string {
  const diff = Math.max(0, now.getTime() - d.getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  return `${days}d`
}
