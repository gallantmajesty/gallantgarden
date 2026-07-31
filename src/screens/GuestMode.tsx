import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../store/auth'
import './GuestMode.css'

export function GuestMode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="guest-root">
      <div className="guest-card sf-panel">
        <div className="guest-crest">
          <img className="guest-crest-glyph" src="/icons/focus-lily-logo.png" alt={t('common.appName')} />
        </div>

        <h1 className="guest-title">Guest Mode</h1>
        <p className="guest-sub">
          You&apos;re browsing as a guest — your progress saves on this device only.
        </p>

        <div className={`guest-info${visible ? '' : ' hidden'}`}>
          <h3>What works now</h3>
          <ul>
            <li>Study sessions, timers, and focus blocks</li>
            <li>Task magnet and notes (stored locally)</li>
            <li>XP, rank, and avatar customisation</li>
          </ul>
          <h3>Guest limits</h3>
          <ul>
            <li>No cloud sync — progress stays on this device</li>
            <li>No cross-device login or recovery</li>
            <li>Some cloud-only features are locked</li>
          </ul>
        </div>

        <div className="guest-actions">
          <button
            type="button"
            className="sf-btn water guest-cta"
            onClick={() => navigate('/')}
          >
            Sign Up to Save
          </button>

          <button
            type="button"
            className="sf-btn guest-exit"
            onClick={() => {
              signOut()
              navigate('/')
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default GuestMode
