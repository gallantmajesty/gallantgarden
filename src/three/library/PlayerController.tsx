import { useEffect, useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { HALL } from './layout'
import { buildCollision, rayHit } from './colliders'
import { seatAnchors } from './furniture'
import { useSettings } from '../../store/settings'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { setLocalState } from '../../multiplayer/net'
import { useSeatFlow } from '../../store/seatFlow'
import { EmoteLabel } from './EmoteLabel'
import { useAvatar } from '../../avatar/store'

// Seated camera pivot height above the seat base. Tuned to the chibi rig: the
// seated head is ~1.2 tall, so the pivot sits around chest/eye level (~1.15) —
// NOT ~2.2 (which aimed the camera above the head at the hall/lanterns).
const SEAT_EYE = 0.7
const CHAIR_SEAT_Y = 0.45
const THIRD_DIST = 5.5
const PRESET_DIST = 3.5
const PRESET_3_DIST = 4.2

const PRESET_ANGLES: [number, number][] = [
  [0.6, -0.15],
  [-2.5, -0.1],
  [-3.1, -0.08],
  [0.9, -0.05],
]

const ORBIT_SMOOTHNESS = 8

function getInitialPos(seats: ReturnType<typeof seatAnchors>): [number, number, number] {
  const savedId = useSeatFlow.getState().selectedSeatId
  if (savedId != null && savedId >= 0 && savedId < seats.length) {
    return seats[savedId].pos
  }
  if (seats.length > 0) return seats[0].pos
  return [0, 0, HALL.halfL - 3]
}

function smoothClamp(value: number, min: number, max: number, smoothness: number): number {
  if (value <= min) return min + (value - min) * Math.exp(-smoothness * Math.abs(value - min))
  if (value >= max) return max + (value - max) * Math.exp(-smoothness * Math.abs(value - max))
  return value
}

export function PlayerController() {
  const avatarRef = useRef<any>(null)
  const loco = useRef({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const seats = useMemo(() => seatAnchors(), [])
  const collision = useMemo(() => buildCollision(), [])
  const { gl, camera: camRef } = useThree() as any

  const camPos = useRef(new Vector3())
  const camTarget = useRef(new Vector3())
  const targetYaw = useRef(0)
  const targetPitch = useRef(0)
  const camSeeded = useRef(false)

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
    autoWalkInit: false,
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })
  const wasSeated = useRef(false)
  const [emote, setEmote] = useState<string | null>(null)
  const emoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const far = useSettings((s) => (s as any).drawDistance === 'ultra' ? 500 : (s as any).drawDistance === 'high' ? 300 : 150)

  useEffect(() => {
    const cam = camRef
    if (!cam) return
    cam.far = far
    cam.updateProjectionMatrix()
  }, [far, camRef])

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
      if (useWorld.getState().seat == null) return
      const key = e.key
      if (key >= '1' && key <= '4') {
        // Manual camera shifting: keys 1-4 always select that fixed seat-camera
        // angle (consistent for every character).
        const preset = parseInt(key)
        useSettings.getState().set('cameraPreset', preset)
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

  useFrame((_: any, dtRaw: number) => {
    const dt = Math.min(dtRaw, 0.05)
    const cam = camRef
    if (!cam) return
    const s = useSettings.getState()
    const st = p.current
    const seatId = useWorld.getState().seat

    if (wasSeated.current && seatId == null) {
      useSettings.getState().set('cameraPreset', 0)
    }
    wasSeated.current = seatId != null

    if (seatId != null) {
      const seat = seats[seatId]
      if (seat) {
        st.x = seat.pos[0]
        st.z = seat.pos[2]
        st.y = seat.pos[1]
        st.vx = 0
        st.vz = 0
        st.vy = 0
        st.grounded = true

        // Anchor the local body ON the chair (the group was previously left at the
        // world origin, so the seated character never appeared on its seat).
        if (avatarRef.current) {
          avatarRef.current.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
          avatarRef.current.rotation.y = seat.yaw + Math.PI
        }

        const l = loco.current
        l.seated = true
        l.speed = 0

        if (!st.seatedInit) {
          st.seatedInit = true
          st.yaw = seat.yaw
          st.pitch = -0.2
          st.zoom = 3.0
          st.camDist = 3.0
          targetYaw.current = seat.yaw
          targetPitch.current = -0.2

          if (useAvatar.getState().config.bodyType === 'female') {
            const cur = useSettings.getState().cameraPreset
            if (cur < 1 || cur > 4) {
              useSettings.getState().set('cameraPreset', 1)
            }
          }
        }

        const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE

        if (s.cameraMode === 'first') {
          cam.position.set(seat.pos[0], eyeY, seat.pos[2])
          cam.rotation.set(0, seat.yaw + Math.PI, 0)
          setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true })
          return
        }

        const preset = s.cameraPreset
        if (preset >= 1 && preset <= 4) {
          const [angleOff, pitchOff] = PRESET_ANGLES[preset - 1]
          const yaw = seat.yaw + angleOff
          const pitch = pitchOff
          targetYaw.current = yaw
          targetPitch.current = pitch
          const dist = preset === 3 ? PRESET_3_DIST : PRESET_DIST
          const cp = Math.cos(pitch)
          // UNIT direction from the seat's eye out to the camera (already length 1)
          const dirX = Math.sin(yaw) * cp
          const dirY = Math.sin(pitch)
          const dirZ = Math.cos(yaw) * cp
          // pull the camera in if a wall is closer than `dist` (rayHit needs a unit dir)
          const hit = rayHit(seat.pos[0], eyeY, seat.pos[2], dirX, dirY, dirZ, dist, collision.blockers)
          const safeDist = MathUtils.clamp(Math.min(dist, hit - 0.3), 0.6, dist)
          const idealX = seat.pos[0] + dirX * safeDist
          const idealY = eyeY + dirY * safeDist
          const idealZ = seat.pos[2] + dirZ * safeDist
          // seed the position on the first seated frame so we don't glide from a stale spot
          if (!camSeeded.current) { camPos.current.set(idealX, idealY, idealZ); camSeeded.current = true }
          // stable exponential smoothing — no spring oscillation / flicker
          const a = 1 - Math.exp(-12 * dt)
          camPos.current.x += (idealX - camPos.current.x) * a
          camPos.current.y += (idealY - camPos.current.y) * a
          camPos.current.z += (idealZ - camPos.current.z) * a
          // hard safety: never let the camera leave the room (no void / see-through walls)
          camPos.current.x = MathUtils.clamp(camPos.current.x, -HALL.halfW + 0.6, HALL.halfW - 0.6)
          camPos.current.z = MathUtils.clamp(camPos.current.z, -HALL.halfL + 0.6, HALL.halfL - 0.6)
          camPos.current.y = MathUtils.clamp(camPos.current.y, seat.pos[1] + 0.2, HALL.wallH - 0.5)
          cam.position.copy(camPos.current)
          const targetY = preset === 3 ? seat.pos[1] + 0.8 : eyeY - 0.25
          camTarget.current.lerp(new Vector3(seat.pos[0], targetY, seat.pos[2]), a)
          cam.lookAt(camTarget.current)
          st.yaw = yaw
          st.pitch = pitch
          setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true })
          return
        }

        // free orbit around the seat (drag to look), clamped to a comfy arc
        let yawDiff = st.yaw - seat.yaw
        yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff))
        const minYaw = -(70 / 180) * Math.PI
        const maxYaw = (70 / 180) * Math.PI
        yawDiff = smoothClamp(yawDiff, minYaw, maxYaw, ORBIT_SMOOTHNESS * dt * 60)
        const clampedYaw = seat.yaw + yawDiff
        const clampedPitch = smoothClamp(st.pitch, -0.35, 0.35, ORBIT_SMOOTHNESS * dt * 60)
        targetYaw.current = MathUtils.lerp(targetYaw.current, clampedYaw, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        targetPitch.current = MathUtils.lerp(targetPitch.current, clampedPitch, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        const dist = MathUtils.clamp(st.zoom, 2.0, 8)
        const cp = Math.cos(targetPitch.current)
        // UNIT direction (length 1) so the collision ray distance is correct
        const dirX = Math.sin(targetYaw.current) * cp
        const dirY = Math.sin(targetPitch.current)
        const dirZ = Math.cos(targetYaw.current) * cp
        const hit = rayHit(seat.pos[0], eyeY, seat.pos[2], dirX, dirY, dirZ, dist, collision.blockers)
        const safeDist = MathUtils.clamp(Math.min(dist, hit - 0.3), 0.6, dist)
        const idealX = seat.pos[0] + dirX * safeDist
        const idealY = eyeY + dirY * safeDist
        const idealZ = seat.pos[2] + dirZ * safeDist
        if (!camSeeded.current) { camPos.current.set(idealX, idealY, idealZ); camSeeded.current = true }
        const a = 1 - Math.exp(-12 * dt)
        camPos.current.x += (idealX - camPos.current.x) * a
        camPos.current.y += (idealY - camPos.current.y) * a
        camPos.current.z += (idealZ - camPos.current.z) * a
        camPos.current.x = MathUtils.clamp(camPos.current.x, -HALL.halfW + 0.6, HALL.halfW - 0.6)
        camPos.current.z = MathUtils.clamp(camPos.current.z, -HALL.halfL + 0.6, HALL.halfL - 0.6)
        camPos.current.y = MathUtils.clamp(camPos.current.y, seat.pos[1] + 0.2, HALL.wallH - 0.5)
        cam.position.copy(camPos.current)
        camTarget.current.lerp(new Vector3(seat.pos[0], eyeY - 0.25, seat.pos[2]), a)
        cam.lookAt(camTarget.current)
        st.yaw = targetYaw.current
        st.pitch = targetPitch.current
        setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true })
      }
      return
    }

    st.seatedInit = false
    st.autoWalkInit = false
    camSeeded.current = false
  })

  const avatarCfg = useAvatar((s) => s.config)
  const seatWorld = useWorld((s) => s.seat)
  const cameraModeR = useSettings((s) => s.cameraMode)

  return (
    <group ref={avatarRef}>
      {/* Hide the local body in first-person so the seat-eye camera isn't rendered
          inside its own head (which flickers/clips). */}
      <group visible={seatWorld != null && cameraModeR !== 'first'}>
        <CharacterAvatar config={avatarCfg} locomotion={loco} />
      </group>
    </group>
  )
}
