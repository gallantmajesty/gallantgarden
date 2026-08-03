import { useEffect, useRef, useState } from 'react'
import './IntroVeil.css'

const FADE_MS = 300
const FRESH_WINDOW_MS = 500
const RELOAD_WINDOW_MS = 500

function isReload(): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming | undefined
    return nav?.type === 'reload'
  } catch { return false }
}

export function IntroVeil({ ready }: { ready: boolean }) {
  const reloadRef = useRef(isReload())
  const windowMs = reloadRef.current ? RELOAD_WINDOW_MS : FRESH_WINDOW_MS

  const [windowDone, setWindowDone] = useState(false)
  const [gone, setGone] = useState(false)

  const leaving = windowDone && ready

  useEffect(() => {
    const t = setTimeout(() => setWindowDone(true), windowMs)
    return () => clearTimeout(t)
  }, [windowMs])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(t)
  }, [leaving])

  if (gone) return null

  return (
    <div className={`intro-veil ${leaving ? 'intro-leaving' : ''}`} role="presentation">
      <div className="intro-logo-wrap">
        <img
          className="intro-logo"
          src="/icons/focus-lily-logo.png"
          alt=""
          draggable={false}
        />
      </div>

      <div className="intro-glow">
        <img
          className="intro-glow-img"
          src="/icons/focus-lily-logo.png"
          alt=""
          draggable={false}
        />
      </div>

      <div className="intro-loading">
        <div className="intro-loading-track">
          <div className="intro-loading-fill" />
        </div>
      </div>
    </div>
  )
}