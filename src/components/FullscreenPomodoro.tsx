import { useEffect, useRef, useState, useMemo } from 'react'
import { usePomodoro, SESSION_OPTIONS, computeSegments, type TimerType, type PomoPhase } from '../store/pomodoro'
import { useWorld } from '../store/world'
import { useRealmNet, getRemotePlayers } from '../multiplayer/net'
import { useSettings } from '../store/settings'
import { useProfile } from '../store/profile'
import { useAuth } from '../store/auth'
import { useDesk } from '../store/desk'
import { useMagnet } from '../store/magnet'
import { ClockDisplay } from './clock/ClockDisplay'
import { useClockStore, CLOCK_THEMES } from '../store/clock'
import { LibraryCalc } from '../calc/ui/LibraryCalc'
import { MusicPlayer } from './library/MusicPlayer'
import { PublicPlayerTag } from './PublicPlayerTag'
import './FullscreenPomodoro.css'

const QUOTES = [
  '"Discipline today, destiny tomorrow."',
  '"A little progress each day adds up to big results."',
  '"The secret of getting ahead is getting started."',
  '"Focus on being productive instead of busy."',
  '"Small steps every day lead to big changes."',
]

const DAILY_TASKS = [
  { text: 'Solve Mathematics Problems', minutes: 60, done: true },
  { text: 'Physics Revision', minutes: 45, done: true },
  { text: 'Read Chapter 5', minutes: 30, done: false },
  { text: 'Chemistry Notes', minutes: 45, done: true },
  { text: 'Mock Test', minutes: 60, done: false },
]

