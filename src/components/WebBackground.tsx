import { useEffect, useRef, useState } from 'react'
import { useWebTheme } from '../store/webTheme'
import { getWebBackground, getWebTheme } from '../lib/webThemes'
import './WebBackground.css'

// The single, persistent app background. Mounted ONCE in <App> (outside the
// router) so navigating between screens never unmounts or reloads it — that
// remount-reload was the source of the old microsecond flash.
//
// When the chosen background changes, a fresh image layer is stacked on top at
// opacity 0 and only cross-faded in *after it has fully decoded* (onLoad). The
// previous layer stays put underneath until the fade completes, so there is
// never a blank frame or a pop. A per-theme scrim + two soft glows sit above the
// photo to guarantee legibility and carry the theme's mood.

interface Layer {
  src: string
  key: number
  shown: boolean
}

export function WebBackground() {
  const themeId = useWebTheme((s) => s.themeId)
  const bgId = useWebTheme((s) => s.bgId)
  const theme = getWebTheme(themeId)
  const src = getWebBackground(theme, bgId).src

  const [layers, setLayers] = useState<Layer[]>(() => [{ src, key: 0, shown: true }])
  const nextKey = useRef(1)

  // Stack a new layer whenever the target image changes.
  useEffect(() => {
    setLayers((prev) => {
      const top = prev[prev.length - 1]
      if (top.src === src) return prev
      return [...prev, { src, key: nextKey.current++, shown: false }]
    })
  }, [src])

  // Fade a layer in only once its image has decoded.
  function handleLoaded(key: number) {
    setLayers((prev) => prev.map((l) => (l.key === key ? { ...l, shown: true } : l)))
  }

  // Once a layer is fully visible, drop everything beneath it.
  function handleFaded(key: number) {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.key === key)
      return idx > 0 && prev[idx].shown ? prev.slice(idx) : prev
    })
  }

  return (
    <div className="web-bg" aria-hidden>
      {layers.map((l) => (
        <img
          key={l.key}
          className={`web-bg-img ${l.shown ? 'shown' : ''}`}
          src={l.src}
          alt=""
          draggable={false}
          onLoad={() => handleLoaded(l.key)}
          onTransitionEnd={() => handleFaded(l.key)}
        />
      ))}
      <div className="web-bg-scrim" />
      <div className="web-bg-glow web-bg-glow-a" />
      <div className="web-bg-glow web-bg-glow-b" />
    </div>
  )
}
