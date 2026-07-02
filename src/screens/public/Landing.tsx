// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import './Landing.css'

export function Landing() {
  const navigate = useNavigate()
  const { signInWithProvider } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const parallaxRef = useRef({ x: 0, y: 0 })
  const parallaxTargetRef = useRef({ x: 0, y: 0 })
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      parallaxTargetRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      }
    }
    window.addEventListener('mousemove', handleMouse, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(), y: Math.random() * 0.7,
      r: Math.random() * 1.5 + 0.3,
      brightness: Math.random(),
      speed: Math.random() * 0.2 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }))

    const rain = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      length: Math.random() * 25 + 15,
      speed: Math.random() * 8 + 12,
      opacity: Math.random() * 0.15 + 0.05
    }))

    const fireflies = Array.from({ length: 45 }, () => ({
      x: Math.random(), y: 0.3 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.0002,
      phase: Math.random() * Math.PI * 2,
      size: Math.random() * 1.5 + 0.8,
    }))

    const fogBands = [
      { y: 0.6, opacity: 0.04, drift: 0.00002, phase: 0 },
      { y: 0.75, opacity: 0.03, drift: 0.00001, phase: 1.5 },
    ]

    let time = 0

    const drawSky = (W: number, H: number) => {
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#040714')
      sky.addColorStop(0.4, '#0a1026')
      sky.addColorStop(0.8, '#0b162a')
      sky.addColorStop(1, '#050a18')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)
    }

    const drawMoon = (W: number, H: number, px: number, py: number) => {
      const moonX = W * 0.8 + px * 0.2
      const moonY = H * 0.15 + py * 0.1
      const moonR = Math.min(W, H) * 0.045

      const moonAtmos = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 8)
      moonAtmos.addColorStop(0, 'rgba(244, 200, 74, 0.06)')
      moonAtmos.addColorStop(0.4, 'rgba(58, 109, 91, 0.03)')
      moonAtmos.addColorStop(1, 'transparent')
      ctx.fillStyle = moonAtmos
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR * 8, 0, Math.PI * 2)
      ctx.fill()

      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 3)
      moonGlow.addColorStop(0, 'rgba(246, 241, 229, 0.15)')
      moonGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = moonGlow
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2)
      const moonFill = ctx.createRadialGradient(moonX - moonR * 0.2, moonY - moonR * 0.2, 0, moonX, moonY, moonR)
      moonFill.addColorStop(0, '#fffdf4')
      moonFill.addColorStop(0.8, '#f4e9ca')
      moonFill.addColorStop(1, '#e4d3aa')
      ctx.fillStyle = moonFill
      ctx.fill()
    }

    const drawStars = (W: number, H: number, px: number, py: number) => {
      stars.forEach(s => {
        const flicker = Math.sin(time * s.speed + s.phase) * 0.4 + 0.6
        const sx = s.x * W + px * 0.15
        const sy = s.y * H + py * 0.1
        ctx.beginPath()
        ctx.arc(sx, sy, s.r * flicker, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(246, 241, 229, ${s.brightness * flicker * 0.65})`
        ctx.fill()
      })
    }

    const drawRain = (W: number, H: number) => {
      ctx.strokeStyle = 'rgba(174, 219, 220, 0.08)'
      ctx.lineWidth = 1.0
      rain.forEach(r => {
        r.y += r.speed
        if (r.y > H) {
          r.y = -r.length
          r.x = Math.random() * W
        }
        ctx.beginPath()
        ctx.moveTo(r.x, r.y)
        ctx.lineTo(r.x, r.y + r.length)
        ctx.stroke()
      })
    }

    const drawContinuousOrganicHills = (W: number, H: number, px: number, py: number) => {
      ctx.save()

      ctx.globalAlpha = 0.25
      ctx.fillStyle = '#0b1c24'
      ctx.beginPath()
      ctx.moveTo(0, H)
      ctx.bezierCurveTo(W * 0.2, H * 0.5, W * 0.5, H * 0.75, W * 0.8, H * 0.55)
      ctx.bezierCurveTo(W * 0.9, H * 0.5, W, H * 0.52, W, H)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = 0.45
      ctx.fillStyle = '#142c26'
      ctx.beginPath()
      ctx.moveTo(0, H)
      ctx.bezierCurveTo(W * 0.25, H * 0.62, W * 0.6, H * 0.45, W * 0.75, H * 0.68)
      ctx.bezierCurveTo(W * 0.88, H * 0.75, W, H * 0.6, W, H)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fill()

      const towerX = W * 0.15 + px * 0.4
      const towerY = H * 0.52 + py * 0.25
      ctx.globalAlpha = 0.55
      ctx.fillStyle = '#0a1714'
      ctx.fillRect(towerX, towerY, 32, H - towerY)
      ctx.beginPath()
      ctx.arc(towerX + 16, towerY, 16, Math.PI, 0)
      ctx.fill()
      ctx.globalAlpha = 0.7 + Math.sin(time * 0.8) * 0.15
      ctx.fillStyle = '#f4c84a'
      ctx.fillRect(towerX + 11, towerY + 30, 10, 16)
      ctx.fillRect(towerX + 11, towerY + 70, 10, 16)

      ctx.globalAlpha = 0.75
      ctx.fillStyle = '#081512'
      ctx.beginPath()
      ctx.moveTo(0, H)
      ctx.bezierCurveTo(W * 0.3, H * 0.72, W * 0.5, H * 0.85, W * 0.85, H * 0.7)
      ctx.bezierCurveTo(W * 0.95, H * 0.65, W, H * 0.72, W, H)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = 0.8
      ctx.fillStyle = '#081512'
      for (let i = 0; i < W; i += 180) {
        const plantY = H * 0.75 + Math.sin(i * 0.05) * 45
        ctx.save()
        ctx.translate(i + px * 0.7, plantY + py * 0.3)
        ctx.beginPath()
        ctx.bezierCurveTo(-15, 0, -25, -45, -5, -60)
        ctx.bezierCurveTo(15, -45, 5, 0, 0, 0)
        ctx.fill()

        if (i % 360 === 0) {
          ctx.fillStyle = '#6b5030'
          ctx.fillRect(-2, -75, 4, 75)
          const lightGrad = ctx.createRadialGradient(0, -75, 0, 0, -75, 25)
          lightGrad.addColorStop(0, 'rgba(244, 200, 74, 1.0)')
          lightGrad.addColorStop(0.3, 'rgba(244, 200, 74, 0.4)')
          lightGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = lightGrad
          ctx.beginPath()
          ctx.arc(0, -75, 25, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }

      ctx.restore()
    }

    const drawFogBands = (W: number, H: number, py: number) => {
      fogBands.forEach(band => {
        band.phase += band.drift
        const fogY = band.y * H + Math.sin(band.phase * 50) * 8 + py * 0.15
        const fogGrad = ctx.createLinearGradient(0, fogY - 60, 0, fogY + 60)
        fogGrad.addColorStop(0, 'transparent')
        fogGrad.addColorStop(0.5, `rgba(10, 22, 26, ${band.opacity})`)
        fogGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = fogGrad
        ctx.fillRect(0, fogY - 60, W, 120)
      })
    }

    const drawFireflies = (W: number, H: number, px: number, py: number) => {
      fireflies.forEach(f => {
        f.x += f.vx + Math.sin(time * 0.4 + f.phase) * 0.0001
        f.y += f.vy + Math.cos(time * 0.3 + f.phase) * 0.0001
        if (f.x < 0 || f.x > 1) f.vx *= -1
        if (f.y < 0.2 || f.y > 0.85) f.vy *= -1
        const glow = Math.sin(time * 1.5 + f.phase) * 0.4 + 0.6
        const fx = f.x * W + px * 0.8
        const fy = f.y * H + py * 0.4

        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 12)
        fg.addColorStop(0, `rgba(244, 200, 74, ${glow * 0.6})`)
        fg.addColorStop(0.5, `rgba(244, 200, 74, 0.15)`)
        fg.addColorStop(1, 'transparent')
        ctx.fillStyle = fg
        ctx.beginPath()
        ctx.arc(fx, fy, 12, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const draw = () => {
      time += 0.01

      const cur = parallaxRef.current
      const tgt = parallaxTargetRef.current
      parallaxRef.current = {
        x: cur.x + (tgt.x - cur.x) * 0.04,
        y: cur.y + (tgt.y - cur.y) * 0.04,
      }
      const px = parallaxRef.current.x
      const py = parallaxRef.current.y

      const W = canvas.width
      const H = canvas.height

      ctx.clearRect(0, 0, W, H)

      drawSky(W, H)
      drawMoon(W, H, px, py)
      drawStars(W, H, px, py)
      drawRain(W, H)
      drawContinuousOrganicHills(W, H, px, py)
      drawFogBands(W, H, py)
      drawFireflies(W, H, px, py)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const goToApp = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleOAuth = useCallback(async (provider: 'google' | 'github' | 'microsoft') => {
    await signInWithProvider(provider)
  }, [signInWithProvider])

  const [shootingStar, setShootingStar] = useState(false)
  useEffect(() => {
    const interval = setInterval(() => {
      setShootingStar(true)
      setTimeout(() => setShootingStar(false), 2200)
    }, 8000 + Math.random() * 6000)
    return () => clearInterval(interval)
  }, [])

  const faqs = [
    { q: 'Is Focus Lily free?', a: 'Yes. Core features — pomodoro timer, study rooms, task magnet, notes — are all free. Premium themes and avatar items are optional.' },
    { q: 'Do I need an account?', a: 'You can explore the lobby without signing in, but to save progress, join study rooms, and grow your forest, you need an account.' },
    { q: 'What makes this different from other study apps?', a: 'Focus Lily is a world, not a widget. It builds a living environment around your study habits — a real place you return to, with ambient audio, 3D spaces, and a social presence.' },
    { q: 'Can I study with friends?', a: 'Yes. Study rooms support real-time co-presence. Friends see each other, hear ambient audio together, and stay accountable.' },
    { q: 'Does it work on mobile?', a: 'Focus Lily is a responsive web app. It works in any modern browser on desktop, tablet, or phone.' },
  ]

  const realms = [
    { id: 'scholar', name: 'Scholar\'s Tower', color: '#D9A441', top: '28%', left: '22%', desc: 'The original study hall. Warm parchment light cascades through tall arched windows onto alcoves of silent desks.' },
    { id: 'illusion', name: 'Veil of Illusions', color: '#8B7BB5', top: '40%', left: '52%', desc: 'A crystalline realm of shimmering refractions. Perfect for deep focus — the world outside fades to prismatic haze.' },
    { id: 'forge', name: 'The Forge', color: '#6B4A2A', top: '55%', left: '35%', desc: 'Ember-lit workbenches and the steady rhythm of creation. Where projects are born and deadlines are met.' },
    { id: 'glade', name: 'Whispering Glade', color: '#3A6D5B', top: '48%', left: '68%', desc: 'A forest clearing under soft starlight. Rain on leaves, distant birdsong — nature\'s white noise for reading and reflection.' },
  ]

  const milestones = [
    { date: 'Season 1', title: 'The Seed', desc: 'Core pomodoro, study rooms, tasks, and notes. The forest takes root.', done: true },
    { date: 'Season 2', title: 'The Sprout', desc: 'Avatars, themes, streaks, and achievements. Branches begin to grow.', done: true },
    { date: 'Season 3', title: 'The Canopy', desc: 'Social realm invites, global leaderboard, marketplace. The forest fills with life.', done: false },
    { date: 'Future', title: 'The Bloom', desc: 'AI study companion, adaptive scheduling, guilds, and more realms.', done: false },
  ]

  return (
    <div className="fl-root">
      <canvas ref={canvasRef} className="fl-canvas" />

      {shootingStar && <div className="fl-shooting-star" />}

      {/* ═══ NAV ═══ */}
      <nav className="fl-nav">
        <a href="/" className="fl-nav__brand">
          <span className="fl-nav__logo-ring">
            <img src="/android-chrome-192x192.png" alt="" className="fl-nav__logo" />
          </span>
          Focus Lily
        </a>
        <div className="fl-nav__links">
          <a href="#philosophy" className="fl-nav__link">Philosophy</a>
          <a href="#world" className="fl-nav__link">World</a>
          <a href="#features" className="fl-nav__link">Features</a>
          <a href="#roadmap" className="fl-nav__link">Roadmap</a>
          <a href="#faq" className="fl-nav__link">FAQ</a>
        </div>
        <div className="fl-nav__cta">
          <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={goToApp}>Sign in</button>
          <button className="fl-btn fl-btn--forged fl-btn--sm" onClick={goToApp}>
            <span className="fl-btn__inner">Enter the Forest</span>
            <span className="fl-btn__shimmer" />
          </button>
        </div>
      </nav>

      {/* ═══ SCENE 1 — HERO ═══ */}
      <section className="fl-scene fl-scene--hero" id="hero">
        <div className="fl-world-fog" />
        <div className="fl-fg-branch fl-fg-branch--left" />
        <div className="fl-fg-branch fl-fg-branch--right" />
        <div className="fl-hero__inner">
          <div className="fl-hero__eyebrow">
            <span className="fl-orb" />
            <span className="fl-eyebrow-text">A calm, magical study world</span>
          </div>
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
            <button className="fl-btn fl-btn--ghost fl-btn--lg" onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}>
              <span className="fl-btn__inner">Discover the world</span>
            </button>
          </div>
          <div className="fl-hero__scroll-guide">
            <div className="fl-scroll-indicator" />
            <span>Scroll to explore</span>
          </div>
        </div>
        <div className="fl-scene-bottom-mist" />
      </section>

      {/* ═══ SCENE 2 — PHILOSOPHY ═══ */}
      <section className="fl-scene fl-scene--philosophy" id="philosophy">
        <div className="fl-mist fl-mist--far" />
        <div className="fl-phil-arch fl-depth fl-depth--far" />
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
          <div className="fl-map__bg">
            <div className="fl-map__terrain" />
            <div className="fl-map__grid" />
            <div className="fl-map__vignette" />
          </div>
          {realms.map((r) => (
            <button
              key={r.id}
              className={`fl-realm-pin ${activePin === r.id ? 'fl-realm-pin--active' : ''}`}
              style={{ top: r.top, left: r.left, '--pin-color': r.color } as React.CSSProperties}
              onClick={() => setActivePin(activePin === r.id ? null : r.id)}
            >
              <span className="fl-realm-pin__pulse" style={{ borderColor: r.color } as React.CSSProperties} />
              <span className="fl-realm-pin__pulse fl-realm-pin__pulse--2" style={{ borderColor: r.color } as React.CSSProperties} />
              <span className="fl-realm-pin__dot" style={{ borderColor: r.color } as React.CSSProperties} />
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
            { rune: 'II', title: 'Study Rooms', desc: 'Real-time co-presence rooms. See friends, hear the same ambient audio, and stay accountable together.' },
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
            <div className="fl-island fl-island--main">
              <div className="fl-island__cloud" />
              <div className="fl-island__ground">
                <div className="fl-island__building">
                  <div className="fl-island__tower">
                    <div className="fl-island__window fl-island__window--lit" />
                  </div>
                </div>
              </div>
            </div>
            <div className="fl-island fl-island--secondary">
              <div className="fl-island__ground">
                <div className="fl-island__building fl-island__building--small">
                  <div className="fl-island__tower" style={{ paddingTop: '40%' }}>
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

      {/* ═══ SCENE 6 — ROADMAP ═══ */}
      <section className="fl-scene fl-scene--roadmap" id="roadmap">
        <div className="fl-mist fl-mist--far" />
        <div className="fl-section__inner">
          <div className="fl-section__header">
            <span className="fl-tag">The Path</span>
            <h2 className="fl-section__title">From seed to canopy</h2>
            <p className="fl-section__sub">The forest grows season by season. Here's what's planted and what's budding.</p>
          </div>
        </div>
        <div className="fl-stone-path">
          <div className="fl-path__road" />
          {milestones.map((m, i) => (
            <div key={m.date} className={`fl-milestone fl-milestone--${i % 2 === 0 ? 'left' : 'right'} ${m.done ? 'fl-milestone--done' : 'fl-milestone--seed'}`}>
              <div className="fl-milestone__marker">
                <div className="fl-milestone__bloom" />
                <div className="fl-milestone__stone" />
              </div>
              <div className="fl-milestone__card">
                <span className="fl-milestone__date">{m.date}</span>
                <h3 className="fl-milestone__title">{m.title}</h3>
                <p className="fl-milestone__desc">{m.desc}</p>
              </div>
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
              onClick={() => setFaqOpen(faqOpen === i ? null : i)}
            >
              <div className="fl-scroll__header">
                <span className="fl-scroll__rune">&#x2726;</span>
                <span className="fl-scroll__question">{faq.q}</span>
                <span className="fl-scroll__toggle">+</span>
              </div>
              {faqOpen === i && (
                <div className="fl-scroll__answer">
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
          <p className="fl-farewell__note">Free to use. No credit card required.</p>
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
            <p className="fl-footer__tagline">
              A calm, magical study world. Plant trees, grow your notes, and stay focused.
            </p>
          </div>
          <div className="fl-footer__cols">
            <div className="fl-footer__col">
              <h4>World</h4>
              <a href="#world">Realms</a>
              <a href="#features">Features</a>
              <a href="#roadmap">Roadmap</a>
            </div>
            <div className="fl-footer__col">
              <h4>Community</h4>
              <a href="#faq">FAQ</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Discord</a>
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
