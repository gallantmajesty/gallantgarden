import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import { useProfile } from '../../../store/profile'
import { useShop } from '../../../shop/store'
import { THEMES, THEME_CATEGORIES } from '../../../lib/magnet/themes'
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
  const { t } = useTranslation()
  const data = useMagnet((s) => s.data)
  const setTheme = useMagnet((s) => s.setTheme)
  const setAccent = useMagnet((s) => s.setAccent)
  const setParticleDensity = useMagnet((s) => s.setParticleDensity)
  const setFont = useMagnet((s) => s.setFont)
  const userXp = useProfile((s) => s.xp)
  const shopOwned = useShop((s) => s.ownedItems)
  const shopPurchase = useShop((s) => s.purchase)

  const totalXp = userXp

  function handleBuyTheme(themeId: string, price: number) {
    const newLeaves = shopPurchase(themeId, price, totalXp)
    if (newLeaves !== totalXp) {
      // Deduct leaves from profile
      useProfile.setState({ xp: newLeaves })
      // Also add to magnet's unlockedThemes so the theme system stays in sync
      useMagnet.setState((s) => ({
        data: { ...s.data, unlockedThemes: [...new Set([...s.data.unlockedThemes, themeId])] }
      }))
    }
  }

  return (
    <div className="mg-view">
      <SectionHead
        icon="palette"
        title={t('themes.title')}
        subtitle={t('themes.subtitle')}
      />

      {/* leaf balance display */}
      <Panel className="mg-prefs">
        <div className="mg-pref">
          <span className="mg-field-label"><img src="/icons/leaf.png" alt="" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 4 }} /> Leaves</span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>
            {totalXp.toLocaleString()}
          </span>
        </div>
      </Panel>

      {/* live preferences */}
      <Panel className="mg-prefs">
        <div className="mg-pref">
          <span className="mg-field-label">{t('themes.accentColor')}</span>
          <div className="mg-swatches">
            <button
              className={`mg-swatch theme-default ${data.accent === null ? 'active' : ''}`}
              onClick={() => setAccent(null)}
              title={t('themes.themeDefault')}
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
          <span className="mg-field-label">{t('themes.particleDensity')}</span>
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
          <span className="mg-field-label">{t('themes.font')}</span>
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
                const owned = data.unlockedThemes.includes(t.id) || shopOwned.includes(t.id)
                const active = data.themeId === t.id
                const v = t.vars
                const canBuy = !owned && t.leafPrice > 0 && totalXp >= t.leafPrice
                const isFree = t.leafPrice === 0
                return (
                  <button
                    key={t.id}
                    className={`mg-themecard ${active ? 'active' : ''} ${owned ? '' : 'locked'}`}
                    onClick={() => {
                      if (owned) {
                        setTheme(t.id)
                      } else if (canBuy || isFree) {
                        handleBuyTheme(t.id, t.leafPrice)
                      }
                    }}
                    disabled={!owned && !canBuy && !isFree}
                  >
                    <span className="mg-themecard-preview" style={{ background: v.bg }}>
                      <span className="mg-themecard-glow" style={{ background: v.glowA }} />
                      <span className="mg-themecard-chip" style={{ background: v.accent }} />
                      <span className="mg-themecard-chip2" style={{ background: v.accent2 }} />
                      {!owned && !isFree && (
                        <span className="mg-themecard-lock">
                          <Icon name="vault" size={14} /> <img src="/icons/leaf.png" alt="" style={{ width: 12, height: 12, verticalAlign: 'middle' }} /> {t.leafPrice}
                        </span>
                      )}
                      {!owned && isFree && (
                        <span className="mg-themecard-lock">
                          Free
                        </span>
                      )}
                      {owned && (
                        <span className="mg-themecard-active">
                          <Icon name="check" size={14} />
                        </span>
                      )}
                    </span>
                    <span className="mg-themecard-meta">
                      <strong>{t.name}</strong>
                      <small>{t.mood}</small>
                      {!owned && !isFree && (
                        <small style={{ color: canBuy ? '#6fe0a0' : '#ff6a6a', fontWeight: 700 }}>
                          <img src="/icons/leaf.png" alt="" style={{ width: 12, height: 12, verticalAlign: 'middle' }} /> {t.leafPrice} {canBuy ? '(Buy)' : '(Need more leaves)'}
                        </small>
                      )}
                      {owned && <small style={{ color: '#6fe0a0' }}>Owned</small>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="mg-themes-foot">
        Earn leaves by studying in rooms, the Train, or the Library.
      </p>
    </div>
  )
}
