import { useTranslation } from 'react-i18next'
import { LANGUAGES, changeLanguage } from '../../i18n'
import { WebCustomizationContent } from './WebCustomization'
import './LobbySettings.css'

export function LobbySettings({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation()
  const current = i18n.language

  return (
    <div className="settings-scrim" onPointerDown={onClose}>
      <div className="settings-panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="settings-x" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section-title">Language</div>
            <div className="lang-grid">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-btn${current === lang.code ? ' lang-btn--active' : ''}`}
                  onClick={() => changeLanguage(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <WebCustomizationContent />
        </div>
      </div>
    </div>
  )
}
