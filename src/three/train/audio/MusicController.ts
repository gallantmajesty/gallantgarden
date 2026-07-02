// @ts-nocheck
// MusicController — route-specific ambient music with fade in/out.
// Plays a single looping MP3 per route at very subtle volume (study ambience).
// Cross-fades between routes at tunnel transitions. Fade in over 3s on departure,
// fade out over 5s on arrival.

import { getAudioManager } from './AudioManager'
import type { AudioPreset } from './AudioPresets'
import { isMuted } from '../audio'

interface MusicState {
  audioEl: HTMLAudioElement | null
  mediaSrc: MediaElementAudioSourceNode | null
  gain: GainNode | null
  filter: BiquadFilterNode | null
  currentFile: string
  currentVol: number
  targetVol: number
  fadingIn: boolean
  fadingOut: boolean
}

let _state: MusicState | null = null

const FADE_IN = 3.0   // seconds
const FADE_OUT = 5.0   // seconds

/** Initialise music controller */
export function initMusic(preset: AudioPreset): void {
  if (_state) destroyMusic()

  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput('music')

  const audioEl = new Audio(preset.musicFile)
  audioEl.loop = true
  audioEl.crossOrigin = 'anonymous'
  audioEl.preload = 'auto'

  const mediaSrc = ctx.createMediaElementSource(audioEl)

  // Lowpass for ambient feel — keeps music subtle
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 800
  filter.Q.value = 0.5

  const gain = ctx.createGain()
  gain.gain.value = 0

  mediaSrc.connect(filter)
  filter.connect(gain)
  gain.connect(layerInput)

  _state = {
    audioEl,
    mediaSrc,
    gain,
    filter,
    currentFile: preset.musicFile,
    currentVol: 0,
    targetVol: 0,
    fadingIn: false,
    fadingOut: false,
  }

  void audioEl.play().catch(() => {})
}

/** Update music based on phase — handles fade in/out and route changes */
export function updateMusic(
  phase: string,
  preset: AudioPreset,
  dt: number,
): void {
  if (!_state) return

  const ctx = getAudioManager().getContext()
  const muted = isMuted()
  const traveling = phase === 'traveling'
  const boarding = phase === 'boarding'

  // Determine target volume
  if (muted) {
    _state.targetVol = 0
  } else if (traveling) {
    _state.targetVol = preset.music
  } else if (boarding) {
    // Fade in when boarding
    _state.targetVol = preset.music * 0.3
  } else {
    _state.targetVol = 0
  }

  // Smooth volume ramp
  const diff = _state.targetVol - _state.currentVol
  if (Math.abs(diff) > 0.001) {
    const speed = _state.targetVol > _state.currentVol ? 1 / FADE_IN : 1 / FADE_OUT
    _state.currentVol += diff * Math.min(1, dt * speed)
  } else {
    _state.currentVol = _state.targetVol
  }

  if (_state.gain) {
    _state.gain.gain.value = _state.currentVol
  }

  // Cross-fade file if route changed
  if (_state.currentFile !== preset.musicFile) {
    crossfadeMusicFile(preset)
  }
}

/** Cross-fade to a new music file */
function crossfadeMusicFile(preset: AudioPreset): void {
  if (!_state) return
  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput('music')

  // Fade out old
  if (_state.gain) {
    const now = ctx.currentTime
    _state.gain.gain.cancelScheduledValues(now)
    _state.gain.gain.setValueAtTime(_state.gain.gain.value, now)
    _state.gain.gain.linearRampToValueAtTime(0, now + FADE_OUT)
  }

  setTimeout(() => {
    try {
      _state?.audioEl?.pause()
      _state?.mediaSrc?.disconnect()

      const newEl = new Audio(preset.musicFile)
      newEl.loop = true
      newEl.crossOrigin = 'anonymous'
      newEl.preload = 'auto'

      const newSrc = ctx.createMediaElementSource(newEl)
      newSrc.connect(_state!.filter!)

      _state!.audioEl = newEl
      _state!.mediaSrc = newSrc
      _state!.currentFile = preset.musicFile

      void newEl.play().catch(() => {})

      // Fade in
      const now2 = ctx.currentTime
      _state!.gain?.gain.cancelScheduledValues(now2)
      _state!.gain?.gain.setValueAtTime(0, now2)
      _state!.gain?.gain.linearRampToValueAtTime(preset.music, now2 + FADE_IN)
    } catch {}
  }, (FADE_OUT + 0.2) * 1000)
}

/** Destroy music controller */
export function destroyMusic(): void {
  if (!_state) return
  try {
    _state.audioEl?.pause()
    if (_state.audioEl) _state.audioEl.src = ''
    _state.mediaSrc?.disconnect()
    _state.gain?.disconnect()
    _state.filter?.disconnect()
  } catch {}
  _state = null
}
