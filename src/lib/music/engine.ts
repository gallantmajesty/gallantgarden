import type { MusicPreset, MusicSource, MusicState } from './types'

// Local focus-music engine for the Library Realm widget.
//
// Mirrors the singleton pattern of `getAmbient()` in src/audio/ambient.ts: the
// engine lives at module scope (`getMusic()`), so playback is owned by the app —
// NOT by the React widget. Hiding the HUD (Tab), opening menus, or even
// navigating to another route unmounts the widget but never stops the music.
// Sound stops only when the user pauses (or picks a "soon" preset).
//
// v1 plays two synthesized presets (brown noise, deep focus) via the Web Audio
// API and one looping file (rain) via an HTMLAudioElement. Both volume paths are
// driven by a single `setVolume`.

const NOISE_SECONDS = 3 // length of the looped brown-noise buffer

export class LocalMusicEngine implements MusicSource {
  private ctx: AudioContext | null = null
  /** Output bus for the synthesized presets; its gain is the synth volume. */
  private out: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null

  // live synth nodes for the current noise preset (recreated each play)
  private noiseSrc: AudioBufferSourceNode | null = null
  private filter: BiquadFilterNode | null = null
  private padOsc: OscillatorNode | null = null
  private padGain: GainNode | null = null

  // looping-file path (rain etc.)
  private el: HTMLAudioElement | null = null
  // Jamendo stream path (one non-looping element; auto-advances on end)
  private jamEl: HTMLAudioElement | null = null
  private jamFailures = 0

  /** Fired when a Jamendo track plays to its end (or fails to load) — the store
   *  wires this to `next()` so the playlist keeps flowing. */
  onTrackEnd: (() => void) | null = null

  private preset: MusicPreset | null = null
  private playing = false
  private volume = 0.7
  private subs = new Set<(s: MusicState) => void>()

  // ---- MusicSource -------------------------------------------------------

  load(preset: MusicPreset) {
    if (this.preset?.id === preset.id) return
    const wasPlaying = this.playing
    if (wasPlaying) this.stopCurrent()
    this.preset = preset
    // Live-swap: keep playing through a preset change (skip if new one is "soon").
    if (wasPlaying && preset.available) this.startCurrent()
    else if (wasPlaying && !preset.available) this.playing = false
    this.emit()
  }

  play() {
    if (!this.preset || !this.preset.available || this.playing) return
    this.ensure()
    this.playing = true
    this.startCurrent()
    this.emit()
  }

  pause() {
    if (!this.playing) return
    this.playing = false
    this.stopCurrent()
    this.emit()
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    this.applyVolume()
  }

  getState(): MusicState {
    return { presetId: this.preset?.id ?? null, playing: this.playing }
  }

  subscribe(cb: (s: MusicState) => void) {
    this.subs.add(cb)
    return () => this.subs.delete(cb)
  }

  // ---- internals ---------------------------------------------------------

  private emit() {
    const s = this.getState()
    this.subs.forEach((cb) => cb(s))
  }

