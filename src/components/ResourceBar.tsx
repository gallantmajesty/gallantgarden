// ResourceBar — Clash of Clans–style currency display.
// Fixed bottom-right: two individual stacked bars (golden leaf top, green leaf bottom)
// each with icon + fill bar inside. No shop button — avatar customization is the shop.
// Hover any bar to see the balance. Fill is relative to the largest balance,
// so there's no fixed cap — leaves keep filling forever.

import { useProfile } from '../store/profile'
import { GREEN_LEAF_ICON, GOLD_LEAF_ICON } from '../lib/leafIcons'
import './ResourceBar.css'

export function ResourceBar() {
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)

  // No fixed cap: the bar fills relative to the largest balance, so it always
  // keeps growing no matter how many leaves are earned.
  const ref = Math.max(10_000, xp, premiumXp)
  const leafPct = Math.min(100, Math.round((xp / ref) * 100))
  const goldenPct = Math.min(100, Math.round((premiumXp / ref) * 100))

  return (
  <div className="resource-bar">
  {/* green leaf bar (top) */}
  <div className="resource-bar__bar resource-bar__bar--leaf" title={`${xp.toLocaleString()} leaves`}>
  <img className="resource-bar__bar-icon" src={GREEN_LEAF_ICON} alt="" draggable={false} />
  <div className="resource-bar__bar-track">
  <div className="resource-bar__bar-fill resource-bar__bar-fill--leaf" style={{ width: `${Math.max(2, leafPct)}%` }} />
  </div>
  <span className="resource-bar__pct">{xp.toLocaleString()}</span>
  </div>

  {/* golden leaf bar (bottom) — rare */}
  <div className="resource-bar__bar resource-bar__bar--golden" title={`${premiumXp.toLocaleString()} golden leaves`}>
  <img className="resource-bar__bar-icon" src={GOLD_LEAF_ICON} alt="" draggable={false} />
  <div className="resource-bar__bar-track">
  <div className="resource-bar__bar-fill resource-bar__bar-fill--golden" style={{ width: `${Math.max(2, goldenPct)}%` }} />
  </div>
  <span className="resource-bar__pct resource-bar__pct--golden">{premiumXp.toLocaleString()}</span>
  </div>
  </div>
  )
}
