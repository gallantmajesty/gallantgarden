import { useEffect, useState } from 'react'
import { useIsMobileOrTablet } from '../../hooks/useDevice'
import './RealmFullscreenGate.css'

/**
 * Fullscreen enforcement for the 3D realm worlds — mobile/tablet ONLY.
 *
 * On a phone or tablet, while `active` (i.e. the player is inside a 3D world),
 * the app requires fullscreen. If the user exits fullscreen (swipes up, hits
 * back), the prompt re-appears and reminds them to re-enter — exactly the
 * behavior requested for the Realm.
 *
 * Desktop is completely unaffected (this returns null there).
 *
 * iOS Safari has no Fullscreen API, so we never trap the user: when fullscreen
 * can't be requested we offer a "Continue without fullscreen" escape, and the
 * reminder re-surfaces if they later leave fullscreen on a supporting browser.
 */
function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
  }
  return !!(el.requestFullscreen || el.webkitRequestFullscreen)
}

function currentFullscreen(): boolean {
  return !!(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)
}

export function RealmFullscreenGate({ active = true }: { active?: boolean }) {
  const isMobile = useIsMobileOrTablet()
  const [needs, setNeeds] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isMobile || !active) {
      setNeeds(false)
      setDismissed(false)
      return
    }
    const sync = () => {
      const fs = currentFullscreen()
      setNeeds(!fs)
      // leaving fullscreen re-arms the reminder (but keep any prior "continue"
      // choice so an unsupported browser isn't nagged every frame)
      if (fs) setDismissed(false)
    }
    sync()
    const onChange = () => sync()
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange as EventListener)
    }
  }, [isMobile, active])

  const enter = () => {
    const el = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>
      webkitRequestFullscreen?: () => Promise<void>
    }
    const req = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.()
    if (req) Promise.resolve(req).catch(() => setDismissed(true))
    else setDismissed(true) // no Fullscreen API (e.g. iOS) → allow continue
  }

  if (!isMobile || !active || !needs || dismissed) return null

  return (
    <div className="rfs-gate">
      <div className="rfs-card">
        <img className="rfs-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={64} height={64} />
        <h1>Enter fullscreen</h1>
        <p>For the best realm experience, please open Focus Lily in fullscreen.</p>
        <button className="rfs-enter" onClick={enter}>Enter fullscreen</button>
        {!fullscreenSupported() && (
          <button className="rfs-skip" onClick={() => setDismissed(true)}>
            Continue without fullscreen
          </button>
        )}
      </div>
    </div>
  )
}
