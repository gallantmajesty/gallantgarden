// @ts-nocheck
import { useEffect, useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera, Vector3 } from 'three'
import { HALL } from './layout'
import { seatAnchors } from './furniture'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'
import { setLocalState } from '../../multiplayer/net'
import { useSeatFlow } from '../../store/seatFlow'

const SEAT_EYE = 1.74
const CHAIR_SEAT_Y = 0.45

// Simple predefined camera positions - no complex calculations
const CAMERA_POSITIONS = [
  { offset: [2, 0, 2], target: [0, -0.2, 0] },      // Right side
  { offset: [-2, 0, 2], target: [0, -0.2, 0] },     // Left side  
  { offset: [0, 0.5, 3], target: [0, 0, 0] },      // Front (elevated to avoid table)
  { offset: [0, 0, 4], target: [0, -0.2, 0] }       // Behind
]

export function PlayerController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const far = useScenePreset().far
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const avatarConfig = useAvatar((s) => s.config)
  const seats = useMemo(() => seatAnchors(), [])

  useEffect(() => {
    const savedId = useSeatFlow.getState().selectedSeatId
    if (savedId != null && seats[savedId] && useWorld.getState().seat == null) {
      useWorld.getState().sit(savedId)
    }
  }, [seats])

  // Camera state
  const currentCamPos = useRef(new Vector3())
  const currentTarget = useRef(new Vector3())
  const targetCamPos = useRef(new Vector3())
  const targetLookAt = useRef(new Vector3())

  const seatFlowState = useSeatFlow()
  const p = useRef({
    x: getInitialPos(seats)[0],
    y: getInitialPos(seats)[1],
    z: getInitialPos(seats)[2],
    yaw: 0,
    seatedInit: false,
  })

  const wasSeated = useRef(false)

  // Handle keyboard input for camera presets
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
    const isDragging = useRef(false)
    const lastMousePos = useRef({ x: 0, y: 0 })
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || (e.button === 0 && worldState.seat != null)) {
        isDragging.current = true
        lastMousePos.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
      }
    }
    
    const handleMouseUp = () => {
      isDragging.current = false
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      
      // Only allow free orbit when preset is 0 (not in fixed camera mode)
      if (settings.cameraPreset === 0) {
        const seatId = worldState.seat
        if (seatId != null && seats[seatId]) {
          const seat = seats[seatId]
          // Rotate around the seat
          const currentAngle = Math.atan2(
            currentCamPos.current.x - seat.pos[0],
            currentCamPos.current.z - seat.pos[2]
          )
          const newAngle = currentAngle + dx * 0.01
          const distance = currentCamPos.current.distanceTo(new Vector3(seat.pos[0], seat.pos[1], seat.pos[2]))
          
          targetCamPos.current.x = seat.pos[0] + Math.sin(newAngle) * distance
          targetCamPos.current.z = seat.pos[2] + Math.cos(newAngle) * distance
          targetCamPos.current.y = seat.pos[1] + SEAT_EYE + dy * 0.1
          targetCamPos.current.y = MathUtils.clamp(targetCamPos.current.y, seat.pos[1] + 1, seat.pos[1] + 3)
        }
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      // Zoom in/out by adjusting distance from seat
      const seatId = worldState.seat
      if (seatId != null && seats[seatId]) {
        const seat = seats[seatId]
        const currentDistance = currentCamPos.current.distanceTo(new Vector3(seat.pos[0], seat.pos[1], seat.pos[2]))
        const newDistance = MathUtils.clamp(currentDistance + Math.sign(e.deltaY) * 0.5, 2, 8)
        
        const direction = currentCamPos.current.clone().sub(new Vector3(seat.pos[0], seat.pos[1], seat.pos[2])).normalize()
        targetCamPos.current.copy(new Vector3(seat.pos[0], seat.pos[1], seat.pos[2])).add(direction.multiplyScalar(newDistance))
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [gl, seats])

  const settings = useSettings()
  const worldState = useWorld()
  
  useFrame((_, dt) => {
    const cam = camRef.current
    if (!cam) return
    
    const s = settings
    const seatId = worldState.seat

    // Handle standing/walking
    if (seatId == null) {
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
    if (!p.current.seatedInit) {
      p.current.seatedInit = true
      // Set initial camera position
      const initialPos = CAMERA_POSITIONS[0] // Start with right side view
      targetCamPos.current.set(
        seat.pos[0] + initialPos.offset[0],
        seat.pos[1] + initialPos.offset[1],
        seat.pos[2] + initialPos.offset[2]
      )
      targetLookAt.current.set(
        seat.pos[0] + initialPos.target[0],
        seat.pos[1] + initialPos.target[1],
        seat.pos[2] + initialPos.target[2]
      )
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
      const cameraData = CAMERA_POSITIONS[preset - 1]
      
      // Set target position based on preset
      targetCamPos.current.set(
        seat.pos[0] + cameraData.offset[0],
        seat.pos[1] + cameraData.offset[1],
        seat.pos[2] + cameraData.offset[2]
      )
      targetLookAt.current.set(
        seat.pos[0] + cameraData.target[0],
        seat.pos[1] + cameraData.target[1],
        seat.pos[2] + cameraData.target[2]
      )
    }

    // Smooth camera movement using simple lerp
    const lerpSpeed = 0.15
    currentCamPos.current.lerp(targetCamPos.current, lerpSpeed)
    currentTarget.lerp(targetLookAt.current, lerpSpeed)

    // Apply camera position and rotation
    cam.position.copy(currentCamPos.current)
    cam.lookAt(currentTarget)

    setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
  })

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault fov={72} near={0.08} far={far} rotation-order="YXZ" />
      <group ref={avatarRef} visible={settings.cameraMode !== 'first'}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} />
      </group>
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