import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import {
  AdditiveBlending,
  CanvasTexture,
  type BufferAttribute,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  Vector3,
} from 'three'
import { getTrain, useTrainX, type TrainId } from '../../store/trainx'
import { useAvatar } from '../../avatar/store'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { Locomotion } from '../../avatar/animation'
import { playChime, startAmbient, stopAmbient } from './sound'
import { ParallaxWindow, royaleChapter } from './ParallaxWindow'

type SeatLetter = 'A' | 'B' | 'C' | 'D'

interface SeatDef {
  pos: [number, number, number]
  face: number
  label: string
}

// 2+2 row layout: all seats face forward, 5 rows along the carriage
const SEATS: Record<SeatLetter, SeatDef> = {
  A: { pos: [-2.2, 0, 0], face: 0, label: 'Window Left' },
  B: { pos: [-0.9, 0, 0], face: 0, label: 'Aisle Left' },
  C: { pos: [0.9, 0, 0], face: 0, label: 'Aisle Right' },
  D: { pos: [2.2, 0, 0], face: 0, label: 'Window Right' },
}
const ROWS = [-2.4, -1.2, 0, 1.2, 2.4]

function Character({ color = '#b9764a', head = '#f0d2b0' }: { color?: string; head?: string }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.9, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color={head} roughness={0.6} />
      </mesh>
    </group>
  )
}

/** Plush velvet seat (Hogwarts Express style) with embroidered crest + lumbar support. */
function Chair({
  leather = '#7a7a7a',
  trim = '#2a2a2a',
  crest,
}: {
  leather?: string
  trim?: string
  crest?: string
}) {
  return (
    <group>
      {/* base / plinth */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.24, 0.92]} />
        <meshStandardMaterial color={trim} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* plush seat cushion */}
      <mesh position={[0, 0.36, 0.02]} castShadow>
        <boxGeometry args={[0.84, 0.22, 0.84]} />
        <meshStandardMaterial color={leather} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* ergonomic backrest with lumbar support bulge */}
      <mesh position={[0, 0.95, -0.34]} castShadow>
        <boxGeometry args={[0.86, 1.1, 0.22]} />
        <meshStandardMaterial color={leather} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.72, -0.47]}>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color={leather} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* padded headrest */}
      <mesh position={[0, 1.56, -0.34]}>
        <boxGeometry args={[0.5, 0.3, 0.22]} />
        <meshStandardMaterial color={trim} roughness={0.5} metalness={0.1} />
      </mesh>
      {crest && (
        <mesh position={[0, 1.56, -0.47]}>
          <circleGeometry args={[0.12, 24]} />
          <meshStandardMaterial
            color={crest}
            emissive={crest}
            emissiveIntensity={0.85}
            toneMapped={false}
            side={2}
          />
        </mesh>
      )}
      {/* padded armrests */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.48, 0.62, 0.02]}>
          <boxGeometry args={[0.14, 0.16, 0.74]} />
          <meshStandardMaterial color={leather} roughness={0.55} metalness={0.05} />
        </mesh>
      ))}
      {/* metal legs */}
      {[
        [-0.32, -0.32],
        [0.32, -0.32],
        [-0.32, 0.32],
        [0.32, 0.32],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.06, z]}>
          <cylinderGeometry args={[0.045, 0.045, 0.12, 8]} />
          <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Decorative overhead luggage rack running along a side wall. */
