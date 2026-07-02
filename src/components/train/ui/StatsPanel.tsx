// Journey stats panel — shows real-time metrics while seated and aggregate
// stats from the journey log. Toggled via the quick actions bar.

import { useTrain, journeyTotals } from '../../../store/train'
import { useRealmNet } from '../../../multiplayer/net'
import { fmtHuman } from '../../../lib/train/schedule'
import { carriageSeats } from '../../../three/train/interior'

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const line = useTrain((s) => s.line)
  const seat = useTrain((s) => s.seat)
  const activeSec = useTrain((s) => s.activeFocusSec)
  const progress = useTrain((s) => s.progress)()
  const remaining = useTrain((s) => s.remainingSec)()
  const journal = useTrain((s) => s.journal)
  const coins = useTrain((s) => s.coins)
  const tickets = useTrain((s) => s.tickets)
  const roster = useRealmNet((s) => s.roster)

  const totals = journeyTotals(journal)
  const seatedCount = Object.values(roster).filter((_r) => {
    // Approximate: count roster members as "on the train"
    return true
  }).length + 1 // +1 for self

  const seatInfo = seat != null ? carriageSeats()[seat] : null
  const seatLabel = seatInfo
    ? `Seat ${(seat ?? 0) + 1} · ${seatInfo.col === 0 || seatInfo.col === 3 ? 'Window' : 'Aisle'}`
    : 'Standing'

  if (!line) return null

  const pct = Math.round(progress * 100)

  return (
    <div className="train-stats water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-stats-head">
        <span className="train-stats-icon">📊</span>
        <strong>Journey Stats</strong>
        <button className="train-stats-close" onClick={onClose} aria-label="Close stats">✕</button>
      </div>

      <div className="train-stats-body">
        {/* Live journey metrics */}
        <div className="train-stats-section">
          <span className="train-stats-label">This Journey</span>
          <div className="train-stats-grid">
            <StatRow icon="⏱" label="Focused" value={fmtHuman(activeSec)} />
            <StatRow icon="📈" label="Progress" value={`${pct}%`} />
            <StatRow icon="🧭" label="Distance" value={`${Math.round((line.minutes / 60) * 72 * progress)} km`} />
            <StatRow icon="💺" label="Seat" value={seatLabel} />
            <StatRow icon="👥" label="Passengers" value={`${seatedCount} aboard`} />
            {remaining > 0 && <StatRow icon="🚂" label="Arrival" value={fmtHuman(remaining)} />}
          </div>
        </div>

        {/* Lifetime stats */}
        <div className="train-stats-section">
          <span className="train-stats-label">All Time</span>
          <div className="train-stats-grid">
            <StatRow icon="🏆" label="Journeys" value={`${totals.completed}`} />
            <StatRow icon="✦" label="Total XP" value={`${totals.totalHours.toFixed(1)}h studied`} />
            <StatRow icon="🪙" label="Coins" value={`${coins}`} />
            <StatRow icon="🎟" label="Tickets" value={`${tickets}`} />
            <StatRow icon="🧭" label="Distance" value={`${totals.totalDistanceKm} km`} />
            <StatRow icon="🔥" label="Stations" value={`${totals.stations} routes`} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="train-stats-row">
      <span className="train-stats-row-icon">{icon}</span>
      <span className="train-stats-row-label">{label}</span>
      <span className="train-stats-row-value">{value}</span>
    </div>
  )
}

function accentVars(glow?: string, accent?: string): React.CSSProperties {
  if (!glow || !accent) return {}
  return { ['--train-glow' as string]: glow, ['--train-accent' as string]: accent }
}
