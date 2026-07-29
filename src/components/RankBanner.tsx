import { useEffect, useRef, useState } from 'react'
import type { Rank } from '../lib/ranks'

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'crystal' | 'focuster'

const tierFromRank = (rank: Rank): Tier => {
  const id = rank.id
  if (id.startsWith('bronze')) return 'bronze'
  if (id.startsWith('silver')) return 'silver'
  if (id.startsWith('gold')) return 'gold'
  if (id.startsWith('platinum')) return 'platinum'
  if (id.startsWith('diamond')) return 'diamond'
  if (id.startsWith('crystal')) return 'crystal'
  return 'focuster'
}

const tierConfig: Record<Tier, {
  name: string
  colors: string[]
  glowColors: string[]
  particleColors: string[]
  particleCount: number
  particleSize: [number, number]
  particleSpeed: [number, number]
  ambientGradient: string
  badgeGlow: string
}> = {
  bronze: {
    name: 'Bronze',
    colors: ['#8c5e3c', '#6b4423', '#4a2f14', '#2d1810'],
    glowColors: ['#cd7f32', '#b87330', '#a05d2a'],
    particleColors: ['#cd7f32', '#d4a574', '#e8c490', '#f0d5a8'],
    particleCount: 18,
    particleSize: [1, 3],
    particleSpeed: [8, 15],
    ambientGradient: 'linear-gradient(180deg, #1a100a 0%, #2d1810 40%, #3d2414 70%, #5c3a1c 100%)',
    badgeGlow: '0 0 32px rgba(205, 127, 50, 0.5), 0 0 64px rgba(205, 127, 50, 0.25)'
  },
  silver: {
    name: 'Silver',
    colors: ['#b8b8c0', '#9090a0', '#686880', '#303048'],
    glowColors: ['#c0c0c0', '#d0d0d0', '#e8e8e8'],
    particleColors: ['#c0c0c0', '#d0d0d0', '#e8e8e8', '#f0f0f0', '#ffffff'],
    particleCount: 22,
    particleSize: [1, 4],
    particleSpeed: [6, 12],
    ambientGradient: 'linear-gradient(180deg, #101018 0%, #202030 40%, #303048 70%, #484868 100%)',
    badgeGlow: '0 0 32px rgba(192, 192, 192, 0.55), 0 0 64px rgba(192, 192, 192, 0.3)'
  },
  gold: {
    name: 'Gold',
    colors: ['#c8a020', '#a08018', '#786010', '#403008'],
    glowColors: ['#ffd700', '#e8c400', '#c8a800'],
    particleColors: ['#ffd700', '#ffdf40', '#ffe870', '#fff0a0', '#fff8d0'],
    particleCount: 26,
    particleSize: [1.5, 4.5],
    particleSpeed: [5, 10],
    ambientGradient: 'linear-gradient(180deg, #181404 0%, #302408 40%, #483810 70%, #604818 100%)',
    badgeGlow: '0 0 36px rgba(255, 215, 0, 0.6), 0 0 72px rgba(255, 215, 0, 0.35)'
  },
  platinum: {
    name: 'Platinum',
    colors: ['#20c8d8', '#18a0b8', '#107890', '#084050'],
    glowColors: ['#00bcd4', '#00d4f0', '#40e0ff'],
    particleColors: ['#00bcd4', '#40d0f0', '#80e0ff', '#c0f0ff', '#e0faff'],
    particleCount: 30,
    particleSize: [1, 4],
    particleSpeed: [4, 9],
    ambientGradient: 'linear-gradient(180deg, #041418 0%, #0c2830 40%, #103848 70%, #185070 100%)',
    badgeGlow: '0 0 36px rgba(0, 188, 212, 0.6), 0 0 72px rgba(0, 188, 212, 0.35)'
  },
  diamond: {
    name: 'Diamond',
    colors: ['#a060e0', '#8048c0', '#6030a0', '#301860'],
    glowColors: ['#b388ff', '#c8a8ff', '#d8c8ff'],
    particleColors: ['#b388ff', '#c8a8ff', '#d8c8ff', '#e8d8ff', '#f0e8ff', '#ffffff'],
    particleCount: 34,
    particleSize: [1, 5],
    particleSpeed: [3, 8],
    ambientGradient: 'linear-gradient(180deg, #100818 0%, #281430 40%, #402050 70%, #583070 100%)',
    badgeGlow: '0 0 40px rgba(179, 136, 255, 0.65), 0 0 80px rgba(179, 136, 255, 0.4)'
  },
  crystal: {
    name: 'Crystal',
    colors: ['#40e0ff', '#20c8e8', '#1098b8', '#085870'],
    glowColors: ['#00e5ff', '#40ecff', '#80f0ff'],
    particleColors: ['#00e5ff', '#40ecff', '#80f0ff', '#c0f8ff', '#e0fcff', '#ffffff'],
    particleCount: 38,
    particleSize: [0.5, 3.5],
    particleSpeed: [2, 6],
    ambientGradient: 'linear-gradient(180deg, #041018 0%, #0c2830 40%, #184050 70%, #206078 100%)',
    badgeGlow: '0 0 44px rgba(0, 229, 255, 0.7), 0 0 88px rgba(0, 229, 255, 0.45)'
  },
  focuster: {
    name: 'Focuster',
    colors: ['#ff2080', '#c81060', '#900848', '#480428'],
    glowColors: ['#ff4081', '#ff70a8', '#ffa0c8'],
    particleColors: ['#ff4081', '#ff60a0', '#ff80b8', '#ffa0d0', '#ffc0e0', '#ffe0f0', '#ffffff'],
    particleCount: 44,
    particleSize: [1, 5],
    particleSpeed: [2, 5],
    ambientGradient: 'linear-gradient(180deg, #180410 0%, #300c20 40%, #501430 70%, #782048 100%)',
    badgeGlow: '0 0 48px rgba(255, 64, 129, 0.75), 0 0 96px rgba(255, 64, 129, 0.5)'
  }
}

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  color: string
  opacity: number
  delay: number
}

