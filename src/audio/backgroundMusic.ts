// Global, app-wide ambient background music — like a game lobby soundtrack
// (Free Fire style). It is deliberately NOT tied to any room or realm click:
// it starts on the first user gesture anywhere in the app and loops forever.
//
// To keep it rock-solid we deliberately avoid the Web Audio graph (a routed
// MediaElementSource can silently output nothing on some machines). Instead we
// use a plain <audio loop> element whose volume we ramp with requestAnimationFrame,
// giving a fade-in on start and a fade-out / fade-in dip at every loop seam — i.e.
// it "fades in and out to make it loop" with no click or abrupt jump.

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '../store/settings'

const MUSIC_SRC = '/audio/Where_Sunlight_Meets_Stone.mp3'

/** Routes where the user is "in a room" doing focused work — the lobby music is
 *  paused here (Free Fire style: music in the lobby, silence in the match). */
function isRoomRoute(path: string): boolean {
  return (
    path.startsWith('/lobby/realm') ||
    path.startsWith('/room') ||
    path.startsWith('/lobby/explore') ||
    path.startsWith('/trainx')
  )
}
// Seconds for the start fade-in and for the fade-out / fade-in dip at each loop seam.
const FADE = 3
// Fade-in on first start (snappy so it doesn't feel late once a gesture happens).
const FADE_IN = 1

// Tiny dev-only status reporter so we can diagnose "no sound" without the console.
type StatusListener = (s: string) => void
const statusListeners = new Set<StatusListener>()
let statusText = 'idle'
function setStatus(s: string) {
  statusText = s
  statusListeners.forEach((l) => l(s))
}
export function onBgmStatus(fn: StatusListener) {
  statusListeners.add(fn)
  fn(statusText)
  return () => {
    statusListeners.delete(fn)
  }
}

export interface MusicMix {
  master: number
  vol: number
  on: boolean
}

export class BackgroundMusicEngine {
  private el: HTMLAudioElement | null = null
  private raf = 0
  private seam: 'idle' | 'out' | 'in' = 'idle'
  private roomActive = false
  private mix: MusicMix = { master: 0.8, vol: 0.4, on: true }

  get running() {
    return !!this.el
  }

  private targetVol() {
    // Use the dedicated music volume directly. We intentionally do NOT multiply by
    // the global `master` — if master is 0 (which mutes all other audio) the lobby
    // music would otherwise be silent too. The "Lobby music" toggle + this slider
    // are its only volume controls.
    return this.mix.on ? Math.max(0, Math.min(1, this.mix.vol)) : 0
  }

  /** Create the element and buffer it WITHOUT playing (safe to call on app mount,
   *  no autoplay violation). The actual playback waits for a user gesture. */
  preload() {
    if (this.el) return
    const el = new Audio(MUSIC_SRC)
    el.loop = true
    el.preload = 'auto'
    el.volume = 0
    this.el = el
    setStatus('preloaded')
    el.addEventListener('timeupdate', () => this.onTime())
    el.addEventListener('loadedmetadata', () => setStatus('loaded, dur=' + Math.round(el.duration) + 's'))
    el.addEventListener('canplay', () => setStatus('canplay ' + Math.round(this.targetVol() * 100) + '%'))
    el.addEventListener('error', () => setStatus('media error: ' + (el.error?.message ?? 'unknown')))
    el.load() // start downloading/buffering now

    // Pause when the tab is hidden so we don't burn battery; resume on show.
    document.addEventListener('visibilitychange', () => {
      if (!this.el) return
      if (document.hidden) this.el.pause()
      else if (this.mix.on && this.el.paused) void this.el.play().catch(() => {})
    })
  }

  /** Begin playback. Safe to call again; if already created it just resumes. */
  ensure() {
    if (!this.el) this.preload()
    const el = this.el!
    void el
      .play()
      .then(() => {
        setStatus('playing ' + Math.round(this.targetVol() * 100) + '%')
        this.fadeTo(this.targetVol(), FADE_IN) // fade in on start
      })
      .catch((e) => setStatus('rejected: ' + (e as Error).message))
  }

  /** Called when the user enters/leaves an immersive room. While in a room the
   *  lobby music is paused (Free Fire style); leaving the room resumes it. This is
   *  independent of the user's lobbyMusicOn setting. */
  setRoom(active: boolean) {
    this.roomActive = active
    this.apply(this.mix)
  }

