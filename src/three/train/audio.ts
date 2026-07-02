/**
 * Shared audio state for train/station. Only provides mute flag and
 * simple file-based playback helpers. All sounds use the user's actual
 * audio files — zero procedural synthesis.
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

/** Play a user's audio file with optional filter. Used for station sounds. */
function playFile(file: string, volume: number, filter?: { type: BiquadFilterType; freq: number; q?: number }) {
  if (_muted) return
  try {
    const ctx = ensureAudioCtx()
    const now = ctx.currentTime

    const el = new Audio(file)
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    const src = ctx.createMediaElementSource(el)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2)

    let lastNode: AudioNode = src
    if (filter) {
      const bp = ctx.createBiquadFilter()
      bp.type = filter.type
      bp.frequency.value = filter.freq
      bp.Q.value = filter.q ?? 1
      src.connect(bp)
      lastNode = bp
    }
    lastNode.connect(gain)
    gain.connect(ctx.destination)

    el.play().catch(() => {})
    setTimeout(() => {
      try { el.pause(); gain.disconnect(); src.disconnect() } catch {}
    }, 2500)
  } catch {}
}

/** Train horn — distant approach sound */
export function horn() {
  playFile('/audio/train-exterior.mp3', 0.4, { type: 'lowpass', freq: 400, q: 0.7 })
}

/** Brake squeal — train stopping */
export function brakeSqueal() {
  playFile('/audio/train-rumble.mp3', 0.5, { type: 'bandpass', freq: 1200, q: 4 })
}

/** Steam hiss — doors releasing */
export function steamHiss() {
  playFile('/audio/wind-exterior.mp3', 0.3, { type: 'lowpass', freq: 800, q: 0.7 })
}

/** Door chime — open or close */
export function doorChime(closing = false) {
  const file = closing ? '/audio/door-close.mp3' : '/audio/door-open.mp3'
  playFile(file, 0.5)
}

/** Clock tick — once per second */
export function clockTick() {
  playFile('/audio/seat-click.mp3', 0.1)
}

/** Footstep on stone */
export function footstep() {
  playFile('/audio/seat-click.mp3', 0.12, { type: 'lowpass', freq: 500, q: 1 })
}

/** Flip-click on departure board */
export function flipClick() {
  playFile('/audio/seat-click.mp3', 0.06)
}

/** StationPlayerController writes its movement speed here; StationAudio reads it for footsteps. */
export const stationSpeedRef = { current: 0 }