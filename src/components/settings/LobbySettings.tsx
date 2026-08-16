import { useTranslation } from 'react-i18next'
import { WebCustomizationContent } from './WebCustomization'
import { Toggle, Section } from './controls'
import { useSettings } from '../../store/settings'
import './LobbySettings.css'

export function LobbySettings({ onClose }: { onClose: () => void }) {
  useTranslation()
  const waitForLobby = useSettings((s) => s.waitForLobbyReady)
  const autoQuality = useSettings((s) => s.autoQuality)
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
              label="Auto quality (realm starts low, steps up to fit your device)"
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
