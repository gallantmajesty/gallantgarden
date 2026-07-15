import { useEffect, useRef, useState } from 'react'
import type { ReactNode, CSSProperties, MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './About.css'

function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: any
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`about-reveal ${shown ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

function Lily({ pond = false }: { pond?: boolean }) {
  const petals = Array.from({ length: 8 })
  return (
    <div className={`lily ${pond ? 'lily--pond' : ''}`} aria-hidden="true">
      <div className="lily__glow" />
      {petals.map((_, i) => (
        <span
          key={i}
          className="lily__petal"
          style={{ '--a': `${i * 45}deg`, '--d': `${i * 70}ms` } as CSSProperties}
        />
      ))}
      <span className="lily__core" />
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 })

  const onMove = (e: MouseEvent) => {
    if (!window.matchMedia('(hover: hover)').matches) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTilt({ rx: (0.5 - py) * 14, ry: (px - 0.5) * 14, gx: px * 100, gy: py * 100 })
  }
  const onLeave = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })

  return (
    <div
      ref={ref}
      className="about-feature"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        {
          transform: `perspective(720px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          '--gx': `${tilt.gx}%`,
          '--gy': `${tilt.gy}%`,
        } as CSSProperties
      }
    >
      <div className="about-feature__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function LilyPond() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [grow, setGrow] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scroller = (el.closest('.about') as HTMLElement) || null
    const onScroll = () => {
      const vh = scroller ? scroller.clientHeight : window.innerHeight
      const r = el.getBoundingClientRect()
      const start = vh * 0.82
      const prog = Math.min(1, Math.max(0, (start - r.top) / (r.height + vh * 0.45)))
      setGrow(prog)
    }
    onScroll()
    const target = scroller || window
    target.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div className="pond" ref={ref} style={{ '--grow': grow } as CSSProperties}>
      <span className="pond__ripple" />
      <span className="pond__ripple pond__ripple--2" />
      <div className="pond__lily">
        <Lily pond />
      </div>
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? el.scrollTop / max : 0)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    { icon: '🌙', title: t('about.feature1Title'), body: t('about.feature1Body') },
    { icon: '🪷', title: t('about.feature2Title'), body: t('about.feature2Body') },
    { icon: '👤', title: t('about.feature3Title'), body: t('about.feature3Body') },
    { icon: '🤝', title: t('about.feature4Title'), body: t('about.feature4Body') },
    { icon: '📈', title: t('about.feature5Title'), body: t('about.feature5Body') },
  ]
  const vision = [t('about.vision1'), t('about.vision2'), t('about.vision3'), t('about.vision4')]
  const beliefParts = t('about.belief').split('\n')

  return (
    <div className="about" ref={rootRef}>
      <div className="about__progress" style={{ transform: `scaleX(${progress})` }} />

      <div className="about__sheet">
        <button className="about__close" onClick={() => navigate('/')} aria-label={t('about.backToLobby')}>
          ✕
        </button>

        <section className="about__hero">
          <Reveal className="about__hero-lily" delay={60}>
            <img className="about-logo" src="/icons/focus-lily-logo.png" alt="FocusLily" />
          </Reveal>
          <Reveal as="span" className="about__kicker" delay={160}>
            {t('about.kicker')}
          </Reveal>
          <Reveal as="h1" className="about__title" delay={220}>
            {t('about.heroTitle')}
          </Reveal>
          <Reveal as="p" className="about__belief" delay={300}>
            {beliefParts.map((part, i) => (
              <span key={i}>
                {part}
                {i < beliefParts.length - 1 && <br />}
              </span>
            ))}
          </Reveal>
        </section>

        <Reveal as="section" className="about__lead">
          <p>{t('about.leadP1')}</p>
          <p>{t('about.leadP2')}</p>
        </Reveal>

        <Reveal as="section" className="about__mission">
          <h2>{t('about.missionTitle')}</h2>
          <p>{t('about.missionBody')}</p>
        </Reveal>

        <section className="about__different">
          <Reveal as="h2" className="about__center">
            {t('about.differentTitle')}
          </Reveal>
          <div className="about__features">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <FeatureCard icon={f.icon} title={f.title} body={f.body} />
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal as="section" className="about__vision">
          <h2>{t('about.visionTitle')}</h2>
          <p>{t('about.visionIntro')}</p>
          <ul>
            {vision.map((v, i) => (
              <Reveal as="li" key={v} delay={i * 110}>
                <span className="about__spark">✦</span>
                {v}
              </Reveal>
            ))}
          </ul>
          <p className="about__more">{t('about.visionMore')}</p>
        </Reveal>

        <Reveal as="section" className="about__name">
          <h2>{t('about.nameTitle')}</h2>
          <LilyPond />
          <p>{t('about.nameBody')}</p>
        </Reveal>

        <footer className="about__footer">
          <img className="about__footer-logo" src="/icons/focus-lily-logo.png" alt="FocusLily" />
          <div className="about__tag">{t('about.tagline')}</div>
          <button className="sf-btn about__cta" onClick={() => navigate('/realm')}>
            {t('about.enterRealm')}
          </button>
        </footer>
      </div>
    </div>
  )
}
