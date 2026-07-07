// @ts-nocheck
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera, Vector3 } from 'three'
import { HALL } from './layout'
import { buildCollision, rayHit } from './colliders'
import { seatAnchors } from './furniture'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'
import { setLocalState } from '../../multiplayer/net'
import { useSeatFlow } from '../../store/seatFlow'
import { EmoteLabel } from './EmoteLabel'

const SEAT_EYE = 1.74
const CHAIR_SEAT_Y = 0.45
const CAMERA_DISTANCE = 4.0

// Simple camera presets - just basic angles, no complex collision detection
const CAMERA_PRESETS = [
  { angle: 0.5, height: -0.1 },    // Right side
  { angle: -0.5, height: -0.1 },   // Left side  
  { angle: -Math.PI, height: -0.05 }, // Front (looking at table)
  { angle: 0, height: 0.1 }         // Behind
]

export function PlayerController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const far = useScenePreset().far
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const avatarConfig = useAvatar((s) => s.config)
  const collision = useMemo(() => buildCollision(), [])
  const seats = useMemo(() => seatAnchors(), [])

  useEffect(() => {
    const savedId = useSeatFlow.getState().selectedSeatId
    if (savedId != null && seats[savedId] && useWorld.getState().seat == null) {
      useWorld.getState().sit(savedId)
    }
  }, [seats])

  // Camera state
  const camPos = useRef(new Vector3())
  const camTarget = useRef(new Vector3())
  const targetYaw = useRef(0)
  const targetPitch = useRef(0)

  const p = useRef({
    x: getInitialPos(seats)[0],
    y: getInitialPos(seats)[1],
    z: getInitialPos(seats)[2],
    vx: 0,
    vz: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    grounded: true,
    faceYaw: Math.PI,
    bob: 0,
    camDist: CAMERA_DISTANCE,
    zoom: CAMERA_DISTANCE,
    eye: 1.62,
    nearSeat: null as number | null,
    seatedInit: false,
  })

  const wasSeated = useRef(false)

  // Handle keyboard input for camera presets (1-4)
  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (useWorld.getState().seat == null) return
      const key = e.key
      if (key >= '1' && key <= '4') {
        const preset = parseInt(key) - 1
        useSettings.getState().set('cameraPreset', preset + 1)
      }
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [])

  // Mouse controls
  useEffect(() => {
    const el = gl.domElement
    const drag = { on: false, lastX: 0, lastY: 0 }
    
    const down = (e: MouseEvent) => {
      if (e.button === 2 || (e.button === 0 && useWorld.getState().seat != null)) {
        drag.on = true
        drag.lastX = e.clientX
        drag.lastY = e.clientY
        e.preventDefault()
      }
    }
    
    const up = () => { drag.on = false }
    const move = (e: MouseEvent) => {
      if (!drag.on) return
      const dx = e.clientX - drag.lastX
      const dy = e.clientY - drag.lastY
      drag.lastX = e.clientX
      drag.lastY = e.clientY
      
      const seatId = useWorld.getState().seat
      if (seatId != null && useSettings.getState().cameraPreset === 0) {
        const seat = seats[seatId]
        if (seat) {
          targetYaw.current += dx * 0.01
          targetPitch.current += dy * 0.01
          targetPitch.current = MathUtils.clamp(targetPitch.current, -0.5, 0.5)
        }
      }
    }

    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      p.current.zoom = MathUtils.clamp(p.current.zoom + Math.sign(e.deltaY) * 0.3, 2.0, 8.0)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl, seats])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const cam = camRef.current
    if (!cam) return
    
    const s = useSettings.getState()
    const st = p.current
    const seatId = useWorld.getState().seat

    // Handle standing/walking
    if (seatId == null) {
      // Standing movement logic would go here
      // For now, just reset camera preset when standing
      if (wasSeated.current) {
        useSettings.getState().set('cameraPreset', 0)
      }
      wasSeated.current = false
      return
    }

    wasSeated.current = true

    const seat = seats[seatId]
    if (!seat) return

    const avYaw = seat.yaw + Math.PI
    const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE

    // Initialize seated state
    if (!st.seatedInit) {
      st.seatedInit = true
      st.yaw = seat.yaw
      st.pitch = -0.1
      st.zoom = CAMERA_DISTANCE
      targetYaw.current = seat.yaw
      targetPitch.current = -0.1
    }

    // Update avatar position
    if (avatarRef.current) {
      avatarRef.current.position.set(seat.pos[0], seat.pos[1] + CHAIR_SEAT_Y, seat.pos[2])
      avatarRef.current.rotation.y = avYaw
    }

    // First person mode
    if (s.cameraMode === 'first') {
      if (avatarRef.current) avatarRef.current.visible = false
      cam.position.set(seat.pos[0], eyeY, seat.pos[2])
      cam.rotation.set(0, avYaw, 0)
      setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
      return
    }

    if (avatarRef.current) avatarRef.current.visible = true

    // Camera preset mode
    const preset = s.cameraPreset
    if (preset >= 1 && preset <= 4) {
      const presetData = CAMERA_PRESETS[preset - 1]
      targetYaw.current = seat.yaw + presetData.angle
      targetPitch.current = presetData.height
      
      // Simple camera positioning - no complex collision detection
      const cp = Math.cos(targetPitch.current)
      const idealX = seat.pos[0] + Math.sin(targetYaw.current) * cp * CAMERA_DISTANCE
      const idealY = eyeY + Math.sin(targetPitch.current) * CAMERA_DISTANCE
      const idealZ = seat.pos[2] + Math.cos(targetYaw.current) * cp * CAMERA_DISTANCE

      // Smooth camera movement
      camPos.current.x += (idealX - camPos.current.x) * 0.1
      camPos.current.y += (idealY - camPos.current.y) * 0.1
      camPos.current.z += (idealZ - camPos.current.z) * 0.1

      cam.position.copy(camPos.current)
      camTarget.current.set(seat.pos[0], eyeY - 0.2, seat.pos[2])
      cam.lookAt(camTarget.current)

      setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
      return
    }

    // Free orbit mode (preset 0)
    targetYaw.current = MathUtils.lerp(targetYaw.current, seat.yaw, 0.1)
    targetPitch.current = MathUtils.clamp(targetPitch.current, -0.5, 0.5)
    
    const dist = MathUtils.clamp(p.current.zoom, 2.0, 8.0)
    const cp = Math.cos(targetPitch.current)
    const idealX = seat.pos[0] + Math.sin(targetYaw.current) * cp * dist
    const idealY = eyeY + Math.sin(targetPitch.current) * dist
    const idealZ = seat.pos[2] + Math.cos(targetYaw.current) * cp * dist

    camPos.current.x += (idealX - camPos.current.x) * 0.1
    camPos.current.y += (idealY - camPos.current.y) * 0.1
    camPos.current.z += (idealZ - camPos.current.z) * 0.1

    cam.position.copy(camPos.current)
    camTarget.current.set(seat.pos[0], eyeY - 0.2, seat.pos[2])
    cam.lookAt(camTarget.current)

    setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
  })

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault fov={72} near={0.08} far={far} rotation-order="YXZ" />
      <group ref={avatarRef} visible={useSettings.getState().cameraMode !== 'first'}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} />
      </group>
      {emote && <EmoteLabel text={emote} />}
    </>
  )
}

function getInitialPos(seats: ReturnType<typeof seatAnchors>): [number, number, number] {
  const savedId = useSeatFlow.getState().selectedSeatId
  if (savedId != null && savedId >= 0 && savedId < seats.length) {
    return seats[savedId].pos
  }
  if (seats.length > 0) return seats[0].pos
  return [0, 0, HALL.halfL - 3]
}