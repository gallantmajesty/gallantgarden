// InteriorAudio — Phase 5 audio system for the train interior.
// Uses the AudioManager for layered audio with the user's actual audio files.
// All sounds come from /public/audio/ — no procedural synthesis.

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTrain } from '../../../store/train'
import { CARRIAGE } from '../interior'
import {
  getAudioManager,
  getAudioPreset,
  initRumble,
  updateRumble,
  destroyRumble,
  initCreaks,
  updateCreaks,
  destroyCreaks,
  initExterior,
  updateExterior,
  destroyExterior,
  initMusic,
  updateMusic,
  destroyMusic,
  initOneShots,
  destroyOneShots,
  playDoorSound,
  playBrakeScreech,
  playWhistle,
} from '../audio'
import type { LineId } from '../../../lib/train/lines'

export function InteriorAudio() {
  const phase = useTrain((s) => s.phase)
  const lineId = useTrain((s) => s.lineId) as LineId | undefined
  const { camera } = useThree()
  const prevPhase = useRef(phase)
  const whistleTimer = useRef(0)
  const initialized = useRef(false)

  // Bootstrap all audio layers on mount
  useEffect(() => {
    if (initialized.current) return

    const preset = getAudioPreset(lineId ?? 'express')
    const mgr = getAudioManager()
    mgr.init()

    initRumble(preset)
    initCreaks()
    initExterior(preset)
    initMusic(preset)
    initOneShots()

    initialized.current = true

    return () => {
      destroyRumble()
      destroyCreaks()
      destroyExterior()
      destroyMusic()
      destroyOneShots()
      initialized.current = false
    }
  }, [lineId])

  // Per-frame: update listener + all layers
  useFrame((_, dt) => {
    if (!initialized.current) return

    const mgr = getAudioManager()
    const preset = getAudioPreset(lineId ?? 'express')

    // Update listener from camera
    mgr.updateListener(camera.position.x, camera.position.y, camera.position.z)

    // Update each layer
    updateRumble(phase, preset, false, dt)
    updateCreaks(phase, preset, dt, CARRIAGE.z1 - CARRIAGE.z0)
    updateExterior(phase, preset, dt)
    updateMusic(phase, preset, dt)

    // Phase-transition triggers
    if (phase !== prevPhase.current) {
      if (phase === 'boarding' && prevPhase.current !== 'boarding') {
        playDoorSound(false, preset)
      }
      if (phase === 'traveling' && prevPhase.current === 'boarding') {
        playDoorSound(true, preset)
      }
      if (phase === 'arriving' && prevPhase.current !== 'arriving') {
        playBrakeScreech(preset)
      }
      prevPhase.current = phase
    }

    // Periodic whistle
    if (phase === 'traveling') {
      whistleTimer.current += dt
      if (whistleTimer.current > 120) {
        playWhistle(preset)
        whistleTimer.current = 0
      }
    } else {
      whistleTimer.current = 0
    }
  })

  return null
}