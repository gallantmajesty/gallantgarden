// @ts-nocheck
// ExteriorAmbience — window-dependent outside sounds (wind, birds, rain).
// Cross-fades between ambient audio files based on route and window proximity.
// Spatial panners position sounds at the window locations.

import { getAudioManager } from './AudioManager'
import type { AudioPreset } from './AudioPresets'
import { isMuted } from '../audio'

interface AmbienceChannel {
  audioEl: HTMLAudioElement | null
  mediaSrc: MediaElementAudioSourceNode | null
  gain: GainNode | null
  panner: PannerNode | null
  active: boolean
  file: string
}

interface AmbienceState {
  channels: AmbienceChannel[]
  currentFiles: string[]
}

let _state: AmbienceState | null = null

/** Initialise exterior ambience — pre-creates up to 2 channels */
export function initExterior(preset: AudioPreset): void {
  if (_state) destroyExterior()

  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput('exterior')

  const channels: AmbienceChannel[] = []

  for (let i = 0; i < 2; i++) {
    const file = preset.exteriorFiles[i] ?? preset.exteriorFiles[0]
    if (!file) continue

    const audioEl = new Audio(file)
    audioEl.loop = true
    audioEl.crossOrigin = 'anonymous'
    audioEl.preload = 'auto'

    const mediaSrc = ctx.createMediaElementSource(audioEl)

    const gain = ctx.createGain()
    gain.gain.value = 0

    const panner = ctx.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 2
    panner.maxDistance = 25
    panner.rolloffFactor = 1.0
    panner.coneInnerAngle = 180
    panner.coneOuterAngle = 360
    panner.coneOuterGain = 0.3

    // Position at window: left channel = left wall, right channel = right wall
    const side = i === 0 ? -1 : 1
    panner.positionX.value = side * 2.8
    panner.positionY.value = 1.35
    panner.positionZ.value = 0

    mediaSrc.connect(gain)
    gain.connect(panner)
    panner.connect(layerInput)

    channels.push({
      audioEl,
      mediaSrc,
      gain,
      panner,
      active: false,
      file,
    })
  }

  _state = { channels, currentFiles: [] }

  // Start playback
  for (const ch of channels) {
    void ch.audioEl?.play().catch(() => {})
  }
}

/** Update ambience — cross-fade based on route, fade for mute/phase */
export function updateExterior(
  phase: string,
  preset: AudioPreset,
  dt: number,
): void {
  if (!_state) return

  const muted = isMuted()
  const traveling = phase === 'traveling'
  const targetVol = muted || !traveling ? 0 : 1

  for (let i = 0; i < _state.channels.length; i++) {
    const ch = _state.channels[i]
    if (!ch.gain) continue

    // Cross-fade file if route changed
    const targetFile = preset.exteriorFiles[i] ?? preset.exteriorFiles[0]
    if (targetFile && ch.file !== targetFile) {
      crossfadeFile(ch, targetFile, preset, i)
    }

    // Volume ramp
    const baseVol = preset.exterior * (i === 0 ? 1.0 : 0.7)
    const vol = targetVol * baseVol
    const cur = ch.gain.gain.value
    if (Math.abs(cur - vol) > 0.002) {
      const ctx = getAudioManager().getContext()
      const now = ctx.currentTime
      ch.gain.gain.cancelScheduledValues(now)
      ch.gain.gain.setValueAtTime(cur, now)
      ch.gain.gain.linearRampToValueAtTime(vol, now + 0.5)
    }
  }
}

/** Cross-fade to a new audio file */
function crossfadeFile(
  ch: AmbienceChannel,
  newFile: string,
  preset: AudioPreset,
  index: number,
): void {
  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput('exterior')

  // Fade out old
  if (ch.gain) {
    const now = ctx.currentTime
    ch.gain.gain.cancelScheduledValues(now)
    ch.gain.gain.setValueAtTime(ch.gain.gain.value, now)
    ch.gain.gain.linearRampToValueAtTime(0, now + 1)
  }

  // Create new source after fade
  setTimeout(() => {
    try {
      ch.audioEl?.pause()
      ch.mediaSrc?.disconnect()

      const newEl = new Audio(newFile)
      newEl.loop = true
      newEl.crossOrigin = 'anonymous'
      newEl.preload = 'auto'

      const newSrc = ctx.createMediaElementSource(newEl)
      newSrc.connect(ch.gain!)

      ch.audioEl = newEl
      ch.mediaSrc = newSrc
      ch.file = newFile

      void newEl.play().catch(() => {})
    } catch {}
  }, 1100)
}

/** Destroy exterior ambience */
export function destroyExterior(): void {
  if (!_state) return
  for (const ch of _state.channels) {
    try {
      ch.audioEl?.pause()
      if (ch.audioEl) ch.audioEl.src = ''
      ch.mediaSrc?.disconnect()
      ch.gain?.disconnect()
      ch.panner?.disconnect()
    } catch {}
  }
  _state = null
}
