import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const FLY_SPEED = 20
const FAST_SPEED = 50
const SPRINT_MULT = 2.5

interface FlyState {
  x: number; y: number; z: number
  yaw: number; pitch: number
  flying: boolean
  lastSpaceTime: number
}

export function FlyCamera({ position = [0, 15, 30] }: { position?: [number, number, number] }) {
  const { camera } = useThree()
  const state = useRef<FlyState>({
    x: position[0], y: position[1], z: position[2],
    yaw: 0, pitch: -0.5,
    flying: true,
    lastSpaceTime: 0,
  })
  const keys = useRef<Record<string, boolean>>({})
  const drag = useRef({ on: false, lx: 0, ly: 0 })

  useEffect(() => {
    camera.position.set(state.current.x, state.current.y, state.current.z)
    camera.rotation.set(0, 0, 0)
  }, [camera])

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      keys.current[k] = true
      // Double-space toggle fly
      if (k === ' ') {
        const now = Date.now()
        if (now - state.current.lastSpaceTime < 300) {
          state.current.flying = !state.current.flying
        }
        state.current.lastSpaceTime = now
      }
    }
    const ku = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [])

  useEffect(() => {
    const down = (e: PointerEvent) => {
      drag.current.on = true
      drag.current.lx = e.clientX
      drag.current.ly = e.clientY
    }
    const move = (e: PointerEvent) => {
      if (!drag.current.on) return
      const s = state.current
      s.yaw -= (e.clientX - drag.current.lx) * 0.003
      s.pitch += (e.clientY - drag.current.ly) * 0.003
      s.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, s.pitch))
      drag.current.lx = e.clientX
      drag.current.ly = e.clientY
    }
    const up = () => { drag.current.on = false }

    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  useFrame((_, dt) => {
    const s = state.current
    const k = keys.current
    const speed = (k.shift ? FAST_SPEED : FLY_SPEED) * SPRINT_MULT

    // Movement direction
    const forward = new Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw))
    const right = new Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw))

    let mx = 0, mz = 0, my = 0
    if (k.w) { mx += forward.x; mz += forward.z }
    if (k.s) { mx -= forward.x; mz -= forward.z }
    if (k.a) { mx -= right.x; mz -= right.z }
    if (k.d) { mx += right.x; mz += right.z }
    if (k.space && !s.flying) my += 1
    if (k.shift && !s.flying) my -= 1
    if (k.space && s.flying) my += 1
    if (k.shift && s.flying) my -= 1

    // Normalize horizontal
    const len = Math.hypot(mx, mz)
    if (len > 0) { mx /= len; mz /= len }

    s.x += mx * speed * dt
    s.z += mz * speed * dt
    s.y += my * speed * dt

    // Clamp height
    s.y = Math.max(0.5, Math.min(100, s.y))

    // Apply to camera
    camera.position.set(s.x, s.y, s.z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = s.yaw
    camera.rotation.x = s.pitch
  })

  return null
}
