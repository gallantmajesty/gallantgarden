// @ts-nocheck
import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import './Landing.css'

const Antigravity = lazy(() => import('./Antigravity'))
const ScrollVelocity = lazy(() => import('./ScrollVelocity'))
const Snowfall = lazy(() => import('../../components/Snowfall'))

/* ═══ Scroll reveal hook ═══ */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fl-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('.fl-scene').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ═══ Scroll spy hook ═══ */
function useScrollSpy() {
  const [activeSection, setActiveSection] = useState('hero')
  useEffect(() => {
    const sections = ['hero', 'philosophy', 'world', 'features', 'roadmap', 'faq', 'farewell']
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { threshold: 0.3, rootMargin: '-50px 0px -50% 0px' }
    )
    sections.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])
  return activeSection
}

/* ═══ Scroll fade hook — returns 0..1 opacity based on scroll past hero ═══ */
function useScrollFade() {
  const [opacity, setOpacity] = useState(1)
  useEffect(() => {
    function onScroll() {
      const hero = document.getElementById('hero')
      if (!hero) return
      const rect = hero.getBoundingClientRect()
      const fadeStart = 0
      const fadeEnd = -rect.height * 0.6
      if (rect.bottom <= fadeStart) {
        setOpacity(0)
      } else if (rect.bottom <= -fadeEnd) {
        setOpacity(Math.max(0, rect.bottom / (-fadeEnd)))
      } else {
        setOpacity(1)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return opacity
}

/* ═══ Performance utilities ═══ */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}
const shouldReduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false
  const hw = navigator.hardwareConcurrency
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  return isMobile && (hw !== undefined ? hw < 4 : true)
}

/* ═══ Hyper-realistic 2D canvas scene ═══ */
function useCanvasScene(canvasRef: React.RefObject<HTMLCanvasElement>, scrollRef: React.RefObject<number>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = shouldReduceMotion()
    const lowEnd = isLowEndDevice()
    let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * DPR
      canvas.height = H * DPR
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    const debouncedResize = debounce(resize, 150)
    window.addEventListener('resize', debouncedResize, { passive: true })

    /* ── Mouse parallax (skip on reduced motion) ── */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    let onMouse: ((e: MouseEvent) => void) | null = null
    if (!reduceMotion) {
      onMouse = (e: MouseEvent) => {
        mouse.tx = (e.clientX / W - 0.5) * 40
        mouse.ty = (e.clientY / H - 0.5) * 25
      }
      window.addEventListener('mousemove', onMouse, { passive: true })
    }

    /* ── Stars (3 layers, varied warmth) ── */
    const starLayers = [
      Array.from({ length: lowEnd ? 80 : 220 }, () => ({
        x: Math.random(), y: Math.random() * 0.52,
        r: Math.random() * 0.7 + 0.15,
        b: Math.random() * 0.45 + 0.25,
        tw: Math.random() * 2.2 + 0.4, ph: Math.random() * Math.PI * 2,
        hue: 195 + Math.random() * 55, depth: 0.04,
      })),
      Array.from({ length: lowEnd ? 40 : 130 }, () => ({
        x: Math.random(), y: Math.random() * 0.38,
        r: Math.random() * 1.4 + 0.4,
        b: Math.random() * 0.4 + 0.45,
        tw: Math.random() * 1.4 + 0.3, ph: Math.random() * Math.PI * 2,
        hue: 28 + Math.random() * 45, depth: 0.10,
      })),
      Array.from({ length: lowEnd ? 10 : 45 }, () => ({
        x: Math.random(), y: Math.random() * 0.28,
        r: Math.random() * 2.1 + 0.9,
        b: 0.65 + Math.random() * 0.35,
        tw: Math.random() * 0.9 + 0.2, ph: Math.random() * Math.PI * 2,
        hue: 45 + Math.random() * 22, depth: 0.18,
      })),
    ]

    let time = 0
    let raf = 0
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const draw = () => {
      time += 0.008
      mouse.x = lerp(mouse.x, mouse.tx, 0.036)
      mouse.y = lerp(mouse.y, mouse.ty, 0.036)
      const scroll = scrollRef.current || 0
      const scrollMax = document.body.scrollHeight - H
      const scrollNorm = scrollMax > 0 ? Math.min(Math.max(scroll / scrollMax, 0), 1) : 0

      ctx.clearRect(0, 0, W, H)

      /* ═══ SKY GRADIENT ═══ */
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0,    '#010206')
      sky.addColorStop(0.12, '#030714')
      sky.addColorStop(0.28, '#060c1e')
      sky.addColorStop(0.48, '#080f22')
      sky.addColorStop(0.65, '#091420')
      sky.addColorStop(0.82, '#070f18')
      sky.addColorStop(1,    '#030810')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      /* ═══ STARS ═══ */
      starLayers.forEach((layer) => {
        layer.forEach((s) => {
          const tw = Math.sin(time * s.tw + s.ph) * 0.38 + 0.62
          const sx = s.x * W + mouse.x * s.depth
          const sy = s.y * H + mouse.y * s.depth - scrollNorm * s.depth * 80
          const r  = s.r * tw
          ctx.beginPath()
          ctx.arc(sx, sy, r, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${s.hue},28%,92%,${s.b * tw})`
          ctx.fill()
          if (s.r > 1.1) {
            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4)
            sg.addColorStop(0, `hsla(${s.hue},40%,82%,${s.b * tw * 0.12})`)
            sg.addColorStop(1, 'transparent')
            ctx.fillStyle = sg
            ctx.beginPath()
            ctx.arc(sx, sy, r * 4, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      })

      /* ═══ MOON ═══ */
      const moonX = W * 0.76 + mouse.x * 0.08 - scrollNorm * 28
      const moonY = H * 0.13 + mouse.y * 0.05 - scrollNorm * 18
      const moonR = Math.min(W, H) * 0.042

      // Wide atmosphere halo
      const atm = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 14)
      atm.addColorStop(0, 'rgba(245,205,80,0.048)')
      atm.addColorStop(0.22, 'rgba(210,175,125,0.022)')
      atm.addColorStop(0.5, 'rgba(160,140,100,0.008)')
      atm.addColorStop(1, 'transparent')
      ctx.fillStyle = atm
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR * 14, 0, Math.PI * 2)
      ctx.fill()

      // Inner glow corona
      const corona = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 5)
      corona.addColorStop(0, 'rgba(248,242,230,0.15)')
      corona.addColorStop(0.35, 'rgba(244,210,80,0.05)')
      corona.addColorStop(1, 'transparent')
      ctx.fillStyle = corona
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2)
      ctx.fill()

      // Moon body with gradient
      const body = ctx.createRadialGradient(moonX - moonR * 0.28, moonY - moonR * 0.22, 0, moonX, moonY, moonR)
      body.addColorStop(0, '#fffef6')
      body.addColorStop(0.45, '#f8f0d2')
      body.addColorStop(0.8, '#eadcaa')
      body.addColorStop(1, '#c8b88a')
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2)
      ctx.fill()

      // Mare (dark patches)
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#b0a080'
      ctx.beginPath()
      ctx.ellipse(moonX - moonR * 0.22, moonY - moonR * 0.08, moonR * 0.28, moonR * 0.18, 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(moonX + moonR * 0.18, moonY + moonR * 0.22, moonR * 0.18, moonR * 0.12, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(moonX - moonR * 0.08, moonY + moonR * 0.35, moonR * 0.13, moonR * 0.09, 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      /* ═══ VIGNETTE ═══ */
      const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.95)
      vig.addColorStop(0, 'transparent')
      vig.addColorStop(0.7, 'rgba(0,0,0,0.22)')
      vig.addColorStop(1, 'rgba(0,0,0,0.65)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // Hard bottom vignette to ground everything
      const bottomVig = ctx.createLinearGradient(0, H * 0.85, 0, H)
      bottomVig.addColorStop(0, 'transparent')
      bottomVig.addColorStop(1, 'rgba(1,3,2,0.88)')
      ctx.fillStyle = bottomVig
      ctx.fillRect(0, H * 0.85, W, H * 0.15)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', debouncedResize)
      if (onMouse) window.removeEventListener('mousemove', onMouse)
    }
  }, [])
}

export function Landing() {
  const navigate = useNavigate()
  const { signInWithProvider } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)
  const philParticlesRef = useRef<HTMLDivElement>(null)
  const philMouseRef = useRef({ x: 0, y: 0 })
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const activeSection = useScrollSpy()
  const snowfallOpacity = useScrollFade()

  const toggleFaq = useCallback((index: number) => {
    setFaqOpen(prev => prev === index ? null : index)
  }, [])

  useScrollReveal()
  useCanvasScene(canvasRef, scrollRef)

  useEffect(() => {
    const onScroll = () => { scrollRef.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goToApp = useCallback(() => {
    navigate('/rooms')
  }, [navigate])

  const [shootingStar, setShootingStar] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setShootingStar(true)
      setTimeout(() => setShootingStar(false), 2200)
    }, 8000 + Math.random() * 6000)
    return () => clearInterval(interval)
  }, [])

  // Lantern scroll reveal + particles fade
  useEffect(() => {
    const section = document.getElementById('philosophy')
    if (!section) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        // particles fade
        if (philParticlesRef.current) {
          philParticlesRef.current.style.opacity = visible ? '1' : '0'
        }
        // lantern slide-in
        const lanterns = section.querySelectorAll('.fl-big-lantern')
        lanterns.forEach(l => {
          l.classList.toggle('fl-big-lantern--visible', visible)
        })
      },
      { threshold: [0, 0.1, 0.3] }
    )

    obs.observe(section)
    return () => obs.disconnect()
  }, [])

  const faqs = [
    { q: 'Is Focus Lily free?', a: 'Create an account to access the core features — pomodoro timer, study rooms, task magnet, notes, and more. Premium themes and avatar items are available as optional upgrades.' },
    { q: 'What makes this different from other study apps?', a: 'Focus Lily is a world, not a widget. It builds a living environment around your study habits — a real place you return to, with ambient audio, 3D spaces, and a social presence.' },
    { q: 'Can I study with friends?', a: 'Yes. Study rooms support real-time co-presence. Friends see each other, hear ambient audio together, and stay accountable.' },
    { q: 'Does it work on mobile?', a: 'Focus Lily works on mobile browsers today. The experience is optimized for smaller screens with touch controls.' },
  ]

  const realms = [
    { id: 'library', name: 'Library', color: '#D9A441', top: '25%', left: '18%', desc: 'A grand old library with towering shelves, warm lamplight, and the smell of aged paper. Deep focus among ten thousand books.', active: true },
    { id: 'train', name: 'Train', color: '#C47832', top: '58%', left: '32%', desc: 'A vintage locomotive rolling through misty countryside. Rhythmic motion, clicking rails, and the world drifting by.', active: true },
    { id: 'coming1', name: 'Coming Soon', color: '#6B5A4A', top: '35%', left: '52%', desc: '', active: false },
    { id: 'coming2', name: 'Coming Soon', color: '#5A4A3A', top: '50%', left: '68%', desc: '', active: false },
    { id: 'coming3', name: 'Coming Soon', color: '#4A3A2A', top: '38%', left: '82%', desc: '', active: false },
  ]

  return (
    <div className="fl-root">
      <canvas ref={canvasRef} className="fl-canvas" aria-hidden="true" />

      {shootingStar && <div className="fl-shooting-star" />}

      {/* ═══ NAV ═══ */}
      <nav className="fl-nav">
        <a href="/" className="fl-nav__brand">
          <span className="fl-nav__logo-ring">
            <img src="/android-chrome-192x192.png" alt="" className="fl-nav__logo" />
          </span>
          Focus Lily
        </a>
        <div className={`fl-nav__links-wrapper ${mobileNavOpen ? 'fl-nav__links-wrapper--open' : ''}`}>
          <div className="fl-nav__links">
            {[
              { href: '#philosophy', label: 'Philosophy' },
              { href: '#world', label: 'World' },
              { href: '#features', label: 'Features' },
              { href: '#wisdom', label: 'Wisdom' },
              { href: '#faq', label: 'FAQ' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`fl-nav__link ${activeSection === href.slice(1) ? 'fl-nav__link--active' : ''}`}
                aria-current={activeSection === href.slice(1) ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setMobileNavOpen(false)
                  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                }}
              >{label}</a>
            ))}
          </div>
          <div className="fl-nav__cta">
            <button className="fl-btn fl-btn--wood fl-btn--sm" onClick={goToApp}>
              <span className="fl-btn__inner">Enter the Forest</span>
              <span className="fl-btn__shimmer" />
            </button>
          </div>
        </div>
        <button
          className={`fl-nav__hamburger ${mobileNavOpen ? 'fl-nav__hamburger--open' : ''}`}
          aria-label="Menu"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ═══ SCENE 1 — HERO ═══ */}
      <section className="fl-scene fl-scene--hero" id="hero">
        <Suspense fallback={null}>
          <Snowfall
            count={120}
            speedMin={0.4}
            speedMax={1.8}
            sizeMin={1}
            sizeMax={3.5}
            opacityMin={20}
            opacityMax={70}
            wind={-0.3}
            windVariation={0.6}
            color="#ffffff"
            style={{ opacity: snowfallOpacity, transition: 'opacity 0.1s linear', zIndex: 2 }}
          />
        </Suspense>
        <div className="fl-world-fog" />
        <div className="fl-fg-branch fl-fg-branch--left" />
        <div className="fl-fg-branch fl-fg-branch--right" />

        {/* Deep background castle — far right */}
        <div className="fl-castle" aria-hidden="true">
          <div className="fl-castle__mist" />
          <div className="fl-castle__base" />
          {/* Main keep */}
          <div className="fl-castle__keep">
            <div className="fl-castle__battlement" />
            <div className="fl-castle__window fl-castle__window--1" />
            <div className="fl-castle__window fl-castle__window--2" />
            <div className="fl-castle__window fl-castle__window--3" />
          </div>
          {/* Tall tower left */}
          <div className="fl-castle__tower fl-castle__tower--l">
            <div className="fl-castle__cone" />
            <div className="fl-castle__flag">
              <div className="fl-castle__flag-cloth" />
            </div>
            <div className="fl-castle__window fl-castle__window--sm" />
          </div>
          {/* Tall tower right */}
          <div className="fl-castle__tower fl-castle__tower--r">
            <div className="fl-castle__cone" />
            <div className="fl-castle__flag">
              <div className="fl-castle__flag-cloth fl-castle__flag-cloth--2" />
            </div>
            <div className="fl-castle__window fl-castle__window--sm" />
          </div>
          {/* Small outpost tower */}
          <div className="fl-castle__tower fl-castle__tower--sm">
            <div className="fl-castle__cone" />
          </div>
          {/* Far distant tower */}
          <div className="fl-castle__tower fl-castle__tower--far">
            <div className="fl-castle__cone" />
          </div>
          {/* Wall connectors */}
          <div className="fl-castle__wall fl-castle__wall--1" />
          <div className="fl-castle__wall fl-castle__wall--2" />
          {/* Torch glows */}
          <div className="fl-castle__torch fl-castle__torch--1" />
          <div className="fl-castle__torch fl-castle__torch--2" />
          <div className="fl-castle__torch fl-castle__torch--3" />
        </div>
        <div className="fl-hero__inner">
          <h1 className="fl-hero__headline">
            Plant your focus.<br />Grow your forest.
          </h1>
          <p className="fl-hero__sub">
            Focus Lily is a living environment for deep work — ambient rooms, a pomodoro forest, and study companions who feel like real adventure partners, not widgets.
          </p>
          <div className="fl-hero__actions">
            <button className="fl-btn fl-btn--forged fl-btn--lg" onClick={goToApp}>
              <span className="fl-btn__inner">Enter the Forest <span className="fl-btn__arrow">&rarr;</span></span>
              <span className="fl-btn__shimmer" />
            </button>
            <a
              className="fl-hero__secondary-link"
              href="#philosophy"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Discover the world <span className="fl-hero__secondary-arrow">&rarr;</span>
            </a>
          </div>
          <div className="fl-hero__trust">
            <span className="fl-hero__trust-badge">Sign up to start</span>
            <span className="fl-hero__trust-sep" />
            <span className="fl-hero__trust-note">Begin your journey today</span>
          </div>
          </div>
          <div className="fl-hero__scroll-guide">
            <div className="fl-scroll-indicator" />
            <span>Scroll to explore</span>
          </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ MARQUEE DIVIDER ═══ */}
      <Suspense fallback={null}>
        <ScrollVelocity
          texts={['Focus Deeper', 'Enchanted Mind']}
          velocity={80}
          className="fl-velocity-text"
        />
      </Suspense>

      {/* ═══ SCENE 2 — PHILOSOPHY ═══ */}
      <section
        className="fl-scene fl-scene--philosophy"
        id="philosophy"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const vw = window.innerWidth
          const vh = window.innerHeight
          philMouseRef.current = {
            x: ((e.clientX - cx) / vw) * 50,
            y: -((e.clientY - cy) / vh) * 50
          }
        }}
      >
        <div className="fl-philosophy__particles" ref={philParticlesRef}>
          <Suspense fallback={null}>
            <Antigravity
              count={300}
              magnetRadius={9}
              ringRadius={8}
              waveSpeed={0.4}
              waveAmplitude={1}
              particleSize={1.5}
              lerpSpeed={0.05}
              color="#5d3636"
              autoAnimate={true}
              particleVariance={0.2}
              mouseRef={philMouseRef}
            />
          </Suspense>
        </div>
        <div className="fl-mist fl-mist--far" />
        <div className="fl-phil-arch fl-depth fl-depth--far" />

        {/* Big lantern left — wall bracket */}
        <div className="fl-big-lantern fl-big-lantern--left" aria-hidden="true">
          <svg viewBox="0 0 160 320" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bracketL" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#4a3c2a"/>
                <stop offset="50%" stop-color="#3a2e1e"/>
                <stop offset="100%" stop-color="#2a2018"/>
              </linearGradient>
              <linearGradient id="metalL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#5a4a35"/>
                <stop offset="50%" stop-color="#3d3225"/>
                <stop offset="100%" stop-color="#2a2018"/>
              </linearGradient>
              <linearGradient id="glassL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(255,210,80,0.08)"/>
                <stop offset="50%" stop-color="rgba(255,180,50,0.2)"/>
                <stop offset="100%" stop-color="rgba(255,160,30,0.05)"/>
              </linearGradient>
              <radialGradient id="flameGlowL" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(255,200,60,0.55)"/>
                <stop offset="35%" stop-color="rgba(255,170,40,0.2)"/>
                <stop offset="100%" stop-color="rgba(255,140,20,0)"/>
              </radialGradient>
              <radialGradient id="flameInnerL" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stop-color="rgba(255,248,220,1)"/>
                <stop offset="45%" stop-color="rgba(255,210,70,0.95)"/>
                <stop offset="100%" stop-color="rgba(255,160,30,0.3)"/>
              </radialGradient>
            </defs>

            {/* ══ BRACKET (FIXED — does not swing) ══ */}
            {/* wall plate */}
            <rect x="0" y="10" width="14" height="50" rx="3" fill="url(#bracketL)" stroke="#1e1610" stroke-width="1.2"/>
            <circle cx="7" cy="20" r="2.2" fill="#2a2018" stroke="#5a4a35" stroke-width="0.8"/>
            <circle cx="7" cy="50" r="2.2" fill="#2a2018" stroke="#5a4a35" stroke-width="0.8"/>
            <circle cx="7" cy="30" r="1.2" fill="rgba(90,75,50,0.6)"/>
            <circle cx="7" cy="40" r="1.2" fill="rgba(90,75,50,0.6)"/>
            {/* arm */}
            <path d="M14 25 Q30 22 55 24 Q70 25 80 30" stroke="url(#bracketL)" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M18 28 Q40 26 65 28 Q74 29 78 32" stroke="rgba(70,58,42,0.3)" stroke-width="1.2" fill="none"/>
            {/* hook curl */}
            <path d="M80 30 Q85 32 84 40 Q83 50 80 55" stroke="url(#bracketL)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
            <path d="M80 55 Q76 60 78 64" stroke="url(#bracketL)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
            {/* scrollwork */}
            <path d="M40 24 Q38 18 42 14 Q48 10 52 16 Q54 20 50 22" stroke="rgba(80,65,42,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            <path d="M60 26 Q58 20 62 16 Q66 12 68 18" stroke="rgba(80,65,42,0.4)" stroke-width="1.2" fill="none" stroke-linecap="round"/>

            {/* ══ SWING GROUP (chain + lantern — pivots from hook) ══ */}
            <g className="fl-lantern__swing" style={{ transformOrigin: '80px 64px' }}>
              {/* S-hook */}
              <path d="M80 64 Q76 68 80 72 Q84 76 80 80" stroke="rgba(90,75,50,0.85)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              {/* chain */}
              <g stroke="rgba(90,75,50,0.8)" stroke-width="2.2" fill="none">
                <ellipse cx="80" cy="88" rx="3" ry="5"/>
                <ellipse cx="80" cy="98" rx="3" ry="5"/>
                <ellipse cx="80" cy="108" rx="3" ry="5"/>
                <ellipse cx="80" cy="118" rx="3" ry="5"/>
              </g>
              {/* top cap */}
              <path d="M66 128 Q66 120 80 120 Q94 120 94 128 Z" fill="url(#metalL)" stroke="#1e1610" stroke-width="0.8"/>
              <ellipse cx="80" cy="128" rx="14" ry="3" fill="#3d3225" stroke="#1e1610" stroke-width="0.5"/>
              <path d="M68 124 Q80 121 92 124" stroke="rgba(120,100,70,0.35)" stroke-width="0.8" fill="none"/>
              <circle cx="80" cy="118" r="2.5" fill="url(#metalL)" stroke="#1e1610" stroke-width="0.5"/>
              {/* ornamental ring */}
              <ellipse cx="80" cy="132" rx="16" ry="2.5" fill="none" stroke="rgba(90,75,50,0.5)" stroke-width="1.8"/>
              {/* body frame */}
              <rect x="64" y="132" width="32" height="80" rx="2.5" fill="none" stroke="url(#metalL)" stroke-width="2.8"/>
              <line x1="72" y1="132" x2="72" y2="212" stroke="rgba(70,58,42,0.5)" stroke-width="1.2"/>
              <line x1="80" y1="132" x2="80" y2="212" stroke="rgba(70,58,42,0.5)" stroke-width="1.2"/>
              <line x1="88" y1="132" x2="88" y2="212" stroke="rgba(70,58,42,0.5)" stroke-width="1.2"/>
              <line x1="64" y1="150" x2="96" y2="150" stroke="rgba(70,58,42,0.6)" stroke-width="1.5"/>
              <line x1="64" y1="170" x2="96" y2="170" stroke="rgba(70,58,42,0.6)" stroke-width="1.5"/>
              <line x1="64" y1="190" x2="96" y2="190" stroke="rgba(70,58,42,0.6)" stroke-width="1.5"/>
              {/* glass */}
              <rect x="66" y="134" width="28" height="76" rx="1.5" fill="url(#glassL)" stroke="rgba(80,65,42,0.25)" stroke-width="0.6"/>
              {/* rivets */}
              <circle cx="66" cy="134" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <circle cx="94" cy="134" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <circle cx="66" cy="210" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <circle cx="94" cy="210" r="1.8" fill="rgba(90,75,50,0.75)"/>
              {/* flame glow */}
              <ellipse cx="80" cy="175" rx="32" ry="32" fill="url(#flameGlowL)"/>
              {/* flame */}
              <ellipse cx="80" cy="176" rx="5.5" ry="16" fill="rgba(255,180,40,0.8)">
                <animate attributeName="ry" values="16;13.5;17;12.5;16" dur="1.8s" repeatCount="indefinite"/>
                <animate attributeName="rx" values="5.5;4.5;6;4.8;5.5" dur="2.2s" repeatCount="indefinite"/>
                <animate attributeName="cy" values="176;173;178;171;176" dur="1.5s" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="80" cy="174" rx="3.5" ry="11" fill="rgba(255,210,60,0.9)">
                <animate attributeName="ry" values="11;9;12;9.5;11" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="cy" values="174;171;176;170;174" dur="1.4s" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="80" cy="172" rx="1.8" ry="7" fill="url(#flameInnerL)">
                <animate attributeName="ry" values="7;5.8;7.5;5.2;7" dur="1.3s" repeatCount="indefinite"/>
              </ellipse>
              {/* base */}
              <path d="M64 212 L67 222 L93 222 L96 212 Z" fill="url(#metalL)" stroke="#1e1610" stroke-width="0.8"/>
              <ellipse cx="80" cy="222" rx="13" ry="3" fill="#3d3225" stroke="#1e1610" stroke-width="0.5"/>
              <path d="M76 222 L80 230 L84 222" fill="url(#metalL)" stroke="#1e1610" stroke-width="0.5"/>
            </g>
          </svg>
        </div>

        {/* Big lantern right — wall bracket (mirrored) */}
        <div className="fl-big-lantern fl-big-lantern--right" aria-hidden="true">
          <svg viewBox="0 0 160 320" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bracketR" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#4a3c2a"/>
                <stop offset="50%" stop-color="#3a2e1e"/>
                <stop offset="100%" stop-color="#2a2018"/>
              </linearGradient>
              <linearGradient id="metalR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#5a4a35"/>
                <stop offset="50%" stop-color="#3d3225"/>
                <stop offset="100%" stop-color="#2a2018"/>
              </linearGradient>
              <linearGradient id="glassR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(255,210,80,0.08)"/>
                <stop offset="50%" stop-color="rgba(255,180,50,0.2)"/>
                <stop offset="100%" stop-color="rgba(255,160,30,0.05)"/>
              </linearGradient>
              <radialGradient id="flameGlowR" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(255,200,60,0.55)"/>
                <stop offset="35%" stop-color="rgba(255,170,40,0.2)"/>
                <stop offset="100%" stop-color="rgba(255,140,20,0)"/>
              </radialGradient>
              <radialGradient id="flameInnerR" cx="50%" cy="60%" r="50%">
                <stop offset="0%" stop-color="rgba(255,248,220,1)"/>
                <stop offset="45%" stop-color="rgba(255,210,70,0.95)"/>
                <stop offset="100%" stop-color="rgba(255,160,30,0.3)"/>
              </radialGradient>
            </defs>

            {/* ══ BRACKET (FIXED — mirrored for right side) ══ */}
            <g transform="translate(160,0) scale(-1,1)">
              <rect x="0" y="10" width="14" height="50" rx="3" fill="url(#bracketR)" stroke="#1e1610" stroke-width="1.2"/>
              <circle cx="7" cy="20" r="2.2" fill="#2a2018" stroke="#5a4a35" stroke-width="0.8"/>
              <circle cx="7" cy="50" r="2.2" fill="#2a2018" stroke="#5a4a35" stroke-width="0.8"/>
              <circle cx="7" cy="30" r="1.2" fill="rgba(90,75,50,0.6)"/>
              <circle cx="7" cy="40" r="1.2" fill="rgba(90,75,50,0.6)"/>
              <path d="M14 25 Q30 22 55 24 Q70 25 80 30" stroke="url(#bracketR)" stroke-width="5" fill="none" stroke-linecap="round"/>
              <path d="M18 28 Q40 26 65 28 Q74 29 78 32" stroke="rgba(70,58,42,0.3)" stroke-width="1.2" fill="none"/>
              <path d="M80 30 Q85 32 84 40 Q83 50 80 55" stroke="url(#bracketR)" stroke-width="4.5" fill="none" stroke-linecap="round"/>
              <path d="M80 55 Q76 60 78 64" stroke="url(#bracketR)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
              <path d="M40 24 Q38 18 42 14 Q48 10 52 16 Q54 20 50 22" stroke="rgba(80,65,42,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
              <path d="M60 26 Q58 20 62 16 Q66 12 68 18" stroke="rgba(80,65,42,0.4)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            </g>

            {/* ══ SWING GROUP ══ */}
            <g className="fl-lantern__swing" style={{ transformOrigin: '80px 64px' }}>
              <path d="M80 64 Q76 68 80 72 Q84 76 80 80" stroke="rgba(90,75,50,0.85)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <g stroke="rgba(90,75,50,0.8)" stroke-width="2.2" fill="none">
                <ellipse cx="80" cy="88" rx="3" ry="5"/>
                <ellipse cx="80" cy="98" rx="3" ry="5"/>
                <ellipse cx="80" cy="108" rx="3" ry="5"/>
                <ellipse cx="80" cy="118" rx="3" ry="5"/>
              </g>
              <path d="M66 128 Q66 120 80 120 Q94 120 94 128 Z" fill="url(#metalR)" stroke="#1e1610" stroke-width="0.8"/>
              <ellipse cx="80" cy="128" rx="14" ry="3" fill="#3d3225" stroke="#1e1610" stroke-width="0.5"/>
              <path d="M68 124 Q80 121 92 124" stroke="rgba(120,100,70,0.35)" stroke-width="0.8" fill="none"/>
              <circle cx="80" cy="118" r="2.5" fill="url(#metalR)" stroke="#1e1610" stroke-width="0.5"/>
              <ellipse cx="80" cy="132" rx="16" ry="2.5" fill="none" stroke="rgba(90,75,50,0.5)" stroke-width="1.8"/>
              <rect x="64" y="132" width="32" height="80" rx="2.5" fill="none" stroke="url(#metalR)" stroke-width="2.8"/>
              <line x1="72" y1="132" x2="72" y2="212" stroke="rgba(70,58,42,0.5)" stroke-width="1.2"/>
              <line x1="80" y1="132" x2="80" y2="212" stroke="rgba(70,58,42,0.5)" stroke-width="1.2"/>
              <line x1="88" y1="132" x2="88" y2="212" stroke="rgba(70,58,42,0.5)" stroke-width="1.2"/>
              <line x1="64" y1="150" x2="96" y2="150" stroke="rgba(70,58,42,0.6)" stroke-width="1.5"/>
              <line x1="64" y1="170" x2="96" y2="170" stroke="rgba(70,58,42,0.6)" stroke-width="1.5"/>
              <line x1="64" y1="190" x2="96" y2="190" stroke="rgba(70,58,42,0.6)" stroke-width="1.5"/>
              <rect x="66" y="134" width="28" height="76" rx="1.5" fill="url(#glassR)" stroke="rgba(80,65,42,0.25)" stroke-width="0.6"/>
              <circle cx="66" cy="134" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <circle cx="94" cy="134" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <circle cx="66" cy="210" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <circle cx="94" cy="210" r="1.8" fill="rgba(90,75,50,0.75)"/>
              <ellipse cx="80" cy="175" rx="32" ry="32" fill="url(#flameGlowR)"/>
              <ellipse cx="80" cy="176" rx="5.5" ry="16" fill="rgba(255,180,40,0.8)">
                <animate attributeName="ry" values="16;13;17.5;12;16" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="rx" values="5.5;4.8;5.8;4.2;5.5" dur="2.5s" repeatCount="indefinite"/>
                <animate attributeName="cy" values="176;172;178;170;176" dur="1.7s" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="80" cy="174" rx="3.5" ry="11" fill="rgba(255,210,60,0.9)">
                <animate attributeName="ry" values="11;9.5;12;8.5;11" dur="1.8s" repeatCount="indefinite"/>
                <animate attributeName="cy" values="174;170;176;169;174" dur="1.5s" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="80" cy="172" rx="1.8" ry="7" fill="url(#flameInnerR)">
                <animate attributeName="ry" values="7;6;7.8;5.5;7" dur="1.4s" repeatCount="indefinite"/>
              </ellipse>
              <path d="M64 212 L67 222 L93 222 L96 212 Z" fill="url(#metalR)" stroke="#1e1610" stroke-width="0.8"/>
              <ellipse cx="80" cy="222" rx="13" ry="3" fill="#3d3225" stroke="#1e1610" stroke-width="0.5"/>
              <path d="M76 222 L80 230 L84 222" fill="url(#metalR)" stroke="#1e1610" stroke-width="0.5"/>
            </g>
          </svg>
        </div>

        <div className="fl-philosophy__inner">
          <span className="fl-eyebrow-text">The Philosophy</span>
          <p className="fl-philosophy__quote">
            "Study should feel like entering a world — not opening a spreadsheet."
          </p>
          <div className="fl-philosophy__text">
            <p>
              Most productivity apps reduce focus to a number — a timer, a streak, a chart. They work, but they feel <em>clinical</em>. The result: you use them for a week, then forget.
            </p>
            <p>
              Focus Lily takes a different path. Instead of a flat dashboard, you enter a <em>living world</em> — with real rooms, ambient sound, and a forest that grows as you study. It's not gamification. It's <em>place-making</em>.
            </p>
            <p className="fl-philosophy__highlight">
              When studying feels like an adventure, consistency is no longer discipline — it's just what you naturally do.
            </p>
          </div>
          <div className="fl-philosophy__cta">
            <button className="fl-btn fl-btn--forged" onClick={goToApp}>
              <span className="fl-btn__inner">Begin your journey <span className="fl-btn__arrow">&rarr;</span></span>
              <span className="fl-btn__shimmer" />
            </button>
          </div>
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 3 — WORLD MAP ═══ */}
      <section className="fl-scene fl-scene--world" id="world">
        <div className="fl-together-sky" />
        <div className="fl-mist fl-mist--far" />
        <div className="fl-section__inner">
          <div className="fl-section__header">
            <span className="fl-tag">Explore the Realm</span>
            <h2 className="fl-section__title">A world built for focus</h2>
            <p className="fl-section__sub">
              Each realm is a handcrafted environment — with its own aesthetic, soundscape, and atmosphere. Choose the one that matches your mood.
            </p>
          </div>
        </div>
        <div className="fl-world-map">
          {/* SVG train track path */}
          <svg className="fl-track-svg" viewBox="0 0 960 500" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="rgba(180,140,80,0.6)"/>
                <stop offset="50%" stop-color="rgba(160,120,60,0.4)"/>
                <stop offset="100%" stop-color="rgba(100,80,50,0.2)"/>
              </linearGradient>
            </defs>
            {/* Main track line */}
            <path
              d="M170 140 C220 140, 260 280, 310 300 S400 200, 500 200 S600 280, 660 260 S740 180, 800 200"
              fill="none"
              stroke="url(#trackGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="12 6"
            />
            {/* Track ties / sleepers */}
            <g stroke="rgba(140,110,60,0.3)" strokeWidth="2" strokeLinecap="round">
              <line x1="165" y1="135" x2="175" y2="145"/>
              <line x1="185" y1="137" x2="195" y2="147"/>
              <line x1="205" y1="140" x2="215" y2="152"/>
              <line x1="230" y1="155" x2="240" y2="167"/>
              <line x1="255" y1="175" x2="265" y2="187"/>
              <line x1="275" y1="195" x2="285" y2="207"/>
              <line x1="295" y1="220" x2="305" y2="232"/>
              <line x1="315" y1="245" x2="325" y2="257"/>
              <line x1="340" y1="265" x2="350" y2="277"/>
              <line x1="365" y1="275" x2="375" y2="287"/>
              <line x1="395" y1="270" x2="405" y2="260"/>
              <line x1="420" y1="250" x2="430" y2="240"/>
              <line x1="445" y1="235" x2="455" y2="225"/>
              <line x1="470" y1="220" x2="480" y2="210"/>
              <line x1="500" y1="200" x2="510" y2="192"/>
              <line x1="530" y1="195" x2="540" y2="205"/>
              <line x1="560" y1="210" x2="570" y2="220"/>
              <line x1="590" y1="230" x2="600" y2="240"/>
              <line x1="615" y1="248" x2="625" y2="258"/>
              <line x1="640" y1="260" x2="650" y2="268"/>
              <line x1="665" y1="262" x2="675" y2="254"/>
              <line x1="690" y1="250" x2="700" y2="240"/>
              <line x1="715" y1="232" x2="725" y2="222"/>
              <line x1="740" y1="218" x2="750" y2="210"/>
              <line x1="765" y1="208" x2="775" y2="200"/>
              <line x1="790" y1="200" x2="800" y2="194"/>
            </g>
          </svg>

          {/* Realm nodes */}
          {realms.map((r) => (
            <button
              key={r.id}
              className={`fl-realm-pin ${activePin === r.id ? 'fl-realm-pin--active' : ''} ${r.active ? 'fl-realm-pin--active-state' : 'fl-realm-pin--locked'}`}
              style={{ top: r.top, left: r.left, '--pin-color': r.color } as React.CSSProperties}
              onClick={() => r.active && setActivePin(activePin === r.id ? null : r.id)}
              aria-pressed={activePin === r.id}
              disabled={!r.active}
            >
              <span className="fl-realm-pin__pulse" style={{ borderColor: r.color } as React.CSSProperties} />
              <span className="fl-realm-pin__pulse fl-realm-pin__pulse--2" style={{ borderColor: r.color } as React.CSSProperties} />
              <span className="fl-realm-pin__dot" style={{ borderColor: r.color, background: r.active ? r.color : 'rgba(60,50,40,0.6)' } as React.CSSProperties}>
                {r.id === 'library' && (
                  <svg viewBox="0 0 24 24" fill="none" className="fl-realm-icon">
                    <rect x="3" y="4" width="4" height="16" rx="1" fill="rgba(255,220,120,0.9)"/>
                    <rect x="8" y="6" width="3" height="14" rx="0.5" fill="rgba(200,160,80,0.8)"/>
                    <rect x="12" y="3" width="3.5" height="17" rx="0.5" fill="rgba(180,140,60,0.85)"/>
                    <rect x="16.5" y="5" width="3" height="15" rx="0.5" fill="rgba(220,180,90,0.75)"/>
                    <rect x="2" y="20" width="19" height="2" rx="1" fill="rgba(160,120,50,0.9)"/>
                  </svg>
                )}
                {r.id === 'train' && (
                  <svg viewBox="0 0 24 24" fill="none" className="fl-realm-icon">
                    <rect x="4" y="6" width="16" height="10" rx="2" fill="rgba(200,140,60,0.9)"/>
                    <rect x="6" y="8" width="5" height="4" rx="1" fill="rgba(255,220,120,0.7)"/>
                    <rect x="13" y="8" width="5" height="4" rx="1" fill="rgba(255,220,120,0.7)"/>
                    <circle cx="8" cy="18" r="2" fill="rgba(180,130,50,0.9)"/>
                    <circle cx="16" cy="18" r="2" fill="rgba(180,130,50,0.9)"/>
                    <rect x="3" y="16" width="18" height="1.5" rx="0.5" fill="rgba(140,100,40,0.8)"/>
                    <rect x="6" y="3" width="3" height="3" rx="1" fill="rgba(160,120,50,0.7)"/>
                  </svg>
                )}
                {!r.active && (
                  <svg viewBox="0 0 24 24" fill="none" className="fl-realm-icon">
                    <circle cx="12" cy="12" r="4" stroke="rgba(160,130,80,0.4)" strokeWidth="1.5" fill="none"/>
                    <circle cx="12" cy="12" r="1.5" fill="rgba(160,130,80,0.3)"/>
                  </svg>
                )}
              </span>
              <span className="fl-realm-pin__label">{r.name}</span>
            </button>
          ))}
          {activePin && (() => {
            const realm = realms.find(r => r.id === activePin)
            return realm ? (
              <div className="fl-realm-lore" style={{ '--lore-color': realm.color } as React.CSSProperties}>
                <div className="fl-realm-lore__name">{realm.name}</div>
                <div className="fl-realm-lore__text">{realm.desc}</div>
                <button className="fl-btn fl-btn--forged fl-btn--sm" onClick={goToApp}>
                  <span className="fl-btn__inner">Enter <span className="fl-btn__arrow">&rarr;</span></span>
                  <span className="fl-btn__shimmer" />
                </button>
              </div>
            ) : null
          })()}
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 4 — FEATURES ═══ */}
      <section className="fl-scene fl-scene--features" id="features">
        <div className="fl-mist fl-mist--far" />
        <div className="fl-section__inner">
          <div className="fl-section__header">
            <span className="fl-tag">Core Powers</span>
            <h2 className="fl-section__title">Everything you need, nothing you don't</h2>
            <p className="fl-section__sub">Six elemental abilities that turn study time into something you look forward to.</p>
          </div>
        </div>
        <div className="fl-stone-tablets">
          {[
            { rune: 'I', title: 'Focus Timer', desc: 'Pomodoro-based sessions with ambient soundscapes. Your forest grows with every completed session.' },
            { rune: 'II', title: 'Living Realms', desc: 'Beautiful handcrafted worlds that evolve with seasons, weather, and ambient life — making every study session feel immersive.' },
            { rune: 'III', title: 'Task Magnet', desc: 'Drag-and-drop task management with priority fields. Pull the important work to center.' },
            { rune: 'IV', title: 'Living Notes', desc: 'Rich-text sticky notes pinned to your rooms. Your thoughts live where you study.' },
            { rune: 'V', title: 'Growth Forest', desc: 'Every focused minute plants a tree. Your study habits build a visual forest over time.' },
            { rune: 'VI', title: 'Custom Themes', desc: 'From Viking lakes to cyberpunk terminals. Your study world, your aesthetic.' },
          ].map((tablet) => (
            <div key={tablet.rune} className="fl-tablet">
              <div className="fl-tablet__arch" />
              <div className="fl-tablet__glow-border" />
              <span className="fl-tablet__rune">{tablet.rune}</span>
              <h3 className="fl-tablet__title">{tablet.title}</h3>
              <p className="fl-tablet__desc">{tablet.desc}</p>
              <div className="fl-tablet__roots" />
            </div>
          ))}
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 5 — STUDY TOGETHER ═══ */}
      <section className="fl-scene fl-scene--together" id="together">
        <div className="fl-together-sky" />
        <div className="fl-mist fl-mist--far" />
        <div className="fl-together__grid">
          <div className="fl-together__copy">
            <span className="fl-tag">Study Together</span>
            <h2 className="fl-section__title" style={{ textAlign: 'left' }}>You are not alone in this forest</h2>
            <p className="fl-together__desc">
              Study rooms are shared spaces. You see other students, hear the same ambient sounds, and feel the collective focus. It's like walking into a library — except the library is magical.
            </p>
            <ul className="fl-together__list">
              <li><span className="fl-list-rune">&#x2726;</span> Real-time presence — see who's studying alongside you</li>
              <li><span className="fl-list-rune">&#x2726;</span> Shared ambient audio — rain, fire, wind, or silence</li>
              <li><span className="fl-list-rune">&#x2726;</span> Focus status — in-session, break, or exploring</li>
              <li><span className="fl-list-rune">&#x2726;</span> Room codes — share a link, study together instantly</li>
            </ul>
            <div className="fl-together__status">
              <span className="fl-status-dot" />
              <span>Students studying right now</span>
            </div>
            <button className="fl-btn fl-btn--forged" onClick={goToApp}>
              <span className="fl-btn__inner">Join a Room <span className="fl-btn__arrow">&rarr;</span></span>
              <span className="fl-btn__shimmer" />
            </button>
          </div>
          <div className="fl-islands">
            <div className="fl-island-particles">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="fl-island-particle"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    top: `${10 + Math.random() * 70}%`,
                    animationDelay: `${i * 0.7}s`,
                    animationDuration: `${3 + Math.random() * 3}s`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
            <div className="fl-island fl-island--main">
              <div className="fl-island__cloud" />
              <div className="fl-island__ground">
                <div className="fl-island__building">
                  <div className="fl-island__tower">
                    <div className="fl-island__window fl-island__window--lit" />
                    <div className="fl-island__window fl-island__window--lit" style={{ top: '55%', left: '25%', width: '50%', height: '15%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="fl-island fl-island--secondary">
              <div className="fl-island__ground">
                <div className="fl-island__building fl-island__building--small">
                  <div className="fl-island__tower" style={{ paddingTop: '35%' }}>
                    <div className="fl-island__window fl-island__window--lit" />
                  </div>
                </div>
              </div>
            </div>
            <div className="fl-island fl-island--tertiary">
              <div className="fl-island__ground" />
            </div>
            <div className="fl-island-bridge" />
            <div className="fl-island-bridge fl-island-bridge--2" />
          </div>
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 6 — FOREST WISDOM ═══ */}
      <section className="fl-scene fl-scene--wisdom" id="wisdom">
        <div className="fl-mist fl-mist--far" />
        <div className="fl-section__inner">
          <div className="fl-section__header">
            <span className="fl-tag">Forest Wisdom</span>
            <h2 className="fl-section__title">Study smarter, not harder</h2>
            <p className="fl-section__sub">Science-backed techniques to make every study session count. Master these and the forest rewards you.</p>
          </div>
        </div>
        <div className="fl-wisdom-track">
          <div className="fl-wisdom-path" />
          {[
            { icon: '🌱', title: 'Active Recall', tip: 'Teach the topic to an imaginary student.', desc: 'Instead of rereading your notes, close the book and explain the topic from memory. Retrieving information strengthens long-term learning far more than passive reading.' },
            { icon: '🍅', title: 'Pomodoro Technique', tip: 'Never skip your break.', desc: 'Study for 25–50 minutes, then take a short break. Regular breaks help maintain concentration and reduce mental fatigue.' },
            { icon: '🧠', title: 'Spaced Repetition', tip: 'Review after 1 day, 3 days, 7 days, and 30 days.', desc: 'Review information over increasing intervals instead of cramming everything in one day. Your brain remembers better when it has to work for it.' },
            { icon: '🎯', title: 'One Goal Per Session', tip: 'Replace "Study Biology" with "Complete Chapter 5 practice questions."', desc: 'Begin every study session with one specific objective instead of a vague plan. Clarity turns effort into progress.' },
            { icon: '📵', title: 'Remove Distractions', tip: 'Make your study space harder to interrupt.', desc: 'Keep your phone away and close unnecessary tabs before beginning your session. Focus is a fragile thing — protect it.' },
            { icon: '😴', title: 'Sleep Is Study', tip: 'Don\'t trade sleep for another hour of ineffective studying.', desc: 'Sleep is when your brain strengthens memories formed during the day. Rest is not laziness — it\'s part of learning.' },
            { icon: '📖', title: 'Interleaving', tip: 'Alternate between theory and practice.', desc: 'Mix related subjects or problem types instead of repeating the same kind of question continuously. Variety trains your brain to adapt.' },
            { icon: '🌿', title: 'Consistency Wins', tip: 'Build a routine, not motivation.', desc: 'Studying one hour every day is far more effective than eight hours once a week. Small habits grow into great results.' },
          ].map((card, i) => (
            <div
              key={card.title}
              className={`fl-wisdom-island ${i % 2 === 0 ? 'fl-wisdom-island--up' : 'fl-wisdom-island--down'}`}
              style={{ animationDelay: `${i * 0.12}s` } as React.CSSProperties}
            >
              <div className="fl-wisdom-island__float">
                <div className="fl-wisdom-island__rock" />
                <div className="fl-wisdom-island__card">
                  <div className="fl-wisdom-island__icon">{card.icon}</div>
                  <h3 className="fl-wisdom-island__title">{card.title}</h3>
                  <p className="fl-wisdom-island__desc">{card.desc}</p>
                  <div className="fl-wisdom-island__tip">
                    <span className="fl-wisdom-island__tip-label">Quick Tip:</span> {card.tip}
                  </div>
                </div>
              </div>
              <div className="fl-wisdom-island__stem" />
            </div>
          ))}
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 7 — FAQ ═══ */}
      <section className="fl-scene fl-scene--faq" id="faq">
        <div className="fl-mist fl-mist--far" />
        <div className="fl-section__inner">
          <div className="fl-section__header">
            <span className="fl-tag">Ancient Scrolls</span>
            <h2 className="fl-section__title">Frequently asked questions</h2>
          </div>
        </div>
        <div className="fl-scrolls">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`fl-scroll ${faqOpen === i ? 'fl-scroll--open' : ''}`}
              onClick={() => toggleFaq(i)}
              role="region"
              aria-expanded={faqOpen === i}
              aria-controls={`faq-answer-${i}`}
            >
              <div className="fl-scroll__header">
                <span className="fl-scroll__rune">&#x2726;</span>
                <span className="fl-scroll__question">{faq.q}</span>
                <span className="fl-scroll__toggle">+</span>
              </div>
              {faqOpen === i && (
                <div className="fl-scroll__answer" id={`faq-answer-${i}`} role="region">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 8 — FAREWELL ═══ */}
      <section className="fl-scene fl-scene--farewell" id="farewell">
        <div className="fl-farewell-sunrise" />
        <div className="fl-dawn-bird fl-dawn-bird--1" />
        <div className="fl-dawn-bird fl-dawn-bird--2" />
        <div className="fl-dawn-bird fl-dawn-bird--3" />
        
        {/* Castle image */}
        <div className="fl-farewell-castle" aria-hidden="true">
          <img src="/farewell-castle.png" alt="" className="fl-farewell-castle__img" />
        </div>
        
        <div className="fl-farewell__inner">
          <div className="fl-farewell__glow" />
          <h2 className="fl-farewell__title">Your forest awaits</h2>
          <p className="fl-farewell__sub">
            The gate is open. Step into a world that grows with every focused minute. Your trees are waiting to be planted.
          </p>
          <button className="fl-btn fl-btn--forged fl-btn--lg" onClick={goToApp}>
            <span className="fl-btn__inner">Enter Focus Lily <span className="fl-btn__arrow">&rarr;</span></span>
            <span className="fl-btn__shimmer" />
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="fl-footer">
        <div className="fl-footer__inner">
          <div>
            <a href="/" className="fl-nav__brand" style={{ marginBottom: '12px' }}>
              <span className="fl-nav__logo-ring">
                <img src="/android-chrome-192x192.png" alt="" className="fl-nav__logo" />
              </span>
              Focus Lily
            </a>
          </div>
          <div className="fl-footer__cols">
            <div className="fl-footer__col">
              <h4>World</h4>
              <a href="#world">Realms</a>
              <a href="#features">Features</a>
              <a href="#wisdom">Wisdom</a>
            </div>
            <div className="fl-footer__col">
              <h4>Community</h4>
              <a href="#faq">FAQ</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
              <a href="https://www.instagram.com/thefocuslily" target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>
            <div className="fl-footer__col">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
        <div className="fl-footer__base">
          <p>&copy; 2026 Focus Lily. All rights reserved.</p>
          <div className="fl-footer__mascot">
            <img src="/mascot-sleeping.png" alt="Lily sleeping" />
          </div>
        </div>
      </footer>

    </div>
  )
}
