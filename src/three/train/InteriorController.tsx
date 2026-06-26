import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { Group, MathUtils, type PerspectiveCamera as TPerspectiveCamera } from 'three'
import { carriageSeats, CARRIAGE } from './interior'
import { isTypingFocused } from '../library/input'
import { useSettings } from '../../store/settings'
import { useTrain } from '../../store/train'
import { setLocalState } from '../../multiplayer/net'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { useAvatar } from '../../avatar/store'

// Seated study controller for the carriage. While the journey runs you're seated
// at the seat you chose when boarding; you can look around (drag), zoom, and flip
// first/third person, but you stay put — you're studying. A gentle, constant
// vibration (and a stronger sway on the curves) sells that the train is really
// moving. The seated pose is broadcast so other passengers see you aboard.

const SEAT_EYE = 1.2

export function InteriorController() {
  const gl = useThree((s) => s.gl)
  const camRef = useRef<TPerspectiveCamera>(null)
  const avatarRef = useRef<Group>(null)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: true })
  const avatarConfig = useAvatar((s) => s.config)
  const seats = useMemo(carriageSeats, [])
  const seatIndex = useTrain((s) => s.seat) ?? 0
  const seat = seats[Math.min(seatIndex, seats.length - 1)] ?? seats[0]

  const view = useRef({ yaw: Math.PI, pitch: 0.05, zoom: 3.0, camDist: 3.0 })
  const drag = useRef({ on: false, lx: 0, ly: 0 })

  // drag-look + wheel zoom
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
      view.current.pitch = MathUtils.clamp(view.current.pitch, -0.7, 0.7)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => (drag.current.on = false)
    const wheel = (e: WheelEvent) => {
      if (useSettings.getState().cameraMode === 'first') return
      e.preventDefault()
      view.current.zoom = MathUtils.clamp(view.current.zoom + Math.sign(e.deltaY) * 0.5, 1.8, 6)
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

  // camera-mode hotkeys
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTypingFocused()) return
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'Digit1') useSettings.getState().set('cameraMode', 'first')
        if (e.code === 'Digit2') useSettings.getState().set('cameraMode', 'front')
        if (e.code === 'Digit3') useSettings.getState().set('cameraMode', 'third')
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const cam = camRef.current
    const av = avatarRef.current
    if (!cam || !seat) return
    const s = useSettings.getState()
    const t = state.clock.elapsedTime
    const v = view.current

    // train vibration: tiny constant jitter + slow sway
    const vib = useTrain.getState().phase === 'traveling' ? 1 : 0.15
    const shakeX = (Math.sin(t * 37) * 0.006 + Math.sin(t * 1.3) * 0.02) * vib
    const shakeY = Math.sin(t * 41) * 0.005 * vib
    const sway = Math.sin(t * 0.6) * 0.03 * vib

    const sx = seat.pos[0]
    const sy = seat.pos[1]
    const sz = seat.pos[2]
    const headY = sy + SEAT_EYE

    // place seated avatar
    if (av) {
      av.position.set(sx, sy, sz)
      av.rotation.y = seat.yaw + Math.PI + sway
      av.visible = s.cameraMode !== 'first'
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

    // broadcast seated presence (parked at the seat)
    setLocalState({ x: sx, y: sy, z: sz, yaw: seat.yaw + Math.PI, speed: 0, grounded: true, seated: true })
  })

  // keep CARRIAGE referenced for future aisle bounds; no-op now
  void CARRIAGE

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault fov={70} near={0.05} far={800} rotation-order="YXZ" />
      <group ref={avatarRef}>
        <CharacterAvatar config={avatarConfig} locomotion={loco} />
      </group>
    </>
  )
}
