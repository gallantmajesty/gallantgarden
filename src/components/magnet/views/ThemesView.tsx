import { useMagnet } from '../../../store/magnet'
import { THEMES, THEME_CATEGORIES, getTheme } from '../../../lib/magnet/themes'
import { levelForXp } from '../../../lib/magnet/types'
import { SectionHead, Panel } from '../ui'
import { Icon } from '../Icon'

const ACCENTS = [
  '#ff6f9c',
  '#9a6cff',
  '#46d6a0',
  '#ffb454',
  '#4fd1e0',
  '#ff5d6c',
  '#7aa2ff',
  '#ff77c2',
  '#6fe0a0',
  '#ff7a1a',
  '#4fe0ff',
  '#d9a23a',
  '#a877ff',
  '#37e6ff',
  '#ff5246',
  '#7ce05a',
]
const FONTS = ['Inter', 'Georgia', 'Courier New', 'Trebuchet MS', 'Palatino Linotype', 'Verdana', 'Garamond', 'Consolas']

export function ThemesView() {
  const data = useMagnet((s) => s.data)
  const setTheme = useMagnet((s) => s.setTheme)
  const setAccent = useMagnet((s) => s.setAccent)
  const setParticleDensity = useMagnet((s) => s.setParticleDensity)
  const setFont = useMagnet((s) => s.setFont)

  const level = levelForXp(data.xp)

  return (
    <div className="mg-view">
      <SectionHead
        icon="palette"
        title="Personalize"
        subtitle="Reshape your whole world — themes unlock as you grow"
      />

      {/* live preferences */}
      <Panel className="mg-prefs">
        <div className="mg-pref">
          <span className="mg-field-label">Accent color</span>
          <div className="mg-swatches">
            <button
              className={`mg-swatch theme-default ${data.accent === null ? 'active' : ''}`}
              onClick={() => setAccent(null)}
              title="Theme default"
            >
              <Icon name="palette" size={14} />
            </button>
            {ACCENTS.map((c) => (
              <button
                key={c}
                className={`mg-swatch ${data.accent === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setAccent(c)}
              />
            ))}
          </div>
        </div>

        <div className="mg-pref">
          <span className="mg-field-label">Particle density</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={data.particleDensity}
            onChange={(e) => setParticleDensity(Number(e.target.value))}
          />
        </div>

        <div className="mg-pref">
          <span className="mg-field-label">Font</span>
          <select value={data.font} onChange={(e) => setFont(e.target.value)}>
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </Panel>

      {/* themes grouped by category */}
      {THEME_CATEGORIES.map((cat) => {
        const themes = THEMES.filter((t) => t.category === cat)
        if (themes.length === 0) return null
        return (
          <div key={cat} className="mg-themegroup">
            <h3 className="mg-themegroup-head">{cat}</h3>
            <div className="mg-themegrid">
              {themes.map((t) => {
                const owned = data.unlockedThemes.includes(t.id)
                const active = data.themeId === t.id
                const v = t.vars
                return (
                  <button
                    key={t.id}
                    className={`mg-themecard ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                    onClick={() => owned && setTheme(t.id)}
                    disabled={!owned}
                  >
                    <span className="mg-themecard-preview" style={{ background: v.bg }}>
                      <span className="mg-themecard-glow" style={{ background: v.glowA }} />
                      <span className="mg-themecard-chip" style={{ background: v.accent }} />
                      <span className="mg-themecard-chip2" style={{ background: v.accent2 }} />
                      {!owned && (
                        <span className="mg-themecard-lock">
                          <Icon name="vault" size={16} /> Lv {t.unlockLevel}
                        </span>
                      )}
                      {active && (
                        <span className="mg-themecard-active">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                    </span>
                    <span className="mg-themecard-meta">
                      <strong>{t.name}</strong>
                      <small>{t.mood}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="mg-themes-foot">
        <Icon name="spark" size={14} /> You're level {level}. Keep completing tasks, focusing and building
        habits — every level opens new worlds. Preview of the active theme:{' '}
        <strong>{getTheme(data.themeId).name}</strong>.
      </p>
    </div>
  )
}
