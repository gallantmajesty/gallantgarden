// @ts-nocheck
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera } from 'three'
import { pickSpawn, PLAYER_BOUNDS, FLOOR_Y, platforms, TRAIN_REST_Z, TRACK_W } from './layout'
import { buildCollision, isBlocked, rayHit, PLAYER_RADIUS } from './colliders'
import { isTypingFocused, joystick } from '../library/input'
import { useSettings } from '../../store/settings'
import { useScenePreset } from '../../store/quality'
import { useStation } from '../../store/station'
import { useTrain } from '../../store/train'
import { TRAIN_LINES } from '../../lib/train/lines'
import { platformStatus } from '../../lib/train/schedule'
import { setLocalState } from '../../multiplayer/net'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'
import { stationSpeedRef } from './audio'

// Player controller for walking the concourse and platforms. Behaviourally the
// same first/third-person rig as the Library and Waterfall realms (drag to
// look, WASD/joystick, jump, wheel zoom, 1/2/3 camera) but on a single flat floor
// — no heightfield, no in-station seats (you study INSIDE the train, not on the
// platform). Its extra job is detecting when you're standing in a platform's
// boarding zone and, on E, kicking off boarding for that line. It also broadcasts
// the player's transform to the realm so others see you walking the station.

const WALK = 4.6
const RUN = 8.0
const JUMP_V = 6.2
const GRAVITY = -19
const STAND_EYE = 1.62
const CROUCH_EYE = 1.05
const THIRD_DIST = 5.5
const STEP_UP = 0.5
// boarding zone: standing alongside the berthed train on a platform
const BOARD_Z0 = TRAIN_REST_Z - 2
const BOARD_Z1 = TRAIN_REST_Z + 98

/** Check if a world position is over any track bed (danger zone when train is moving). */
function isOnTrackBed(x: number, z: number): boolean {
  for (const p of platforms()) {
    const trackWest = p.eastX
    const trackEast = p.trackX + TRACK_W / 2 + 1
    if (x >= trackWest && x <= trackEast && z >= PLAT_Z0 && z <= PLAT_Z1) return true
  }
  return false
}

/** Check if the player's line has a train currently boarding (doors open, safe to approach). */
function isTrainBoarding(): boolean {
  const train = useTrain.getState()
  if (!train.line) return false
  return train.phase === 'boarding' || (train.phase === 'traveling' && train.departureSec > 0)
}

