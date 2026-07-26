// @ts-nocheck
// Match Lobby — pre-match waiting lobby with player avatars and ready status

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMatchmaking, MAX_ROOM_SIZE, MIN_PLAYERS_TO_START } from './Matchmaking'
import { useLavaPadStore } from '../../three/lava-pad/store'
import { useBreakIntegration } from '../break/BreakIntegration'

interface MatchLobbyProps {
  onStartMatch: () => void
  onBack?: () => void
}

export function MatchLobby({ onStartMatch, onBack }: MatchLobbyProps) {
  const { t } = useTranslation()
  const phase = useMatchmaking((s) => s.phase)
  const players = useMatchmaking((s) => s.players)
  const countdown = useMatchmaking((s) => s.countdown)
  const setReady = useMatchmaking((s) => s.setReady)
  const leaveRoom = useMatchmaking((s) => s.leaveRoom)
  const tick = useMatchmaking((s) => s.tick)
  const breakTimeRemaining = useBreakIntegration((s) => s.breakTimeRemaining)

  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const isReady = localPlayerId ? (useMatchmaking.getState().readyTimers[localPlayerId] ?? false) : false

  // Tick matchmaking every second
  useEffect(() => {
    const interval = setInterval(() => tick(), 1000)
    return () => clearInterval(interval)
  }, [])

  // Start match when countdown finishes
  useEffect(() => {
    if (phase === 'in-progress') {
      onStartMatch()
    }
  }, [phase])

  // Show break time in lobby
  const breakMin = Math.floor(breakTimeRemaining / 60)
  const breakSec = breakTimeRemaining % 60
  const breakStr = `${breakMin}:${breakSec.toString().padStart(2, '0')}`

  return (
    <div className="match-lobby-root">
      <div className="match-lobby-card water-glass">
        <div className="match-lobby-header">
          <h2>{t('games.lobby.title')}</h2>
          <span className="match-lobby-players-count">
            {players.length}/{MAX_ROOM_SIZE} {t('games.lobby.players')}
          </span>
        </div>

        {onBack && (
          <button className="match-lobby-back-btn" onClick={onBack} aria-label="Back to match types">
            ← Back
          </button>
        )}

        {/* Break timer */}
        <div className="match-lobby-break-timer">
          <span className="match-lobby-break-label">{t('games.lobby.breakRemaining')}</span>
          <span className={`match-lobby-break-value ${breakTimeRemaining <= 30 ? 'warning' : ''}`}>
            {breakStr}
          </span>
        </div>

        {/* Player list */}
        <div className="match-lobby-players">
          {players.map((p) => (
            <div key={p.id} className={`match-lobby-player ${p.id === localPlayerId ? 'self' : ''}`}>
              <div className="match-lobby-avatar">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="match-lobby-player-info">
                <span className="match-lobby-name">{p.name}</span>
                <span className="match-lobby-player-id">#{p.id.slice(0, 6)}</span>
              </div>
              <div className={`match-lobby-ready-badge ${p.ready ? 'ready' : ''}`}>
                {p.ready ? '✓ Ready' : '...'}
              </div>
            </div>
          ))}
          {Array.from({ length: MAX_ROOM_SIZE - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="match-lobby-player empty">
              <div className="match-lobby-avatar empty" />
              <span className="match-lobby-name">{t('games.lobby.waiting')}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="match-lobby-status">
          {phase === 'countdown' ? (
            <span className="match-lobby-countdown">
              {t('games.lobby.startingIn')} {countdown}
            </span>
          ) : (
            <span className="match-lobby-min-players">
              {t('games.lobby.minPlayers', { count: MIN_PLAYERS_TO_START })}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="match-lobby-actions">
          <button
            className={`sf-btn ${isReady ? 'secondary' : ''}`}
            onClick={() => localPlayerId && setReady(localPlayerId, !isReady)}
          >
            {isReady ? t('games.lobby.notReady') : t('games.lobby.ready')}
          </button>
          <button className="sf-btn water" onClick={() => leaveRoom()}>
            {t('games.lobby.leave')}
          </button>
        </div>
      </div>

      <style>{`
        .match-lobby-root {
          position: absolute; inset: 0; display: grid; place-items: center;
          background: rgba(0,0,0,0.4); padding: 20px; z-index: 5;
          animation: lobby-in 0.3s ease;
        }
        @keyframes lobby-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .match-lobby-card {
          text-align: center; padding: 32px; border-radius: 28px;
          max-width: 420px; width: 100%; backdrop-filter: blur(12px);
        }
        .match-lobby-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .match-lobby-header h2 {
          font-family: var(--display); font-weight: 800; font-size: 24px;
          color: var(--ink); margin: 0;
        }
        .match-lobby-players-count {
          font-size: 13px; font-weight: 600; color: var(--ink-soft);
          background: var(--glass-fill); padding: 4px 12px;
          border-radius: 999px;
        }
        .match-lobby-break-timer {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-bottom: 20px; padding: 8px 16px;
          background: var(--glass-fill); border-radius: 12px;
          border: 1px solid var(--glass-border);
        }
        .match-lobby-break-label {
          font-size: 12px; color: var(--ink-soft); text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .match-lobby-break-value {
          font-size: 18px; font-weight: 700; color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .match-lobby-break-value.warning { color: #e25b4b; }
        .match-lobby-players {
          display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;
        }
        .match-lobby-player {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 12px;
          background: var(--glass-fill); border: 1px solid var(--glass-border);
          transition: all 0.15s;
        }
        .match-lobby-player.self {
          outline: 2px solid var(--accent);
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), var(--glass-fill));
        }
        .match-lobby-player.empty {
          opacity: 0.3;
        }
        .match-lobby-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #000));
          display: grid; place-items: center;
          color: white; font-weight: 700; font-size: 15px;
          flex-shrink: 0;
          border: 2px solid rgba(255, 255, 255, 0.15);
        }
        .match-lobby-avatar.empty {
          background: rgba(255,255,255,0.05);
          border: 1px dashed rgba(255,255,255,0.15);
        }
        .match-lobby-player-info {
          flex: 1; min-width: 0; display: flex; flex-direction: column;
        }
        .match-lobby-name {
          font-size: 14px; font-weight: 700; color: var(--ink);
          text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .match-lobby-player-id {
          font-size: 11px; color: var(--ink-soft); opacity: 0.6;
        }
        .match-lobby-ready-badge {
          flex-shrink: 0; font-size: 11px; font-weight: 700;
          padding: 4px 10px; border-radius: 999px;
          background: rgba(255,255,255,0.08); color: var(--ink-soft);
          border: 1px solid var(--glass-border);
        }
        .match-lobby-ready-badge.ready {
          background: rgba(76, 175, 80, 0.15); color: #4caf50;
          border-color: rgba(76, 175, 80, 0.3);
        }
        .match-lobby-status {
          margin-bottom: 20px; min-height: 24px;
        }
        .match-lobby-countdown {
          font-size: 16px; font-weight: 700; color: var(--accent);
          animation: pulse-soft 1s ease-in-out infinite;
        }
        .match-lobby-min-players {
          font-size: 13px; color: var(--ink-soft);
        }
        .match-lobby-actions {
          display: flex; flex-direction: column; gap: 8px;
        }
        .match-lobby-leave-btn {
          color: var(--ink-soft);
        }
        .match-lobby-back-btn {
          position: absolute; top: 16px; left: 16px;
          padding: 6px 12px; border-radius: 999px;
          background: transparent; border: 1px solid var(--glass-border);
          color: var(--ink-soft); font-size: 13px; cursor: pointer;
          transition: all 0.15s;
        }
        .match-lobby-back-btn:hover {
          background: var(--glass-fill); color: var(--ink);
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
