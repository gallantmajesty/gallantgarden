// Lava Pad UI — polished overlay with countdown, HUD, elimination, results, spectator

import { useEffect, useCallback, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from './sessionStore'
import { useLavaPadStore } from './store'
import { useBreakIntegration } from '../../games/break/BreakIntegration'

export function LavaPadUI() {
const { t } = useTranslation()
const navigate = useNavigate()

  const phase = useLavaPadStore((s) => s.phase)
  const countdown = useLavaPadStore((s) => s.countdown)
  const timeElapsed = useLavaPadStore((s) => s.timeElapsed)
  const survivors = useLavaPadStore((s) => s.survivors)
  const winnerId = useLavaPadStore((s) => s.winnerId)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const results = useLavaPadStore((s) => s.results)
  const jumpState = useLavaPadStore((s) => s.jumpState)
  const disconnected = useLavaPadStore((s) => s.disconnected)
  const disconnectedPlayerName = useLavaPadStore((s) => s.disconnectedPlayerName)
  const players = useLavaPadStore((s) => s.players)
  const lavaY = useLavaPadStore((s) => s.lavaY)

  // Derived values (computed on each render but based on stable dependencies)
  const totalPlayers = useMemo(() => Object.keys(players).length, [players])
  const localPlayerEliminated = useMemo(() => {
    if (!localPlayerId) return false
    return players[localPlayerId]?.eliminated ?? false
  }, [players, localPlayerId])
  const localPlayerSpectating = useMemo(() => {
    if (!localPlayerId) return false
    return players[localPlayerId]?.spectating ?? false
  }, [players, localPlayerId])
  const spectateTargetName = useMemo(() => {
    if (!localPlayerId) return null
    const targetId = players[localPlayerId]?.spectateTargetId
    return targetId ? (players[targetId]?.name ?? null) : null
  }, [players, localPlayerId])
  const winnerName = useMemo(() => {
    if (!winnerId) return null
    return players[winnerId]?.name ?? null
  }, [players, winnerId])
  const localPlayerWon = useMemo(() => {
    return winnerId !== null && winnerId === localPlayerId
  }, [winnerId, localPlayerId])
  const resultsPlayerData = useMemo(() => {
    if (!results) return []
    return results.eliminationOrder
      .map((id: string) => {
        const p = players[id]
        return p ? { id, name: p.name, survivalTime: p.survivalTime } : null
      })
      .filter(Boolean)
  }, [results, players])

  // Break timer from pomodoro integration
  const breakTimeRemaining = useBreakIntegration((s) => s.breakTimeRemaining)
  const breakMin = Math.floor(breakTimeRemaining / 60)
  const breakSec = breakTimeRemaining % 60
  const breakStr = `${breakMin}:${breakSec.toString().padStart(2, '0')}`

  const isBreakEnding = breakTimeRemaining <= 30

  const minutes = Math.floor(timeElapsed / 60)
  const seconds = Math.floor(timeElapsed % 60)
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const [countdownAnim, setCountdownAnim] = useState<'enter' | 'active' | 'exit'>('enter')
  const [showLegend, setShowLegend] = useState(false)

  const lavaLevel = Math.min(1, Math.max(0, (lavaY + 10) / 18))
  const lavaWarning = lavaLevel > 0.4
  const lavaDanger = lavaLevel > 0.7

  // Session schedule HUD
  const sessionStarted = useSessionStore((s) => s.started)
  const sessionFinished = useSessionStore((s) => s.finished)
  const lavaActive = useSessionStore((s) => s.lavaActive)
  const segmentLabel = useSessionStore((s) => s.currentSegmentLabel)
  const breakRemaining = useSessionStore((s) => s.breakRemaining)
  const matchRemaining = useSessionStore((s) => s.matchRemaining)
  const onBreak = sessionStarted && !sessionFinished && !lavaActive && breakRemaining > 0

useEffect(() => {
  if (phase !== 'countdown') return
  setCountdownAnim('active')
  const t = setTimeout(() => setCountdownAnim('exit'), 700)
  return () => clearTimeout(t)
}, [phase])

  const toggleLegend = useCallback(() => setShowLegend((v) => !v), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') toggleLegend()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleLegend])

  const getPlacementLabel = (placement: number): string => {
    if (placement === 1) return '1st'
    if (placement === 2) return '2nd'
    if (placement === 3) return '3rd'
    return `${placement}th`
  }

  return (
    <div className="lava-pad-ui-overlay" role="region" aria-label={t('games.lavaPad.gameArea')}>
      {/* Loading state */}
      {phase === 'waiting' && (
        <div className="lava-pad-loading" role="status" aria-label={t('games.lavaPad.connecting')}>
          <div className="lava-pad-loading-spinner" aria-hidden="true" />
          <span>{t('games.lavaPad.connecting')}</span>
        </div>
      )}

      {/* Players joining state */}
      {phase === 'playersJoining' && (
        <div className="lava-pad-loading" role="status" aria-label={t('games.lavaPad.waiting')}>
          <div className="lava-pad-loading-spinner" aria-hidden="true" />
          <span>{t('games.lavaPad.waiting')}</span>
        </div>
      )}

      {/* Countdown with ring pulse */}
      {phase === 'countdown' && countdown > 0 && (
        <div
          className={`lava-pad-countdown lava-pad-countdown--${countdownAnim}`}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="lava-pad-countdown-ring" aria-hidden="true" />
          <span className="lava-pad-countdown-number" key={countdown}>{countdown}</span>
          <span className="lava-pad-countdown-label">{t('games.lavaPad.getReady')}</span>
        </div>
      )}
      {phase === 'countdown' && countdown === 0 && (
        <div className="lava-pad-countdown lava-pad-countdown--exit">
          <div className="lava-pad-go-burst" aria-hidden="true" />
          <span className="lava-pad-go-text">GO!</span>
        </div>
      )}

      {/* Playing phase label */}
      {phase === 'playing' && jumpState === 'idle' && (
        <div className="lava-pad-hint" aria-hidden="true">{t('games.lavaPad.howToPlay')}</div>
      )}

      {/* Session schedule banner */}
      {phase === 'playing' && sessionStarted && !sessionFinished && (
        <div className={`lava-pad-session-banner ${onBreak ? 'on-break' : ''}`}>
          <span className="lava-pad-session-label">
            {onBreak ? 'Break' : segmentLabel || 'Game'}
          </span>
          {onBreak ? (
            <span className="lava-pad-session-time">
              Break ends in {Math.ceil(breakRemaining)}s
            </span>
          ) : (
            <span className="lava-pad-session-time">
              {Math.floor(matchRemaining / 60)}:{(Math.floor(matchRemaining) % 60).toString().padStart(2, '0')} left
            </span>
          )}
          {onBreak && (
            <span className="lava-pad-session-info">Lava paused — rest and breathe.</span>
          )}
        </div>
      )}

      {/* HUD */}
      {(phase === 'playing' || phase === 'countdown') && (
        <div className="lava-pad-hud" role="status" aria-label={t('games.lavaPad.gameStatus')}>
          <div className="lava-pad-hud-item" aria-label={t('games.lavaPad.survivors')}>
            <span className="lava-pad-hud-label">{t('games.lavaPad.survivors')}</span>
            <span className="lava-pad-hud-value" aria-live="polite">{survivors}/{totalPlayers}</span>
          </div>
          <div className="lava-pad-hud-item" aria-label={t('games.lavaPad.timeElapsed')}>
            <span className="lava-pad-hud-label">{t('games.lavaPad.time')}</span>
            <span className="lava-pad-hud-value">{timeStr}</span>
          </div>
          <div className={`lava-pad-hud-item ${isBreakEnding ? 'warning' : ''}`} aria-label={t('games.lobby.breakRemaining')}>
            <span className="lava-pad-hud-label">{t('games.lobby.breakRemaining')}</span>
            <span className="lava-pad-hud-value" aria-live="polite">{breakStr}</span>
          </div>
          <div
            className={`lava-pad-hud-item lava-pad-lava-indicator ${lavaDanger ? 'danger' : lavaWarning ? 'warning' : ''}`}
            aria-label="Lava level indicator"
          >
            <span className="lava-pad-hud-label">LAVA</span>
            <div className="lava-pad-lava-bar" role="progressbar" aria-valuenow={Math.round(lavaLevel * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="lava-pad-lava-fill" style={{ width: `${lavaLevel * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Elimination flash overlay */}
      {localPlayerEliminated && phase === 'playing' && (
        <div className="lava-pad-flash-overlay" aria-hidden="true" />
      )}

      {/* Elimination notification */}
      {localPlayerEliminated && phase === 'playing' && (
        <div className="lava-pad-eliminated" role="alert" aria-live="assertive">
          <div className="lava-pad-eliminated-icon" aria-hidden="true">!</div>
          <span>{t('games.lavaPad.eliminated')}</span>
          <span className="lava-pad-eliminated-sub">
            {t('games.lavaPad.spectating')}
          </span>
        </div>
      )}

      {/* Spectator info */}
      {localPlayerSpectating && phase === 'playing' && spectateTargetName && (
        <div className="lava-pad-spectator-info" role="status" aria-label={t('games.lavaPad.watching')}>
          <span className="lava-pad-spectator-label">
            {t('games.lavaPad.watching')}
          </span>
          <span className="lava-pad-spectator-name">{spectateTargetName}</span>
        </div>
      )}

      {/* Disconnect notification */}
      {disconnected && disconnectedPlayerName && (
        <div className="lava-pad-disconnect" role="status" aria-live="polite">
          {disconnectedPlayerName} disconnected
        </div>
      )}

      {/* Results screen */}
      {phase === 'results' && results && (
        <div className="lava-pad-results" role="dialog" aria-label={t('games.lavaPad.matchResults')}>
          <div className="lava-pad-results-content water-glass">
            <div className="lava-pad-results-header">
              <span className="lava-pad-results-kicker">
                {t('games.lavaPad.matchOver')}
              </span>
              <h2>
                {localPlayerWon
                  ? t('games.lavaPad.youWon')
                  : winnerName
                    ? `${winnerName} ${t('games.lavaPad.won')}`
                    : t('games.lavaPad.draw')}
              </h2>
            </div>

            <div className="lava-pad-results-stats" role="list" aria-label={t('games.lavaPad.matchStats')}>
              <div className="lava-pad-results-stat" role="listitem">
                <span className="lava-pad-results-stat-value">
                  {getPlacementLabel(results.placement)}
                </span>
                <span className="lava-pad-results-stat-label">
                  {t('games.lavaPad.placement')}
                </span>
              </div>
              <div className="lava-pad-results-stat" role="listitem">
                <span className="lava-pad-results-stat-value">
                  {results.matchDuration.toFixed(0)}s
                </span>
                <span className="lava-pad-results-stat-label">
                  {t('games.lavaPad.duration')}
                </span>
              </div>
              <div className="lava-pad-results-stat" role="listitem">
                <span className="lava-pad-results-stat-value">
                  {results.totalPlayers}
                </span>
                <span className="lava-pad-results-stat-label">
                  {t('games.lavaPad.players')}
                </span>
              </div>
            </div>

            <div className="lava-pad-results-players" role="list" aria-label={t('games.lavaPad.placementOrder')}>
              {resultsPlayerData.map((pData, i) => {
                if (!pData) return null
                const pos = results!.eliminationOrder.length - i
                return (
                  <div
                    key={pData.id}
                    className={`lava-pad-results-player ${pos === 1 ? 'winner' : ''} ${pData.id === localPlayerId ? 'self' : ''}`}
                    role="listitem"
                  >
                    <span className="lava-pad-results-pos">{getPlacementLabel(pos)}</span>
                    <span className="lava-pad-results-name">{pData.name}</span>
                    <span className="lava-pad-results-time">
                      {i === results!.eliminationOrder.length - 1
                        ? t('games.lavaPad.survived')
                        : `${pData.survivalTime.toFixed(0)}s`}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="lava-pad-results-actions">
              <button
                className="sf-btn"
                onClick={() => { window.location.reload() }}
                aria-label={t('games.lavaPad.playAgain')}
              >
                {t('games.lavaPad.playAgain')}
              </button>
              <button
                className="sf-btn secondary"
                onClick={() => navigate('/games')}
                aria-label={t('games.lavaPad.backToGames')}
              >
                {t('games.lavaPad.backToGames')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit button during game */}
      {phase === 'playing' && (
        <button
          className="lava-pad-exit-btn sf-btn ghost"
          onClick={() => navigate('/games')}
          aria-label={t('games.lavaPad.leaveGame')}
        >
          {t('games.lavaPad.leaveGame')}
        </button>
      )}

      {/* Legend toggle hint */}
      {phase === 'playing' && (
        <div className="lava-pad-legend-hint" aria-hidden="true">
          Press L for legend
        </div>
      )}

      {/* Platform legend for colorblind accessibility */}
      {showLegend && (
        <div className="lava-pad-legend" role="complementary" aria-label={t('games.lavaPad.platformLegend')}>
          <div className="lava-pad-legend-header">
            <span>{t('games.lavaPad.platformLegend')}</span>
            <button className="lava-pad-legend-close" onClick={toggleLegend} aria-label={t('games.lavaPad.closeLegend')}>×</button>
          </div>
          <div className="lava-pad-legend-items">
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#6b9e7a' }}>●</span>
              <span>{t('games.lavaPad.platformSpawn')}</span>
            </div>
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#d4c9a8' }}>●</span>
              <span>{t('games.lavaPad.platformNormal')}</span>
            </div>
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#7a8aad' }}>●</span>
              <span>{t('games.lavaPad.platformLarge')}</span>
            </div>
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#9a7a6a' }}>●</span>
              <span>{t('games.lavaPad.platformSmall')}</span>
            </div>
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#8a6a5a' }}>◆</span>
              <span>{t('games.lavaPad.platformCracked')}</span>
            </div>
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#6a8aba' }}>●</span>
              <span>{t('games.lavaPad.platformMoving')}</span>
            </div>
            <div className="lava-pad-legend-item">
              <span className="lava-pad-legend-swatch" style={{ background: '#ba8a6a' }}>▼</span>
              <span>{t('games.lavaPad.platformShrinking')}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lava-pad-ui-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 10;
          font-family: var(--display); overflow: hidden;
        }
        .lava-pad-exit-btn {
          position: absolute; top: 16px; left: 16px; pointer-events: all;
          padding: 8px 16px; border-radius: 999px;
          background: rgba(0,0,0,0.5); color: white;
          border: 1px solid rgba(255,255,255,0.15); font-size: 13px;
          cursor: pointer; transition: background 0.15s;
        }
        .lava-pad-exit-btn:hover { background: rgba(0,0,0,0.7); }

        /* Countdown */
        .lava-pad-loading {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
          color: rgba(255,255,255,0.7); font-size: 14px;
          letter-spacing: 1px; text-transform: uppercase;
        }
        .lava-pad-loading-spinner {
          width: 32px; height: 32px; border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.15);
          border-top-color: var(--accent, #ffce54);
          animation: loading-spin 0.8s linear infinite;
        }
        @keyframes loading-spin {
          to { transform: rotate(360deg); }
        }
        .lava-pad-countdown {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
        }
        .lava-pad-countdown-number {
          font-size: 140px; font-weight: 800; color: white;
          text-shadow: 0 0 60px rgba(255,206,84,0.6);
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
        }
        .lava-pad-countdown--enter .lava-pad-countdown-number {
          transform: scale(2); opacity: 0;
        }
        .lava-pad-countdown--active .lava-pad-countdown-number {
          transform: scale(1); opacity: 1;
        }
        .lava-pad-countdown--exit .lava-pad-countdown-number {
          transform: scale(0.7); opacity: 0;
        }
        .lava-pad-countdown-label {
          font-size: 16px; color: rgba(255,255,255,0.6);
          text-transform: uppercase; letter-spacing: 3px;
          transition: opacity 0.4s ease;
        }
        .lava-pad-countdown--enter .lava-pad-countdown-label { opacity: 0; }
        .lava-pad-countdown--active .lava-pad-countdown-label { opacity: 1; }
        .lava-pad-countdown--exit .lava-pad-countdown-label { opacity: 0; }

        /* Countdown ring pulse */
        .lava-pad-countdown-ring {
          position: absolute; width: 200px; height: 200px;
          border-radius: 50%; border: 3px solid rgba(255,206,84,0.3);
          animation: countdown-ring-pulse 1s ease-out infinite;
          pointer-events: none;
        }
        @keyframes countdown-ring-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        /* GO! burst */
        .lava-pad-go-burst {
          position: absolute; width: 300px; height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,206,84,0.3) 0%, transparent 70%);
          animation: go-burst 0.8s ease-out forwards;
          pointer-events: none;
        }
        .lava-pad-go-text {
          font-size: 100px; font-weight: 800; color: #ffce54;
          text-shadow: 0 0 80px rgba(255,206,84,0.8);
          animation: go-text-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          z-index: 1;
        }
        @keyframes go-burst {
          0% { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes go-text-in {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .lava-pad-hint {
          position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
          color: rgba(255,255,255,0.4); font-size: 13px;
          letter-spacing: 0.5px; pointer-events: none;
          animation: fade-in-out 3s ease 2s forwards;
        }
        @keyframes fade-in-out {
          0% { opacity: 0.4; } 70% { opacity: 0.4; } 100% { opacity: 0; }
        }

        /* Session schedule banner */
        .lava-pad-session-banner {
          position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 10px 20px; border-radius: 14px;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
          border: 1px solid var(--glass-border);
          pointer-events: none; z-index: 9;
          animation: session-banner-in 0.4s ease;
        }
        @keyframes session-banner-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .lava-pad-session-banner.on-break {
          background: rgba(76,175,80,0.35);
          border-color: rgba(76,175,80,0.5);
        }
        .lava-pad-session-label {
          font-size: 12px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 2px; color: #ffce54;
        }
        .lava-pad-session-banner.on-break .lava-pad-session-label { color: #6cf09a; }
        .lava-pad-session-time {
          font-size: 18px; font-weight: 800; color: white;
          font-variant-numeric: tabular-nums;
        }
        .lava-pad-session-info {
          font-size: 11px; color: rgba(255,255,255,0.5);
          margin-top: 2px;
        }
        @media (max-width: 640px) {
          .lava-pad-session-banner { padding: 8px 14px; }
          .lava-pad-session-time { font-size: 15px; }
        }

        /* HUD */
        .lava-pad-hud {
          position: absolute; top: 16px; right: 16px;
          display: flex; gap: 10px; pointer-events: none;
        }
        .lava-pad-hud-item {
          background: rgba(0,0,0,0.55); border-radius: 12px;
          padding: 8px 14px; display: flex; flex-direction: column;
          align-items: center; gap: 2px;
          backdrop-filter: blur(6px);
          transition: background 0.3s;
        }
        .lava-pad-hud-item.warning {
          background: rgba(200,40,20,0.6);
          animation: hud-warning-pulse 1s ease-in-out infinite;
        }
        @keyframes hud-warning-pulse {
          0%, 100% { background: rgba(200,40,20,0.6); }
          50% { background: rgba(200,40,20,0.8); }
        }
        .lava-pad-hud-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
          color: rgba(255,255,255,0.5);
        }
        .lava-pad-hud-value { font-size: 20px; font-weight: 700; color: white; }

        /* Lava indicator bar */
        .lava-pad-lava-indicator { cursor: default; min-width: 80px; }
        .lava-pad-lava-bar {
          width: 60px; height: 6px; border-radius: 3px;
          background: rgba(255,255,255,0.1); overflow: hidden;
          margin-top: 2px;
        }
        .lava-pad-lava-fill {
          height: 100%; border-radius: 3px;
          background: linear-gradient(90deg, #44ff88, #ffaa44, #ff4444);
          transition: width 0.3s ease;
        }
        .lava-pad-lava-indicator.warning {
          animation: hud-warning-pulse 1.5s ease-in-out infinite;
        }
        .lava-pad-lava-indicator.warning .lava-pad-lava-bar {
          box-shadow: 0 0 8px rgba(200,40,20,0.4);
        }
        .lava-pad-lava-indicator.danger .lava-pad-lava-fill {
          box-shadow: 0 0 12px rgba(255,68,0,0.6);
        }
        .lava-pad-lava-indicator.danger {
          background: rgba(200,30,10,0.7);
          animation: hud-warning-pulse 0.6s ease-in-out infinite;
        }

        /* Elimination */
        .lava-pad-flash-overlay {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(255,68,0,0.4), transparent 70%);
          animation: flash-overlay-out 1.5s ease-out forwards;
          pointer-events: none; z-index: 20;
        }
        @keyframes flash-overlay-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .lava-pad-eliminated {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          animation: eliminated-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .lava-pad-eliminated-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(200,40,20,0.9);
          color: white; font-size: 24px; font-weight: 800;
          display: grid; place-items: center;
          border: 2px solid rgba(255,100,60,0.5);
          animation: eliminated-shake 0.4s ease-out;
        }
        .lava-pad-eliminated span:first-of-type {
          font-size: 24px; font-weight: 800; color: white;
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
          animation: eliminated-text-in 0.5s ease 0.1s both;
        }
        .lava-pad-eliminated-sub {
          font-size: 13px; color: rgba(255,255,255,0.5);
          animation: eliminated-text-in 0.5s ease 0.2s both;
        }
        @keyframes eliminated-in {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes eliminated-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes eliminated-text-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Spectator */
        .lava-pad-spectator-info {
          position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,0.5); border-radius: 999px;
          padding: 8px 20px; display: flex; gap: 10px; align-items: center;
          backdrop-filter: blur(6px);
        }
        .lava-pad-spectator-label {
          font-size: 12px; color: rgba(255,255,255,0.5);
          text-transform: uppercase; letter-spacing: 1px;
        }
        .lava-pad-spectator-name {
          font-size: 14px; font-weight: 700; color: #ffce54;
        }

        /* Results */
        .lava-pad-results {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.6);
          animation: fade-in 0.5s ease;
          padding: 20px;
        }
        .lava-pad-results-content {
          text-align: center; padding: 36px 40px 32px;
          border-radius: 28px; max-width: 460px; width: 100%;
          pointer-events: all; max-height: 90vh; overflow-y: auto;
          backdrop-filter: blur(12px);
          animation: results-slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes results-slide-up {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lava-pad-results-header { margin-bottom: 20px; }
        .lava-pad-results-kicker {
          font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
          color: var(--accent, #ffce54); font-weight: 700;
          animation: results-fade-in 0.5s ease 0.1s both;
        }
        .lava-pad-results-header h2 {
          font-size: 30px; font-weight: 800; color: var(--ink);
          margin: 6px 0 0;
          animation: results-fade-in 0.5s ease 0.2s both;
        }
        @keyframes results-fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .lava-pad-results-stats {
          display: flex; gap: 16px; justify-content: center;
          margin-bottom: 24px;
        }
        .lava-pad-results-stat {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; flex: 1;
          background: var(--glass-fill); border-radius: 14px;
          padding: 12px 8px;
          border: 1px solid var(--glass-border);
        }
        .lava-pad-results-stat-value {
          font-size: 22px; font-weight: 800; color: var(--ink);
        }
        .lava-pad-results-stat-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
          color: var(--ink-soft);
        }
        .lava-pad-results-players {
          display: flex; flex-direction: column; gap: 4px;
          margin-bottom: 24px;
        }
        .lava-pad-results-player {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px; border-radius: 12px;
          background: var(--glass-fill); border: 1px solid var(--glass-border);
          transition: background 0.15s;
        }
        .lava-pad-results-player.winner {
          border-color: var(--accent, #ffce54);
          background: color-mix(in srgb, var(--accent, #ffce54) 10%, var(--glass-fill));
        }
        .lava-pad-results-player.self {
          outline: 2px solid rgba(255,255,255,0.2);
        }
        .lava-pad-results-pos {
          font-size: 12px; font-weight: 700; color: var(--ink-soft);
          width: 28px; text-align: left;
        }
        .lava-pad-results-name {
          flex: 1; font-size: 14px; font-weight: 600; color: var(--ink);
          text-align: left;
        }
        .lava-pad-results-time {
          font-size: 12px; color: var(--ink-soft);
        }
        .lava-pad-results-actions {
          display: flex; flex-direction: column; gap: 8px;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Accessibility: reduced motion */
        [data-reduce-motion="true"] .lava-pad-countdown-number {
          transition: none; animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-countdown--enter .lava-pad-countdown-number {
          transform: none; opacity: 1;
        }
        [data-reduce-motion="true"] .lava-pad-countdown--exit .lava-pad-countdown-number {
          transform: none; opacity: 1;
        }
        [data-reduce-motion="true"] .lava-pad-eliminated {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-results {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-hint {
          animation: none; opacity: 0;
        }
        [data-reduce-motion="true"] .lava-pad-hud-item.warning {
          animation: none;
          background: rgba(200,40,20,0.7);
        }
        [data-reduce-motion="true"] .lava-pad-spectator-info {
          transition: none;
        }
        [data-reduce-motion="true"] .lava-pad-eliminated-icon {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-eliminated span:first-of-type,
        [data-reduce-motion="true"] .lava-pad-eliminated-sub {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-results-content {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-results-kicker,
        [data-reduce-motion="true"] .lava-pad-results-header h2 {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-disconnect {
          animation: none;
        }
        [data-reduce-motion="true"] .lava-pad-loading-spinner {
          animation: none;
          border-top-color: rgba(255,255,255,0.3);
        }

        /* Keyboard focus indicators */
        .lava-pad-exit-btn:focus-visible,
        .lava-pad-results-actions .sf-btn:focus-visible {
          outline: 3px solid var(--accent, #ffce54);
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(255,206,84,0.3);
        }

        /* High contrast mode */
        [data-high-contrast="true"] .lava-pad-hud-item {
          background: rgba(0,0,0,0.9);
          border: 2px solid rgba(255,255,255,0.5);
        }
        [data-high-contrast="true"] .lava-pad-hud-label {
          color: rgba(255,255,255,0.8);
        }
        [data-high-contrast="true"] .lava-pad-eliminated-icon {
          border-width: 3px;
        }
        [data-high-contrast="true"] .lava-pad-exit-btn {
          border-width: 2px;
          border-color: rgba(255,255,255,0.5);
        }
        [data-high-contrast="true"] .lava-pad-results-actions .sf-btn {
          border: 2px solid var(--accent, #ffce54);
        }

        /* Platform legend for colorblind accessibility */
        .lava-pad-disconnect {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: rgba(200,40,20,0.85); color: white;
          padding: 12px 24px; border-radius: 12px;
          font-size: 14px; font-weight: 600;
          animation: fade-in 0.3s ease;
          pointer-events: none;
        }
        .lava-pad-legend-hint {
          position: absolute; bottom: 16px; right: 16px;
          font-size: 11px; color: rgba(255,255,255,0.3);
          pointer-events: none; letter-spacing: 0.5px;
        }
        .lava-pad-legend {
          position: absolute; bottom: 16px; right: 16px;
          background: rgba(0,0,0,0.85); border-radius: 12px;
          padding: 12px 16px; pointer-events: all;
          backdrop-filter: blur(8px); min-width: 180px;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .lava-pad-legend-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px; font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.8); text-transform: uppercase;
          letter-spacing: 1px;
        }
        .lava-pad-legend-close {
          background: none; border: none; color: rgba(255,255,255,0.5);
          font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;
        }
        .lava-pad-legend-close:hover { color: white; }
        .lava-pad-legend-items {
          display: flex; flex-direction: column; gap: 6px;
        }
        .lava-pad-legend-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(255,255,255,0.7);
        }
        .lava-pad-legend-swatch {
          width: 20px; height: 20px; border-radius: 4px;
          display: grid; place-items: center; font-size: 14px;
          border: 1px solid rgba(255,255,255,0.2);
        }

        @media (max-width: 640px) {
          .lava-pad-countdown-number { font-size: 100px; }
          .lava-pad-hud { top: 12px; right: 12px; gap: 8px; }
          .lava-pad-hud-item { padding: 6px 10px; }
          .lava-pad-hud-value { font-size: 16px; }
          .lava-pad-results-content { padding: 28px 20px 24px; }
          .lava-pad-results-header h2 { font-size: 24px; }
          .lava-pad-results-stat { padding: 10px 6px; }
          .lava-pad-results-stat-value { font-size: 18px; }
        }
      `}</style>
    </div>
  )
}
