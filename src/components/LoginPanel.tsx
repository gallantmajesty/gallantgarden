import { useTranslation } from 'react-i18next'
import { useMagnet } from '../store/magnet'
import { useProfile } from '../store/profile'
import { getDailyEngagement, syncXpToDb } from '../lib/xpEngine'
import { rankForLifetime, RANKS } from '../lib/ranks'
import './LoginPanel.css'

export function LoginPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const engagement = getDailyEngagement()

  const handleClose = () => {
    localStorage.setItem('sf.loginPanel.lastShown', String(Date.now()))
    // Flush the authoritative profile wallet to the DB (Magnet's snapshot is
    // just a mirror of it now — never write the mirror back).
    const p = useProfile.getState()
    if (p.userId && !p.isGuest) syncXpToDb(p.userId, p.xp, p.premiumXp, p.rankXp)
    onClose()
  }

  const totalXp = data.xp + data.premiumXp
  const lifetimeXp = data.rankXp > 0 ? data.rankXp : totalXp
  const currentRank = rankForLifetime(data.rankXp, data.xp, data.premiumXp)
  const nextRank = rankForLifetime(lifetimeXp + 1, data.xp, data.premiumXp)
  const rankIdx = RANKS.indexOf(currentRank)
  const nextRankIdx = rankIdx + 1
  const rankProgress = nextRankIdx < RANKS.length
    ? (lifetimeXp - currentRank.threshold) / (RANKS[nextRankIdx].threshold - currentRank.threshold)
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
            <span className="lp-stat-label">XP (Focus)</span>
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

        <div className="lp-tips">
          <h4>📖 Daily Tips</h4>
          <ul>
            <li>Maintain a <strong>streak</strong> — a day counts if you return within 24 hours</li>
            <li>Check your <strong>Focus Score</strong> for lifetime analytics</li>
          </ul>
        </div>

        <button className="sf-btn water lp-close-btn" onClick={handleClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}