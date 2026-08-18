import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WebCustomizationContent } from './WebCustomization'
import { Toggle, Section } from './controls'
import { useSettings } from '../../store/settings'
import { getCachedDeviceProfile, onDeviceProfile, type DeviceProfile } from '../../lib/deviceProfile'
import './LobbySettings.css'

export function LobbySettings({ onClose }: { onClose: () => void }) {
  useTranslation()
  const waitForLobby = useSettings((s) => s.waitForLobbyReady)
  const autoQuality = useSettings((s) => s.autoQuality)
  const setSetting = useSettings((s) => s.set)

  // Detected device tier from the app-start probe. Reacts when detection
  // finishes so the badge updates live instead of sitting on "Detecting…".
  const [profile, setProfile] = useState<DeviceProfile | null>(() => getCachedDeviceProfile())
  useEffect(() => onDeviceProfile(setProfile), [])
  const tierLabel =
    profile?.tier === 'low'
      ? 'Low'
      : profile?.tier === 'medium'
        ? 'Medium'
        : profile?.tier === 'blocked'
          ? 'Blocked'
          : 'High'

  return (
    <div className="ls-backdrop" onClick={onClose}>
      <nav className="ls-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ls-head">
          <h2>Settings</h2>
          <button className="ls-close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="ls-scroll">
          <div className="ls-section">
            <Toggle
              label="Wait for lobby to load before closing intro"
              value={waitForLobby}
              onChange={(v) => setSetting('waitForLobbyReady', v)}
            />
          </div>

          <Section title="Performance">
            <div className="ls-device-row">
              <span className="ls-device-label">Detected device</span>
              <span className={`ls-device-tier ls-device-tier--${profile?.tier ?? 'high'}`}>
                {profile ? tierLabel : 'Detecting…'}
              </span>
            </div>
            {profile?.tier === 'low' || profile?.tier === 'blocked' ? (
              <p className="ls-device-note">
                Your device is below the recommended spec — the realms have been tuned to run
                smoothly, so they may look simpler than on a high-end machine.
              </p>
            ) : null}
            <Toggle
              label="Auto quality (detect my device, tune automatically)"
              value={autoQuality ?? true}
              onChange={(v) => setSetting('autoQuality', v)}
            />
          </Section>

          <WebCustomizationContent showAppearance />
        </div>
      </nav>
    </div>
  )
}
