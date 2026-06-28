/**
 * Interior train ambience — a looping relaxation-soundscape MP3 that fades in
 * when you board and out on arrival.  Mounted inside <TrainRide/> so it lives
 * only while the carriage is visible.  Uses its own AudioContext (separate from
 * the train synth and the Library rain engine) and reads the shared _muted flag
 * from train/audio.ts so the HUD mute button silences everything at once.
 *
 * Also generates a low-frequency rumble (wheel-on-rail vibration) that plays
 * alongside the MP3 to add physical weight to the journey.
 */
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTrain } from '../../store/train'
import { isMuted, brakeSqueal } from './audio'

const SRC = '/audio/train-interior.mp3'
const FADE_IN = 2.5   // seconds
const FADE_OUT = 1.5  // seconds
const TARGET_VOL = 0.65

// Rumble: a deep 55 Hz sine + 38 Hz sine + slow amplitude modulation to
// simulate wheel-on-rail vibration.  Much quieter than the MP3 — just enough
// to feel present when you turn up the volume.
const RUMBLE_FREQ_1 = 55
const RUMBLE_FREQ_2 = 38
const RUMBLE_MOD_FREQ = 0.15   // slow wobble
const RUMBLE_TARGET_VOL = 0.09 // subtle — sits under the MP3

export function TrainInteriorAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const elRef = useRef<HTMLAudioElement | null>(null)
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null)
  const fading = useRef<'in' | 'out' | 'idle'>('idle')
  const startTime = useRef(0)
  const phase = useTrain((s) => s.phase)

  // Rumble node refs
  const rumbleGainRef = useRef<GainNode | null>(null)
  const rumbleOsc1Ref = useRef<OscillatorNode | null>(null)
  const rumbleOsc2Ref = useRef<OscillatorNode | null>(null)
  const rumbleModRef = useRef<OscillatorNode | null>(null)
  const rumbleModGainRef = useRef<GainNode | null>(null)
  const prevPhase = useRef(phase)

  // ── bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    ctxRef.current = ctx

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)
    gainRef.current = gain

    const el = new Audio(SRC)
    el.loop = true
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    elRef.current = el

    const src = ctx.createMediaElementSource(el)
    src.connect(gain)
    srcRef.current = src

    // ── Rumble: two detuned low sine oscillators + amplitude modulation ──
    const rumbleGain = ctx.createGain()
    rumbleGain.gain.value = 0
    rumbleGain.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.value = RUMBLE_FREQ_1
    osc1.connect(rumbleGain)
    osc1.start()

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = RUMBLE_FREQ_2
    osc2.connect(rumbleGain)
    osc2.start()

    // slow amplitude modulator — makes the rumble wobble like real wheels
    const mod = ctx.createOscillator()
    mod.type = 'sine'
    mod.frequency.value = RUMBLE_MOD_FREQ
    const modGain = ctx.createGain()
    modGain.gain.value = RUMBLE_TARGET_VOL * 0.4 // modulation depth
    mod.connect(modGain)
    modGain.connect(rumbleGain.gain)
    mod.start()

    rumbleGainRef.current = rumbleGain
    rumbleOsc1Ref.current = osc1
    rumbleOsc2Ref.current = osc2
    rumbleModRef.current = mod
    rumbleModGainRef.current = modGain

    // kick off — autoplay is safe here because TrainRide only mounts after a
    // user gesture (boarding → traveling transition)
    void ctx.resume()
    void el.play().catch(() => {})

    // start the fade-in
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(TARGET_VOL, now + FADE_IN)
    fading.current = 'in'
    startTime.current = now

    return () => {
      // clean up on unmount (arrival → station swap)
      try {
        const c = ctxRef.current
        const g = gainRef.current
        const e = elRef.current
        if (c && g && e) {
          const t = c.currentTime
          g.gain.cancelScheduledValues(t)
          g.gain.setValueAtTime(g.gain.value, t)
          g.gain.linearRampToValueAtTime(0, t + FADE_OUT)
          // let the fade-out play then stop
          setTimeout(() => {
            e.pause()
            e.src = ''
            g.disconnect()
            srcRef.current?.disconnect()
          }, FADE_OUT * 1000 + 50)
        }
        // tear down rumble
        try {
          rumbleOsc1Ref.current?.stop()
          rumbleOsc2Ref.current?.stop()
          rumbleModRef.current?.stop()
          rumbleGainRef.current?.disconnect()
        } catch { /* already stopped */ }
        ctxRef.current = null
        gainRef.current = null
        elRef.current = null
        srcRef.current = null
        rumbleGainRef.current = null
        rumbleOsc1Ref.current = null
        rumbleOsc2Ref.current = null
        rumbleModRef.current = null
        rumbleModGainRef.current = null
      } catch { /* swallow */ }
    }
  }, [])

  // ── per-frame: mute sync + arrival fade-out ────────────────────────────────
  useFrame(() => {
    const ctx = ctxRef.current
    const gain = gainRef.current
    if (!ctx || !gain) return

    const muted = isMuted()
    const arrived = phase === 'arrived'

    // Play brake screech on arrival transition
    if (arrived && prevPhase.current !== 'arrived') {
      brakeSqueal()
    }
    prevPhase.current = phase

    const target = muted || arrived ? 0 : TARGET_VOL

    // smooth ramp toward target (cheap: only schedule if meaningfully different)
    const cur = gain.gain.value
    if (Math.abs(cur - target) > 0.005) {
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(cur, now)
      const rampTime = arrived ? FADE_OUT : muted ? 0.3 : FADE_IN * 0.4
      gain.gain.linearRampToValueAtTime(target, now + rampTime)
    }

    // ── rumble: follows same mute/arrive logic, separate gain ──
    const rg = rumbleGainRef.current
    if (rg) {
      const rTarget = muted || arrived ? 0 : RUMBLE_TARGET_VOL
      const rCur = rg.gain.value
      if (Math.abs(rCur - rTarget) > 0.003) {
        const now = ctx.currentTime
        rg.gain.cancelScheduledValues(now)
        rg.gain.setValueAtTime(rCur, now)
        const rRamp = arrived ? FADE_OUT : muted ? 0.3 : FADE_IN * 0.5
        rg.gain.linearRampToValueAtTime(rTarget, now + rRamp)
      }
    }
  })

  return null // non-visual
}
