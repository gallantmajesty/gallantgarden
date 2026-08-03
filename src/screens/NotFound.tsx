import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'

export function NotFound() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    const W = canvas.width
    const H = canvas.height

    interface Dust {
      x: number; y: number; vx: number; vy: number;
      size: number; life: number; maxLife: number; alpha: number
    }

    const dust: Dust[] = []
    for (let i = 0; i < 30; i++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.2 - 0.02,
        size: Math.random() * 1.5 + 0.3,
        life: Math.random() * 500,
        maxLife: 500 + Math.random() * 500,
        alpha: Math.random() * 0.3 + 0.1
      })
    }

    function draw() {
      timeRef.current += 0.016
      const t = timeRef.current

      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = '#0d0b08'
      ctx.fillRect(0, 0, W, H)

      const grad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, Math.max(W, H) * 0.7)
      grad.addColorStop(0, 'rgba(60, 45, 25, 0.15)')
      grad.addColorStop(1, 'rgba(20, 15, 8, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      for (const d of dust) {
        d.x += d.vx + Math.sin(t * 0.3 + d.x * 0.001) * 0.05
        d.y += d.vy + Math.cos(t * 0.25 + d.y * 0.001) * 0.03
        d.life++

        const lifeRatio = d.life / d.maxLife
        const a = d.alpha * (1 - lifeRatio)

        ctx.globalAlpha = a
        ctx.fillStyle = '#c9b896'
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
        ctx.fill()

        if (d.life > d.maxLife) {
          d.x = Math.random() * W
          d.y = H + 10
          d.life = 0
          d.vx = (Math.random() - 0.5) * 0.15
          d.vy = -Math.random() * 0.2 - 0.02
        }
      }

      ctx.globalAlpha = 1
      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d0b08',
      color: '#d4c4a0',
      fontFamily: 'Georgia, "Times New Roman", serif',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 60% 40% at 50% 30%, rgba(80, 60, 30, 0.08) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 50% 80%, rgba(40, 50, 30, 0.06) 0%, transparent 70%)
        `,
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentle-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: 520,
        width: '100%',
        animation: 'fade-in-up 1s ease-out',
      }}>
        <div style={{
          fontSize: '0.65rem',
          letterSpacing: '0.25em',
          color: '#887858',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
        }}>
          Path Uncharted
        </div>

        <div style={{
          fontSize: '7rem',
          fontWeight: 700,
          lineHeight: 1,
          marginBottom: '0.75rem',
          color: '#c9b896',
          letterSpacing: '-0.03em',
        }}>
          404
        </div>

        <div style={{
          width: '80px',
          height: '1px',
          margin: '0 auto 1.5rem',
          background: 'linear-gradient(90deg, transparent, #887858, transparent)',
        }} />

        <h1 style={{
          fontSize: '1.3rem',
          marginBottom: '1rem',
          color: '#b8a888',
          fontWeight: 400,
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          "{t('notFound.subtitle') || 'The page you seek has faded from the map.'}"
        </h1>

        <p style={{
          color: '#887858',
          marginBottom: '2rem',
          lineHeight: 1.7,
          fontSize: '0.95rem',
          maxWidth: 420,
          margin: '0 auto 2rem',
        }}>
          {t('notFound.description') || "Some corridors lead to forgotten archives. Others simply end. No harm done — the library is vast, and every wrong turn teaches the way."}
        </p>

        <button
          onClick={() => window.location.href = '/lobby'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0.85rem 2rem',
            fontSize: '0.95rem',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.05em',
            background: 'rgba(40, 30, 18, 0.9)',
            border: '1px solid rgba(180, 150, 100, 0.3)',
            color: '#d4c4a0',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(55, 42, 25, 0.95)'
            e.currentTarget.style.borderColor = 'rgba(200, 170, 110, 0.5)'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(40, 30, 18, 0.9)'
            e.currentTarget.style.borderColor = 'rgba(180, 150, 100, 0.3)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18" style={{ opacity: 0.9 }}>
            <path d="M10 3 L10 17 M4 10 L10 4 L16 10" stroke="#c9b896" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Return to the Great Hall
        </button>

        <div style={{
          marginTop: '2.5rem',
          padding: '1rem 1.5rem',
          border: '1px solid rgba(140, 120, 90, 0.15)',
          background: 'rgba(25, 20, 12, 0.6)',
          borderRadius: 4,
          maxWidth: 440,
          margin: '2.5rem auto 0',
        }}>
          <p style={{
            color: '#786848',
            lineHeight: 1.6,
            fontSize: '0.8rem',
            margin: 0,
            fontStyle: 'italic',
          }}>
            "Every lost path adds a page to your story. The library remembers what you've read — and what you haven't found yet."
          </p>
        </div>
      </div>
    </div>
  )
}