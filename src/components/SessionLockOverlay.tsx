import { claimSession } from '../lib/session'
import './SessionLockOverlay.css'

interface Props {
  visible: boolean
}

export function SessionLockOverlay({ visible }: Props) {
  if (!visible) return null

  const handleResume = async () => {
    await claimSession()
  }

  return (
    <div className="session-lock-overlay">
      <div className="session-lock-card">
        <div className="session-lock-icon">🔒</div>
        <h2>Active elsewhere</h2>
        <p>Focus Lily is open in another tab, browser, or device.</p>
        <button className="session-lock-btn" onClick={handleResume}>
          Use Focus Lily here
        </button>
      </div>
    </div>
  )
}
