// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react'
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
const THIRD_DIST = 5.5
const PRESET_DIST = 3.5 // fixed camera distance for presets
const PRESET_3_DIST = 4.2 // slightly farther for preset 3 to avoid table intersection

// 4 fixed camera angles relative to seat yaw (in radians):
//   1 = left-behind    2 = front-left    3 = front-center    4 = right
const PRESET_ANGLES: [number, number][] = [
  [0.6, -0.15],   // 1: left-behind
  [-2.5, -0.1],   // 2: front-left
  [-3.1, -0.08],  // 3: front-center (slightly up to avoid table intersection)
  [0.9, -0.05],   // 4: right side
]

const CAMERA_STIFFNESS = 45
const CAMERA_DAMPING = 12
const ORBIT_SMOOTHNESS = 8
const COLLISION_SOFTNESS = 0.15

function getInitialPos(seats: ReturnType<typeof seatAnchors>): [number, number, number] {
  const savedId = useSeatFlow.getState().selectedSeatId
  if (savedId != null && savedId >= 0 && savedId < seats.length) {
    return seats[savedId].pos
  }
  if (seats.length > 0) return seats[0].pos
  return [0, 0, HALL.halfL - 3]
}

function springDamper(current: number, target: number, stiffness: number, damping: number, dt: number): number {
  const diff = target - current
  const springForce = diff * stiffness
  const damperForce = -damping * 0
  const acceleration = springForce + damperForce
  return current + acceleration * dt * dt + diff * (1 - Math.exp(-damping * dt))
}

