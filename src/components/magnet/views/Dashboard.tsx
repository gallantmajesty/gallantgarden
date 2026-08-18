import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MagnetView } from '../../../screens/TaskMagnet'
import { useMagnet } from '../../../store/magnet'
import { computeStats, computeStreak, dayKey } from '../../../lib/magnet/insights'
import { ColumnChart, ScoreDonut, periodScore } from '../premium'
import { PRIORITY_META } from '../../../lib/magnet/types'
import { Icon } from '../Icon'
import { WeeklyReview } from './WeeklyReview'
import '../premium.css'
import { awardWeeklyWarrior } from '../../../lib/xpEngine'
import { rankForTotalXp } from '../../../lib/ranks'
import { useProfile } from '../../../store/profile'
import { useNow } from '../useNow'

// The emotional "home" of the world — a quiet headquarters: a greeting with
// the player's leaf balance, a focus-vs-tasks pie with the ALL-TIME high score
// in its center, vertical COLUMN charts for hours studied (Today / Monthly /
// Yearly window picked from the arc selector pinned to the bottom-right),
// a today's-tasks bar you can check off in place, and a quote at the bottom.

function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Winding down'
}

const QUOTES = [
  { q: 'Small steps every day beat a sprint you quit.', a: 'FocusLily' },
  { q: 'Discipline is choosing what you want most over what you want now.', a: 'A. N. Unknown' },
  { q: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
  { q: 'Calm mind, sharp focus — that is the whole game.', a: 'FocusLily' },
  { q: 'You do not rise to your goals. You fall to your systems.', a: 'James Clear' },
]

type HqWindow = 'today' | 'month' | 'year'

export function Dashboard({ name, onNavigate }: { name: string; onNavigate: (v: MagnetView) => void }) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  // The username is the logged-in user's OWN profile name — read it straight
  // from the profile store (synced from the DB `display_name` column) so the
  // Headquarters always greets the person who is signed in, never a fallback.
  const profileName = useProfile((s) => s.displayName)
  const who = profileName && profileName.trim() && profileName !== 'Explorer' ? profileName : name
  // Green leaves = spendable wallet, straight from the profile store.
  const leaves = useProfile((s) => s.xp)
  const addTask = useMagnet((s) => s.addTask)
  const toggleTask = useMagnet((s) => s.toggleTask)

  const [quick, setQuick] = useState('')
  // Auto-open the weekly review on Sunday evenings (a natural reflection point)
  // — evaluated once at mount, no effect needed.
  const [reviewOpen, setReviewOpen] = useState(() => {
    const d = new Date()
    return d.getDay() === 0 && d.getHours() >= 17
  })
  const [win, setWin] = useState<HqWindow>('month')

  // Live clock — refreshes every 30s so "today", streak and weekly numbers
  // stay real-time (and roll over correctly at midnight) while the app is open.
  const now = useNow()

  const tk = dayKey(now)
  const today = useMemo(() => computeStats(data, now, 1), [data, now])
  const s30 = useMemo(() => computeStats(data, now, 30), [data, now])
  const s365 = useMemo(() => computeStats(data, now, 365), [data, now])
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

  const hasData = data.tasks.length > 0 || data.focus.length > 0 || data.goals.length > 0

  // Pie: focus minutes vs task completions for the selected window. The center
  // always shows the ALL-TIME high score (best of today / month / year).
  const winFocus = win === 'today' ? today.focusMinutes : win === 'month' ? s30.focusMinutes : s365.focusMinutes
  const winTasks = win === 'today' ? today.completed : win === 'month' ? s30.completed : s365.completed
  const highScore = Math.max(
    periodScore(data, now, 1),
    periodScore(data, now, 30),
    periodScore(data, now, 365),
  )

  const fmtHours = (v: number) => (v >= 60 ? `${(v / 60).toFixed(1)}h` : `${v}m`)
  const monthShort = (day: string) =>
    new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(day + 'T00:00:00'))

  // Hours studied — vertical columns for the selection:
  // Today = a single column, Monthly = last 30 days, Yearly = 12 monthly bars.
  const hoursData = useMemo(() => {
    if (win === 'today') {
      return { values: [today.focusMinutes], labels: [t('dashboard.today')] }
    }
    if (win === 'month') {
      const d = s30.daily
      return { values: d.map((x) => x.minutes), labels: d.map((x) => String(new Date(x.day + 'T00:00:00').getDate())) }
    }
    const byMonth = new Map<string, { label: string; minutes: number }>()
    for (const x of s365.daily) {
      const d = new Date(x.day + 'T00:00:00')
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const cur = byMonth.get(key) ?? { label: monthShort(x.day), minutes: 0 }
      cur.minutes += x.minutes
      byMonth.set(key, cur)
    }
    const arr = [...byMonth.values()]
    return { values: arr.map((m) => m.minutes), labels: arr.map((m) => m.label) }
  }, [win, today.focusMinutes, s30, s365, t])

  // Today's task bar — the day's work, checkable right here in the HQ.
  const todayOpen = useMemo(
    () =>
      data.tasks
        .filter((t) => !t.done && t.due === tk)
        .sort((a, b) => PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight),
    [data.tasks, tk],
  )
  const overdue = useMemo(
    () =>
      data.tasks
        .filter((t) => !t.done && !!t.due && t.due < tk)
        .sort((a, b) => PRIORITY_META[a.priority].weight - PRIORITY_META[b.priority].weight),
    [data.tasks, tk],
  )
  const doneToday = useMemo(
    () => data.tasks.filter((t) => t.done && t.completedAt && dayKey(new Date(t.completedAt)) === tk).length,
    [data.tasks, tk],
  )
  const todayRow = [...overdue, ...todayOpen]

  const quote = useMemo(() => QUOTES[now.getDate() % QUOTES.length], [now])

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
                <button className="mg-welcome-btn ghost" onClick={() => onNavigate('goals')}>{t('dashboard.setGoal')}</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {reviewOpen && <WeeklyReview onClose={() => setReviewOpen(false)} />}

          {/* ═══ GREETING + LEAVES ═══ */}
          <section className="mg-pr mg-hq-hero">
            <div className="mg-hq-hero-main">
              <span className="mg-kicker"><Icon name="sparkle" size={13} />{t('dashboard.welcomeBack')}</span>
              <h1 className="mg-hero-hello">{greeting(now)}, <span className="mg-name-accent">{who}</span></h1>
              <p className="mg-hero-date">{dateLine}</p>
            </div>
            <div className="mg-hq-leaves" title={t('dashboard.leavesTitle')}>
              <Icon name="leaf" size={17} />
              {leaves.toLocaleString()}
            </div>
          </section>

          {/* ═══ PIE (center = all-time high score) + STUDY BARS + TODAY'S TASKS ═══ */}
          <section className="mg-hq-grid">
            <div className="mg-pr mg-hq-donut">
              <ScoreDonut
                values={[winFocus, winTasks]}
                labels={[t('dashboard.focus'), t('dashboard.tasksChart')]}
                colors={['#46d6a0', '#6c8cff']}
                centerLabel={t('dashboard.highScore')}
                centerValue={hasData ? highScore : null}
              />
            </div>

            <div className="mg-pr">
              <div className="mg-pr-head">
                <h3><Icon name="clock" size={18} />{t('dashboard.hoursStudied')}</h3>
                <span className="mg-muted" style={{ fontSize: 11.5 }}>
                  {win === 'today' ? t('dashboard.today') : win === 'month' ? t('dashboard.month') : t('dashboard.year')}
                </span>
              </div>
              {Math.max(...hoursData.values) === 0 ? (
                <div className="mg-chart-empty">{t('dashboard.hoursEmpty')}</div>
              ) : (
                <ColumnChart
                  values={hoursData.values}
                  labels={hoursData.labels}
                  format={fmtHours}
                  highlight={hoursData.values.length - 1}
                />
              )}
            </div>

            <div className="mg-pr mg-hq-taskbar">
              <div className="mg-pr-head">
                <h3><Icon name="check" size={18} />{t('dashboard.todayTasks')}</h3>
                <span className="mg-muted" style={{ fontSize: 11.5 }}>
                  {doneToday > 0 ? `${doneToday} ${t('dashboard.done')}` : ''}
                </span>
              </div>
              {todayRow.length === 0 ? (
                <div className="mg-chart-empty">{t('dashboard.noTasksToday')}</div>
              ) : (
                <ul className="mg-hq-tasklist">
                  {todayRow.slice(0, 6).map((task) => {
                    const isOver = overdue.some((o) => o.id === task.id)
                    return (
                      <li key={task.id} className={`mg-hq-task${isOver ? ' overdue' : ''}`}>
                        <button
                          className="mg-check"
                          onClick={() => toggleTask(task.id)}
                          aria-label={task.title}
                        >
                          <Icon name="check" size={13} />
                        </button>
                        <div className="mg-hq-task-body">
                          <strong>{task.title}</strong>
                        </div>
                        {isOver && <span className="mg-hq-overdue">{t('dashboard.overdue')}</span>}
                      </li>
                    )
                  })}
                  {todayRow.length > 6 && (
                    <li className="mg-hq-task-more">
                      <button onClick={() => onNavigate('tasks')}>{t('dashboard.viewAll')}</button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </section>

          {/* ═══ QUOTE ═══ */}
          <section className="mg-pr mg-quote">
            <span className="mg-kicker"><Icon name="sparkle" size={13} />{t('dashboard.dailyQuote')}</span>
            <blockquote>“{quote.q}”</blockquote>
            <cite>— {quote.a}</cite>
          </section>

          {/* ═══ WINDOW SPIRAL — a 90° corner tab with the three windows fanned
               out on an ~80° arc, pinned to the exact bottom-right corner. ═══ */}
          <HqCorner win={win} onChange={setWin} />
        </>
      )}
    </div>
  )
}

