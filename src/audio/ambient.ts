// Procedural ambient soundscape — no audio files. Three buses (ambient pad, rain
// hiss, and a master) so the settings panel can mix them independently, plus a
// short bell for Pomodoro notifications. A real audio-file player could replace
// the synth behind this same interface later.

function seededNoise(length: number, seed: number): Float32Array {
  let s = seed >>> 0
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    out[i] = (s / 0xffffffff) * 2 - 1
  }
  return out
}

export interface AudioMix {
  master: number
  ambientVol: number
  rainVol: number
  ambientOn: boolean
  rainOn: boolean
}

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: GainNode | null = null
  private rain: GainNode | null = null
  private mix: AudioMix = { master: 0.8, ambientVol: 0.6, rainVol: 0.7, ambientOn: false, rainOn: true }

  get running() {
    return !!this.ctx
  }

  /** Build the graph (must be called from a user gesture). Safe to call again. */
  ensure() {
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

    // ambient pad bus
    const ambient = ctx.createGain()
    ambient.gain.value = 0
    ambient.connect(master)
    this.ambient = ambient

    const padLP = ctx.createBiquadFilter()
    padLP.type = 'lowpass'
    padLP.frequency.value = 600
    padLP.connect(ambient)
    for (const f of [110, 110 * 1.5, 220 * 1.005]) {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f
      osc.connect(padLP)
      osc.start()
    }
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.06
    const lfoDepth = ctx.createGain()
    lfoDepth.gain.value = 0.3
    lfo.connect(lfoDepth).connect(padLP.gain)
    lfo.start()

    // rain bus
    const rain = ctx.createGain()
    rain.gain.value = 0
    rain.connect(master)
    this.rain = rain

    const noiseLen = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
    buf.getChannelData(0).set(seededNoise(noiseLen, 0x5eed))
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 380
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1100
    src.connect(hp).connect(lp).connect(rain)
    src.start()

    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.4)
    this.apply(this.mix)
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
  }

  /** A soft two-note bell for Pomodoro transitions. */
  chime() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const now = ctx.currentTime
    ;[880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.value = 0
      o.connect(g).connect(master)
      const t = now + i * 0.18
      g.gain.linearRampToValueAtTime(0.18 * this.mix.master, t + 0.02)
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
