import { useEffect, useRef, useState, memo } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  phase: number
  type: 'dust' | 'firefly' | 'ember'
}

export const MagicalParticles = memo(function MagicalParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const root = document.documentElement
    const checkReduced = () =>
      mediaQuery.matches ||
      root.dataset.reduceMotion === 'true' ||
      root.dataset.animations === 'off'
    setReducedMotion(checkReduced())
    const handler = () => setReducedMotion(checkReduced())
    mediaQuery.addEventListener('change', handler)
    root.addEventListener('datasetchange', handler)
    return () => {
      mediaQuery.removeEventListener('change', handler)
      root.removeEventListener('datasetchange', handler)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      setDimensions({ width: canvas.clientWidth, height: canvas.clientHeight })
    }
    resize()
    window.addEventListener('resize', resize)

    particlesRef.current = Array.from({ length: 32 }, (_, i) => ({
      x: Math.random() * (dimensions.width || 100),
      y: Math.random() * (dimensions.height || 100),
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.08 - Math.random() * 0.12,
      size: 1 + Math.random() * 2,
      opacity: 0.08 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      type: i % 3 === 0 ? 'firefly' : i % 3 === 1 ? 'ember' : 'dust'
    }))

    let lastTime = performance.now()
    function animate(time: number) {
      if (reducedMotion) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      const dt = Math.min(32, time - lastTime)
      lastTime = time

      const ctx = canvas?.getContext('2d')
      if (!ctx || !canvas) return
      if (canvas.width === 0 || canvas.height === 0) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const dpr = window.devicePixelRatio || 1

      particlesRef.current.forEach(p => {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.phase += dt * 0.0015

        const sway = Math.sin(p.phase) * 0.4
        p.x += sway * dt * 0.01

        if (p.y < -10) {
          p.y = dimensions.height + 10
          p.x = Math.random() * dimensions.width
          p.phase = Math.random() * Math.PI * 2
        }
        if (p.x < -10) p.x = dimensions.width + 10
        if (p.x > dimensions.width + 10) p.x = -10

        ctx.save()
        ctx.globalAlpha = p.opacity

        if (p.type === 'firefly') {
          const glow = Math.sin(p.phase * 2) * 0.3 + 0.7
          const gradient = ctx.createRadialGradient(
            p.x * dpr, p.y * dpr, 0,
            p.x * dpr, p.y * dpr, (p.size + 2) * dpr * glow
          )
          gradient.addColorStop(0, `rgba(255, 206, 84, ${glow})`)
          gradient.addColorStop(1, 'rgba(255, 206, 84, 0)')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x * dpr, p.y * dpr, (p.size + 2) * dpr * glow, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'ember') {
          const flicker = 0.6 + Math.sin(p.phase * 3) * 0.4
          ctx.fillStyle = `rgba(255, 140, 60, ${p.opacity * flicker})`
          ctx.beginPath()
          ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr * flicker, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
          ctx.beginPath()
          ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animationRef.current!)
      window.removeEventListener('resize', resize)
    }
  }, [dimensions, reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className="magical-particles"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  )
})

MagicalParticles.displayName = 'MagicalParticles'