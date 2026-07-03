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

export function DesktopOnly() {
  const { t } = useTranslation()
  return (
    <div className="desktop-only">
      {/* Ambient background particles */}
      <div className="do-particles" aria-hidden>
        <span /><span /><span /><span /><span />
      </div>

      <div className="desktop-only-card">
        <div className="do-icon-ring">
          <img className="desktop-only-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={64} height={64} />
        </div>

        <h1 className="do-title">{t('desktopOnly.title')}</h1>

        <div className="do-divider" />

        <p className="do-desc">{t('desktopOnly.description')}</p>
        <p className="desktop-only-sub">{t('desktopOnly.subDescription')}</p>

        <div className="do-footer">
          <img className="desktop-only-lotus" src="/icons/focus-lily-logo.png" alt="" width={28} height={28} />
        </div>
      </div>
    </div>
  )
}
