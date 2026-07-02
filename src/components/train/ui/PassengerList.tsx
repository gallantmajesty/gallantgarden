// Passenger list — shows who's on this train. Reads from the multiplayer
// roster and the local seat occupancy map. Toggled via quick actions.

import { useTrain } from '../../../store/train'
import { useRealmNet } from '../../../multiplayer/net'
import { getSeatMap } from '../../../three/train/interior'

export function PassengerList({ onClose }: { onClose: () => void }) {
  const line = useTrain((s) => s.line)
  const seat = useTrain((s) => s.seat)
  const roster = useRealmNet((s) => s.roster)
  const seatMap = getSeatMap()

  if (!line) return null

  // Build passenger list from roster + local seat map
  const passengers: { name: string; seat: number; isSelf: boolean }[] = []

  // Self
  if (seat != null) {
    passengers.push({ name: 'You', seat, isSelf: true })
  }

  // Other seated players from roster
  for (const [, entry] of Object.entries(roster)) {
    const occ = Array.from(seatMap.values()).find((o) => o.playerId === entry.id)
    if (occ) {
      passengers.push({ name: entry.name, seat: occ.seatIndex, isSelf: false })
    }
  }

  // Also show unseated roster members
  for (const [, entry] of Object.entries(roster)) {
    const occ = Array.from(seatMap.values()).find((o) => o.playerId === entry.id)
    if (!occ) {
      passengers.push({ name: entry.name, seat: -1, isSelf: false })
    }
  }

  return (
    <div className="train-passengers water-glass" style={accentVars(line.mood.glow, line.mood.accent)}>
      <div className="train-passengers-head">
        <span className="train-passengers-icon">👥</span>
        <strong>Passengers</strong>
        <span className="train-passengers-count">{passengers.length}</span>
        <button className="train-passengers-close" onClick={onClose} aria-label="Close passengers">✕</button>
      </div>

      <div className="train-passengers-body">
        {passengers.length === 0 ? (
          <p className="train-passengers-empty">No other passengers yet</p>
        ) : (
          <ul className="train-passengers-list">
            {passengers.map((p, i) => (
              <li key={i} className={`train-passenger ${p.isSelf ? 'self' : ''}`}>
                <span className="train-passenger-avatar">
                  {p.isSelf ? '🧑' : '👤'}
                </span>
                <span className="train-passenger-name">{p.name}</span>
                <span className="train-passenger-seat">
                  {p.seat >= 0 ? `Seat ${p.seat + 1}` : 'Standing'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function accentVars(glow?: string, accent?: string): React.CSSProperties {
  if (!glow || !accent) return {}
  return { ['--train-glow' as string]: glow, ['--train-accent' as string]: accent }
}
