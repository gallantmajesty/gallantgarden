import { useTranslation } from 'react-i18next'
import { WebCustomizationContent } from './WebCustomization'
import { Toggle, Section } from './controls'
import { useSettings } from '../../store/settings'
import './LobbySettings.css'

export function LobbySettings({ onClose }: { onClose: () => void }) {
  useTranslation()
  const waitForLobby = useSettings((s) => s.waitForLobbyReady)
  const adaptiveResolution = useSettings((s) => s.adaptiveResolution)
  const setSetting = useSettings((s) => s.set)

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
            <Toggle
              label="Adaptive Resolution (auto scale to hold FPS)"
              value={adaptiveResolution}
              onChange={(v) => setSetting('adaptiveResolution', v)}
            />
          </Section>

          <WebCustomizationContent showAppearance />
        </div>
      </nav>
    </div>
  )
}
