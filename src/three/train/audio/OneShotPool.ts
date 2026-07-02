// OneShotPool — plays user's actual audio files for one-shot sounds.
// Loads and caches the user's MP3/MP4 files, plays them through spatial panners.
// No procedural synthesis — only the user's provided audio files.

import { getAudioManager } from './AudioManager'
import type { AudioPreset } from './AudioPresets'
import { isMuted } from '../audio'

interface OneShotEntry {
  audioEl: HTMLAudioElement
  panner: PannerNode | null
  gain: GainNode
}

const MAX_ONESHOT_CONCURRENT = 2
const MAX_UI_CONCURRENT = 2

let _oneshotActive: OneShotEntry[] = []
let _uiActive: OneShotEntry[] = []

// Cache loaded audio buffers
const _bufferCache = new Map<string, HTMLAudioElement>()

function getOrCreateAudio(file: string): HTMLAudioElement {
  if (_bufferCache.has(file)) {
    // Clone the cached element for concurrent playback
    const cached = _bufferCache.get(file)!
    const el = document.createElement('audio')
    el.src = cached.src
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    return el
  }
  const el = new Audio(file)
  el.crossOrigin = 'anonymous'
  el.preload = 'auto'
  _bufferCache.set(file, el)
  return el
}

/** Initialise one-shot pools */
export function initOneShots(): void {
  _oneshotActive = []
  _uiActive = []
}

/** Play a one-shot sound from user's file at a spatial position */
function playFile(
  file: string,
  volume: number,
  spatialX: number,
  spatialY: number,
  spatialZ: number,
  pool: 'oneshot' | 'ui' = 'oneshot',
): void {
  if (isMuted() || !file) return

  const mgr = getAudioManager()
  const ctx = mgr.getContext()
  const layerInput = mgr.getLayerInput(pool)
  const activeList = pool === 'ui' ? _uiActive : _oneshotActive
  const maxConcurrent = pool === 'ui' ? MAX_UI_CONCURRENT : MAX_ONESHOT_CONCURRENT

  // Clean up finished entries
  const now = ctx.currentTime
  const alive: OneShotEntry[] = []
  for (const e of activeList) {
    if (!e.audioEl.ended && !e.audioEl.paused) {
      alive.push(e)
    } else {
      try { e.gain.disconnect() } catch {}
      try { e.panner?.disconnect() } catch {}
    }
  }
  activeList.length = 0
  activeList.push(...alive)

  // Check concurrency limit
  if (activeList.length >= maxConcurrent) return

  const audioEl = getOrCreateAudio(file)

  // Create MediaElementSource (must be fresh per playback)
  let mediaSrc: MediaElementAudioSourceNode
  try {
    mediaSrc = ctx.createMediaElementSource(audioEl)
  } catch {
    // Element already connected — clone it
    const newEl = document.createElement('audio')
    newEl.src = audioEl.src
    newEl.crossOrigin = 'anonymous'
    newEl.preload = 'auto'
    mediaSrc = ctx.createMediaElementSource(newEl)
  }

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.01)
  gain.gain.linearRampToValueAtTime(volume, now + 0.3)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2)

  let lastNode: AudioNode = mediaSrc

  if (pool === 'oneshot') {
    const panner = ctx.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 30
    panner.rolloffFactor = 1.5
    panner.positionX.value = spatialX
    panner.positionY.value = spatialY
    panner.positionZ.value = spatialZ

    lastNode.connect(panner)
    panner.connect(gain)
    gain.connect(layerInput)

    activeList.push({ audioEl, panner, gain })
  } else {
    lastNode.connect(gain)
    gain.connect(layerInput)
    activeList.push({ audioEl, panner: null, gain })
  }

  audioEl.currentTime = 0
  void audioEl.play().catch(() => {})

  // Auto-disconnect after playback
  audioEl.onended = () => {
    try { gain.disconnect() } catch {}
    try { (activeList.find(e => e.audioEl === audioEl) as any)?.panner?.disconnect() } catch {}
  }
}

/** Play door open/close sound */
export function playDoorSound(closing: boolean, preset: AudioPreset): void {
  const file = closing ? preset.doorClose : preset.doorOpen
  playFile(file, preset.oneshot * 0.6, 0, 1.0, -10, 'oneshot')
}

/** Play brake screech */
export function playBrakeScreech(preset: AudioPreset): void {
  playFile(preset.brake, preset.oneshot * 0.5, 0, 0.5, -12, 'oneshot')
}

/** Play distant whistle */
export function playWhistle(preset: AudioPreset): void {
  playFile(preset.whistle, preset.oneshot * 0.3, 0, 2, 20, 'oneshot')
}

/** Play UI click */
export function playUIClick(): void {
  playFile('/audio/seat-click.mp3', 0.15, 0, 0, 0, 'ui')
}

/** Play UI notification */
export function playUINotification(): void {
  playFile('/audio/ui-notification.mp3', 0.2, 0, 0, 0, 'ui')
}

/** Play a generic one-shot by file path */
export function playOneShot(
  file: string,
  volume: number,
  x: number,
  y: number,
  z: number,
  pool: 'oneshot' | 'ui' = 'oneshot',
): void {
  playFile(file, volume, x, y, z, pool)
}

/** Destroy one-shot pools */
export function destroyOneShots(): void {
  for (const e of _oneshotActive) {
    try { e.audioEl.pause() } catch {}
    try { e.gain.disconnect() } catch {}
    try { e.panner?.disconnect() } catch {}
  }
  for (const e of _uiActive) {
    try { e.audioEl.pause() } catch {}
    try { e.gain.disconnect() } catch {}
  }
  _oneshotActive = []
  _uiActive = []
}
