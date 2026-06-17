import { useWebTheme } from '../../store/webTheme'
import {
  FONT_COLOR_PRESETS,
  WEB_THEMES,
  WEB_THEMES_SOON,
  getWebTheme,
} from '../../lib/webThemes'
import './WebCustomization.css'

/**
 * Web Customization content — the theme / background / accent / font-colour
 * controls, all in one view. Rendered inside the main Settings drawer (the
 * "Theme" tab), not as its own panel. Everything applies live: the store is the
 * source of truth and <App> re-applies the theme vars + background on change.
 */
export function WebCustomizationContent() {
  const themeId = useWebTheme((s) => s.themeId)
  const bgId = useWebTheme((s) => s.bgId)
  const accent = useWebTheme((s) => s.accent)
  const fontColor = useWebTheme((s) => s.fontColor)
  const setTheme = useWebTheme((s) => s.setTheme)
  const setBackground = useWebTheme((s) => s.setBackground)
  const setAccent = useWebTheme((s) => s.setAccent)
  const setFontColor = useWebTheme((s) => s.setFontColor)

  const theme = getWebTheme(themeId)

  return (
    <div className="wc">
      {/* ----------------------------------------------------- Theme */}
      <section className="wc-section">
        <h3 className="wc-h3">Theme</h3>
        <div className="wc-theme-grid">
          {WEB_THEMES.map((t) => (
            <button
              key={t.id}
              className={`wc-theme-card ${t.id === themeId ? 'on' : ''}`}
              style={{ backgroundImage: `url(${t.backgrounds[0].src})` }}
              onClick={() => setTheme(t.id)}
              aria-pressed={t.id === themeId}
            >
              <span className="wc-theme-veil" />
              <span className="wc-theme-meta">
                <span className="wc-theme-emoji">{t.emoji}</span>
                <span className="wc-theme-name">{t.name}</span>
              </span>
              {t.id === themeId && <span className="wc-tick">✓</span>}
            </button>
          ))}
          {WEB_THEMES_SOON.map((t) => (
            <div key={t.id} className="wc-theme-card soon" aria-disabled>
              <span className="wc-theme-veil" />
              <span className="wc-theme-meta">
                <span className="wc-theme-emoji">{t.emoji}</span>
                <span className="wc-theme-name">{t.name}</span>
              </span>
              <span className="wc-soon-tag">Soon</span>
            </div>
          ))}
        </div>
        <p className="wc-mood">
          {theme.emoji} {theme.mood}
        </p>
      </section>

      {/* ------------------------------------------------ Background */}
      <section className="wc-section">
        <h3 className="wc-h3">Background</h3>
        <div className="wc-bg-grid">
          {theme.backgrounds.map((b) => (
            <button
              key={b.id}
              className={`wc-bg-thumb ${b.id === bgId ? 'on' : ''}`}
              style={{ backgroundImage: `url(${b.src})` }}
              onClick={() => setBackground(b.id)}
              aria-pressed={b.id === bgId}
              title={b.label}
            >
              <span className="wc-bg-label">{b.label}</span>
              {b.id === bgId && <span className="wc-tick small">✓</span>}
            </button>
          ))}
        </div>
        {theme.backgrounds.length === 1 && (
          <p className="wc-note">More {theme.name} backgrounds are on the way.</p>
        )}
      </section>

      {/* ---------------------------------------------------- Accent */}
      <section className="wc-section">
        <h3 className="wc-h3">Accent</h3>
        <div className="wc-accents">
          {theme.accents.map((hex) => (
            <button
              key={hex}
              className={`wc-swatch ${accent === hex ? 'on' : ''}`}
              style={{ background: hex }}
              onClick={() => setAccent(hex)}
              aria-label={`Accent ${hex}`}
            />
          ))}
          <label className="wc-swatch wc-swatch-custom" title="Custom colour">
            <input
              type="color"
              value={accent || theme.palette.accent}
              onChange={(e) => setAccent(e.target.value)}
            />
            <span className="wc-swatch-plus">+</span>
          </label>
        </div>
        {accent && (
          <button className="wc-reset" onClick={() => setAccent(null)}>
            Reset to theme default
          </button>
        )}
      </section>

      {/* ------------------------------------------------ Font colour */}
      <section className="wc-section">
        <h3 className="wc-h3">Font colour</h3>
        <p className="wc-note" style={{ margin: '0 0 10px' }}>
          Override the text colour so it stays readable on any background.
        </p>
        <div className="wc-accents">
          <button
            className={`wc-swatch wc-swatch-auto ${fontColor === null ? 'on' : ''}`}
            onClick={() => setFontColor(null)}
            title="Auto (match theme)"
            aria-label="Auto font colour"
          >
            <span className="wc-auto-label">A</span>
          </button>
          {FONT_COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              className={`wc-swatch ${fontColor === c.hex ? 'on' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setFontColor(c.hex)}
              aria-label={`Font colour ${c.label}`}
              title={c.label}
            />
          ))}
          <label className="wc-swatch wc-swatch-custom" title="Custom font colour">
            <input
              type="color"
              value={fontColor || '#ffffff'}
              onChange={(e) => setFontColor(e.target.value)}
            />
            <span className="wc-swatch-plus">+</span>
          </label>
        </div>
        <p className="wc-preview-line" style={{ color: fontColor ?? 'var(--wood-dark)' }}>
          The quick brown fox — preview text
        </p>
      </section>

      <p className="wc-foot">
        Your theme follows you across the lobby and stays put while you open panels — only stepping
        into a different world (Realm Library, Study Magnet…) changes the scene.
      </p>
    </div>
  )
}
