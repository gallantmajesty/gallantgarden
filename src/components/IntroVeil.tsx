import { useEffect, useRef, useState } from 'react'
import './IntroVeil.css'

// Clash-of-Clans-style opening scene. On a page load this overlay sits on top of
// everything and plays the lotus-logo intro while the app boots underneath.
//
// The video is SILENT in the web app — the file ships with no audio track and the
// element is muted, so there is nothing to turn down and no audio control in the
// lobby settings.
//
// Two flavours, chosen from how the page was loaded:
//   • Fresh open / new tab (navigate) → play from the very start so you see the
//     whole build-up (black → the logo igniting), for a ~4–5s taste.
//   • Refresh / reload                → skip the build-up and drop straight into
//     the settled logo scene for a shorter ~2–3s taste.
//
// It dismisses once that taste has played AND the app is ready to paint (auth
// resolved, profile loaded). If the PC is slow and the app isn't ready yet, the
// video simply keeps playing past its window until readiness lands — and if it
// reaches the end first, it holds on the last glowing frame until then. So the
// intro never cuts to a half-built lobby.
//
// Once faded it unmounts itself, so it costs nothing for the rest of the session
// and never replays on in-app navigation (App, and therefore this, stays mounted).

// How long into the clip the logo has fully formed and is just glowing — the
// "logo scene" we jump to on a refresh.
const LOGO_SCENE_START = 2.5 // seconds
const FADE_MS = 650

// Minimum on-screen taste before readiness is allowed to cut the scene. Longer on
// a fresh open (we want the whole build-up); shorter on a refresh (logo only).
const FRESH_WINDOW_MS = 4500
const RELOAD_WINDOW_MS = 2500

// True when this page came up via a browser refresh/reload (vs. a fresh open or a
// new tab). Uses the Navigation Timing API; defaults to "fresh" if unavailable.
function isReload(): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    return nav?.type === 'reload'
  } catch {
    return false
  }
}

export function IntroVeil({ ready }: { ready: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Decide fresh-vs-reload once, on mount — it can't change for this page life.
  const reloadRef = useRef(isReload())
  const windowMs = reloadRef.current ? RELOAD_WINDOW_MS : FRESH_WINDOW_MS

  const [windowDone, setWindowDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [gone, setGone] = useState(false)

  // Leave on a deliberate skip, or once the taste has played AND the app is ready.
  // If ready lands early (fast boot) we still hold for the window; if it lands late
  // (slow boot) the window is long gone and we leave the moment readiness arrives.
  const leaving = skipped || (windowDone && ready)

  // On a refresh, jump straight to the settled logo before the first paint, so the
  // build-up never flashes. On a fresh open we start at 0 (the default).
  const onLoadedMetadata = () => {
    const v = videoRef.current
    if (v && reloadRef.current) v.currentTime = LOGO_SCENE_START
  }

  // Always muted — the clip has no audio track and the web app plays it silent.
  // Start the on-screen window timer when playback actually begins, so the ~2–3s /
  // ~4–5s taste is measured against what the user really sees, not the boot clock.
  const startedRef = useRef(false)
  const onPlaying = () => {
    if (startedRef.current) return
    startedRef.current = true
    setTimeout(() => setWindowDone(true), windowMs)
  }

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
    // Safety net: if 'playing' never fires (e.g. autoplay quirk), still open the
    // window from mount so the scene can't get stuck on screen.
    const t = setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true
        setWindowDone(true)
      }
    }, windowMs + 800)
    return () => clearTimeout(t)
  }, [windowMs])

  // Once the fade-out begins, unmount after it finishes so the overlay costs
  // nothing for the rest of the session.
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(t)
  }, [leaving])

  if (gone) return null

  return (
    <div
      className={`intro-veil ${leaving ? 'intro-leaving' : ''}`}
      onClick={() => setSkipped(true)}
      role="presentation"
    >
      <video
        ref={videoRef}
        className="intro-video"
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={onLoadedMetadata}
        onPlaying={onPlaying}
      />
      <div className="intro-vignette" />
      <button
        type="button"
        className="intro-skip"
        onClick={(e) => {
          e.stopPropagation()
          setSkipped(true)
        }}
      >
        Skip ›
      </button>
    </div>
  )
}
