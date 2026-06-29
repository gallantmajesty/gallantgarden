import { useTranslation } from 'react-i18next'
import { LANGUAGES, changeLanguage } from '../../i18n'
import { WebCustomizationContent } from './WebCustomization'
import './LobbySettings.css'

export function LobbySettings({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation()
  const current = i18n.language

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
            <div className="ls-section-title">Language</div>
            <div className="ls-lang-grid">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`ls-lang-btn${current === lang.code ? ' active' : ''}`}
                  onClick={() => changeLanguage(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <WebCustomizationContent />
        </div>
      </nav>
    </div>
  )
}
