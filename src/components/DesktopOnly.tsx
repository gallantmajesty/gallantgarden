import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './DesktopOnly.css'

function detectDesktop(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true

  const ua = navigator.userAgent || ''
  const mobileUA =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|iPad|Silk|Kindle|PlayBook|Nintendo|Phone/i.test(
      ua,
    )

  const iPadOS =
    (navigator.platform === 'MacIntel' || /Macintosh/.test(ua)) && (navigator.maxTouchPoints ?? 0) > 1

  if (mobileUA || iPadOS) return false

  const finePointer = window.matchMedia('(any-pointer: fine)').matches
  const canHover = window.matchMedia('(any-hover: hover)').matches

  return finePointer && canHover
}

export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(detectDesktop)
  useEffect(() => {
    const update = () => setDesktop(detectDesktop())
    update()
    window.addEventListener('resize', update)
    const fine = window.matchMedia('(any-pointer: fine)')
    const hover = window.matchMedia('(any-hover: hover)')
    fine.addEventListener?.('change', update)
    hover.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      fine.removeEventListener?.('change', update)
      hover.removeEventListener?.('change', update)
    }
  }, [])
  return desktop
}

function isFullscreen(): boolean {
  const d = document as Document & { webkitFullscreenElement?: Element | null }
  return !!(d.fullscreenElement || d.webkitFullscreenElement)
}

export function MobileFullscreenGate() {
  const { t } = useTranslation()
  const [needsFullscreen, setNeedsFullscreen] = useState(!isFullscreen())

  useEffect(() => {
    const sync = () => setNeedsFullscreen(!isFullscreen())
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
    }
  }, [])

  if (!needsFullscreen) return null

  const enter = () => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    if (!el.requestFullscreen && !el.webkitRequestFullscreen) {
      setNeedsFullscreen(false)
      return
    }
    const req = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.()
    Promise.resolve(req)
      .then(() => setNeedsFullscreen(false))
      .catch(() => setNeedsFullscreen(false))
  }

  return (
    <div className="fs-gate">
      <div className="fs-gate-card">
        <img className="fs-gate-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={72} height={72} />
        <h1>{t('desktopOnly.fullscreenTitle')}</h1>
        <p>{t('desktopOnly.fullscreenDescription')}</p>
        <button type="button" className="fs-gate-btn" onClick={enter}>
          {t('desktopOnly.enterFullscreen')}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline SVG illustrations: castle library + hanging lantern         */
/* ------------------------------------------------------------------ */

function CastleIllustration() {
  return (
    <svg className="do-castle" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* sky glow */}
      <defs>
        <radialGradient id="sky-glow" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#caa84a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="tower-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c3518" />
          <stop offset="100%" stopColor="#3a2210" />
        </linearGradient>
        <linearGradient id="wall-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a2c14" />
          <stop offset="100%" stopColor="#2e1a0c" />
        </linearGradient>
        <linearGradient id="roof-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4a26" />
          <stop offset="100%" stopColor="#5c3518" />
        </linearGradient>
        <radialGradient id="window-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffce54" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#caa84a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#caa84a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="door-glow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffce54" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#7a4a26" stopOpacity="0.3" />
        </radialGradient>
      </defs>

      <rect width="320" height="200" fill="url(#sky-glow)" />

      {/* ground */}
      <rect x="0" y="170" width="320" height="30" fill="#1a0f08" />
      <rect x="0" y="168" width="320" height="4" rx="2" fill="#2e1a0c" opacity="0.5" />

      {/* === left tower === */}
      <rect x="30" y="60" width="36" height="110" fill="url(#tower-grad)" rx="2" />
      <polygon points="30,60 48,30 66,60" fill="url(#roof-grad)" />
      <rect x="44" y="26" width="8" height="8" fill="#caa84a" rx="1" opacity="0.6" />
      {/* tower windows */}
      <rect x="40" y="80" width="10" height="16" rx="5" fill="url(#window-glow)" />
      <rect x="40" y="110" width="10" height="16" rx="5" fill="url(#window-glow)" opacity="0.7" />
      <rect x="40" y="140" width="10" height="16" rx="5" fill="url(#window-glow)" opacity="0.5" />

      {/* === right tower === */}
      <rect x="254" y="60" width="36" height="110" fill="url(#tower-grad)" rx="2" />
      <polygon points="254,60 272,30 290,60" fill="url(#roof-grad)" />
      <rect x="268" y="26" width="8" height="8" fill="#caa84a" rx="1" opacity="0.6" />
      {/* tower windows */}
      <rect x="264" y="80" width="10" height="16" rx="5" fill="url(#window-glow)" />
      <rect x="264" y="110" width="10" height="16" rx="5" fill="url(#window-glow)" opacity="0.7" />
      <rect x="264" y="140" width="10" height="16" rx="5" fill="url(#window-glow)" opacity="0.5" />

      {/* === center castle body === */}
      <rect x="66" y="90" width="188" height="80" fill="url(#wall-grad)" rx="2" />
      {/* crenellations */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} x={72 + i * 20} y="82" width="12" height="10" fill="#5c3518" rx="1" />
      ))}

      {/* center roof peak */}
      <polygon points="120,90 160,55 200,90" fill="url(#roof-grad)" />
      <rect x="156" y="46" width="8" height="12" fill="#caa84a" rx="1" opacity="0.7" />

      {/* main hall windows — row of 5 */}
      <rect x="82" y="108" width="14" height="20" rx="7" fill="url(#window-glow)" />
      <rect x="112" y="108" width="14" height="20" rx="7" fill="url(#window-glow)" opacity="0.9" />
      <rect x="142" y="108" width="14" height="20" rx="7" fill="url(#window-glow)" />
      <rect x="172" y="108" width="14" height="20" rx="7" fill="url(#window-glow)" opacity="0.85" />
      <rect x="202" y="108" width="14" height="20" rx="7" fill="url(#window-glow)" opacity="0.9" />

      {/* upper row — smaller */}
      <rect x="92" y="140" width="10" height="14" rx="5" fill="url(#window-glow)" opacity="0.6" />
      <rect x="122" y="140" width="10" height="14" rx="5" fill="url(#window-glow)" opacity="0.5" />
      <rect x="152" y="140" width="10" height="14" rx="5" fill="url(#window-glow)" opacity="0.65" />
      <rect x="182" y="140" width="10" height="14" rx="5" fill="url(#window-glow)" opacity="0.55" />
      <rect x="212" y="140" width="10" height="14" rx="5" fill="url(#window-glow)" opacity="0.6" />

      {/* === grand entrance door === */}
      <rect x="140" y="140" width="40" height="30" rx="20" fill="url(#door-glow)" />
      <rect x="144" y="144" width="32" height="26" rx="16" fill="#1a0f08" opacity="0.4" />
      {/* door light spill */}
      <ellipse cx="160" cy="172" rx="28" ry="6" fill="#caa84a" opacity="0.12" />

      {/* === chimney smoke wisps === */}
      <path d="M48 26 Q50 18 46 10" stroke="#caa84a" strokeWidth="1" fill="none" opacity="0.2" />
      <path d="M272 26 Q270 16 274 8" stroke="#caa84a" strokeWidth="1" fill="none" opacity="0.2" />
    </svg>
  )
}

