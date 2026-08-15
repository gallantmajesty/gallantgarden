import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, Vector3 } from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { activityOfAccessories, type Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'
import { rankForLifetime } from '../../lib/ranks'
import { getSelfId, getTarget, setLocalState } from '../../multiplayer/net'
import { useProfile } from '../../store/profile'
import { useSeatFlow } from '../../store/seatFlow'
import { useSettings, type CameraMode } from '../../store/settings'
import { useWorld } from '../../store/world'
import { PlayerNameTag3D } from '../library/PlayerNameTag3D'
import { PlayerTimerBar } from '../library/PlayerTimerBar'
import {
  CAFE,
  chineseCafeBlockers,
  chineseCafeSeatAnchors,
  rayHitCafe,
  type CafeSeat,
} from './layout'

const CHAIR_SEAT_Y = 0.45
const SEAT_EYE = 0.84
const THIRD_PERSON_DISTANCE = 4.4
const MIN_ZOOM = 2.8
const MAX_ZOOM = 8.5
const THIRD_MIN_PITCH = -0.42
const THIRD_MAX_PITCH = 0.72
const FIRST_MIN_PITCH = -1.1
const FIRST_MAX_PITCH = 1.1
const CAMERA_MARGIN = 0.45
const MIN_SAFE_DISTANCE = 1.5
const CAMERA_SMOOTHNESS = 11
const ORBIT_SMOOTHNESS = 10

// Seated camera presets (keys 1-8) — same numbering as the library realm.
// `yaw` is an offset added to the seat's facing direction, `pitch` the orbit
// elevation, `zoom` the orbit distance. Re-pressing the active preset key
// returns to free orbit. (Key 9 = Cinematic Tour is owned by Explore's handler.)
const CAFE_PRESETS: { yaw: number; pitch: number; zoom: number }[] = [
  { yaw: 0.55, pitch: 0.18, zoom: 3.6 }, // 1 — front-right 3/4
  { yaw: -0.55, pitch: 0.18, zoom: 3.6 }, // 2 — front-left 3/4
  { yaw: Math.PI, pitch: 0.5, zoom: 4.4 }, // 3 — behind & above
  { yaw: Math.PI / 2, pitch: 0.2, zoom: 4.0 }, // 4 — side profile
  { yaw: -Math.PI / 4, pitch: 0.35, zoom: 5.0 }, // 5 — low front-right
  { yaw: Math.PI * 0.75, pitch: 0.6, zoom: 5.5 }, // 6 — high behind-left
  { yaw: 0, pitch: 0.1, zoom: 3.0 }, // 7 — tight front close-up
  { yaw: Math.PI * 1.25, pitch: 0.25, zoom: 4.8 }, // 8 — rear three-quarter
]

interface OrbitState {
  seatId: number | null
  mode: CameraMode
  yaw: number
  pitch: number
  liveYaw: number
  livePitch: number
  zoom: number
  safeDistance: number
  seeded: boolean
  /** active numbered preset (0 = free orbit) */
  preset: number
}

function seatById(seats: readonly CafeSeat[], id: number | null): CafeSeat | null {
  if (id == null || !Number.isInteger(id) || id < 0 || id >= seats.length) return null
  const seat = seats[id]
  return seat.id === id ? seat : null
}

function resetOrbit(state: OrbitState, seat: CafeSeat, mode: CameraMode): void {
  const yaw = mode === 'first' ? seat.yaw + Math.PI : seat.yaw
  state.seatId = seat.id
  state.mode = mode
  state.yaw = yaw
  state.pitch = mode === 'first' ? 0 : -0.16
  state.liveYaw = state.yaw
  state.livePitch = state.pitch
  state.zoom = THIRD_PERSON_DISTANCE
  state.safeDistance = THIRD_PERSON_DISTANCE
  state.seeded = false
  state.preset = 0
}

function publishCafeState(seat: CafeSeat | null): void {
  const selfId = getSelfId()
  const previous = selfId ? getTarget(selfId) : undefined

  setLocalState({
    x: seat?.pos[0] ?? previous?.x ?? 0,
    y: seat?.pos[1] ?? previous?.y ?? 0,
    z: seat?.pos[2] ?? previous?.z ?? 0,
    yaw: seat ? seat.yaw + Math.PI : previous?.yaw ?? 0,
    speed: 0,
    grounded: true,
    seated: seat !== null,
    seatId: seat?.id,
    timerStartedAt: previous?.timerStartedAt ?? 0,
    timerDurationMs: previous?.timerDurationMs ?? 0,
    timerPhase: previous?.timerPhase ?? '',
    timerCelebrateAt: previous?.timerCelebrateAt ?? 0,
    subject: previous?.subject ?? '',
    cinematic: false,
  })
}

export function ChineseCafePlayerController() {
  const config = useAvatar((state) => state.config)
  const cameraMode = useSettings((state) => state.cameraMode)
  const worldSeatId = useWorld((state) => state.seat)
  const selectedSeatId = useSeatFlow((state) => state.selectedSeatId)
  const seats = useMemo(() => chineseCafeSeatAnchors(), [])
  const blockers = useMemo(() => chineseCafeBlockers(), [])
  const { camera, gl } = useThree()

  const avatarRef = useRef<Group>(null)
  const locomotion = useRef<Locomotion>({
    speed: 0,
    grounded: true,
    vy: 0,
    turnRate: 0,
    seated: true,
    activity: activityOfAccessories(config.accessories),
  })
  const orbit = useRef<OrbitState>({
    seatId: null,
    mode: cameraMode,
    yaw: 0,
    pitch: -0.16,
    liveYaw: 0,
    livePitch: -0.16,
    zoom: THIRD_PERSON_DISTANCE,
    safeDistance: THIRD_PERSON_DISTANCE,
    seeded: false,
    preset: 0,
  })
  const drag = useRef({ active: false, x: 0, y: 0 })
  const cameraPosition = useRef(new Vector3())
  const cameraTarget = useRef(new Vector3())
  const desiredTarget = useRef(new Vector3())

  useEffect(() => {
    locomotion.current.activity = activityOfAccessories(config.accessories)
  }, [config.accessories])

  const activeSeatId = worldSeatId ?? selectedSeatId

  useLayoutEffect(() => {
    const seat = seatById(seats, activeSeatId)
    if (!seat) return

    const state = orbit.current
    resetOrbit(state, seat, cameraMode)
    const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE

    if (cameraMode === 'first') {
      camera.position.set(seat.pos[0], eyeY, seat.pos[2])
      camera.rotation.set(0, seat.yaw + Math.PI, 0, 'YXZ')
      state.seeded = true
      return
    }

    const cp = Math.cos(state.pitch)
    const dirX = Math.sin(state.yaw) * cp
    const dirY = Math.sin(state.pitch)
    const dirZ = Math.cos(state.yaw) * cp
    const hit = rayHitCafe(
      seat.pos[0],
      eyeY,
      seat.pos[2],
      dirX,
      dirY,
      dirZ,
      state.zoom,
      blockers,
    )
    const collisionDistance = hit < state.zoom ? hit - CAMERA_MARGIN : state.zoom
    const safeDistance = MathUtils.clamp(collisionDistance, MIN_SAFE_DISTANCE, state.zoom)
    state.safeDistance = safeDistance

    camera.position.set(
      seat.pos[0] + dirX * safeDistance,
      eyeY + dirY * safeDistance,
      seat.pos[2] + dirZ * safeDistance,
    )
    cameraPosition.current.copy(camera.position)
    cameraTarget.current.set(seat.pos[0], eyeY - 0.1, seat.pos[2])
    camera.lookAt(cameraTarget.current)
    state.seeded = true
  }, [activeSeatId, blockers, camera, cameraMode, seats])

  useEffect(() => {
    const canvas = gl.domElement

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag.current.active = true
      drag.current.x = event.clientX
      drag.current.y = event.clientY
      orbit.current.preset = 0 // dragging leaves any fixed preset → free orbit
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!drag.current.active) return

      const settings = useSettings.getState()
      const state = orbit.current
      const factor = 0.0032 * settings.sensitivity
      const deltaX = event.clientX - drag.current.x
      const deltaY = event.clientY - drag.current.y
      state.yaw -= deltaX * factor
      state.pitch += deltaY * factor * (settings.invertY ? 1 : -1)

      if (settings.cameraMode === 'first') {
        state.pitch = MathUtils.clamp(state.pitch, FIRST_MIN_PITCH, FIRST_MAX_PITCH)
      } else {
        state.pitch = MathUtils.clamp(state.pitch, THIRD_MIN_PITCH, THIRD_MAX_PITCH)
      }

      drag.current.x = event.clientX
      drag.current.y = event.clientY
    }

    const endDrag = () => {
      drag.current.active = false
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      orbit.current.preset = 0 // manual zoom leaves any fixed preset
      orbit.current.zoom = MathUtils.clamp(
        orbit.current.zoom + Math.sign(event.deltaY) * 0.55,
        MIN_ZOOM,
        MAX_ZOOM,
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === '9') return // cinematic toggle is owned by Explore's key handler
      if (useWorld.getState().cinematic) useWorld.getState().setCinematic(false)
      const n = parseInt(event.key, 10)
      if (n >= 1 && n <= 8) {
        const state = orbit.current
        if (state.preset === n) {
          state.preset = 0 // re-press the active preset → free orbit
          return
        }
        state.preset = n
        const seat = seatById(seats, useWorld.getState().seat)
        const pre = CAFE_PRESETS[n - 1]
        if (seat) {
          state.yaw = seat.yaw + pre.yaw
          state.pitch = pre.pitch
          state.zoom = pre.zoom
        } else {
          state.yaw = state.yaw + pre.yaw
          state.pitch = pre.pitch
          state.zoom = pre.zoom
        }
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    window.addEventListener('blur', endDrag)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('wheel', handleWheel)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('blur', endDrag)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gl, seats])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const seat = seatById(seats, useWorld.getState().seat)
    const avatar = avatarRef.current

    if (!seat) {
      if (avatar) avatar.visible = false
      orbit.current.seeded = false
      publishCafeState(null)
      return
    }

    if (avatar) {
      avatar.visible = true
      avatar.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
      avatar.rotation.y = seat.yaw + Math.PI
    }

    const motion = locomotion.current
    motion.speed = 0
    motion.grounded = true
    motion.vy = 0
    motion.turnRate = 0
    motion.seated = true
    motion.activity = activityOfAccessories(config.accessories)

    const state = orbit.current
    if (state.seatId !== seat.id || state.mode !== cameraMode) {
      resetOrbit(state, seat, cameraMode)
    }

    const orbitAlpha = 1 - Math.exp(-ORBIT_SMOOTHNESS * delta)
    state.liveYaw = MathUtils.lerp(state.liveYaw, state.yaw, orbitAlpha)
    state.livePitch = MathUtils.lerp(state.livePitch, state.pitch, orbitAlpha)

    const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE
    if (cameraMode === 'first') {
      camera.position.set(seat.pos[0], eyeY, seat.pos[2])
      camera.rotation.set(state.livePitch, state.liveYaw, 0, 'YXZ')
      state.seeded = true
      publishCafeState(seat)
      return
    }

    const distance = MathUtils.clamp(state.zoom, MIN_ZOOM, MAX_ZOOM)
    const cp = Math.cos(state.livePitch)
    const dirX = Math.sin(state.liveYaw) * cp
    const dirY = Math.sin(state.livePitch)
    const dirZ = Math.cos(state.liveYaw) * cp
    const hit = rayHitCafe(
      seat.pos[0],
      eyeY,
      seat.pos[2],
      dirX,
      dirY,
      dirZ,
      distance,
      blockers,
    )
    const collisionDistance = hit < distance ? hit - CAMERA_MARGIN : distance
    const targetSafeDistance = MathUtils.clamp(
      collisionDistance,
      MIN_SAFE_DISTANCE,
      distance,
    )
    const cameraAlpha = 1 - Math.exp(-CAMERA_SMOOTHNESS * delta)

    if (!state.seeded) {
      state.safeDistance = targetSafeDistance
    } else {
      state.safeDistance = MathUtils.lerp(
        state.safeDistance,
        targetSafeDistance,
        cameraAlpha,
      )
    }

    const idealX = seat.pos[0] + dirX * state.safeDistance
    const idealY = eyeY + dirY * state.safeDistance
    const idealZ = seat.pos[2] + dirZ * state.safeDistance

    if (!state.seeded) {
      cameraPosition.current.set(idealX, idealY, idealZ)
      cameraTarget.current.set(seat.pos[0], eyeY - 0.1, seat.pos[2])
      state.seeded = true
    } else {
      cameraPosition.current.x += (idealX - cameraPosition.current.x) * cameraAlpha
      cameraPosition.current.y += (idealY - cameraPosition.current.y) * cameraAlpha
      cameraPosition.current.z += (idealZ - cameraPosition.current.z) * cameraAlpha
      desiredTarget.current.set(seat.pos[0], eyeY - 0.1, seat.pos[2])
      cameraTarget.current.lerp(desiredTarget.current, cameraAlpha)
    }

    cameraPosition.current.x = MathUtils.clamp(
      cameraPosition.current.x,
      -CAFE.halfW + 0.6,
      CAFE.halfW - 0.6,
    )
    cameraPosition.current.y = MathUtils.clamp(
      cameraPosition.current.y,
      seat.pos[1] + 0.2,
      CAFE.wallH - 0.5,
    )
    cameraPosition.current.z = MathUtils.clamp(
      cameraPosition.current.z,
      -CAFE.halfL + 0.6,
      CAFE.halfL - 0.6,
    )
    camera.position.copy(cameraPosition.current)
    camera.lookAt(cameraTarget.current)
    publishCafeState(seat)
  })

  const displayName = useProfile((state) => state.displayName)
  const playerId = useProfile((state) => state.playerId)
  const rank = useProfile((state) =>
    rankForLifetime(state.rankXp, state.xp, state.premiumXp).id,
  )
  const country = useProfile((state) => state.data.country)
  const banner = useProfile((state) => state.pub.banner)
  const logo = useProfile((state) => state.pub.logo)
  const localName = displayName || (playerId != null ? `#${playerId}` : 'Explorer')

  return (
    <group ref={avatarRef}>
      <group visible={cameraMode !== 'first'}>
        <CharacterAvatar config={config} locomotion={locomotion} />
        <PlayerNameTag3D
          name={localName}
          rank={rank}
          country={country}
          playerId={playerId}
          self
          headY={2.55}
          banner={banner}
          logo={logo}
        />
        <PlayerTimerBar self headY={2.9} />
      </group>
    </group>
  )
}
