// TrainRumble — continuous train rumble using user's MP3 files.
// Plays train-rumble.mp3 through a low-pass filter, modulated by speed.
// No procedural synthesis — only the user's actual audio files.

import { getAudioManager } from './AudioManager'
import type { AudioPreset } from './AudioPresets'
import { isMuted } from '../audio'

interface RumbleState {
  audioEl: HTMLAudioElement | null
  mediaSrc: MediaElementAudioSourceNode | null
  gain: GainNode | null
  filter: BiquadFilterNode | null
  currentVol: number
  targetVol: number
}

let _state: RumbleState | null = null

/** Initialise the rumble engine — call once when train interior mounts */
export function initRumble(preset: AudioPreset): void {
  if (_state) destroyRumble()

  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput('rumble')

  const audioEl = new Audio(preset.brake) // train-rumble.mp3
  audioEl.loop = true
  audioEl.crossOrigin = 'anonymous'
  audioEl.preload = 'auto'

  const mediaSrc = ctx.createMediaElementSource(audioEl)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = preset.rumbleLowpass
  filter.Q.value = 0.7

  const gain = ctx.createGain()
  gain.gain.value = 0

  mediaSrc.connect(filter)
  filter.connect(gain)
  gain.connect(layerInput)

  _state = { audioEl, mediaSrc, gain, filter, currentVol: 0, targetVol: 0 }

  void audioEl.play().catch(() => {})
}

/** Update rumble based on train phase and speed */
export function updateRumble(phase: string, preset: AudioPreset, inTunnel: boolean, dt: number): void {
  if (!_state) return

  const muted = isMuted()

  let speedMul = 0
  if (muted) {
    speedMul = 0
  } else if (inTunnel) {
    speedMul = preset.speedMod.tunnel
  } else {
    switch (phase) {
      case 'traveling': speedMul = preset.speedMod.cruising; break
      case 'boarding': speedMul = preset.speedMod.departing; break
      case 'arriving': speedMul = preset.speedMod.arriving; break
      default: speedMul = preset.speedMod.stopped; break
    }
  }

  _state.targetVol = preset.rumble * speedMul

  const diff = _state.targetVol - _state.currentVol
  if (Math.abs(diff) > 0.001) {
    _state.currentVol += diff * Math.min(1, dt * 2)
  } else {
    _state.currentVol = _state.targetVol
  }

  if (_state.gain) {
    _state.gain.gain.value = _state.currentVol
  }

  // Update filter: faster = brighter
  if (_state.filter) {
    const targetFreq = preset.rumbleLowpass + speedMul * 80
    _state.filter.frequency.value += (targetFreq - _state.filter.frequency.value) * Math.min(1, dt)
  }
}

/** Destroy and clean up */
export function destroyRumble(): void {
  if (!_state) return
  try {
    _state.mediaSrc?.disconnect()
    _state.gain?.disconnect()
    _state.filter?.disconnect()
    _state.audioEl?.pause()
    if (_state.audioEl) _state.audioEl.src = ''
  } catch {}
  _state = null
}
