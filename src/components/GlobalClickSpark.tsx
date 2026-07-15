import { useRef, useEffect, useCallback } from 'react'

interface Spark {
  x: number
  y: number
  angle: number
  startTime: number
}

type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

interface GlobalClickSparkProps {
  sparkColor?: string
  sparkSize?: number
  sparkRadius?: number
  sparkCount?: number
  duration?: number
  easing?: Easing
  extraScale?: number
  /** Clicks that land inside any of these selectors produce no sparks. */
  excludeSelector?: string
}

// Realms (3D worlds), the Blueprint board and its sticky notes, and anything
// explicitly opting out via [data-no-spark], are excluded from the effect.
const DEFAULT_EXCLUDE = '.realm-root, .explore-root, .zm, .bp-root, [data-no-spark]'

/**
 * App-wide click-spark overlay. Renders a single fixed, non-interactive canvas
 * above everything and spawns a short spark burst at the pointer on every
 * click — except inside the realms, the Blueprint board, or opted-out nodes.
 */
const GlobalClickSpark = ({
  sparkColor = '#d8a657',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.0,
  excludeSelector = DEFAULT_EXCLUDE,
}: GlobalClickSparkProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sparksRef = useRef<Spark[]>([])

  // Keep the canvas matched to the viewport.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear':
          return t
        case 'ease-in':
          return t * t
        case 'ease-in-out':
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        default:
          return t * (2 - t)
      }
    },
    [easing],
  )

  // Animation loop — redraws every active spark until it expires.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationId = 0
    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime
        if (elapsed >= duration) return false
        const progress = elapsed / duration
        const eased = easeFunc(progress)
        const distance = eased * sparkRadius * extraScale
        const lineLength = sparkSize * (1 - eased)
        const x1 = spark.x + distance * Math.cos(spark.angle)
        const y1 = spark.y + distance * Math.sin(spark.angle)
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle)
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle)
        ctx.strokeStyle = sparkColor
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        return true
      })
      animationId = requestAnimationFrame(draw)
    }
    animationId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animationId)
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easeFunc, extraScale])

  // Spawn sparks on every document click that isn't inside an excluded area.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.closest(excludeSelector)) return
      const now = performance.now()
      const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
        x: e.clientX,
        y: e.clientY,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
      }))
      sparksRef.current.push(...newSparks)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [excludeSelector, sparkCount])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

export default GlobalClickSpark
