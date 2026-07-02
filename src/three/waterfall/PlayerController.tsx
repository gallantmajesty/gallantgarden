import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera } from 'three'
import { PLAYER_BOUNDS, SPAWN, WATER_LEVEL } from './layout'
import { buildCollision, groundAt } from './colliders'
// the generic AABB math is shared with the Library realm (imported in place; the
// Library files are NOT modified by this realm)
import { isBlocked, PLAYER_RADIUS, rayHit } from '../library/colliders'
import { campSeatAnchors } from './seats'
import { isTypingFocused, joystick } from '../library/input'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useWorld } from '../../store/world'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
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
// the shallow lake + low decks mean a generous step-up feels natural (you wade
// up onto a deck/bench platform); the elevated Stone Terrace still needs stairs.
const STEP_UP = 1.1

/**
 * Player controller for the Waterfall Realm. Behaviourally identical to the
 * Library's (first/third camera, gravity, jump, drag-look, wheel zoom,
 * seated study-desk orbit, touch joystick) — copied deliberately so the Library
 * stays untouched — but it walks on the continuous terrain HEIGHTFIELD
 * (layout.terrainHeight via colliders.groundAt) plus the raised camp/deck/bridge
 * surfaces, and reads the realm's own collision, seats and spawn.
 */
export function PlayerController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const far = useScenePreset().far
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const avatarConfig = useAvatar((s) => s.config)
  const keys = useRef<Record<string, boolean>>({})
  const collision = useMemo(() => buildCollision(), [])
  const seats = useMemo(() => campSeatAnchors(), [])

  const p = useRef({
    x: SPAWN.pos[0],
    y: SPAWN.pos[1], // feet height
    z: SPAWN.pos[2],
    vx: 0,
    vz: 0,
    vy: 0,
    yaw: SPAWN.yaw,
    pitch: 0,
    grounded: true,
    faceYaw: SPAWN.yaw,
    bob: 0,
    camDist: THIRD_DIST,
    zoom: THIRD_DIST,
    eye: STAND_EYE,
    nearSeat: null as number | null,
    seatedInit: false,
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })

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
      if (e.code === 'F1') useSettings.getState().set('cameraMode', 'first')
      if (e.code === 'F2') useSettings.getState().set('cameraMode', 'third')
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'Digit1') useSettings.getState().set('cameraMode', 'first')
        if (e.code === 'Digit2') useSettings.getState().set('cameraMode', 'third')
      }
      if (e.code === 'F5') {
        e.preventDefault()
        const order = ['first', 'third'] as const
        const cur = useSettings.getState().cameraMode
        const next = order[(order.indexOf(cur) + 1) % order.length]
        useSettings.getState().set('cameraMode', next)
      }
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

    // ---- seated: lock to the seat, orbit around the seated avatar ----
    const seatId = useWorld.getState().seat
    if (seatId != null) {
      const seat = seats[seatId]
      const av = avatarRef.current
      if (seat) {
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
        if (s.cameraMode === 'first') {
          if (av) av.visible = false
          st.yaw = MathUtils.clamp(st.yaw, seat.yaw - 0.9, seat.yaw + 0.9)
          st.pitch = MathUtils.clamp(st.pitch, -0.7, 0.4)
          cam.position.set(seat.pos[0], headY, seat.pos[2])
          cam.rotation.set(st.pitch, st.yaw, 0)
        } else {
          const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera
          const isDragging = drag.current.on
          if (av) av.visible = !(hideAvatarWhenMovingCamera && isDragging)
          st.yaw = MathUtils.clamp(st.yaw, seat.yaw - Math.PI, seat.yaw + Math.PI)
          st.pitch = MathUtils.clamp(st.pitch, -0.5, 0.55)
          const dist = MathUtils.clamp(st.zoom, 2.4, 6)
          const cp = Math.cos(st.pitch)
          const ox = Math.sin(st.yaw) * cp
          const oy = Math.sin(st.pitch)
          const oz = Math.cos(st.yaw) * cp
          const hit = rayHit(seat.pos[0], headY, seat.pos[2], ox, oy, oz, dist + 0.4, collision.blockers)
          const d = Math.min(dist, hit - 0.4)
          st.camDist = MathUtils.lerp(st.camDist, Math.max(1.8, d), 1 - Math.pow(0.00005, dt))
          cam.position.set(seat.pos[0] + ox * st.camDist, Math.max(0.5, headY + oy * st.camDist), seat.pos[2] + oz * st.camDist)
          cam.lookAt(seat.pos[0], headY - 0.15, seat.pos[2])
        }
      }
      return
    }
    st.seatedInit = false

    // ---- intent ----
    const crouch = !!(k['ControlLeft'] || k['ControlRight'])
    const run = !!(k['ShiftLeft'] || k['ShiftRight'])
    const mz = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0) + joystick.y
    const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0) + joystick.x
    const moving = mx !== 0 || mz !== 0

    st.eye = MathUtils.lerp(st.eye, crouch ? CROUCH_EYE : STAND_EYE, 1 - Math.pow(0.001, dt))

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
    const blend = 1 - Math.pow(0.0005, dt)
    st.vx = MathUtils.lerp(st.vx, targetVX, blend)
    st.vz = MathUtils.lerp(st.vz, targetVZ, blend)
    if (!moving && Math.hypot(st.vx, st.vz) < 0.04) {
      st.vx = 0
      st.vz = 0
    }

    const lo = st.y + STEP_UP
    const hi = st.y + st.eye
    const nx = st.x + st.vx * dt
    if (!isBlocked(nx, st.z, PLAYER_RADIUS, lo, hi, collision.blockers)) st.x = nx
    else st.vx = 0
    const nz = st.z + st.vz * dt
    if (!isBlocked(st.x, nz, PLAYER_RADIUS, lo, hi, collision.blockers)) st.z = nz
    else st.vz = 0
    if (moving) st.bob += Math.hypot(st.vx, st.vz) * dt
    st.x = MathUtils.clamp(st.x, PLAYER_BOUNDS.minX, PLAYER_BOUNDS.maxX)
    st.z = MathUtils.clamp(st.z, PLAYER_BOUNDS.minZ, PLAYER_BOUNDS.maxZ)

    // ---- gravity, ground support (terrain heightfield + platforms), jump ----
    // Clamp the wade floor so the player never sinks deep into the lake basin
    // (feet stay just below the water surface → ankle-deep wading, never waist).
    const support = Math.max(groundAt(st.x, st.z, st.y, STEP_UP, collision.surfaces), WATER_LEVEL - 0.2)
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
    const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera

    if (mode === 'first') {
      const bobY = Math.sin(st.bob * 9) * Math.min(0.04, Math.hypot(st.vx, st.vz) * 0.012)
      cam.position.set(st.x, headY + bobY, st.z)
      cam.rotation.set(st.pitch, st.yaw, 0)
    } else {
      const dir = -1
      const dist = st.zoom
      let ox = fx * dir
      let oy = fy * dir + 0.32
      let oz = fz * dir
      const ol = Math.hypot(ox, oy, oz) || 1
      ox /= ol
      oy /= ol
      oz /= ol
      const hit = rayHit(st.x, headY, st.z, ox, oy, oz, dist + 0.4, collision.blockers)
      const d = Math.min(dist, hit - 0.4)
      st.camDist = MathUtils.lerp(st.camDist, Math.max(2.8, d), 1 - Math.pow(0.00005, dt))
      cam.position.set(st.x + ox * st.camDist, Math.max(0.5, headY + oy * st.camDist), st.z + oz * st.camDist)
      cam.rotation.set(st.pitch, st.yaw, 0)
    }

    // ---- avatar ----
    const av = avatarRef.current
    if (av) {
      const isDragging = drag.current.on
      av.visible = mode !== 'first' && !(hideAvatarWhenMovingCamera && isDragging)
      av.position.set(st.x, st.y, st.z)
      const prevYaw = av.rotation.y
      const dYaw = Math.atan2(Math.sin(st.faceYaw + Math.PI - prevYaw), Math.cos(st.faceYaw + Math.PI - prevYaw))
      av.rotation.y = prevYaw + dYaw * (1 - Math.pow(0.001, dt))
      const l = loco.current
      l.seated = false
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
      <PerspectiveCamera ref={camRef} makeDefault fov={72} near={0.08} far={far} rotation-order="YXZ" />
      <group ref={avatarRef} visible={useSettings.getState().cameraMode !== 'first'}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} />
      </group>
    </>
  )
}
