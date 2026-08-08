import { useEffect, useRef, useState } from 'react'
import './IntroVeil.css'

// Fresh open: fade in once → hold while the page loads → on ready the logo
// fades out FAST while zooming out of the page → black fades slowly.
const FRESH_FADE_IN_MS = 1400
const FRESH_MIN_MS = 3200 // intentional minimum so the page fully loads
const ZOOM_MS = 1100
const VEIL_FADE_MS = 1800
const VEIL_DELAY_MS = 0

// Reload: normal as before — plain black, logo, quick smooth fade. No canvas.
const RELOAD_FADE_IN_MS = 700
const RELOAD_MIN_MS = 1300
const RELOAD_FADE_MS = 1000

// Golden angle (radians) — phyllotaxis spiral packing: n * GOLDEN distributes
// particles evenly, so the ember galaxy never clumps.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

type Phase = 'fadein' | 'waiting' | 'zoom' | 'fade' | 'gone'

interface Ember { ang0: number; r0: number; size: number; tw: number }
interface Star { x: number; y: number; size: number; sp: number; ph: number; warm: boolean }

function getNavType(): PerformanceNavigationTiming['type'] | 'unknown' {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming | undefined
    return nav?.type ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// The full intro plays exactly once per page-load session. Coming back to the
// page via browser back (back_forward) or any later remount never replays it.
let introPlayedInSession = false

// When the app reloads to rejoin a room (see Explore.tsx / SeatSelectionOverlay:
// the seat-boot workaround calls window.location.reload()), we must NOT replay
// the logo intro — the RoomLoader underneath already provides the loading UI.
// A quick silent black fade only.
function isRoomRejoin(): boolean {
  try { return sessionStorage.getItem('sf.seatBooted') === '1' } catch { return false }
}

export function IntroVeil({ ready }: { ready: boolean }) {
  const navTypeRef = useRef(getNavType())
  const reloadRef = useRef(navTypeRef.current === 'reload' || isRoomRejoin())
  const skipIntro = navTypeRef.current === 'back_forward' || introPlayedInSession || isRoomRejoin()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const zoomedRef = useRef(false)
  const phaseRef = useRef<{ name: Phase; t0: number }>({ name: 'fadein', t0: performance.now() })

  const fadeInMs = reloadRef.current ? RELOAD_FADE_IN_MS : FRESH_FADE_IN_MS
  const minMs = reloadRef.current ? RELOAD_MIN_MS : FRESH_MIN_MS

  const [phase, setPhase] = useState<Phase>('fadein')

  useEffect(() => {
    phaseRef.current = { name: phase, t0: performance.now() }
  }, [phase])

  // One fade-in only. After it completes the logo holds visible.
  useEffect(() => {
    const t = setTimeout(() => setPhase('waiting'), fadeInMs)
    return () => clearTimeout(t)
  }, [fadeInMs])

  // Minimum hold window so the page behind has time to load.
  const [minDone, setMinDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), minMs)
    return () => clearTimeout(t)
  }, [minMs])

  // Exit only once the page is actually loaded AND the min window passed.
  // Fresh open: fade out fastly together with the zoom.
  // Reload: no zoom — just fade the black away.
  const readyToGo = minDone && ready
  useEffect(() => {
    if (!readyToGo || phase !== 'waiting') return
    if (reloadRef.current) {
      setPhase('fade')
      return
    }
    zoomedRef.current = true
    setPhase('zoom')
  }, [readyToGo, phase])

  // After the zoom, only the black page remains — fade it slowly.
  useEffect(() => {
    if (phase !== 'zoom') return
    const t = setTimeout(() => setPhase('fade'), ZOOM_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fade') return
    const fadeMs = reloadRef.current ? RELOAD_FADE_MS : VEIL_FADE_MS + VEIL_DELAY_MS
    const t = setTimeout(() => setPhase('gone'), fadeMs)
    return () => clearTimeout(t)
  }, [phase])

  // Once the intro has fully played, never show it again this page-load session.
  useEffect(() => {
    if (phase === 'gone') introPlayedInSession = true
  }, [phase])

  /* ----------------------------------------------------------------
     Procedural fantasy geometry — drawn every frame on a full-screen
     canvas with additive blending (Netflix-style bloom):
       - phyllotaxis ember galaxy (golden-angle spiral)
       - Lissajous orbiters (elliptical x/y harmonic motion)
       - rotating dashed halo rings
       - twinkling star field
     On exit the whole scene dims to black in lockstep with the logo.
     ---------------------------------------------------------------- */
  useEffect(() => {
    if (reloadRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true ||
      document.documentElement.getAttribute('data-reduce-motion') === 'true' ||
      document.documentElement.getAttribute('data-animations') === 'off'

    const fadeInS = (reloadRef.current ? RELOAD_FADE_IN_MS : FRESH_FADE_IN_MS) / 1000
    const zoomS = ZOOM_MS / 1000

    let raf = 0
    let w = 0
    let h = 0
    let cx = 0
    let cy = 0
    let logoR = 120
    let maxR = 600
    let embers: Ember[] = []
    let orbiters: { rx: number; ry: number; sx: number; sy: number; ph: number }[] = []
    let stars: Star[] = []

    function layout() {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      cx = w / 2
      cy = h / 2
      logoR = Math.min(150, Math.min(w, h) * 0.26)
      maxR = Math.hypot(w, h) / 2

      const small = Math.min(w, h) < 640
      const emberCount = small ? 150 : 300
      const starCount = small ? 70 : 150
      const spacing = Math.max(6, Math.min(w, h) / 95)

      embers = []
      for (let i = 0; i < emberCount; i++) {
        // Golden-angle phyllotaxis: r = sqrt(1.6 i), angle = i * golden angle
        embers.push({
          ang0: i * GOLDEN_ANGLE,
          r0: logoR + 26 + Math.sqrt(i * 1.6) * spacing,
          size: 0.8 + (i % 5) * 0.35,
          tw: (i % 11) / 11,
        })
      }

      orbiters = []
      for (let k = 0; k < 10; k++) {
        orbiters.push({
          rx: logoR * (1.5 + (k % 5) * 0.38),
          ry: logoR * (1.1 + (k % 5) * 0.32),
          sx: 0.35 + (k % 3) * 0.18,
          sy: 0.45 + (k % 4) * 0.16,
          ph: k * 1.7,
        })
      }

      stars = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.5 + Math.random() * 1.2,
          sp: 0.8 + Math.random() * 2.4,
          ph: Math.random() * Math.PI * 2,
          warm: Math.random() > 0.35,
        })
      }
    }

    function draw(now: number) {
      const t = now / 1000
      const ph = phaseRef.current
      const phaseT = Math.max(0, t - ph.t0 / 1000)

      let intro = 1
      if (ph.name === 'fadein') intro = Math.min(1, phaseT / fadeInS)
      // Exit: the geometry dims to black in lockstep with the logo so the whole
      // screen goes fully dark — nothing lingers after the logo is gone.
      else if (ph.name === 'zoom') {
        intro = Math.max(0, 1 - phaseT / zoomS)
      }
      // Fade phase: the geometry is already gone (dimmed to 0 during exit). We
      // MUST keep it at 0 here — if we recomputed it from 1 the particles would
      // flash back to full brightness while the black veil fades, which reads
      // as a mess. The website is revealed only by the CSS veil fade below.
      else if (ph.name === 'fade') {
        intro = 0
      }

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      // Rotating dashed halo rings
      for (let k = 0; k < 3; k++) {
        const r = logoR * (1.25 + k * 0.62) + 8 * Math.sin(t * 0.8 + k * 2.1)
        const rot = t * (0.25 + k * 0.12)
        ctx.strokeStyle = `rgba(255,190,90,${0.14 * intro})`
        ctx.lineWidth = 1.5
        ctx.setLineDash([r * 0.4, r * 0.6])
        ctx.lineDashOffset = -rot * r * 3
        ctx.beginPath()
        ctx.arc(cx, cy, r, rot, rot + Math.PI * 2)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // Phyllotaxis ember galaxy
      for (const e of embers) {
        const a = e.ang0 + t * 0.12
        const r = e.r0 + 4 * Math.sin(t * 1.4 + e.tw * 7)
        const tw =
          0.25 +
          0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 + e.tw * Math.PI * 2), 2)
        ctx.globalAlpha = tw * intro
        ctx.fillStyle = '#ffc26a'
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, e.size * (1 + (r / maxR) * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }

      // Lissajous orbiters — two harmonic oscillators per particle
      for (const o of orbiters) {
        const x = cx + Math.sin(t * o.sx + o.ph) * o.rx
        const y = cy + Math.sin(t * o.sy + o.ph * 1.3) * o.ry
        const tw = 0.3 + 0.5 * Math.sin(t * 3 + o.ph)
        ctx.globalAlpha = tw * intro * 0.8
        ctx.fillStyle = '#ffd27a'
        ctx.beginPath()
        ctx.arc(x, y, 1.4 + (o.sx > 0.6 ? 1 : 0), 0, Math.PI * 2)
        ctx.fill()
      }

      // Twinkling star field
      for (const s of stars) {
        const tw = 0.15 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin(t * s.sp + s.ph), 2)
        ctx.globalAlpha = tw * intro
        ctx.fillStyle = s.warm ? '#ffd27a' : '#fff3d6'
        ctx.fillRect(s.x, s.y, s.size, s.size)
      }

      // Soft bloom behind the logo
      const bloomR = logoR * 3.4
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR)
      g.addColorStop(0, `rgba(255,170,60,${0.18 * intro})`)
      g.addColorStop(0.35, `rgba(255,140,40,${0.06 * intro})`)
      g.addColorStop(1, 'rgba(255,120,30,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    function loop(now: number) {
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    layout()
    window.addEventListener('resize', layout)

    if (reduced) {
      draw(2000)
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', layout)
    }
  }, [])

  if (phase === 'gone' || skipIntro) return null

  // Keep intro-zooming through the fade so the logo's zoom animation never
  // restarts (which caused a snap back to centre during the veil fade).
  const zoomed = phase === 'zoom' || (phase === 'fade' && zoomedRef.current)

  let veilClass = 'intro-veil'
  if (phase === 'zoom') veilClass += ' intro-zooming'
  else if (phase === 'fade') {
    veilClass += ' intro-leaving'
    if (zoomed) veilClass += ' intro-zooming'
    if (!reloadRef.current) veilClass += ' intro-fresh'
  }

  return (
    <div className={veilClass} role="presentation">
      {!reloadRef.current && (
        <>
          <canvas ref={canvasRef} className="intro-canvas" />
          <div className="intro-bloom" />
        </>
      )}
      <div className="intro-logo-wrap">
        <img
          className={`intro-logo${reloadRef.current ? '' : ' intro-logo-glow'}`}
          src="/icons/focus-lily-logo.png"
          alt=""
          draggable={false}
        />
      </div>
    </div>
  )
}
