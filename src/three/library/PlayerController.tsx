import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera } from 'three'
import { HALL, PLAYER_BOUNDS } from './layout'
import { buildCollision, isBlocked, PLAYER_RADIUS, rayHit, topSupport } from './colliders'
import { seatAnchors } from './furniture'
import { isTypingFocused, joystick } from './input'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'
import { setLocalState } from '../../multiplayer/net'

const SEAT_RANGE = 2.0
const SEAT_EYE = 1.16
const WALK = 4.6
const RUN = 8.2
const JUMP_V = 6.6
const GRAVITY = -19
const STAND_EYE = 1.62
const CROUCH_EYE = 1.05
const THIRD_DIST = 5.5

/**
 * Minecraft-style first/third-person controller with AABB collision,
 * gravity, jumping and auto-stepping. Drag to look (sensitivity + invert-Y from
 * settings), WASD to walk, Shift to run, Space to jump, Ctrl to crouch.
 * F1/F2 (or the in-game keys) switch camera modes with a smooth blend.
 */
export function PlayerController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  // Camera far plane follows the View Distance axis (closer = less to draw).
  const far = useScenePreset().far
  // Live locomotion fed to the avatar animator each frame (no React re-renders).
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const avatarConfig = useAvatar((s) => s.config)
  const keys = useRef<Record<string, boolean>>({})
  const collision = useMemo(() => buildCollision(), [])
  const seats = useMemo(() => seatAnchors(), [])

  const p = useRef({
    x: 0,
    y: 0, // feet height
    z: HALL.halfL - 3,
    vx: 0, // smoothed horizontal velocity
    vz: 0,
    vy: 0,
    yaw: 0,
    pitch: 0,
    grounded: true,
    faceYaw: Math.PI,
    bob: 0,
    camDist: THIRD_DIST,
    zoom: THIRD_DIST, // player-controlled third-person distance (mouse wheel)
    eye: STAND_EYE,
    nearSeat: null as number | null,
    seatedInit: false, // one-time framing init when we first sit down
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })

  // Recompute the projection when the far plane (View Distance) changes — setting
  // camera.far alone doesn't refresh the matrix.
  useEffect(() => {
    const cam = camRef.current
    if (!cam) return
    cam.far = far
    cam.updateProjectionMatrix()
  }, [far])

  // keyboard (movement + camera-mode hotkeys)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingFocused()) return
      keys.current[e.code] = true
      // Camera hotkeys disabled — locked to third-person
      if (e.code === 'KeyE' || e.code === 'Escape') {
        const w = useWorld.getState()
        if (w.seat != null) w.stand()
        else if (e.code === 'KeyE' && p.current.nearSeat != null) {
          const seat = seats[p.current.nearSeat]
          if (seat) {
            p.current.yaw = seat.yaw
            p.current.pitch = -0.12
            w.sit(seat.id)
          }
        }
      }
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    // If focus moves into a text field while a movement key is held, drop all
    // held keys so the player doesn't keep walking while the user types.
    const clearHeld = () => {
      keys.current = {}
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('focusin', clearHeld)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('focusin', clearHeld)
    }
  }, [seats])

  // drag-to-look → rotates avatar (faceYaw), camera follows
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
      const s = useSettings.getState()
      const k = 0.0032 * s.sensitivity
      // Rotate avatar facing direction (faceYaw) instead of camera yaw
      p.current.faceYaw -= (e.clientX - d.lx) * k
      // Optional: allow slight pitch for looking up/down
      p.current.pitch += (e.clientY - d.ly) * k * (s.invertY ? 1 : -1)
      p.current.pitch = MathUtils.clamp(p.current.pitch, -1.2, 1.2)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => {
      drag.current.on = false
    }
    // mouse-wheel zoom (third-person distance)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      p.current.zoom = MathUtils.clamp(p.current.zoom + Math.sign(e.deltaY) * 0.6, 2.6, 10)
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
  }, [gl])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const cam = camRef.current
    if (!cam) return
    const s = useSettings.getState()
    const st = p.current
    const k = keys.current

    // ---- seated: lock to the chair, allow a little look-around. Stay in
    //      THIRD-person by default so the player watches their own sitting
    //      animation; only an explicit First-person choice drops to a seat-eye
    //      view (and hides the body, since you'd be looking out of its head). ----
    const seatId = useWorld.getState().seat
    if (seatId != null) {
      const seat = seats[seatId]
      const av = avatarRef.current
      if (seat) {
        // One-time framing when we first sit: start the orbit at a 3/4 side view of
        // the FACE (camera off to the front-side of the desk-facing avatar) and a
        // comfortable distance. Done once so the player can then freely drag around.
        if (!st.seatedInit) {
          st.seatedInit = true
          st.yaw = seat.yaw - Math.PI * 0.65
          st.pitch = 0.12
          st.zoom = 3.6
          st.camDist = 3.6
        }

        st.x = seat.pos[0]
        st.z = seat.pos[2]
        st.y = seat.pos[1]
        st.vx = 0
        st.vz = 0
        st.vy = 0
        st.grounded = true

        // the seated body: parked at the chair, FACING the desk (seat.yaw + π — the
        // avatar's forward is the opposite of the seat heading) so its forward-reaching
        // hands rest on the desktop; loco.seated drives the desk-sit pose + root drop.
        const l = loco.current
        l.seated = true
        l.speed = 0
        l.grounded = true
        l.vy = 0
        l.turnRate = 0
        if (av) {
          av.position.set(seat.pos[0], seat.pos[1], seat.pos[2])
          av.rotation.y = seat.yaw + Math.PI
        }

        const headY = seat.pos[1] + SEAT_EYE
        // Locked third-person: camera behind seated avatar (which faces the desk)
        const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera
        const isDragging = drag.current.on
        if (av) av.visible = mode !== 'first' && !(hideAvatarWhenMovingCamera && isDragging)
        const camYaw = seat.yaw + Math.PI // avatar faces desk, camera behind it
        const camPitch = MathUtils.clamp(st.pitch, -0.5, 0.55)
        const cp = Math.cos(camPitch)
        const fx = -Math.sin(camYaw) * cp
        const fy = Math.sin(camPitch)
        const fz = -Math.cos(camYaw) * cp
        const dist = MathUtils.clamp(st.zoom, 2.4, 6)
        let ox = fx * -1
        let oy = fy * -1 + 0.32
        let oz = fz * -1
        const ol = Math.hypot(ox, oy, oz) || 1
        ox /= ol
        oy /= ol
        oz /= ol
        const hit = rayHit(seat.pos[0], headY, seat.pos[2], ox, oy, oz, dist + 0.4, collision.blockers)
        const d = Math.min(dist, hit - 0.4)
        st.camDist = MathUtils.lerp(st.camDist, Math.max(1.8, d), 1 - Math.pow(0.00005, dt))
        cam.position.set(
          seat.pos[0] + ox * st.camDist,
          Math.max(0.5, headY + oy * st.camDist),
          seat.pos[2] + oz * st.camDist,
        )
        cam.rotation.set(camPitch, camYaw, 0)
        // broadcast the seated pose to the realm (parked at the chair, facing it)
        setLocalState({ x: seat.pos[0], y: seat.pos[1], z: seat.pos[2], yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true })
      }
      return
    }
    // not seated → re-arm the one-time seated framing for next time
    st.seatedInit = false

    // ---- intent ----
    const crouch = !!(k['ControlLeft'] || k['ControlRight'])
    const run = !!(k['ShiftLeft'] || k['ShiftRight'])
    const mz = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0) + joystick.y
    const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) + joystick.x
    const moving = mx !== 0 || mz !== 0

    // target eye height (smooth crouch)
    st.eye = MathUtils.lerp(st.eye, crouch ? CROUCH_EYE : STAND_EYE, 1 - Math.pow(0.001, dt))

    // ---- horizontal movement: smooth accelerate/decelerate toward intent so
    //      walking feels natural with no jitter or snapping ----
    let dirX = 0
    let dirZ = 0
    if (moving) {
      const sinY = Math.sin(st.yaw)
      const cosY = Math.cos(st.yaw)
      dirX = cosY * mx - sinY * mz
      dirZ = -sinY * mx - cosY * mz
      const len = Math.hypot(dirX, dirZ) || 1
      dirX /= len
      dirZ /= len
      st.faceYaw = Math.atan2(dirX, dirZ)
    }
    const speed = (run ? RUN : WALK) * (crouch ? 0.45 : 1)
    const targetVX = dirX * speed
    const targetVZ = dirZ * speed
    // snappy accel, smooth stop
    const blend = 1 - Math.pow(0.0005, dt)
    st.vx = MathUtils.lerp(st.vx, targetVX, blend)
    st.vz = MathUtils.lerp(st.vz, targetVZ, blend)
    if (!moving && Math.hypot(st.vx, st.vz) < 0.04) {
      st.vx = 0
      st.vz = 0
    }

    const lo = st.y + 0.62 // auto-step: ignore knee-high obstacles
    const hi = st.y + st.eye
    // move axis-by-axis so we slide cleanly along walls instead of sticking
    const nx = st.x + st.vx * dt
    if (!isBlocked(nx, st.z, PLAYER_RADIUS, lo, hi, collision.blockers)) st.x = nx
    else st.vx = 0
    const nz = st.z + st.vz * dt
    if (!isBlocked(st.x, nz, PLAYER_RADIUS, lo, hi, collision.blockers)) st.z = nz
    else st.vz = 0
    if (moving) st.bob += Math.hypot(st.vx, st.vz) * dt
    st.x = MathUtils.clamp(st.x, PLAYER_BOUNDS.minX, PLAYER_BOUNDS.maxX)
    st.z = MathUtils.clamp(st.z, PLAYER_BOUNDS.minZ, PLAYER_BOUNDS.maxZ)

    // ---- gravity, ground support, auto-step, jump ----
    const support = topSupport(st.x, st.z, st.y, collision.surfaces)
    if (st.grounded && (k['Space'] || joystick.jump)) {
      st.vy = JUMP_V
      st.grounded = false
    }
    st.vy += GRAVITY * dt
    st.y += st.vy * dt
    if (st.y <= support) {
      st.y = support
      if (st.vy < 0) st.vy = 0
      st.grounded = true
    } else {
      st.grounded = false
    }

    // ---- camera placement per mode ----
    const headY = st.y + st.eye
    const mode = s.cameraMode
    const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera

    // ---- camera placement: locked third-person (always behind avatar) ----
    // Camera follows avatar's faceYaw so it stays glued to the back
    const camYaw = st.faceYaw
    const camPitch = st.pitch // slight up/down look preserved
    const cp = Math.cos(camPitch)
    const fx = -Math.sin(camYaw) * cp
    const fy = Math.sin(camPitch)
    const fz = -Math.cos(camYaw) * cp
    const dist = st.zoom
    // unit offset from head toward camera (slightly raised), pulled BEHIND avatar
    let ox = fx * -1
    let oy = fy * -1 + 0.32
    let oz = fz * -1
    const ol = Math.hypot(ox, oy, oz) || 1
    ox /= ol
    oy /= ol
    oz /= ol
    // collision pull-in
    const hit = rayHit(st.x, headY, st.z, ox, oy, oz, dist + 0.4, collision.blockers)
    const d = Math.min(dist, hit - 0.4)
    st.camDist = MathUtils.lerp(st.camDist, Math.max(2.8, d), 1 - Math.pow(0.00005, dt))
    cam.position.set(st.x + ox * st.camDist, Math.max(0.5, headY + oy * st.camDist), st.z + oz * st.camDist)
    cam.rotation.set(camPitch, camYaw, 0)

    // ---- avatar ----
    const av = avatarRef.current
    if (av) {
      const isDragging = drag.current.on
      av.visible = mode !== 'first' && !(hideAvatarWhenMovingCamera && isDragging)
      av.position.set(st.x, st.y, st.z)
      const prevYaw = av.rotation.y
      // Smooth body turn along the SHORTEST arc: ease over the wrapped delta so a
      // heading change across ±π (e.g. spinning around) rotates the short way
      // instead of unwinding a near-full turn (the old "sudden 180° flip").
      const dYaw = Math.atan2(Math.sin(st.faceYaw + Math.PI - prevYaw), Math.cos(st.faceYaw + Math.PI - prevYaw))
      av.rotation.y = prevYaw + dYaw * (1 - Math.pow(0.001, dt))
      // feed the procedural animator: horizontal speed drives the gait, grounded
      // / vy drive jump+land, and the smoothed facing delta drives turn-lean.
      const l = loco.current
      l.seated = false
      l.speed = Math.hypot(st.vx, st.vz)
      l.grounded = st.grounded
      l.vy = st.vy
      l.turnRate = dt > 0 ? (av.rotation.y - prevYaw) / dt : 0
      // broadcast our transform + motion to the realm (the net layer throttles to
      // ~10Hz and only sends when something changed — see multiplayer/net.ts)
      setLocalState({ x: st.x, y: st.y, z: st.z, yaw: av.rotation.y, speed: l.speed, grounded: st.grounded, seated: false })
    }

    // ---- nearest sittable seat (for the "Press E to sit" prompt) ----
    let best: number | null = null
    let bestD = SEAT_RANGE * SEAT_RANGE
    for (const se of seats) {
      if (Math.abs(se.pos[1] - st.y) > 1.6) continue
      const dx = se.pos[0] - st.x
      const dz = se.pos[2] - st.z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = se.id
      }
    }
    st.nearSeat = best
    if (useWorld.getState().near !== best) useWorld.getState().setNear(best)
  })

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault fov={72} near={0.08} far={far} rotation-order="YXZ" />
      {/* The player's body: the chosen pre-built character, animated in-world by
          its own baked locomotion clips (CharacterAvatar reads `loco` every
          frame). Visibility is re-asserted every frame (hidden only in
          first-person / while seated); we start it visible so the character is
          on-screen immediately in the default third-person view rather than
          flashing in after the first frame. Falls back to a procedural rig until
          the character's .glb is baked in. */}
      <group ref={avatarRef} visible={useSettings.getState().cameraMode !== 'first'}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} />
      </group>
    </>
  )
}
