import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { InstancedBoxes, type BoxItem } from './Instanced'
import { PLAYER_BOUNDS } from './layout'

const STEP = 0.06
const BODY_H = 0.7
const LEG_H = 0.35
const HEAD_SIZE = 0.4

const SKIN = '#f0c090'
const HAIR = '#3a2010'
const SHIRT = '#2a5a8a'
const PANTS = '#1a3a5a'
const SHOES = '#2a1a0a'
const EYES = '#1a1a1a'
const MOUTH = '#c06040'

const CAM_DIST = 6
const CAM_HEIGHT = 3.5
const CAM_SMOOTH = 8

// Global keyboard state — initialized once at module level
const keys: Record<string, boolean> = {}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase()
    if (k === 'w') keys.w = true
    if (k === 'a') keys.a = true
    if (k === 's') keys.s = true
    if (k === 'd') keys.d = true
    if (k === ' ') { keys.space = true }
  })
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase()
    if (k === 'w') keys.w = false
    if (k === 'a') keys.a = false
    if (k === 's') keys.s = false
    if (k === 'd') keys.d = false
    if (k === ' ') keys.space = false
  })
}

interface VoxelCharProps {
  position?: [number, number, number]
}

export function VoxelCharacter({ position = [5, 0, 20] }: VoxelCharProps) {
  const groupRef = useRef<any>(null)
  const { camera } = useThree()
  const stateRef = useRef({
    x: position[0], y: position[1], z: position[2],
    vx: 0, vy: 0, vz: 0,
    grounded: true, facing: 0, walkCycle: 0,
    camYaw: 0, camPitch: -0.3,
  })
  const dragRef = useRef({ on: false, lx: 0, ly: 0 })

  const bodyParts = useMemo(() => {
    const items: BoxItem[] = []
    const s = STEP

    // Head
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        for (let z = -3; z <= 3; z++) {
          const onShell = Math.abs(x) === 3 || Math.abs(y) === 3 || Math.abs(z) === 3
          if (!onShell) continue
          const isHair = y >= 2 || (y >= 0 && (x === -3 || x === 3 || z === -3 || z === 3))
          const isEye = y === 0 && (x === -1 || x === 1) && z === 3
          const isMouth = y === -1 && z === 3
          items.push({
            pos: [x * s, HEAD_SIZE + BODY_H + LEG_H + y * s, z * s],
            size: [s, s, s],
            color: isEye ? EYES : isMouth ? MOUTH : isHair ? HAIR : SKIN,
          })
        }
      }
    }

    // Body
    for (let x = -2; x <= 2; x++) {
      for (let y = -4; y <= 5; y++) {
        for (let z = -1; z <= 1; z++) {
          const onShell = Math.abs(x) === 2 || Math.abs(y) === 4 || Math.abs(z) === 1
          if (!onShell) continue
          const isBelt = y === -3
          items.push({
            pos: [x * s, BODY_H / 2 + LEG_H + y * s, z * s],
            size: [s, s, s],
            color: isBelt ? '#5a4a2a' : SHIRT,
          })
        }
      }
    }

    // Legs
    for (const lx of [-1, 1]) {
      for (let y = -5; y <= 0; y++) {
        for (let z = -1; z <= 1; z++) {
          const onShell = Math.abs(z) === 1 || y === -5 || y === 0
          if (!onShell) continue
          const isShoe = y <= -4
          items.push({
            pos: [(lx * 1.5) * s, y * s, z * s],
            size: [s, s, s],
            color: isShoe ? SHOES : PANTS,
          })
        }
      }
    }

    // Arms
    for (const ax of [-1, 1]) {
      for (let y = -3; y <= 4; y++) {
        for (let z = -1; z <= 0; z++) {
          const onShell = Math.abs(z) === 1 || y === -3 || y === 4
          if (!onShell) continue
          items.push({
            pos: [(ax * 3.5) * s, BODY_H / 2 + LEG_H + y * s, z * s],
            size: [s, s, s],
            color: y <= -2 ? SKIN : SHIRT,
          })
        }
      }
    }

    return items
  }, [])

  // Mouse drag for camera orbit
  useEffect(() => {
    const down = (e: PointerEvent) => {
      dragRef.current.on = true
      dragRef.current.lx = e.clientX
      dragRef.current.ly = e.clientY
    }
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d.on) return
      const st = stateRef.current
      st.camYaw -= (e.clientX - d.lx) * 0.005
      st.camPitch += (e.clientY - d.ly) * 0.005
      st.camPitch = MathUtils.clamp(st.camPitch, -1.2, 0.5)
      d.lx = e.clientX
      d.ly = e.clientY
    }
    const up = () => { dragRef.current.on = false }

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
    const st = stateRef.current
    let mx = 0, mz = 0
    if (keys.w) mz -= 1
    if (keys.s) mz += 1
    if (keys.a) mx -= 1
    if (keys.d) mx += 1

    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz)
      mx /= len; mz /= len
      st.facing = Math.atan2(mx, mz)
    }

    const speed = 6
    const jumpForce = 8
    const gravity = -18

    st.vx += (mx * speed - st.vx) * 8 * dt
    st.vz += (mz * speed - st.vz) * 8 * dt

    if (keys.space && st.grounded) {
      st.vy = jumpForce
      st.grounded = false
    }

    st.vy += gravity * dt
    st.x += st.vx * dt
    st.z += st.vz * dt
    st.y += st.vy * dt

    if (st.y <= 0) { st.y = 0; st.vy = 0; st.grounded = true }

    const margin = 1
    st.x = Math.max(PLAYER_BOUNDS.minX + margin, Math.min(PLAYER_BOUNDS.maxX - margin, st.x))
    st.z = Math.max(PLAYER_BOUNDS.minZ + margin, Math.min(PLAYER_BOUNDS.maxZ - margin, st.z))

    if (Math.abs(mx) > 0.1 || Math.abs(mz) > 0.1) st.walkCycle += dt * 8
    else st.walkCycle *= 0.9

    // Update character position
    if (groupRef.current) {
      groupRef.current.position.set(st.x, st.y, st.z)
      groupRef.current.rotation.y = st.facing
    }

    // Third-person camera follow
    const targetX = st.x + Math.sin(st.camYaw) * CAM_DIST
    const targetZ = st.z + Math.cos(st.camYaw) * CAM_DIST
    const targetY = st.y + CAM_HEIGHT + st.camPitch * 3

    camera.position.x += (targetX - camera.position.x) * CAM_SMOOTH * dt
    camera.position.y += (targetY - camera.position.y) * CAM_SMOOTH * dt
    camera.position.z += (targetZ - camera.position.z) * CAM_SMOOTH * dt

    camera.lookAt(st.x, st.y + 1.5, st.z)
  })

  return (
    <group ref={groupRef} position={position}>
      <InstancedBoxes items={bodyParts} roughness={0.7} />
      <pointLight position={[0, 1.5, 0]} intensity={0.5} distance={4} color="#ffd9a8" />
    </group>
  )
}
