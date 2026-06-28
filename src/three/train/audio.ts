/**
 * Tiny Web-Audio synth for all train/station sounds. No asset files.
 * Autoplay-safe: ctx stays suspended until first user gesture (click/key),
 * then we resume. Calls fail silently if no ctx / muted.
 */

let _ctx: AudioContext | null = null
let _muted = false

export function getAudioCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return _ctx
}

export function ensureAudioCtx(): AudioContext {
  const ctx = getAudioCtx()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m: boolean) { _muted = m }
export function isMuted() { return _muted }

function env(ctx: AudioContext, dur: number): GainNode {
  const g = ctx.createGain()
  const now = ctx.currentTime
  g.gain.setValueAtTime(0, now)
  g.gain.linearRampToValueAtTime(1, now + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, now + dur)
  return g
}

/** Low triangle + slow vibrato — distant train horn */
export function horn() {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime
    const dur = 2.2
    const o = ctx.createOscillator()
    const g = env(ctx, dur)
    o.type = 'triangle'
    o.frequency.setValueAtTime(180, now)
    o.frequency.exponentialRampToValueAtTime(140, now + dur * 0.6)
    const vib = ctx.createOscillator()
    vib.type = 'sine'
    vib.frequency.value = 0.8
    const vibGain = ctx.createGain()
    vibGain.gain.value = 8
    vib.connect(vibGain).connect(o.frequency)
    o.connect(g).connect(ctx.destination)
    vib.start(now)
    o.start(now)
    o.stop(now + dur)
    vib.stop(now + dur)
  } catch { /* autoplay / ctx fail = silent */ }
}

/** Band-passed noise sweep — brake squeal */
export function brakeSqueal() {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime
    const dur = 1.1
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(2200, now)
    bp.frequency.exponentialRampToValueAtTime(1200, now + dur)
    bp.Q.value = 12
    const g = env(ctx, dur)
    src.connect(bp).connect(g).connect(ctx.destination)
    src.start(now)
    src.stop(now + dur)
  } catch {}
}

/** Low-passed noise burst — steam hiss */
export function steamHiss() {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime
    const dur = 0.9
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3))
    const src = ctx.createBufferSource()
    src.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1800
    const g = env(ctx, dur)
    g.gain.value = 0.4
    src.connect(lp).connect(g).connect(ctx.destination)
    src.start(now)
    src.stop(now + dur)
  } catch {}
}

/** Two-tone chime — door open/close */
export function doorChime(closing = false) {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime
    const [f1, f2] = closing ? [660, 520] : [520, 660]
    const play = (f: number, delay: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0, now + delay)
      g.gain.linearRampToValueAtTime(0.35, now + delay + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.9)
      o.connect(g).connect(ctx.destination)
      o.start(now + delay)
      o.stop(now + delay + 1)
    }
    play(f1, 0)
    play(f2, 0.12)
  } catch {}
}

/** Short click — station clock tick */
export function clockTick() {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = 800
    g.gain.setValueAtTime(0.15, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    o.connect(g).connect(ctx.destination)
    o.start(now)
    o.stop(now + 0.1)
  } catch {}
}

// ── footstep: pre-allocated noise buffer + per-call filter shaping ─────────
// A short, warm "tok" on stone — lowpassed noise with a fast-attack /
// medium-decay envelope, plus slight randomised pitch/volume for natural feel.

const STEP_DUR = 0.12          // seconds — short enough not to smear between steps
const STEP_GAIN = 0.14         // base volume
const _stepBuf = { v: null as AudioBuffer | null }

function getStepBuf(ctx: AudioContext): AudioBuffer {
  if (_stepBuf.v) return _stepBuf.v
  const len = Math.ceil(ctx.sampleRate * STEP_DUR)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  _stepBuf.v = buf
  return buf
}

export function footstep() {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime

    const src = ctx.createBufferSource()
    src.buffer = getStepBuf(ctx)

    // lowpass gives the warm "tok" — cutoff jitters ±60 Hz for variety
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520 + (Math.random() * 120 - 60)  // 460–580 Hz
    lp.Q.value = 1.2

    const g = ctx.createGain()
    // fast attack → medium decay envelope (like a shoe on stone)
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(STEP_GAIN * (0.8 + Math.random() * 0.4), now + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, now + STEP_DUR)

    src.connect(lp).connect(g).connect(ctx.destination)
    src.start(now)
    src.stop(now + STEP_DUR)
  } catch {}
}

/** StationPlayerController writes its movement speed here; StationAudio reads it for footsteps. */
export const stationSpeedRef = { current: 0 }