import { useTranslation } from 'react-i18next'
import { useMagnet } from '../../../store/magnet'
import { effectiveThemes, mxpPrice, type MagnetTheme } from '../../../lib/magnet/themes'
import { SectionHead } from '../ui'
import { Icon } from '../Icon'

// The Task Magnet's own store: themes for the magnet world, bought with
// Magnet Power earned by finishing tasks, habits, milestones and goals.
// Nothing here touches the global leaves / rank economy.

export function StoreView() {
  const { t } = useTranslation()
  const themeId = useMagnet((s) => s.data.theme)
  const mxp = useMagnet((s) => s.data.mxp)
  const unlocked = useMagnet((s) => s.data.unlockedThemes)
  const purchaseTheme = useMagnet((s) => s.purchaseTheme)
  const applyTheme = useMagnet((s) => s.applyTheme)

  const themes = effectiveThemes()
  const owned = new Set(unlocked)
  const categories: { key: string; items: MagnetTheme[] }[] = []
  for (const theme of themes) {
    const cat = categories.find((c) => c.key === theme.category)
    if (cat) cat.items.push(theme)
    else categories.push({ key: theme.category, items: [theme] })
  }

  return (
    <div className="mg-view mg-store">
      <SectionHead
        icon="store"
        title={t('store.title')}
        subtitle={t('store.subtitle')}
        action={
          <span className="mg-store-balance" title={t('store.balanceHint')}>
            <Icon name="bag" size={15} /> {mxp.toLocaleString()} {t('store.power')}
          </span>
        }
      />

      <p className="mg-store-note">
        <Icon name="bulb" size={14} /> {t('store.note')}
      </p>

      {categories.map((cat) => (
        <section key={cat.key} className="mg-store-cat">
          <h3 className="mg-store-cat-head">{cat.key}</h3>
          <div className="mg-store-grid">
            {cat.items.map((theme) => {
              const isOwned = owned.has(theme.id)
              const isActive = theme.id === themeId
              const price = mxpPrice(theme)
              const canAfford = mxp >= price
              return (
                <div
                  key={theme.id}
                  className={`mg-themecard ${isActive ? 'active' : ''}`}
                >
                  <div
                    className="mg-themecard-preview"
                    style={
                      {
                        background: theme.vars.bg,
                        '--cv-panel': theme.vars.panel,
                        '--cv-accent': theme.vars.accent,
                        '--cv-accent2': theme.vars.accent2,
                      } as React.CSSProperties
                    }
                  >
                    <span className="mg-cv-glow" />
                    <span className="mg-cv-sun" />
                    <span className="mg-cv-orb" />
                  </div>
                  <div className="mg-themecard-body">
                    <strong className="mg-themecard-name">{theme.name}</strong>
                    <p className="mg-themecard-mood">{theme.mood}</p>
                    <div className="mg-themecard-spec">
                      {theme.particle !== 'none' && (
                        <span className="mg-tag soft">
                          <Icon name="sparkle" size={11} /> {theme.particle}
                        </span>
                      )}
                      {theme.scene !== 'none' && (
                        <span className="mg-tag soft">
                          <Icon name="moon" size={11} /> {theme.scene}
                        </span>
                      )}
                    </div>
                    {isActive ? (
                      <button className="mg-btn primary small" disabled>
                        <Icon name="check" size={14} /> {t('store.active')}
                      </button>
                    ) : isOwned ? (
                      <button className="mg-btn primary small" onClick={() => applyTheme(theme.id)}>
                        <Icon name="spark" size={14} /> {t('store.apply')}
                      </button>
                    ) : (
                      <button
                        className={`mg-btn small ${canAfford ? 'primary' : 'glass'}`}
                        disabled={!canAfford}
                        onClick={() => purchaseTheme(theme.id)}
                      >
                        {canAfford ? t('store.unlock') : t('store.insufficient')} · {price.toLocaleString()}{' '}
                        {t('store.power')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <p className="mg-muted mg-store-foot">{t('store.foot')}</p>
    </div>
  )
}