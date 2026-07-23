import { useEffect, useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { HALL } from './layout'
import { buildCollision, rayHit } from './colliders'
import { seatAnchors, GALLERY_FRONT_Z } from './furniture'
import { useSettings } from '../../store/settings'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { setLocalState, getCineHostId, getCineHostCam, publishCineCam, publishCineState, setLocalCineActive, getSelfId } from '../../multiplayer/net'
import { useSeatFlow } from '../../store/seatFlow'
import { EmoteLabel } from './EmoteLabel'
import { useAvatar } from '../../avatar/store'
import { useProfile } from '../../store/profile'
import { PlayerNameTag3D } from './PlayerNameTag3D'

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

/** Smooth ease so the cinematic glide never snaps (which would read as a flicker). */
function smoothstep(x: number): number {
  const t = MathUtils.clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

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
  const loco = useRef({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const seats = useMemo(() => seatAnchors(), [])
  const collision = useMemo(() => buildCollision(), [])
  const { gl, camera: camRef } = useThree() as any

  const camPos = useRef(new Vector3())
  const camTarget = useRef(new Vector3())
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

  // Cinematic tour (key 9 / overlay button): the camera glides between random
  // vantage points across the whole hall. `from`/`to` are camera positions,
  // `lookFrom`/`lookTo` the aim points; we ease between them, dwell, then pick
  // a fresh random waypoint.
  const cine = useRef({
    from: new Vector3(),
    to: new Vector3(),
    lookFrom: new Vector3(),
    lookTo: new Vector3(),
    fovFrom: 68,
    fovTo: 68,
    t: 0,
    dur: 1,
    dwell: 0,
    active: false,
  })
  const CINE_FOV_BASE = 68
  // Shared cinematic: scratch vectors + a publish throttle so the host only
  // streams its camera ~11×/sec rather than every frame.
  const _cv = useRef(new Vector3())
  const _cv2 = useRef(new Vector3())
  const cineCamPub = useRef(0)
  const cineStateSent = useRef(false)
  const wasCinematic = useRef(false)

  const pickCine = () => {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const side = Math.random() < 0.5 ? -1 : 1
    const roll = Math.random()
    // The tour lives on the UPPER FLOOR — the magical, meditative vantage points.
    // We stand at a gallery rail and gaze across the Great Hall: the Knowledge
    // Tree, the lantern glow, the opposite balcony. Waypoints are pulled well
    // clear of any furniture (the reading tables are at x = ±13 on the ground
    // floor and x = ±23.5 on the galleries) so the camera never dives into a
    // desk or a chair.
    if (roll < 0.5) {
      // Balcony overlook — gaze down/across the nave from the OUTER rail, well
      // clear of the upper-floor tables that sit at x = ±23.5.
      const x = side * (HALL.halfW - 1.5)
      const z = rnd(-HALL.halfL + 6, GALLERY_FRONT_Z - 3)
      const pos = new Vector3(x, HALL.balconyY + rnd(1.2, 2.4), z)
      const look = new Vector3(-side * rnd(2, 12), rnd(2, 7), rnd(-HALL.halfL + 6, HALL.halfL - 6))
      return { pos, look }
    }
    if (roll < 0.78) {
      // Upper-gallery stroll — roam the outer rail (x ≈ ±26.5), clear of tables.
      const x = side * (HALL.halfW - 1.5)
      const z = rnd(-HALL.halfL + 4, GALLERY_FRONT_Z)
      const pos = new Vector3(x, HALL.balconyY + rnd(1.0, 1.8), z)
      const look = new Vector3(side * rnd(4, 12), HALL.balconyY + rnd(0, 2.5), z + rnd(-10, 10))
      return { pos, look }
    }
    // A gentle, pulled-back hall-level establishing shot, kept in the clear
    // CENTRAL AISLE (|x| < 9 — the desk columns live only at x = ±13) so the
    // camera never ends up inside a reading table.
    const y = rnd(2.2, 4.5)
    const x = rnd(-9, 9)
    const z = rnd(-HALL.halfL * 0.35, HALL.halfL * 0.35)
    const look = new Vector3(rnd(-5, 5), rnd(3, 8), rnd(-HALL.halfL + 4, HALL.halfL - 4))
    return { pos: new Vector3(x, y, z), look }
  }

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
      if (useWorld.getState().seat == null) return
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
        if (seat) {
          const pre = SEAT_PRESETS[n - 1]
          // Set the orbit target angles; the per-frame easing glides there.
          p.current.yaw = seat.yaw + pre.yaw
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
      cine.current.active = false
      cineStateSent.current = false
      setLocalCineActive(false)
      publishCineState(false)
      // restore the camera's normal field of view
      cam.fov = CINE_FOV_BASE
      cam.updateProjectionMatrix()
    }
  if (!wasCinematic.current && cinematic) {
    setLocalCineActive(true)
    publishCineState(true)
    cineStateSent.current = true
    cinePosSent.current = false
  }
  wasCinematic.current = cinematic

  if (cinematic) {
    if (!cinePosSent.current) {
      cinePosSent.current = true
      setLocalState({ x: cam.position.x, y: cam.position.y, z: cam.position.z, yaw: 0, speed: 0, grounded: true, seated: false, cinematic: true })
    }
      const c = cine.current
      if (!c.active) {
        c.from.copy(cam.position)
        c.lookFrom.copy(camTarget.current)
        const wp = pickCine()
        c.to.copy(wp.pos)
        c.lookTo.copy(wp.look)
        c.fovFrom = cam.fov
        c.fovTo = cam.fov
        c.t = 0
        c.dur = 5 + Math.random() * 3
        c.dwell = 0
        c.active = true
      }
      // The player with the smallest id among those in cinematic drives + broadcasts
      // the camera; every other cinematic viewer renders that same shared feed.
      const selfId = getSelfId()
      const isHost = selfId == null || getCineHostId() === selfId
      if (isHost) {
        if (c.dwell > 0) {
          c.dwell -= dt
        } else {
          c.t += dt / c.dur
          if (c.t >= 1) {
            c.t = 1
            c.dwell = 2 + Math.random() * 1
          }
          const e = smoothstep(c.t)
          const px = c.from.x + (c.to.x - c.from.x) * e
          const py = c.from.y + (c.to.y - c.from.y) * e
          const pz = c.from.z + (c.to.z - c.from.z) * e
          const lx = c.lookFrom.x + (c.lookTo.x - c.lookFrom.x) * e
          const ly = c.lookFrom.y + (c.lookTo.y - c.lookFrom.y) * e
          const lz = c.lookFrom.z + (c.lookTo.z - c.lookFrom.z) * e
          cam.position.set(
            MathUtils.clamp(px, -HALL.halfW + 0.6, HALL.halfW - 0.6),
            MathUtils.clamp(py, 0.6, HALL.wallH - 0.6),
            MathUtils.clamp(pz, -HALL.halfL + 0.6, HALL.halfL - 0.6),
          )
          camTarget.current.set(lx, ly, lz)
          cam.lookAt(camTarget.current)
          cam.fov = c.fovFrom + (c.fovTo - c.fovFrom) * e
          cam.updateProjectionMatrix()
          if (c.t >= 1 && c.dwell > 0) {
            c.from.copy(cam.position)
            c.lookFrom.copy(camTarget.current)
            const wp = pickCine()
            c.to.copy(wp.pos)
            c.lookTo.copy(wp.look)
            c.fovFrom = cam.fov
            c.fovTo = cam.fov
            c.t = 0
            c.dur = 5 + Math.random() * 3
          }
        }
        // Stream the authoritative camera to the other cinematic viewers.
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
        // Receiver: glide toward the shared host camera.
        const hostCam = getCineHostCam()
        if (hostCam) {
          const k = 1 - Math.exp(-12 * dt)
          _cv.current.set(hostCam.pos[0], hostCam.pos[1], hostCam.pos[2])
          _cv2.current.set(hostCam.look[0], hostCam.look[1], hostCam.look[2])
          cam.position.lerp(_cv.current, k)
          camTarget.current.lerp(_cv2.current, k)
          cam.lookAt(camTarget.current)
          if (typeof hostCam.fov === 'number') {
            cam.fov = MathUtils.lerp(cam.fov, hostCam.fov, k)
            cam.updateProjectionMatrix()
          }
        }
      }
      setLocalState({ x: cam.position.x, y: cam.position.y, z: cam.position.z, yaw: 0, speed: 0, grounded: true, seated: false, cinematic: true })
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
          setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true, cinematic: false })
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
        setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true, cinematic: false })
      }
      return
    }

    st.seatedInit = false
    st.autoWalkInit = false
    st.preset = 0
    camSeeded.current = false
    // Standing / choosing-a-seat: ensure the broadcast no longer claims we're in
    // the cinematic tour (so our avatar reappears for other players).
    if (st.x !== undefined) {
      setLocalState({ x: st.x, y: st.y, z: st.z, yaw: st.faceYaw, speed: 0, grounded: true, seated: false, cinematic: false })
    }
  })

  const avatarCfg = useAvatar((s) => s.config)
  const seatWorld = useWorld((s) => s.seat)
  const cinematic = useWorld((s) => s.cinematic)
  const cameraModeR = useSettings((s) => s.cameraMode)

  const displayName = useProfile((s) => s.displayName)
  const playerId = useProfile((s) => s.playerId)
  const rank = useProfile((s) => s.data.rank)
  const country = useProfile((s) => s.data.country)
  const localName = displayName || (playerId != null ? `#${playerId}` : 'Explorer')

  return (
    <group ref={avatarRef}>
      {/* Hide the local body in first-person so the seat-eye camera isn't rendered
          inside its own head (which flickers/clips). During the shared cinematic
          tour the local avatar stays visible to the player, but RemotePlayers hides
          it from everyone else (via the `cinematic` flag) so the broadcast feed is
          clean. */}
      <group visible={cinematic || (seatWorld != null && cameraModeR !== 'first')}>
        <CharacterAvatar config={avatarCfg} locomotion={loco} />
        <PlayerNameTag3D name={localName} rank={rank} country={country} playerId={playerId} self headY={2.55} hidden={cinematic} />
      </group>
    </group>
  )
}
