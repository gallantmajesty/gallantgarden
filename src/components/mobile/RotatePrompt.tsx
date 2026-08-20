import { useEffect, useState } from 'react'

/**
 * Full-screen prompt shown when the phone is in portrait — the realm is meant
 * to be used in landscape. Also best-effort requests a landscape orientation
 * lock (browsers may ignore this unless triggered from a user gesture, so the
 * manual prompt is the reliable fallback).
 */
export function RotatePrompt() {
  const [portrait, setPortrait] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const update = () => setPortrait(mq.matches)
    update()
    mq.addEventListener?.('change', update)

    const orientation = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation
    orientation?.lock?.('landscape').catch(() => {})

    return () => mq.removeEventListener?.('change', update)
  }, [])

  if (!portrait) return null

  return (
    <div className="ms-rotate" role="alertdialog" aria-label="Rotate your phone">
      <div className="ms-rotate-phone">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="7" y="2.5" width="10" height="19" rx="2.4" />
          <line x1="11" y1="18.5" x2="13" y2="18.5" />
          <path d="M9.5 9.5l5 2.5-5 2.5z" />
        </svg>
      </div>
      <h2 className="ms-rotate-title">Rotate your phone</h2>
      <p className="ms-rotate-sub">For the best realm experience, turn your device to landscape.</p>
    </div>
  )
}
