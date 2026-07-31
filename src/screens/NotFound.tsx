import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

export function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showAlert, setShowAlert] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    setShowAlert(true)
    const timer = setTimeout(() => setShowAlert(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleResize = () => {
      const c = canvasRef.current
      if (c) {
        c.width = window.innerWidth
        c.height = window.innerHeight
      }
    }

    setSize()
    window.addEventListener('resize', handleResize)

    const W = canvas.width
    const H = canvas.height

    function initParticles() {
      const pts = []
      for (let i = 0; i < 60; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.1,
          life: Math.random() * 200,
          maxLife: 200 + Math.random() * 200,
          size: Math.random() * 2.5 + 0.5,
          color: Math.random() > 0.5 ? '#7B6FBA' : '#9B8FDB',
        })
      }
      return pts
    }

    const pts = initParticles()

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of pts) {
        p.x += p.vx
        p.y += p.vy
        p.life++
        const alpha = Math.max(0, 0.6 * (1 - p.life / p.maxLife))
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
      background: 'linear-gradient(180deg, #06020e 0%, #0f0a1a 40%, #1a0e2e 100%)',
      color: '#c4b5fd',
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
        top: '10%',
        left: '10%',
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, rgba(123,111,186,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '15%',
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(155,143,219,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {showAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          padding: '1rem 2rem',
          background: 'rgba(30, 10, 50, 0.95)',
          border: '1px solid rgba(123,111,186,0.6)',
          borderRadius: 6,
          boxShadow: '0 0 40px rgba(123,111,186,0.3), 0 0 80px rgba(123,111,186,0.1)',
          backdropFilter: 'blur(10px)',
          animation: 'slideDown 0.5s ease-out',
          maxWidth: 500,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: '#9B8FDB',
            fontWeight: 700,
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-serif-heading)',
          }}>
            ⚠ ATTENTION TRAVELER
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: '#c4b5fd',
            lineHeight: 1.6,
          }}>
            The path you seek does not exist in this realm. Your journey has been logged and your steps are being recorded by the ancient wardens of this domain.
          </div>
          <div style={{
            fontSize: '0.65rem',
            color: '#7B6FBA',
            marginTop: '0.5rem',
            fontStyle: 'italic',
          }}>
            Every misstep echoes through the corridors of time...
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: 500,
      }}>
        <div style={{
          fontSize: '10rem',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '0.5rem',
          background: 'linear-gradient(180deg, #9B8FDB 0%, #7B6FBA 50%, #5B4F9B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'float 4s ease-in-out infinite',
          filter: 'drop-shadow(0 0 30px rgba(123,111,186,0.5))',
        }}>
          404
        </div>

        <div style={{
          width: 120,
          height: 2,
          margin: '0 auto 2rem',
          background: 'linear-gradient(90deg, transparent, #7B6FBA, transparent)',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }} />

        <h1 style={{
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
          letterSpacing: '0.15em',
          color: '#d4c4f8',
          fontWeight: 700,
        }}>
          {t('notFound.title') || 'Realm Not Found'}
        </h1>

        <p style={{
          color: '#9B8FDB',
          marginBottom: '2.5rem',
          lineHeight: 1.7,
          fontSize: '0.95rem',
        }}>
          {t('notFound.description') || "This path doesn't exist in FocusLily. The corridor you're looking for may have shifted, or never existed at all."}
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => navigate('/lobby')}
            style={{
              padding: '0.85rem 2.5rem',
              fontSize: '1rem',
              fontFamily: 'var(--font-serif-heading)',
              letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, rgba(123,111,186,0.3), rgba(75,60,150,0.3))',
              border: '1px solid rgba(155,143,219,0.5)',
              color: '#d4c4f8',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.3s',
              backdropFilter: 'blur(5px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(123,111,186,0.5), rgba(75,60,150,0.5))'
              e.currentTarget.style.boxShadow = '0 0 25px rgba(123,111,186,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(123,111,186,0.3), rgba(75,60,150,0.3))'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {t('notFound.backToLobby') || 'Return to Lobby'}
          </button>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.85rem 2.5rem',
              fontSize: '1rem',
              fontFamily: 'var(--font-serif-heading)',
              letterSpacing: '0.1em',
              background: 'transparent',
              border: '1px solid rgba(155,143,219,0.3)',
              color: '#9B8FDB',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(155,143,219,0.6)'
              e.currentTarget.style.color = '#d4c4f8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(155,143,219,0.3)'
              e.currentTarget.style.color = '#9B8FDB'
            }}
          >
            Go Back
          </button>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          border: '1px solid rgba(123,111,186,0.2)',
          borderRadius: 6,
          background: 'rgba(15,10,30,0.5)',
          backdropFilter: 'blur(5px)',
          maxWidth: 400,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <div style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: '#7B6FBA',
            fontWeight: 700,
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-serif-heading)',
          }}>
            ✦ WARDEN'S LOG ✦
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: '#9B8FDB',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "The paths of the unwary are recorded in the stones of this realm.
            Turn back, traveler, before the corridors forget you."
          </div>
        </div>
      </div>
    </div>
  )
}