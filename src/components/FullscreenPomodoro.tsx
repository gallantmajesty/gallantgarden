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

const HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'] as const
type House = typeof HOUSES[number]

const HOUSE_EMOJI: Record<House, string> = {
  gryffindor: '🦁',
  slytherin: '🐍',
  ravenclaw: '🦅',
  hufflepuff: '🦡',
}

const RUNE_CHARS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛊ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ']

function getStreakKey() {
  const d = new Date()
  return `fp.streak.${d.getFullYear()}.${d.getMonth()}`
}

function getDailyKey() {
  return `fp.daily.${new Date().toISOString().slice(0, 10)}`
}

function loadStreak(): { count: number; lastDate: string } {
  try {
    const raw = localStorage.getItem('fp.streak')
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '' }
  } catch { return { count: 0, lastDate: '' } }
}

function saveStreak(count: number) {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem('fp.streak', JSON.stringify({ count, lastDate: today }))
}

function loadDaily(): number {
  try {
    return Number(localStorage.getItem(getDailyKey()) || '0')
  } catch { return 0 }
}

function saveDaily(min: number) {
  localStorage.setItem(getDailyKey(), String(min))
}

function loadHouse(): House {
  try { return (localStorage.getItem('fp.house') as House) || 'gryffindor' }
  catch { return 'gryffindor' }
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
  const profile = useProfile((s) => s.data)
  const xp = useProfile((s) => s.xp)
  const displayName = useProfile((s) => s.displayName)
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

  const wakeLockRef = useRef<{ release: () => void } | null>(null)
  const renderPausedRef = useRef(false)

  const house = useMemo(() => loadHouse(), [])
  const streak = useMemo(() => loadStreak(), [])
  const dailyMin = useMemo(() => loadDaily(), [])
  const level = useMemo(() => Math.floor(Math.sqrt(xp / 50)) + 1, [xp])
  const xpInLevel = useMemo(() => {
    const current = Math.floor(Math.sqrt(xp / 50))
    const prev = current * current * 50
    return xp - prev
  }, [xp])
  const xpForNext = useMemo(() => {
    const current = Math.floor(Math.sqrt(xp / 50))
    return (current + 1) * (current + 1) * 50 - current * current * 50
  }, [xp])

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

  // Track daily study time
  useEffect(() => {
    if (phase === 'running') {
      const interval = setInterval(() => saveDaily(loadDaily() + 1), 60000)
      return () => clearInterval(interval)
    }
  }, [phase])

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
    : computeSegments(sessionMinutes, breakCount)
    : [sessionMinutes]

  const currentSegment = segments[segmentIndex] || sessionMinutes
  const segmentProgress = segmentIndex < segments.length
    ? ((currentSegment * 60 - remaining) / (currentSegment * 60)) * 100
    : 100

  if (!isOpen) return null

  return (
    <div className="fullscreen-pomodoro" role="dialog" aria-modal="true" aria-label="Fullscreen Focus Mode">
      {/* ── Magical Background ── */}
      <div className="fp-bg">
        <div className="fp-bg-layer fp-bg-layer-1" />
        <div className="fp-bg-layer fp-bg-layer-2" />
        {/* Floating candles */}
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={`candle-${i}`} className="fp-candle" />
        ))}
        {/* Floating particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`particle-${i}`} className="fp-particle" />
        ))}
      </div>

      {/* ── Header ── */}
      <header className="fp-header">
        <div className="fp-header-left">
          <button className="fp-btn fp-btn-icon fp-tooltip" data-tip="Exit Focus Mode" onClick={onClose} aria-label="Exit fullscreen">
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
              <polyline points="14,2 22,2 22,10" />
              <line x1="14" y1="2" x2="14" y2="8" />
            </svg>
          </button>
          <div className="fp-session-info">
            <span className="fp-session-type">
              {timerType === 'focus' ? '⚗️ Focus Mode' : '📖 Pomodoro'}
            </span>
            <span className="fp-session-duration">{sessionMinutes}min · {breakCount} breaks</span>
          </div>
        </div>

        <div className="fp-header-center">
          <div className="fp-main-clock" style={{ '--clock-color': clockColor } as React.CSSProperties}>
            <ClockDisplay
              type={activeClock}
              phase={phase}
              remaining={remaining}
              totalElapsed={totalElapsed}
              sessionMinutes={sessionMinutes}
              segmentProgress={segmentProgress}
              settings={{ color: clockColor, showSeconds, animationSpeed, particleDensity }}
            />
          </div>
        </div>

        <div className="fp-header-right">
          <div className={`fp-hud-house ${house}`}>
            {HOUSE_EMOJI[house]} {house}
          </div>
          <button
            className={`fp-btn fp-btn-icon fp-tooltip ${clockSettingsOpen ? 'active' : ''}`}
            data-tip="Clock Settings"
            onClick={() => setClockSettingsOpen(!clockSettingsOpen)}
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
            </svg>
          </button>
          <button
            className={`fp-btn fp-btn-icon fp-tooltip`}
            data-tip="Switch Panel Side"
            onClick={() => setLayout(l => l === 'left' ? 'right' : 'left')}
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Clock Settings Panel ── */}
      {clockSettingsOpen && (
        <div className="fp-clock-settings-panel">
          <div className="fp-settings-header">
            <h3>✨ Clock Style</h3>
            <button className="fp-btn fp-btn-icon" onClick={() => setClockSettingsOpen(false)}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="fp-clock-grid">
            {CLOCK_THEMES.map(theme => (
              <button
                key={theme.id}
                className={`fp-clock-option ${clockStore.activeClock === theme.id ? 'active' : ''} ${!clockStore.isClockUnlocked(theme.id) ? 'locked' : ''}`}
                onClick={() => { if (clockStore.isClockUnlocked(theme.id)) clockStore.setActiveClock(theme.id) }}
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
                <input type="color" value={clockColor} onChange={(e) => clockStore.setClockColor(e.target.value)} />
                <span>Color</span>
              </label>
              <label>
                <input type="checkbox" checked={showSeconds} onChange={(e) => clockStore.setShowSeconds(e.target.checked)} />
                <span>Seconds</span>
              </label>
            </div>
            <div className="fp-customize-row">
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '10px' }}>Speed: {animationSpeed.toFixed(1)}x</span>
                <input type="range" min="0.1" max="3" step="0.1" value={animationSpeed}
                  onChange={(e) => clockStore.setAnimationSpeed(Number(e.target.value))} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '10px' }}>Particles: {particleDensity.toFixed(1)}x</span>
                <input type="range" min="0" max="2" step="0.1" value={particleDensity}
                  onChange={(e) => clockStore.setParticleDensity(Number(e.target.value))} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="fp-main" data-layout={layout}>
        {/* Side Panel */}
        <aside className="fp-side-panel">
          {/* Students */}
          {showOccupants && (
            <section className="fp-panel-section">
              <div className="fp-section-header">
                <h3>👥 Scholars</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowOccupants(false)}>×</button>
              </div>
              <div className="fp-occupants-list">
                {realmPlayers.length === 0 ? (
                  <p className="fp-empty">Studying alone in the library…</p>
                ) : (
                  realmPlayers.map(p => (
                    <div key={p.id} className="fp-occupant">
                      <PublicPlayerTag
                        player={{
                          id: p.id, displayName: p.name, country: p.country,
                          rank: p.rank, timerStartedAt: p.timerStartedAt, timerDurationMs: p.timerDurationMs,
                        }}
                        self={p.id === user?.id}
                        showAll={true}
                      />
                      <span className="fp-occupant-status">{p.id === user?.id ? 'You' : 'Focused'}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Study Desk */}
          {showDesk && (
            <section className="fp-panel-section">
              <div className="fp-section-header">
                <h3>📚 Study Desk</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowDesk(false)}>×</button>
              </div>
              <div className="fp-desk-content">
                <div className="fp-desk-subject">
                  <label>Subject</label>
                  <input
                    type="text" value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What are you studying?"
                    maxLength={50}
                  />
                </div>
                <div className="fp-desk-progress">
                  <div className="fp-progress-bar">
                    <div className="fp-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
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
                    <span className="fp-stat-label">Spells</span>
                  </div>
                  <div className="fp-stat">
                    <span className="fp-stat-value">🍃 {totalSessionLeaves}</span>
                    <span className="fp-stat-label">Earned</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Calculator */}
          {showCalculator && (
            <section className="fp-panel-section">
              <div className="fp-section-header">
                <h3>🔢 Calculator</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowCalculator(false)}>×</button>
              </div>
              <LibraryCalc />
            </section>
          )}

          {/* Music */}
          {showMusic && (
            <section className="fp-panel-section fp-music-section">
              <div className="fp-section-header">
                <h3>🎵 Ambient</h3>
                <button className="fp-btn fp-btn-sm" onClick={() => setShowMusic(false)}>×</button>
              </div>
              <MusicPlayer compact />
            </section>
          )}

          {/* Restore buttons */}
          {!showOccupants && <button className="fp-restore-btn" onClick={() => setShowOccupants(true)}>👥 Scholars</button>}
          {!showDesk && <button className="fp-restore-btn" onClick={() => setShowDesk(true)}>📚 Desk</button>}
          {!showCalculator && <button className="fp-restore-btn" onClick={() => setShowCalculator(true)}>🔢 Calc</button>}
          {!showMusic && <button className="fp-restore-btn" onClick={() => setShowMusic(true)}>🎵 Music</button>}
        </aside>

        {/* Center — Timer */}
        <div className="fp-center">
          {/* Segments */}
          <div className="fp-segments">
            {segments.map((segMin, i) => (
              <div key={i} className={`fp-segment ${i === segmentIndex ? 'active' : ''} ${i < segmentsCompleted ? 'completed' : ''}`}>
                <div className="fp-segment-bar">
                  <div className="fp-segment-fill"
                    style={{ width: `${i === segmentIndex ? segmentProgress : (i < segmentsCompleted ? 100 : 0)}%` }} />
                </div>
                <span className="fp-segment-label">{segMin}min</span>
              </div>
            ))}
          </div>

          {/* Phase */}
          <div className={`fp-phase-indicator fp-phase-${phase}`}>
            {phase === 'idle' && 'READY YOUR WAND'}
            {phase === 'running' && '⚗️ DEEP FOCUS'}
            {phase === 'break' && '☕ RESTORATION'}
            {phase === 'paused' && '⏸ SPELL PAUSED'}
            {phase === 'finished' && '✨ SPELL COMPLETE'}
          </div>

          {/* Timer with spell ring */}
          <div className="fp-timer-display">
            <div className="fp-spell-ring">
              {RUNE_CHARS.slice(0, 12).map((rune, i) => (
                <span key={i} className="fp-rune" style={{
                  top: `${50 + 46 * Math.sin((i * 30 * Math.PI) / 180)}%`,
                  left: `${50 + 46 * Math.cos((i * 30 * Math.PI) / 180)}%`,
                  transform: 'translate(-50%, -50%)',
                }}>{rune}</span>
              ))}
            </div>
            <span className="fp-time-remaining">{formatTime(remaining)}</span>
            <span className="fp-time-total">/ {formatTime(currentSegment * 60)}</span>
          </div>

          {/* Controls */}
          <div className="fp-controls">
            {phase === 'idle' ? (
              <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={toggle}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Begin Study
              </button>
            ) : phase === 'running' ? (
              <>
                <button className="fp-btn fp-btn-secondary fp-btn-lg" onClick={toggle}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                  Pause Spell
                </button>
                <button className="fp-btn fp-btn-danger fp-btn-lg" onClick={forfeit}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  Dispel
                </button>
              </>
            ) : phase === 'break' ? (
              <>
                <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={toggle}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Skip Rest
                </button>
                <button className="fp-btn fp-btn-secondary fp-btn-lg" onClick={toggle}>
                  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                  Pause
                </button>
              </>
            ) : phase === 'paused' ? (
              <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={toggle}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Resume
              </button>
            ) : phase === 'finished' ? (
              <button className="fp-btn fp-btn-primary fp-btn-lg" onClick={forfeit}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                Collect Rewards
              </button>
            ) : null}
          </div>

          {/* Rewards */}
          {pendingRewards.length > 0 && (
            <div className="fp-rewards">
              <h4>🏆 Session Loot</h4>
              <div className="fp-rewards-list">
                {pendingRewards.map(r => (
                  <div key={r.segmentIndex} className="fp-reward">
                    <span>Scroll {r.segmentIndex + 1}: {r.minutes}min</span>
                    <span className="fp-reward-leaves">+{r.leaves} 🍃</span>
                  </div>
                ))}
                <div className="fp-reward fp-reward-total">
                  <span>Total Loot</span>
                  <span className="fp-reward-leaves">+{totalSessionLeaves} 🍃</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Bottom HUD Bar (Genshin-style) ── */}
      <div className="fp-hud">
        <div className="fp-hud-left">
          <div className="fp-hud-player">
            <div className="fp-hud-avatar">{(displayName || 'W')[0].toUpperCase()}</div>
            <div>
              <div className="fp-hud-name">{displayName || 'Wizard'}</div>
              <div className="fp-hud-level">Level {level}</div>
            </div>
          </div>
          <div className="fp-hud-xp">
            <div className="fp-hud-xp-bar">
              <div className="fp-hud-xp-fill" style={{ width: `${(xpInLevel / xpForNext) * 100}%` }} />
            </div>
            <span className="fp-hud-xp-text">{xpInLevel}/{xpForNext} XP</span>
          </div>
        </div>

        <div className="fp-hud-center">
          <div className="fp-hud-streak">
            <span className="fp-hud-streak-flame">🔥</span>
            <span>{streak.count} day streak</span>
          </div>
        </div>

        <div className="fp-hud-right">
          <div className="fp-hud-quest">
            <span className="fp-hud-quest-label">Daily:</span>
            <span className="fp-hud-quest-progress">{Math.min(dailyMin, 120)}/120 min</span>
          </div>
          <div className="fp-hud-leaves">
            🍃 {xp.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
