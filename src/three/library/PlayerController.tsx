import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera } from 'three'
import { HALL, PLAYER_BOUNDS } from './layout'
import { buildCollision, isBlocked, PLAYER_RADIUS, rayHit, topSupport } from './colliders'
import { seatAnchors } from './furniture'
import { isTypingFocused, joystick } from './input'
import { useSettings } from '../../store/settings'
import { useWorld } from '../../store/world'
import { AvatarRig, type AvatarRigHandle } from '../../avatar/AvatarRig'
import { AvatarAnimator } from '../../avatar/AvatarAnimator'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'

const SEAT_RANGE = 2.0
const SEAT_EYE = 1.16
const WALK = 4.6
const RUN = 8.2
const JUMP_V = 6.6
const GRAVITY = -19
const STAND_EYE = 1.62
const CROUCH_EYE = 1.05
const THIRD_DIST = 5.5
const FRONT_DIST = 4.2

/**
 * Minecraft-style first/third/front-person controller with AABB collision,
 * gravity, jumping and auto-stepping. Drag to look (sensitivity + invert-Y from
 * settings), WASD to walk, Shift to run, Space to jump, Ctrl to crouch.
 * F1/F2/F3 (or the in-game keys) switch camera modes with a smooth blend.
 */
export function PlayerController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const rigHandle = useRef<AvatarRigHandle>(null)
  // Live locomotion fed to the avatar animator each frame (no React re-renders).
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0 })
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
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })

  // keyboard (movement + camera-mode hotkeys)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Text entry always wins: while an input / textarea / note editor / modal
      // field is focused, every world hotkey is suppressed so the key (E, W,
      // Space, …) types normally instead of driving the player.
      if (isTypingFocused()) return
      keys.current[e.code] = true
      if (e.code === 'F1') useSettings.getState().set('cameraMode', 'first')
      if (e.code === 'F2') useSettings.getState().set('cameraMode', 'third')
      if (e.code === 'F3') useSettings.getState().set('cameraMode', 'front')
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

  // drag-to-look
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
      p.current.yaw -= (e.clientX - d.lx) * k
      p.current.pitch += (e.clientY - d.ly) * k * (s.invertY ? 1 : -1)
      p.current.pitch = MathUtils.clamp(p.current.pitch, -1.2, 1.2)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => {
      drag.current.on = false
    }
    // mouse-wheel zoom (third / front person distance)
    const wheel = (e: WheelEvent) => {
      if (useSettings.getState().cameraMode === 'first') return
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

    // ---- seated: lock to the chair, allow a little look-around ----
    const seatId = useWorld.getState().seat
    if (seatId != null) {
      const seat = seats[seatId]
      if (seat) {
        st.x = seat.pos[0]
        st.z = seat.pos[2]
        st.y = seat.pos[1]
        st.vy = 0
        st.yaw = MathUtils.clamp(st.yaw, seat.yaw - 0.9, seat.yaw + 0.9)
        st.pitch = MathUtils.clamp(st.pitch, -0.7, 0.4)
        cam.position.set(seat.pos[0], seat.pos[1] + SEAT_EYE, seat.pos[2])
        cam.rotation.set(st.pitch, st.yaw, 0)
      }
      if (avatarRef.current) avatarRef.current.visible = false
      return
    }

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
    const cp = Math.cos(st.pitch)
    const fx = -Math.sin(st.yaw) * cp
    const fy = Math.sin(st.pitch)
    const fz = -Math.cos(st.yaw) * cp
    const mode = s.cameraMode

    if (mode === 'first') {
      // a hair of head-bob while walking, set directly for zero lag/jitter
      const bobY = Math.sin(st.bob * 9) * Math.min(0.04, Math.hypot(st.vx, st.vz) * 0.012)
      cam.position.set(st.x, headY + bobY, st.z)
      cam.rotation.set(st.pitch, st.yaw, 0)
    } else {
      const dir = mode === 'front' ? 1 : -1 // in front vs behind
      const dist = mode === 'front' ? FRONT_DIST : st.zoom
      // unit offset from the head toward the camera (slightly raised)
      let ox = -fx * dir
      let oy = -fy * dir + 0.32
      let oz = -fz * dir
      const ol = Math.hypot(ox, oy, oz) || 1
      ox /= ol
      oy /= ol
      oz /= ol
      // pull the camera in if a wall/pillar is between it and the player
      const hit = rayHit(st.x, headY, st.z, ox, oy, oz, dist + 0.4, collision.blockers)
      const d = Math.min(dist, hit - 0.4)
      st.camDist = MathUtils.lerp(st.camDist, Math.max(1.4, d), 1 - Math.pow(0.00005, dt))
      cam.position.set(st.x + ox * st.camDist, Math.max(0.5, headY + oy * st.camDist), st.z + oz * st.camDist)
      if (mode === 'front') cam.rotation.set(-st.pitch, st.yaw + Math.PI, 0)
      else cam.rotation.set(st.pitch, st.yaw, 0)
    }

    // ---- avatar ----
    const av = avatarRef.current
    if (av) {
      av.visible = mode !== 'first'
      av.position.set(st.x, st.y, st.z)
      const prevYaw = av.rotation.y
      av.rotation.y = MathUtils.lerp(av.rotation.y, st.faceYaw, 1 - Math.pow(0.001, dt))
      // feed the procedural animator: horizontal speed drives the gait, grounded
      // / vy drive jump+land, and the smoothed facing delta drives turn-lean.
      const l = loco.current
      l.speed = Math.hypot(st.vx, st.vz)
      l.grounded = st.grounded
      l.vy = st.vy
      l.turnRate = dt > 0 ? (av.rotation.y - prevYaw) / dt : 0
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
      <PerspectiveCamera ref={camRef} makeDefault fov={72} near={0.08} far={1400} rotation-order="YXZ" />
      {/* The player's body: a procedural rig driven by the shared AvatarAnimator.
          Hidden in first-person (toggled each frame). The animator is a sibling
          driver (renders nothing) and reads `loco` every frame. */}
      <group ref={avatarRef} visible={false}>
        <AvatarRig ref={rigHandle} config={avatarConfig} />
      </group>
      <AvatarAnimator rig={rigHandle} locomotion={loco} lod="near" />
    </>
  )
}
