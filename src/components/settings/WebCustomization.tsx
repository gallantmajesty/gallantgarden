import { useTranslation } from 'react-i18next'
import { useWebTheme } from '../../store/webTheme'
import {
  FONT_COLOR_PRESETS,
  WEB_THEMES,
  WEB_THEMES_SOON,
  getWebTheme,
} from '../../lib/webThemes'
import { Slider } from './controls'
import './WebCustomization.css'

export function WebCustomizationContent({ showAppearance = false }: { showAppearance?: boolean }) {
  const { t } = useTranslation()
  const themeId = useWebTheme((s) => s.themeId)
  const bgId = useWebTheme((s) => s.bgId)
  const accent = useWebTheme((s) => s.accent)
  const fontColor = useWebTheme((s) => s.fontColor)
  const bgBrightness = useWebTheme((s) => s.bgBrightness ?? 1)
  const bgContrast = useWebTheme((s) => s.bgContrast ?? 1)
  const bgSaturation = useWebTheme((s) => s.bgSaturation ?? 1)
  const setTheme = useWebTheme((s) => s.setTheme)
  const setBackground = useWebTheme((s) => s.setBackground)
  const setAccent = useWebTheme((s) => s.setAccent)
  const setFontColor = useWebTheme((s) => s.setFontColor)
  const setBgBrightness = useWebTheme((s) => s.setBgBrightness)
  const setBgContrast = useWebTheme((s) => s.setBgContrast)
  const setBgSaturation = useWebTheme((s) => s.setBgSaturation)

  const theme = getWebTheme(themeId)

  return (
    <div className="wc">
      <section className="wc-section">
        <h3 className="wc-h3">{t('webCustomization.theme')}</h3>
        <div className="wc-theme-grid">
          {WEB_THEMES.map((wt) => (
            <button
              key={wt.id}
              className={`wc-theme-card ${wt.id === themeId ? 'on' : ''}`}
              style={{ backgroundImage: `url(${wt.backgrounds[0].src})` }}
              onClick={() => setTheme(wt.id)}
              aria-pressed={wt.id === themeId}
            >
              <span className="wc-theme-veil" />
              <span className="wc-theme-meta">
                <span className="wc-theme-emoji">{wt.emoji}</span>
                <span className="wc-theme-name">{wt.name}</span>
              </span>
              {wt.id === themeId && <span className="wc-tick">✓</span>}
            </button>
          ))}
          {WEB_THEMES_SOON.map((wt) => (
            <div key={wt.id} className="wc-theme-card soon" aria-disabled>
              <span className="wc-theme-veil" />
              <span className="wc-theme-meta">
                <span className="wc-theme-emoji">{wt.emoji}</span>
                <span className="wc-theme-name">{wt.name}</span>
              </span>
              <span className="wc-soon-tag">{t('common.soon')}</span>
            </div>
          ))}
        </div>
        <p className="wc-mood">
          {theme.emoji} {theme.mood}
        </p>
      </section>

      <section className="wc-section">
        <h3 className="wc-h3">{t('webCustomization.background')}</h3>
        <div className="wc-bg-grid">
          {theme.backgrounds.map((b) => {
            const noFilterBgs = ['cozy-study-desk', 'anime-study-night', 'moonlit-oak', 'love-pink-cloud', 'silent-ruins', 'fantasy-kingdom', 'dark-fantasy-castle']
            return (
            <button
              key={b.id}
              className={`wc-bg-thumb ${b.id === bgId ? 'on' : ''} ${noFilterBgs.includes(b.id) ? 'no-filter' : ''}`}
              style={{ backgroundImage: `url(${b.src})` }}
              onClick={() => setBackground(b.id)}
              aria-pressed={b.id === bgId}
              title={b.label}
            >
              <span className="wc-bg-label">{b.label}</span>
              {b.id === bgId && <span className="wc-tick small">✓</span>}
            </button>
            )
          })}
        </div>
        {theme.backgrounds.length === 1 && (
          <p className="wc-note">{t('webCustomization.moreBackgrounds', { theme: theme.name })}</p>
        )}
      </section>

      {showAppearance && (
        <section className="wc-section">
          <h3 className="wc-h3">{t('webCustomization.appearance')}</h3>
          <div className="wc-sliders">
            <Slider
              label={t('webCustomization.bgBrightness')}
              value={bgBrightness}
              min={0.2}
              max={2.0}
              step={0.05}
              display={`×${bgBrightness.toFixed(2)}`}
              onChange={setBgBrightness}
            />
            <Slider
              label={t('webCustomization.bgContrast')}
              value={bgContrast}
              min={0.2}
              max={2.0}
              step={0.05}
              display={`×${bgContrast.toFixed(2)}`}
              onChange={setBgContrast}
            />
            <Slider
              label={t('webCustomization.bgSaturation')}
              value={bgSaturation}
              min={0}
              max={2.0}
              step={0.05}
              display={`×${bgSaturation.toFixed(2)}`}
              onChange={setBgSaturation}
            />
          </div>
        </section>
      )}

      <section className="wc-section">
        <h3 className="wc-h3">{t('webCustomization.accent')}</h3>
        <div className="wc-accents">
          {theme.accents.map((hex) => (
            <button
              key={hex}
              className={`wc-swatch ${accent === hex ? 'on' : ''}`}
              style={{ background: hex }}
              onClick={() => setAccent(hex)}
              aria-label={t('webCustomization.accentColor', { hex })}
            />
          ))}
          <label className="wc-swatch wc-swatch-custom" title={t('webCustomization.customColour')}>
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
            {t('webCustomization.resetToDefault')}
          </button>
        )}
      </section>

      <section className="wc-section">
        <h3 className="wc-h3">{t('webCustomization.fontColour')}</h3>
        <p className="wc-note" style={{ margin: '0 0 10px' }}>
          {t('webCustomization.fontColourDescription')}
        </p>
        <div className="wc-accents">
          <button
            className={`wc-swatch wc-swatch-auto ${fontColor === null ? 'on' : ''}`}
            onClick={() => setFontColor(null)}
            title={t('webCustomization.autoMatchTheme')}
            aria-label={t('webCustomization.autoFontColour')}
          >
            <span className="wc-auto-label">A</span>
          </button>
          {FONT_COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              className={`wc-swatch ${fontColor === c.hex ? 'on' : ''}`}
              style={{ background: c.hex }}
              onClick={() => setFontColor(c.hex)}
              aria-label={t('webCustomization.fontColourLabel', { label: c.label })}
              title={c.label}
            />
          ))}
          <label className="wc-swatch wc-swatch-custom" title={t('webCustomization.customFontColour')}>
            <input
              type="color"
              value={fontColor || '#ffffff'}
              onChange={(e) => setFontColor(e.target.value)}
            />
            <span className="wc-swatch-plus">+</span>
          </label>
        </div>
      </section>

      <p className="wc-foot">
        {t('webCustomization.footNote')}
      </p>
    </div>
  )
}