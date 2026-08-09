import { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { HALL } from './layout'
import { buildCollision, rayHit } from './colliders'
import { seatAnchors, GALLERY_FRONT_Z } from './furniture'
import { useSettings } from '../../store/settings'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { setLocalState, getCineHostId, getCineHostCam, publishCineCam, publishCineState, setLocalCineActive, getSelfId } from '../../multiplayer/net'
import { activityOfAccessories, type Locomotion } from '../../avatar/animation'

/** Fisher-Yates shuffle — mutates and returns the array. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
import { useSeatFlow } from '../../store/seatFlow'
import { EmoteLabel } from './EmoteLabel'
import { useAvatar } from '../../avatar/store'
import { useProfile } from '../../store/profile'
import { rankForLifetime } from '../../lib/ranks'
import { PlayerNameTag3D } from './PlayerNameTag3D'
import { PlayerTimerBar } from './PlayerTimerBar'

// Seated camera pivot height above the seat base. Tuned to the chibi rig: the
// seated head is ~1.2 tall, so the pivot sits around chest/eye level (~1.15) —
// NOT ~2.2 (which aimed the camera above the head at the hall/lanterns).
const SEAT_EYE = 0.7
const CHAIR_SEAT_Y = 0.45
const THIRD_DIST = 4.0 // default orbit distance when seated

// A single, clean seated camera: a smooth third-person orbit you aim with drag
// and zoom with the wheel. No numbered presets. Default view faces the avatar
// (so you see your own character), and you can orbit a full 360°. First-person
// mode (cameraMode) drops the camera to eye level.
const ORBIT_SMOOTHNESS = 9
const MIN_ZOOM = 2.5
const MAX_ZOOM = 9
const MIN_PITCH = -0.4
const MAX_PITCH = 0.7
// Collision pull-in: never let the camera collapse closer than this to the
// subject. A tiny floor (e.g. 0.6) embeds the camera inside nearby walls /
// shelves / columns behind or beside a seat, which z-fights and reads as a
// flicker. The room clamp keeps the camera inside the walls, so a larger
// minimum just means a blocked direction sits at a stable, comfortable distance.
const MIN_SAFE_DIST = 1.6
const PULL_MARGIN = 0.5

// Seated camera presets (keys 1-4). `yaw` is an offset added to the seat's
// facing direction, `pitch` the orbit elevation, `zoom` the orbit distance.
// Re-pressing the active preset key returns to free orbit.
const SEAT_PRESETS: { yaw: number; pitch: number; zoom: number }[] = [
  { yaw: 0.55, pitch: 0.18, zoom: 3.6 }, // 1 — front-right 3/4
  { yaw: -0.55, pitch: 0.18, zoom: 3.6 }, // 2 — front-left 3/4
  { yaw: Math.PI, pitch: 0.5, zoom: 4.4 }, // 3 — behind & above
  { yaw: Math.PI / 2, pitch: 0.2, zoom: 4.0 }, // 4 — side profile
  { yaw: -Math.PI / 4, pitch: 0.35, zoom: 5.0 }, // 5 — low front-right
  { yaw: Math.PI * 0.75, pitch: 0.6, zoom: 5.5 }, // 6 — high behind-left
  { yaw: 0, pitch: 0.1, zoom: 3.0 }, // 7 — tight front close-up
  { yaw: Math.PI * 1.25, pitch: 0.25, zoom: 4.8 }, // 8 — rear three-quarter
]

function getInitialPos(seats: ReturnType<typeof seatAnchors>): [number, number, number] {
  const savedId = useSeatFlow.getState().selectedSeatId
  if (savedId != null && savedId >= 0 && savedId < seats.length) {
    return seats[savedId].pos
  }
  if (seats.length > 0) return seats[0].pos
  return [0, 0, HALL.halfL - 3]
}

export function PlayerController() {
  const avatarRef = useRef<any>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const seats = useMemo(() => seatAnchors(), [])
  const collision = useMemo(() => buildCollision(), [])
  const { gl, camera: camRef } = useThree() as any

  const initPos = getInitialPos(seats)
  const camPos = useRef(new Vector3(initPos[0], initPos[1] + CHAIR_SEAT_Y + SEAT_EYE, initPos[2]))
  const camTarget = useRef(new Vector3(initPos[0], initPos[1] + CHAIR_SEAT_Y + SEAT_EYE - 0.1, initPos[2]))
  const camLookTmp = useRef(new Vector3())
  const targetYaw = useRef(0)
  const targetPitch = useRef(0)
  const safeDistRef = useRef(THIRD_DIST)
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
    preset: 0, // 0 = free orbit, 1-4 = seated preset
    eye: 1.62,
    nearSeat: null as number | null,
    seatedInit: false,
    autoWalkInit: false,
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })
  const wasSeated = useRef(false)
  const [emote, setEmote] = useState<string | null>(null)
  const emoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cinematic tour (key 9 / overlay button): movie-style fade-cut-fade between
  // random vantage points. The camera slowly drifts during each shot (gentle
  // dolly/pan), fades to black, teleports, fades back in. The `phase` state
  // machine drives the overlay opacity exposed via useWorld.cineFade.
  type CinePhase = 'idle' | 'fadeOut' | 'fadeIn' | 'dwell'
  const cine = useRef({
    phase: 'idle' as CinePhase,
    target: new Vector3(),
    lookTarget: new Vector3(),
    orbitCenter: new Vector3(),
    orbitLook: new Vector3(),
    orbitRadius: 0,
    orbitAngle: 0,
    orbitSpeed: 0,
    orbitTilt: 0,
    orbitReady: false,
    t: 0,
    dwellDur: 0,
    fadeDur: 0,
  })
  const CINE_FOV_BASE = 68
  // Shared cinematic: scratch vectors + a publish throttle so the host only
  // streams its camera ~11×/sec rather than every frame.
  const _cv = useRef(new Vector3())
  const _cv2 = useRef(new Vector3())
  const cineCamPub = useRef(0)
  const cineStateSent = useRef(false)
  const wasCinematic = useRef(false)

  // 50 hand-crafted cinematic positions covering the ENTIRE library —
  // shuffled so there's no visible sequence. Includes heavy top-floor / balcony
  // coverage as requested. Memoised once so the order is stable across renders.
  const CINE_SHOTS = useMemo(() => shuffle([
    // --- Wide establishing shots (ground floor centre) ---
    { pos: new Vector3(0, 4, 0), look: new Vector3(0, 6, -30) },
    { pos: new Vector3(0, 5, -15), look: new Vector3(0, 8, 20) },
    { pos: new Vector3(3, 3.5, 10), look: new Vector3(-2, 6, -25) },
    { pos: new Vector3(-3, 3.5, -10), look: new Vector3(2, 7, 15) },
    { pos: new Vector3(0, 6, 20), look: new Vector3(0, 4, -20) },
    // --- Knowledge Tree close-ups ---
    { pos: new Vector3(5, 2, 3), look: new Vector3(0, 10, 0) },
    { pos: new Vector3(-4, 1.8, -3), look: new Vector3(0, 11, 0) },
    { pos: new Vector3(3, 3, -5), look: new Vector3(0, 8, 0) },
    { pos: new Vector3(-6, 2.5, 4), look: new Vector3(0, 12, 0) },
    { pos: new Vector3(0, 1.5, 6), look: new Vector3(0, 9, 0) },
    // --- Table-level detail ---
    { pos: new Vector3(13, 1.5, -10), look: new Vector3(11, 1.2, -15) },
    { pos: new Vector3(-13, 1.5, 5), look: new Vector3(-11, 1.2, 10) },
    { pos: new Vector3(12, 1.4, 20), look: new Vector3(10, 1.0, 25) },
    { pos: new Vector3(-12, 1.6, -20), look: new Vector3(-10, 1.1, -25) },
    // --- Top floor / balcony (heavy coverage) ---
    { pos: new Vector3(22, 11, -20), look: new Vector3(0, 2, 0) },
    { pos: new Vector3(-22, 11, 10), look: new Vector3(0, 3, 0) },
    { pos: new Vector3(22, 10.5, 15), look: new Vector3(-5, 4, -10) },
    { pos: new Vector3(-22, 10.8, -25), look: new Vector3(5, 3, 10) },
    { pos: new Vector3(20, 11.5, 0), look: new Vector3(0, 5, -15) },
    { pos: new Vector3(-20, 12, -35), look: new Vector3(0, 4, -10) },
    { pos: new Vector3(22, 10, 35), look: new Vector3(-3, 2, 15) },
    { pos: new Vector3(-22, 11.2, -5), look: new Vector3(4, 6, -20) },
    { pos: new Vector3(21, 10.8, -40), look: new Vector3(-2, 3, -15) },
    { pos: new Vector3(-21, 11, 40), look: new Vector3(3, 5, 10) },
    { pos: new Vector3(23, 11.5, -10), look: new Vector3(-5, 8, 5) },
    { pos: new Vector3(-23, 10.5, 25), look: new Vector3(5, 7, -5) },
    // --- Top floor looking across atrium ---
    { pos: new Vector3(22, 11, 0), look: new Vector3(-22, 10, -10) },
    { pos: new Vector3(-22, 11, 0), look: new Vector3(22, 10, 10) },
    { pos: new Vector3(22, 12, -30), look: new Vector3(-10, 6, -10) },
    { pos: new Vector3(-22, 12, 30), look: new Vector3(10, 6, 10) },
    // --- Shelf corridors ---
    { pos: new Vector3(24, 2, -15), look: new Vector3(22, 3, -25) },
    { pos: new Vector3(-24, 2, 10), look: new Vector3(-22, 3, 20) },
    { pos: new Vector3(25, 1.8, 5), look: new Vector3(23, 2.5, -5) },
    // --- Corner dramatics ---
    { pos: new Vector3(26, 2, -42), look: new Vector3(0, 5, 0) },
    { pos: new Vector3(-26, 2, 42), look: new Vector3(0, 6, 0) },
    { pos: new Vector3(25, 2.5, 40), look: new Vector3(-10, 4, -20) },
    // --- Low dramatic (floor level) ---
    { pos: new Vector3(0, 0.4, 10), look: new Vector3(0, 12, 0) },
    { pos: new Vector3(8, 0.3, -15), look: new Vector3(0, 10, 5) },
    { pos: new Vector3(-6, 0.5, 20), look: new Vector3(0, 11, -5) },
    { pos: new Vector3(3, 0.35, -30), look: new Vector3(0, 13, 10) },
    { pos: new Vector3(-10, 0.4, -5), look: new Vector3(2, 9, 8) },
    // --- High ceiling shots ---
    { pos: new Vector3(0, 16, 0), look: new Vector3(0, 4, -10) },
    { pos: new Vector3(5, 18, -10), look: new Vector3(-3, 3, 5) },
    { pos: new Vector3(-5, 15, 8), look: new Vector3(2, 5, -8) },
    // --- Lantern / window details ---
    { pos: new Vector3(10, 5, -35), look: new Vector3(8, 3, -40) },
    { pos: new Vector3(-10, 4.5, 30), look: new Vector3(-8, 3, 35) },
    { pos: new Vector3(15, 6, -20), look: new Vector3(12, 4, -25) },
    // --- Mid-hall cinematic angles ---
    { pos: new Vector3(8, 3, -25), look: new Vector3(-4, 7, 10) },
    { pos: new Vector3(-8, 4, 15), look: new Vector3(5, 6, -15) },
    { pos: new Vector3(6, 2.5, 30), look: new Vector3(-3, 5, -10) },
    { pos: new Vector3(-10, 3.5, -30), look: new Vector3(4, 8, 5) },
  ]), [])

  const pickCine = () => {
    return CINE_SHOTS[Math.floor(Math.random() * CINE_SHOTS.length)]
  }

  const far = useSettings((s) => (s as any).drawDistance === 'ultra' ? 500 : (s as any).drawDistance === 'high' ? 300 : 150)

  useEffect(() => {
    const cam = camRef
    if (!cam) return
    cam.far = far
    cam.updateProjectionMatrix()
  }, [far, camRef])

  // Immediately position the camera at the seat on mount — before the first
  // paint — so the user never sees the default Canvas camera position [0, 1.7, 8]
  // (which faces the exterior windows / country map). Without this, the veil
  // lifts before the first useFrame seeds the camera, causing a flash of the
  // wrong view that only resolves on page refresh.
  useLayoutEffect(() => {
    const cam = camRef
    if (!cam) return
    const seatId = useWorld.getState().seat ?? useSeatFlow.getState().selectedSeatId ?? 0
    const seat = seats[seatId]
    if (!seat) return
    const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE
    cam.position.set(seat.pos[0], eyeY, seat.pos[2])
    camTarget.current.set(seat.pos[0], eyeY - 0.1, seat.pos[2])
    cam.lookAt(camTarget.current)
  }, [camRef, seats])

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
      p.current.preset = 0 // dragging leaves any fixed preset → free orbit
      const isFemale = useAvatar.getState().config.bodyType === 'female'
      const seated = useWorld.getState().seat != null
      if (isFemale && seated) return
      const s = useSettings.getState()
      const k = 0.0032 * s.sensitivity
      p.current.faceYaw -= (e.clientX - d.lx) * k
      p.current.yaw = p.current.faceYaw
      p.current.pitch += (e.clientY - d.ly) * k * (s.invertY ? 1 : -1)
      p.current.pitch = MathUtils.clamp(p.current.pitch, MIN_PITCH, MAX_PITCH)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => {
      drag.current.on = false
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      p.current.preset = 0 // manual zoom leaves any fixed preset
      p.current.zoom = MathUtils.clamp(p.current.zoom + Math.sign(e.deltaY) * 0.6, MIN_ZOOM, MAX_ZOOM)
    }
    const keyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '9') return // cinematic toggle is owned by Explore's key handler
      if (useWorld.getState().cinematic) useWorld.getState().setCinematic(false)
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= 8) {
        const cur = p.current.preset
        if (cur === n) {
          p.current.preset = 0 // re-press the active preset → free orbit
          return
        }
        p.current.preset = n
        const seatId = useWorld.getState().seat
        const seat = seatId != null ? seats[seatId] : undefined
        const pre = SEAT_PRESETS[n - 1]
        if (seat) {
          // Seated preset — orbit around the seat
          p.current.yaw = seat.yaw + pre.yaw
          p.current.pitch = pre.pitch
          p.current.zoom = pre.zoom
        } else {
          // Standing preset — orbit around current player position
          p.current.yaw = p.current.faceYaw + pre.yaw
          p.current.pitch = pre.pitch
          p.current.zoom = pre.zoom
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
    const cinematic = useWorld.getState().cinematic

    // Entering / leaving the shared cinematic tour: tell everyone so the host
    // (smallest active id) can be elected and its camera broadcast to all.
    if (wasCinematic.current && !cinematic) {
      camSeeded.current = false
      st.preset = 0
      cine.current.phase = 'idle'
      cine.current.orbitReady = false
      cineStateSent.current = false
      setLocalCineActive(false)
      publishCineState(false)
      useWorld.getState().setCineFade(0)
      cam.fov = CINE_FOV_BASE
      cam.updateProjectionMatrix()
    }
    if (!wasCinematic.current && cinematic) {
      setLocalCineActive(true)
      publishCineState(true)
      cineStateSent.current = true
    }
    wasCinematic.current = cinematic

    if (cinematic) {
      const c = cine.current
      const selfId = getSelfId()
      const isHost = selfId == null || getCineHostId() === selfId

      // --- host: fade-out → cut → fade-in with slow orbit during dwell ---
      if (isHost) {
        const FADE_SPEED = 1 / 0.8 // fade over 0.8 seconds

        if (c.phase === 'idle') {
          const wp = pickCine()
          c.target.copy(wp.pos)
          c.lookTarget.copy(wp.look)
          c.phase = 'fadeOut'
          c.t = 0
          // Set up orbit so camera moves during the first fade-out too
          c.orbitCenter.copy(cam.position)
          c.orbitLook.copy(camTarget.current)
          c.orbitRadius = 2 + Math.random() * 3
          c.orbitAngle = Math.random() * Math.PI * 2
          c.orbitSpeed = 0.15 + Math.random() * 0.2
          c.orbitTilt = 0.5 + Math.random() * 1.0
          c.orbitReady = true
        } else if (c.phase === 'fadeOut') {
          c.t += dt * FADE_SPEED
          // Keep orbiting while fading out — no sudden freeze
          if (c.orbitReady) {
            c.orbitAngle += c.orbitSpeed * dt
            const ax = c.orbitCenter.x + Math.cos(c.orbitAngle) * c.orbitRadius
            const ay = c.orbitCenter.y + Math.sin(c.orbitAngle * 0.7) * c.orbitTilt
            const az = c.orbitCenter.z + Math.sin(c.orbitAngle) * c.orbitRadius
            cam.position.set(
              MathUtils.clamp(ax, -HALL.halfW + 0.6, HALL.halfW - 0.6),
              MathUtils.clamp(ay, 0.6, HALL.wallH - 0.6),
              MathUtils.clamp(az, -HALL.halfL + 0.6, HALL.halfL - 0.6),
            )
            camTarget.current.copy(c.orbitLook)
            cam.lookAt(camTarget.current)
          }
          if (c.t >= 1) {
            c.t = 1
            // Fully black — teleport camera to new shot while invisible
            cam.position.set(
              MathUtils.clamp(c.target.x, -HALL.halfW + 0.6, HALL.halfW - 0.6),
              MathUtils.clamp(c.target.y, 0.6, HALL.wallH - 0.6),
              MathUtils.clamp(c.target.z, -HALL.halfL + 0.6, HALL.halfL - 0.6),
            )
            camTarget.current.copy(c.lookTarget)
            cam.lookAt(camTarget.current)
            c.phase = 'fadeIn'
            c.t = 1
            c.orbitReady = false
          }
        } else if (c.phase === 'fadeIn') {
          c.t -= dt * FADE_SPEED
          // Start orbiting during fade-in so the camera is already moving
          // when the screen becomes visible — no static frame flash.
          if (c.t > 0.5 && !c.orbitReady) {
            c.orbitCenter.copy(cam.position)
            c.orbitLook.copy(camTarget.current)
            c.orbitRadius = 2 + Math.random() * 3
            c.orbitAngle = Math.random() * Math.PI * 2
            c.orbitSpeed = 0.15 + Math.random() * 0.2
            c.orbitTilt = 0.5 + Math.random() * 1.0
            c.orbitReady = true
          }
          if (c.orbitReady) {
            c.orbitAngle += c.orbitSpeed * dt * 0.6 // start slow, ramp up
            const ax = c.orbitCenter.x + Math.cos(c.orbitAngle) * c.orbitRadius
            const ay = c.orbitCenter.y + Math.sin(c.orbitAngle * 0.7) * c.orbitTilt
            const az = c.orbitCenter.z + Math.sin(c.orbitAngle) * c.orbitRadius
            cam.position.set(
              MathUtils.clamp(ax, -HALL.halfW + 0.6, HALL.halfW - 0.6),
              MathUtils.clamp(ay, 0.6, HALL.wallH - 0.6),
              MathUtils.clamp(az, -HALL.halfL + 0.6, HALL.halfL - 0.6),
            )
            camTarget.current.copy(c.orbitLook)
            cam.lookAt(camTarget.current)
          }
          if (c.t <= 0) {
            c.t = 0
            c.phase = 'dwell'
            c.dwellDur = 5 + Math.random() * 4
            c.t = c.dwellDur
            c.orbitReady = false
          }
        } else if (c.phase === 'dwell') {
          c.t -= dt
          // Slow orbit around the look target
          c.orbitAngle += c.orbitSpeed * dt
          const ax = c.orbitCenter.x + Math.cos(c.orbitAngle) * c.orbitRadius
          const ay = c.orbitCenter.y + Math.sin(c.orbitAngle * 0.7) * c.orbitTilt
          const az = c.orbitCenter.z + Math.sin(c.orbitAngle) * c.orbitRadius
          cam.position.set(
            MathUtils.clamp(ax, -HALL.halfW + 0.6, HALL.halfW - 0.6),
            MathUtils.clamp(ay, 0.6, HALL.wallH - 0.6),
            MathUtils.clamp(az, -HALL.halfL + 0.6, HALL.halfL - 0.6),
          )
          camTarget.current.copy(c.orbitLook)
          cam.lookAt(camTarget.current)
          if (c.t <= 0) {
            const wp = pickCine()
            c.target.copy(wp.pos)
            c.lookTarget.copy(wp.look)
            c.phase = 'fadeOut'
            c.t = 0
          }
        }

        // Map phase+t → overlay opacity
        useWorld.getState().setCineFade(c.phase === 'dwell' ? 0 : c.t)

        // Stream camera to other viewers
        const now = performance.now()
        if (now - cineCamPub.current > 90) {
          cineCamPub.current = now
          publishCineCam(
            [cam.position.x, cam.position.y, cam.position.z],
            [camTarget.current.x, camTarget.current.y, camTarget.current.z],
            cam.fov,
          )
        }
      } else {
        // Receiver: smoothly glide to host camera
        const hostCam = getCineHostCam()
        if (hostCam) {
          _cv.current.set(hostCam.pos[0], hostCam.pos[1], hostCam.pos[2])
          _cv2.current.set(hostCam.look[0], hostCam.look[1], hostCam.look[2])
          cam.position.lerp(_cv.current, 1 - Math.exp(-4 * dt))
          camTarget.current.lerp(_cv2.current, 1 - Math.exp(-4 * dt))
          cam.lookAt(camTarget.current)
          if (typeof hostCam.fov === 'number') {
            cam.fov = hostCam.fov
            cam.updateProjectionMatrix()
          }
        }
      }
      setLocalState({ x: cam.position.x, y: cam.position.y, z: cam.position.z, yaw: 0, speed: 0, grounded: true, seated: false, cinematic: true, timerStartedAt: 0, timerDurationMs: 0, subject: '' })
      return
    }

    const seatId = useWorld.getState().seat

    if (wasSeated.current && seatId == null) {
      camSeeded.current = false
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
        // What are we doing at this desk? Drives the seated pose (laptop →
        // hands on the machine, phone → bent over it, book → held up, else idle).
        l.activity = activityOfAccessories(useAvatar.getState().config.accessories)

        if (!st.seatedInit) {
          st.seatedInit = true
          // Default: face the avatar (see your own character) at a comfy distance.
          st.yaw = seat.yaw
          st.pitch = 0.15
          st.zoom = THIRD_DIST
          st.camDist = THIRD_DIST
          st.preset = 0
          targetYaw.current = seat.yaw
          targetPitch.current = st.pitch
        }

        const eyeY = seat.pos[1] + CHAIR_SEAT_Y + SEAT_EYE

         if (s.cameraMode === 'first') {
          cam.position.set(seat.pos[0], eyeY, seat.pos[2])
          cam.rotation.set(0, seat.yaw + Math.PI, 0)
          setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true, cinematic: false, timerStartedAt: 0, timerDurationMs: 0, subject: '' })
          return
        }

        // --- single smooth third-person orbit around the seated avatar ---
        // Drag aims (st.yaw / st.pitch); we ease the live orbit angles toward
        // them so motion is fluid, never snapping (which read as a flicker).
        targetYaw.current = MathUtils.lerp(targetYaw.current, st.yaw, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        targetPitch.current = MathUtils.lerp(targetPitch.current, st.pitch, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        const dist = MathUtils.clamp(st.zoom, MIN_ZOOM, MAX_ZOOM)
        const cp = Math.cos(targetPitch.current)
        // UNIT direction (length 1) from the seat eye out to the camera.
        const dirX = Math.sin(targetYaw.current) * cp
        const dirY = Math.sin(targetPitch.current)
        const dirZ = Math.cos(targetYaw.current) * cp
        // Pull the camera in if a wall is closer than `dist`, but never collapse
        // to a distance that embeds it in geometry (that z-fights → flicker).
        // Smooth the pull-in distance so a ray that grazes a blocker edge (and
        // would otherwise flip safeDist every frame) eases instead of jumping.
        const hit = rayHit(seat.pos[0], eyeY, seat.pos[2], dirX, dirY, dirZ, dist, collision.blockers)
        const targetSafe = MathUtils.clamp(Math.min(dist, hit - PULL_MARGIN), MIN_SAFE_DIST, dist)
        if (!camSeeded.current) safeDistRef.current = targetSafe
        else safeDistRef.current = MathUtils.lerp(safeDistRef.current, targetSafe, 1 - Math.exp(-10 * dt))
        const safeDist = safeDistRef.current
        const idealX = seat.pos[0] + dirX * safeDist
        const idealY = eyeY + dirY * safeDist
        const idealZ = seat.pos[2] + dirZ * safeDist
        // Seed on the first seated frame so we don't glide in from a stale spot.
        if (!camSeeded.current) { camPos.current.set(idealX, idealY, idealZ); camSeeded.current = true }
        // Stable exponential smoothing — no spring oscillation.
        const a = 1 - Math.exp(-12 * dt)
        camPos.current.x += (idealX - camPos.current.x) * a
        camPos.current.y += (idealY - camPos.current.y) * a
        camPos.current.z += (idealZ - camPos.current.z) * a
        // Hard safety: never let the camera leave the room.
        camPos.current.x = MathUtils.clamp(camPos.current.x, -HALL.halfW + 0.6, HALL.halfW - 0.6)
        camPos.current.z = MathUtils.clamp(camPos.current.z, -HALL.halfL + 0.6, HALL.halfL - 0.6)
        camPos.current.y = MathUtils.clamp(camPos.current.y, seat.pos[1] + 0.2, HALL.wallH - 0.5)
        cam.position.copy(camPos.current)
        camLookTmp.current.set(seat.pos[0], eyeY - 0.1, seat.pos[2])
        camTarget.current.lerp(camLookTmp.current, a)
        cam.lookAt(camTarget.current)
        setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true, cinematic: false, timerStartedAt: 0, timerDurationMs: 0, subject: '' })
      }
      return
    }

    st.seatedInit = false
    st.autoWalkInit = false
    camSeeded.current = false
    // Standing / choosing-a-seat: ensure the broadcast no longer claims we're in
    // the cinematic tour (so our avatar reappears for other players).
    if (st.x !== undefined) {
      if (avatarRef.current) {
        avatarRef.current.position.set(st.x, st.y, st.z)
        avatarRef.current.rotation.y = st.faceYaw
      }

      // Apply camera preset orbit when standing (keys 1-8)
      if (st.preset > 0) {
        const pre = SEAT_PRESETS[st.preset - 1]
        targetYaw.current = MathUtils.lerp(targetYaw.current, st.yaw + pre.yaw, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        targetPitch.current = MathUtils.lerp(targetPitch.current, pre.pitch, 1 - Math.exp(-ORBIT_SMOOTHNESS * dt))
        const dist = MathUtils.clamp(pre.zoom, MIN_ZOOM, MAX_ZOOM)
        const cp = Math.cos(targetPitch.current)
        const sp = Math.sin(targetPitch.current)
        const sy = Math.sin(targetYaw.current)
        const cy = Math.cos(targetYaw.current)
        const eyeY = st.y + 1.62
        const a = 1 - Math.exp(-ORBIT_SMOOTHNESS * dt)
        if (!camSeeded.current) {
          camPos.current.set(
            st.x + Math.sin(targetYaw.current) * dist * cp,
            eyeY + sp * dist,
            st.z + Math.cos(targetYaw.current) * dist * cp,
          )
          camSeeded.current = true
        } else {
          const idealX = st.x + sy * dist * cp
          const idealY = eyeY + sp * dist
          const idealZ = st.z + cy * dist * cp
          camPos.current.x += (idealX - camPos.current.x) * a
          camPos.current.y += (idealY - camPos.current.y) * a
          camPos.current.z += (idealZ - camPos.current.z) * a
        }
        camPos.current.x = MathUtils.clamp(camPos.current.x, -HALL.halfW + 0.6, HALL.halfW - 0.6)
        camPos.current.z = MathUtils.clamp(camPos.current.z, -HALL.halfL + 0.6, HALL.halfL - 0.6)
        camPos.current.y = MathUtils.clamp(camPos.current.y, 0.2, HALL.wallH - 0.5)
        cam.position.copy(camPos.current)
        camLookTmp.current.set(st.x, eyeY - 0.1, st.z)
        camTarget.current.lerp(camLookTmp.current, a)
        cam.lookAt(camTarget.current)
      }

      setLocalState({ x: st.x, y: st.y, z: st.z, yaw: st.faceYaw, speed: 0, grounded: true, seated: false, cinematic: false, timerStartedAt: 0, timerDurationMs: 0, subject: '' })
    }
  })

  const avatarCfg = useAvatar((s) => s.config)
  const seatWorld = useWorld((s) => s.seat)
  const cinematic = useWorld((s) => s.cinematic)
  const cameraModeR = useSettings((s) => s.cameraMode)

  const displayName = useProfile((s) => s.displayName)
  const playerId = useProfile((s) => s.playerId)
  const rank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)
  const country = useProfile((s) => s.data.country)
  const banner = useProfile((s) => s.pub.banner)
  const logo = useProfile((s) => s.pub.logo)
  const localName = displayName || (playerId != null ? `#${playerId}` : 'Explorer')

  return (
    <group ref={avatarRef}>
      {/* Hide the local body in first-person so the seat-eye camera isn't rendered
          inside its own head (which flickers/clips). During the shared cinematic
          tour the local avatar stays visible to the player, but RemotePlayers hides
          it from everyone else (via the `cinematic` flag) so the broadcast feed is
          clean. */}
      <group visible={cinematic || cameraModeR !== 'first'}>
        <CharacterAvatar config={avatarCfg} locomotion={loco} />
        <PlayerNameTag3D name={localName} rank={rank} country={country} playerId={playerId} self headY={2.55} hidden={cinematic} banner={banner} logo={logo} />
        <PlayerTimerBar self headY={2.9} />
      </group>
    </group>
  )
}
