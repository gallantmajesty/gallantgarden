import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getDailyEngagement, DAILY_CAPS } from '../lib/xpEngine'
import { usePomodoro } from '../store/pomodoro'
import './ScorePanel.css'

interface DayRecord {
  date: string
  login: boolean
  activeMin: number
  earned: number
  lost: number
  net: number
  rankId: string
}

const STORAGE_KEY = 'sf.score.history'
const DAYS = 30

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Readable short date for a session-history ISO string ("Aug 15, 2026"). */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function loadHistory(): DayRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DayRecord[]
  } catch { return [] }
}

function saveHistory(history: DayRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-DAYS)))
  } catch { /* ignore */ }
}

type TabKey = 'overview' | 'library' | 'web' | 'breaks'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'library', label: 'Library' },
  { key: 'web', label: 'Web & Online' },
  { key: 'breaks', label: 'Breaks' },
]

// ── small presentational helpers ──────────────────────────────────────────
function Stat({ value, label, tone }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className="sp-stat">
      <span className="sp-stat-val" style={tone ? { color: tone } : undefined}>{value}</span>
      <span className="sp-stat-label">{label}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="sp-section-title">{children}</h3>
}

function TrendBars({ data, unit, color }: { data: { label: string; value: number }[]; unit: string; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="sp-trend">
      {data.map((d, i) => (
        <div className="sp-trend-col" key={i} title={`${d.label}: ${d.value}${unit}`}>
          <div className="sp-trend-bar" style={{ height: `${(d.value / max) * 100}%`, background: color }} />
          <span className="sp-trend-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Exact, human-readable duration — never collapses minutes to hours alone.
// Focus sessions are stored at minute precision, so this is the true value.
function fmtDuration(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function defaultBreakMin(breakCount: number, custom: Record<number, number>): number {
  let total = 0
  for (let i = 0; i < breakCount; i++) {
    total += custom[i] ?? ((i + 1) % 4 === 0 ? 15 : 5)
  }
  return total
}

export function ScorePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const pomoHistory = usePomodoro((s) => s.history)
  const [tab, setTab] = useState<TabKey>('overview')

  const engagement = getDailyEngagement()

  // ── 30-day grid built from REAL data: pomodoro sessions grouped by day, plus
  //    today's live engagement and any recorded penalty losses. The stored
  //    sf.score.history is kept as a mirror (owner tab) and as the source of
  //    legacy per-day "lost" values.
  const history = useMemo<DayRecord[]>(() => {
    const stored = loadHistory()
    const storedByDate = new Map(stored.map((r) => [r.date, r]))
    const now = new Date()
    const tk = todayKey()
    const byDay = new Map<string, { min: number; earned: number; count: number }>()
    for (const h of pomoHistory) {
      const day = h.date.slice(0, 10)
      const g = byDay.get(day) ?? { min: 0, earned: 0, count: 0 }
      g.min += h.totalFocusMinutes
      g.earned += h.leavesEarned ?? 0
      g.count += 1
      byDay.set(day, g)
    }
    const rows: DayRecord[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const g = byDay.get(date)
      const prev = storedByDate.get(date)
      const isToday = date === tk
      const sessionMin = g?.min ?? 0
      const earned = g?.earned ?? 0
      let lost = prev?.lost ?? 0
      if (isToday) lost += engagement.penaltyLostToday ?? 0
      rows.push({
        date,
        login: isToday || (g?.count ?? 0) > 0,
        activeMin: isToday ? Math.max(sessionMin, engagement.activeMinToday) : sessionMin,
        earned,
        lost,
        net: earned - lost,
        rankId: prev?.rankId ?? 'bronze-1',
      })
    }
    return rows
  }, [pomoHistory, engagement.activeMinToday, engagement.penaltyLostToday])

  // Mirror the derived grid so the owner tab (sf.score.history) sees real data.
  useEffect(() => {
    saveHistory(history)
  }, [history])

  // ── Overview aggregates ────────────────────────────────────────────────
  const totalEarned = useMemo(() => history.reduce((s, r) => s + r.earned, 0), [history])
  const totalLost = useMemo(() => history.reduce((s, r) => s + r.lost, 0), [history])
  const totalNet = useMemo(() => totalEarned - totalLost, [totalEarned, totalLost])
  // Streaks from REAL session dates across the full pomodoro history (not the
  // 30-day grid, so a streak older than 30 days isn't truncated). Consecutive
  // days with at least one focus session count — same logic as the pomodoro
  // summary's streak.
  const { currentStreak, bestStreak } = useMemo(() => {
    const days = [...new Set(pomoHistory.map((h) => {
      const d = new Date(h.date)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }))].sort((a, b) => a - b)
    let best = 0
    let cur = 0
    let prev: number | null = null
    for (const t of days) {
      cur = prev !== null && t - prev === 86400000 ? cur + 1 : 1
      best = Math.max(best, cur)
      prev = t
    }
    return { currentStreak: cur, bestStreak: best }
  }, [pomoHistory])
  const totalActiveMin = useMemo(() => history.reduce((s, r) => s + r.activeMin, 0), [history])
  const activeDays = useMemo(() => history.filter((r) => r.login && r.activeMin > 0).length, [history])

  // ── Pomodoro / Breaks aggregates ───────────────────────────────────────
  const pomo = useMemo(() => {
    let totalFocus = 0
    let sessions = 0
    let completed = 0
    let breaks = 0
    let breakMin = 0
    const byType: Record<string, number> = { focus: 0, pomodoro: 0, tabata: 0 }
    for (const h of pomoHistory) {
      sessions++
      totalFocus += h.totalFocusMinutes
      if (h.completed) completed++
      byType[h.timerType] = (byType[h.timerType] ?? 0) + 1
      breaks += h.breakCount
      breakMin += defaultBreakMin(h.breakCount, h.breakDurations)
    }
    return { totalFocus, sessions, completed, breaks, breakMin, byType }
  }, [pomoHistory])

  const avgBreak = pomo.breaks > 0 ? Math.round(pomo.breakMin / pomo.breaks) : 0

  // ── 30-day active-minute trend (drives Web & Online + Overview) ────────
  const trend = useMemo(
    () =>
      history
        .slice()
        .reverse()
        .map((r) => ({ label: new Date(r.date + 'T00:00:00').getDate().toString(), value: r.activeMin })),
    [history],
  )



  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal water-glass" onClick={(e) => e.stopPropagation()}>
        <header className="sp-top">
          <div>
            <h2>⚔️ Focus Score</h2>
            <p className="sp-subtitle">Cross-module study analytics</p>
          </div>
          <button className="sp-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <nav className="sp-tabs">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              className={`sp-tab ${tab === tb.key ? 'active' : ''}`}
              onClick={() => setTab(tb.key)}
            >
              {tb.label}
            </button>
          ))}
        </nav>

        <div className="sp-body">
          {tab === 'overview' && (
            <div className="sp-pane">
              <div className="sp-summary">
                <Stat value={currentStreak} label="Day Streak" />
                <Stat value={bestStreak} label="Best Streak" />
                <Stat value={fmtDuration(totalActiveMin)} label="Active Time (30d)" />
                <Stat value={activeDays} label="Active Days" />
                <Stat value={totalEarned.toLocaleString()} label="Earned (leaves)" />
                <Stat value={totalLost.toLocaleString()} label="Lost (leaves)" tone="#e25b4b" />
                <Stat value={`${totalNet >= 0 ? '+' : ''}${totalNet}`} label="Net" tone={totalNet >= 0 ? '#46d6a0' : '#e25b4b'} />
                <Stat value={fmtDuration(engagement.totalFocusMin)} label="Focus Today" />
              </div>

              <SectionTitle>Module Highlights</SectionTitle>
              <div className="sp-module-grid">
                <button className="sp-module-card" onClick={() => setTab('breaks')}>
                  <span className="sp-module-name">Focus & Breaks</span>
                  <span className="sp-module-metric">{pomo.sessions} sessions · {fmtDuration(pomo.totalFocus)}</span>
                  <span className="sp-module-sub">{pomo.breaks} breaks · {pomo.breakMin}m</span>
                </button>
                <button className="sp-module-card" onClick={() => setTab('web')}>
                  <span className="sp-module-name">Web & Online</span>
                  <span className="sp-module-metric">{fmtDuration(totalActiveMin)} / 30d</span>
                  <span className="sp-module-sub">{engagement.activeMinToday}m active today</span>
                </button>
                <button className="sp-module-card" onClick={() => setTab('library')}>
                  <span className="sp-module-name">Library</span>
                  <span className="sp-module-metric">{engagement.focusSessionCount} sessions today</span>
                  <span className="sp-module-sub">{engagement.totalFocusMin}m focus today</span>
                </button>
              </div>

              <SectionTitle>Active Time — last 30 days</SectionTitle>
              <TrendBars data={trend} unit="m" color="#46d6a0" />
            </div>
          )}

          {tab === 'library' && (
            <div className="sp-pane">
              <div className="sp-summary">
                <Stat value={`${engagement.totalFocusMin}m`} label="Focus Today" />
                <Stat value={engagement.focusSessionCount} label="Focus Sessions" />
                <Stat value={engagement.modesUsed} label="Modes Used" />
                <Stat value={`${engagement.activeMinToday}/${engagement.activeMinCap}m`} label="Active Cap" />
              </div>

              <SectionTitle>Today&apos;s library focus</SectionTitle>
              <p className="sp-note">
                Library focus is tracked live per session. Long-term per-module history begins
                from today — open the Library and study to build your trend.
              </p>
              <div className="sp-kv">
                <div><span>Total focus minutes (today)</span><b>{engagement.totalFocusMin}m</b></div>
                <div><span>Focus sessions (today)</span><b>{engagement.focusSessionCount}</b></div>
                <div><span>Active minutes (today)</span><b>{engagement.activeMinToday}m</b></div>
                <div><span>Modes exercised</span><b>{engagement.modesUsed}</b></div>
              </div>

              <SectionTitle>Active time — last 30 days</SectionTitle>
              <TrendBars data={trend} unit="m" color="#7c9cff" />
            </div>
          )}

          {tab === 'web' && (
            <div className="sp-pane">
              <div className="sp-summary">
                <Stat value={fmtDuration(totalActiveMin)} label="Online Time (30d)" />
                <Stat value={`${engagement.activeMinToday}m`} label="Active Today" />
                <Stat value={activeDays} label="Active Days" />
                <Stat value={`${DAILY_CAPS.activeMinCap}m`} label="Daily Cap" />
              </div>

              <SectionTitle>Online & active time — last 30 days</SectionTitle>
              <TrendBars data={trend} unit="m" color="#46d6a0" />

              <p className="sp-note">
                Online time reflects days the app was open and earning activity. Days with no
                recorded session show 0m.
              </p>
            </div>
          )}

          {tab === 'breaks' && (
            <div className="sp-pane">
              <div className="sp-summary">
                <Stat value={pomo.breaks} label="Total Breaks" />
                <Stat value={fmtDuration(pomo.breakMin)} label="Break Time" />
                <Stat value={`${avgBreak}m`} label="Avg Break" />
                <Stat value={pomo.sessions} label="Sessions" />
              </div>

              <SectionTitle>Sessions by type</SectionTitle>
              <div className="sp-kv">
                <div><span>Focus</span><b>{pomo.byType.focus ?? 0}</b></div>
                <div><span>Pomodoro</span><b>{pomo.byType.pomodoro ?? 0}</b></div>
                <div><span>Tabata</span><b>{pomo.byType.tabata ?? 0}</b></div>
                <div><span>Completed</span><b>{pomo.completed}</b></div>
              </div>

              <SectionTitle>Recent sessions</SectionTitle>
              <div className="sp-session-list">
                {pomoHistory.slice(0, 12).map((h) => (
                  <div key={h.id} className="sp-session-row">
                    <span className="sp-session-date">{formatDate(h.date)}</span>
                    <span className="sp-session-type">{h.timerType}</span>
                    <span className="sp-session-focus">{fmtDuration(h.totalFocusMinutes)}</span>
                    <span className="sp-session-breaks">{h.breakCount} breaks</span>
                    <span className="sp-session-subject">{h.subject || '—'}</span>
                  </div>
                ))}
                {pomoHistory.length === 0 && <p className="sp-note">No focus sessions recorded yet.</p>}
              </div>
            </div>
          )}
        </div>

        <button className="sf-btn water sp-close-btn" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
