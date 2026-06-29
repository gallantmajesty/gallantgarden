import { claimSession } from '../lib/session'
import './SessionLockOverlay.css'

interface Props {
  visible: boolean
  /** Human label of the device that currently holds the session (PC/mobile). */
  where?: string
}

export function SessionLockOverlay({ visible, where }: Props) {
  if (!visible) return null

  const handleResume = async () => {
    await claimSession()
  }

  return (
    <div className="session-lock-overlay">
      <div className="session-lock-card">
        <div className="session-lock-icon">🔒</div>
        <h2>Active elsewhere</h2>
        <p>
          Your account is already open on{' '}
          <strong>{where ?? 'another device'}</strong>. An account can only be
          used in one place at a time.
        </p>
        <button className="session-lock-btn" onClick={handleResume}>
          Use Focus Lily here
        </button>
      </div>
    </div>
  )
}
