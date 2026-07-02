// AudioManager — master audio mixer for the train interior.
// Manages a single shared AudioContext with layered buses:
//   Layer 1: Train Rumble (low-pass filtered, speed-modulated)
//   Layer 2: Interior Creaks (random, spatially positioned)
//   Layer 3: Exterior Sounds (wind, birds, rain — window-dependent)
//   Layer 4: Ambient Music (route-specific, subtle)
//   Layer 5: One-Shots (door, whistle, brakes)
//   Layer 6: UI Sounds (seat click, timer tick, chat)
//
// All audio uses Web Audio API. Distance attenuation is applied via
// PannerNode for spatial sounds and gain ramps for non-spatial layers.

import { isMuted } from '../audio'

export type AudioLayer = 'rumble' | 'creaks' | 'exterior' | 'music' | 'oneshot' | 'ui'

interface LayerBus {
  gain: GainNode
  panner?: PannerNode
  lowpass?: BiquadFilterNode
}

const MAX_CHANNELS = 12

class AudioManagerImpl {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private layers = new Map<AudioLayer, LayerBus>()
  private _initialized = false

  // Spatial listener position (updated per frame from camera)
  listenerX = 0
  listenerY = 1.6
  listenerZ = 0

  get initialized() { return this._initialized }

  /** Create or resume the shared AudioContext */
  init(): AudioContext {
    if (this.ctx && this._initialized) return this.ctx
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AC()

    // Master gain → destination
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.8
    this.master.connect(this.ctx.destination)

    // Create layer buses
    this.createLayer('rumble', { lowpass: 200 })
    this.createLayer('creaks', { spatial: true })
    this.createLayer('exterior', { spatial: true })
    this.createLayer('music', {})
    this.createLayer('oneshot', { spatial: true })
    this.createLayer('ui', {})

    this._initialized = true
    void this.ctx.resume()
    return this.ctx
  }

  private createLayer(name: AudioLayer, opts: { lowpass?: number; spatial?: boolean }) {
    if (!this.ctx || !this.master) return

    const gain = this.ctx.createGain()
    gain.gain.value = 1.0

    let lastNode: AudioNode = gain

    if (opts.lowpass) {
      const lp = this.ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = opts.lowpass
      lp.Q.value = 0.7
      lastNode.connect(lp)
      lastNode = lp
      this.layers.set(name, { gain, lowpass: lp })
    } else if (opts.spatial) {
      const panner = this.ctx.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 1
      panner.maxDistance = 30
      panner.rolloffFactor = 1.5
      panner.coneInnerAngle = 360
      panner.coneOuterAngle = 0
      panner.coneOuterGain = 0
      lastNode.connect(panner)
      lastNode = panner
      this.layers.set(name, { gain, panner })
    } else {
      this.layers.set(name, { gain })
    }

    lastNode.connect(this.master!)
  }

  /** Get the AudioContext (initializes if needed) */
  getContext(): AudioContext {
    return this.init()
  }

  /** Get a layer's input node — connect new sources here */
  getLayerInput(name: AudioLayer): AudioNode {
    if (!this._initialized) this.init()
    const bus = this.layers.get(name)
    if (!bus) throw new Error(`Audio layer "${name}" not found`)
    return bus.gain
  }

  /** Set layer volume (0..1) */
  setLayerVolume(name: AudioLayer, vol: number) {
    const bus = this.layers.get(name)
    if (!bus || !this.ctx) return
    const now = this.ctx.currentTime
    bus.gain.gain.cancelScheduledValues(now)
    bus.gain.gain.setValueAtTime(bus.gain.gain.value, now)
    bus.gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, vol)), now + 0.1)
  }

  /** Get layer volume */
  getLayerVolume(name: AudioLayer): number {
    return this.layers.get(name)?.gain.gain.value ?? 0
  }

  /** Update lowpass filter frequency for a layer */
  setLayerFilter(name: AudioLayer, freq: number) {
    const bus = this.layers.get(name)
    if (!bus?.lowpass || !this.ctx) return
    const now = this.ctx.currentTime
    bus.lowpass.frequency.cancelScheduledValues(now)
    bus.lowpass.frequency.setValueAtTime(bus.lowpass.frequency.value, now)
    bus.lowpass.frequency.linearRampToValueAtTime(freq, now + 0.1)
  }

  /** Update spatial position for a layer's panner */
  setLayerPosition(name: AudioLayer, x: number, y: number, z: number) {
    const bus = this.layers.get(name)
    if (!bus?.panner) return
    bus.panner.positionX.value = x
    bus.panner.positionY.value = y
    bus.panner.positionZ.value = z
  }

  /** Update the listener position (call per frame from camera) */
  updateListener(x: number, y: number, z: number) {
    this.listenerX = x
    this.listenerY = y
    this.listenerZ = z
    if (this.ctx) {
      this.ctx.listener.positionX.value = x
      this.ctx.listener.positionY.value = y
      this.ctx.listener.positionZ.value = z
      // Listener faces forward (+Z)
      this.ctx.listener.forwardX.value = 0
      this.ctx.listener.forwardY.value = 0
      this.ctx.listener.forwardZ.value = -1
      this.ctx.listener.upX.value = 0
      this.ctx.listener.upY.value = 1
      this.listenerZ = z
    }
  }

  /** Compute distance attenuation factor (0..1) for a source at given position */
  distanceAttenuation(srcX: number, srcY: number, srcZ: number, maxDist = 30): number {
    const dx = srcX - this.listenerX
    const dy = srcY - this.listenerY
    const dz = srcZ - this.listenerZ
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist < 0.5) return 1.0
    // Inverse distance model with smooth rolloff
    const ref = 1
    return Math.min(1, ref / (ref + Math.max(0, dist - ref) * 1.5))
  }

  /** Set master volume */
  setMasterVolume(vol: number) {
    if (!this.master || !this.ctx) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, vol)), now + 0.05)
  }

  /** Mute/unmute everything */
  setMuted(m: boolean) {
    this.setMasterVolume(m ? 0 : 0.8)
  }

  /** Clean up all nodes and context */
  destroy() {
    for (const [, bus] of this.layers) {
      try { bus.gain.disconnect() } catch {}
      try { bus.panner?.disconnect() } catch {}
      try { bus.lowpass?.disconnect() } catch {}
    }
    this.layers.clear()
    try { this.master?.disconnect() } catch {}
    this.ctx?.close()
    this.ctx = null
    this.master = null
    this._initialized = false
  }
}

// Singleton
let _instance: AudioManagerImpl | null = null

export function getAudioManager(): AudioManagerImpl {
  if (!_instance) _instance = new AudioManagerImpl()
  return _instance
}
