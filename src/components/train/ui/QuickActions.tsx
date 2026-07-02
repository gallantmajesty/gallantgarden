// Quick actions sidebar — brass-styled buttons on the right edge that toggle
// the journal, stats, settings, and chat panels. Only visible while traveling
// and seated.

import { useTrain } from '../../../store/train'

interface QuickAction {
  id: string
  icon: string
  label: string
  shortcut?: string
}

const ACTIONS: QuickAction[] = [
  { id: 'journal', icon: '📓', label: 'Journal', shortcut: 'J' },
  { id: 'stats', icon: '📊', label: 'Stats' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
  { id: 'chat', icon: '💬', label: 'Chat', shortcut: 'Enter' },
  { id: 'passengers', icon: '👥', label: 'Who\'s here' },
]

export function QuickActions({
  activePanel,
  onToggle,
}: {
  activePanel: string | null
  onToggle: (id: string) => void
}) {
  const phase = useTrain((s) => s.phase)
  const seat = useTrain((s) => s.seat)
  const departureSec = useTrain((s) => s.departureSec)

  // Only show during travel, after departure, when seated
  if (phase !== 'traveling' || departureSec > 0 || seat == null) return null

  return (
    <div className="train-quick-actions">
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          className={`train-quick-btn ${activePanel === a.id ? 'active' : ''}`}
          onClick={() => onToggle(a.id)}
          title={`${a.label}${a.shortcut ? ` (${a.shortcut})` : ''}`}
        >
          <span className="train-quick-icon">{a.icon}</span>
          <span className="train-quick-label">{a.label}</span>
        </button>
      ))}
    </div>
  )
}