function LuggageRack({ side }: { side: number }) {
  return (
    <group position={[side * 3.46, 2.55, 0]}>
      <mesh>
        <boxGeometry args={[0.5, 0.22, 8.2]} />
        <meshStandardMaterial color="#4a3320" roughness={0.7} />
      </mesh>
      <mesh position={[side * 0.26, -0.13, 0]}>
        <boxGeometry args={[0.06, 0.06, 8.2]} />
        <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

/**
 * Modern LED reading light = magical floating orb with a soft modern dimmer strip.
 * The orb bobs gently and its glow pulses; a small LED panel controls brightness.
 */
function ReadingLight({ pos }: { pos: [number, number, number] }) {
  const orb = useRef<Group>(null)
  const mat = useRef<MeshStandardMaterial>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (orb.current) orb.current.position.y = Math.sin(t * 1.5 + pos[0]) * 0.04
    if (mat.current) mat.current.emissiveIntensity = 1.1 + Math.sin(t * 2 + pos[2]) * 0.2
  })
  return (
    <group position={pos}>
      <group ref={orb}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            ref={mat}
            color="#ffd98a"
            emissive="#ffd98a"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
        <pointLight color="#ffd9a0" intensity={1.4} distance={3} />
      </group>
      {/* modern dimmer control strip */}
      <mesh position={[0, -0.28, 0]}>
        <boxGeometry args={[0.26, 0.05, 0.04]} />
        <meshStandardMaterial color="#1a1a1f" emissive="#39ff88" emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

/** Gold frame around a side window, giving a realistic "looking out" border. */
function WindowFrame({ side }: { side: number }) {
  const bar = (
    <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.3} />
  )
  return (
    <group position={[side * 3.55, 1.4, 0.06]} rotation={[0, side * Math.PI / 2, 0]}>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[3.9, 0.12, 0.12]} />
        {bar}
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <boxGeometry args={[3.9, 0.12, 0.12]} />
        {bar}
      </mesh>
      <mesh position={[-1.85, 0, 0]}>
        <boxGeometry args={[0.12, 2.0, 0.12]} />
        {bar}
      </mesh>
      <mesh position={[1.85, 0, 0]}>
        <boxGeometry args={[0.12, 2.0, 0.12]} />
        {bar}
      </mesh>
    </group>
  )
}

/** A small floating candle (magical ambient light source). */
function MiniCandle({ x, y, z }: { x: number; y: number; z: number }) {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.position.y = y + Math.sin(s.clock.elapsedTime * 1.2 + x) * 0.05
  })
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.04, 0.22, 6]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.18, 0]} intensity={2} color="#ffcf8a" distance={3} />
    </group>
  )
}

