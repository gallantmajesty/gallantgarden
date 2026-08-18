// Library soundscape. The rain bus plays a looping rain recording
// (public/audio/rain.mp3) through a MediaElementAudioSourceNode, routed through a
// master bus, plus a short bell for Pomodoro notifications. The old procedural
// ambient-music pad has been removed (the library plays no background music); the
// ambient bus remains in the mix interface but is silent.

export interface AudioMix {
  master: number
  ambientVol: number
  rainVol: number
  ambientOn: boolean
  rainOn: boolean
}

/** The looping rain recording played on the rain bus in the library. Served from
 *  public/ at this path. Replaces the old procedural noise rain. */
const RAIN_SRC = '/audio/rain.mp3'

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: GainNode | null = null
  private rain: GainNode | null = null
  private rainEl: HTMLAudioElement | null = null
  private mix: AudioMix = { master: 0.8, ambientVol: 0.6, rainVol: 0.7, ambientOn: false, rainOn: true }

  get running() {
    return !!this.ctx
  }

  /** Build the graph (must be called from a user gesture). Safe to call again.
   *  Pass the *current* mix so the very first ramp respects the caller's gate
   *  (e.g. rain held off during seat selection) instead of the stored default. */
  ensure(initialMix?: AudioMix) {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    this.ctx = ctx

    const master = ctx.createGain()
    master.gain.value = 0.0001
    master.connect(ctx.destination)
    this.master = master

    // ambient pad bus — kept as a silent, source-less gain node so the existing
    // mix plumbing (apply(), the settings store's ambientOn/ambientVol) stays
    // valid, but the synthesised drone that used to feed it has been removed:
    // the library no longer plays any ambient music. Only the rain bus and the
    // Pomodoro chime make sound now.
    const ambient = ctx.createGain()
    ambient.gain.value = 0
    ambient.connect(master)
    this.ambient = ambient

    // rain bus — a looping rain recording (public/audio/rain.mp3) routed through
    // the same gain node, so the existing rainOn / rainVol / master mix still
    // controls it. Played via a MediaElementAudioSourceNode.
    const rain = ctx.createGain()
    rain.gain.value = 0
    rain.connect(master)
    this.rain = rain

    const rainEl = new Audio(RAIN_SRC)
    rainEl.loop = true
    rainEl.crossOrigin = 'anonymous'
    rainEl.preload = 'auto'
    this.rainEl = rainEl
    const rainSrc = ctx.createMediaElementSource(rainEl)
    rainSrc.connect(rain)
    // Kick off playback; we're inside the first user gesture so autoplay is allowed.
    void rainEl.play().catch(() => {})

    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.4)
    this.apply(initialMix ?? this.mix)
  }

  /** Apply a new mix (call any time; gentle ramps avoid clicks). */
  apply(mix: AudioMix) {
    this.mix = mix
    if (!this.ctx || !this.ambient || !this.rain) return
    const now = this.ctx.currentTime
    const a = mix.ambientOn ? mix.master * mix.ambientVol * 0.2 : 0
    const r = mix.rainOn ? mix.master * mix.rainVol * 0.26 : 0
    this.ambient.gain.cancelScheduledValues(now)
    this.ambient.gain.linearRampToValueAtTime(a, now + 0.3)
    this.rain.gain.cancelScheduledValues(now)
    this.rain.gain.linearRampToValueAtTime(r, now + 0.3)

    // Pause the recording when rain is off so it isn't decoded for nothing;
    // resume it (looping) when re-enabled.
    if (this.rainEl) {
      if (mix.rainOn && this.rainEl.paused) void this.rainEl.play().catch(() => {})
      else if (!mix.rainOn && !this.rainEl.paused) this.rainEl.pause()
    }
  }

  /** A soft two-note bell for Pomodoro transitions. */
  chime() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const now = ctx.currentTime
    const vol = this.mix.master * 0.5
    ;[880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.value = 0
      o.connect(g).connect(master)
      const t = now + i * 0.18
      g.gain.linearRampToValueAtTime(vol, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.start(t)
      o.stop(t + 1)
    })
  }
}

let engine: AmbientEngine | null = null
export function getAmbient(): AmbientEngine {
  if (!engine) engine = new AmbientEngine()
  return engine
}
