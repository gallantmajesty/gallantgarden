import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMagnet } from '../store/magnet'
import { getDailyEngagement, syncXpToDb, XP_VALUES, DAILY_CAPS } from '../lib/xpEngine'
import { rankForTotalXp, RANKS } from '../lib/ranks'
import './LoginPanel.css'

export function LoginPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const userId = useMagnet((s) => s.userId)
  const engagement = getDailyEngagement()

  const [showPenalty, setShowPenalty] = useState(false)
  const [penaltyMsg, setPenaltyMsg] = useState('')

  useEffect(() => {
    const daily = engagement
    if (daily.penaltyApplied && daily.activeMinToday < daily.penaltyThresholdMin) {
      setPenaltyMsg(`You only studied ${daily.activeMinToday}min today (target: ${daily.penaltyThresholdMin}min). Your inactivity penalty has been applied. Keep consistency to avoid losing leaves!`)
      setShowPenalty(true)
    }
  }, [engagement])

  const handleClose = () => {
    if (userId) syncXpToDb(userId, data.xp, data.premiumXp)
    onClose()
  }

  const totalXp = data.xp + data.premiumXp
  const currentRank = rankForTotalXp(totalXp)
  const nextRank = rankForTotalXp(totalXp + 1)
  const rankIdx = RANKS.indexOf(currentRank)
  const nextRankIdx = rankIdx + 1
  const rankProgress = nextRankIdx < RANKS.length
    ? (totalXp - currentRank.threshold) / (RANKS[nextRankIdx].threshold - currentRank.threshold)
    : 1

  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-panel water-glass" onClick={(e) => e.stopPropagation()}>
        <div className="lp-header">
          <h2>🧭 Welcome Back</h2>
          <button className="lp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="lp-rank-section">
          <div className="lp-rank-badge" style={{ '--accent': currentRank.accent } as React.CSSProperties}>
            <span className="lp-rank-name">{currentRank.name}</span>
          </div>
          <div className="lp-rank-bar">
            <div className="lp-rank-fill" style={{ width: `${Math.min(100, rankProgress * 100)}%`, background: currentRank.accent }} />
          </div>
          <span className="lp-rank-hint">
            {nextRankIdx < RANKS.length ? `${nextRank.name} next` : 'Max rank reached'}
          </span>
        </div>

        <div className="lp-stats">
          <div className="lp-stat">
            <span className="lp-stat-val">{data.xp.toLocaleString()}</span>
            <span className="lp-stat-label">Leaves (Regular)</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-val" style={{ color: '#ffd700' }}>{data.premiumXp.toLocaleString()}</span>
            <span className="lp-stat-label">Golden Leaves</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-val">{totalXp.toLocaleString()}</span>
            <span className="lp-stat-label">Total XP</span>
          </div>
          <div className="lp-stat">
            <span className="lp-stat-val">{engagement.activeMinToday}m</span>
            <span className="lp-stat-label">Active Today</span>
          </div>
        </div>

        {showPenalty && (
          <div className="lp-penalty">
            <div className="lp-penalty-icon">⚠️</div>
            <div className="lp-penalty-title">Inactivity Penalty</div>
            <div className="lp-penalty-body">{penaltyMsg}</div>
          </div>
        )}

        <div className="lp-tips">
          <h4>📖 Daily Tips</h4>
          <ul>
            <li>Study at least <strong>{engagement.penaltyThresholdMin} minutes</strong> daily to avoid inactivity penalties</li>
            <li>Earn up to <strong>{DAILY_CAPS.activeMinCap} min</strong> of active XP earning per day</li>
            <li>Maintain a <strong>streak</strong> for bonus golden leaves</li>
            <li>Check your <strong>Honour Score</strong> for 30-day analytics</li>
          </ul>
        </div>

        <button className="sf-btn water lp-close-btn" onClick={handleClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}