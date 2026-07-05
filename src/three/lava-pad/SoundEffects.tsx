// Lava Pad Sound Effects — procedural audio via Web Audio API

import { useEffect, useRef } from 'react'
import { useLavaPadStore } from './store'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType, gain = 0.15, rampDown = true) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gainNode.gain.setValueAtTime(gain, ctx.currentTime)
    if (rampDown) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    }
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

function playNoise(duration: number, gain = 0.08) {
  try {
    const ctx = getCtx()
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(gain, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start()
  } catch {}
}

function playJumpSound() {
  playTone(220, 0.1, 'sine', 0.12, true)
  setTimeout(() => playTone(440, 0.08, 'sine', 0.08, true), 50)
}

function playLandSound() {
  playNoise(0.1, 0.15)
  playTone(80, 0.15, 'sine', 0.2, true)
}

function playLavaRumble(intensity: number) {
  if (intensity > 0.2) {
    playNoise(0.3, 0.04 * intensity)
  }
}

function playEliminationSound() {
  playTone(300, 0.15, 'sawtooth', 0.2, true)
  setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.15, true), 100)
  setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.1, true), 200)
}

function playCountdownSound(n: number) {
  if (n <= 1) {
    playTone(880, 0.3, 'sine', 0.2, true)
  } else {
    playTone(440, 0.15, 'sine', 0.12, true)
  }
}

export function SoundEffects() {
  const phase = useLavaPadStore((s) => s.phase)
  const countdown = useLavaPadStore((s) => s.countdown)
  const jumpState = useLavaPadStore((s) => s.jumpState)
  const lavaY = useLavaPadStore((s) => s.lavaY)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const players = useLavaPadStore((s) => s.players)
  const localPlayer = localPlayerId ? players[localPlayerId] : null

  const prevJumpState = useRef('idle')
  const prevLavaY = useRef(lavaY)

  // Jump sounds
  useEffect(() => {
    if (jumpState === 'jumping' && prevJumpState.current !== 'jumping') {
      playJumpSound()
    }
    if (jumpState === 'landing' && prevJumpState.current !== 'landing') {
      playLandSound()
    }
    prevJumpState.current = jumpState
  }, [jumpState])

  // Lava proximity rumble
  useEffect(() => {
    if (phase !== 'playing') return
    const prevY = prevLavaY.current
    const diff = Math.abs(lavaY - prevY)
    if (diff > 0.01) {
      const intensity = Math.min(1, Math.max(0, (lavaY - (-5)) / 15))
      if (intensity > 0.1) {
        playLavaRumble(intensity)
      }
    }
    prevLavaY.current = lavaY
  }, [lavaY, phase])

  // Countdown sounds
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      playCountdownSound(countdown)
    }
  }, [countdown, phase])

  // Elimination sound
  useEffect(() => {
    if (localPlayer?.eliminated) {
      playEliminationSound()
    }
  }, [localPlayer?.eliminated])

  return null
}