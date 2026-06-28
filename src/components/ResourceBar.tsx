// ResourceBar — Clash of Clans–style currency display.
// Fixed bottom-right: two individual stacked bars (green leaf top, golden leaf bottom)
// each with icon + fill bar inside, plus shop button.

import { useNavigate } from 'react-router-dom'
import { useProfile } from '../store/profile'
import { rankProgress } from '../lib/ranks'
import './ResourceBar.css'

export function ResourceBar() {
  const navigate = useNavigate()
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)

  const totalXp = xp + premiumXp
  const { pct } = rankProgress(totalXp)
  const goldenPct = totalXp > 0 ? Math.min(1, premiumXp / Math.max(1, totalXp)) : 0

  return (
    <div className="resource-bar">
      {/* green leaf bar */}
      <div className="resource-bar__bar resource-bar__bar--leaf">
        <img className="resource-bar__bar-icon" src="/icons/leaf.png" alt="" draggable={false} />
        <div className="resource-bar__bar-track">
          <div className="resource-bar__bar-fill resource-bar__bar-fill--leaf" style={{ width: `${Math.max(2, Math.round(pct * 100))}%` }} />
        </div>
      </div>

      {/* golden leaf bar */}
      <div className="resource-bar__bar resource-bar__bar--golden">
        <img className="resource-bar__bar-icon" src="/icons/golden-leaf.png" alt="" draggable={false} />
        <div className="resource-bar__bar-track">
          <div className="resource-bar__bar-fill resource-bar__bar-fill--golden" style={{ width: `${Math.max(2, Math.round(goldenPct * 100))}%` }} />
        </div>
      </div>

      {/* shop button */}
      <button className="resource-bar__shop" onClick={() => navigate('/avatar')} title="Open Shop">
        <svg className="resource-bar__shop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        Shop
      </button>
    </div>
  )
}
