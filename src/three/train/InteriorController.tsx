import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera, MeshStandardMaterial, type Mesh } from 'three'
import { carriageSeats, CARRIAGE, AISLE, AISLE_WALK_SPEED, VESTIBULE, findNearestSeat, nearestSeatRef, isSeatTaken } from './interior'
import { isTypingFocused } from '../library/input'
import { useSettings } from '../../store/settings'
import { useTrain } from '../../store/train'
import { setLocalState } from '../../multiplayer/net'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'
import { updateFrustum } from './optimization/CullingManager'

// Standing EYE height (same as station walking).
const STAND_EYE = 1.58
// Seated eye height when settled in the seat.
const SEAT_EYE = 1.2
// Base camera FOV; first-person scroll zooms subtly between 0.8× and 1.2× of it
// (spec 1.6 — "Scroll wheel: zoom in/out (subtle, 0.8x to 1.2x FOV)").
const BASE_FOV = 70

export function InteriorController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const glowRef = useRef<Mesh>(null)
  const glowMatRef = useRef<MeshStandardMaterial>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const avatarConfig = useAvatar((s) => s.config)
  const seats = useMemo(() => carriageSeats(), [])
  const seatIndex = useTrain((s) => s.seat)
  const seated = seatIndex !== null
  const phase = useTrain((s) => s.phase)
  const departureSec = useTrain((s) => s.departureSec)
  const prevPhase = useRef(phase)
  const prevDepartureRef = useRef(departureSec)

  // Shared drag-look state for both standing and seated modes.
  const view = useRef({ yaw: VESTIBULE.yaw, pitch: 0.05, zoom: 3.0, camDist: 3.0 })
  const drag = useRef({ on: false, lx: 0, ly: 0 })
  // 0 = standing, 1 = fully seated. Eases in on sit-down, back out on arrival.
  const seatedness = useRef(0)
  // Standing position.
  const stand = useRef({ x: VESTIBULE.pos[0], z: VESTIBULE.pos[2], bob: 0 })
  const keys = useRef<Record<string, boolean>>({})
  // Window auto-pan: smoothly turns camera to nearest window on journey start,
  // then hands back control after a few seconds.
  const autoPan = useRef({ active: false, startYaw: 0, targetYaw: 0, t: 0, duration: 3.0 })
  // First-person FOV zoom ref (spec 1.6); restored to BASE_FOV on mount.
  const fov = useRef(BASE_FOV)

  // ── drag-look + wheel zoom (shared between standing and seated) ──────────

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
      view.current.yaw -= (e.clientX - d.lx) * k
      view.current.pitch += (e.clientY - d.ly) * k * (s.invertY ? 1 : -1)
      view.current.pitch = MathUtils.clamp(view.current.pitch, seated ? -0.7 : -1.2, seated ? 0.7 : 1.2)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => (drag.current.on = false)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      if (useSettings.getState().cameraMode === 'first') {
        // Subtle FOV zoom (0.8×–1.2×) while seated/standing in first person.
        fov.current = MathUtils.clamp(
          fov.current + Math.sign(e.deltaY) * 2,
          BASE_FOV * 0.8,
          BASE_FOV * 1.2,
        )
        const cam = camRef.current
        if (cam) {
          cam.fov = fov.current
          cam.updateProjectionMatrix()
        }
      } else {
        view.current.zoom = MathUtils.clamp(view.current.zoom + Math.sign(e.deltaY) * 0.5, 1.8, 6)
      }
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
  }, [gl, seated])

  // ── keyboard: WASD + E-to-sit + E-to-exit + camera mode hotkeys ────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingFocused()) return
      keys.current[e.code] = true
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'Digit1') useSettings.getState().set('cameraMode', 'first')
        if (e.code === 'Digit2') useSettings.getState().set('cameraMode', 'third')
      }
      if (e.code === 'KeyE') {
        const train = useTrain.getState()
        const seatedLocal = train.seat != null
        // E → exit train when near the door (during departure countdown)
        if (!seatedLocal && train.departureSec > 0 && stand.current.z < -10) {
          train.exitTrain()
          return
        }
        // E → sit down when standing near an empty seat
        if (!seatedLocal) {
          const near = findNearestSeat(stand.current.x, stand.current.z, seats, 1.5)
          if (near && !isSeatTaken(near.seat.id)) {
            train.sitDown(near.seat.id)
          }
        }
      }
    }
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const clearHeld = () => { keys.current = {} }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('focusin', clearHeld)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('focusin', clearHeld)
    }
  }, [seats])

  // ── standing mode camera/movement update ──────────────────────────────

  function updateStanding(
    cam: TPerspectiveCamera,
    av: Group | null,
    _state: { clock: { elapsedTime: number } },
    dt: number,
  ) {
    const s = useSettings.getState()
    const st = stand.current
    const v = view.current
    const k = keys.current

    // WASD movement (same input convention as StationPlayerController).
    const mz = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0)
    const mx = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0)
    const moving = mx !== 0 || mz !== 0

    if (moving) {
      const sinY = Math.sin(v.yaw)
      const cosY = Math.cos(v.yaw)
      const dirX = cosY * mx - sinY * mz
      const dirZ = -sinY * mx - cosY * mz
      const len = Math.hypot(dirX, dirZ) || 1
      st.x += (dirX / len) * AISLE_WALK_SPEED * dt
      st.z += (dirZ / len) * AISLE_WALK_SPEED * dt
      st.bob += AISLE_WALK_SPEED * dt
    }

    // Clamp to aisle bounds.
    st.x = MathUtils.clamp(st.x, AISLE.minX, AISLE.maxX)
    st.z = MathUtils.clamp(st.z, AISLE.minZ, AISLE.maxZ)

    const headY = STAND_EYE
    const cp = Math.cos(v.pitch)
    const mode = s.cameraMode
    const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera

    if (mode === 'first') {
      const bobY = Math.sin(st.bob * 9) * (moving ? 0.04 : 0)
      cam.position.set(st.x, headY + bobY, st.z)
      cam.rotation.set(v.pitch, v.yaw, 0)
    } else {
      const dir = -1
      const dist = MathUtils.clamp(v.zoom, 1.8, 6)
      const fx = -Math.sin(v.yaw) * cp
      const fy = Math.sin(v.pitch) + 0.32
      const fz = -Math.cos(v.yaw) * cp
      v.camDist = MathUtils.lerp(v.camDist, dist, 1 - Math.pow(0.0001, dt))
      cam.position.set(st.x + fx * dir * v.camDist, Math.max(0.5, headY + fy * dir * v.camDist), st.z + fz * dir * v.camDist)
      cam.rotation.set(v.pitch, v.yaw, 0)
    }

    // Avatar.
    if (av) {
      const isDragging = drag.current.on
      av.visible = mode !== 'first' && !(hideAvatarWhenMovingCamera && isDragging)
      av.position.set(st.x, 0, st.z)
      av.rotation.y = v.yaw + Math.PI
      const l = loco.current
      l.seated = false
      l.speed = moving ? AISLE_WALK_SPEED : 0
    }

  // Seat proximity — update nearestSeatRef for the glow in CarriageInterior.
  const near = findNearestSeat(st.x, st.z, seats, 1.5)
    nearestSeatRef.current = near ? { id: near.seat.id, pos: [near.seat.pos[0], near.seat.pos[1], near.seat.pos[2]] } : null

    // Update glow mesh position.
    if (glowRef.current && near) {
      const n = near.seat
      glowRef.current.position.set(n.pos[0], 0.05, n.pos[2])
      glowRef.current.visible = true
    } else if (glowRef.current) {
      glowRef.current.visible = false
    }

    // Broadcast standing presence.
    setLocalState({ x: st.x, y: 0, z: st.z, yaw: v.yaw, speed: moving ? AISLE_WALK_SPEED : 0, grounded: true, seated: false, cinematic: false, timerStartedAt: 0, timerDurationMs: 0, subject: '' })
  }

  // ── seated mode camera update ─────────────────────────────────────────

  function updateSeated(
    cam: TPerspectiveCamera,
    av: Group | null,
    state: { clock: { elapsedTime: number } },
    dt: number,
  ) {
    const seat = seats[Math.min(seatIndex ?? 0, seats.length - 1)] ?? seats[0]
    if (!seat) return

    // ── Window auto-pan: trigger when the real journey starts (departure ends) ──
    if (prevDepartureRef.current > 0 && departureSec === 0 && seated) {
      const lookLeft = seat.col <= 1
      const windowYaw = lookLeft ? -Math.PI / 2 : Math.PI / 2
      autoPan.current = {
        active: true,
        startYaw: view.current.yaw,
        targetYaw: windowYaw,
        t: 0,
        duration: 3.0,
      }
    }
    prevPhase.current = phase
    prevDepartureRef.current = departureSec

    const s = useSettings.getState()
    const v = view.current
    const trainPhase = useTrain.getState().phase
    const t = state.clock.elapsedTime

    // ── Window auto-pan: smoothly lerp yaw toward window for 3 seconds ──
    if (autoPan.current.active) {
      autoPan.current.t += dt
      const progress = Math.min(1, autoPan.current.t / autoPan.current.duration)
      // Ease-out curve for smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 3)
      v.yaw = autoPan.current.startYaw + (autoPan.current.targetYaw - autoPan.current.startYaw) * ease
      if (progress >= 1) autoPan.current.active = false
    }

    // Train vibration.
    const vib = (trainPhase === 'traveling' || trainPhase === 'arriving') ? 1 : 0.15
    const shakeX = (Math.sin(t * 37) * 0.006 + Math.sin(t * 1.3) * 0.02) * vib
    const shakeY = Math.sin(t * 41) * 0.005 * vib
    const sway = Math.sin(t * 0.6) * 0.03 * vib

    // Ease seatedness 0→1 on board, 1→0 when arriving/arrived (stand up).
    const seatTarget = (trainPhase === 'arrived' || trainPhase === 'arriving') ? 0 : 1
    seatedness.current = MathUtils.lerp(seatedness.current, seatTarget, 1 - Math.pow(0.02, dt))
    const eye = MathUtils.lerp(STAND_EYE, SEAT_EYE, seatedness.current)

    const sx = seat.pos[0]
    const sy = seat.pos[1]
    const sz = seat.pos[2]
    const headY = sy + eye

    // Place seated avatar.
    const hideAvatarWhenMovingCamera = s.hideAvatarWhenMovingCamera
    const isDragging = drag.current.on
    if (av) {
      av.position.set(sx, sy, sz)
      av.rotation.y = seat.yaw + Math.PI + sway
      av.visible = s.cameraMode !== 'first' && !(hideAvatarWhenMovingCamera && isDragging)
      const l = loco.current
      l.seated = true
      l.speed = 0
    }

    if (s.cameraMode === 'first') {
      if (av) av.visible = false
      const yaw = MathUtils.clamp(v.yaw, seat.yaw - 1.0, seat.yaw + 1.0)
      cam.position.set(sx + shakeX, headY + shakeY, sz)
      cam.rotation.set(v.pitch + shakeY, yaw + sway, 0)
    } else {
      const dist = MathUtils.clamp(v.zoom, 1.8, 6)
      const cp = Math.cos(v.pitch)
      const ox = Math.sin(v.yaw) * cp
      const oy = Math.sin(v.pitch)
      const oz = Math.cos(v.yaw) * cp
      v.camDist = MathUtils.lerp(v.camDist, dist, 1 - Math.pow(0.0001, dt))
      cam.position.set(sx + ox * v.camDist + shakeX, Math.max(0.6, headY + 0.2 + oy * v.camDist + shakeY), sz + oz * v.camDist)
      cam.lookAt(sx, headY - 0.1, sz)
    }

    // Hide the seat glow while seated.
    if (glowRef.current) glowRef.current.visible = false
    nearestSeatRef.current = null

    // Broadcast seated presence.
    setLocalState({ x: sx, y: sy, z: sz, yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true, cinematic: false, timerStartedAt: 0, timerDurationMs: 0, subject: '' })
  }

  // ── per-frame: standing OR seated ──────────────────────────────────────

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const cam = camRef.current
    const av = avatarRef.current
    if (!cam) return

    // Update frustum for culling (Three.js handles frustum culling per-mesh,
    // but this exposes the frustum for any custom culling logic)
    updateFrustum(cam)

    if (!seated) {
      updateStanding(cam, av, state, dt)
    } else {
      updateSeated(cam, av, state, dt)
    }
  })

  // keep CARRIAGE referenced for future bounds
  void CARRIAGE

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault fov={70} near={0.05} far={800} rotation-order="YXZ" />
      <group ref={avatarRef}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} />
      </group>
      {/* Seat glow indicator — a subtle ring that appears when standing near an empty seat */}
      <mesh ref={glowRef} visible={false} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.3, 0.45, 24]} />
        <meshStandardMaterial
          ref={glowMatRef}
          color={'#ffd98a'}
          emissive={'#ffcf78'}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
