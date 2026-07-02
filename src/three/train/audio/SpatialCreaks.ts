// @ts-nocheck
// SpatialCreaks — interior creak sounds using user's audio files.
// Plays train-exterior.mp3 at low volume with bandpass filtering to create
// ambient interior character. No procedural synthesis.

import { getAudioManager } from './AudioManager'
import type { AudioPreset } from './AudioPresets'
import { isMuted } from '../audio'

interface CreakState {
  audioEl: HTMLAudioElement | null
  mediaSrc: MediaElementAudioSourceNode | null
  gain: GainNode | null
  panner: PannerNode | null
  active: boolean
}

let _state: CreakState | null = null

/** Initialise the creak system — plays ambient train-exterior as interior texture */
export function initCreaks(): void {
  if (_state) destroyCreaks()

  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput('creaks')

  // Use train-exterior.mp3 as ambient interior creak/texture layer
  const audioEl = new Audio('/audio/train-exterior.mp3')
  audioEl.loop = true
  audioEl.crossOrigin = 'anonymous'
  audioEl.preload = 'auto'

  const mediaSrc = ctx.createMediaElementSource(audioEl)

  // Bandpass filter for interior character
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 400
  filter.Q.value = 1.5

  const gain = ctx.createGain()
  gain.gain.value = 0

  // Spatial panner — positioned at left wall
  const panner = ctx.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'inverse'
  panner.refDistance = 2
  panner.maxDistance = 20
  panner.rolloffFactor = 1.0
  panner.positionX.value = -2.5
  panner.positionY.value = 1.5
  panner.positionZ.value = 0

  mediaSrc.connect(filter)
  filter.connect(gain)
  gain.connect(panner)
  panner.connect(layerInput)

  _state = { audioEl, mediaSrc, gain, panner, active: true }

  void audioEl.play().catch(() => {})
}

/** Update creak volume based on phase */
export function updateCreaks(phase: string, preset: AudioPreset, dt: number, _carriageLen: number): void {
  if (!_state || !_state.active) return

  const muted = isMuted()
  const traveling = phase === 'traveling'
  const targetVol = muted || !traveling ? 0 : preset.creaks

  if (_state.gain) {
    const cur = _state.gain.gain.value
    if (Math.abs(cur - targetVol) > 0.002) {
      const ctx = getAudioManager().getContext()
      const now = ctx.currentTime
      _state.gain.gain.cancelScheduledValues(now)
      _state.gain.gain.setValueAtTime(cur, now)
      _state.gain.gain.linearRampToValueAtTime(targetVol, now + 0.5)
    }
  }
}

/** Destroy creak system */
export function destroyCreaks(): void {
  if (!_state) return
  try {
    _state.audioEl?.pause()
    if (_state.audioEl) _state.audioEl.src = ''
    _state.mediaSrc?.disconnect()
    _state.gain?.disconnect()
    _state.panner?.disconnect()
  } catch {}
  _state = null
}