// The HQ window controls: a quarter-circle spiral drawn right into the exact
// corner of the window, with the three windows (Today / Month / Year) fanned
// out on an ~80° arc above the corner. Nothing cycles — every window is one
// tap away, so the student never has to click through windows to find data.
const HQ_WINDOWS: HqWindow[] = ['today', 'month', 'year']

function HqCorner({ win, onChange }: { win: HqWindow; onChange: (w: HqWindow) => void }) {
  const { t } = useTranslation()
  const labels: Record<HqWindow, string> = {
    today: t('dashboard.today'),
    month: t('dashboard.month'),
    year: t('dashboard.year'),
  }
  // Buttons fan out from the exact bottom-right corner (the origin). 0° is
  // straight up from the corner and the sweep runs toward the left over ~76°,
  // so the cluster stays inside an 80° wedge of the corner's 90°.
  const ARC_DEG = [0, 38, 76]
  const R = 62
  const place = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return { x: -Math.round(Math.sin(rad) * R), y: -Math.round(Math.cos(rad) * R) }
  }
  return (
    <div className="mg-hq-corner" role="group" aria-label={t('dashboard.hoursStudied')}>
      <svg className="mg-hq-spiral" viewBox="0 0 120 120" aria-hidden>
        <path
          d="M120 40 C120 84 86 120 40 120 C22 120 6 104 8 82 C10 58 32 40 56 46 C78 51 90 72 78 90 C70 101 54 100 50 88 C47 80 54 72 64 75 C70 77 73 84 68 89"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      {HQ_WINDOWS.map((k, i) => {
        const p = place(ARC_DEG[i])
        return (
          <button
            key={k}
            className={`mg-hq-orb ${win === k ? 'on' : ''}`}
            style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
            onClick={() => onChange(k)}
            aria-label={labels[k]}
            title={labels[k]}
          >
            {labels[k]}
          </button>
        )
      })}
    </div>
  )
}