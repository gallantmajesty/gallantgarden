import { WebCustomizationContent } from './WebCustomization'
import './LobbySettings.css'

/**
 * Lobby settings — a modern game-style drawer. Now a single view: the web
 * theme / background / accent / font customization. Visual mode, audio,
 * performance and controls were removed from here (audio moved into the Realm).
 * The underlying `useSettings` store still drives the app via applyVisualSettings;
 * this drawer just no longer exposes those knobs.
 */
export function LobbySettings({ onClose }: { onClose: () => void }) {
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
          <WebCustomizationContent />
        </div>
      </div>
    </div>
  )
}
