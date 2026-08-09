import { useEffect, useRef, useState } from 'react'
import type { ReactNode, CSSProperties, MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import './About.css'

/* ------------------------------------------------------------------ */
/*  Reveal — fade + rise on first scroll into view                     */
/* ------------------------------------------------------------------ */
function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children?: ReactNode
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
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' },
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

/* ------------------------------------------------------------------ */
/*  Signature — a gold line-art lily that blooms with scroll           */
/* ------------------------------------------------------------------ */
function BloomLily() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [bloom, setBloom] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scroller = (el.closest('.about') as HTMLElement) || window
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const vh = scroller === window ? window.innerHeight : (scroller as HTMLElement).clientHeight
        const travel = r.height + vh * 0.7
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / travel))
        setBloom(p)
      })
    }
    measure()
    scroller.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  const petals = Array.from({ length: 8 })

  return (
    <div className="bloom" ref={ref} style={{ '--bloom': bloom } as CSSProperties} aria-hidden="true">
      <svg className="bloom__ring" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1 6" opacity="0.6" />
      </svg>
      <svg className="bloom__lily" viewBox="0 0 200 200">
        {petals.map((_, i) => {
          const a = i * 45
          return (
            <g key={i} style={{ transform: `rotate(${a}deg)` }} className="bloom__petal-group">
              <path
                d="M100 100 C 86 74, 84 56, 100 30 C 116 56, 114 74, 100 100 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                className="bloom__petal"
                style={{ transform: `scale(${0.2 + bloom * 0.8})`, opacity: 0.25 + bloom * 0.75 }}
              />
              <path
                d="M100 100 C 92 82, 92 70, 100 52"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity={bloom}
                className="bloom__vein"
              />
            </g>
          )
        })}
        <circle cx="100" cy="100" r={3 + bloom * 9} fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="2" fill="currentColor" opacity={bloom} />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Line icons — realms (no emoji)                                     */
/* ------------------------------------------------------------------ */
function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M4 20V6M4 20h16M20 20V6" />
      <path d="M4 6l8-3 8 3" />
      <path d="M7 9h2M7 12h2M7 15h2" />
      <path d="M12.5 9h2M12.5 12h2M12.5 15h2" />
    </svg>
  )
}
function IconTrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <rect x="4" y="4" width="16" height="9" rx="2" />
      <path d="M4 8h16" />
      <path d="M8 4v4M12 4v4M16 4v4" />
      <path d="M8 13v4M16 13v4" />
      <circle cx="8" cy="18" r="1" />
      <circle cx="16" cy="18" r="1" />
    </svg>
  )
}
function IconCafe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" />
      <path d="M16 9h2.5A1.5 1.5 0 0 1 20 10.5v1A1.5 1.5 0 0 1 18.5 13H16" />
      <path d="M6 4c-1 1-1 2 0 3M10 4c-1 1-1 2 0 3M14 4c-1 1-1 2 0 3" opacity="0.7" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Principles — three precepts                                        */
