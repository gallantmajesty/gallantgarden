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