export function RankBanner({ rank }: { rank: Rank }) {
  const tier = tierFromRank(rank)
  const cfg = tierConfig[tier]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [particles, setParticles] = useState<Particle[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const newParticles: Particle[] = []
    for (let i = 0; i < cfg.particleCount; i++) {
      newParticles.push({
        x: Math.random(),
        y: 1 + Math.random() * 0.3,
        size: cfg.particleSize[0] + Math.random() * (cfg.particleSize[1] - cfg.particleSize[0]),
        speed: cfg.particleSpeed[0] + Math.random() * (cfg.particleSpeed[1] - cfg.particleSpeed[0]),
        color: cfg.particleColors[Math.floor(Math.random() * cfg.particleColors.length)],
        opacity: 0.15 + Math.random() * 0.5,
        delay: Math.random() * 2
      })
    }
    setParticles(newParticles)

    let lastTime = performance.now()
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000
      lastTime = now

      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

      const h = canvas.height / dpr
      const w = canvas.width / dpr

      particles.forEach(p => {
        p.y -= (p.speed * dt) / h
        if (p.y < -0.05) {
          p.y = 1.05
          p.x = Math.random()
          p.delay = 0
        }
        const alpha = p.opacity * (1 - p.delay)
        if (alpha <= 0) return
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.fillStyle = p.color
        const sz = p.size * (0.5 + 0.5 * (1 - p.y))
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, sz, 0, Math.PI * 2)
        ctx.fill()
        p.delay = Math.max(0, p.delay - dt * 0.5)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [rank.id, cfg.particleCount, cfg.particleColors, cfg.particleSize, cfg.particleSpeed])

  if (!mounted) return <div className="rank-banner-loading" />

  return (
    <div className="rank-banner" style={{ '--tier-accent': rank.accent } as React.CSSProperties}>
      <canvas ref={canvasRef} className="rank-banner-canvas" aria-hidden />
      <div className="rank-banner-gradient" style={{ background: cfg.ambientGradient }} />
      <div className="rank-banner-glow" style={{ boxShadow: cfg.badgeGlow }} />
      <div className="rank-banner-content">
        <img src={rank.badge} alt="" className="rank-banner-badge" />
        <span className="rank-banner-name">{rank.name}</span>
      </div>
    </div>
  )
}