/* ------------------------------------------------------------------ */
function PrincipleCard({ numeral, title, body }: { numeral: string; title: string; body: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })

  const onMove = (e: MouseEvent) => {
    if (!window.matchMedia('(hover: hover)').matches) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTilt({ rx: (0.5 - py) * 5, ry: (px - 0.5) * 5 })
  }
  const onLeave = () => setTilt({ rx: 0, ry: 0 })

  return (
    <div
      ref={ref}
      className="about-principle"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }}
    >
      <span className="about-principle__numeral">{numeral}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function RealmCard({
  icon,
  title,
  body,
  live,
  liveLabel,
  soonLabel,
}: {
  icon: ReactNode
  title: string
  body: string
  live: boolean
  liveLabel: string
  soonLabel: string
}) {
  return (
    <div className={`about-realm ${live ? '' : 'about-realm--soon'}`}>
      <span className="about-realm__icon">{icon}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      <span className={`about-realm__flag ${live ? 'is-live' : ''}`}>
        {live ? liveLabel : soonLabel}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
const SECTIONS = [
  { id: 'story', label: 'Story' },
  { id: 'principles', label: 'Principles' },
  { id: 'worlds', label: 'Worlds' },
  { id: 'name', label: 'The name' },
  { id: 'vision', label: 'Vision' },
] as const

export function About() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState<string>('story')

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ids = SECTIONS.map((s) => s.id)
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? el.scrollTop / max : 0)
      const mid = el.clientHeight * 0.42
      let current = ids[0]
      for (const id of ids) {
        const node = el.querySelector<HTMLElement>(`#about-${id}`)
        if (node && node.getBoundingClientRect().top <= mid) current = id
      }
      setActive(current)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const scrollTo = (id: string) => {
    const node = rootRef.current?.querySelector<HTMLElement>(`#about-${id}`)
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const principles = [
    { numeral: 'I', title: t('about.philosophy.whyFocus'), body: t('about.philosophy.whyFocusBody') },
    { numeral: 'II', title: t('about.philosophy.whyConsistency'), body: t('about.philosophy.whyConsistencyBody') },
    { numeral: 'III', title: t('about.philosophy.whyVisible'), body: t('about.philosophy.whyVisibleBody') },
  ]

  const realms = [
    { icon: <IconLibrary />, title: t('about.realmLibraryTitle'), body: t('about.realmLibraryDesc'), live: true },
    { icon: <IconTrain />, title: t('about.realmTrainTitle'), body: t('about.realmTrainDesc'), live: false },
    { icon: <IconCafe />, title: t('about.realmCafeTitle'), body: t('about.realmCafeDesc'), live: false },
  ]

  const vision = [t('about.vision1'), t('about.vision2'), t('about.vision3'), t('about.vision4')]
  const beliefParts = t('about.belief').split('\n')

  return (
    <div className="about" ref={rootRef}>
      <div className="about__progress" style={{ transform: `scaleX(${progress})` }} />

      <div className="about__sheet">
        {/* section rail */}
        <nav className="about__rail" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`about__rail-item ${active === s.id ? 'is-active' : ''}`}
              onClick={() => scrollTo(s.id)}
              aria-label={s.label}
            >
              <span className="about__rail-dot" />
            </button>
          ))}
          <span className="about__rail-line" />
        </nav>

        {/* top bar */}
        <div className="about__bar">
          <button className="about__back" onClick={() => navigate('/')}>
            <span aria-hidden="true">←</span> {t('about.backToLobby')}
          </button>
          <button className="about__close" onClick={() => navigate('/')} aria-label={t('about.backToLobby')}>
            ✕
          </button>
        </div>

        {/* hero */}
        <section className="about__hero">
          <Reveal as="span" className="about__kicker" delay={60}>
            {t('about.kicker')}
          </Reveal>
          <Reveal as="h1" className="about__title" delay={140}>
            {t('about.heroTitle')}
          </Reveal>
          <div className="about__scrollcue" aria-hidden="true" />
        </section>

        {/* manifesto */}
        <section className="about__manifest" id="about-story">
          <Reveal as="p" className="about__belief" delay={60}>
            {beliefParts.map((part, i) => (
              <span key={i}>
                {part}
                {i < beliefParts.length - 1 && <br />}
              </span>
            ))}
          </Reveal>
          <Reveal as="p" className="about__manifest-lead" delay={120}>
            {t('about.leadP1')}
          </Reveal>
          <Reveal as="p" className="about__manifest-body" delay={120}>
            {t('about.leadP2')}
          </Reveal>
        </section>

        {/* principles */}
        <section className="about__principles" id="about-principles">
          <Reveal as="div" className="about__eyebrow">
            {t('about.principlesTitle')}
          </Reveal>
          <div className="about__principle-grid">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <PrincipleCard numeral={p.numeral} title={p.title} body={p.body} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* mission */}
        <section className="about__mission">
          <Reveal as="span" className="about__ornament" aria-hidden="true" />
          <Reveal as="h2" className="about__center">
            {t('about.missionTitle')}
          </Reveal>
          <Reveal as="p">{t('about.missionBody')}</Reveal>
        </section>

        {/* realms */}
        <section className="about__realms" id="about-worlds">
          <Reveal as="div" className="about__eyebrow">
            {t('about.realmsTitle')}
          </Reveal>
          <Reveal as="p" className="about__realms-intro">
            {t('about.realmsIntro')}
          </Reveal>
          <div className="about__realm-grid">
            {realms.map((r, i) => (
              <Reveal key={r.title} delay={i * 80}>
                <RealmCard
                  icon={r.icon}
                  title={r.title}
                  body={r.body}
                  live={r.live}
                  liveLabel={t('about.realmOpen')}
                  soonLabel={t('about.realmSoon')}
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* why the lily — signature */}
        <section className="about__lily-story" id="about-name">
          <Reveal as="span" className="about__eyebrow about__eyebrow--center">
            {t('about.nameKicker')}
          </Reveal>
          <Reveal as="h2" className="about__center">
            {t('about.nameTitle')}
          </Reveal>
          <BloomLily />
          <Reveal as="p" className="about__lily-story-body">
            {t('about.nameBody')}
          </Reveal>
        </section>

        {/* vision */}
        <section className="about__vision" id="about-vision">
          <Reveal as="span" className="about__eyebrow about__eyebrow--center">
            {t('about.visionKicker')}
          </Reveal>
          <Reveal as="h2" className="about__center">
            {t('about.visionTitle')}
          </Reveal>
          <Reveal as="p" className="about__vision-intro">
            {t('about.visionIntro')}
          </Reveal>
          <ul>
            {vision.map((v, i) => (
              <Reveal as="li" key={v} delay={i * 110}>
                <span className="about__spark" aria-hidden="true" />
                <span>{v}</span>
              </Reveal>
            ))}
          </ul>
          <Reveal as="p" className="about__more">
            {t('about.visionMore')}
          </Reveal>
        </section>

        {/* footer */}
        <footer className="about__footer">
          <img className="about__footer-logo" src="/icons/focus-lily-logo.png" alt="FocusLily" />
          <div className="about__tag">{t('about.tagline')}</div>
          <button className="about__cta" onClick={() => navigate('/lobby/realm/choose')}>
            {t('about.enterRealm')}
          </button>
        </footer>
      </div>
    </div>
  )
}