  /** Smoothly ramp the element volume from its current value to `target`. */
  private fadeTo(target: number, dur: number) {
    const el = this.el
    if (!el) return
    cancelAnimationFrame(this.raf)
    const start = performance.now()
    const from = el.volume
    const tick = (now: number) => {
      // Clamp to [0,1]: an early frame (now < start) would make t negative and,
      // when fading IN from 0, produce a negative volume that throws.
      const t = Math.max(0, Math.min(1, (now - start) / (dur * 1000)))
      el.volume = Math.max(0, Math.min(1, from + (target - from) * t))
      if (t < 1) this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  /** Near the end we fade out; once the loop wraps back to the start we fade in. */
  private onTime() {
    const el = this.el
    if (!el) return
    const dur = el.duration
    if (!isFinite(dur) || dur <= 0) return
    if (el.currentTime >= dur - FADE && this.seam !== 'out') {
      this.seam = 'out'
      this.fadeTo(0, FADE)
    } else if (this.seam === 'out' && el.currentTime < FADE) {
      this.seam = 'in'
      this.fadeTo(this.targetVol(), FADE)
    } else if (this.seam === 'in' && el.currentTime >= FADE) {
      this.seam = 'idle'
    }
  }

  /** Apply a new mix. Starts/stops playback and adjusts volume with soft ramps. */
  apply(mix: MusicMix) {
    this.mix = mix
    const el = this.el
    if (!el) return
    const shouldPlay = mix.on && !this.roomActive
    if (shouldPlay) {
      setStatus('on ' + Math.round(this.targetVol() * 100) + '%')
      if (el.paused) {
        // Not actually playing yet (autoplay blocked) — let the play() promise
        // fade it in; don't pre-ramp the volume while silent.
        void el
          .play()
          .then(() => {
            setStatus('playing ' + Math.round(this.targetVol() * 100) + '%')
            this.fadeTo(this.targetVol(), FADE_IN)
          })
          .catch((e) => setStatus('rejected: ' + (e as Error).message))
      } else {
        // Already playing — only ramp if the volume actually changed, so repeated
        // gestures don't keep re-fading the music.
        if (Math.abs(el.volume - this.targetVol()) > 0.01) {
          this.fadeTo(this.targetVol(), FADE_IN)
        }
      }
    } else {
      // Paused: either the user turned it off, or we entered a room. Fade out
      // quickly for a clean stop, then pause.
      this.fadeTo(0, 0.5)
      window.setTimeout(() => {
        const cur = this.el
        if (cur && !(this.mix.on && !this.roomActive)) cur.pause()
      }, 550)
      setStatus(this.roomActive ? 'paused (in room)' : 'off')
    }
  }
}

let engine: BackgroundMusicEngine | null = null
export function getBackgroundMusic(): BackgroundMusicEngine {
  if (!engine) engine = new BackgroundMusicEngine()
  return engine
}

/**
 * Mounts the global lobby background music. Starts on the first user gesture
 * anywhere in the app (browser autoplay rule) and keeps playing across every
 * screen — it is NOT tied to clicking any room or realm, so it behaves like a
 * persistent Free Fire-style lobby soundtrack.
 */
export function useBackgroundMusic() {
  const master = useSettings((s) => s.master)
  const vol = useSettings((s) => s.lobbyMusicVol)
  const on = useSettings((s) => s.lobbyMusicOn)
  const [status, setStatusState] = useState('idle')

  useEffect(() => onBgmStatus(setStatusState), [])

  // Buffer the track as soon as the app loads (no playback yet — browsers block
  // audible autoplay without a gesture). The first real gesture then starts it
  // instantly from the already-buffered audio. We only PRELOAD here (no play()
  // attempt) so a rejected autoplay on mount can't interrupt buffering.
  useEffect(() => {
    getBackgroundMusic().preload()
  }, [])

  // Start on the first user gesture. Capture phase + several event types so an
  // overlay's stopPropagation can't swallow it. Listeners stay attached and
  // start() is idempotent, so it simply retries on the next gesture if the first
  // is blocked (we no longer tear them down after one failed attempt).
  useEffect(() => {
    const eng = getBackgroundMusic()
    const start = () => {
      eng.ensure()
      const s = useSettings.getState()
      eng.apply({ master: s.master, vol: s.lobbyMusicVol, on: s.lobbyMusicOn })
    }
    const events = ['pointerdown', 'click', 'keydown', 'touchstart'] as const
    const handler = () => start()
    events.forEach((e) => window.addEventListener(e, handler, true))
    return () => events.forEach((e) => window.removeEventListener(e, handler, true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pause the lobby music while the user is in an immersive room (realm, library,
  // study room, train) and resume it when they're back in the lobby — Free Fire
  // style. Independent of the lobbyMusicOn setting.
  const location = useLocation()
  useEffect(() => {
    getBackgroundMusic().setRoom(isRoomRoute(location.pathname))
  }, [location.pathname])

  // Keep the engine in sync with the audio settings at all times.
  useEffect(() => {
    getBackgroundMusic().apply({ master, vol, on })
  }, [master, vol, on])

  return status
}
