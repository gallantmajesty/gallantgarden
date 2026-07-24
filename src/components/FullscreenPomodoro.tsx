import { useEffect, useRef, useState, useCallback } from 'react'
import { usePomodoro, SESSION_OPTIONS, type TimerType, type PomoPhase } from '../store/pomodoro'
import { useWorld } from '../store/world'
import { useRealmNet, getRemotePlayers, type PublicPlayer } from '../multiplayer/net'
import { useSettings } from '../store/settings'
import { useProfile } from '../store/profile'
import { useAuth } from '../store/auth'
import { useDesk } from '../store/desk'
import { useMagnet } from '../store/magnet'
import { useAudio } from '../audio/useAudio'
import { ClockDisplay } from './clock/ClockDisplay'
import { useClockStore } from '../store/clock'
import { LibraryCalc } from '../calc/ui/LibraryCalc'
import { MusicPlayer } from './library/MusicPlayer'
import { PublicPlayerTag } from './PublicPlayerTag'
import './FullscreenPomodoro.css'

interface FullscreenPomodoroProps {
  isOpen: boolean
  onClose: () => void
}

export function FullscreenPomodoro({ isOpen, onClose }: FullscreenPomodoroProps) {
  const {
    phase,
    remaining,
    sessionMinutes,
    breakCount,
    timerType,
    running,
    subject,
    segmentIndex,
    segmentsCompleted,
    totalSessionLeaves,
    totalElapsed,
    pendingRewards,
    toggle,
    forfeit,
    setSubject,
  } = usePomodoro()

  const { user } = useAuth()
  const profile = useProfile((s) => s.data)
  const desk = useDesk()
  const magnet = useMagnet()
  const { set: setSetting } = useSettings()
  const { setWakeLock } = useWorld()
  const clockStore = useClockStore()
  const { activeClock, clockColor, showSeconds, animationSpeed, particleDensity } = clockStore

  const [showOccupants, setShowOccupants] = useState(true)
  const [showCalculator, setShowCalculator] = useState(true)
  const [showDesk, setShowDesk] = useState(true)
  const [showMusic, setShowMusic] = useState(true)
  const [clockSettingsOpen, setClockSettingsOpen] = useState(false)
  const [layout, setLayout] = useState<'left' | 'right'>('right')
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const wakeLockRef = useRef<{ release: () => void } | null>(null)
  const renderPausedRef = useRef(false)

  // Pause 3D rendering when fullscreen opens
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
    } catch (e) {
      console.warn('Wake lock failed:', e)
    }
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    setWakeLock(false)
  }

  // Re-acquire on visibility change
  useEffect(() => {
    if (!isOpen) return
    const onVis = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [isOpen])

  // Get occupants in same realm
  const roster = useRealmNet((s) => s.roster)
  const channel = useRealmNet((s) => s.channel)
  const realmPlayers = getRemotePlayers().filter(p => p.realmId === channel)

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
    : require('../store/pomodoro').computeSegments(sessionMinutes, breakCount)
    : [sessionMinutes]

  const currentSegment = segments[segmentIndex] || sessionMinutes
  const segmentProgress = segmentIndex < segments.length 
    ? ((currentSegment * 60 - remaining) / (currentSegment * 60)) * 100 
    : 100

  if (!isOpen) return null

  return (
    <div className="fullscreen-pomodoro" role="dialog" aria-modal="true" aria-label="Fullscreen Pomodoro">
      {/* Background magical atmosphere */}
      <div className="fp-bg">
        <div className="fp-bg-layer fp-bg-layer-1" />
        <div className="fp-bg-layer fp-bg-layer-2" />
        <div className="fp-bg-particles" />
      </div>

      {/* Top bar */}
      <header className="fp-header">
        <div className="fp-header-left">
          <button className="fp-btn fp-btn-icon" onClick={onClose} aria-label="Exit fullscreen">
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
              <polyline points="14,2 22,2 22,10" />
              <line x1="14" y1="2" x2="14" y2="8" />
            </svg>
          </button>
          <div className="fp-session-info">
            <span className="fp-session-type">{timerType === 'focus' ? 'Focus Mode' : 'Pomodoro Mode'}</span>
            <span className="fp-session-duration">{sessionMinutes}min • {breakCount} breaks</span>
          </div>
        </div>
        
        <div className="fp-header-center">
          {/* Main Clock Display */}
          <div className="fp-main-clock" style={{ '--clock-color': clockColor }}>
            <ClockDisplay
              type={activeClock}
              phase={phase}
              remaining={remaining}
              totalElapsed={totalElapsed}
              sessionMinutes={sessionMinutes}
              segmentProgress={segmentProgress}
              settings={{
                color: clockColor,
                showSeconds,
                animationSpeed,
                particleDensity,
              }}
            />
          </div>
        </div>

        <div className="fp-header-right">
          <button 
            className={`fp-btn fp-btn-icon ${clockSettingsOpen ? 'active' : ''}`}
            onClick={() => setClockSettingsOpen(!clockSettingsOpen)}
            aria-label="Clock settings"
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
            </svg>
          </button>
          <button 
            className={`fp-btn fp-btn-icon ${layout === 'left' ? 'active' : ''}`}
            onClick={() => setLayout(l => l === 'left' ? 'right' : 'left')}
            aria-label="Switch layout"
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
        </div>
      </header>

      {/* Clock Settings Panel */}
      {clockSettingsOpen && (
        <div className="fp-clock-settings-panel">
          <div className="fp-settings-header">
            <h3>Clock Styles</h3>
            <button className="fp-btn fp-btn-icon" onClick={() => setClockSettingsOpen(false)}>
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="fp-clock-grid">
            {require('./clock/ClockDisplay').CLOCK_THEMES.map(theme => (
              <button
                key={theme.id}
                className={`fp-clock-option ${clockStore.activeClock === theme.id ? 'active' : ''} ${!clockStore.isClockUnlocked(theme.id) ? 'locked' : ''}`}
                onClick={() => {
                  if (clockStore.isClockUnlocked(theme.id)) {
                    clockStore.setActiveClock(theme.id)
                  }
                }}
                disabled={!clockStore.isClockUnlocked(theme.id)}
              >
                <span className="fp-clock-preview">{theme.previewIcon}</span>
                <span className="fp-clock-name">{theme.name}</span>
                <span className="fp-clock-rarity">{theme.rarity}</span>
                {!clockStore.isClockUnlocked(theme.id) && theme.price && (
                  <span className="fp-clock-price">🍃 {theme.price}</span>
                )}
              </button>
            ))}
          </div>
          <div className="fp-clock-customize">
            <h4>Customize</h4>
            <div className="fp-customize-row">
              <label>
                <input 
                  type="color" 
                  value={clockColor} 
                  onChange={(e) => clockStore.setClockColor(e.target.value)} 
                />
                <span>Color</span>
              </label>
              <label>
                <input 
                  type="checkbox" 
                  checked={showSeconds} 
                  onChange={(e) => clockStore.setShowSeconds(e.target.checked)} 
                />
                <span>Show Seconds</span>
              </label>
            </div>
            <div className="fp-customize-row">
              <label>
                <span>Animation Speed: {animationSpeed.toFixed(1)}x</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3" 
                  step="0.1" 
                  value={animationSpeed} 
                  onChange={(e) => clockStore.setAnimationSpeed(Number(e.target.value))} 
                />
              </label>
              <label>
                <span>Particle Density: {particleDensity.toFixed(1)}x</span>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={particleDensity} 
                  onChange={(e) => clockStore.setParticleDensity(Number(e.target.value))} 
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="fp-main" data-layout={layout}>
        {/* Side Panel - Occupants, Calculator, Desk, Music */}
        <aside className="fp-side-panel">
          {/* Room Occupants */}
          {showOccupants && (
            <section className="fp-panel-section">
              <div className="fp-section-header">
                <h3><svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Students in Room</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowOccupants(false)}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12h2M23 12h-2M19.65 19.65l-1.41 1.41M4.35 4.35l1.41 1.41M1 6a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6z"/></svg>
                </button>
              </div>
              <div className="fp-occupants-list">
                {realmPlayers.length === 0 ? (
                  <p className="fp-empty">You're studying alone 📖</p>
                ) : (
                  realmPlayers.map(p => (
                    <div key={p.id} className="fp-occupant">
                      <PublicPlayerTag 
                        player={{ 
                          id: p.id, 
                          displayName: p.name, 
                          country: p.country, 
                          rank: p.rank,
                          timerStartedAt: p.timerStartedAt,
                          timerDurationMs: p.timerDurationMs,
                        }} 
                        self={p.id === user?.id}
                        showAll={true}
                      />
                      <div className="fp-occupant-status">
                        {p.id === user?.id ? 'You' : 'Focused'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Calculator */}
          {showCalculator && (
            <section className="fp-panel-section">
              <div className="fp-section-header">
                <h3><svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle'}}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="18"/><line x1="8" y1="18" x2="12" y2="18"/></svg> Calculator</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowCalculator(false)}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12h2M23 12h-2M19.65 19.65l-1.41 1.41M4.35 4.35l1.41 1.41M1 6a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6z"/></svg>
                </button>
              </div>
              <LibraryCalc />
            </section>
          )}

          {/* Study Desk */}
          {showDesk && (
            <section className="fp-panel-section">
              <div className="fp-section-header">
                <h3><svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle'}}><path d="M20 7h-4V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3H4a1 1 0 0 0-1 1v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zM10 4v3h4V4H10zM8 19H6V9h2v10zm10 0h-2V9h2v10zM8 8h8"/></svg> Study Desk</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowDesk(false)}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12h2M23 12h-2M19.65 19.65l-1.41 1.41M4.35 4.35l1.41 1.41M1 6a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6z"/></svg>
                </button>
              </div>
              <div className="fp-desk-content">
                <div className="fp-desk-subject">
                  <label>Subject:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What are you studying?"
                    maxLength={50}
                  />
                </div>
                <div className="fp-desk-progress">
                  <div className="fp-progress-bar">
                    <div 
                      className="fp-progress-fill" 
                      style={{ width: `${Math.min(progress, 100)}%` }} 
                    />
                  </div>
                  <span className="fp-progress-text">{Math.round(progress)}% complete</span>
                </div>
                <div className="fp-desk-stats">
                  <div className="fp-stat">
                    <span className="fp-stat-value">{formatFullTime(totalElapsed)}</span>
                    <span className="fp-stat-label">Studied</span>
                  </div>
                  <div className="fp-stat">
                    <span className="fp-stat-value">{segmentsCompleted}/{segments.length}</span>
                    <span className="fp-stat-label">Segments</span>
                  </div>
                  <div className="fp-stat">
                    <span className="fp-stat-value">🍃 {totalSessionLeaves}</span>
                    <span className="fp-stat-label">Earned</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Music Player */}
          {showMusic && (
            <section className="fp-panel-section fp-music-section">
              <div className="fp-section-header">
                <h3><svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle'}}><path d="M9 18V6l11 6.5-11 6.5zM18 19l3-3-3-3M6 19l-3-3 3-3"/></svg> Ambient Audio</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowMusic(false)}>
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12h2M23 12h-2M19.65 19.65l-1.41 1.41M4.35 4.35l1.41 1.41M1 6a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5V6z"/></svg>
                </button>
              </div>
              <MusicPlayer compact />
            </section>
          )}

          {/* Toggle visibility buttons for collapsed sections */}
          {!showOccupants && <button className="fp-restore-btn" onClick={() => setShowOccupants(true)}><svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Occupants</button>}
          {!showCalculator && <button className="fp-restore-btn" onClick={() => setShowCalculator(true)}><svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle', marginRight: '6px'}}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="11" x2="8" y2="11"/><line x1="12" y1="11" x2="12" y2="11"/><line x1="16" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="18"/><line x1="8" y1="18" x2="12" y2="18"/></svg> Calculator</button>}
          {!showDesk && <button className="fp-restore-btn" onClick={() => setShowDesk(true)}><svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M20 7h-4V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3H4a1 1 0 0 0-1 1v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zM10 4v3h4V4H10zM8 19H6V9h2v10zm10 0h-2V9h2v10zM8 8h8"/></svg> Desk</button>}
          {!showMusic && <button className="fp-restore-btn" onClick={() => setShowMusic(true)}><svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M9 18V6l11 6.5-11 6.5zM18 19l3-3-3-3M6 19l-3-3 3-3"/></svg> Music</button>}
        </aside>

        {/* Center - Timer Controls & Progress */}
        <div className="fp-center">
          {/* Segment indicators */}
          <div className="fp-segments">
            {segments.map((segMin, i) => (
              <div 
                key={i} 
                className={`fp-segment ${i === segmentIndex ? 'active' : ''} ${i < segmentsCompleted ? 'completed' : ''}`}
              >
                <div className="fp-segment-bar">
                  <div 
                    className="fp-segment-fill" 
                    style={{ width: `${i === segmentIndex ? segmentProgress : (i < segmentsCompleted ? 100 : 0)}%` }}
                  />
                </div>
                <span className="fp-segment-label">{segMin}min</span>
              </div>
            ))}
          </div>

          {/* Phase indicator */}
          <div className={`fp-phase-indicator fp-phase-${phase}`}>
            {phase === 'idle' && 'Ready to Focus'}
            {phase === 'running' && '🔮 Deep Focus'}
            {phase === 'break' && '☕ Break Time'}
            {phase === 'paused' && '⏸ Paused'}
            {phase === 'finished' && '✨ Session Complete!'}
          </div>

          {/* Main timer display (backup to clock) */}
          <div className="fp-timer-display">
            <span className="fp-time-remaining">{formatTime(remaining)}</span>
            <span className="fp-time-total">/ {formatTime(currentSegment * 60)}</span>
          </div>

          {/* Controls */}
          <div className="fp-controls">
            {phase === 'idle' ? (
              <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={toggle}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Start Session
              </button>
            ) : phase === 'running' ? (
              <>
                <button className="fp-btn fp-btn-secondary fp-btn-lg" onClick={toggle}>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> Pause
                </button>
                <button className="fp-btn fp-btn-danger fp-btn-lg" onClick={forfeit}>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg> Forfeit
                </button>
              </>
            ) : phase === 'break' ? (
              <>
                <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={toggle}>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M18 13.333v6.666H6v-6.666m12-4H6v-2h12v2z"/></svg> Skip Break
                </button>
                <button className="fp-btn fp-btn-secondary fp-btn-lg" onClick={toggle}>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> Pause Break
                </button>
              </>
            ) : phase === 'paused' ? (
              <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={toggle}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Resume
              </button>
            ) : phase === 'finished' ? (
              <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={forfeit}>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Complete
              </button>
            ) : null}
          </div>

          {/* Pending rewards */}
          {pendingRewards.length > 0 && (
            <div className="fp-rewards">
              <h4>🍃 Session Rewards</h4>
              <div className="fp-rewards-list">
                {pendingRewards.map(r => (
                  <div key={r.segmentIndex} className="fp-reward">
                    <span>Segment {r.segmentIndex + 1}: {r.minutes}min</span>
                    <span className="fp-reward-leaves">+{r.leaves} leaves</span>
                  </div>
                ))}
                <div className="fp-reward fp-reward-total">
                  <span>Total</span>
                  <span className="fp-reward-leaves">+{totalSessionLeaves} leaves</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}