/** Small chandelier with floating candles above each cabin table. */
function CabinChandelier() {
  return (
    <group position={[0, 2.65, 0]}>
      <mesh>
        <sphereGeometry args={[0.16, 14, 14]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffd98a" emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
      <pointLight intensity={6} color="#ffd9a0" distance={12} />
      <MiniCandle x={-0.45} y={0.3} z={0} />
      <MiniCandle x={0.45} y={0.26} z={0.12} />
    </group>
  )
}

/** Small enchanted wall portrait with a subtly blinking character. */
function EnchantedPortraitSmall({
  x,
  y,
  z,
  ry,
  color,
}: {
  x: number
  y: number
  z: number
  ry: number
  color: string
}) {
  const { c, ctx } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 128
    cv.height = 160
    return { c: cv, ctx: cv.getContext('2d')! }
  }, [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  const acc = useRef(0)
  useFrame((state, dt) => {
    acc.current += dt
    if (acc.current < 0.15) return
    acc.current = 0
    const t = state.clock.elapsedTime
    const eh = Math.sin(t * 0.7 + x) > 0.9 ? 0.2 : 1
    ctx.fillStyle = '#241a2e'
    ctx.fillRect(0, 0, 128, 160)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(64, 120, 38, 40, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f0d2b0'
    ctx.beginPath()
    ctx.arc(64, 64, 28, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#222'
    ctx.fillRect(52, 58, 8, 10 * eh)
    ctx.fillRect(72, 58, 8, 10 * eh)
    tex.needsUpdate = true
  })
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh>
        <boxGeometry args={[0.7, 0.9, 0.08]} />
        <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[0.6, 0.8]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Faintly glowing magical rune carving across a wall panel. */
function WallCarving({ side }: { side: number }) {
  return (
    <mesh position={[side * 3.48, 1.6, 0]} rotation={[0, (side * Math.PI) / 2, 0]}>
      <planeGeometry args={[8, 2.4]} />
      <meshStandardMaterial
        color="#caa84a"
        emissive="#caa84a"
        emissiveIntensity={0.07}
        transparent
        opacity={0.55}
        wireframe
      />
    </mesh>
  )
}

/** Hidden ceiling air vent (modern, flush with the ceiling). */
function CeilingVent({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 3.16, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.06]} />
        <meshStandardMaterial color="#2a2436" roughness={0.7} />
      </mesh>
      {[-0.4, -0.13, 0.13, 0.4].map((o, i) => (
        <mesh key={i} position={[o, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.04, 0.5, 0.02]} />
          <meshStandardMaterial color="#15121c" />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Auto-closing curtain in a house colour. Opens while boarding, magically slides
 * shut once the train departs (modern fabric + enchanted motion).
 */
function Curtain({ side }: { side: number }) {
  const departed = useTrainX((s) => s.departed)
  const refL = useRef<Mesh>(null)
  const refR = useRef<Mesh>(null)
  const colour = side < 0 ? '#3a1f5a' : '#1f3a5a'
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2)
    if (refL.current)
      refL.current.position.z += ((departed ? -0.95 : -1.9) - refL.current.position.z) * k
    if (refR.current)
      refR.current.position.z += ((departed ? 0.95 : 1.9) - refR.current.position.z) * k
  })
  return (
    <group position={[side * 3.6, 1.4, 0]} rotation={[0, (side * Math.PI) / 2, 0]}>
      <mesh ref={refL} position={[0, 0, -1.9]}>
        <boxGeometry args={[0.1, 1.8, 1.9]} />
        <meshStandardMaterial color={colour} roughness={0.9} />
      </mesh>
      <mesh ref={refR} position={[0, 0, 1.9]}>
        <boxGeometry args={[0.1, 1.8, 1.9]} />
        <meshStandardMaterial color={colour} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Minimalist table with a glowing wireless-charging pad. */
function WirelessPad() {
  return (
    <group position={[0, 0.82, -0.42]}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 24]} />
        <meshStandardMaterial color="#1c2030" emissive="#39ff88" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.16, 28]} />
        <meshBasicMaterial color="#39ff88" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Modern USB-C charging ports set into the table edge. */
function USBPorts() {
  return (
    <group position={[0.5, 0.82, 0.4]} rotation={[0, 0.3, 0]}>
      {[0, 0.14].map((o, i) => (
        <mesh key={i} position={[o, 0, 0]}>
          <boxGeometry args={[0.09, 0.04, 0.12]} />
          <meshStandardMaterial color="#0d0d12" emissive="#7fd0ff" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** Do-Not-Disturb sign = a self-writing enchanted feather quill that floats. */
function FloatingQuill() {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = 1.02 + Math.sin(s.clock.elapsedTime * 1.2) * 0.04
      ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 3) * 0.28
    }
  })
  return (
    <group ref={ref} position={[0.62, 1.02, 0.32]}>
      <mesh rotation={[0, 0, 0.5]}>
        <cylinderGeometry args={[0.012, 0.022, 0.4, 6]} />
        <meshStandardMaterial color="#e8e8f0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.03, 0.12, 6]} />
        <meshStandardMaterial color="#cfd0e0" />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <coneGeometry args={[0.045, 0.14, 6]} />
        <meshStandardMaterial color="#caa84a" emissive="#caa84a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/** Magical service bell — click to summon the house-elf attendant. */
function ServiceBell({ onRing }: { onRing: () => void }) {
  const ref = useRef<Group>(null)
  const rung = useRef(false)
  useFrame((s) => {
    if (ref.current && rung.current) {
      ref.current.position.y = 0.84 + Math.abs(Math.sin(s.clock.elapsedTime * 22)) * 0.07
    }
  })
  return (
    <group
      ref={ref}
      position={[0, 0.84, 0.5]}
      onClick={(e) => {
        e.stopPropagation()
        rung.current = true
        onRing()
        setTimeout(() => {
          rung.current = false
          if (ref.current) ref.current.position.y = 0.84
        }, 600)
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh>
        <sphereGeometry args={[0.1, 14, 14, 0, Math.PI * 2, 0, Math.PI]} />
        <meshStandardMaterial
          color="#caa84a"
          metalness={0.85}
          roughness={0.22}
          emissive="#caa84a"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#caa84a" metalness={0.85} roughness={0.22} />
      </mesh>
    </group>
  )
}

/** House-elf attendant (pillowcase robe + big ears) summoned by the service bell. */
function HouseElfAttendant({ summoned }: { summoned: boolean }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) {
      const target = summoned ? 1 : 0
      const next = ref.current.scale.x + (target - ref.current.scale.x) * 0.08
      ref.current.scale.setScalar(next)
      ref.current.visible = next > 0.02
    }
  })
  return (
    <group ref={ref} position={[0, 0, -3.4]} scale={0}>
      <mesh position={[0, 0.7, 0]}>
        <capsuleGeometry args={[0.28, 0.7, 6, 12]} />
        <meshStandardMaterial color="#d8c8a8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.34, 0.7, 12]} />
        <meshStandardMaterial color="#f0ece0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#e7d8b8" roughness={0.7} />
      </mesh>
      <mesh position={[-0.22, 1.4, 0]} rotation={[0, 0, 0.6]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#e7d8b8" />
      </mesh>
      <mesh position={[0.22, 1.4, 0]} rotation={[0, 0, -0.6]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#e7d8b8" />
      </mesh>
    </group>
  )
}

/** Live timer screen above each seat pair (journey time remaining). */
function SeatScreen({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const elapsedActive = useTrainX((s) => s.elapsedActive)
  const sel = useTrainX((s) => s.selectedTrainId)
  const train = getTrain(sel)
  const { canvas, ctx, tex } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    return { canvas, ctx, tex: new CanvasTexture(canvas) }
  }, [])
  const drawnAt = useRef(0)
  useFrame((state) => {
    if (state.clock.elapsedTime - drawnAt.current < 0.25) return
    drawnAt.current = state.clock.elapsedTime
    ctx.fillStyle = '#0b1020'
    ctx.fillRect(0, 0, 256, 128)
    ctx.fillStyle = '#caa84a'
    ctx.font = 'bold 20px monospace'
    ctx.fillText((train?.name ?? 'TRAIN').toUpperCase().slice(0, 16), 14, 32)
    let remain = 0
    if (train) remain = Math.max(0, train.durationHours * 3600 * 1000 - elapsedActive)
    const h = Math.floor(remain / 3600000)
    const m = Math.floor((remain % 3600000) / 60000)
    const s = Math.floor((remain % 60000) / 1000)
    ctx.fillStyle = '#9fd8ff'
    ctx.font = 'bold 44px monospace'
    ctx.fillText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, 14, 92)
    ctx.fillStyle = '#9fb0d0'
    ctx.font = '14px monospace'
    ctx.fillText('TIME TO DESTINATION', 14, 118)
    tex.needsUpdate = true
  })
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[1.3, 0.65]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[1.36, 0.71, 0.05]} />
        <meshStandardMaterial color="#1a1410" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** Local player walks door → aisle → pre-assigned seat, then sits naturally
 *  with the real avatar rig (walk + sit poses driven by a locomotion ref). */
function WalkerInside({ letter }: { letter: SeatLetter }) {
  const ref = useRef<Group>(null)
  const seg = useRef(0)
  const t = useRef(0)
  const arrived = useRef(false)
  const seat = SEATS[letter]
  const myConfig = useAvatar((s) => s.config)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })

  const path = useMemo(
    () => [
      new Vector3(0, 0, 3.4),
      new Vector3(seat.pos[0], 0, 1.3),
      new Vector3(seat.pos[0], 0, seat.pos[2]),
    ],
    [seat],
  )

  useFrame((_, dtRaw) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)
    if (!arrived.current) {
      t.current = Math.min(1, t.current + dt / 1.6)
      const a = path[seg.current]
      const b = path[seg.current + 1] ?? a
      const e = t.current
      g.position.lerpVectors(a, b, e)
      const dir = new Vector3().subVectors(b, a)
      if (dir.lengthSq() > 1e-4) g.rotation.y = Math.atan2(dir.x, dir.z)
      loco.current.speed = dir.lengthSq() > 1e-4 ? 4.6 : 0
      if (t.current >= 1) {
        if (seg.current < path.length - 2) {
          seg.current++
          t.current = 0
        } else {
          arrived.current = true
          g.position.set(seat.pos[0], 0.45, seat.pos[2])
          g.rotation.y = seat.face
          loco.current.speed = 0
          loco.current.seated = true
        }
      }
    }
  })

  return (
    <group ref={ref} position={path[0]}>
      <CharacterAvatar config={myConfig} locomotion={loco} />
    </group>
  )
}

/** Subtle golden magical motes drifting through the cabin. */
function CabinMotes() {
  const geomRef = useRef<BufferGeometry>(null)
  const count = 40
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 6.4
      arr[i * 3 + 1] = 0.4 + Math.random() * 2.6
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return arr
  }, [])

  useFrame((state, dtRaw) => {
    const g = geomRef.current
    if (!g) return
    if (!useTrainX.getState().visible) return // freeze when the realm is off-screen
    const dt = Math.min(dtRaw, 0.05)
    const time = state.clock.elapsedTime
    const arr = (g.attributes.position as BufferAttribute).array as Float32Array
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + dt * 0.12
      if (y > 3.0) y = 0.4
      arr[i * 3] = arr[i * 3] + Math.sin(time * 0.3 + i) * 0.002
      arr[i * 3 + 1] = y
    }
    g.attributes.position.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ffd98a"
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const peek = useRef(false)
  const prog = useRef(0)
  const defPos = useMemo(() => new Vector3(0, 2.3, 5.2), [])
  const defLook = useMemo(() => new Vector3(0, 0.9, 0), [])
  const winPos = useMemo(() => new Vector3(-2.7, 1.7, 0.4), [])
  const winLook = useMemo(() => new Vector3(-3.4, 1.4, 0), [])
  const curLook = useMemo(() => new Vector3(), [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v') peek.current = !peek.current
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    prog.current += ((peek.current ? 1 : 0) - prog.current) * Math.min(1, dt * 3)
    const p = prog.current
    camera.position.lerpVectors(defPos, winPos, p)
    curLook.lerpVectors(defLook, winLook, p)
    camera.lookAt(curLook)
  })
  return null
}

/** VIP Royale private booth + the player walking to it. */
const BOOTH = { pos: [-2.4, 0, 0] as [number, number, number], face: -Math.PI / 2 }

function RoyaleWalker() {
  const ref = useRef<Group>(null)
  const seg = useRef(0)
  const t = useRef(0)
  const arrived = useRef(false)
  const myConfig = useAvatar((s) => s.config)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  const path = useMemo(
    () => [new Vector3(0, 0, 3.4), new Vector3(BOOTH.pos[0], 0, 1.3), new Vector3(BOOTH.pos[0], 0, BOOTH.pos[2])],
    [],
  )
  useFrame((_, dtRaw) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)
    if (!arrived.current) {
      t.current = Math.min(1, t.current + dt / 1.6)
      const a = path[seg.current]
      const b = path[seg.current + 1] ?? a
      const e = t.current
      g.position.lerpVectors(a, b, e)
      const dir = new Vector3().subVectors(b, a)
      if (dir.lengthSq() > 1e-4) g.rotation.y = Math.atan2(dir.x, dir.z)
      loco.current.speed = dir.lengthSq() > 1e-4 ? 4.6 : 0
      if (t.current >= 1) {
        if (seg.current < path.length - 2) {
          seg.current++
          t.current = 0
        } else {
          arrived.current = true
          g.position.set(BOOTH.pos[0], 0.45, BOOTH.pos[2])
          g.rotation.y = BOOTH.face
          loco.current.speed = 0
          loco.current.seated = true
        }
      }
    }
  })
  return (
    <group ref={ref} position={path[0]}>
      <CharacterAvatar config={myConfig} locomotion={loco} />
    </group>
  )
}

