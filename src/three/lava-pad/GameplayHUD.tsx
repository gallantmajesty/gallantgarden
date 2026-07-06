// 🎮 LavaPad Gameplay HUD — Redesigned to match target design exactly
import { useLavaPadStore } from './store'
import { usePlayerStore } from './playerStore'
import { Pause, Coins } from 'lucide-react'

interface GameplayHUDProps {
  onPause: () => void
  onJump: () => void
}

export function GameplayHUD({ onPause, onJump }: GameplayHUDProps) {
  const timeElapsed = useLavaPadStore((s) => s.timeElapsed)
  const sessionCoins = usePlayerStore((s) => s.sessionCoins)
  const lavaY = useLavaPadStore((s) => s.lavaY)

  const minutes = Math.floor(timeElapsed / 60)
  const seconds = Math.floor(timeElapsed % 60)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Lava warning level (0-1)
  const lavaLevel = Math.min(1, Math.max(0, (lavaY + 10) / 18))
  const lavaWarning = lavaLevel > 0.4
  const lavaDanger = lavaLevel > 0.7

  return (
    <div className="gameplay-hud">
      {/* Top Bar */}
      <div className="hud-top">
        {/* Timer — center-left */}
        <div className={`hud-timer ${lavaWarning ? 'warning' : ''} ${lavaDanger ? 'danger' : ''}`}>
          <span className="timer-icon">⏱</span>
          <span className="timer-value">{timeStr}</span>
        </div>

        {/* Coins — center */}
        <div className="hud-coins">
          <Coins size={20} className="coin-icon" />
          <span className="coin-value">{sessionCoins}</span>
        </div>

        {/* Pause — top-right */}
        <button className="hud-pause" onClick={onPause} aria-label="Pause game">
          <Pause size={24} />
        </button>
      </div>

      {/* Mobile Controls */}
      <div className="mobile-controls">
        {/* Joystick — left */}
        <div className="joystick-container">
          <div className="joystick-base">
            <div className="joystick-stick" />
          </div>
        </div>

        {/* Jump Button — right */}
        <button
          className="jump-button"
          onPointerDown={onJump}
          onPointerUp={() => {}}
          aria-label="Jump"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Lava Level Indicator */}
      <div className={`lava-indicator ${lavaWarning ? 'warning' : ''} ${lavaDanger ? 'danger' : ''}`}>
        <div className="lava-bar" style={{ width: `${lavaLevel * 100}%` }} />
      </div>
    </div>
  )
}
