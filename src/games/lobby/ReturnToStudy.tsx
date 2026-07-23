// @ts-nocheck
// Return to Study Flow — post-match options and auto-return when break expires

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePomodoro } from '../../store/pomodoro'
import { useBreakIntegration } from '../break/BreakIntegration'
import { useLavaPadStore } from '../../three/lava-pad/store'

interface ReturnToStudyProps {
  onReturn: () => void
}

export function ReturnToStudy({ onReturn }: ReturnToStudyProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const phase = useBreakIntegration((s) => s.phase)
  const breakTimeRemaining = useBreakIntegration((s) => s.breakTimeRemaining)
  const breakDuration = useBreakIntegration((s) => s.breakDuration)
  const focusSessionCompleted = useBreakIntegration((s) => s.focusSessionCompleted)
  const currentMatchSurvivalTime = useBreakIntegration((s) => s.currentMatchSurvivalTime)
  const currentMatchPlacement = useBreakIntegration((s) => s.currentMatchPlacement)

  const pomoMode = usePomodoro((s) => s.phase)
  const results = useLavaPadStore((s) => s.results)

  const [showSummary, setShowSummary] = useState(false)

  // Auto-return when break expires
  useEffect(() => {
    if (pomoMode === 'running') {
      const timer = setTimeout(() => {
        onReturn()
        navigate('/realm')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [pomoMode])

  const breakElapsed = breakDuration - breakTimeRemaining
  const breakElapsedMin = Math.floor(breakElapsed / 60)
  const breakElapsedSec = Math.floor(breakElapsed % 60)

  const matchSurvival = results?.matchDuration ?? currentMatchSurvivalTime
  const matchPlacement = results?.placement ?? currentMatchPlacement
  const totalPlayers = results?.totalPlayers ?? 0

  return (
    <div className="return-study-overlay">
      <div className="return-study-card water-glass">
        {/* Session summary */}
        {focusSessionCompleted && (
          <div className="return-study-summary">
            <h3>{t('games.session.title')}</h3>

            <div className="return-study-stats">
              <div className="return-study-stat">
                <span className="return-study-stat-label">{t('games.session.breakDuration')}</span>
                <span className="return-study-stat-value">
                  {breakElapsedMin}:{breakElapsedSec.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="return-study-stat">
                <span className="return-study-stat-label">{t('games.session.placement')}</span>
                <span className="return-study-stat-value">
                  {matchPlacement > 0
                    ? `#${matchPlacement} / ${totalPlayers}`
                    : t('games.session.ongoing')}
                </span>
              </div>
              <div className="return-study-stat">
                <span className="return-study-stat-label">{t('games.session.survivalTime')}</span>
                <span className="return-study-stat-value">
                  {matchSurvival > 0 ? `${matchSurvival.toFixed(0)}s` : t('games.session.ongoing')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
        <div className="return-study-message">
          {phase === 'break-ending' || pomoMode === 'running' ? (
            <p>{t('games.session.breakAlmostOver')}</p>
          ) : (
            <p>{t('games.session.breakRemaining', { time: `${Math.floor(breakTimeRemaining / 60)}:${(breakTimeRemaining % 60).toString().padStart(2, '0')}` })}</p>
          )}
        </div>

        {/* Actions */}
        <div className="return-study-actions">
          <button className="sf-btn" onClick={() => { onReturn(); navigate('/realm') }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ marginRight: 8 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {t('games.session.returnToStudy')}
          </button>
          <button className="sf-btn water" onClick={() => navigate('/games')}>
            {t('games.lavaPad.backToGames')}
          </button>
        </div>
      </div>

      <style>{`
        .return-study-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: flex-end; justify-content: center;
          padding: 24px; z-index: 20;
          background: linear-gradient(transparent 50%, rgba(0,0,0,0.5));
          pointer-events: none;
          animation: return-in 0.4s ease;
        }
        @keyframes return-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .return-study-card {
          text-align: center; padding: 28px 32px 24px;
          border-radius: 24px; max-width: 400px; width: 100%;
          pointer-events: all; backdrop-filter: blur(12px);
        }
        .return-study-summary { margin-bottom: 16px; }
        .return-study-summary h3 {
          font-family: var(--display); font-weight: 800; font-size: 18px;
          color: var(--ink); margin: 0 0 12px;
        }
        .return-study-stats {
          display: flex; gap: 8px; justify-content: center;
        }
        .return-study-stat {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; flex: 1;
          background: var(--glass-fill); border-radius: 12px;
          padding: 10px 8px; border: 1px solid var(--glass-border);
        }
        .return-study-stat-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
          color: var(--ink-soft);
        }
        .return-study-stat-value {
          font-size: 18px; font-weight: 700; color: var(--ink);
          font-variant-numeric: tabular-nums;
        }
        .return-study-message {
          margin-bottom: 20px;
        }
        .return-study-message p {
          font-size: 15px; color: var(--ink-soft); margin: 0;
          line-height: 1.5;
        }
        .return-study-actions {
          display: flex; flex-direction: column; gap: 8px;
        }
        .return-study-actions .sf-btn {
          display: inline-flex; align-items: center; justify-content: center;
        }
      `}</style>
    </div>
  )
}
