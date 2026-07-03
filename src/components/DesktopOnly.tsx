import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './DesktopOnly.css'

function detectDesktop(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true
  const ua = navigator.userAgent || ''
  const mobileUA =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|iPad|Silk|Kindle|PlayBook|Nintendo|Phone/i.test(ua)
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
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
    if (!el.requestFullscreen && !el.webkitRequestFullscreen) { setNeedsFullscreen(false); return }
    const req = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.()
    Promise.resolve(req).then(() => setNeedsFullscreen(false)).catch(() => setNeedsFullscreen(false))
  }
  return (
    <div className="fs-gate">
      <div className="fs-gate-card">
        <img className="fs-gate-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={72} height={72} />
        <h1>{t('desktopOnly.fullscreenTitle')}</h1>
        <p>{t('desktopOnly.fullscreenDescription')}</p>
        <button type="button" className="fs-gate-btn" onClick={enter}>{t('desktopOnly.enterFullscreen')}</button>
      </div>
    </div>
  )
}

/* ── Castle Scene SVG ─────────────────────────────────────────── */
function CastleScene() {
  return (
    <svg className="do-castle" viewBox="0 0 360 260" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ds-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b4226" /><stop offset="100%" stopColor="#3e2415" />
        </linearGradient>
        <linearGradient id="ds-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4a26" /><stop offset="100%" stopColor="#4a2c14" />
        </linearGradient>
        <linearGradient id="ds-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9703f" /><stop offset="100%" stopColor="#7a4a26" />
        </linearGradient>
        <linearGradient id="ds-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e1a0c" /><stop offset="100%" stopColor="#1a0f08" />
        </linearGradient>
        <radialGradient id="ds-wg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffce54" stopOpacity="1" />
          <stop offset="70%" stopColor="#caa84a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#caa84a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ds-door" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#ffce54" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7a4a26" stopOpacity="0.2" />
        </radialGradient>
        <radialGradient id="ds-sky" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#caa84a" stopOpacity="0.12" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="ds-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="ds-softglow">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* sky */}
      <rect width="360" height="260" fill="url(#ds-sky)" />

      {/* moon */}
      <circle cx="290" cy="40" r="18" fill="#f0e6d2" opacity="0.12" />
      <circle cx="290" cy="40" r="14" fill="#f0e6d2" opacity="0.08" />

      {/* stars */}
      {[[60,25],[120,15],[200,30],[310,55],[150,50],[250,20],[80,45],[340,35]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?1.2:0.8} fill="#f0e6d2" opacity={0.15+i%4*0.1}>
          <animate attributeName="opacity" values={`${0.1+i%3*0.1};${0.4+i%3*0.1};${0.1+i%3*0.1}`} dur={`${3+i%3}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* ground */}
      <rect x="0" y="210" width="360" height="50" fill="url(#ds-ground)" />
      <rect x="0" y="208" width="360" height="4" rx="2" fill="#4a2c14" opacity="0.3" />

      {/* path to door */}
      <path d="M160 210 Q165 220 155 240 Q150 250 140 260 L220 260 Q210 250 205 240 Q195 220 200 210 Z" fill="#3e2415" opacity="0.4" />

      {/* ═══ LEFT TOWER ═══ */}
      <rect x="38" y="80" width="40" height="130" fill="url(#ds-tower)" rx="2" />
      <polygon points="38,80 58,42 78,80" fill="url(#ds-roof)" />
      {/* spire */}
      <rect x="55" y="30" width="6" height="16" fill="#a9703f" rx="1" />
      <circle cx="58" cy="28" r="3" fill="#ffce54" opacity="0.5" filter="url(#ds-glow)" />
      {/* tower windows */}
      <rect x="50" y="100" width="12" height="18" rx="6" fill="url(#ds-wg)" filter="url(#ds-glow)" />
      <rect x="50" y="135" width="12" height="18" rx="6" fill="url(#ds-wg)" opacity="0.75" filter="url(#ds-glow)" />
      <rect x="50" y="170" width="12" height="18" rx="6" fill="url(#ds-wg)" opacity="0.5" filter="url(#ds-glow)" />
      {/* stone texture lines */}
      <line x1="38" y1="115" x2="78" y2="115" stroke="#4a2c14" strokeWidth="0.5" opacity="0.3" />
      <line x1="38" y1="150" x2="78" y2="150" stroke="#4a2c14" strokeWidth="0.5" opacity="0.3" />
      <line x1="38" y1="185" x2="78" y2="185" stroke="#4a2c14" strokeWidth="0.5" opacity="0.3" />

      {/* ═══ RIGHT TOWER ═══ */}
      <rect x="282" y="80" width="40" height="130" fill="url(#ds-tower)" rx="2" />
      <polygon points="282,80 302,42 322,80" fill="url(#ds-roof)" />
      <rect x="299" y="30" width="6" height="16" fill="#a9703f" rx="1" />
      <circle cx="302" cy="28" r="3" fill="#ffce54" opacity="0.5" filter="url(#ds-glow)" />
      <rect x="294" y="100" width="12" height="18" rx="6" fill="url(#ds-wg)" filter="url(#ds-glow)" />
      <rect x="294" y="135" width="12" height="18" rx="6" fill="url(#ds-wg)" opacity="0.75" filter="url(#ds-glow)" />
      <rect x="294" y="170" width="12" height="18" rx="6" fill="url(#ds-wg)" opacity="0.5" filter="url(#ds-glow)" />
      <line x1="282" y1="115" x2="322" y2="115" stroke="#4a2c14" strokeWidth="0.5" opacity="0.3" />
      <line x1="282" y1="150" x2="322" y2="150" stroke="#4a2c14" strokeWidth="0.5" opacity="0.3" />
      <line x1="282" y1="185" x2="322" y2="185" stroke="#4a2c14" strokeWidth="0.5" opacity="0.3" />

      {/* ═══ CENTER HALL ═══ */}
      <rect x="78" y="120" width="204" height="90" fill="url(#ds-wall)" rx="2" />
      {/* crenellations */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <rect key={i} x={84+i*20} y="112" width="12" height="10" fill="#7a4a26" rx="1" />
      ))}

      {/* center roof peak */}
      <polygon points="130,120 180,78 230,120" fill="url(#ds-roof)" />
      <rect x="177" y="66" width="6" height="14" fill="#a9703f" rx="1" />
      <circle cx="180" cy="63" r="3.5" fill="#ffce54" opacity="0.6" filter="url(#ds-glow)" />

      {/* upper windows */}
      <rect x="100" y="140" width="14" height="20" rx="7" fill="url(#ds-wg)" filter="url(#ds-glow)" />
      <rect x="135" y="140" width="14" height="20" rx="7" fill="url(#ds-wg)" opacity="0.85" filter="url(#ds-glow)" />
      <rect x="210" y="140" width="14" height="20" rx="7" fill="url(#ds-wg)" opacity="0.9" filter="url(#ds-glow)" />
      <rect x="245" y="140" width="14" height="20" rx="7" fill="url(#ds-wg)" opacity="0.8" filter="url(#ds-glow)" />

      {/* lower windows */}
      <rect x="100" y="175" width="10" height="14" rx="5" fill="url(#ds-wg)" opacity="0.6" filter="url(#ds-glow)" />
      <rect x="130" y="175" width="10" height="14" rx="5" fill="url(#ds-wg)" opacity="0.5" filter="url(#ds-glow)" />
      <rect x="220" y="175" width="10" height="14" rx="5" fill="url(#ds-wg)" opacity="0.55" filter="url(#ds-glow)" />
      <rect x="250" y="175" width="10" height="14" rx="5" fill="url(#ds-wg)" opacity="0.5" filter="url(#ds-glow)" />

      {/* stone lines */}
      <line x1="78" y1="160" x2="282" y2="160" stroke="#4a2c14" strokeWidth="0.5" opacity="0.2" />
      <line x1="78" y1="195" x2="282" y2="195" stroke="#4a2c14" strokeWidth="0.5" opacity="0.2" />

      {/* ═══ GRAND ENTRANCE ═══ */}
      <rect x="160" y="175" width="40" height="35" rx="20" fill="url(#ds-door)" filter="url(#ds-glow)" />
      <rect x="164" y="179" width="32" height="31" rx="16" fill="#1a0f08" opacity="0.3" />
      {/* door arch detail */}
      <path d="M164 195 Q180 172 196 195" stroke="#caa84a" strokeWidth="0.8" fill="none" opacity="0.3" />
      {/* light spill on ground */}
      <ellipse cx="180" cy="215" rx="30" ry="5" fill="#caa84a" opacity="0.1" filter="url(#ds-softglow)" />

      {/* ═══ CHIMNEY SMOKE ═══ */}
      <path d="M56 42 Q52 30 58 18" stroke="#f0e6d2" strokeWidth="0.8" fill="none" opacity="0.12">
        <animate attributeName="d" values="M56 42 Q52 30 58 18;M56 42 Q60 28 54 16;M56 42 Q52 30 58 18" dur="6s" repeatCount="indefinite" />
      </path>
      <path d="M300 42 Q304 28 298 16" stroke="#f0e6d2" strokeWidth="0.8" fill="none" opacity="0.12">
        <animate attributeName="d" values="M300 42 Q304 28 298 16;M300 42 Q296 26 302 14;M300 42 Q304 28 298 16" dur="7s" repeatCount="indefinite" />
      </path>

      {/* ═══ TREES ═══ */}
      <polygon points="15,210 25,170 35,210" fill="#2e4a20" opacity="0.5" />
      <polygon points="10,210 25,180 40,210" fill="#1e3a15" opacity="0.4" />
      <rect x="23" y="210" width="4" height="12" fill="#3e2415" opacity="0.5" />

      <polygon points="325,210 335,175 345,210" fill="#2e4a20" opacity="0.5" />
      <polygon points="320,210 335,185 350,210" fill="#1e3a15" opacity="0.4" />
      <rect x="333" y="210" width="4" height="12" fill="#3e2415" opacity="0.5" />
    </svg>
  )
}

/* ── Hanging Lantern SVG ──────────────────────────────────────── */
function HangingLantern({ side }: { side: 'left' | 'right' }) {
  return (
    <svg className={`do-lantern do-lantern--${side}`} viewBox="0 0 64 140" fill="none" aria-hidden>
      <defs>
        <radialGradient id="dlg" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#ffce54" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#caa84a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="dlb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9703f" /><stop offset="100%" stopColor="#5c3518" />
        </linearGradient>
      </defs>
      {/* chain */}
      <line x1="32" y1="0" x2="32" y2="30" stroke="#7a4a26" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* hook */}
      <path d="M28 0 Q32 -4 36 0" stroke="#a9703f" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* top cap */}
      <rect x="22" y="28" width="20" height="5" rx="2" fill="#a9703f" />
      {/* body */}
      <rect x="20" y="33" width="24" height="50" rx="5" fill="url(#dlb)" opacity="0.9" />
      {/* glass panels */}
      <rect x="22" y="35" width="20" height="46" rx="4" fill="#ffce54" opacity="0.08" />
      {/* cross bars */}
      <rect x="20" y="50" width="24" height="1.5" fill="#a9703f" />
      <rect x="20" y="66" width="24" height="1.5" fill="#a9703f" />
      {/* vertical bars */}
      <rect x="31" y="35" width="1.5" height="46" fill="#a9703f" opacity="0.5" />
      {/* flame outer */}
      <ellipse cx="32" cy="54" rx="6" ry="10" fill="#ffce54" opacity="0.5">
        <animate attributeName="opacity" values="0.4;0.65;0.4" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="ry" values="9;11;9" dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      {/* flame inner */}
      <ellipse cx="32" cy="52" rx="3" ry="6" fill="#fff3d0" opacity="0.7">
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="1.8s" repeatCount="indefinite" />
      </ellipse>
      {/* flame core */}
      <ellipse cx="32" cy="50" rx="1.5" ry="3" fill="#ffffff" opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1.2s" repeatCount="indefinite" />
      </ellipse>
      {/* bottom cap */}
      <rect x="22" y="83" width="20" height="5" rx="2" fill="#a9703f" />
      {/* finial */}
      <polygon points="29,88 32,97 35,88" fill="#7a4a26" />
      {/* glow halo */}
      <circle cx="32" cy="55" r="35" fill="url(#dlg)">
        <animate attributeName="r" values="32;38;32" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/* ── Main Component ───────────────────────────────────────────── */
export function DesktopOnly() {
  const { t } = useTranslation()
  return (
    <div className="desktop-only">
      {/* starfield */}
      <div className="do-stars" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} className="do-star" style={{
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 29 + 5) % 60}%`,
            animationDelay: `${(i * 0.6) % 6}s`,
            animationDuration: `${2 + (i % 5) * 0.7}s`,
          }} />
        ))}
      </div>

      {/* fireflies */}
      <div className="do-fireflies" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="do-ff" style={{
            left: `${8 + (i * 9) % 84}%`,
            bottom: `${5 + (i * 7) % 25}%`,
            animationDelay: `${i * 1.1}s`,
            animationDuration: `${5 + (i % 3) * 2}s`,
          }} />
        ))}
      </div>

      {/* lanterns */}
      <HangingLantern side="left" />
      <HangingLantern side="right" />

      <div className="desktop-only-card">
        {/* glow behind logo */}
        <div className="do-logo-glow" aria-hidden />

        <img className="do-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={80} height={80} />

        <h1 className="do-title">{t('desktopOnly.title')}</h1>

        <div className="do-divider"><span /><em /><span /></div>

        <CastleScene />

        <p className="do-desc">{t('desktopOnly.description')}</p>
        <p className="do-sub">{t('desktopOnly.subDescription')}</p>

        <div className="do-footer">
          <img className="do-footer-logo" src="/icons/focus-lily-logo.png" alt="" width={24} height={24} />
        </div>
      </div>
    </div>
  )
}
