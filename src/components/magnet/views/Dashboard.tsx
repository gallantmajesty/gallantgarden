import { useMemo, useState } from 'react'
import type { MagnetView } from '../../../screens/TaskMagnet'
import { useMagnet } from '../../../store/magnet'
import { computeStats, computeStreak, generateInsights } from '../../../lib/magnet/insights'
import { levelProgress, AREA_META, PRIORITY_META } from '../../../lib/magnet/types'
import { Panel, StatCard, ProgressRing, EmptyState } from '../ui'
import { Icon } from '../Icon'

// The emotional "home" of the world — a warm greeting, today's pulse, a quick
// capture box, what's on today, and the single most relevant insight.

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

export function Dashboard({ name, onNavigate }: { name: string; onNavigate: (v: MagnetView) => void }) {
  const data = useMagnet((s) => s.data)
  const addTask = useMagnet((s) => s.addTask)
  const toggleTask = useMagnet((s) => s.toggleTask)
  const toggleHabitToday = useMagnet((s) => s.toggleHabitToday)

  const [quick, setQuick] = useState('')

  const now = useMemo(() => new Date(), [])
  const tk = todayKey(now)

  const stats = useMemo(() => computeStats(data, now, 1), [data, now])
  const streak = useMemo(() => computeStreak(data, now), [data, now])
  const insights = useMemo(() => generateInsights(data, now, 30), [data, now])
  const lp = levelProgress(data.xp)

  // today's agenda: overdue + due-today + undated open tasks, priority-sorted
  const agenda = useMemo(() => {
    const open = data.tasks.filter((t) => !t.done)
    const scored = open
      .map((t) => {
        let bucket = 2 // someday
        if (t.due && t.due < tk) bucket = 0 // overdue
        else if (t.due === tk) bucket = 1 // today
        return { t, bucket }
      })
      .filter((x) => x.bucket < 2 || !x.t.due)
      .sort(
        (a, b) =>
          a.bucket - b.bucket ||
          PRIORITY_META[b.t.priority].weight - PRIORITY_META[a.t.priority].weight,
      )
    return scored.slice(0, 6)
  }, [data.tasks, tk])

  function submitQuick(e: React.FormEvent) {
    e.preventDefault()
    const title = quick.trim()
    if (!title) return
    addTask({ title, due: tk })
    setQuick('')
  }

  const focusH = Math.floor(stats.focusMinutes / 60)
  const focusM = stats.focusMinutes % 60

  return (
    <div className="mg-dash">
      {/* hero */}
      <div className="mg-hero mg-panel pad">
        <div className="mg-hero-text">
          <span className="mg-hero-kicker">
            <Icon name="sparkle" size={15} /> Your headquarters
          </span>
          <h1>
            {greeting(now)}, {name}.
          </h1>
          <p>
            {agenda.length > 0
              ? `You have ${agenda.length} thing${agenda.length > 1 ? 's' : ''} waiting — let's make today count.`
              : 'A clear horizon. Plant one small intention and watch your world grow.'}
          </p>
          <form className="mg-quickadd" onSubmit={submitQuick}>
            <input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder="Capture a task for today…"
            />
            <button type="submit" aria-label="Add">
              <Icon name="plus" size={18} />
            </button>
          </form>
        </div>
        <div className="mg-hero-ring">
          <ProgressRing pct={lp.pct} size={132} label={`Lv ${lp.level}`} sub={`${data.xp} XP`} />
        </div>
      </div>

      {/* today's pulse */}
      <div className="mg-statrow">
        <StatCard icon="check" label="Done today" value={stats.completed} tone={AREA_META.academic.color} />
        <StatCard
          icon="clock"
          label="Focus today"
          value={stats.focusMinutes ? `${focusH}h ${focusM}m` : '—'}
          tone={AREA_META.health.color}
        />
        <StatCard icon="fire" label="Day streak" value={streak} tone="#ff7a3d" />
        <StatCard
          icon="trophy"
          label="Achievements"
          value={data.achievements.length}
          tone={AREA_META.career.color}
        />
      </div>

      <div className="mg-dash-grid">
        {/* today's agenda */}
        <Panel className="mg-dash-agenda">
          <div className="mg-panel-head">
            <h3>
              <Icon name="calendar" size={18} /> On today
            </h3>
            <button className="mg-link" onClick={() => onNavigate('tasks')}>
              All tasks <Icon name="chevron" size={14} />
            </button>
          </div>
          {agenda.length === 0 ? (
            <EmptyState icon="leaf" title="Nothing scheduled" body="Capture a task above or open Tasks to plan your day." />
          ) : (
            <ul className="mg-agenda-list">
              {agenda.map(({ t, bucket }) => {
                const a = AREA_META[t.area]
                return (
                  <li key={t.id} className="mg-agenda-item">
                    <button
                      className="mg-check"
                      onClick={() => toggleTask(t.id)}
                      aria-label="Complete"
                      style={{ ['--mg-check-tone' as string]: PRIORITY_META[t.priority].color }}
                    >
                      <Icon name="check" size={14} />
                    </button>
                    <span className="mg-agenda-main">
                      <span className="mg-agenda-title">{t.title}</span>
                      <span className="mg-agenda-meta">
                        <span className="mg-tag" style={{ ['--mg-tag' as string]: a.color }}>
                          <Icon name={a.icon} size={12} /> {a.label}
                        </span>
                        {t.subject && <span className="mg-agenda-subject">{t.subject}</span>}
                        {bucket === 0 && <span className="mg-agenda-overdue">Overdue</span>}
                      </span>
                    </span>
                    <span
                      className="mg-prio-dot"
                      style={{ background: PRIORITY_META[t.priority].color }}
                      title={PRIORITY_META[t.priority].label}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        {/* insight of the moment */}
        <Panel className="mg-dash-insight">
          <div className="mg-panel-head">
            <h3>
              <Icon name="brain" size={18} /> Insight
            </h3>
            <button className="mg-link" onClick={() => onNavigate('analytics')}>
              More <Icon name="chevron" size={14} />
            </button>
          </div>
          {insights[0] && (
            <div className={`mg-insight tone-${insights[0].tone}`}>
              <strong>{insights[0].title}</strong>
              <p>{insights[0].body}</p>
            </div>
          )}

          <div className="mg-habit-strip">
            <div className="mg-panel-head tight">
              <h4>
                <Icon name="fire" size={15} /> Habits today
              </h4>
              <button className="mg-link" onClick={() => onNavigate('habits')}>
                Edit
              </button>
            </div>
            {data.habits.length === 0 ? (
              <p className="mg-muted">No habits yet — build one in the Habits room.</p>
            ) : (
              <div className="mg-habit-chips">
                {data.habits.slice(0, 6).map((h) => {
                  const done = h.history.includes(tk)
                  return (
                    <button
                      key={h.id}
                      className={`mg-habit-chip ${done ? 'done' : ''}`}
                      onClick={() => toggleHabitToday(h.id)}
                      style={{ ['--mg-tag' as string]: h.color }}
                    >
                      <Icon name={done ? 'check' : h.icon} size={14} />
                      {h.title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* rooms */}
      <div className="mg-rooms">
        {[
          { v: 'goals', icon: 'target', label: 'Goals & Dreams', sub: `${data.goals.length} active` },
          { v: 'journal', icon: 'journal', label: 'Journal', sub: `${data.journal.length} entries` },
          { v: 'sanctuary', icon: 'vault', label: 'Sanctuary', sub: `${data.ideas.length} ideas` },
          { v: 'themes', icon: 'palette', label: 'Personalize', sub: `${data.unlockedThemes.length} themes` },
        ].map((r) => (
          <button key={r.v} className="mg-room" onClick={() => onNavigate(r.v as MagnetView)}>
            <span className="mg-room-icon">
              <Icon name={r.icon} size={22} />
            </span>
            <span className="mg-room-label">{r.label}</span>
            <span className="mg-room-sub">{r.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
