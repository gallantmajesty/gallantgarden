import { useEffect, useRef, useState, useMemo } from 'react'
import { usePomodoro, SESSION_OPTIONS, computeSegments } from '../store/pomodoro'
import { useWorld } from '../store/world'
import { useProfile } from '../store/profile'
import { useMagnet } from '../store/magnet'
import { levelProgress } from '../lib/magnet/types'
import './FullscreenPomodoro.css'

const QUOTES = [
  '"Discipline today, destiny tomorrow."',
  '"A little progress each day adds up to big results."',
  '"The secret of getting ahead is getting started."',
  '"Focus on being productive instead of busy."',
  '"Small steps every day lead to big changes."',
]

interface FullscreenPomodoroProps {
  isOpen: boolean
  onClose: () => void
}

export function FullscreenPomodoro({ isOpen, onClose }: FullscreenPomodoroProps) {
  const {
    phase, remaining, sessionMinutes, breakCount,
    subject, segmentIndex, segmentsCompleted,
    totalElapsed, toggle, forfeit, setSubject, configure,
  } = usePomodoro()

  const xp = useProfile((s) => s.xp)
  const displayName = useProfile((s) => s.displayName)
  const { setWakeLock } = useWorld()
  const tasks = useMagnet((s) => s.data.tasks)
  const toggleTask = useMagnet((s) => s.toggleTask)

  const wakeLockRef = useRef<{ release: () => void } | null>(null)
  const renderPausedRef = useRef(false)
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const activeTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks])
  const doneTasks = useMemo(() => tasks.filter((t) => t.done), [tasks])

  const lp = useMemo(() => levelProgress(xp), [xp])

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
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
  const ringSize = 380
  const ringStroke = 4
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - progress / 100)

  const sunAngle = (progress / 100) * 360 - 90
  const sunRad = (sunAngle * Math.PI) / 180
  const sunX = 50 + 47 * Math.cos(sunRad)
  const sunY = 50 + 47 * Math.sin(sunRad)

  const selectTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    setSelectedTaskId(taskId)
    setSubject(task.subject || task.title)
    if (phase === 'idle' && task.estimateMin > 0) {
      configure('focus', task.estimateMin, 0)
    }
  }

  const startWithTask = (taskId: string) => {
    selectTask(taskId)
    if (phase === 'idle') toggle()
  }

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
            <span className="fp-topbar-stat-icon">💎</span>
            <span>{xp.toLocaleString()}</span>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>Magic Crystals</span>
          </div>
          <div className="fp-topbar-avatar">{(displayName || 'W')[0].toUpperCase()}</div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="fp-body">
        {/* Center Timer */}
        <div className="fp-center">
          <div className="fp-quote">{quote}</div>

          <div className="fp-timer-ring-wrap">
            <svg className="fp-timer-ring-svg" viewBox={`0 0 ${ringSize} ${ringSize}`}>
              <defs>
                <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a843" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
                <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="sun-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Track */}
              <circle className="fp-timer-ring-track" cx={ringSize/2} cy={ringSize/2} r={ringRadius} />
              {/* Glow behind progress */}
              <circle
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                fill="none"
                stroke="url(#timer-gradient)"
                strokeWidth={ringStroke + 8}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                opacity={0.15}
                strokeLinecap="round"
              />
              {/* Main progress */}
              <circle
                className="fp-timer-ring-progress"
                cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                filter="url(#ring-glow)"
              />
              {/* Progress dot with glow */}
              <circle
                cx={ringSize/2 + ringRadius * Math.cos(sunRad)}
                cy={ringSize/2 + ringRadius * Math.sin(sunRad)}
                r={5}
                fill="#f59e0b"
                filter="url(#sun-glow)"
              />
            </svg>

            <span className="fp-timer-sun" style={{
              left: `${sunX}%`, top: `${sunY}%`,
              transform: 'translate(-50%, -50%)',
            }}>☀️</span>

            <span className="fp-timer-moon" style={{
              left: `${50 - (sunX - 50)}%`, top: `${50 - (sunY - 50)}%`,
              transform: 'translate(-50%, -50%)',
            }}>🌙</span>

            <div className="fp-timer-content">
              <div className="fp-timer-label">
                {phase === 'idle' && 'Ready to Focus'}
                {phase === 'running' && 'Focus Time'}
                {phase === 'break' && 'Break Time'}
                {phase === 'paused' && 'Paused'}
                {phase === 'finished' && 'Session Complete'}
              </div>
              <div className="fp-timer-time">{formatTime(remaining)}</div>
              {subject && (
                <div className="fp-timer-subject">
                  <span className="fp-timer-subject-dot" />
                  {subject}
                </div>
              )}
              <div className="fp-timer-total">
                {formatTime(currentSegment * 60)}
              </div>
            </div>
          </div>

          <div className="fp-controls">
            {phase === 'idle' ? (
              <button className="fp-btn-lg fp-btn-primary" onClick={toggle}>
                ▶ Start Focus
              </button>
            ) : phase === 'running' ? (
              <>
                <button className="fp-btn-lg fp-btn-secondary" onClick={toggle}>
                  ❚❚ Pause
                </button>
                <button className="fp-btn-lg fp-btn-danger" onClick={forfeit}>
                  ✕ End
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
        </div>

        {/* Right Panel */}
        <aside className="fp-panel">
          {/* Tasks from Task Magnet */}
          <div className="fp-card">
            <div className="fp-card-header">
              <div className="fp-card-title">
                <span className="fp-card-title-icon">📋</span>
                My Tasks
              </div>
              <div className="fp-card-badge">{activeTasks.length} active</div>
            </div>
            {activeTasks.length === 0 ? (
              <div className="fp-empty-state">
                <span className="fp-empty-icon">📝</span>
                <span>No tasks yet. Add tasks in Task Magnet.</span>
              </div>
            ) : (
              <div className="fp-task-list">
                {activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`fp-task ${selectedTaskId === task.id ? 'selected' : ''}`}
                    onClick={() => selectTask(task.id)}
                  >
                    <div
                      className={`fp-task-check ${task.done ? 'done' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleTask(task.id) }}
                    >
                      {task.done ? '✓' : ''}
                    </div>
                    <div className="fp-task-info">
                      <span className="fp-task-text">{task.title}</span>
                      {task.subject && <span className="fp-task-subject">{task.subject}</span>}
                    </div>
                    {task.estimateMin > 0 && (
                      <span className="fp-task-time">{task.estimateMin}m</span>
                    )}
                    {selectedTaskId === task.id && phase === 'idle' && (
                      <button
                        className="fp-task-start"
                        onClick={(e) => { e.stopPropagation(); startWithTask(task.id) }}
                      >
                        ▶
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          {doneTasks.length > 0 && (
            <div className="fp-card">
              <div className="fp-card-header">
                <div className="fp-card-title">
                  <span className="fp-card-title-icon">✅</span>
                  Done
                </div>
                <div className="fp-card-badge">{doneTasks.length}</div>
              </div>
              <div className="fp-task-list">
                {doneTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="fp-task done">
                    <div className="fp-task-check done">✓</div>
                    <span className="fp-task-text done">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coming Soon: Daily Quest */}
          <div className="fp-card fp-card-coming-soon">
            <div className="fp-card-header">
              <div className="fp-card-title">
                <span className="fp-card-title-icon">⭐</span>
                Daily Quest
              </div>
            </div>
            <div className="fp-coming-soon">
              <span className="fp-coming-soon-icon">🚧</span>
              <span>Coming Soon</span>
            </div>
          </div>

          {/* Coming Soon: Daily Streak */}
          <div className="fp-card fp-card-coming-soon">
            <div className="fp-card-header">
              <div className="fp-card-title">
                <span className="fp-card-title-icon">🔥</span>
                Daily Streak
              </div>
            </div>
            <div className="fp-coming-soon">
              <span className="fp-coming-soon-icon">🚧</span>
              <span>Coming Soon</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="fp-bottom">
        <div className="fp-player-card">
          <div className="fp-player-avatar">🧙</div>
          <div className="fp-player-info">
            <div className="fp-player-level">Lv. {lp.level}</div>
            <div className="fp-player-name">{displayName || 'Apprentice Scholar'}</div>
            <div className="fp-player-xp-bar">
              <div className="fp-player-xp-fill" style={{ width: `${lp.pct * 100}%` }} />
            </div>
            <div className="fp-player-xp-text">{lp.into.toLocaleString()} / {lp.span.toLocaleString()} XP</div>
          </div>
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
