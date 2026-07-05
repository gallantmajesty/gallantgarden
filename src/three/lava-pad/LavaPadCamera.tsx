// Lava Pad Camera — smooth follow, screen shake, elimination effects, dynamic framing

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Vector3, MathUtils, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { useScenePreset } from '../../store/quality'
import { GAME_CONFIG } from './arena'
import { useLavaPadStore } from './store'

const _target = new Vector3()
const _shakeOffset = new Vector3()
const _camPos = new Vector3()
const _lookTarget = new Vector3()

export function LavaPadCamera() {
  const camRef = useRef<PerspectiveCameraImpl>(null)
  const far = useScenePreset().far
  const smoothPos = useRef(new Vector3(0, 10, 15))
  const currentZoom = useRef(GAME_CONFIG.camera.distance)
  const tiltAngle = useRef(0)
  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const phase = useLavaPadStore((s) => s.phase)
  const players = useLavaPadStore((s) => s.players)
  const platformsRuntime = useLavaPadStore((s) => s.platforms)
  const jumpState = useLavaPadStore((s) => s.jumpState)

  const { stiffness, distance, height, jumpZoomFactor, tiltAmount } = GAME_CONFIG.camera
  const spectatorTargetIndex = useLavaPadStore((s) => s.spectatorTargetIndex)

  // Shake state
  const shakeIntensity = useRef(0)
  const shakeDuration = useRef(0)
  const shakeTime = useRef(0)

  // Track player elimination for shake trigger
  const prevEliminated = useRef(false)
  const prevJumpState = useRef('idle')

  // Screen shake helper - call from other components by importing or use a ref
  // For simplicity, we'll detect shake triggers here
  useFrame((_, dt) => {
    const dtClamped = Math.min(dt, 0.05)
    const cam = camRef.current
    if (!cam) return

    // --- Shake trigger detection ---
    if (localPlayerId && players[localPlayerId]) {
      const player = players[localPlayerId]
      
      // Trigger shake on elimination
      if (player.eliminated && !prevEliminated.current) {
        shakeIntensity.current = 0.5
        shakeDuration.current = 0.8
        shakeTime.current = 0
      }
      prevEliminated.current = player.eliminated

      // Trigger small shake on landing
      if (jumpState === 'landing' && prevJumpState.current === 'jumping') {
        shakeIntensity.current = 0.15
        shakeDuration.current = 0.3
        shakeTime.current = 0
      }
      prevJumpState.current = jumpState
    }

    // --- Shake decay ---
    if (shakeDuration.current > 0) {
      shakeTime.current += dtClamped
      const progress = shakeTime.current / shakeDuration.current
      if (progress >= 1) {
        shakeDuration.current = 0
        shakeIntensity.current = 0
        _shakeOffset.set(0, 0, 0)
      } else {
        const decay = 1 - progress
        const freq = 20
        _shakeOffset.set(
          Math.sin(shakeTime.current * freq) * shakeIntensity.current * decay * 2,
          Math.cos(shakeTime.current * freq * 0.7) * shakeIntensity.current * decay * 2,
          Math.sin(shakeTime.current * freq * 1.3) * shakeIntensity.current * decay * 1,
        )
      }
    }

    // --- Camera follow logic ---
    let targetPlatform = null
    let followPlayerId = localPlayerId

    // Spectator: follow current spectate target or cycle survivors
    if (phase === 'finished' || (localPlayerId && players[localPlayerId]?.eliminated)) {
      const alive = Object.values(players).filter(p => !p.eliminated)
      if (alive.length > 0) {
        const idx = spectatorTargetIndex % alive.length
        followPlayerId = alive[idx].id
      } else {
        followPlayerId = null
      }
    }

    if (followPlayerId && players[followPlayerId]) {
      const player = players[followPlayerId]
      targetPlatform = platformsRuntime.find(p => p.id === player.platformId)
    }

    // Dynamic zoom during jumps
    const isJumping = jumpState === 'jumping' || jumpState === 'anticipating'
    const targetZoom = isJumping ? distance * jumpZoomFactor : distance
    currentZoom.current = MathUtils.lerp(currentZoom.current, targetZoom, 1 - Math.exp(-8 * dtClamped))

    // Camera tilt during jumps
    if (isJumping) {
      tiltAngle.current = MathUtils.lerp(tiltAngle.current, tiltAmount, 1 - Math.exp(-6 * dtClamped))
    } else {
      tiltAngle.current = MathUtils.lerp(tiltAngle.current, 0, 1 - Math.exp(-4 * dtClamped))
    }

    if (targetPlatform) {
      _lookTarget.set(targetPlatform.x, targetPlatform.y + 0.5, targetPlatform.z)
      const angle = 0.4 + tiltAngle.current
      const zoom = currentZoom.current
      _camPos.set(
        targetPlatform.x + Math.sin(angle) * zoom,
        targetPlatform.y + height + Math.sin(tiltAngle.current) * 2,
        targetPlatform.z + Math.cos(angle) * zoom,
      )
    } else {
      // Orbit arena center when no target
      const time = Date.now() * 0.0002
      _camPos.set(Math.sin(time) * distance * 1.5, height + 5, Math.cos(time) * distance * 1.5)
      _lookTarget.set(0, 0, 0)
    }

    // Add shake offset
    _camPos.add(_shakeOffset)

    // Smooth spring-damper interpolation
    const k = 1 - Math.exp(-stiffness * dtClamped)
    smoothPos.current.x = MathUtils.lerp(smoothPos.current.x, _camPos.x, k)
    smoothPos.current.y = MathUtils.lerp(smoothPos.current.y, _camPos.y, k)
    smoothPos.current.z = MathUtils.lerp(smoothPos.current.z, _camPos.z, k)

    cam.position.copy(smoothPos.current)
    _target.lerp(_lookTarget, 1 - Math.exp(-15 * dtClamped))
    cam.lookAt(_target)
  })

  return (
    <PerspectiveCamera ref={camRef} makeDefault fov={68} near={0.1} far={far} />
  )
}