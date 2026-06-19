import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import './IntroVeil.css'

// Clash-of-Clans-style opening scene. On a fresh page load this overlay sits on
// top of everything and plays an intro video while the app boots underneath.
//
// It dismisses on whichever of these comes first, after a short minimum beat so
// the scene always registers even on a warm/cached load:
//   • the lobby is ready to open  → cut the video wherever it is and fade out
//   • the video finishes on its own → fade out (and if the app is somehow still
//     not ready, hold the last frame until it is, then fade)
//
// Sound plays by DEFAULT, at the master volume from the lobby settings — that's
// the one place users turn it down or off (Settings → Audio). There is no on-
// screen sound prompt; if the browser blocks autoplay-with-audio we simply start
// muted and unmute on the user's first interaction anywhere.
//
// Once faded it unmounts itself, so it costs nothing for the rest of the session
// and never replays on in-app navigation (App, and therefore this, stays mounted).

const MIN_SHOWN_MS = 1500 // smallest taste of the intro before readiness may cut it
const FADE_MS = 650

export function IntroVeil({ ready }: { ready: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Snapshot the master volume once: the opening scene shouldn't chase slider
  // changes mid-play, and the lobby settings are the canonical control.
  const masterRef = useRef(useSettings.getState().master)
  const [minElapsed, setMinElapsed] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [gone, setGone] = useState(false)

  // A deliberate skip leaves at once; otherwise we wait out the minimum beat and
  // then go as soon as the lobby is ready or the video has played out. Derived,
  // not stored, so the fade starts the same render the condition flips.
  const leaving = skipped || (minElapsed && (ready || videoEnded))

  // Minimum-on-screen timer so a near-instant boot still shows the opening beat.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SHOWN_MS)
    return () => clearTimeout(t)
  }, [])

  // Play with sound on by default. Try unmuted first; if the browser blocks it
  // (no user gesture yet), start muted and unmute on the first interaction.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const vol = masterRef.current
    const soundOn = vol > 0
    v.volume = vol
    v.muted = !soundOn
    v.play().catch(() => {
      v.muted = true
      v.play().catch(() => {})
    })

    if (!soundOn) return
    const unmute = () => {
      if (v.muted && masterRef.current > 0) {
        v.muted = false
        v.volume = masterRef.current
        v.play().catch(() => {})
      }
      teardown()
    }
    const teardown = () => {
      window.removeEventListener('pointerdown', unmute)
      window.removeEventListener('keydown', unmute)
    }
    window.addEventListener('pointerdown', unmute)
    window.addEventListener('keydown', unmute)
    return teardown
  }, [])

  // Once the fade-out begins, unmount after it finishes so the overlay costs
  // nothing for the rest of the session. (setState here lives in a timeout
  // callback, not the effect body, so it triggers no cascading render.)
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
        playsInline
        preload="auto"
        onEnded={() => setVideoEnded(true)}
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
