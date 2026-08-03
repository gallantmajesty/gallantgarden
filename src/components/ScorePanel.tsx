import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getDailyEngagement, DAILY_CAPS } from '../lib/xpEngine'
import { rankForLifetime, RANKS } from '../lib/ranks'
import { useMagnet } from '../store/magnet'
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

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

function getTodayRecord(history: DayRecord[]): DayRecord | undefined {
  const tk = todayKey()
  return history.find((r) => r.date === tk)
}

export function ScorePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const [history, setHistory] = useState<DayRecord[]>([])
  const [tab, setTab] = useState<'grid' | 'summary'>('grid')

  useEffect(() => {
    const stored = loadHistory()
    if (stored.length === 0) {
      const now = new Date()
      const entries: DayRecord[] = []
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        entries.push({
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          login: false,
          activeMin: 0,
          earned: 0,
          lost: 0,
          net: 0,
          rankId: 'bronze-1',
        })
      }
      saveHistory(entries)
      setHistory(entries)
    } else {
      setHistory(stored)
    }
  }, [])

  const engagement = getDailyEngagement()

  const todayRecord = useMemo(() => getTodayRecord(history), [history])

  const totalEarned = useMemo(() => history.reduce((s, r) => s + r.earned, 0), [history])
  const totalLost = useMemo(() => history.reduce((s, r) => s + r.lost, 0), [history])
  const totalNet = useMemo(() => totalEarned - totalLost, [totalEarned, totalLost])
  const currentStreak = useMemo(() => {
    let streak = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].login) streak++
      else break
    }
    return streak
  }, [history])
  const bestStreak = useMemo(() => {
    let best = 0
    let current = 0
    for (const r of history) {
      if (r.login) { current++; best = Math.max(best, current) }
      else current = 0
    }
    return best
  }, [history])
  const avgActiveMin = useMemo(() => {
    const days = history.filter((r) => r.login)
    if (days.length === 0) return 0
    return Math.round(days.reduce((s, r) => s + r.activeMin, 0) / days.length)
  }, [history])
  const maxDailyEarned = useMemo(() => Math.max(...history.map((r) => r.earned), 0), [history])
  const penaltyDays = useMemo(() => history.filter((r) => r.lost > 0).length, [history])
  const capDays = useMemo(() => history.filter((r) => r.activeMin >= DAILY_CAPS.activeMinCap).length, [history])

  const maxBar = useMemo(() => {
    const m = Math.max(...history.map((r) => r.earned), 1)
    return m
  }, [history])

  const loginToday = () => {
    const tk = todayKey()
    let rec = todayRecord
    if (!rec) {
      rec = { date: tk, login: true, activeMin: engagement.activeMinToday, earned: 0, lost: 0, net: 0,     rankId: rankForLifetime(data.rankXp, data.xp, data.premiumXp).id }
      setHistory((prev) => {
        const next = [...prev, rec!].slice(-DAYS)
        saveHistory(next)
        return next
      })
    } else if (!rec.login) {
      rec = { ...rec, login: true }
      setHistory((prev) => {
        const next = prev.map((r) => (r.date === tk ? rec! : r)).slice(-DAYS)
        saveHistory(next)
        return next
      })
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()}`
  }

  const getRankName = (rankId: string) => {
    const rank = RANKS.find((r) => r.id === rankId)
    return rank?.name || 'Bronze I'
  }

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-panel water-glass" onClick={(e) => e.stopPropagation()}>
        <div className="sp-header">
          <h2>⚔️ Focus Score</h2>
          <span className="sp-subtitle">30-Day Activity Analytics</span>
          <button className="sp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sp-summary">
          <div className="sp-stat">
            <span className="sp-stat-val">{currentStreak}</span>
            <span className="sp-stat-label">Day Streak</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-val">{bestStreak}</span>
            <span className="sp-stat-label">Best Streak</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-val">{totalEarned.toLocaleString()}</span>
            <span className="sp-stat-label">Earned (leaves)</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-val" style={{ color: '#e25b4b' }}>{totalLost.toLocaleString()}</span>
            <span className="sp-stat-label">Lost (leaves)</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-val" style={{ color: totalNet >= 0 ? '#46d6a0' : '#e25b4b' }}>{totalNet >= 0 ? '+' : ''}{totalNet}</span>
            <span className="sp-stat-label">Net</span>
          </div>
        </div>

        <div className="sp-tabs">
          <button className={`sp-tab ${tab === 'grid' ? 'active' : ''}`} onClick={() => setTab('grid')}>
            Day Grid
          </button>
          <button className={`sp-tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
            Summary
          </button>
        </div>

        {tab === 'grid' && (
          <div className="sp-grid">
            <div className="sp-grid-header">
              <span>Date</span>
              <span>Active</span>
              <span>Earned</span>
              <span>Lost</span>
              <span>Net</span>
              <span>Rank</span>
            </div>
            {history.slice().reverse().map((r) => (
              <div key={r.date} className={`sp-row ${r.login ? 'day-active' : 'day-inactive'} ${r.date === todayKey() ? 'day-today' : ''}`}>
                <span className="sp-date">{formatDate(r.date)}</span>
                <span className="sp-active">
                  {r.login && `${r.activeMin}m`}
                  {!r.login && '—'}
                </span>
                <span className="sp-earned" style={{ color: r.earned > 0 ? '#46d6a0' : '#555' }}>
                  {r.earned > 0 ? `+${r.earned}` : '0'}
                </span>
                <span className="sp-lost" style={{ color: r.lost > 0 ? '#e25b4b' : '#555' }}>
                  {r.lost > 0 ? `-${r.lost}` : '0'}
                </span>
                <span className="sp-net" style={{ color: r.net > 0 ? '#46d6a0' : r.net < 0 ? '#e25b4b' : '#555' }}>
                  {r.net > 0 ? '+' : ''}{r.net}
                </span>
                <span className="sp-rank" style={{ color: RANKS.find((rk) => rk.id === r.rankId)?.accent }}>
                  {getRankName(r.rankId)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'summary' && (
          <div className="sp-summary-detail">
            <div className="sp-s-card">
              <h3>📊 Daily Active Minutes</h3>
              <div className="sp-bar-chart">
                {history.slice(-30).map((r) => {
                  const pct = Math.min(100, (r.activeMin / DAILY_CAPS.activeMinCap) * 100)
                  return (
                    <div key={r.date} className="sp-bar-wrap">
                      <div className="sp-bar" style={{ height: `${pct}%`, background: r.activeMin >= DAILY_CAPS.activeMinCap ? '#e25b4b' : r.login ? '#46d6a0' : '#333' }} />
                      <span className="sp-bar-label">{new Date(r.date + 'T00:00:00').getDate()}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="sp-s-card">
              <h3>💰 Points Flow</h3>
              <div className="sp-flow">
                <div className="sp-flow-row"><span>Total Earned</span><span style={{ color: '#46d6a0' }}>+{totalEarned.toLocaleString()}</span></div>
                <div className="sp-flow-row"><span>Total Lost</span><span style={{ color: '#e25b4b' }}>-{totalLost.toLocaleString()}</span></div>
                <div className="sp-flow-row"><span>Penalty Days</span><span>{penaltyDays}</span></div>
                <div className="sp-flow-row"><span>Cap Days (20m+)</span><span>{capDays}</span></div>
                <div className="sp-flow-row"><span>Avg Active/Day</span><span>{avgActiveMin}m</span></div>
                <div className="sp-flow-row"><span>Max Daily Earned</span><span>+{maxDailyEarned}</span></div>
                <div className="sp-flow-row sp-flow-total"><span>Net Points</span><span style={{ color: totalNet >= 0 ? '#46d6a0' : '#e25b4b' }}>{totalNet >= 0 ? '+' : ''}{totalNet.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="sp-s-card">
              <h3>🏅 Rank Progress</h3>
              <div className="sp-rank-progress">
                {RANKS.map((r) => {
                  const hit = history.some((d) => d.rankId === r.id)
                  return (
                    <div key={r.id} className="sp-rank-item">
                      <span className="sp-rank-dot" style={{ background: hit ? r.accent : '#333' }} />
                      <span className="sp-rank-name" style={{ color: hit ? r.accent : '#666' }}>{r.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="sp-s-card">
              <h3>⚙️ Daily Limits</h3>
              <div className="sp-flow">
                <div className="sp-flow-row"><span>Active Cap</span><span>{DAILY_CAPS.activeMinCap} min/day</span></div>
                <div className="sp-flow-row"><span>Inactivity Threshold</span><span>1 hour</span></div>
                <div className="sp-flow-row"><span>Inactivity Penalty</span><span style={{ color: '#e25b4b' }}>-{Math.abs(15)} leaves</span></div>
                <div className="sp-flow-row"><span>Today Active</span><span>{engagement.activeMinToday}m / {DAILY_CAPS.activeMinCap}m</span></div>
              </div>
            </div>
          </div>
        )}

        <button className="sf-btn water sp-close-btn" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}