function smoothClamp(value: number, min: number, max: number, smoothness: number): number {
  if (value <= min) return min + (value - min) * Math.exp(-smoothness * Math.abs(value - min))
  if (value >= max) return max + (value - max) * Math.exp(-smoothness * Math.abs(value - max))
  return value
}

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

  const camPos = useRef(new Vector3())
  const camTarget = useRef(new Vector3())
  const camVel = useRef(new Vector3())
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
    camDist: THIRD_DIST,
    zoom: THIRD_DIST,
    eye: 1.62,
    nearSeat: null as number | null,
    seatedInit: false,
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })
  const wasSeated = useRef(false)
  const [emote, setEmote] = useState<string | null>(null)
  const emoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const cam = camRef.current
    if (!cam) return
    cam.far = far
    cam.updateProjectionMatrix()
  }, [far])

  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      drag.current.on = true
      drag.current.lx = e.clientX
      drag.current.ly = e.clientY
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d.on) return
      // Female avatars: camera is locked to presets 1-4, no mouse orbit
      const isFemale = useAvatar.getState().config.bodyType === 'female'
      const seated = useWorld.getState().seat != null
      if (isFemale && seated) return
      const s = useSettings.getState()
      const k = 0.0032 * s.sensitivity
      p.current.faceYaw -= (e.clientX - d.lx) * k
      p.current.yaw = p.current.faceYaw
      p.current.pitch += (e.clientY - d.ly) * k * (s.invertY ? 1 : -1)
      p.current.pitch = MathUtils.clamp(p.current.pitch, -1.2, 1.2)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => {
      drag.current.on = false
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      p.current.zoom = MathUtils.clamp(p.current.zoom + Math.sign(e.deltaY) * 0.6, 2.6, 10)
    }
    const keyDown = (e: KeyboardEvent) => {
      // Only handle 1-4 when seated
      if (useWorld.getState().seat == null) return
      const key = e.key
      if (key >= '1' && key <= '4') {
        const preset = parseInt(key)
        const current = useSettings.getState().cameraPreset
        // Female avatars: camera locked to presets 1-4, no free orbit.
        // Pressing the same key cycles to next preset instead of toggling off.
        const isFemale = useAvatar.getState().config.bodyType === 'female'
        let next: number
        if (isFemale) {
          next = current === preset ? (preset % 4) + 1 : preset
        } else {
          // Toggle: pressing the same key again goes back to free orbit (0)
          next = current === preset ? 0 : preset
        }
        useSettings.getState().set('cameraPreset', next)
        // Reset yaw/pitch when switching to a preset
        if (current !== preset) {
          const seatId = useWorld.getState().seat
          if (seatId != null) {
            const seat = seats[seatId]
            if (seat) {
              targetYaw.current = seat.yaw + PRESET_ANGLES[preset - 1][0]
              targetPitch.current = PRESET_ANGLES[preset - 1][1]
              p.current.yaw = targetYaw.current
              p.current.pitch = targetPitch.current
              p.current.zoom = PRESET_DIST
            }
          }
        }
      }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', keyDown)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', keyDown)
    }
  }, [gl, seats])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const cam = camRef.current
    if (!cam) return
    const s = useSettings.getState()
    const st = p.current

    const seatId = useWorld.getState().seat

    // Reset cameraPreset when transitioning from seated to standing
    if (wasSeated.current && seatId == null) {
      useSettings.getState().set('cameraPreset', 0)
    }
    wasSeated.current = seatId != null

    if (seatId != null) {
      const seat = seats[seatId]
      const av = avatarRef.current
      if (seat) {
        const avYaw = seat.yaw + Math.PI

        if (!st.seatedInit) {
          st.seatedInit = true
          st.yaw = seat.yaw
          st.pitch = -0.2
          st.zoom = 3.0
          st.camDist = 3.0
          targetYaw.current = seat.yaw
          targetPitch.current = -0.2

          // Female avatars: auto-select preset 1 on sit (no free orbit)
          if (useAvatar.getState().config.bodyType === 'female') {
            const cur = useSettings.getState().cameraPreset
            if (cur < 1 || cur > 4) {
              useSettings.getState().set('cameraPreset', 1)
            }
          }
        }

        st.x = seat.pos[0]
        st.z = seat.pos[2]
        st.y = seat.pos[1]
        st.vx = 0
        st.vz = 0
        st.vy = 0
        st.grounded = true

        const l = loco.current
        l.seated = true
        l.speed = 0
        l.grounded = true
        l.vy = 0
        l.turnRate = 0

        if (av) {
          av.position.set(seat.pos[0], seat.pos[1] + CHAIR_SEAT_Y, seat.pos[2])
          av.rotation.y = avYaw
        }

        const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE

        if (s.cameraMode === 'first') {
          if (av) av.visible = false
          cam.position.set(seat.pos[0], eyeY, seat.pos[2])
          cam.rotation.set(0, avYaw, 0)
          setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
          return
        }

        const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera
        const isDragging = drag.current.on
        if (av) av.visible = !(hideAvatarWhenMovingCamera && isDragging)

        const behindAngle = seat.yaw

        // When a camera preset is active (1-4), skip free orbit and use fixed angle
        const preset = s.cameraPreset
        if (preset >= 1 && preset <= 4) {
          const [angleOff, pitchOff] = PRESET_ANGLES[preset - 1]
          targetYaw.current = seat.yaw + angleOff
          targetPitch.current = pitchOff
          const dist = preset === 3 ? PRESET_3_DIST : PRESET_DIST

          const cp = Math.cos(targetPitch.current)
          const idealX = seat.pos[0] + Math.sin(targetYaw.current) * cp * dist
          const idealY = eyeY + Math.sin(targetPitch.current) * dist
          const idealZ = seat.pos[2] + Math.cos(targetYaw.current) * cp * dist

          // Collision detection for presets - avoid table intersection
          const dx = idealX - seat.pos[0]
          const dy = idealY - eyeY
          const dz = idealZ - seat.pos[2]
          const hit = rayHit(seat.pos[0], eyeY, seat.pos[2], dx, dy, dz, dist + 0.4, collision.blockers)
          const collisionDist = Math.min(dist, hit - 0.4)
          const softDist = collisionDist + COLLISION_SOFTNESS * (dist - collisionDist)

          const actualDist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (actualDist > softDist + 0.1) {
            const dir = new Vector3(dx, dy, dz).normalize()
            camPos.current.x = seat.pos[0] + dir.x * softDist
            camPos.current.y = eyeY + dir.y * softDist
            camPos.current.z = seat.pos[2] + dir.z * softDist
          } else {
            camPos.current.x = springDamper(camPos.current.x, idealX, CAMERA_STIFFNESS, CAMERA_DAMPING, dt)
            camPos.current.y = springDamper(camPos.current.y, idealY, CAMERA_STIFFNESS, CAMERA_DAMPING, dt)
            camPos.current.z = springDamper(camPos.current.z, idealZ, CAMERA_STIFFNESS, CAMERA_DAMPING, dt)
          }

          cam.position.copy(camPos.current)
// For preset 3, look slightly down at the table to avoid staring at the surface
          const targetY = preset === 3 ? seat.pos[1] + 0.8 : eyeY - 0.25
          camTarget.current.lerp(new Vector3(seat.pos[0], targetY, seat.pos[2]), 1 - Math.exp(-15 * dt))
          cam.lookAt(camTarget.current)

          st.yaw = targetYaw.current
          st.pitch = targetPitch.current

          setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
          return
        }

        // Free orbit mode (preset === 0)

        let yawDiff = st.yaw - behindAngle
        yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff))
        const minYaw = -(70 / 180) * Math.PI
        const maxYaw = (70 / 180) * Math.PI
        yawDiff = smoothClamp(yawDiff, minYaw, maxYaw, ORBIT_SMOOTHNESS * dt * 60)
        const clampedYaw = behindAngle + yawDiff

        const clampedPitch = smoothClamp(st.pitch, -0.35, 0.35, ORBIT_SMOOTHNESS * dt * 60)

        targetYaw.current = MathUtils.lerp(targetYaw.current, clampedYaw, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        targetPitch.current = MathUtils.lerp(targetPitch.current, clampedPitch, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))

        const dist = MathUtils.clamp(st.zoom, 2.0, 8)

        const cp = Math.cos(targetPitch.current)
        const idealX = seat.pos[0] + Math.sin(targetYaw.current) * cp * dist
        const idealY = eyeY + Math.sin(targetPitch.current) * dist
        const idealZ = seat.pos[2] + Math.cos(targetYaw.current) * cp * dist

        const dx = idealX - seat.pos[0]
        const dy = idealY - eyeY
        const dz = idealZ - seat.pos[2]
        const hit = rayHit(seat.pos[0], eyeY, seat.pos[2], dx, dy, dz, dist + 0.4, collision.blockers)
        const collisionDist = Math.min(dist, hit - 0.4)
        const softDist = collisionDist + COLLISION_SOFTNESS * (dist - collisionDist)

        camPos.current.x = springDamper(camPos.current.x, idealX, CAMERA_STIFFNESS, CAMERA_DAMPING, dt)
        camPos.current.y = springDamper(camPos.current.y, idealY, CAMERA_STIFFNESS, CAMERA_DAMPING, dt)
        camPos.current.z = springDamper(camPos.current.z, idealZ, CAMERA_STIFFNESS, CAMERA_DAMPING, dt)

        const actualDist = camPos.current.distanceTo(new Vector3(seat.pos[0], eyeY, seat.pos[2]))
        if (actualDist > softDist + 0.1) {
          const dir = camPos.current.clone().sub(new Vector3(seat.pos[0], eyeY, seat.pos[2])).normalize()
          camPos.current.set(
            seat.pos[0] + dir.x * softDist,
            eyeY + dir.y * softDist,
            seat.pos[2] + dir.z * softDist
          )
        }

        cam.position.copy(camPos.current)

        camTarget.current.lerp(new Vector3(seat.pos[0], eyeY - 0.25, seat.pos[2]), 1 - Math.exp(-15 * dt))
        cam.lookAt(camTarget.current)

        st.yaw = targetYaw.current
        st.pitch = targetPitch.current

        setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: avYaw, speed: 0, grounded: true, seated: true })
      }
      return
    }

    const flow = useSeatFlow.getState()
    if (flow.stage === 'walking' && flow.selectedSeatId != null) {
      const targetSeat = seats[flow.selectedSeatId]
      if (targetSeat) {
        st.x = targetSeat.pos[0]
        st.y = targetSeat.pos[1]
        st.z = targetSeat.pos[2]
        st.vx = 0
        st.vz = 0
        st.vy = 0
        st.grounded = true
        st.faceYaw = targetSeat.yaw + Math.PI
        targetYaw.current = targetSeat.yaw
        targetPitch.current = -0.2
        flow.arrive()
        useWorld.getState().sit(targetSeat.id)
        return
      }
    }
    st.autoWalkInit = false
  })

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault fov={72} near={0.08} far={far} rotation-order="YXZ" />
      <group ref={avatarRef} visible={useSettings.getState().cameraMode !== 'first'}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} preview={emote ?? undefined} />
      </group>
      {emote && <EmoteLabel text={emote} />}
    </>
  )
}