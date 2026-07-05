import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PngIcon } from '../../components/PngIcon'
import { usePomodoro } from '../../store/pomodoro'
import { Notifications } from '../../games/break/Notifications'
import { useBreakIntegration } from '../../games/break/BreakIntegration'
import './Games.css'

export function Games() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const checkBreak = useBreakIntegration((s) => s.checkBreak)
  const breakTimeRemaining = useBreakIntegration((s) => s.breakTimeRemaining)
  const [pomoMode, setPomoMode] = useState(usePomodoro.getState().mode)

  useEffect(() => {
    const unsub = usePomodoro.subscribe((s) => {
      setPomoMode(s.mode)
      checkBreak()
    })
    return () => unsub()
  }, [])

  const isOnBreak = pomoMode === 'break' || pomoMode === 'long'
  const breakMin = Math.floor(breakTimeRemaining / 60)
  const breakSec = breakTimeRemaining % 60

  const games = [
    {
      key: 'lavaPad',
      name: t('games.lavaPad.name'),
      description: t('games.lavaPad.description'),
      multiplayer: t('games.lavaPad.multiplayer'),
      availableDuringBreaks: t('games.lavaPad.availableDuringBreaks'),
      playLabel: t('games.lavaPad.play'),
      route: '/games/lava-pad',
      iconName: 'game-controller' as const,
      locked: false,
    },
  ]

  return (
    <div className="games-root">
      <Notifications />
      <header className="games-header">
        <span className="sf-pill">{t('games.title')}</span>
        <h1>{t('games.title')}</h1>
        <p className="games-subtitle">{t('games.subtitle')}</p>
      </header>

      <main className="games-main">
        {/* Break status bar */}
        {isOnBreak && (
          <div className="games-break-bar water-glass">
            <span className="games-break-label">{t('games.lobby.breakRemaining')}</span>
            <span className={`games-break-time ${breakTimeRemaining <= 30 ? 'warning' : ''}`}>
              {breakMin}:{breakSec.toString().padStart(2, '0')}
            </span>
          </div>
        )}

        <div className="games-grid">
          {games.map((game) => (
            <button
              key={game.key}
              className={`game-card water-glass ${game.locked ? 'locked' : ''}`}
              onClick={() => {
                if (game.locked) return
                if (game.route) navigate(game.route)
              }}
            >
              <div className="game-card-artwork">
                {game.locked && (
                  <div className="game-card-lock-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                )}
                <PngIcon name={game.iconName} size={96} alt={game.name} />
              </div>
              <div className="game-card-content">
                <div className="game-card-badges">
                  <span className="game-badge multiplayer">{game.multiplayer}</span>
                  <span className="game-badge breaks">{game.availableDuringBreaks}</span>
                </div>
                <h2 className="game-card-title">{game.name}</h2>
                <p className="game-card-desc">{game.description}</p>
                {game.locked ? (
                  <div className="game-card-locked-message">
                    <span>{t('games.lock.hint')}</span>
                  </div>
                ) : (
                  <div className="sf-btn game-card-play" onClick={() => game.route && navigate(game.route)}>
                    <span className="game-play-icon">▶</span>
                    {game.playLabel}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="games-coming-soon">
          <p>{t('common.comingSoon')}</p>
          <span>More mini-games are in development</span>
        </div>
      </main>

      <style>{`
        .games-break-bar {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 12px 20px; border-radius: 16px; margin-bottom: 20px;
          width: 100%; max-width: 480px; margin-left: auto; margin-right: auto;
        }
        .games-break-label {
          font-size: 13px; color: var(--ink-soft);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .games-break-time {
          font-size: 20px; font-weight: 700; color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .games-break-time.warning { color: #e25b4b; }
        .game-card.locked {
          opacity: 0.6; cursor: default;
        }
        .game-card.locked:hover {
          transform: none; box-shadow: var(--glass-shadow);
        }
        .game-card-artwork {
          position: relative;
        }
        .game-card-lock-overlay {
          position: absolute; inset: 0; z-index: 2;
          display: grid; place-items: center;
          background: rgba(0,0,0,0.3);
          border-radius: 999px; color: white; opacity: 0.8;
        }
        .game-card-locked-message {
          font-size: 12px; color: var(--ink-soft);
          padding: 8px 0; text-align: center;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
