// @ts-nocheck
import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import './Landing.css'

const Antigravity = lazy(() => import('./Antigravity'))
const ScrollVelocity = lazy(() => import('./ScrollVelocity'))
const Snowfall = lazy(() => import('../../components/Snowfall'))
import { ComingSoonOverlay } from '../../components/ComingSoonOverlay'

function isLocalhost() {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]'
}

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

    /* ── PRNG seeded for consistent tree shapes ── */
    const seededRand = (seed: number) => {
      let s = seed
      return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
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

    /* ── Nebula wisps ── */
    const nebulae = Array.from({ length: lowEnd ? 3 : 6 }, () => ({
      x: Math.random(), y: Math.random() * 0.32,
      rx: 0.13 + Math.random() * 0.22, ry: 0.04 + Math.random() * 0.07,
      hue: 215 + Math.random() * 65,
      opacity: 0.012 + Math.random() * 0.018,
      drift: 0.000008 + Math.random() * 0.000018,
      phase: Math.random() * Math.PI * 2,
    }))

    /* ── Aurora bands ── */
    const auroraBands = [
      { y: 0.07, amp: 32, freq: 0.0038, spd: 0.00028, hue: 148, op: 0.038, h2: 182 },
      { y: 0.11, amp: 24, freq: 0.006,  spd: 0.00019, hue: 198, op: 0.028, h2: 258 },
      { y: 0.045,amp: 18, freq: 0.0085, spd: 0.00042, hue: 275, op: 0.022, h2: 318 },
    ]

    /* ── Subtle rain ── */
    const rain = (lowEnd || reduceMotion) ? [] : Array.from({ length: 100 }, () => ({
      x: Math.random(), y: Math.random(),
      len: Math.random() * 18 + 10,
      spd: Math.random() * 9 + 16,
      op: Math.random() * 0.10 + 0.03,
      depth: 0.3 + Math.random() * 0.5,
    }))

    /* ── Fireflies (denser, lower in forest zone) ── */
    const fireflyCount = lowEnd ? 0 : (reduceMotion ? 0 : 80)
    const fireflies = Array.from({ length: fireflyCount }, () => ({
      x: Math.random(),
      y: 0.42 + Math.random() * 0.38,
      vx: (Math.random() - 0.5) * 0.00028,
      vy: (Math.random() - 0.5) * 0.00022,
      ph: Math.random() * Math.PI * 2,
      sp: 0.45 + Math.random() * 1.1,
      r: Math.random() * 1.1 + 0.5,
      depth: 0.45 + Math.random() * 0.45,
      hue: 42 + Math.random() * 18,
    }))

    /* ── God-ray shafts from moon ── */
    const godRays = Array.from({ length: 7 }, (_, i) => ({
      angle: -0.18 + i * 0.06,
      width: 18 + Math.random() * 32,
      opacity: 0.018 + Math.random() * 0.025,
      speed: 0.00008 + Math.random() * 0.00012,
      phase: Math.random() * Math.PI * 2,
    }))

    /* ── Volumetric fog bands ── */
    const fogBands = [
      { y: 0.50, op: 0.055, drift: 0.000028, ph: 0,   width: 1.3 },
      { y: 0.62, op: 0.048, drift: 0.000019, ph: 1.6, width: 1.5 },
      { y: 0.73, op: 0.040, drift: 0.000012, ph: 3.1, width: 1.8 },
      { y: 0.83, op: 0.035, drift: 0.000009, ph: 4.5, width: 2.0 },
    ]

    /* ── Mountain/hill silhouette layers ── */
    const mountainLayers = [
      { points: [], color: '#07101e', alpha: 0.30, depth: 0.12, baseY: 0.44 },
      { points: [], color: '#081818', alpha: 0.48, depth: 0.26, baseY: 0.54 },
      { points: [], color: '#061410', alpha: 0.68, depth: 0.46, baseY: 0.64 },
      { points: [], color: '#050e0b', alpha: 0.82, depth: 0.68, baseY: 0.74 },
      { points: [], color: '#030a06', alpha: 0.95, depth: 0.88, baseY: 0.86 },
    ]
    mountainLayers.forEach((layer) => {
      const segs = 60
      for (let i = 0; i <= segs; i++) {
        const x = i / segs
        const h = Math.sin(x * 6.2 + layer.depth * 9.5) * 0.09 +
                  Math.sin(x * 14.3 + layer.depth * 4.8) * 0.045 +
                  Math.sin(x * 27.1 + layer.depth * 2.1) * 0.022 +
                  Math.cos(x * 4.1  + layer.depth * 7.3) * 0.035 + 0.14
        layer.points.push({ x, h: -h })
      }
    })

    /* ── MASSIVE OAK TREE drawing function ── */
    const drawTreeBranch = (
      cx: number, cy: number, angle: number, length: number,
      depth: number, thickness: number, rand: () => number,
      darkColor: string, midColor: string, lightColor: string
    ) => {
      if (depth <= 0 || length < 3) return
      const ex = cx + Math.cos(angle) * length
      const ey = cy + Math.sin(angle) * length

      // Multi-tone bark: dark shadow side, mid, light highlight
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.quadraticCurveTo(
        cx + Math.cos(angle + 0.3) * length * 0.45 + rand() * thickness * 1.5,
        cy + Math.sin(angle + 0.3) * length * 0.45 + rand() * thickness * 1.5,
        ex, ey
      )
      ctx.strokeStyle = darkColor
      ctx.lineWidth = thickness
      ctx.lineCap = 'round'
      ctx.stroke()

      // Rim highlight on upper edge
      if (thickness > 4) {
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle - 1.2) * thickness * 0.35,
                   cy + Math.sin(angle - 1.2) * thickness * 0.35)
        ctx.quadraticCurveTo(
          cx + Math.cos(angle + 0.3) * length * 0.45 + Math.cos(angle - 1.2) * thickness * 0.3,
          cy + Math.sin(angle + 0.3) * length * 0.45 + Math.sin(angle - 1.2) * thickness * 0.3,
          ex + Math.cos(angle - 1.2) * thickness * 0.3,
          ey + Math.sin(angle - 1.2) * thickness * 0.3
        )
        ctx.strokeStyle = lightColor
        ctx.lineWidth = Math.max(1, thickness * 0.22)
        ctx.stroke()
      }

      // Recurse into sub-branches
      const spread = 0.55 + rand() * 0.3
      const leftAngle  = angle - spread * (0.6 + rand() * 0.4)
      const rightAngle = angle + spread * (0.5 + rand() * 0.5)
      const taper = 0.6 + rand() * 0.08
      const lenDecay = 0.58 + rand() * 0.12

      drawTreeBranch(ex, ey, leftAngle,  length * lenDecay, depth - 1, thickness * taper, rand, darkColor, midColor, lightColor)
      drawTreeBranch(ex, ey, rightAngle, length * (lenDecay - 0.05), depth - 1, thickness * (taper - 0.04), rand, darkColor, midColor, lightColor)

      // Extra mid branch at depth > 2
      if (depth > 2 && rand() > 0.45) {
        const midAngle = angle + (rand() - 0.5) * 0.9
        drawTreeBranch(ex, ey, midAngle, length * 0.45, depth - 2, thickness * 0.38, rand, darkColor, midColor, lightColor)
      }
    }

    const drawFoliageCluster = (fx: number, fy: number, radius: number, hue: number, sat: number, light: number, alpha: number) => {
      // Multi-layer foliage: deep shadow, mid, highlight, specular
      const g = ctx.createRadialGradient(fx - radius * 0.25, fy - radius * 0.2, radius * 0.1, fx, fy, radius)
      g.addColorStop(0, `hsla(${hue + 8},${sat}%,${light + 6}%,${alpha * 0.75})`)
      g.addColorStop(0.35, `hsla(${hue},${sat}%,${light}%,${alpha * 0.9})`)
      g.addColorStop(0.7, `hsla(${hue - 5},${sat - 5}%,${light - 8}%,${alpha})`)
      g.addColorStop(1, `hsla(${hue - 10},${sat - 10}%,${light - 16}%,0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(fx, fy, radius * (0.85 + Math.random() * 0.3), radius * (0.65 + Math.random() * 0.35), Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    /* ── Full oak tree (trunk + branches + foliage) ── */
    const drawOakTree = (
      x: number, baseY: number, trunkH: number, branchDepth: number,
      seed: number, alpha: number, foliageHue: number, foliageSat: number,
      trunkDark: string, trunkMid: string, trunkLight: string
    ) => {
      const rand = seededRand(seed)
      ctx.globalAlpha = alpha

      // Massive trunk base — wider at roots
      const trunkW = trunkH * 0.048
      const trunkGrad = ctx.createLinearGradient(x - trunkW, 0, x + trunkW, 0)
      trunkGrad.addColorStop(0, trunkDark)
      trunkGrad.addColorStop(0.22, trunkMid)
      trunkGrad.addColorStop(0.5, trunkLight)
      trunkGrad.addColorStop(0.78, trunkMid)
      trunkGrad.addColorStop(1, trunkDark)
      ctx.fillStyle = trunkGrad
      ctx.beginPath()
      ctx.moveTo(x - trunkW * 1.8, baseY)
      ctx.bezierCurveTo(x - trunkW * 1.4, baseY - trunkH * 0.15, x - trunkW * 0.9, baseY - trunkH * 0.4, x - trunkW * 0.55, baseY - trunkH)
      ctx.lineTo(x + trunkW * 0.55, baseY - trunkH)
      ctx.bezierCurveTo(x + trunkW * 0.9, baseY - trunkH * 0.4, x + trunkW * 1.4, baseY - trunkH * 0.15, x + trunkW * 1.8, baseY)
      ctx.fill()

      // Surface bark lines (texture grooves)
      for (let bi = 0; bi < 5; bi++) {
        const bx = x + (rand() - 0.5) * trunkW * 1.2
        ctx.beginPath()
        ctx.moveTo(bx, baseY)
        ctx.bezierCurveTo(bx + (rand() - 0.5) * trunkW, baseY - trunkH * 0.3,
                           bx + (rand() - 0.5) * trunkW * 0.6, baseY - trunkH * 0.6,
                           bx + (rand() - 0.5) * trunkW * 0.4, baseY - trunkH)
        ctx.strokeStyle = `rgba(0,0,0,0.25)`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Glowing moss at base
      const mossG = ctx.createRadialGradient(x, baseY - 4, 0, x, baseY - 4, trunkW * 3.5)
      mossG.addColorStop(0, 'rgba(58,140,80,0.22)')
      mossG.addColorStop(0.5, 'rgba(38,90,55,0.10)')
      mossG.addColorStop(1, 'transparent')
      ctx.fillStyle = mossG
      ctx.beginPath()
      ctx.ellipse(x, baseY - 2, trunkW * 3.5, trunkW * 1.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Exposed roots
      for (let ri = 0; ri < 4; ri++) {
        const rootAngle = (-Math.PI * 0.15) + (ri / 3) * (-Math.PI * 0.7)
        const rootLen = trunkW * (2.2 + rand() * 1.8)
        ctx.beginPath()
        ctx.moveTo(x, baseY - trunkH * 0.05)
        ctx.bezierCurveTo(
          x + Math.cos(rootAngle) * rootLen * 0.5, baseY + rand() * 5,
          x + Math.cos(rootAngle) * rootLen * 0.8, baseY - rand() * 3,
          x + Math.cos(rootAngle) * rootLen, baseY + rand() * 4 - 2
        )
        ctx.strokeStyle = trunkDark
        ctx.lineWidth = Math.max(2, trunkW * 0.35 * (1 - ri * 0.15))
        ctx.stroke()
        // Root moss glow
        const rg = ctx.createRadialGradient(x + Math.cos(rootAngle) * rootLen * 0.7, baseY, 0, x + Math.cos(rootAngle) * rootLen * 0.7, baseY, 14)
        rg.addColorStop(0, 'rgba(80,200,100,0.14)')
        rg.addColorStop(1, 'transparent')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(x + Math.cos(rootAngle) * rootLen * 0.7, baseY, 14, 0, Math.PI * 2)
        ctx.fill()
      }

      // Main branches
      const trunkTip = { x, y: baseY - trunkH }
      drawTreeBranch(trunkTip.x, trunkTip.y, -Math.PI / 2 - 0.15, trunkH * 0.48, branchDepth, trunkW * 0.9, rand, trunkDark, trunkMid, trunkLight)
      drawTreeBranch(trunkTip.x, trunkTip.y, -Math.PI / 2 + 0.12, trunkH * 0.42, branchDepth, trunkW * 0.82, rand, trunkDark, trunkMid, trunkLight)
      drawTreeBranch(trunkTip.x, trunkTip.y + trunkH * 0.12, -Math.PI / 2 - 0.42, trunkH * 0.35, branchDepth - 1, trunkW * 0.58, rand, trunkDark, trunkMid, trunkLight)
      drawTreeBranch(trunkTip.x, trunkTip.y + trunkH * 0.18, -Math.PI / 2 + 0.55, trunkH * 0.32, branchDepth - 1, trunkW * 0.52, rand, trunkDark, trunkMid, trunkLight)

      // Dense foliage clusters
      const foliageSeed = seededRand(seed + 1000)
      const fCount = 18 + Math.floor(foliageSeed() * 12)
      for (let fi = 0; fi < fCount; fi++) {
        const fRand = foliageSeed()
        const fAngle = -Math.PI * 1.1 + fRand * Math.PI * 1.2
        const fDist = trunkH * (0.5 + foliageSeed() * 0.55)
        const fR = trunkH * (0.10 + foliageSeed() * 0.14)
        const fLightVar = foliageSeed() * 18 - 4
        const fAlphaVar = 0.55 + foliageSeed() * 0.38
        drawFoliageCluster(
          trunkTip.x + Math.cos(fAngle) * fDist,
          trunkTip.y + Math.sin(fAngle) * fDist,
          fR, foliageHue, foliageSat, 10 + fLightVar, fAlphaVar * alpha
        )
      }
      ctx.globalAlpha = 1
    }

    /* ── FERN drawing helper ── */
    const drawFern = (fx: number, fy: number, scale: number, angle: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha
      const fronds = 5 + Math.floor(Math.random() * 3)
      for (let fi = 0; fi < fronds; fi++) {
        const frondAngle = angle - Math.PI * 0.55 + (fi / (fronds - 1)) * Math.PI * 1.1
        const len = scale * (0.7 + Math.random() * 0.5)
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        const cx1 = fx + Math.cos(frondAngle - 0.3) * len * 0.5
        const cy1 = fy + Math.sin(frondAngle - 0.3) * len * 0.5
        ctx.quadraticCurveTo(cx1, cy1, fx + Math.cos(frondAngle) * len, fy + Math.sin(frondAngle) * len)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5 * scale / 25
        ctx.stroke()
        // leaflets
        for (let li = 0; li < 5; li++) {
          const t = (li + 1) / 7
          const lx = fx + Math.cos(frondAngle) * len * t + (cx1 - fx) * t * (1 - t) * 2
          const ly = fy + Math.sin(frondAngle) * len * t + (cy1 - fy) * t * (1 - t) * 2
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(lx + Math.cos(frondAngle - 1.2) * scale * 0.12,
                     ly + Math.sin(frondAngle - 1.2) * scale * 0.12)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(lx + Math.cos(frondAngle + 1.2) * scale * 0.12,
                     ly + Math.sin(frondAngle + 1.2) * scale * 0.12)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }

    /* ── ANCIENT STONE KEEP ── */
    const drawAncientTower = (tx: number, baseY: number, parallaxX: number, parallaxY: number, globalAlpha: number, time: number) => {
      ctx.globalAlpha = globalAlpha
      const tw = 62  // main tower width
      const th = H * 0.52  // tower height

      // Stone color palette
      const stoneBase = ctx.createLinearGradient(tx - tw, 0, tx + tw * 1.6, 0)
      stoneBase.addColorStop(0, '#151a12')
      stoneBase.addColorStop(0.18, '#1e2418')
      stoneBase.addColorStop(0.5, '#262e1e')
      stoneBase.addColorStop(0.8, '#1a2016')
      stoneBase.addColorStop(1, '#111510')

      // Main tower body
      ctx.fillStyle = stoneBase
      ctx.beginPath()
      ctx.moveTo(tx - tw * 0.5, baseY)
      ctx.lineTo(tx - tw * 0.5, baseY - th)
      ctx.lineTo(tx + tw, baseY - th)
      ctx.lineTo(tx + tw, baseY)
      ctx.fill()

      // Left turret (smaller, set back)
      const lturW = tw * 0.45, lturH = th * 0.72
      ctx.fillStyle = '#181f14'
      ctx.fillRect(tx - tw * 0.8, baseY - lturH, lturW, lturH)

      // Right turret
      const rturW = tw * 0.38, rturH = th * 0.62
      ctx.fillStyle = '#141b11'
      ctx.fillRect(tx + tw * 0.75, baseY - rturH, rturW, rturH)

      // Stone horizontal band lines (ashlar texture)
      ctx.strokeStyle = 'rgba(0,0,0,0.32)'
      ctx.lineWidth = 1
      for (let bi = 1; bi < 14; bi++) {
        const by = baseY - th * (bi / 14)
        ctx.beginPath()
        ctx.moveTo(tx - tw * 0.5, by)
        ctx.lineTo(tx + tw, by)
        ctx.stroke()
      }
      // Vertical joint lines (irregular)
      for (let ji = 0; ji < 8; ji++) {
        const jx = tx - tw * 0.5 + (ji / 7) * tw * 1.5
        ctx.beginPath()
        ctx.moveTo(jx, baseY)
        ctx.lineTo(jx + (Math.random() - 0.5) * 4, baseY - th * (0.3 + Math.random() * 0.6))
        ctx.stroke()
      }

      // Battlements on main tower
      const merlonW = 14, merlonH = 18, merlonGap = 10
      const battStart = tx - tw * 0.5
      for (let mi = 0; mi < 4; mi++) {
        const mx = battStart + mi * (merlonW + merlonGap)
        ctx.fillStyle = '#1c2418'
        ctx.fillRect(mx, baseY - th - merlonH, merlonW, merlonH)
      }
      // Left turret battlements
      for (let mi = 0; mi < 3; mi++) {
        ctx.fillStyle = '#161d12'
        ctx.fillRect(tx - tw * 0.8 + mi * 14, baseY - lturH - 14, 9, 14)
      }
      // Right turret battlements
      for (let mi = 0; mi < 3; mi++) {
        ctx.fillStyle = '#131910'
        ctx.fillRect(tx + tw * 0.75 + mi * 11, baseY - rturH - 12, 7, 12)
      }

      // Conical rooftip on left turret
      ctx.fillStyle = '#0f1510'
      ctx.beginPath()
      ctx.moveTo(tx - tw * 0.8, baseY - lturH - 14)
      ctx.lineTo(tx - tw * 0.8 + lturW, baseY - lturH - 14)
      ctx.lineTo(tx - tw * 0.8 + lturW * 0.5, baseY - lturH - 14 - 32)
      ctx.fill()

      // Main arched gate opening (base)
      const gateW = tw * 0.35, gateH = th * 0.22
      const gateCx = tx + tw * 0.22
      ctx.fillStyle = 'rgba(2,4,3,0.9)'
      ctx.beginPath()
      ctx.moveTo(gateCx - gateW / 2, baseY)
      ctx.lineTo(gateCx - gateW / 2, baseY - gateH * 0.6)
      ctx.quadraticCurveTo(gateCx - gateW / 2, baseY - gateH, gateCx, baseY - gateH)
      ctx.quadraticCurveTo(gateCx + gateW / 2, baseY - gateH, gateCx + gateW / 2, baseY - gateH * 0.6)
      ctx.lineTo(gateCx + gateW / 2, baseY)
      ctx.fill()
      // Gate keystone
      ctx.fillStyle = '#2a3222'
      ctx.beginPath()
      ctx.moveTo(gateCx - 6, baseY - gateH)
      ctx.lineTo(gateCx + 6, baseY - gateH)
      ctx.lineTo(gateCx + 4, baseY - gateH - 14)
      ctx.lineTo(gateCx - 4, baseY - gateH - 14)
      ctx.fill()

      // Tall arched windows (main tower)
      const winData = [
        { ox: tw * 0.14, oy: th * 0.15, w: 11, h: 26 },
        { ox: tw * 0.5, oy: th * 0.22, w: 11, h: 26 },
        { ox: tw * 0.14, oy: th * 0.40, w: 11, h: 22 },
        { ox: tw * 0.5, oy: th * 0.48, w: 11, h: 22 },
        { ox: tw * 0.14, oy: th * 0.62, w: 9, h: 18 },
      ]
      const winGlow = 0.55 + Math.sin(time * 0.85) * 0.22
      const winGlow2 = 0.55 + Math.sin(time * 0.7 + 1.4) * 0.18
      winData.forEach((w, wi) => {
        const wx = tx - tw * 0.5 + w.ox, wy = baseY - th + th * w.oy
        const g = wi % 2 === 0 ? winGlow : winGlow2
        // Arch window
        ctx.fillStyle = `rgba(4,3,8,0.92)`
        ctx.beginPath()
        ctx.moveTo(wx - w.w / 2, wy + w.h * 0.35)
        ctx.lineTo(wx - w.w / 2, wy)
        ctx.quadraticCurveTo(wx, wy - w.h * 0.4, wx + w.w / 2, wy)
        ctx.lineTo(wx + w.w / 2, wy + w.h * 0.35)
        ctx.fill()
        // Candlelight glow
        ctx.globalAlpha = g * globalAlpha * 0.7
        const wg = ctx.createRadialGradient(wx, wy + w.h * 0.1, 0, wx, wy + w.h * 0.1, w.w * 3.5)
        wg.addColorStop(0, 'rgba(244,200,74,0.55)')
        wg.addColorStop(0.4, 'rgba(244,160,50,0.18)')
        wg.addColorStop(1, 'transparent')
        ctx.fillStyle = wg
        ctx.beginPath()
        ctx.arc(wx, wy + w.h * 0.1, w.w * 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = globalAlpha
      })
      // Left turret small window
      const lw = { x: tx - tw * 0.57, y: baseY - lturH + lturH * 0.35, w: 7, h: 16 }
      ctx.globalAlpha = winGlow * globalAlpha * 0.65
      ctx.fillStyle = 'rgba(244,180,60,0.35)'
      ctx.beginPath()
      ctx.moveTo(lw.x - lw.w / 2, lw.y + lw.h * 0.4)
      ctx.lineTo(lw.x - lw.w / 2, lw.y)
      ctx.quadraticCurveTo(lw.x, lw.y - lw.h * 0.35, lw.x + lw.w / 2, lw.y)
      ctx.lineTo(lw.x + lw.w / 2, lw.y + lw.h * 0.4)
      ctx.fill()

      // Moss patches on stone surface
      ctx.globalAlpha = 0.18 * globalAlpha
      const mossColor = ctx.createLinearGradient(tx - tw * 0.5, baseY - th, tx - tw * 0.5, baseY)
      mossColor.addColorStop(0, 'transparent')
      mossColor.addColorStop(0.5, 'rgba(52,110,62,0.35)')
      mossColor.addColorStop(1, 'rgba(42,90,52,0.5)')
      ctx.fillStyle = mossColor
      ctx.fillRect(tx - tw * 0.5, baseY - th, tw * 0.15, th)
      ctx.fillRect(tx + tw * 0.6, baseY - th * 0.4, tw * 0.1, th * 0.4)

      // Ivy vines climbing right edge
      ctx.globalAlpha = 0.22 * globalAlpha
      for (let iv = 0; iv < 6; iv++) {
        const ivx = tx + tw * (0.62 + iv * 0.04)
        ctx.beginPath()
        ctx.moveTo(ivx, baseY)
        for (let s = 0; s < 8; s++) {
          ctx.lineTo(ivx + Math.sin(s * 0.8 + iv) * 4, baseY - th * (s / 7))
        }
        ctx.strokeStyle = '#3a6a3a'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Stone-base rubble at foot
      ctx.globalAlpha = 0.45 * globalAlpha
      ctx.fillStyle = '#1a2015'
      for (let ri = 0; ri < 8; ri++) {
        const rw = 8 + Math.sin(ri * 2.1) * 5
        const rh = 5 + Math.sin(ri * 1.7) * 3
        ctx.beginPath()
        ctx.ellipse(tx - tw * 0.7 + ri * 18, baseY + 3, rw, rh, Math.sin(ri) * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Moon-lit rim glow on tower top-right edge
      ctx.globalAlpha = 0.12 * globalAlpha
      ctx.strokeStyle = 'rgba(220,210,170,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(tx + tw, baseY - th)
      ctx.lineTo(tx + tw, baseY)
      ctx.stroke()

      ctx.globalAlpha = 1
    }

    /* ── DETAILED IRON LANTERN ── */
    const drawLantern = (lx: number, ly: number, glow: number, time: number, i: number, globalAlpha: number) => {
      ctx.globalAlpha = globalAlpha * 0.7

      // Post: rough iron pole
      const poleH = 55 + (i % 3) * 12
      const postGrad = ctx.createLinearGradient(lx - 2, ly, lx + 2, ly)
      postGrad.addColorStop(0, '#1a1208')
      postGrad.addColorStop(0.5, '#2e2010')
      postGrad.addColorStop(1, '#0e0a06')
      ctx.strokeStyle = postGrad
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(lx, ly)
      ctx.lineTo(lx, ly - poleH)
      ctx.stroke()

      // Curved arm bracket
      ctx.beginPath()
      ctx.moveTo(lx, ly - poleH * 0.75)
      ctx.bezierCurveTo(lx + 3, ly - poleH * 0.85, lx + 10, ly - poleH * 0.9, lx + 14, ly - poleH * 0.88)
      ctx.strokeStyle = '#221a0c'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Hanging chain (3 links)
      for (let ci = 0; ci < 3; ci++) {
        const cy = ly - poleH * 0.88 - ci * 5
        ctx.beginPath()
        ctx.ellipse(lx + 14, cy, 2.5, 1.8, 0.3 + ci * 0.2, 0, Math.PI * 2)
        ctx.strokeStyle = '#1e1609'
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // Lantern body (hexagonal shape approximated)
      const lbx = lx + 14, lby = ly - poleH * 0.88 - 18
      const lbW = 9, lbH = 14
      ctx.globalAlpha = globalAlpha * 0.85

      // Lantern cap
      ctx.fillStyle = '#1a1308'
      ctx.beginPath()
      ctx.moveTo(lbx - lbW * 1.2, lby - lbH * 0.8)
      ctx.lineTo(lbx, lby - lbH * 1.25)
      ctx.lineTo(lbx + lbW * 1.2, lby - lbH * 0.8)
      ctx.fill()

      // Glass panels (warm amber)
      const lanternGlassA = 0.55 + Math.sin(time * 1.4 + i * 1.8) * 0.22
      ctx.globalAlpha = globalAlpha * lanternGlassA
      ctx.fillStyle = `rgba(244,190,60,0.7)`
      ctx.beginPath()
      ctx.rect(lbx - lbW, lby - lbH, lbW * 2, lbH)
      ctx.fill()

      // Iron frame lines over glass
      ctx.globalAlpha = globalAlpha * 0.8
      ctx.strokeStyle = '#14100a'
      ctx.lineWidth = 1.2
      ctx.strokeRect(lbx - lbW, lby - lbH, lbW * 2, lbH)
      ctx.beginPath()
      ctx.moveTo(lbx, lby - lbH)
      ctx.lineTo(lbx, lby)
      ctx.stroke()
      // Horizontal mid-bar
      ctx.beginPath()
      ctx.moveTo(lbx - lbW, lby - lbH / 2)
      ctx.lineTo(lbx + lbW, lby - lbH / 2)
      ctx.stroke()

      // Bottom finial
      ctx.fillStyle = '#181208'
      ctx.beginPath()
      ctx.moveTo(lbx - lbW, lby)
      ctx.lineTo(lbx + lbW, lby)
      ctx.lineTo(lbx, lby + 8)
      ctx.fill()

      // Outer warm glow pool on ground
      ctx.globalAlpha = glow * globalAlpha * 0.65
      const glowPool = ctx.createRadialGradient(lbx, lby - lbH * 0.4, 0, lbx, lby - lbH * 0.4, 55)
      glowPool.addColorStop(0, 'rgba(244,200,74,0.6)')
      glowPool.addColorStop(0.3, 'rgba(244,170,50,0.22)')
      glowPool.addColorStop(0.65, 'rgba(180,120,30,0.07)')
      glowPool.addColorStop(1, 'transparent')
      ctx.fillStyle = glowPool
      ctx.beginPath()
      ctx.arc(lbx, lby - lbH * 0.4, 55, 0, Math.PI * 2)
      ctx.fill()

      // Bright flame core
      ctx.globalAlpha = lanternGlassA * globalAlpha * 0.9
      ctx.fillStyle = `rgba(255,235,130,${0.85 + Math.sin(time * 3.2 + i) * 0.12})`
      ctx.beginPath()
      ctx.arc(lbx, lby - lbH * 0.5, 2.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 1
    }

    /* ── GROUND FERNS & VEGETATION ── */
    const groundVegetation = Array.from({ length: lowEnd ? 10 : 35 }, (_, i) => ({
      x: i / 34 + (Math.random() - 0.5) * 0.028,
      y: 0.78 + Math.sin(i * 0.6) * 0.025,
      scale: 18 + Math.random() * 28,
      depth: 0.72 + Math.random() * 0.28,
      type: i % 4 === 0 ? 'lamp' : (i % 7 === 0 ? 'reed' : 'fern'),
      seed: Math.random() * 1000,
      sway: Math.random() * 0.8 + 0.5,
      swayPh: Math.random() * Math.PI * 2,
    }))

    /* ── Lantern posts ── */
    const lanterns = [
      { x: 0.18, y: 0.78, depth: 0.55 },
      { x: 0.33, y: 0.80, depth: 0.60 },
      { x: 0.55, y: 0.79, depth: 0.58 },
      { x: 0.76, y: 0.81, depth: 0.65 },
      { x: 0.88, y: 0.78, depth: 0.52 },
    ]

    /* ── Tower ── */
    const tower = { x: 0.12, y: 0.42, depth: 0.38 }

    let time = 0
    let raf = 0
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const draw = () => {
      time += 0.008
      mouse.x = lerp(mouse.x, mouse.tx, 0.036)
      mouse.y = lerp(mouse.y, mouse.ty, 0.036)
      const scroll = scrollRef.current || 0
      const scrollNorm = Math.min(scroll / (document.body.scrollHeight - H), 1)

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

      /* ═══ NEBULAE ═══ */
      nebulae.forEach((n) => {
        n.phase += n.drift
        const cx = (n.x + Math.sin(n.phase) * 0.018) * W + mouse.x * 0.025
        const cy = n.y * H + mouse.y * 0.015
        const rx = n.rx * W, ry = n.ry * H
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx)
        g.addColorStop(0, `hsla(${n.hue},55%,48%,${n.opacity})`)
        g.addColorStop(0.5, `hsla(${n.hue + 22},45%,38%,${n.opacity * 0.45})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      /* ═══ AURORA ═══ */
      auroraBands.forEach((a) => {
        const baseY = a.y * H + mouse.y * 0.045
        ctx.beginPath()
        ctx.moveTo(0, baseY)
        for (let x = 0; x <= W; x += 3) {
          const wave = Math.sin(x * a.freq + time * a.spd * 90) * a.amp +
                       Math.sin(x * a.freq * 2.4 + time * a.spd * 55) * a.amp * 0.38
          ctx.lineTo(x, baseY + wave)
        }
        ctx.lineTo(W, baseY + 90); ctx.lineTo(0, baseY + 90); ctx.closePath()
        const g = ctx.createLinearGradient(0, baseY - 35, 0, baseY + 90)
        g.addColorStop(0, `hsla(${a.hue},68%,48%,0)`)
        g.addColorStop(0.28, `hsla(${a.hue},68%,48%,${a.op})`)
        g.addColorStop(0.5, `hsla(${a.h2},68%,52%,${a.op * 0.55})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g; ctx.fill()
      })

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

      /* ═══ GOD-RAY SHAFTS FROM MOON ═══ */
      godRays.forEach((gr, ri) => {
        gr.phase += gr.speed
        const rayAlpha = gr.opacity * (0.7 + Math.sin(gr.phase * 60) * 0.3)
        ctx.globalAlpha = rayAlpha
        const rayAngle = gr.angle + Math.sin(gr.phase * 40) * 0.015
        const rayLen = H * 1.4
        const x1 = moonX - Math.cos(rayAngle + Math.PI / 2) * gr.width / 2
        const y1 = moonY - Math.sin(rayAngle + Math.PI / 2) * gr.width / 2
        const x2 = moonX + Math.cos(rayAngle + Math.PI / 2) * gr.width / 2
        const y2 = moonY + Math.sin(rayAngle + Math.PI / 2) * gr.width / 2
        const x3 = x2 + Math.cos(rayAngle) * rayLen
        const y3 = y2 + Math.sin(rayAngle) * rayLen
        const x4 = x1 + Math.cos(rayAngle) * rayLen
        const y4 = y1 + Math.sin(rayAngle) * rayLen
        const rg = ctx.createLinearGradient(moonX, moonY, moonX + Math.cos(rayAngle) * rayLen * 0.6, moonY + Math.sin(rayAngle) * rayLen * 0.6)
        rg.addColorStop(0, 'rgba(245,220,150,0.22)')
        rg.addColorStop(0.3, 'rgba(220,195,120,0.08)')
        rg.addColorStop(1, 'transparent')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4)
        ctx.closePath(); ctx.fill()
        ctx.globalAlpha = 1
      })

      /* ═══ SUBTLE RAIN ═══ */
      ctx.lineCap = 'round'
      rain.forEach((r) => {
        r.y += r.spd * 0.009
        if (r.y > 1.15) { r.y = -0.05; r.x = Math.random() }
        const rx = r.x * W + mouse.x * r.depth
        const ry = r.y * H + mouse.y * r.depth
        ctx.strokeStyle = `rgba(168,198,218,${r.op})`
        ctx.lineWidth = r.depth * 1.0
        ctx.beginPath()
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx - 0.8, ry + r.len)
        ctx.stroke()
      })

      /* ═══ MOUNTAIN/FOREST SILHOUETTE LAYERS ═══ */
      mountainLayers.forEach((layer, li) => {
        const parallaxX = mouse.x * layer.depth
        const parallaxY = mouse.y * layer.depth * 0.4
        const scrollShift = scrollNorm * layer.depth * 70

        // Fill silhouette
        ctx.globalAlpha = layer.alpha
        ctx.fillStyle = layer.color
        ctx.beginPath()
        ctx.moveTo(0, H)
        layer.points.forEach((p, pi) => {
          const px = p.x * W + parallaxX
          const py = (layer.baseY + p.h) * H + parallaxY - scrollShift
          if (pi === 0) ctx.moveTo(-10, H)
          if (pi === 0) ctx.lineTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.lineTo(W + 10, H)
        ctx.closePath()
        ctx.fill()

        // Moonlit rim highlight on nearer layers
        if (li >= 2) {
          ctx.globalAlpha = layer.alpha * 0.18
          ctx.strokeStyle = `rgba(200,185,140,0.3)`
          ctx.lineWidth = 1.2
          ctx.beginPath()
          layer.points.forEach((p, pi) => {
            const px = p.x * W + parallaxX
            const py = (layer.baseY + p.h) * H + parallaxY - scrollShift
            if (pi === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.stroke()
        }

        // Mist between mountain layers
        if (li < mountainLayers.length - 1) {
          const nextLayer = mountainLayers[li + 1]
          const mistY = layer.baseY * H + parallaxY - scrollShift
          const mistG = ctx.createLinearGradient(0, mistY - 30, 0, mistY + 50)
          mistG.addColorStop(0, 'transparent')
          mistG.addColorStop(0.4, `rgba(15,25,30,${0.08 + li * 0.03})`)
          mistG.addColorStop(1, 'transparent')
          ctx.globalAlpha = 1
          ctx.fillStyle = mistG
          ctx.fillRect(0, mistY - 30, W, 80)
        }

        ctx.globalAlpha = 1
      })

      /* ═══ LARGE OAK TREES (BACKGROUND) ═══ */
      // Far left big oak
      {
        const tpx = W * 0.06 + mouse.x * 0.22 - scrollNorm * 15
        const tpy = H * 0.82 + mouse.y * 0.1
        drawOakTree(tpx, tpy, H * 0.48, 5, 1001, 0.45, 128, 38, '#0a1208', '#131a0e', '#1c2614')
      }
      // Right background oak
      {
        const tpx = W * 0.88 + mouse.x * 0.18 - scrollNorm * 12
        const tpy = H * 0.84 + mouse.y * 0.08
        drawOakTree(tpx, tpy, H * 0.44, 5, 2002, 0.40, 132, 36, '#0b1309', '#141b0f', '#1d2615')
      }
      // Center-far oak
      {
        const tpx = W * 0.52 + mouse.x * 0.14 - scrollNorm * 8
        const tpy = H * 0.80 + mouse.y * 0.06
        drawOakTree(tpx, tpy, H * 0.38, 4, 3003, 0.30, 125, 34, '#0a1208', '#111810', '#1a2212')
      }

      /* ═══ ANCIENT TOWER ═══ */
      {
        const tpx = tower.x * W + mouse.x * tower.depth - scrollNorm * 18
        const tpy = tower.y * H + mouse.y * tower.depth * 0.3 - scrollNorm * tower.depth * 55
        drawAncientTower(tpx, tpy, tpy + H * 0.58, mouse.x * tower.depth, mouse.y * tower.depth, 0.72, time)
      }

      /* ═══ FOREGROUND MASSIVE TRUNKS (close, dark, no detailed foliage) ═══ */
      const fgTrunks = [
        { x: 0.03, baseY: 1.0, tw: 0.022, h: 0.72, seed: 5001, depth: 0.92, alpha: 0.88 },
        { x: 0.96, baseY: 1.0, tw: 0.020, h: 0.68, seed: 6001, depth: 0.90, alpha: 0.85 },
        { x: 0.14, baseY: 1.02, tw: 0.016, h: 0.58, seed: 7001, depth: 0.85, alpha: 0.78 },
        { x: 0.86, baseY: 1.02, tw: 0.014, h: 0.55, seed: 8001, depth: 0.82, alpha: 0.75 },
      ]
      fgTrunks.forEach((ft) => {
        const ftX = ft.x * W + mouse.x * ft.depth - scrollNorm * ft.depth * 20
        const ftY = ft.baseY * H + mouse.y * ft.depth * 0.2
        const ftH = ft.h * H
        const ftW = ft.tw * W
        ctx.globalAlpha = ft.alpha

        // Thick bark gradient
        const ftG = ctx.createLinearGradient(ftX - ftW, 0, ftX + ftW, 0)
        ftG.addColorStop(0, '#060a05')
        ftG.addColorStop(0.2, '#0d1409')
        ftG.addColorStop(0.5, '#141c0e')
        ftG.addColorStop(0.78, '#0c1308')
        ftG.addColorStop(1, '#050904')
        ctx.fillStyle = ftG

        // Trunk with natural taper
        ctx.beginPath()
        ctx.moveTo(ftX - ftW * 1.6, ftY)
        ctx.bezierCurveTo(ftX - ftW * 1.2, ftY - ftH * 0.12, ftX - ftW * 0.6, ftY - ftH * 0.5, ftX - ftW * 0.4, ftY - ftH)
        ctx.lineTo(ftX + ftW * 0.4, ftY - ftH)
        ctx.bezierCurveTo(ftX + ftW * 0.6, ftY - ftH * 0.5, ftX + ftW * 1.2, ftY - ftH * 0.12, ftX + ftW * 1.6, ftY)
        ctx.fill()

        // Bark texture
        const rand = seededRand(ft.seed)
        for (let bi = 0; bi < 6; bi++) {
          const bx = ftX + (rand() - 0.5) * ftW * 1.1
          ctx.beginPath()
          ctx.moveTo(bx, ftY)
          ctx.bezierCurveTo(bx + (rand() - 0.5) * ftW * 0.5, ftY - ftH * 0.3,
                             bx + (rand() - 0.5) * ftW * 0.4, ftY - ftH * 0.6,
                             bx + (rand() - 0.5) * ftW * 0.3, ftY - ftH)
          ctx.strokeStyle = 'rgba(0,0,0,0.28)'
          ctx.lineWidth = 1.2
          ctx.stroke()
        }

        // Moonlit highlight on trunk edge
        ctx.strokeStyle = 'rgba(180,160,110,0.06)'
        ctx.lineWidth = ftW * 0.18
        ctx.beginPath()
        ctx.moveTo(ftX + ftW * 0.42, ftY)
        ctx.bezierCurveTo(ftX + ftW * 0.62, ftY - ftH * 0.5, ftX + ftW * 1.18, ftY - ftH * 0.12, ftX + ftW * 1.58, ftY)
        ctx.stroke()

        // Glowing roots
        for (let ri = 0; ri < 5; ri++) {
          const rAngle = -Math.PI * 0.05 - (ri / 4) * Math.PI * 0.9
          const rLen = ftW * (1.8 + rand() * 1.6)
          ctx.strokeStyle = '#0a1008'
          ctx.lineWidth = Math.max(2.5, ftW * 0.28 * (1 - ri * 0.12))
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(ftX, ftY - ftH * 0.06)
          ctx.bezierCurveTo(
            ftX + Math.cos(rAngle) * rLen * 0.45, ftY + rand() * 6,
            ftX + Math.cos(rAngle) * rLen * 0.75, ftY - rand() * 4,
            ftX + Math.cos(rAngle) * rLen, ftY + rand() * 5 - 2.5
          )
          ctx.stroke()
          const rMossG = ctx.createRadialGradient(ftX + Math.cos(rAngle) * rLen * 0.65, ftY, 0, ftX + Math.cos(rAngle) * rLen * 0.65, ftY, 16)
          rMossG.addColorStop(0, 'rgba(70,190,90,0.12)')
          rMossG.addColorStop(1, 'transparent')
          ctx.fillStyle = rMossG
          ctx.beginPath()
          ctx.arc(ftX + Math.cos(rAngle) * rLen * 0.65, ftY, 16, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      })

      /* ═══ LANTERNS ═══ */
      lanterns.forEach((l, i) => {
        const lx = l.x * W + mouse.x * l.depth - scrollNorm * l.depth * 35
        const ly = l.y * H + mouse.y * l.depth * 0.18
        const glow = 0.58 + Math.sin(time * 1.25 + i * 1.6) * 0.28
        drawLantern(lx, ly, glow, time, i, 0.82)
      })

      /* ═══ GROUND VEGETATION (FERNS & REEDS) ═══ */
      groundVegetation.forEach((p) => {
        const px = p.x * W + mouse.x * p.depth - scrollNorm * p.depth * 25
        const py = p.y * H + mouse.y * p.depth * 0.12
        const sway = Math.sin(time * p.sway + p.swayPh) * 0.04

        if (p.type === 'fern') {
          drawFern(px, py, p.scale, -Math.PI / 2 + sway, '#1a3a1a', 0.55 + p.depth * 0.2)
        } else if (p.type === 'reed') {
          // Tall thin reed
          ctx.globalAlpha = 0.45
          ctx.strokeStyle = '#1c2e14'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(px + sway * p.scale * 1.2, py - p.scale * 1.4)
          ctx.stroke()
          // Reed head
          ctx.fillStyle = '#2a3a18'
          ctx.beginPath()
          ctx.ellipse(px + sway * p.scale, py - p.scale * 1.4, 2.5, 6, sway, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      })

      /* ═══ VOLUMETRIC FOG BANDS ═══ */
      fogBands.forEach((band) => {
        band.ph += band.drift
        const fy = band.y * H + Math.sin(band.ph * 45) * 12 + mouse.y * 0.08
        const fWidth = band.width * W
        const fStart = W * 0.5 - fWidth * 0.5
        const fg = ctx.createLinearGradient(fStart, fy - 90, fStart, fy + 90)
        fg.addColorStop(0, 'transparent')
        fg.addColorStop(0.35, `rgba(12,22,28,${band.op})`)
        fg.addColorStop(0.65, `rgba(10,18,22,${band.op * 0.8})`)
        fg.addColorStop(1, 'transparent')
        ctx.fillStyle = fg
        ctx.fillRect(0, fy - 90, W, 180)
      })

      /* ═══ FIREFLIES ═══ */
      fireflies.forEach((f) => {
        f.x += f.vx + Math.sin(time * 0.28 + f.ph) * 0.00018
        f.y += f.vy + Math.cos(time * 0.22 + f.ph) * 0.00016
        if (f.x < 0 || f.x > 1) f.vx *= -1
        if (f.y < 0.28 || f.y > 0.88) f.vy *= -1
        const glow = Math.sin(time * f.sp + f.ph) * 0.38 + 0.62
        const fx = f.x * W + mouse.x * f.depth
        const fy = f.y * H + mouse.y * f.depth * 0.45 - scrollNorm * f.depth * 55

        // Soft outer halo
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 16)
        fg.addColorStop(0, `hsla(${f.hue},88%,68%,${glow * 0.62})`)
        fg.addColorStop(0.35, `hsla(${f.hue},75%,55%,${glow * 0.20})`)
        fg.addColorStop(1, 'transparent')
        ctx.fillStyle = fg
        ctx.beginPath()
        ctx.arc(fx, fy, 16, 0, Math.PI * 2)
        ctx.fill()

        // Bright core
        ctx.fillStyle = `hsla(${f.hue + 10},95%,82%,${glow * 0.88})`
        ctx.beginPath()
        ctx.arc(fx, fy, f.r * 0.9, 0, Math.PI * 2)
        ctx.fill()
      })

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

  const [showComingSoon, setShowComingSoon] = useState(false)

  const goToApp = useCallback(() => {
    if (isLocalhost()) {
      navigate('/rooms')
    } else {
      setShowComingSoon(true)
    }
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

      {showComingSoon && (
        <ComingSoonOverlay onClose={() => setShowComingSoon(false)} />
      )}
    </div>
  )
}
