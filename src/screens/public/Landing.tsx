// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import './Landing.css'

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

/* ═══ Hyper-realistic 2D canvas scene ═══ */
function useCanvasScene(canvasRef: React.RefObject<HTMLCanvasElement>, scrollRef: React.RefObject<number>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
    window.addEventListener('resize', resize, { passive: true })

    /* ── Mouse parallax ── */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMouse = (e: MouseEvent) => {
      mouse.tx = (e.clientX / W - 0.5) * 40
      mouse.ty = (e.clientY / H - 0.5) * 25
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    /* ── Stars (multi-layer, colored) ── */
    const starLayers = [
      Array.from({ length: 200 }, () => ({
        x: Math.random(), y: Math.random() * 0.55,
        r: Math.random() * 0.8 + 0.2,
        b: Math.random() * 0.5 + 0.3,
        tw: Math.random() * 2 + 0.5,
        ph: Math.random() * Math.PI * 2,
        hue: 200 + Math.random() * 60,
        depth: 0.05,
      })),
      Array.from({ length: 120 }, () => ({
        x: Math.random(), y: Math.random() * 0.4,
        r: Math.random() * 1.5 + 0.5,
        b: Math.random() * 0.4 + 0.5,
        tw: Math.random() * 1.5 + 0.3,
        ph: Math.random() * Math.PI * 2,
        hue: 30 + Math.random() * 40,
        depth: 0.12,
      })),
      Array.from({ length: 40 }, () => ({
        x: Math.random(), y: Math.random() * 0.3,
        r: Math.random() * 2 + 1,
        b: 0.7 + Math.random() * 0.3,
        tw: Math.random() * 1 + 0.2,
        ph: Math.random() * Math.PI * 2,
        hue: 50 + Math.random() * 20,
        depth: 0.2,
      })),
    ]

    /* ── Nebula clouds ── */
    const nebulae = Array.from({ length: 5 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.35,
      rx: 0.15 + Math.random() * 0.2,
      ry: 0.05 + Math.random() * 0.08,
      hue: 220 + Math.random() * 60,
      opacity: 0.015 + Math.random() * 0.02,
      drift: 0.00001 + Math.random() * 0.00002,
      phase: Math.random() * Math.PI * 2,
    }))

    /* ── Rain ── */
    const rain = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: Math.random() * 20 + 12,
      spd: Math.random() * 10 + 18,
      op: Math.random() * 0.12 + 0.04,
      depth: 0.3 + Math.random() * 0.5,
    }))

    /* ── Fireflies ── */
    const fireflies = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: 0.35 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      ph: Math.random() * Math.PI * 2,
      sp: 0.5 + Math.random() * 1.2,
      r: Math.random() * 1.2 + 0.6,
      depth: 0.5 + Math.random() * 0.4,
    }))

    /* ── Aurora bands ── */
    const auroraBands = [
      { y: 0.08, amp: 30, freq: 0.004, spd: 0.0003, hue: 150, op: 0.04, h2: 180 },
      { y: 0.12, amp: 25, freq: 0.006, spd: 0.0002, hue: 200, op: 0.03, h2: 260 },
      { y: 0.05, amp: 20, freq: 0.008, spd: 0.0004, hue: 280, op: 0.025, h2: 320 },
    ]

    /* ── Fog bands ── */
    const fogBands = [
      { y: 0.55, op: 0.06, drift: 0.00003, ph: 0 },
      { y: 0.68, op: 0.05, drift: 0.00002, ph: 1.5 },
      { y: 0.78, op: 0.04, drift: 0.000015, ph: 3 },
    ]

    /* ── Mountain layers (parallax depth) ── */
    const mountainLayers = [
      { points: [], color: '#0a1622', alpha: 0.35, depth: 0.15, baseY: 0.48 },
      { points: [], color: '#0a1c1a', alpha: 0.5, depth: 0.3, baseY: 0.56 },
      { points: [], color: '#081512', alpha: 0.7, depth: 0.5, baseY: 0.66 },
      { points: [], color: '#060e0c', alpha: 0.9, depth: 0.75, baseY: 0.78 },
    ]
    mountainLayers.forEach((layer) => {
      const segs = 40
      for (let i = 0; i <= segs; i++) {
        const x = i / segs
        const h = Math.sin(x * 7 + layer.depth * 10) * 0.08 +
                  Math.sin(x * 13 + layer.depth * 5) * 0.04 +
                  Math.sin(x * 23) * 0.02 + 0.12
        layer.points.push({ x, h })
      }
    })

    /* ── Tower ── */
    const tower = { x: 0.14, y: 0.52, depth: 0.4 }

    /* ── Lantern posts ── */
    const lanterns = [
      { x: 0.25, y: 0.72, depth: 0.6 },
      { x: 0.4, y: 0.75, depth: 0.65 },
      { x: 0.62, y: 0.73, depth: 0.6 },
      { x: 0.82, y: 0.76, depth: 0.7 },
    ]

    /* ── Ground plants ── */
    const plants = Array.from({ length: 30 }, (_, i) => ({
      x: i / 30 + Math.random() * 0.03,
      y: 0.82 + Math.sin(i * 0.5) * 0.03,
      h: 30 + Math.random() * 40,
      depth: 0.8 + Math.random() * 0.2,
      type: i % 5 === 0 ? 'lamp' : 'bush',
    }))

    let time = 0
    let raf = 0

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const draw = () => {
      time += 0.01
      mouse.x = lerp(mouse.x, mouse.tx, 0.04)
      mouse.y = lerp(mouse.y, mouse.ty, 0.04)
      const scroll = scrollRef.current || 0
      const scrollNorm = Math.min(scroll / (document.body.scrollHeight - H), 1)

      ctx.clearRect(0, 0, W, H)

      /* ═══ SKY ═══ */
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#020308')
      sky.addColorStop(0.15, '#050a18')
      sky.addColorStop(0.35, '#080f22')
      sky.addColorStop(0.55, '#0a1424')
      sky.addColorStop(0.75, '#0b1620')
      sky.addColorStop(1, '#050a10')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      /* ═══ NEBULAE ═══ */
      nebulae.forEach((n) => {
        n.phase += n.drift
        const cx = (n.x + Math.sin(n.phase) * 0.02) * W + mouse.x * 0.03
        const cy = n.y * H + mouse.y * 0.02
        const rx = n.rx * W
        const ry = n.ry * H
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
        g.addColorStop(0, `hsla(${n.hue}, 60%, 50%, ${n.opacity})`)
        g.addColorStop(0.5, `hsla(${n.hue + 20}, 50%, 40%, ${n.opacity * 0.5})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      /* ═══ AURORA ═══ */
      auroraBands.forEach((a) => {
        const baseY = a.y * H + mouse.y * 0.05
        ctx.beginPath()
        ctx.moveTo(0, baseY)
        for (let x = 0; x <= W; x += 4) {
          const wave = Math.sin(x * a.freq + time * a.spd * 100) * a.amp +
                       Math.sin(x * a.freq * 2.3 + time * a.spd * 60) * a.amp * 0.4
          ctx.lineTo(x, baseY + wave)
        }
        ctx.lineTo(W, baseY + 80)
        ctx.lineTo(0, baseY + 80)
        ctx.closePath()
        const g = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 80)
        g.addColorStop(0, `hsla(${a.hue}, 70%, 50%, 0)`)
        g.addColorStop(0.3, `hsla(${a.hue}, 70%, 50%, ${a.op})`)
        g.addColorStop(0.5, `hsla(${a.h2}, 70%, 55%, ${a.op * 0.6})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.fill()
      })

      /* ═══ STARS (3 layers) ═══ */
      starLayers.forEach((layer) => {
        layer.forEach((s) => {
          const tw = Math.sin(time * s.tw + s.ph) * 0.4 + 0.6
          const sx = s.x * W + mouse.x * s.depth
          const sy = s.y * H + mouse.y * s.depth - scrollNorm * s.depth * 100
          const r = s.r * tw
          ctx.beginPath()
          ctx.arc(sx, sy, r, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${s.hue}, 30%, 90%, ${s.b * tw})`
          ctx.fill()
          if (s.r > 1.2) {
            ctx.beginPath()
            ctx.arc(sx, sy, r * 3, 0, Math.PI * 2)
            ctx.fillStyle = `hsla(${s.hue}, 40%, 80%, ${s.b * tw * 0.08})`
            ctx.fill()
          }
        })
      })

      /* ═══ MOON ═══ */
      const moonX = W * 0.78 + mouse.x * 0.08 - scrollNorm * 30
      const moonY = H * 0.14 + mouse.y * 0.05 - scrollNorm * 20
      const moonR = Math.min(W, H) * 0.04

      // Outer atmosphere
      const atm = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 12)
      atm.addColorStop(0, 'rgba(244, 200, 74, 0.04)')
      atm.addColorStop(0.3, 'rgba(200, 170, 120, 0.02)')
      atm.addColorStop(1, 'transparent')
      ctx.fillStyle = atm
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR * 12, 0, Math.PI * 2)
      ctx.fill()

      // Inner glow
      const glow = ctx.createRadialGradient(moonX, moonY, moonR * 0.7, moonX, moonY, moonR * 4)
      glow.addColorStop(0, 'rgba(246, 241, 229, 0.12)')
      glow.addColorStop(0.4, 'rgba(244, 200, 74, 0.04)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR * 4, 0, Math.PI * 2)
      ctx.fill()

      // Moon body
      const body = ctx.createRadialGradient(moonX - moonR * 0.25, moonY - moonR * 0.25, 0, moonX, moonY, moonR)
      body.addColorStop(0, '#fffef5')
      body.addColorStop(0.5, '#f6efd0')
      body.addColorStop(0.85, '#e8d8a8')
      body.addColorStop(1, '#c4b488')
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2)
      ctx.fill()

      // Moon craters
      ctx.fillStyle = 'rgba(180, 165, 130, 0.3)'
      ctx.beginPath(); ctx.arc(moonX - moonR * 0.2, moonY - moonR * 0.1, moonR * 0.15, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(moonX + moonR * 0.15, moonY + moonR * 0.2, moonR * 0.1, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(moonX - moonR * 0.1, moonY + moonR * 0.35, moonR * 0.08, 0, Math.PI * 2); ctx.fill()

      /* ═══ RAIN ═══ */
      ctx.lineCap = 'round'
      rain.forEach((r) => {
        r.y += r.spd * 0.01
        if (r.y > 1.2) { r.y = -0.1; r.x = Math.random() }
        const rx = r.x * W + mouse.x * r.depth
        const ry = r.y * H + mouse.y * r.depth
        ctx.strokeStyle = `rgba(174, 200, 220, ${r.op})`
        ctx.lineWidth = r.depth * 1.2
        ctx.beginPath()
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx - 1, ry + r.len)
        ctx.stroke()
      })

      /* ═══ MOUNTAIN LAYERS ═══ */
      mountainLayers.forEach((layer, li) => {
        const parallaxX = mouse.x * layer.depth
        const parallaxY = mouse.y * layer.depth * 0.5
        const scrollShift = scrollNorm * layer.depth * 80

        ctx.globalAlpha = layer.alpha
        ctx.fillStyle = layer.color
        ctx.beginPath()
        ctx.moveTo(0, H)
        layer.points.forEach((p) => {
          const px = p.x * W + parallaxX
          const py = (layer.baseY + p.h) * H + parallaxY - scrollShift
          if (p === layer.points[0]) ctx.lineTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.lineTo(W, H)
        ctx.lineTo(0, H)
        ctx.closePath()
        ctx.fill()

        // Rim light on mountain edges
        if (li < 2) {
          ctx.globalAlpha = layer.alpha * 0.3
          ctx.strokeStyle = `rgba(200, 180, 130, 0.15)`
          ctx.lineWidth = 1
          ctx.beginPath()
          layer.points.forEach((p, i) => {
            const px = p.x * W + parallaxX
            const py = (layer.baseY + p.h) * H + parallaxY - scrollShift
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      })

      /* ═══ TOWER ═══ */
      {
        const tx = tower.x * W + mouse.x * tower.depth - scrollNorm * 20
        const ty = tower.y * H + mouse.y * tower.depth * 0.3 - scrollNorm * tower.depth * 60
        const tw = 28
        const th = H - ty
        ctx.globalAlpha = 0.6
        ctx.fillStyle = '#0a1410'
        ctx.fillRect(tx, ty, tw, th)
        ctx.beginPath()
        ctx.arc(tx + tw / 2, ty, tw / 2, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(tx - 3, ty - 8, tw + 6, 6)

        // Windows
        const winGlow = 0.6 + Math.sin(time * 0.8) * 0.2
        ctx.globalAlpha = winGlow
        ctx.fillStyle = '#f4c84a'
        ctx.fillRect(tx + 8, ty + 25, 12, 14)
        ctx.fillRect(tx + 8, ty + 60, 12, 14)
        ctx.fillRect(tx + 8, ty + 95, 12, 14)

        ctx.globalAlpha = winGlow * 0.15
        const wg = ctx.createRadialGradient(tx + 14, ty + 30, 0, tx + 14, ty + 30, 60)
        wg.addColorStop(0, 'rgba(244, 200, 74, 0.4)')
        wg.addColorStop(1, 'transparent')
        ctx.fillStyle = wg
        ctx.fillRect(tx - 40, ty, 100, 120)
        ctx.globalAlpha = 1
      }

      /* ═══ LANTERNS ═══ */
      lanterns.forEach((l, i) => {
        const lx = l.x * W + mouse.x * l.depth - scrollNorm * l.depth * 40
        const ly = l.y * H + mouse.y * l.depth * 0.2
        const glow = 0.6 + Math.sin(time * 1.2 + i * 1.5) * 0.3

        ctx.globalAlpha = 0.5
        ctx.fillStyle = '#3a2a1a'
        ctx.fillRect(lx - 1, ly, 2, 50)

        ctx.globalAlpha = glow
        const lg = ctx.createRadialGradient(lx, ly - 5, 0, lx, ly - 5, 40)
        lg.addColorStop(0, 'rgba(244, 200, 74, 0.7)')
        lg.addColorStop(0.3, 'rgba(244, 180, 60, 0.3)')
        lg.addColorStop(1, 'transparent')
        ctx.fillStyle = lg
        ctx.beginPath()
        ctx.arc(lx, ly - 5, 40, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#f4c84a'
        ctx.beginPath()
        ctx.arc(lx, ly - 5, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      })

      /* ═══ GROUND PLANTS ═══ */
      plants.forEach((p) => {
        const px = p.x * W + mouse.x * p.depth - scrollNorm * p.depth * 30
        const py = p.y * H + mouse.y * p.depth * 0.15

        if (p.type === 'lamp') {
          ctx.globalAlpha = 0.4
          ctx.fillStyle = '#5a4030'
          ctx.fillRect(px - 1.5, py - p.h, 3, p.h)
          const glow = 0.6 + Math.sin(time * 0.9 + p.x * 10) * 0.3
          ctx.globalAlpha = glow
          const lg = ctx.createRadialGradient(px, py - p.h, 0, px, py - p.h, 30)
          lg.addColorStop(0, 'rgba(244, 200, 74, 0.6)')
          lg.addColorStop(0.3, 'rgba(244, 180, 60, 0.2)')
          lg.addColorStop(1, 'transparent')
          ctx.fillStyle = lg
          ctx.beginPath()
          ctx.arc(px, py - p.h, 30, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.globalAlpha = 0.7
          ctx.fillStyle = '#0a1812'
          ctx.beginPath()
          ctx.moveTo(px - 12, py)
          ctx.bezierCurveTo(px - 18, py - 30, px - 8, py - p.h, px, py - p.h)
          ctx.bezierCurveTo(px + 8, py - p.h, px + 18, py - 30, px + 12, py)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      })

      /* ═══ FOG BANDS ═══ */
      fogBands.forEach((band) => {
        band.ph += band.drift
        const fy = band.y * H + Math.sin(band.ph * 50) * 10 + mouse.y * 0.1
        const fg = ctx.createLinearGradient(0, fy - 80, 0, fy + 80)
        fg.addColorStop(0, 'transparent')
        fg.addColorStop(0.5, `rgba(10, 20, 24, ${band.op})`)
        fg.addColorStop(1, 'transparent')
        ctx.fillStyle = fg
        ctx.fillRect(0, fy - 80, W, 160)
      })

      /* ═══ FIREFLIES ═══ */
      fireflies.forEach((f) => {
        f.x += f.vx + Math.sin(time * 0.3 + f.ph) * 0.0002
        f.y += f.vy + Math.cos(time * 0.25 + f.ph) * 0.0002
        if (f.x < 0 || f.x > 1) f.vx *= -1
        if (f.y < 0.25 || f.y > 0.85) f.vy *= -1
        const glow = Math.sin(time * f.sp + f.ph) * 0.4 + 0.6
        const fx = f.x * W + mouse.x * f.depth
        const fy = f.y * H + mouse.y * f.depth * 0.5 - scrollNorm * f.depth * 60

        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 14)
        fg.addColorStop(0, `rgba(244, 200, 74, ${glow * 0.7})`)
        fg.addColorStop(0.4, `rgba(244, 180, 60, ${glow * 0.2})`)
        fg.addColorStop(1, 'transparent')
        ctx.fillStyle = fg
        ctx.beginPath()
        ctx.arc(fx, fy, 14, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(255, 230, 120, ${glow * 0.9})`
        ctx.beginPath()
        ctx.arc(fx, fy, f.r, 0, Math.PI * 2)
        ctx.fill()
      })

      /* ═══ VIGNETTE ═══ */
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9)
      vig.addColorStop(0, 'transparent')
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])
}

export function Landing() {
  const navigate = useNavigate()
  const { signInWithProvider } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)

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