export function StationPlayerController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const far = useScenePreset().far
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const avatarConfig = useAvatar((s) => s.config)
  const keys = useRef<Record<string, boolean>>({})
  const collision = useMemo(() => buildCollision(), [])
  const plats = useMemo(() => platforms(), [])
  // Use return position if exiting the train, otherwise pick a concourse spawn.
  const returnPos = useTrain((s) => s.returnPos)
  const spawn = useMemo(() => {
    if (returnPos) return { pos: [returnPos.x, FLOOR_Y, returnPos.z] as [number, number, number], yaw: returnPos.yaw }
    return pickSpawn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const p = useRef({
    x: spawn.pos[0],
    y: FLOOR_Y,
    z: spawn.pos[2],
    vx: 0,
    vz: 0,
    vy: 0,
    yaw: spawn.yaw,
    pitch: 0,
    grounded: true,
    faceYaw: spawn.yaw,
    bob: 0,
    camDist: THIRD_DIST,
    zoom: THIRD_DIST,
    eye: STAND_EYE,
    nearPlat: null as number | null,
  })
  const drag = useRef({ on: false, lx: 0, ly: 0 })

  useEffect(() => {
    const cam = camRef.current
    if (!cam) return
    cam.far = far
    cam.updateProjectionMatrix()
  }, [far])

  // keyboard
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
      // E → board the train at the platform you're standing beside, but ONLY
      // while its doors are open (the live boarding window). Outside that window
      // there is no train to step onto, so boarding is refused and the player
      // waits for the next scheduled arrival (the HUD board shows the countdown).
      if (e.code === 'KeyE') {
        const near = p.current.nearPlat
        if (near != null && useTrain.getState().phase === 'browsing') {
          const line = TRAIN_LINES[near]
          // Only let the player step aboard during the live boarding window — the
          // doors are sealed (locked) the rest of the cycle. Walking up to a
          // departed train just refuses and the platform prompt shows "locked".
          if (platformStatus(line).boardable) useTrain.getState().beginBoarding(line.id)
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
  }, [])

  // drag-to-look + wheel zoom
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
    const blend = 1 - Math.pow(0.0005, dt)
    st.vx = MathUtils.lerp(st.vx, dirX * speed, blend)
    st.vz = MathUtils.lerp(st.vz, dirZ * speed, blend)
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
    // Safety: prevent walking onto track beds when train is not boarding
    if (isOnTrackBed(st.x, st.z) && !isTrainBoarding()) {
      // Push player back to nearest platform edge
      for (const p of platforms()) {
        const trackWest = p.eastX
        if (st.x >= trackWest) {
          st.x = trackWest - PLAYER_RADIUS - 0.1
          break
        }
      }
      st.vx = 0
    }
    if (moving) st.bob += Math.hypot(st.vx, st.vz) * dt
    st.x = MathUtils.clamp(st.x, PLAYER_BOUNDS.minX, PLAYER_BOUNDS.maxX)
    st.z = MathUtils.clamp(st.z, PLAYER_BOUNDS.minZ, PLAYER_BOUNDS.maxZ)

    // gravity / jump on the flat floor
    if (st.grounded && (k['Space'] || joystick.jump)) {
      st.vy = JUMP_V
      st.grounded = false
    }
    st.vy += GRAVITY * dt
    st.y += st.vy * dt
    if (st.y <= FLOOR_Y) {
      st.y = FLOOR_Y
      if (st.vy < 0) st.vy = 0
      st.grounded = true
    } else st.grounded = false

    // camera
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

    // avatar
    const av = avatarRef.current
    if (av) {
      const isDragging = drag.current.on
      av.visible = mode !== 'first' && !(hideAvatarWhenMovingCamera && isDragging)
      av.position.set(st.x, st.y, st.z)
      const prevYaw = av.rotation.y
      const targetYaw = moving ? st.faceYaw : st.yaw
      const dYaw = Math.atan2(Math.sin(targetYaw - prevYaw), Math.cos(targetYaw - prevYaw))
      av.rotation.y = prevYaw + dYaw * (1 - Math.pow(0.001, dt))
      const l = loco.current
      l.seated = false
      l.speed = Math.hypot(st.vx, st.vz)
      l.grounded = st.grounded
      l.vy = st.vy
      l.turnRate = dt > 0 ? (av.rotation.y - prevYaw) / dt : 0
    }

    // broadcast to the realm (net layer throttles + dedupes)
    const horizSpeed = Math.hypot(st.vx, st.vz)
    setLocalState({ x: st.x, y: st.y, z: st.z, yaw: av ? av.rotation.y : st.yaw, speed: horizSpeed, grounded: st.grounded, seated: false })
    // feed station audio for footsteps
    stationSpeedRef.current = horizSpeed

    // Write position to store so boardTrain() can save it for return.
    useStation.getState().setPlayerPos(st.x, st.z, st.yaw)

    // Clear returnPos after first use so next visit uses default spawn.
    if (useTrain.getState().returnPos) useTrain.setState({ returnPos: null })

    // boarding-zone detection: which platform am I standing beside a train on?
    let near: number | null = null
    if (st.z > BOARD_Z0 && st.z < BOARD_Z1) {
      for (const pl of plats) {
        if (st.x > pl.westX && st.x < pl.eastX + TRACK_W) {
          near = pl.index
          break
        }
      }
    }
    st.nearPlat = near
    if (useStation.getState().nearPlatform !== near) useStation.getState().setNearPlatform(near)

    // walk-through boarding: if the player has walked past the platform edge and
    // is close to the train body, auto-trigger boarding — but only during the
    // live boarding window. Outside it the doors are locked and the player is
    // held on the platform (the track-bed guard above keeps them off the rails).
    if (near != null && useTrain.getState().phase === 'browsing') {
      const line = TRAIN_LINES[near]
      const pl = plats[near]
      // player walked past the platform east edge into the track zone
      const distToTrain = Math.abs(st.x - pl.trackX)
      if (distToTrain < 3.8 && platformStatus(line).boardable) {
        useTrain.getState().beginBoarding(line.id)
      }
    }
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
