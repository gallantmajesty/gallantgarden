// Lava Pad Player Controller — polished jump-based movement with weight and feel

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Vector3, Raycaster, Vector2 } from 'three'
import { useLavaPadStore, type PlatformRuntime } from './store'
import { ARENA_CONFIG, GAME_CONFIG } from './arena'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'

const _raycaster = new Raycaster()
const _mouse = new Vector2()
const _tmpVec = new Vector3()

/** Parabolic arc with gravity feel — separate horizontal/vertical curves */
function calculateJumpPosition(
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  progress: number,
  maxHeight: number,
): { x: number; y: number; z: number } {
  const t = progress
  const invT = 1 - t
  // Horizontal: ease in-out for smooth traverse
  const hT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  const midX = (start.x + end.x) / 2
  const midZ = (start.z + end.z) / 2
  const x = invT * invT * start.x + 2 * invT * hT * midX + hT * hT * end.x
  const z = invT * invT * start.z + 2 * invT * hT * midZ + hT * hT * end.z
  // Vertical: gravity parabola — fast up, slow at apex, fast down
  const yT = t < 0.5 ? Math.sqrt(t / 0.5) * 0.5 : 1 - Math.pow((t - 0.5) / 0.5, 2) * 0.5
  const peakY = Math.max(start.y, end.y) + maxHeight
  const y = (1 - yT) * (1 - yT) * start.y + 2 * (1 - yT) * yT * peakY + yT * yT * end.y
  return { x, y, z }
}

function getPlayerPosition(
  playerState: { platformId: string | null; jumpProgress: number; targetPlatformId: string | null },
  platformsRuntime: PlatformRuntime[],
): { x: number; y: number; z: number } | null {
  if (!playerState.platformId) return null
  const platform = platformsRuntime.find(p => p.id === playerState.platformId)
  if (!platform) return null

  if (playerState.targetPlatformId && playerState.jumpProgress > 0) {
    const target = platformsRuntime.find(p => p.id === playerState.targetPlatformId)
    if (target) {
      const arc = calculateJumpPosition(
        { x: platform.x, y: platform.y + 1, z: platform.z },
        { x: target.x, y: target.y + 1, z: target.z },
        Math.min(playerState.jumpProgress, 1),
        GAME_CONFIG.player.jumpHeight,
      )
      return arc
    }
  }
  return { x: platform.x, y: platform.y + 1, z: platform.z }
}