/** Rising steam above the complimentary coffee/tea. */
function Steam() {
  const geomRef = useRef<BufferGeometry>(null)
  const count = 16
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.1
      arr[i * 3 + 1] = Math.random() * 0.3
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.1
    }
    return arr
  }, [])
  useFrame((state, dtRaw) => {
    const g = geomRef.current
    if (!g || !useTrainX.getState().visible) return
    const dt = Math.min(dtRaw, 0.05)
    const time = state.clock.elapsedTime
    const arr = (g.attributes.position as BufferAttribute).array as Float32Array
    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + dt * 0.08
      if (y > 0.35) y = 0
      arr[i * 3] = Math.sin(time + i) * 0.02
      arr[i * 3 + 1] = y
    }
    g.attributes.position.needsUpdate = true
  })
  return (
    <points position={[0, 0, 0]}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#fff" transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} sizeAttenuation toneMapped={false} />
    </points>
  )
}

function RoyaleBooth() {
  return (
    <group position={[BOOTH.pos[0], 0, BOOTH.pos[2]]}>
      {/* plush private seat facing the window */}
      <group rotation={[0, BOOTH.face, 0]} position={[0, 0, 0.2]}>
        <Chair leather="#7a1f3a" trim="#2a0e18" />
      </group>
      {/* privacy partition behind the seat */}
      <mesh position={[0.55, 1.2, 0.2]}>
        <boxGeometry args={[0.12, 2.4, 2.2]} />
        <meshStandardMaterial color="#2a1226" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* gold trim on the partition */}
      <mesh position={[0.49, 1.2, 0.2]}>
        <boxGeometry args={[0.04, 2.4, 2.2]} />
        <meshStandardMaterial color="#e7c7ff" metalness={0.8} roughness={0.2} emissive="#b39bff" emissiveIntensity={0.25} />
      </mesh>
      {/* premium personal desk */}
      <mesh position={[0, 0.78, -0.5]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.1, 0.6]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.36, -0.5]}>
        <boxGeometry args={[0.85, 0.66, 0.5]} />
        <meshStandardMaterial color="#2a1a12" roughness={0.6} />
      </mesh>
      {/* gold desk lamp */}
      <mesh position={[0.32, 0.95, -0.55]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#e7c7ff" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.32, 1.12, -0.55]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#fff2e0" emissive="#ffd9a0" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0.32, 1.2, -0.4]} intensity={2.2} color="#ffd9a0" distance={3} />
      {/* complimentary coffee/tea */}
      <mesh position={[-0.28, 0.86, -0.45]}>
        <cylinderGeometry args={[0.09, 0.07, 0.14, 14]} />
        <meshStandardMaterial color="#e7c7ff" emissive="#e7c7ff" emissiveIntensity={0.3} metalness={0.5} roughness={0.3} />
      </mesh>
      <Steam />
      {/* exclusive study materials (visual) */}
      <mesh position={[0.05, 0.86, -0.6]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.26, 0.05, 0.2]} />
        <meshStandardMaterial color="#caa84a" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  )
}

