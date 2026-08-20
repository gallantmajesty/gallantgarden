import { useState } from 'react'

/**
 * Manual fullscreen toggle. Per the mobile design, fullscreen is NEVER entered
 * automatically — the user taps this button to opt in (and taps again to exit).
 */
export function FullscreenButton() {
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  )

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
        .then(() => setActive(true))
        .catch(() => {})
    } else {
      document.exitFullscreen?.()
        .then(() => setActive(false))
        .catch(() => {})
    }
  }

  return (
    <button className="ms-fs-btn" onClick={toggle} aria-label={active ? 'Exit full screen' : 'Full screen'}>
      {active ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16h-3a2 2 0 0 1-2 2v3M8 21H5a2 2 0 0 1-2-2v-3" />
        </svg>
      )}
    </button>
  )
}