export function LavaPadPlayerController() {
  const groupRef = useRef<Group>(null)
  const avatarConfig = useAvatar((s) => s.config)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const localPlayerId = useLavaPadStore((s) => s.localPlayerId)
  const localPlayer = useLavaPadStore((s) => localPlayerId ? s.players[localPlayerId] : null)
  const phase = useLavaPadStore((s) => s.phase)
  const tick = useLavaPadStore((s) => s.tick)
  const updatePlayer = useLavaPadStore((s) => s.updatePlayer)
  const setHoveredPlatform = useLavaPadStore((s) => s.setHoveredPlatform)
  const platformsRuntime = useLavaPadStore((s) => s.platforms)
  const jumpState = useLavaPadStore((s) => s.jumpState)
  const setJumpState = useLavaPadStore((s) => s.setJumpState)

  const lookingAt = useRef<string | null>(null)
  const jumpCooldown = useRef(0)
  const anticipationTimer = useRef(0)
  const landingTimer = useRef(0)
  const avatarScale = useRef(new Vector3(1, 1, 1))
  const avatarRotation = useRef(0)
  const targetRotation = useRef(0)
  const _hitPoint = useRef(new Vector3())
  const _hitNormal = useRef(new Vector3())
  const _toPlatform = useRef(new Vector3())

  function tryJump() {
    if (phase !== 'playing' || !localPlayer || localPlayer.eliminated || localPlayer.jumpProgress > 0) return
    if (jumpCooldown.current > 0) return
    if (!lookingAt.current) return

    const targetPlatform = platformsRuntime.find(p => p.id === lookingAt.current)
    if (!targetPlatform) return

    const current = platformsRuntime.find(p => p.id === localPlayer.platformId)
    if (!current) return

    const conns = ARENA_CONFIG.platforms.find(p => p.id === localPlayer.platformId)?.connectedTo ?? []
    if (!conns.includes(targetPlatform.id)) return

    const dx = targetPlatform.x - current.x
    const dz = targetPlatform.z - current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > GAME_CONFIG.player.maxJumpDistance) return

    setJumpState('anticipating')
    anticipationTimer.current = GAME_CONFIG.player.anticipationDuration
  }

  useEffect(() => {
    const el = gl.domElement
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); tryJump() }
    }
    const onPointerDown = (e: MouseEvent) => { if (e.button === 0) tryJump() }
    const onPointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    return () => {
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
    }
  }, [])

  function executeJump(targetId: string) {
    if (!localPlayer) return
    setJumpState('jumping')
    updatePlayer(localPlayer.id, {
      targetPlatformId: targetId,
      jumpProgress: 0.001,
      jumpStartTime: Date.now(),
    })
  }

  function completeJump() {
    if (!localPlayer || !localPlayer.targetPlatformId) return
    updatePlayer(localPlayer.id, {
      platformId: localPlayer.targetPlatformId,
      targetPlatformId: null,
      jumpProgress: 0,
    })
    setJumpState('landing')
    landingTimer.current = GAME_CONFIG.player.landingDuration
  }

  useFrame((_, dt) => {
    tick(dt)
    jumpCooldown.current = Math.max(0, jumpCooldown.current - dt)
    const time = Date.now() * 0.001

    if (!localPlayer || !localPlayerId) return
    const player = useLavaPadStore.getState().players[localPlayerId]
    if (!player) return

    const g = groupRef.current
    const targetId = player.targetPlatformId
    const currentPlatform = platformsRuntime.find(p => p.id === player.platformId)
    const targetPlatform = targetId ? platformsRuntime.find(p => p.id === targetId) : null

    // --- ANTICIPATION PHASE ---
    if (jumpState === 'anticipating') {
      anticipationTimer.current -= dt
      const progress = 1 - (anticipationTimer.current / GAME_CONFIG.player.anticipationDuration)
      // Deep crouch: scale Y down, widen X/Z, slight forward tilt
      const squash = Math.max(0.5, 1 - Math.sin(progress * Math.PI) * 0.35)
      avatarScale.current.set(1.3 - squash * 0.3, squash, 1.3 - squash * 0.3)
      // Face target during anticipation
      if (targetPlatform && currentPlatform) {
        targetRotation.current = Math.atan2(targetPlatform.x - currentPlatform.x, targetPlatform.z - currentPlatform.z)
      }
      if (anticipationTimer.current <= 0) {
        if (lookingAt.current) executeJump(lookingAt.current)
        else setJumpState('idle')
      }
      loco.current.grounded = true
      loco.current.speed = 0
      loco.current.vy = 0
    }

    // --- LANDING PHASE ---
    if (jumpState === 'landing') {
      landingTimer.current -= dt
      const progress = 1 - (landingTimer.current / GAME_CONFIG.player.landingDuration)
      // Impact squash then bounce back to normal
      let squash: number
      if (progress < 0.3) {
        // Deep squash on impact
        const p = progress / 0.3
        squash = 1 + Math.sin(p * Math.PI) * 0.2
        avatarScale.current.set(1 + squash * 0.3, 2 - squash, 1 + squash * 0.3)
      } else {
        // Quick bounce recovery
        const p = (progress - 0.3) / 0.7
        const recover = 1 + Math.sin(p * Math.PI) * 0.08
        avatarScale.current.set(recover, 1 / recover, recover)
      }
      if (landingTimer.current <= 0) {
        setJumpState('idle')
        avatarScale.current.set(1, 1, 1)
      }
      loco.current.grounded = true
      loco.current.speed = 0
      loco.current.vy = -1 // Falling pose after landing
    }

    // --- JUMPING PHASE ---
    if (player.targetPlatformId && player.jumpProgress > 0 && player.jumpProgress < 1) {
      const elapsed = (Date.now() - player.jumpStartTime) / 1000
      const progress = Math.min(elapsed / player.jumpDuration, 1)
      updatePlayer(player.id, { jumpProgress: progress })
      // Stretch during jump (elongate vertically)
      const stretch = 1 + Math.sin(progress * Math.PI) * 0.1
      avatarScale.current.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch))
      // Air tilt toward target
      if (g && targetPlatform && currentPlatform) {
        const targetAngle = Math.atan2(targetPlatform.x - currentPlatform.x, targetPlatform.z - currentPlatform.z)
        const currentAngle = avatarRotation.current
        let angleDiff = targetAngle - currentAngle
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        avatarRotation.current += angleDiff * 0.1
      }
      // vy for avatar animation
      loco.current.grounded = false
      loco.current.speed = 0.5
      loco.current.vy = progress < 0.5 ? 1 : -1
    }

    // --- IDLE PHASE ---
    if (jumpState === 'idle') {
      const bob = Math.sin(time * 1.5 + (player.platformId?.charCodeAt(0) ?? 0)) * 0.008
      avatarScale.current.set(1 + bob, 1 - bob * 2, 1 + bob)
      loco.current.grounded = true
      loco.current.speed = 0
      loco.current.vy = 0
    }

    // Update jump progress state machine
    if (player.targetPlatformId && player.jumpProgress >= 1) {
      completeJump()
    }

    const pos = getPlayerPosition(player, platformsRuntime)
    if (!pos) return

    if (g) {
      g.position.set(pos.x, pos.y, pos.z)
      g.scale.copy(avatarScale.current)
      g.rotation.y = avatarRotation.current
    }

    // Rotate toward hover target when idle
    if (jumpState === 'idle' && lookingAt.current) {
      const hoverPlat = platformsRuntime.find(p => p.id === lookingAt.current)
      if (hoverPlat && currentPlatform) {
        targetRotation.current = Math.atan2(hoverPlat.x - currentPlatform.x, hoverPlat.z - currentPlatform.z)
      }
      // Smooth rotation toward target
      const currentRot = avatarRotation.current
      let diff = targetRotation.current - currentRot
      if (diff > Math.PI) diff -= Math.PI * 2
      if (diff < -Math.PI) diff += Math.PI * 2
      avatarRotation.current += diff * Math.min(dt * 8, 1)
    }

    // Elimination check
    const lavaY = useLavaPadStore.getState().lavaY
    if (lavaY !== undefined && !player.eliminated && player.jumpProgress <= 0) {
      const platform = platformsRuntime.find(p => p.id === player.platformId)
      if (platform && (platform.y + 1) <= lavaY + 0.5) {
        const state = useLavaPadStore.getState()
        updatePlayer(player.id, { eliminated: true, spectating: true, eliminationTime: state.timeElapsed ?? 0 })
      }
    }
  })

  // Raycasting for platform targeting
  useFrame(() => {
    const el = gl.domElement
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return

    _raycaster.setFromCamera(_mouse, camera)
    let closestId: string | null = null
    let closestDist = Infinity
    const hp = _hitPoint.current
    const hn = _hitNormal.current

    for (const platform of platformsRuntime) {
      if (platform.special?.cracked?.broken) continue
      const center = _tmpVec.set(platform.x, platform.y, platform.z)
      hn.set(0, 1, 0)
      hp.set(platform.x, platform.y + platform.height / 2, platform.z)
      const denom = _raycaster.ray.direction.dot(hn)
      if (Math.abs(denom) < 0.0001) continue
      const t = hp.sub(_raycaster.ray.origin).dot(hn) / denom
      if (t < 0) continue
      const hit = _toPlatform.current.copy(_raycaster.ray.direction).multiplyScalar(t).add(_raycaster.ray.origin)
      const dx = hit.x - center.x
      const dz = hit.z - center.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist <= platform.radius && t < closestDist) {
        closestDist = t
        closestId = platform.id
      }
    }

    if (closestId !== lookingAt.current) {
      lookingAt.current = closestId
      setHoveredPlatform(closestId)
    }
  })

  return (
    <group ref={groupRef}>
      <CharacterAvatar config={avatarConfig} locomotion={loco} />
    </group>
  )
}