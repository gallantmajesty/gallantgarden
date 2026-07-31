import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'

export function NotFound() {
  const { t } = useTranslation()
  const [showAlert, setShowAlert] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const timestamp = new Date().toLocaleString()

  useEffect(() => {
    setShowAlert(true)
    const timer = setTimeout(() => setShowAlert(false), 6000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowQuote(true), 5000)
    return () => clearTimeout(timer)
  }, [])

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

    const pts: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[] = []
    for (let i = 0; i < 40; i++) {
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.25 - 0.05,
        life: Math.random() * 300,
        maxLife: 300 + Math.random() * 300,
        size: Math.random() * 1.5 + 0.3,
        color: Math.random() > 0.5 ? 'rgba(0,200,255,0.4)' : 'rgba(0,255,150,0.3)',
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        p.life++
        const alpha = Math.max(0, 0.5 * (1 - p.life / p.maxLife))
        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        if (p.life > p.maxLife) {
          p.x = Math.random() * W
          p.y = H + 10
          p.life = 0
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
      background: 'linear-gradient(180deg, #0a0e1a 0%, #0f1628 50%, #0a0e1a 100%)',
      color: '#00d4ff',
      fontFamily: 'var(--font-serif-heading)',
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
        background: 'radial-gradient(ellipse at center, rgba(0,40,80,0.3) 0%, #0a0e1a 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
        opacity: 0.6,
      }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.01) 2px, rgba(0,212,255,0.01) 4px)',
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.2); }
          50% { text-shadow: 0 0 30px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.3); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-scale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {showAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '0.75rem 1.5rem',
          background: 'rgba(0,20,40,0.9)',
          border: '1px solid rgba(0,212,255,0.4)',
          borderRadius: 4,
          boxShadow: '0 0 20px rgba(0,212,255,0.2)',
          backdropFilter: 'blur(10px)',
          animation: 'fade-in 0.5s ease-out',
          maxWidth: 450,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: '#00d4ff',
            fontWeight: 700,
            marginBottom: '0.25rem',
            fontFamily: 'var(--font-serif-heading)',
          }}>
            ℹ SYSTEM NOTICE
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#80e0ff',
            lineHeight: 1.5,
          }}>
            This page was not found. Your activity is safe and secure. Redirecting you shortly.
          </div>
        </div>
      )}

      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: 580,
        width: '100%',
      }}>
        <div style={{
          fontSize: '8rem',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '0.25rem',
          color: '#00d4ff',
          textShadow: '0 0 30px rgba(0,212,255,0.5), 0 0 60px rgba(0,212,255,0.2)',
          letterSpacing: '0.05em',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}>
          404
        </div>

        <div style={{
          width: 80,
          height: 3,
          margin: '0 auto 1rem',
          background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
          boxShadow: '0 0 10px rgba(0,212,255,0.4)',
        }} />

        <h1 style={{
          fontSize: '1.2rem',
          marginBottom: '0.75rem',
          letterSpacing: '0.15em',
          color: '#60e0ff',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}>
          {t('notFound.title') || 'Page Not Found'}
        </h1>

        <p style={{
          color: '#80c0e0',
          marginBottom: '1.5rem',
          lineHeight: 1.6,
          fontSize: '0.9rem',
        }}>
          {t('notFound.subtitle') || "Oops! You've reached a dead link."}
        </p>

        <div style={{
          padding: '1.25rem',
          border: '1px solid rgba(0,212,255,0.2)',
          background: 'rgba(0,20,40,0.5)',
          borderRadius: 4,
          marginBottom: '1.5rem',
          boxShadow: '0 0 20px rgba(0,212,255,0.05)',
        }}>
          <p style={{
            color: '#80d0ff',
            lineHeight: 1.7,
            fontSize: '0.85rem',
            margin: 0,
          }}>
            {t('notFound.description') || "The page you tried to access doesn't exist or is restricted. Don't worry — your activity is safe and secure."}
          </p>
        </div>

        <div style={{
          padding: '0.75rem 1.25rem',
          border: '1px solid rgba(0,212,255,0.15)',
          background: 'rgba(0,15,30,0.4)',
          borderRadius: 4,
          marginBottom: '1.5rem',
        }}>
          <div style={{
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            color: '#00a0cc',
            fontWeight: 700,
            marginBottom: '0.4rem',
            fontFamily: 'var(--font-serif-heading)',
          }}>
            ℹ SYSTEM LOG
          </div>
          <div style={{
            fontSize: '0.65rem',
            color: '#6090b0',
            lineHeight: 1.5,
            fontFamily: 'monospace',
          }}>
            Attempt recorded at {timestamp}. No harm done. Navigation errors are tracked to improve your experience.
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/lobby'}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-serif-heading)',
            letterSpacing: '0.1em',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,150,0.15))',
            border: '1px solid rgba(0,212,255,0.4)',
            color: '#00d4ff',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.25), rgba(0,100,150,0.25))'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,150,0.15))'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          Return to Dashboard
        </button>
      </div>

      {showQuote && (
        <div style={{
          position: 'absolute',
          left: '30px',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          whiteSpace: 'nowrap',
          opacity: showQuote ? 1 : 0,
          transition: 'opacity 1s ease',
          zIndex: 2,
        }}>
          <span style={{
            fontSize: '1.3rem',
            color: 'rgba(0,255,150,0.35)',
            fontFamily: 'var(--font-serif-heading)',
            fontStyle: 'italic',
            letterSpacing: '0.15em',
            textShadow: '0 0 15px rgba(0,255,150,0.2)',
          }}>
            "Stay focused — keep learning"
          </span>
        </div>
      )}
    </div>
  )
}