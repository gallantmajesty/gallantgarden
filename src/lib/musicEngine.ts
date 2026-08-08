import { useMusic, MUSIC_TRACKS, type MusicTrack } from './music'

// Free streaming music engine. One <audio> element, Jamendo CC tracks (direct
// archive.org MP3s) — no YouTube iframe, no API key, no account, no ads.
//
// Tracks auto-advance when they end ("flows"), and a failed load skips to the
// next track so playback never dead-ends.
//
// This class is intentionally framework-agnostic; the React layer talks to it
// via the `useMusic` store, which it drives with useMusic.setState().

export class MusicEngine {
  private audio: HTMLAudioElement
  private current: MusicTrack | null = null
  private failCount = 0

  constructor() {
    this.audio = new Audio()
    this.audio.loop = false
    this.audio.preload = 'auto'
    this.audio.volume = useMusic.getState().volume
    this.audio.addEventListener('ended', () => useMusic.getState().next())
    this.audio.addEventListener('error', () => {
      // Stream failed (offline / file moved) — skip to the next track, but stop
      // after a few consecutive failures so we don't spin forever.
      this.failCount += 1
      if (this.failCount >= 3) return
      useMusic.getState().next()
    })
    // No async setup anymore — the player is usable the moment the widget mounts.
    useMusic.setState({ ready: true })
  }

  /** Begin playing a track id. */
  play(id: string) {
    const track = MUSIC_TRACKS.find((t) => t.id === id) ?? MUSIC_TRACKS[0]
    this.current = track
    this.failCount = 0
    useMusic.setState({ playing: true, currentId: track.id })
    if (this.audio.src !== track.url) this.audio.src = track.url
    this.audio.volume = useMusic.getState().volume
    this.audio.muted = useMusic.getState().muted
    void this.audio.play().catch(() => useMusic.getState().next())
  }

  pause() {
    useMusic.setState({ playing: false })
    this.audio.pause()
  }
  resume() {
    if (!this.current) {
      this.play(MUSIC_TRACKS[0].id)
      return
    }
    void this.audio.play().catch(() => {})
    useMusic.setState({ playing: true })
  }

  setVolume(v: number) {
    this.audio.volume = v
  }
  setMuted(m: boolean) {
    this.audio.muted = m
  }
}
