// @ts-nocheck
import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Vector3, MathUtils } from 'three'
import { useWorld } from '../../store/world'
import { useSeatFlow } from '../../store/seatFlow'
import { useRealmNet } from '../../multiplayer/net'
import { seatAnchors } from './furniture'

interface CameraMode {
  type: 'personal' | 'universal'
  preset?: number // 1-4 for personal, undefined for universal
}

interface UniversalCameraState {
  position: Vector3
  target: Vector3
  mode: 'library-overview' | 'staircase' | 'person-to-person' | 'close-up'
  timer: number
  targetPlayer: string | null
}

const CHAIR_SEAT_Y = 0.45
const PERSONAL_CAMERA_DISTANCE = 3
const PERSONAL_CAMERA_HEIGHT = 1.5
const UNIVERSAL_CAMERA_DISTANCE = 15
const UNIVERSAL_CAMERA_HEIGHT = 8

const PERSONAL_CAMERA_PRESETS = [
  { offset: [2, 1, 2], angle: Math.PI / 4 },      // Front-right
  { offset: [-2, 1, 2], angle: -Math.PI / 4 },     // Front-left
  { offset: [0, 2, 3], angle: 0 },                // Overhead
  { offset: [3, 1, 0], angle: Math.PI / 2 },     // Side view
]

const UNIVERSAL_CAMERA_PATHS = [
  // Library overview positions
  { pos: [0, 12, -25], target: [0, 0, 0], mode: 'library-overview' as const },
  { pos: [20, 10, -10], target: [0, 0, 0], mode: 'library-overview' as const },
  { pos: [-20, 10, -10], target: [0, 0, 0], mode: 'library-overview' as const },
  { pos: [0, 15, 25], target: [0, 0, 0], mode: 'library-overview' as const },

  // Staircase positions
  { pos: [15, 8, 15], target: [10, 2, 15], mode: 'staircase' as const },
  { pos: [-15, 8, 15], target: [-10, 2, 15], mode: 'staircase' as const },

  // Person-to-person positions
  { pos: [8, 6, 0], target: [0, 1, 0], mode: 'person-to-person' as const },
  { pos: [-8, 6, 0], target: [0, 1, 0], mode: 'person-to-person' as const },
  { pos: [0, 6, 8], target: [0, 1, 0], mode: 'person-to-person' as const },
  { pos: [0, 6, -8], target: [0, 1, 0], mode: 'person-to-person' as const },

  // Close-up positions
  { pos: [3, 3, 1], target: [0, 1, 0], mode: 'close-up' as const },
  { pos: [-3, 3, 1], target: [0, 1, 0], mode: 'close-up' as const },
]

export function LibraryCamera() {
  const cameraRef = useRef<PerspectiveCamera>(null)
  const { camera } = useThree()

  const [cameraMode, setCameraMode] = useState<CameraMode>({ type: 'personal', preset: 1 })
  const [universalState, setUniversalState] = useState<UniversalCameraState>({
    position: new Vector3(0, 12, -25),
    target: new Vector3(0, 0, 0),
    mode: 'library-overview',
    timer: 0,
    targetPlayer: null,
  })

  const worldState = useWorld()
  const seatFlowState = useSeatFlow()
  const roster = useRealmNet((s) => s.roster)
  const seats = seatAnchors()

  // Keyboard input for camera modes
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = parseInt(e.key)
      if (key >= 1 && key <= 4) {
        // Personal camera modes 1-4
        setCameraMode({ type: 'personal', preset: key })
      } else if (key === 5) {
        // Universal camera mode
        setCameraMode({ type: 'universal' })
        setUniversalState(prev => ({
          ...prev,
          timer: Date.now(),
          targetPlayer: null,
        }))
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Get current player seat position
  const getCurrentSeatPosition = () => {
    if (worldState.seat == null || !seats[worldState.seat]) return null
    const seat = seats[worldState.seat]
    return {
      position: new Vector3(seat.pos[0], seat.pos[1] + CHAIR_SEAT_Y, seat.pos[2]),
      yaw: seat.yaw + Math.PI,
    }
  }

  // Universal camera cinematic movement
  useFrame((_, dt) => {
    if (cameraMode.type !== 'universal' || !cameraRef.current) return

    const now = Date.now()
    const state = universalState

    // Change camera position every 4-6 seconds
    if (now - state.timer > 4000 + Math.random() * 2000) {
      const newPath = UNIVERSAL_CAMERA_PATHS[Math.floor(Math.random() * UNIVERSAL_CAMERA_PATHS.length)]

      setUniversalState({
        position: new Vector3(newPath.pos[0], newPath.pos[1], newPath.pos[2]),
        target: new Vector3(newPath.target[0], newPath.target[1], newPath.target[2]),
        mode: newPath.mode,
        timer: now,
        targetPlayer: selectRandomPlayer(),
      })
    }

    // Smooth interpolation to new position
    const targetPos = universalState.position
    const targetLook = universalState.target

    const currentPos = cameraRef.current.position

    // Simple lerp for smooth position movement
    const lerpSpeed = 0.02
    currentPos.lerp(targetPos, lerpSpeed)

    // Use lookAt for proper camera orientation
    cameraRef.current.position.copy(currentPos)
    cameraRef.current.lookAt(targetLook)
  })

  // Personal camera following
  useFrame((_, dt) => {
    if (cameraMode.type !== 'personal' || !cameraRef.current) return

    const seatPos = getCurrentSeatPosition()
    if (!seatPos) return

    const preset = cameraMode.preset || 1
    const presetConfig = PERSONAL_CAMERA_PRESETS[(preset - 1) % PERSONAL_CAMERA_PRESETS.length]

    // Calculate camera position based on seat position and preset
    const seatPosVec = seatPos.position
    const cameraPos = new Vector3(
      seatPosVec.x + presetConfig.offset[0],
      seatPosVec.y + presetConfig.offset[1],
      seatPosVec.z + presetConfig.offset[2]
    )

    // Simple position update (no complex physics)
    const currentPos = cameraRef.current.position
    currentPos.lerp(cameraPos, 0.1)

    // Camera looks at seated position
    cameraRef.current.position.copy(currentPos)
    cameraRef.current.lookAt(seatPosVec)
  })

  // Select random player for universal camera focus
  const selectRandomPlayer = () => {
    const playerIds = Object.keys(roster)
    if (playerIds.length === 0) return null

    // Filter out self and select random player
    const otherPlayers = playerIds.filter(id => id !== useRealmNet.getState().selfId)
    if (otherPlayers.length === 0) return null

    return otherPlayers[Math.floor(Math.random() * otherPlayers.length)]
  }

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={60}
      near={0.1}
      far={1000}
      position={[0, 5, 10]}
      rotation={[0, 0, 0]}
    />
  )
}