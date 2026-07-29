// ResourceBar — Clash of Clans–style currency display.
// Fixed bottom-right: two individual stacked bars (golden leaf top, green leaf bottom)
// each with icon + fill bar inside. No shop button — avatar customization is the shop.
// Hover any bar to see the percentage filled (max 10000 per leaf type).

import { useProfile } from '../store/profile'
import './ResourceBar.css'

const MAX_LEAVES = 10_000

export function ResourceBar() {
  const xp = useProfile((s) => s.xp)
  const premiumXp = useProfile((s) => s.premiumXp)

  const leafPct = Math.min(100, Math.round((xp / MAX_LEAVES) * 100))
  const goldenPct = Math.min(100, Math.round((premiumXp / MAX_LEAVES) * 100))

  return (
  <div className="resource-bar">
  {/* green leaf bar (top) */}
  <div className="resource-bar__bar resource-bar__bar--leaf" title={`${leafPct}% filled — ${xp.toLocaleString()} / ${MAX_LEAVES.toLocaleString()} leaves`}>
  <img className="resource-bar__bar-icon" src="/icons/golden-leaf.png" alt="" draggable={false} />
  <div className="resource-bar__bar-track">
  <div className="resource-bar__bar-fill resource-bar__bar-fill--leaf" style={{ width: `${Math.max(2, leafPct)}%` }} />
  </div>
  <span className="resource-bar__pct">{leafPct}%</span>
  </div>

  {/* golden leaf bar (bottom) — rare */}
  <div className="resource-bar__bar resource-bar__bar--golden" title={`${goldenPct}% filled — ${premiumXp.toLocaleString()} / ${MAX_LEAVES.toLocaleString()} golden leaves`}>
  <img className="resource-bar__bar-icon" src="/icons/leaf.png" alt="" draggable={false} />
  <div className="resource-bar__bar-track">
  <div className="resource-bar__bar-fill resource-bar__bar-fill--golden" style={{ width: `${Math.max(2, goldenPct)}%` }} />
  </div>
  <span className="resource-bar__pct resource-bar__pct--golden">{goldenPct}%</span>
  </div>
  </div>
  )
}