function LanternSVG() {
  return (
    <svg className="do-lantern" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="lantern-glow" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#ffce54" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#caa84a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="lantern-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4a26" />
          <stop offset="50%" stopColor="#5c3518" />
          <stop offset="100%" stopColor="#3a2210" />
        </linearGradient>
      </defs>

      {/* chain / rope */}
      <line x1="30" y1="0" x2="30" y2="28" stroke="#5c3518" strokeWidth="2" />
      <line x1="28" y1="0" x2="32" y2="0" stroke="#7a4a26" strokeWidth="3" strokeLinecap="round" />

      {/* top cap */}
      <rect x="20" y="28" width="20" height="6" rx="2" fill="#7a4a26" />

      {/* glass body */}
      <rect x="18" y="34" width="24" height="44" rx="4" fill="url(#lantern-body)" opacity="0.85" />
      <rect x="20" y="36" width="20" height="40" rx="3" fill="#ffce54" opacity="0.12" />

      {/* cross-bars */}
      <rect x="18" y="50" width="24" height="2" fill="#7a4a26" />
      <rect x="18" y="62" width="24" height="2" fill="#7a4a26" />

      {/* inner flame */}
      <ellipse cx="30" cy="52" rx="5" ry="8" fill="#ffce54" opacity="0.6">
        <animate attributeName="opacity" values="0.5;0.7;0.5" dur="2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="30" cy="50" rx="3" ry="5" fill="#fff3d0" opacity="0.7">
        <animate attributeName="opacity" values="0.6;0.85;0.6" dur="1.5s" repeatCount="indefinite" />
      </ellipse>

      {/* bottom cap */}
      <rect x="20" y="78" width="20" height="6" rx="2" fill="#7a4a26" />

      {/* bottom finial */}
      <polygon points="27,84 30,92 33,84" fill="#5c3518" />

      {/* glow halo */}
      <circle cx="30" cy="54" r="30" fill="url(#lantern-glow)">
        <animate attributeName="r" values="28;32;28" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/* ------------------------------------------------------------------ */

export function DesktopOnly() {
  const { t } = useTranslation()
  return (
    <div className="desktop-only">
      {/* starfield */}
      <div className="do-stars" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="do-star" style={{
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 53 + 7) % 70}%`,
            animationDelay: `${(i * 0.7) % 5}s`,
            animationDuration: `${2.5 + (i % 4) * 0.8}s`,
          }} />
        ))}
      </div>

      {/* floating fireflies */}
      <div className="do-fireflies" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="do-ff" style={{
            left: `${10 + (i * 11) % 80}%`,
            animationDelay: `${i * 1.2}s`,
            animationDuration: `${4 + (i % 3) * 2}s`,
          }} />
        ))}
      </div>

      {/* hanging lantern — left side */}
      <LanternSVG />

      <div className="desktop-only-card">
        {/* logo */}
        <img className="do-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={72} height={72} />

        <h1 className="do-title">{t('desktopOnly.title')}</h1>

        <div className="do-divider">
          <span /><em /><span />
        </div>

        {/* castle illustration */}
        <CastleIllustration />

        <p className="do-desc">{t('desktopOnly.description')}</p>
        <p className="desktop-only-sub">{t('desktopOnly.subDescription')}</p>
      </div>
    </div>
  )
}