const STREAK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function loadStreak(): { count: number; lastDate: string; days: boolean[] } {
  try {
    const raw = localStorage.getItem('fp.streak.v2')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { count: 0, lastDate: '', days: [false, false, false, false, false, false, false] }
}

function saveStreak(data: { count: number; lastDate: string; days: boolean[] }) {
  localStorage.setItem('fp.streak.v2', JSON.stringify(data))
}

interface FullscreenPomodoroProps {
  isOpen: boolean
  onClose: () => void
}

export function FullscreenPomodoro({ isOpen, onClose }: FullscreenPomodoroProps) {
  const {
    phase, remaining, sessionMinutes, breakCount, timerType, running,
    subject, segmentIndex, segmentsCompleted, totalSessionLeaves,
    totalElapsed, pendingRewards, toggle, forfeit, setSubject,
  } = usePomodoro()

  const { user } = useAuth()
  const xp = useProfile((s) => s.xp)
  const displayName = useProfile((s) => s.displayName)
  const { set: setSetting } = useSettings()
  const { setWakeLock } = useWorld()
  const clockStore = useClockStore()
  const { activeClock, clockColor, showSeconds, animationSpeed, particleDensity } = clockStore

  const wakeLockRef = useRef<{ release: () => void } | null>(null)
  const renderPausedRef = useRef(false)
  const [activeNav, setActiveNav] = useState('focus')
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  const streak = useMemo(() => loadStreak(), [])
  const level = useMemo(() => Math.floor(Math.sqrt(xp / 50)) + 1, [xp])
  const xpInLevel = useMemo(() => {
    const c = Math.floor(Math.sqrt(xp / 50))
    return xp - c * c * 50
  }, [xp])
  const xpForNext = useMemo(() => {
    const c = Math.floor(Math.sqrt(xp / 50))
    return (c + 1) * (c + 1) * 50 - c * c * 50
  }, [xp])
  const questsDone = DAILY_TASKS.filter(t => t.done).length

  useEffect(() => {
    if (isOpen) {
      renderPausedRef.current = true
      useWorld.getState().setRenderPaused(true)
      requestWakeLock()
    } else {
      renderPausedRef.current = false
      useWorld.getState().setRenderPaused(false)
      releaseWakeLock()
    }
    return () => {
      renderPausedRef.current = false
      useWorld.getState().setRenderPaused(false)
      releaseWakeLock()
    }
  }, [isOpen])

  const requestWakeLock = async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => void }> } }
      if (nav.wakeLock) {
        wakeLockRef.current = await nav.wakeLock.request('screen')
        setWakeLock(true)
        wakeLockRef.current.addEventListener('release', () => setWakeLock(false))
      }
    } catch (e) { console.warn('Wake lock failed:', e) }
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    setWakeLock(false)
  }

  useEffect(() => {
    if (!isOpen) return
    const onVis = () => { if (document.visibilityState === 'visible') requestWakeLock() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [isOpen])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatFullTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = (totalElapsed / (sessionMinutes * 60)) * 100

  const segments = SESSION_OPTIONS.includes(sessionMinutes)
    ? sessionMinutes === 60 && breakCount === 0 ? [60]
    : computeSegments(sessionMinutes, breakCount)
    : [sessionMinutes]

  const currentSegment = segments[segmentIndex] || sessionMinutes
  const segmentProgress = segmentIndex < segments.length
    ? ((currentSegment * 60 - remaining) / (currentSegment * 60)) * 100
    : 100

  // SVG ring
  const ringSize = 320
  const ringStroke = 3
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - progress / 100)

  // Sun position on ring (based on progress)
  const sunAngle = (progress / 100) * 360 - 90
  const sunRad = (sunAngle * Math.PI) / 180
  const sunX = 50 + 46 * Math.cos(sunRad)
  const sunY = 50 + 46 * Math.sin(sunRad)

  if (!isOpen) return null

  return (
    <div className="fullscreen-pomodoro" role="dialog" aria-modal="true" aria-label="Fullscreen Focus Mode">
      <div className="fp-bg"><div className="fp-bg-glow" /></div>

      {/* ── Top Bar ── */}
      <header className="fp-topbar">
        <div className="fp-topbar-brand">
          <div className="fp-topbar-logo">🪷</div>
          <div>
            <div className="fp-topbar-title">Study Focus</div>
            <div className="fp-topbar-subtitle">Focus · Learn · Grow</div>
          </div>
        </div>
        <div className="fp-topbar-right">
          <div className="fp-topbar-stat">
            <span className="fp-topbar-stat-icon">🔥</span>
            <span>{streak.count}</span>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>day streak</span>
          </div>
          <div className="fp-topbar-stat">
            <span className="fp-topbar-stat-icon">💎</span>
            <span>{xp.toLocaleString()}</span>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>Magic Crystals</span>
          </div>
          <div className="fp-topbar-avatar">{(displayName || 'W')[0].toUpperCase()}</div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="fp-body">
        {/* Left Nav */}
        <nav className="fp-nav">
          {[
            { id: 'focus', icon: '🏠', label: 'Focus' },
            { id: 'tasks', icon: '☑️', label: 'Tasks' },
            { id: 'quests', icon: '📋', label: 'Quests' },
            { id: 'stats', icon: '📊', label: 'Stats' },
            { id: 'profile', icon: '👤', label: 'Profile' },
          ].map(item => (
            <button
              key={item.id}
              className={`fp-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="fp-nav-icon">{item.icon}</span>
              <span className="fp-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Center Timer */}
        <div className="fp-center">
          <div className="fp-quote">{quote}</div>

          <div className="fp-timer-ring-wrap">
            {/* SVG Ring */}
            <svg className="fp-timer-ring-svg" viewBox={`0 0 ${ringSize} ${ringSize}`}>
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a843" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <circle className="fp-timer-ring-track" cx={ringSize/2} cy={ringSize/2} r={ringRadius} />
              <circle
                className="fp-timer-ring-progress"
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
              {/* Progress dot */}
              <circle className="fp-timer-ring-dot" cx={ringSize/2 + ringRadius * Math.cos(sunRad)} cy={ringSize/2 + ringRadius * Math.sin(sunRad)} r={4} />
            </svg>

            {/* Sun on ring */}
            <span className="fp-timer-sun" style={{
              left: `${sunX}%`, top: `${sunY}%`,
              transform: 'translate(-50%, -50%)',
            }}>☀️</span>

            {/* Moon opposite */}
            <span className="fp-timer-moon" style={{
              left: `${50 - (sunX - 50)}%`, top: `${50 - (sunY - 50)}%`,
              transform: 'translate(-50%, -50%)',
            }}>🌙</span>

            {/* Timer content */}
            <div className="fp-timer-content">
              <div className="fp-timer-label">
                {phase === 'idle' && 'Ready to Focus'}
                {phase === 'running' && 'Focus Time'}
                {phase === 'break' && 'Break Time'}
                {phase === 'paused' && 'Paused'}
                {phase === 'finished' && 'Session Complete'}
              </div>
              <div className="fp-timer-time">{formatTime(remaining)}</div>
              <div className="fp-timer-total">
                <span className="fp-timer-total-icon">✏️</span>
                {formatTime(currentSegment * 60)}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="fp-controls">
            {phase === 'idle' ? (
              <button className="fp-btn-lg fp-btn-primary" onClick={toggle}>
                ▶ Start Focus
              </button>
            ) : phase === 'running' ? (
              <>
                <button className="fp-btn-lg fp-btn-secondary" onClick={toggle}>
                  ❚❚ Pause Focus
                </button>
                <button className="fp-btn-lg fp-btn-danger" onClick={forfeit}>
                  ✕ End Session
                </button>
              </>
            ) : phase === 'break' ? (
              <>
                <button className="fp-btn-lg fp-btn-primary" onClick={toggle}>
                  ▶ Skip Break
                </button>
                <button className="fp-btn-lg fp-btn-secondary" onClick={toggle}>
                  ❚❚ Pause
                </button>
              </>
            ) : phase === 'paused' ? (
              <button className="fp-btn-lg fp-btn-primary" onClick={toggle}>
                ▶ Resume
              </button>
            ) : phase === 'finished' ? (
              <button className="fp-btn-lg fp-btn-primary" onClick={forfeit}>
                ✓ Complete
              </button>
            ) : null}
          </div>

          {/* Quick actions */}
          <div className="fp-quick-actions">
            <button className={`fp-quick-btn ${activeClock === 'analog' ? 'active' : ''}`} onClick={() => clockStore.setActiveClock('analog')}>
              🕐 Analog Clock
            </button>
            <button className={`fp-quick-btn ${activeClock === 'sand' ? 'active' : ''}`} onClick={() => clockStore.setActiveClock('sand')}>
              ⏳ Desert Glass
            </button>
            <button className="fp-quick-btn" onClick={() => {}}>
              🎵 White Noise
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <aside className="fp-panel">
          {/* Today's Tasks */}
          <div className="fp-card">
            <div className="fp-card-header">
              <div className="fp-card-title">
                <span className="fp-card-title-icon">📋</span>
                Today's Tasks
              </div>
              <div className="fp-card-badge">→ {questsDone} / {DAILY_TASKS.length}</div>
            </div>
            <div className="fp-task-list">
              {DAILY_TASKS.map((task, i) => (
                <div key={i} className="fp-task">
                  <div className={`fp-task-check ${task.done ? 'done' : ''}`}>
                    {task.done ? '✓' : ''}
                  </div>
                  <span className={`fp-task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
                  <span className="fp-task-time">{task.minutes} min</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Quest */}
          <div className="fp-card">
            <div className="fp-card-header">
              <div className="fp-card-title">
                <span className="fp-card-title-icon">⭐</span>
                Daily Quest
              </div>
            </div>
            <div className="fp-quest-progress">
              <span>Complete 3 Focus Sessions</span>
              <span style={{ fontWeight: 700 }}>{Math.min(segmentsCompleted, 3)} / 3</span>
            </div>
            <div className="fp-quest-bar">
              <div className="fp-quest-fill" style={{ width: `${Math.min((segmentsCompleted / 3) * 100, 100)}%` }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="fp-quest-xp">
                <span className="fp-quest-xp-icon">💎</span>
                +50 XP
              </div>
              <span className="fp-quest-reward">🎁</span>
            </div>
          </div>

          {/* Daily Streak */}
          <div className="fp-card">
            <div className="fp-card-header">
              <div className="fp-card-title">
                <span className="fp-card-title-icon">🔥</span>
                Daily Streak
              </div>
            </div>
            <div className="fp-streak-number">{streak.count}</div>
            <div className="fp-streak-days">days</div>
            <div className="fp-streak-calendar">
              {STREAK_DAYS.map((day, i) => (
                <div key={i} className="fp-streak-day">
                  <div className={`fp-streak-dot ${streak.days[i] ? 'done' : ''} ${i === new Date().getDay() - 1 ? 'today' : ''}`}>
                    {streak.days[i] ? '✓' : ''}
                  </div>
                  <span className="fp-streak-label">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="fp-bottom">
        <div className="fp-player-card">
          <div className="fp-player-avatar">🧙</div>
          <div className="fp-player-info">
            <div className="fp-player-level">Lv. {level}</div>
            <div className="fp-player-name">{displayName || 'Apprentice Scholar'}</div>
            <div className="fp-player-xp-bar">
              <div className="fp-player-xp-fill" style={{ width: `${(xpInLevel / xpForNext) * 100}%` }} />
            </div>
            <div className="fp-player-xp-text">{xpInLevel.toLocaleString()} / {xpForNext.toLocaleString()} XP</div>
          </div>
          <div className="fp-player-rank">Apprentice Scholar</div>
        </div>

        <div className="fp-bottom-quote">
          <span className="fp-bottom-quote-icon">🧪</span>
          {quote}
          <span className="fp-bottom-quote-pen">🪶</span>
        </div>
      </div>
    </div>
  )
}
