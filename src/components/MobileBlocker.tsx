import { useState, useEffect } from 'react'

function isMobile(): boolean {
  const ua = navigator.userAgent
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
}

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (isMobile()) setBlocked(true)
    const onResize = () => setBlocked(isMobile())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!blocked) return children

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#04030A',
      color: '#F6F1E5',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '32px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '400px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(217,164,65,0.12)',
          border: '1px solid rgba(217,164,65,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: 600,
          margin: '0 0 12px',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}>
          Desktop Only
        </h1>
        <p style={{
          margin: '0 0 8px',
          opacity: 0.7,
          lineHeight: 1.6,
          fontSize: '15px',
        }}>
          Focus Lily is a 3D study world built for desktop browsers.
        </p>
        <p style={{
          margin: 0,
          opacity: 0.45,
          lineHeight: 1.5,
          fontSize: '13px',
        }}>
          Please open on a computer with a keyboard and mouse for the full experience.
        </p>
      </div>
    </div>
  )
}
