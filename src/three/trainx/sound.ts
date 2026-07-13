// Tiny WebAudio helper for TrainX. No assets — pure oscillators / noise.
// HP × Modern fusion: magical chimes layered with clean modern tones.
// Lazily creates a single shared AudioContext.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AC) ctx = new AC()
  }
  return ctx
}

function tone(freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = getCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  o.connect(g)
  g.connect(c.destination)
  const t = c.currentTime + start
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function toneGlide(f0: number, f1: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = getCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  const t = c.currentTime + start
  o.frequency.setValueAtTime(f0, t)
  o.frequency.linearRampToValueAtTime(f1, t + dur)
  o.connect(g)
  g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noiseBurst(start: number, dur: number, gain: number, freq = 1000, q = 1) {
  const c = getCtx()
  if (!c) return
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = q
  const g = c.createGain()
  const t = c.currentTime + start
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(c.destination)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function owlHoot(start: number) {
  // soft two-note owl hoot with a little vibrato glide
  toneGlide(420, 330, start, 0.22, 0.05, 'sine')
  toneGlide(400, 310, start + 0.28, 0.22, 0.045, 'sine')
}

/** soft glissando shimmer used by the magical whistle */
function gTone(freq: number, start: number, dur: number) {
  const c = getCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  o.frequency.linearRampToValueAtTime(freq * 1.5, c.currentTime + start + dur)
  o.connect(g)
  g.connect(c.destination)
  const t = c.currentTime + start
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.06, t + 0.1)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export type ChimeKind =
  | 'open'
  | 'close'
  | 'depart'
  | 'whistle'
  | 'tap'
  | 'confirm'
  | 'reward'
  | 'owl'
  | 'arrive'
  | 'bell'

export function playChime(kind: ChimeKind) {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  if (kind === 'open') {
    tone(880, 0, 0.5, 0.18, 'sine')
    tone(1320, 0.12, 0.5, 0.14, 'sine')
  } else if (kind === 'close') {
    tone(660, 0, 0.4, 0.16, 'sine')
    tone(440, 0.12, 0.4, 0.14, 'sine')
  } else if (kind === 'whistle') {
    // magical whistle: rising + falling airy chord (not a regular horn)
    tone(660, 0, 1.4, 0.12, 'sine')
    tone(990, 0.05, 1.3, 0.1, 'sine')
    tone(1320, 0.1, 1.2, 0.08, 'triangle')
    tone(880, 0.6, 0.9, 0.1, 'sine')
    gTone(523, 0, 1.6)
  } else if (kind === 'tap') {
    // UI click: modern tick + tiny magical sparkle
    tone(1200, 0, 0.05, 0.12, 'square')
    tone(1568, 0.02, 0.08, 0.06, 'sine')
  } else if (kind === 'confirm') {
    // booking confirm: magical arpeggio + clean modern two-note ding
    tone(659, 0, 0.4, 0.12, 'triangle')
    tone(988, 0.1, 0.4, 0.1, 'triangle')
    tone(1318, 0.2, 0.5, 0.08, 'triangle')
    toneGlide(880, 660, 0.25, 0.3, 0.08, 'sine')
  } else if (kind === 'reward') {
    // reward banked: potion-bubble blip (magical)
    toneGlide(523, 1046, 0, 0.28, 0.12, 'sine')
    tone(1200, 0.18, 0.12, 0.08, 'sine')
  } else if (kind === 'owl') {
    owlHoot(0)
  } else if (kind === 'arrive') {
    // arrival: steam hiss + modern brake
    noiseBurst(0, 1.1, 0.12, 1800, 0.7)
    toneGlide(300, 120, 0.1, 0.9, 0.1, 'sawtooth')
    tone(523, 0.4, 0.5, 0.1, 'sine')
    tone(784, 0.55, 0.6, 0.09, 'sine')
  } else if (kind === 'bell') {
    // house-elf service bell: bright magical ring
    tone(1568, 0, 0.9, 0.12, 'sine')
    tone(2093, 0.02, 0.7, 0.07, 'sine')
    tone(2637, 0.04, 0.5, 0.04, 'triangle')
  } else {
    // depart
    tone(523, 0, 0.6, 0.16, 'triangle')
    tone(784, 0.15, 0.6, 0.14, 'triangle')
    tone(1046, 0.3, 0.7, 0.12, 'triangle')
  }
}

// ---- Ambient bed: owl hoots + train hum + magical wind (loops while riding) ----
let ambient: { stop: () => void } | null = null

export function startAmbient() {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  if (ambient) return
  // low train hum
  const hum = c.createOscillator()
  hum.type = 'sine'
  hum.frequency.value = 55
  const humG = c.createGain()
  humG.gain.value = 0.05
  const humLp = c.createBiquadFilter()
  humLp.type = 'lowpass'
  humLp.frequency.value = 200
  hum.connect(humLp)
  humLp.connect(humG)
  humG.connect(c.destination)
  hum.start()
  // magical wind (looping filtered noise)
  const len = Math.floor(c.sampleRate * 2)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5
  const wind = c.createBufferSource()
  wind.buffer = buf
  wind.loop = true
  const windBp = c.createBiquadFilter()
  windBp.type = 'bandpass'
  windBp.frequency.value = 500
  windBp.Q.value = 0.6
  const windG = c.createGain()
  windG.gain.value = 0.04
  wind.connect(windBp)
  windBp.connect(windG)
  windG.connect(c.destination)
  wind.start()
  // distant owl hoots every ~14-22s
  const id = window.setInterval(() => owlHoot(0), 14000 + Math.random() * 8000)
  ambient = {
    stop() {
      try {
        hum.stop()
      } catch {
        /* already stopped */
      }
      try {
        wind.stop()
      } catch {
        /* already stopped */
      }
      window.clearInterval(id)
      ambient = null
    },
  }
}

export function stopAmbient() {
  if (ambient) {
    ambient.stop()
    ambient = null
  }
}
