import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './StickyEntry.css'

export function StickyEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="sticky-entry-root">
      <button className="sf-btn secondary back-btn" onClick={() => navigate('/')}>
        ← {t('common.lobby')}
      </button>

      <div className="sticky-entry-stage">
        <div className="sticky-entry-head">
          <span className="sf-pill">{t('stickyEntry.pill')}</span>
          <h1>{t('stickyEntry.title')}</h1>
          <p>{t('stickyEntry.subtitle')}</p>
        </div>

        <div className="sticky-choices">
          <button className="sticky-choice custom" onClick={() => navigate('/blueprint')}>
            <div className="choice-art choice-art-custom">
              <span className="custom-note c1" />
              <span className="custom-note c2" />
              <span className="custom-note c3" />
              <span className="custom-string s1" />
              <span className="custom-string s2" />
            </div>
            <h2>{t('stickyEntry.customTitle')}</h2>
            <p>{t('stickyEntry.customDescription')}</p>
            <span className="choice-cta">{t('stickyEntry.openBoard')}</span>
          </button>

          <button className="sticky-choice casual soon" disabled>
            <div className="choice-art choice-art-casual">
              <span className="casual-row" />
              <span className="casual-row" />
              <span className="casual-row" />
              <span className="casual-card" />
            </div>
            <h2>{t('stickyEntry.casualTitle')}</h2>
            <p>{t('stickyEntry.casualDescription')}</p>
            <span className="choice-cta soon-tag">{t('common.soon')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}