import { Icon } from './magnet/Icon'
import type { StatCard as StatCardData } from '../lib/stats'
import './StatCard.css'

// A single magical statistic widget: a glowing-rimmed glass tile with an accent
// icon, a big value, and a caption. Untracked metrics (state === 'soon') render
// a softened "tracking soon" treatment instead of a fabricated number.
export function StatCard({ stat }: { stat: StatCardData }) {
  const soon = stat.state === 'soon'
  return (
    <div
      className={`stat-card ${soon ? 'soon' : ''}`}
      style={{ ['--stat-accent' as string]: stat.accent }}
    >
      <div className="stat-card-icon">
        <Icon name={stat.icon} size={22} />
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{soon ? '—' : stat.value}</div>
        <div className="stat-card-label">{stat.label}</div>
        {stat.sub && <div className="stat-card-sub">{stat.sub}</div>}
      </div>
    </div>
  )
}