/** Floating "chapter" banner above the cabin for the VIP epic journey. */
function RoyaleChapterBanner() {
  const elapsedActive = useTrainX((s) => s.elapsedActive)
  const t = getTrain('royale')
  const total = (t?.durationHours ?? 9) * 3600 * 1000
  const seg = royaleChapter(elapsedActive, total)
  return (
    <Html position={[0, 2.7, -3.6]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(30,18,46,0.85)',
        color: '#e7c7ff',
        border: '1px solid rgba(179,155,255,0.6)',
        borderRadius: 10,
        padding: '4px 12px',
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>
        ⭐ VIP Journey · Chapter {seg.index + 1}/7 — {seg.name}
      </div>
    </Html>
  )
}

export function TrainInterior() {
  const selectedTrainId = useTrainX((s) => s.selectedTrainId) as TrainId | null
  const seat = useTrainX((s) => s.seat)
  const letter = (seat?.letter as SeatLetter) ?? 'B'
  const train = getTrain(selectedTrainId)
  const trainId = (train?.id ?? 'sprint') as TrainId
  const isRoyale = trainId === 'royale'
  const sway = useRef<Group>(null)
  const [summoned, setSummoned] = useState(false)
  const beginJourney = useTrainX((s) => s.beginJourney)

  // Departure: doors-close chime, then the journey (and the study timer) begins
  // once the train has actually left the station. Ambient bed starts with the ride.
  useEffect(() => {
    playChime('depart')
    startAmbient()
    const id = window.setTimeout(() => beginJourney(), 1500)
    return () => {
      window.clearTimeout(id)
      stopAmbient()
    }
  }, [beginJourney])

  // Gentle cabin sway so the journey reads as a moving train.
  const arrivedSound = useRef(false)
  useFrame((state) => {
    if (!sway.current) return
    if (!useTrainX.getState().visible) return // freeze when the realm is off-screen
    const t = state.clock.elapsedTime
    sway.current.rotation.z = Math.sin(t * 0.6) * 0.008
    sway.current.position.x = Math.sin(t * 0.4) * 0.03
    // steam-hiss + brake on arrival
    const total = (train?.durationHours ?? 1) * 3600 * 1000
    if (!arrivedSound.current && useTrainX.getState().elapsedActive >= total) {
      arrivedSound.current = true
      playChime('arrive')
    }
  })

  return (
    <group ref={sway}>
      <CameraRig />
      <ambientLight intensity={0.45} color="#ffe6c0" />
      <hemisphereLight args={['#fff2d6', '#3a2a1a', 0.45]} />
      <pointLight position={[0, 3, 1]} intensity={9} color="#ffd9a0" distance={14} castShadow />
      <pointLight position={[-2.4, 2.6, 0]} intensity={4} color="#ffcaa0" distance={8} />
      <pointLight position={[2.4, 2.6, 0]} intensity={4} color="#ffcaa0" distance={8} />
      {/* magical accent glow */}
      <pointLight position={[0, 2.4, -2]} intensity={2.5} color="#b39bff" distance={7} />

      {/* floor — warm wood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[7.2, 9]} />
        <meshStandardMaterial color="#3a2a1c" roughness={0.7} />
      </mesh>
      {/* carpet runner down the aisle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[1.6, 8.4]} />
        <meshStandardMaterial color="#5e1f2a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[1.9, 8.7]} />
        <meshStandardMaterial color="#caa84a" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* ceiling with a soft glowing beam */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[7.2, 0.2, 9]} />
        <meshStandardMaterial color="#1c1626" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.08, 0]}>
        <boxGeometry args={[0.5, 0.06, 8.4]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffd98a" emissiveIntensity={0.8} toneMapped={false} />
      </mesh>

      {/* side walls: warm wood paneling + brass rail */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 3.6, 0, 0]}>
          <mesh rotation={[0, side * Math.PI / 2, 0]}>
            <planeGeometry args={[9, 3.2]} />
            <meshStandardMaterial color="#3a2c22" roughness={0.85} side={2} />
          </mesh>
          {/* vertical wood panels */}
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[0, 1.6, -4 + i]}>
              <boxGeometry args={[0.06, 3.0, 0.9]} />
              <meshStandardMaterial color="#4a3320" roughness={0.7} />
            </mesh>
          ))}
          {/* brass rail */}
          <mesh position={[0, 2.9, 0]} rotation={[0, side * Math.PI / 2, 0]}>
            <boxGeometry args={[9, 0.08, 0.08]} />
            <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* faintly glowing magical rune carvings across the walls */}
      <WallCarving side={-1} />
      <WallCarving side={1} />
      {/* auto-closing house-coloured curtains */}
      <Curtain side={-1} />
      <Curtain side={1} />
      {/* small enchanted portraits that subtly move */}
      <EnchantedPortraitSmall x={-3.5} y={1.7} z={1.2} ry={Math.PI / 2} color="#7a5aa0" />
      <EnchantedPortraitSmall x={3.5} y={1.7} z={-1.2} ry={-Math.PI / 2} color="#3b6a7a" />
      {/* hidden ceiling air vents */}
      <CeilingVent x={-2} z={0} />
      <CeilingVent x={2} z={0} />
      <CeilingVent x={0} z={-2.2} />
      <CeilingVent x={0} z={2.2} />

      {/* parallax windows (left + right, facing inward) */}
      <group position={[-3.55, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <ParallaxWindow trainId={trainId} width={3.6} height={1.7} />
      </group>
      <group position={[3.55, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <ParallaxWindow trainId={trainId} width={3.6} height={1.7} />
      </group>
      {[-3.55, 3.55].map((x) => (
        <mesh key={x} position={[x, 1.4, 0]}>
          <boxGeometry args={[0.12, 2.0, 3.9]} />
          <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {/* 5 rows × 4 seats (2+2 forward-facing) */}
      {isRoyale ? (
        <>
          <RoyaleBooth />
          <SeatScreen position={[-2.4, 2.95, 0]} rotation={[0, -Math.PI / 2, 0]} />
          <RoyaleChapterBanner />
        </>
      ) : (
        <>
          {ROWS.map((z0) => (
            <group key={`row-${z0}`}>
              {/* 4 seats in this row (A B aisle C D) */}
              {(['A', 'B', 'C', 'D'] as SeatLetter[]).map((l) => (
                <group
                  key={`${z0}-${l}`}
                  position={[SEATS[l].pos[0], 0, z0]}
                  rotation={[0, 0, 0]}
                >
                  <Chair leather="#7a7a7a" trim="#2a2a2a" />
                </group>
              ))}
              {/* reading lights above each seat */}
              {(['A', 'B', 'C', 'D'] as SeatLetter[]).map((l) => (
                <ReadingLight
                  key={`rl-${z0}-${l}`}
                  pos={[SEATS[l].pos[0], 2.7, z0]}
                />
              ))}
            </group>
          ))}
          {/* player's row (z=0) gets small tray tables + extras */}
          <group position={[0, 0.65, 0]}>
            {/* small tray table between seats B and C */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.35, 0.03, 0.3]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
          </group>
          <WirelessPad />
          <USBPorts />
          <ServiceBell onRing={() => { setSummoned(true); playChime('bell') }} />
          {/* live timer screens above middle seat pairs */}
          <SeatScreen position={[-1.6, 2.95, 0]} rotation={[0, -Math.PI / 2, 0]} />
          <SeatScreen position={[1.6, 2.95, 0]} rotation={[0, Math.PI / 2, 0]} />
        </>
      )}

      {/* overhead luggage racks + window frames on both walls */}
      {[-1, 1].map((side) => (
        <group key={`rack-${side}`}>
          <LuggageRack side={side} />
          <WindowFrame side={side} />
        </group>
      ))}

      <CabinMotes />
      {isRoyale ? <RoyaleWalker /> : <WalkerInside letter={letter} />}
      {/* house-elf attendant, summoned by the service bell */}
      <HouseElfAttendant summoned={summoned} />
    </group>
  )
}