  /** Create / resume the AudioContext. Must be reachable from a user gesture. */
  private ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    this.ctx = ctx
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(ctx.destination)
    this.out = out
  }

  private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer
    const len = Math.floor(ctx.sampleRate * NOISE_SECONDS)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    // Brown noise: integrate white noise, with light gain compensation.
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    this.noiseBuffer = buf
    return buf
  }

  /** Build + start audio for the current preset. Assumes ctx exists. */
  private startCurrent() {
    const preset = this.preset
    if (!preset) return
    if (preset.source.kind === 'noise') {
      this.startNoise(preset.source.variant)
    } else if (preset.source.kind === 'loop') {
      this.startLoop(preset.source.url)
    } else if (preset.source.kind === 'jamendo') {
      this.startJamendo(preset.source.url)
    }
  }

  private startNoise(variant: 'brown' | 'deep') {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return

    const src = ctx.createBufferSource()
    src.buffer = this.buildNoiseBuffer(ctx)
    src.loop = true

    if (variant === 'deep') {
      // Low-passed brown noise + a faint low sine pad = a deeper, enveloping hum.
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 320
      src.connect(filter).connect(out)
      this.filter = filter

      const pad = ctx.createOscillator()
      pad.type = 'sine'
      pad.frequency.value = 110
      const padGain = ctx.createGain()
      padGain.gain.value = 0.06
      pad.connect(padGain).connect(out)
      pad.start()
      this.padOsc = pad
      this.padGain = padGain
    } else {
      src.connect(out)
    }

    src.start()
    this.noiseSrc = src
    this.rampOut(this.synthTarget())
  }

  private startLoop(url: string) {
    const ctx = this.ctx
    if (!ctx) return
    if (!this.el) {
      const el = new Audio()
      el.loop = true
      el.preload = 'auto'
      this.el = el
    }
    if (this.el.src.indexOf(url) === -1) this.el.src = url
    this.el.volume = this.volume
    void this.el.play().catch(() => {})
  }

  /** Play a Jamendo stream end-to-end. On finish (or load failure) the engine
   *  calls `onTrackEnd` so the store advances the playlist — "flows". */
  private startJamendo(url: string) {
    if (!this.jamEl) {
      const el = new Audio()
      el.loop = false
      el.preload = 'auto'
      el.addEventListener('ended', () => this.handleJamEnd())
      el.addEventListener('error', () => this.handleJamEnd())
      this.jamEl = el
    }
    this.jamFailures = 0
    if (this.jamEl.src.indexOf(url) === -1) this.jamEl.src = url
    this.jamEl.volume = this.volume
    void this.jamEl.play().catch(() => this.handleJamEnd())
  }

  private handleJamEnd() {
    // A few consecutive failures = the feed itself is unreachable; stop skipping.
    this.jamFailures += 1
    if (this.jamFailures > 3) return
    this.onTrackEnd?.()
  }

  /** Stop whatever is currently sounding, without changing `playing`. */
  private stopCurrent() {
    // synth: ramp out, then stop the nodes shortly after to avoid a click
    if (this.ctx && this.out) this.rampOut(0)
    const src = this.noiseSrc
    const pad = this.padOsc
    const filter = this.filter
    const padGain = this.padGain
    this.noiseSrc = null
    this.padOsc = null
    this.filter = null
    this.padGain = null
    if (src || pad) {
      const stopAt = (this.ctx?.currentTime ?? 0) + 0.25
      try {
        src?.stop(stopAt)
        pad?.stop(stopAt)
      } catch {
        /* already stopped */
      }
      window.setTimeout(() => {
        try {
          src?.disconnect()
          pad?.disconnect()
          filter?.disconnect()
          padGain?.disconnect()
        } catch {
          /* noop */
        }
      }, 320)
    }
    // loop file
    if (this.el && !this.el.paused) this.el.pause()
    // jamendo stream
    if (this.jamEl && !this.jamEl.paused) this.jamEl.pause()
  }

  /** Synth output level for the current volume (kept well below clipping). */
  private synthTarget() {
    return this.volume * 0.5
  }

  private rampOut(target: number) {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return
    const now = ctx.currentTime
    out.gain.cancelScheduledValues(now)
    out.gain.setValueAtTime(out.gain.value, now)
    out.gain.linearRampToValueAtTime(target, now + 0.3)
  }

  private applyVolume() {
    if (!this.playing) return
    const kind = this.preset?.source.kind
    if (kind === 'noise') this.rampOut(this.synthTarget())
    else if (kind === 'loop' && this.el) this.el.volume = this.volume
    else if (kind === 'jamendo' && this.jamEl) this.jamEl.volume = this.volume
  }
}

let engine: LocalMusicEngine | null = null

/** The app-wide music engine. Safe to call from anywhere; the instance persists
 *  for the life of the page so playback survives widget/route unmounts. */
export function getMusic(): LocalMusicEngine {
  if (!engine) engine = new LocalMusicEngine()
  return engine
}
