import { useEffect, useState } from 'react'
import './DesktopOnly.css'

// Focus Lily is a keyboard + mouse, GPU-heavy study platform. It is meant for
// genuine desktop/laptop computers only — phones and tablets are blocked
// entirely (including phones that request the "desktop site"). We detect a real
// desktop by combining user-agent, iPadOS masquerade detection, and the actual
// input capabilities of the device (a real mouse / trackpad = fine pointer +
// hover). A phone faking a desktop UA still has a coarse, hover-less pointer.

function detectDesktop(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true

  const ua = navigator.userAgent || ''
  const mobileUA =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|iPad|Silk|Kindle|PlayBook|Nintendo|Phone/i.test(
      ua,
    )

  // iPadOS 13+ reports as "MacIntel" but exposes multi-touch — catch the masquerade.
  const iPadOS =
    (navigator.platform === 'MacIntel' || /Macintosh/.test(ua)) && (navigator.maxTouchPoints ?? 0) > 1

  if (mobileUA || iPadOS) return false

  // A genuine desktop has a precise pointer that can hover. A phone in
  // "desktop mode" keeps a coarse, hover-less touch pointer, so this also blocks
  // desktop-emulation on phones.
  const finePointer = window.matchMedia('(any-pointer: fine)').matches
  const canHover = window.matchMedia('(any-hover: hover)').matches

  return finePointer && canHover
}

/** Reactive desktop check — re-evaluates on resize / input changes so dev device
 *  emulation and external-mouse hot-plugging are reflected without a reload. */
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

/** True when the document is currently in fullscreen (incl. the WebKit prefix). */
function isFullscreen(): boolean {
  const d = document as Document & { webkitFullscreenElement?: Element | null }
  return !!(d.fullscreenElement || d.webkitFullscreenElement)
}

/**
 * Mobile fullscreen prompt. Focus Lily now opens on phones & tablets too, but the
 * 3D study world is best with the browser chrome out of the way — so before the
 * app opens we ask the visitor to enter fullscreen, and if they leave fullscreen
 * we prompt them again. Desktop visitors never see this (App only mounts it when
 * the device isn't a desktop). On browsers without the Fullscreen API (notably
 * iPhone Safari) we let them through rather than trap them.
 */
export function MobileFullscreenGate() {
  const [needsFullscreen, setNeedsFullscreen] = useState(!isFullscreen())

  // Re-prompt whenever the user drops out of fullscreen.
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
      // Fullscreen API unsupported (e.g. iPhone Safari) — don't block the user.
      setNeedsFullscreen(false)
      return
    }
    const req = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.()
    // On success the fullscreenchange listener hides the gate; on rejection
    // (e.g. gesture lost) hide it anyway so the prompt can't get stuck.
    Promise.resolve(req)
      .then(() => setNeedsFullscreen(false))
      .catch(() => setNeedsFullscreen(false))
  }

  return (
    <div className="fs-gate">
      <div className="fs-gate-card">
        <img className="fs-gate-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={72} height={72} />
        <h1>Use fullscreen</h1>
        <p>Focus Lily works best in fullscreen on mobile. Tap below to go fullscreen and start your session.</p>
        <button type="button" className="fs-gate-btn" onClick={enter}>
          Enter fullscreen
        </button>
      </div>
    </div>
  )
}

/** Full-screen block shown to phone / tablet visitors. The main application is
 *  never mounted behind it. */
export function DesktopOnly() {
  return (
    <div className="desktop-only">
      <div className="desktop-only-card">
        <img className="desktop-only-logo" src="/icons/focus-lily-logo.png" alt="Focus Lily" width={84} height={84} />
        <h1>Focus Lily is built for desktop</h1>
        <p>
          Focus Lily is currently available only on desktop devices for the best study experience.
        </p>
        <p className="desktop-only-sub">
          Open Focus Lily on a laptop or desktop computer to enter your study realm, grow your note
          forest and start a focus session.
        </p>
        <img className="desktop-only-lotus" src="/icons/lotus.png" alt="" width={40} height={40} />
      </div>
    </div>
  )
}
