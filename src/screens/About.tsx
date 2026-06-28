import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './About.css'

export function About() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const features = [
    { icon: '🌙', title: t('about.feature1Title'), body: t('about.feature1Body') },
    { icon: '🪷', title: t('about.feature2Title'), body: t('about.feature2Body') },
    { icon: '👤', title: t('about.feature3Title'), body: t('about.feature3Body') },
    { icon: '🤝', title: t('about.feature4Title'), body: t('about.feature4Body') },
    { icon: '📈', title: t('about.feature5Title'), body: t('about.feature5Body') },
  ]

  const vision = [
    t('about.vision1'),
    t('about.vision2'),
    t('about.vision3'),
    t('about.vision4'),
  ]

  return (
    <div className="about">
      <div className="about__sheet">
        <button className="about__close" onClick={() => navigate('/')} aria-label={t('about.backToLobby')}>✕</button>

        <section className="about__hero">
          <div className="about__lily">🪷</div>
          <span className="about__kicker">{t('about.kicker')}</span>
          <h1>{t('about.heroTitle')}</h1>
          <p className="about__belief">{t('about.belief')}</p>
        </section>

        <section className="about__lead">
          <p>{t('about.leadP1')}</p>
          <p>{t('about.leadP2')}</p>
        </section>

        <section className="about__mission">
          <h2>{t('about.missionTitle')}</h2>
          <p>{t('about.missionBody')}</p>
        </section>

        <section>
          <h2 className="about__center">{t('about.differentTitle')}</h2>
          <div className="about__features">
            {features.map((f) => (
              <div key={f.title} className="about__feature">
                <div className="about__feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about__vision">
          <h2>{t('about.visionTitle')}</h2>
          <p>{t('about.visionIntro')}</p>
          <ul>
            {vision.map((v) => (
              <li key={v}><span>✦</span>{v}</li>
            ))}
          </ul>
          <p className="about__more">{t('about.visionMore')}</p>
        </section>

        <section className="about__name">
          <h2>{t('about.nameTitle')}</h2>
          <p>{t('about.nameBody')}</p>
        </section>

        <footer className="about__footer">
          <div className="about__lily about__lily--sm">🪷</div>
          <div className="about__tag">{t('about.tagline')}</div>
          <button className="sf-btn about__cta" onClick={() => navigate('/rooms')}>{t('about.enterRealm')}</button>
        </footer>
      </div>
    </div>
  )
}