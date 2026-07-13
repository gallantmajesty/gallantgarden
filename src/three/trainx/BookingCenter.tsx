import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CanvasTexture, Color, type Group, type Mesh, MeshStandardMaterial, type PointLight, type ShaderMaterial, Vector3 } from 'three'
import { useTrainX, TRAINS, vipUnlocked, type TrainId, type TrainXPhase } from '../../store/trainx'
import { useAvatar } from '../../avatar/store'
import { characterById } from '../../avatar/characters'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import type { AvatarConfig } from '../../avatar/config'
import type { Locomotion } from '../../avatar/animation'
import { playChime } from './sound'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const trackY = (z: number) => (z > 0 ? 0.2 + (z / 34) * 3.4 : 0.2)

type Accent = 'wood' | 'vine' | 'turret' | 'frost' | 'ornament' | 'star' | 'diamond'

const TRAIN_VIS: Record<TrainId, { body: string; trim: string; glow: string; manager: string; accent: Accent }> = {
  sprint:  { body: '#8a5a2b', trim: '#caa84a', glow: '#f0d9a0', manager: 'claire', accent: 'wood' },
  forest:  { body: '#2f6d3a', trim: '#7fe07f', glow: '#cfeec0', manager: 'mia', accent: 'vine' },
  kingdom: { body: '#5a2f8a', trim: '#ffd98a', glow: '#caa0e8', manager: 'rabbit', accent: 'turret' },
  frost:   { body: '#5b86b0', trim: '#dff1ff', glow: '#bfe6ff', manager: 'ruslan', accent: 'frost' },
  crystal: { body: '#b03030', trim: '#ffd98a', glow: '#ffd0c0', manager: 'dino', accent: 'ornament' },
  horizon: { body: '#c0c6d8', trim: '#ffffff', glow: '#dfe8ff', manager: 'james', accent: 'star' },
  royale:  { body: '#16161e', trim: '#caa84a', glow: '#e7c7ff', manager: 'rabbit', accent: 'diamond' },
}

function makeBoardTexture(unlockedVip: boolean): CanvasTexture {
  const w = 1280
  const h = 560
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0b1020'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#caa84a'
  ctx.font = 'bold 52px monospace'
  ctx.fillText('✦ FOCUS LILY RAIL — LIVE DEPARTURES ✦', 30, 64)
  ctx.strokeStyle = '#caa84a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(20, 88)
  ctx.lineTo(w - 20, 88)
  ctx.stroke()
  ctx.font = '32px monospace'
  let y = 140
  TRAINS.forEach((t, i) => {
    const time = `${String(6 + i * 2).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
    const filled = 4 + ((i * 7) % (t.seatsTotal - 8))
    const locked = t.locked && !unlockedVip
    ctx.fillStyle = locked ? '#6b7280' : '#e8eefc'
    ctx.fillText(time, 30, y)
    ctx.fillText(t.name, 170, y)
    ctx.fillStyle = '#9fd8ff'
    ctx.fillText(`${t.durationHours}h`, 680, y)
    ctx.fillStyle = '#bfe6a0'
    ctx.fillText(`${filled}/${t.seatsTotal}`, 800, y)
    ctx.fillStyle = '#caa84a'
    ctx.fillText(locked ? 'LOCKED' : t.scenery.split(' / ')[0], 960, y)
    y += 60
  })
  const tex = new CanvasTexture(c)
  tex.anisotropy = 4
  return tex
}

/** Per-train decorative accents on the roof / sides, giving each a unique
 *  magical exterior (wood trim, vines, castle turrets, frost crystals,
 *  christmas ornaments, stars, diamonds). */
function TrainAccent({ type, len, trim, glow }: { type: Accent; len: number; trim: string; glow: string }) {
  if (type === 'wood') {
    return (
      <group>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[1.45, 0.9 + i * 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[len - 1, 0.07, 0.07]} />
            <meshStandardMaterial color={trim} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`l${i}`} position={[-1.45, 0.9 + i * 0.34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[len - 1, 0.07, 0.07]} />
            <meshStandardMaterial color={trim} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    )
  }
  if (type === 'vine') {
    return (
      <group>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[1.46, 0.8 + (i % 4) * 0.5, -len / 2 + 1 + i * (len / 7)]}>
            <icosahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial color="#5fd06f" emissive="#2f8f3f" emissiveIntensity={0.4} roughness={0.6} />
          </mesh>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={`l${i}`} position={[-1.46, 0.8 + (i % 4) * 0.5, -len / 2 + 1 + i * (len / 7)]}>
            <icosahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial color="#5fd06f" emissive="#2f8f3f" emissiveIntensity={0.4} roughness={0.6} />
          </mesh>
        ))}
      </group>
    )
  }
  if (type === 'turret') {
    return (
      <group>
        {[-len / 2 + 1.5, 0, len / 2 - 1.5].map((z, i) => (
          <group key={i} position={[0, 2.95, z]}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.32, 0.38, 1.0, 12]} />
              <meshStandardMaterial color={trim} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 1.15, 0]}>
              <coneGeometry args={[0.45, 0.7, 12]} />
              <meshStandardMaterial color={glow} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[0.04, 0.5, 0.04]} />
              <meshStandardMaterial color="#3a1f5f" />
            </mesh>
            <mesh position={[0.25, 1.7, 0]}>
              <planeGeometry args={[0.4, 0.25]} />
              <meshStandardMaterial color="#b03030" side={2} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  if (type === 'frost') {
    return (
      <group>
        {[-len / 2 + 1.5, -len / 6, len / 6, len / 2 - 1.5].map((z, i) => (
          <mesh key={i} position={[0, 3.2, z]} rotation={[0, i, 0]}>
            <coneGeometry args={[0.22, 0.9, 6]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.6} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        ))}
      </group>
    )
  }
  if (type === 'ornament') {
    return (
      <group>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[0, 2.7, -len / 2 + 1 + i * (len / 6)]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color={i % 2 ? glow : '#2f8f3f'} emissive={i % 2 ? glow : '#2f8f3f'} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={`s${i}`} position={[1.46, 1.4, -len / 2 + 1 + i * (len / 6)]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
    )
  }
  if (type === 'star') {
    return (
      <group>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[1.46, 1.5 + (i % 3) * 0.5, -len / 2 + 1 + i * (len / 7)]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#ffffff" emissive="#cfe0ff" emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={`l${i}`} position={[-1.46, 1.5 + (i % 3) * 0.5, -len / 2 + 1 + i * (len / 7)]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#ffffff" emissive="#cfe0ff" emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
        ))}
      </group>
    )
  }
  // diamond (VIP)
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[1.46, 1.3 + (i % 3) * 0.6, -len / 2 + 1 + i * (len / 6)]} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.7} metalness={0.8} roughness={0.15} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`l${i}`} position={[-1.46, 1.3 + (i % 3) * 0.6, -len / 2 + 1 + i * (len / 6)]} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.7} metalness={0.8} roughness={0.15} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 3.4, 0]}>
        <torusGeometry args={[0.6, 0.06, 8, 24]} />
        <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A distinct magical train carriage per train id, sloping with the track.
 *  `openRef` (when provided) drives the side doors sliding open at the platform. */
function TrainCar({ trainId, openRef }: { trainId: TrainId; openRef?: React.RefObject<boolean> }) {
  const v = TRAIN_VIS[trainId]
  const len = 9
  const winCount = 5
  const dL = useRef<Mesh>(null)
  const dR = useRef<Mesh>(null)
  const glowColor = useMemo(() => new Color(v.glow), [v.glow])
  const white = useMemo(() => new Color('#dff0ff'), [])
  // shared materials so we can animate them once for the whole carriage
  const ledMat = useMemo(
    () => new MeshStandardMaterial({ color: v.glow, emissive: glowColor, emissiveIntensity: 0.9, toneMapped: false }),
    [v.glow, glowColor],
  )
  const lockMat = useMemo(
    () => new MeshStandardMaterial({ color: '#caa84a', emissive: new Color('#ffcf6a'), emissiveIntensity: 0.2, metalness: 0.7, roughness: 0.3, toneMapped: false }),
    [],
  )
  const winMat = useMemo(
    () => new MeshStandardMaterial({ color: '#0b1530', emissive: glowColor, emissiveIntensity: 0.55, transparent: true, opacity: 0.92, toneMapped: false }),
    [glowColor],
  )
  const frost = useRef(0)
  useFrame((state, dtRaw) => {
    const t = state.clock.elapsedTime
    const k = Math.min(1, dtRaw * 4)
    const open = openRef?.current ?? false
    const off = open ? 1.15 : 0
    if (dL.current) dL.current.position.z += (-off - dL.current.position.z) * k
    if (dR.current) dR.current.position.z += (off - dR.current.position.z) * k
    // LED edge lighting pulses gently
    if (ledMat) ledMat.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 2)
    // enchanted door lock glows when activated
    if (lockMat) lockMat.emissiveIntensity = open ? 1.6 : 0.2
    // windows shimmer, and frost over (privacy tint) when the door is shut
    const target = open ? 0 : 1
    frost.current += (target - frost.current) * Math.min(1, dtRaw * 3)
    const shimmer = 0.5 + 0.18 * Math.sin(t * 3)
    if (winMat) {
      winMat.emissiveIntensity = shimmer + frost.current * 0.5
      winMat.emissive.copy(glowColor).lerp(white, frost.current * 0.7)
      winMat.opacity = 0.9 + frost.current * 0.08
    }
  })
  const winZ = (i: number) => -len / 2 + 1.4 + i * ((len - 2.8) / Math.max(1, winCount - 1))
  return (
    <group>
      {/* LED underglow (modern edge lighting) */}
      <mesh position={[0, 0.3, 0.3]}>
        <boxGeometry args={[2.7, 0.16, len]} />
        <primitive object={ledMat} attach="material" />
      </mesh>

      {/* smooth metallic body (riveted panels + glowing rune inlays via TrainAccent) */}
      <mesh position={[0, 1.5, 0.3]} castShadow>
        <boxGeometry args={[2.6, 2.4, len]} />
        <meshStandardMaterial color={v.body} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* upper band */}
      <mesh position={[0, 2.55, 0.3]}>
        <boxGeometry args={[2.64, 0.6, len]} />
        <meshStandardMaterial color={v.trim} metalness={0.7} roughness={0.25} emissive={v.trim} emissiveIntensity={0.18} />
      </mesh>

      {/* steam-locomotive boiler at the front (-z), sleek + rounded */}
      <mesh position={[0, 1.5, -len / 2 - 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.15, 2.6, 24]} />
        <meshStandardMaterial color={v.body} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* engine cab on top of the boiler */}
      <mesh position={[0, 2.65, -len / 2 - 0.2]}>
        <boxGeometry args={[2.5, 1.4, 1.6]} />
        <meshStandardMaterial color={v.body} roughness={0.32} metalness={0.55} />
      </mesh>
      {/* smokestack with a magical glowing ember (no soot — enchanted) */}
      <mesh position={[0, 2.9, -len / 2 - 0.9]}>
        <cylinderGeometry args={[0.22, 0.26, 0.8, 12]} />
        <meshStandardMaterial color="#2a2a32" roughness={0.5} />
      </mesh>
      <mesh position={[0, 3.35, -len / 2 - 0.9]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3.4, -len / 2 - 0.9]} intensity={4} color="#ffcf8a" distance={6} />

      {/* magical glowing engine core (rune circle) at the nose */}
      <mesh position={[0, 1.5, -len / 2 - 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.08, 10, 28]} />
        <meshStandardMaterial color={v.glow} emissive={v.glow} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.5, -len / 2 - 1.6]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={v.glow} emissive={v.glow} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.5, -len / 2 - 1.6]} intensity={5} color={v.glow} distance={7} />

      {/* LED strip along the roof edge + side sills */}
      <mesh position={[0, 2.86, 0.3]}>
        <boxGeometry args={[2.5, 0.06, len]} />
        <primitive object={ledMat} attach="material" />
      </mesh>
      {[-1.3, 1.3].map((sx) => (
        <mesh key={sx} position={[sx, 1.0, 0.3]}>
          <boxGeometry args={[0.06, 0.06, len]} />
          <primitive object={ledMat} attach="material" />
        </mesh>
      ))}
      {/* glowing rune inlays along the body */}
      {[-1.32, 1.32].map((sx) => (
        <mesh key={`r${sx}`} position={[sx, 1.6, 0.3]}>
          <boxGeometry args={[0.03, 0.06, len - 1.5]} />
          <primitive object={ledMat} attach="material" />
        </mesh>
      ))}

      {/* windows — subtle magical shimmer, frost over when door closes */}
      {[-1.31, 1.31].map((sx) => (
        <group key={sx}>
          {Array.from({ length: winCount }, (_, i) => (
            <mesh key={i} position={[sx, 1.9, winZ(i)]} rotation={[0, sx < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <planeGeometry args={[1.7, 1.0]} />
              <primitive object={winMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* gold trim lines front/back */}
      {[len / 2, -len / 2 + 0.4].map((z, i) => (
        <mesh key={i} position={[0, 0.95, z + 0.3]}>
          <boxGeometry args={[2.7, 0.1, 0.1]} />
          <meshStandardMaterial color={v.trim} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* wheels */}
      {[-len / 2 + 1.5, 0, len / 2 - 1.5].map((z, i) =>
        [[-1.25], [1.25]].flatMap(([sx]) => (
          <mesh key={`w${i}${sx}`} position={[sx, 0.4, z + 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 14]} />
            <meshStandardMaterial color="#1a1a1f" roughness={0.7} metalness={0.3} />
          </mesh>
        )),
      )}

      {/* glass observation dome on top of a carriage */}
      <mesh position={[0, 2.85, 1.0]}>
        <sphereGeometry args={[0.9, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#bfe6ff" transparent opacity={0.28} roughness={0.1} metalness={0.1} side={2} />
      </mesh>

      {/* sliding doors on the platform-facing (-x) side, with golden enchanted handles */}
      <mesh ref={dL} position={[-1.33, 1.55, -0.55]}>
        <boxGeometry args={[0.06, 2.0, 1.1]} />
        <meshStandardMaterial color={v.trim} metalness={0.6} roughness={0.3} emissive={v.trim} emissiveIntensity={0.15} />
      </mesh>
      <mesh ref={dR} position={[-1.33, 1.55, 0.55]}>
        <boxGeometry args={[0.06, 2.0, 1.1]} />
        <meshStandardMaterial color={v.trim} metalness={0.6} roughness={0.3} emissive={v.trim} emissiveIntensity={0.15} />
      </mesh>
      {/* golden enchanted handles */}
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[-1.36, 1.55, z]}>
          <boxGeometry args={[0.04, 0.9, 0.05]} />
          <meshStandardMaterial color="#caa84a" metalness={0.8} roughness={0.2} emissive="#caa84a" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* enchanted lock glows above the doors when activated */}
      <mesh position={[-1.36, 2.65, 0]}>
        <boxGeometry args={[0.08, 0.32, 1.2]} />
        <primitive object={lockMat} attach="material" />
      </mesh>

      <TrainAccent type={v.accent} len={len} trim={v.trim} glow={v.glow} />
    </group>
  )
}

const mod1 = (v: number) => ((v % 1) + 1) % 1
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInCubic = (t: number) => t * t * t

/** One train cycling its track in real time. RIGHT track (x=+6) = arrival,
 *  LEFT track (x=-6) = departure. Slopes down toward the platform, eases into a
 *  graceful stop (no wall crash), dwells, then departs. Reports station state so
 *  the booked train's doors open and boarding can trigger. */
function TrainOnTrack({
  trainId,
  x,
  period,
  offset,
  openRef,
  onStationChange,
}: {
  trainId: TrainId
  x: number
  period: number
  offset: number
  openRef?: React.RefObject<boolean>
  onStationChange?: (open: boolean) => void
}) {
  const ref = useRef<Group>(null)
  const station = useRef(false)
  const stationRef = useRef(false)
  useFrame((state) => {
    const p = mod1((state.clock.elapsedTime + offset) / period)
    let z: number
    if (p < 0.4) z = 34 * (1 - easeOutCubic(p / 0.4)) // approach, decelerate into stop
    else if (p < 0.6) z = 0 // dwell at platform
    else z = -34 * easeInCubic((p - 0.6) / 0.4) // depart, accelerate away
    if (ref.current) {
      ref.current.position.set(x, trackY(z), z)
      ref.current.rotation.x = -0.1 // gentle downward slope
    }
    const nowStation = p >= 0.4 && p < 0.6
    if (nowStation !== station.current) {
      station.current = nowStation
      stationRef.current = nowStation
      onStationChange?.(nowStation)
    }
    if (openRef) openRef.current = nowStation
  })
  return (
    <group ref={ref} position={[x, trackY(34), 34]}>
      <TrainCar trainId={trainId} openRef={openRef} />
    </group>
  )
}

function QueueLanes() {
  const lanes = useMemo(() => {
    const out: { x: number; z: number }[] = []
    for (let l = 0; l < 10; l++) {
      const x = -9 + l * 2
      for (let z = 2; z <= 12; z += 5) out.push({ x, z })
    }
    return out
  }, [])
  return (
    <group>
      {lanes.map((s, i) => (
        <mesh key={i} position={[s.x, 0.5, s.z]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
          <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function Column({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 10, 16]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 10.2, 0]}>
        <cylinderGeometry args={[0.8, 0.5, 0.5, 16]} />
        <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Chandelier({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 16, z]}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffd98a" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight intensity={20} color="#ffd9a0" distance={26} />
    </group>
  )
}

// ── PHASE 9 Booking Center: Gringotts teller stations (HP × modern fusion) ──

/** Self-writing enchanted pen hovering above the counter. */
function FloatingPen() {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.x = Math.sin(t * 3) * 0.12
      ref.current.position.y = 2.72 + Math.sin(t * 6) * 0.02
      ref.current.rotation.z = Math.sin(t * 3) * 0.25
    }
  })
  return (
    <group ref={ref} position={[0, 2.72, 0.3]}>
      <mesh rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
        <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.22, 0]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.02, 0.06, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  )
}

/** Enchanted parchment booking form that glows brighter as you approach. */
function ParchmentScreen({ playerPos, worldX }: { playerPos: React.MutableRefObject<Vector3>; worldX: number }) {
  const { c, ctx } = useMemo(() => makeCanvas(256, 320), [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  const matRef = useRef<MeshStandardMaterial>(null)
  const acc = useRef(0)
  useFrame((_, dt) => {
    if (matRef.current) {
      const d = Math.hypot(playerPos.current.x - worldX, playerPos.current.z + 9)
      matRef.current.emissiveIntensity = d < 4.5 ? 0.95 : 0.25
    }
    acc.current += dt
    if (acc.current < 0.4) return
    acc.current = 0
    ctx.fillStyle = '#efe2c0'
    ctx.fillRect(0, 0, 256, 320)
    ctx.strokeStyle = '#b89a5a'
    ctx.lineWidth = 3
    ctx.strokeRect(8, 8, 240, 304)
    ctx.fillStyle = '#5a3a1a'
    ctx.font = 'bold 26px serif'
    ctx.fillText('BOOKING FORM', 22, 52)
    ctx.font = '18px serif'
    ctx.fillText('Name:  ___________', 22, 104)
    ctx.fillText('Train: ___________', 22, 146)
    ctx.fillText('Seat:  ___________', 22, 188)
    ctx.fillText('Date:  ___________', 22, 230)
    ctx.strokeStyle = '#7a5a2a'
    ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) ctx.strokeRect(118, 90 + i * 42, 118, 26)
    tex.needsUpdate = true
  })
  return (
    <mesh position={[0, 2.7, 0.55]}>
      <planeGeometry args={[0.9, 1.1]} />
      <meshStandardMaterial ref={matRef} map={tex} emissive="#ffe6a0" emissiveMap={tex} emissiveIntensity={0.25} toneMapped={false} />
    </mesh>
  )
}

/** Modern touchscreen panel mounted on the counter (iPad-like). */
function TouchScreen() {
  const { c, ctx } = useMemo(() => makeCanvas(256, 160), [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.5) return
    acc.current = 0
    ctx.fillStyle = '#0c1830'
    ctx.fillRect(0, 0, 256, 160)
    ctx.fillStyle = '#7fd0ff'
    ctx.font = 'bold 22px monospace'
    ctx.fillText('FOCUS LILY', 16, 36)
    ctx.font = '14px monospace'
    ctx.fillStyle = '#bfe8ff'
    ctx.fillText('> Select your train', 16, 74)
    ctx.fillText('> Tap to book', 16, 102)
    ctx.fillText('> Scan ticket (QR)', 16, 130)
    tex.needsUpdate = true
  })
  return (
    <group position={[0, 1.7, 0.72]} rotation={[-0.25, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.2, 0.7, 0.06]} />
        <meshStandardMaterial color="#0c1830" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.1, 0.6]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Modern QR / ticket scanner with a sweeping beam. */
function QRScanner() {
  const beam = useRef<Mesh>(null)
  useFrame((state) => {
    if (beam.current) {
      const t = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2
      beam.current.position.y = -0.1 + t * 0.2
    }
  })
  return (
    <group position={[0.55, 1.7, 0.5]}>
      <mesh>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
        <meshStandardMaterial color="#2a2a32" roughness={0.5} />
      </mesh>
      <mesh ref={beam} position={[0, -0.1, 0.1]}>
        <boxGeometry args={[0.16, 0.02, 0.02]} />
        <meshStandardMaterial color="#39ff88" emissive="#39ff88" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Modern ergonomic chair behind the manager. */
function ErgoChair() {
  return (
    <group position={[0, 0, -0.9]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.7, 0.1, 0.7]} />
        <meshStandardMaterial color="#1c1c22" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.95, -0.3]}>
        <boxGeometry args={[0.7, 0.9, 0.12]} />
        <meshStandardMaterial color="#2a2a32" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
        <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
        <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Magical queue orb floating above each counter, showing the counter number. */
function QueueOrb({ n }: { n: number }) {
  const { c, ctx } = useMemo(() => makeCanvas(128, 128), [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  useEffect(() => {
    ctx.fillStyle = '#1a1426'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#ffe6c0'
    ctx.font = 'bold 72px serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(n), 64, 90)
    tex.needsUpdate = true
  }, [n, c, ctx, tex])
  return (
    <group position={[0, 4.2, 0]}>
      <mesh>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color="#caa84a" emissive="#ffcf6a" emissiveIntensity={1.4} metalness={0.6} roughness={0.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.4]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      <pointLight color="#ffcf8a" intensity={3} distance={4} />
    </group>
  )
}

/** Gringotts-style booking counter: wood + glass + gold trim, touchscreen,
 *  enchanted parchment, QR scanner, floating pen, ergonomic chair, queue orb,
 *  and the manager in a (visually suggested) slim-fit robe. */
function GringottsCounter({
  x,
  trainId,
  config,
  playerPos,
  index,
}: {
  x: number
  trainId: TrainId
  config: AvatarConfig
  playerPos: React.MutableRefObject<Vector3>
  index: number
}) {
  const v = TRAIN_VIS[trainId]
  return (
    <group position={[x, 0, -9]}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 2.1, 1.3]} />
        <meshStandardMaterial color="#3a2c22" roughness={0.55} />
      </mesh>
      {/* glass front panel */}
      <mesh position={[0, 1.0, 0.66]}>
        <boxGeometry args={[1.8, 1.9, 0.04]} />
        <meshStandardMaterial color="#9fd8ff" transparent opacity={0.18} roughness={0.1} metalness={0.2} />
      </mesh>
      {/* gold trim top + base */}
      <mesh position={[0, 2.12, 0]}>
        <boxGeometry args={[2.0, 0.12, 1.4]} />
        <meshStandardMaterial color={v.trim} metalness={0.7} roughness={0.25} emissive={v.trim} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[2.0, 0.12, 1.4]} />
        <meshStandardMaterial color={v.trim} metalness={0.7} roughness={0.25} />
      </mesh>
      <TouchScreen />
      <ParchmentScreen playerPos={playerPos} worldX={x} />
      <QRScanner />
      <FloatingPen />
      <ErgoChair />
      <group position={[0, 0, -0.7]}>
        <CharacterAvatar config={config} />
      </group>
      <QueueOrb n={index + 1} />
    </group>
  )
}

/** Wandering background passenger for life in the hall. */
function BackgroundPassenger({ config, path, speed, phase }: { config: AvatarConfig; path: Vector3[]; speed: number; phase: number }) {
  const ref = useRef<Group>(null)
  const seg = useRef(0)
  const t = useRef(phase)
  useFrame((_, dtRaw) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)
    t.current = (t.current + dt * speed) % 1
    const n = path.length
    const f = t.current * n
    const i = Math.floor(f) % n
    const a = path[i]
    const b = path[(i + 1) % n]
    const e = f - Math.floor(f)
    g.position.lerpVectors(a, b, e)
    const dir = new Vector3().subVectors(b, a)
    if (dir.lengthSq() > 1e-4) g.rotation.y = Math.atan2(dir.x, dir.z)
  })
  return (
    <group ref={ref}>
      <CharacterAvatar config={config} />
    </group>
  )
}

function FreeWalker({
  playerPos,
  config,
  active,
  onArrive,
  highlighted,
}: {
  playerPos: React.MutableRefObject<Vector3>
  config: AvatarConfig
  active: boolean
  onArrive: () => void
  highlighted?: boolean
}) {
  const ref = useRef<Group>(null)
  const keys = useRef<Record<string, boolean>>({})
  const arrived = useRef(false)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keys.current[k] = true
        if (k.startsWith('arrow')) e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
  useFrame((_, dtRaw) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(dtRaw, 0.05)
    let moving = false
    if (active) {
      const k = keys.current
      let mx = 0
      let mz = 0
      if (k['w'] || k['arrowup']) mz -= 1
      if (k['s'] || k['arrowdown']) mz += 1
      if (k['a'] || k['arrowleft']) mx -= 1
      if (k['d'] || k['arrowright']) mx += 1
      const len = Math.hypot(mx, mz)
      if (len > 0) {
        mx /= len
        mz /= len
        moving = true
        playerPos.current.x = clamp(playerPos.current.x + mx * dt * 4.6, -13, 13)
        playerPos.current.z = clamp(playerPos.current.z + mz * dt * 4.6, -2, 22)
        g.rotation.y = Math.atan2(mx, mz)
      }
      // reaching the front of any counter opens booking
      if (!arrived.current && playerPos.current.z < -6.5 && Math.abs(playerPos.current.x) < 11) {
        arrived.current = true
        onArrive()
      }
    }
    loco.current.speed = moving ? 4.6 : 0
    g.position.set(playerPos.current.x, 0, playerPos.current.z)
  })
  return (
    <group ref={ref} position={playerPos.current}>
      <CharacterAvatar config={config} locomotion={loco} />
      {highlighted && (
        <group position={[0, 0.02, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.95, 32]} />
            <meshBasicMaterial color="#7CFFB0" transparent opacity={0.9} toneMapped={false} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 5, 8]} />
            <meshBasicMaterial color="#7CFFB0" transparent opacity={0.25} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function CameraFollow({ playerPos, active }: { playerPos: React.MutableRefObject<Vector3>; active: boolean }) {
  const camera = useThree((s) => s.camera)
  const desired = useMemo(() => new Vector3(), [])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    if (active) desired.set(playerPos.current.x, 5.4, playerPos.current.z + 9)
    else desired.set(0, 4.4, 11)
    camera.position.lerp(desired, 1 - Math.exp(-6 * dt))
    camera.lookAt(active ? playerPos.current.x * 0.4 : 0, active ? 1.2 : 2, active ? playerPos.current.z : -9)
  })
  return null
}

/** The security / guide NPC at the entrance. */
function SecurityNPC({ config }: { config: AvatarConfig }) {
  return (
    <group position={[0, 0, 15]}>
      <CharacterAvatar config={config} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 9 — Harry Potter × Modern luxury fusion decor for the grand concourse.
// "Hogwarts Express got a 2025 upgrade": stone + runes + LED, enchanted ceiling,
// floating candles, moving portraits, marble floor, clock tower, security arch.
// ─────────────────────────────────────────────────────────────────────────────

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

/** Polished marble floor with faint glowing rune rings (magical under-lighting). */
function MarbleFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#cfc9d8" roughness={0.28} metalness={0.12} />
      </mesh>
      {[6, 12, 18].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 6]}>
          <ringGeometry args={[r - 0.16, r + 0.16, 72]} />
          <meshBasicMaterial color="#caa84a" transparent opacity={0.32} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 6]}>
        <circleGeometry args={[2.2, 48]} />
        <meshBasicMaterial color="#9fe0ff" transparent opacity={0.16} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Enchanted ceiling (Great-Hall style): twilight sky, drifting stars + moon. */
const skyFrag = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    vec3 col = mix(vec3(0.16, 0.11, 0.24), vec3(0.03, 0.04, 0.11), uv.y);
    float md = distance(uv, vec2(0.78, 0.82));
    col += vec3(0.85, 0.9, 1.0) * smoothstep(0.13, 0.0, md) * 0.7;
    vec2 g = floor(uv * 60.0);
    float s = hash(g);
    if (s > 0.985) {
      float d = distance(fract(uv * 60.0), vec2(0.5));
      float tw = 0.5 + 0.5 * sin(uTime * 2.0 + s * 40.0);
      col += vec3(1.0) * tw * smoothstep(0.12, 0.0, d);
    }
    float cl = smoothstep(0.18, 0.0, abs(sin((uv.x + uTime * 0.02) * 3.0) + uv.y * 0.5 - 0.35));
    col = mix(col, vec3(0.5, 0.45, 0.62), cl * 0.10);
    gl_FragColor = vec4(col, 1.0);
  }
`
function EnchantedCeiling() {
  const mat = useRef<ShaderMaterial>(null)
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt
  })
  return (
    <mesh position={[0, 17, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <shaderMaterial
        ref={mat}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
        fragmentShader={skyFrag}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Enchanted floating candle / lantern — hovers with no support, flickers. */
function FloatingCandle({ x, y, z }: { x: number; y: number; z: number }) {
  const ref = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      ref.current.position.y = y + Math.sin(t * 0.8 + x) * 0.12
      ref.current.rotation.y = Math.sin(t * 0.3 + x) * 0.12
    }
    if (light.current) light.current.intensity = 8 + Math.sin(t * 9 + x) * 2
  })
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.09, 0.4, 8]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <coneGeometry args={[0.07, 0.2, 8]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.32, 0]} intensity={8} color="#ffcf8a" distance={9} />
    </group>
  )
}

/** Moving portrait — a painted face that blinks and waves (canvas, low-fps redraw). */
function MovingPortrait({ x, y, z, ry, color }: { x: number; y: number; z: number; ry: number; color: string }) {
  const { c, ctx } = useMemo(() => makeCanvas(256, 320), [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  const acc = useRef(0)
  useFrame((state, dt) => {
    acc.current += dt
    if (acc.current < 0.12) return
    acc.current = 0
    const t = state.clock.elapsedTime
    const eyeH = Math.sin(t * 0.6 + x) > 0.93 ? 0.12 : 1.0
    ctx.fillStyle = '#2a2030'
    ctx.fillRect(0, 0, 256, 320)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(128, 252, 72, 66, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f0d2b0'
    ctx.beginPath()
    ctx.arc(128, 128, 52, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#222'
    ctx.fillRect(104, 120, 12, 10 * eyeH)
    ctx.fillRect(140, 120, 12, 10 * eyeH)
    ctx.strokeStyle = '#7a3b3b'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(128, 150, 22, 0.2, Math.PI - 0.2)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(198, 150 + Math.sin(t * 3) * 8, 18, 0, Math.PI * 2)
    ctx.fill()
    tex.needsUpdate = true
  })
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[1.62, 2.02, 0.14]} />
        <meshStandardMaterial color="#caa84a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[1.4, 1.8]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Arched stone doorway carved with glowing runes (magical gateway). */
function MagicalArch({ x, z, ry }: { x: number; z: number; ry: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[0.8, 6, 0.8]} />
        <meshStandardMaterial color="#6b5a44" roughness={0.9} />
      </mesh>
      <mesh position={[3, 3, 0]}>
        <boxGeometry args={[0.8, 6, 0.8]} />
        <meshStandardMaterial color="#6b5a44" roughness={0.9} />
      </mesh>
      <mesh position={[1.5, 6.1, 0]}>
        <boxGeometry args={[3.8, 0.7, 0.8]} />
        <meshStandardMaterial color="#6b5a44" roughness={0.9} />
      </mesh>
      {[1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.45, i, 0.42]}>
          <boxGeometry args={[0.06, 0.5, 0.02]} />
          <meshStandardMaterial color="#ffd98a" emissive="#ffcf6a" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
      {[1, 2, 3, 4].map((i) => (
        <mesh key={`r${i}`} position={[3.45, i, 0.42]}>
          <boxGeometry args={[0.06, 0.5, 0.02]} />
          <meshStandardMaterial color="#ffd98a" emissive="#ffcf6a" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Old wooden bench with a faintly glowing magical carving along the front. */
function RuneBench({ x, z, ry }: { x: number; z: number; ry: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[2.4, 0.5, 0.8]} />
        <meshStandardMaterial color="#4a2c1a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.4, 0.18, 0.8]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.7} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.0, 0.12, 0]}>
          <boxGeometry args={[0.2, 0.25, 0.7]} />
          <meshStandardMaterial color="#3a2212" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0.41]}>
        <boxGeometry args={[1.8, 0.04, 0.02]} />
        <meshStandardMaterial color="#9fe0ff" emissive="#7fd0ff" emissiveIntensity={1.0} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Grand clock tower showing the countdown to the next departure. */
function ClockTower({ x, z }: { x: number; z: number }) {
  const { c, ctx } = useMemo(() => makeCanvas(256, 256), [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += dt
    if (acc.current < 0.5) return
    acc.current = 0
    const rem = 6 * 60000 - (Date.now() % (6 * 60000))
    const mm = Math.floor(rem / 60000)
    const ss = Math.floor((rem % 60000) / 1000)
    ctx.fillStyle = '#1a1426'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#caa84a'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(128, 128, 110, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#ffe6c0'
    ctx.textAlign = 'center'
    ctx.font = 'bold 64px monospace'
    ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, 128, 150)
    ctx.font = '18px monospace'
    ctx.fillText('NEXT DEPARTURE', 128, 214)
    tex.needsUpdate = true
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[3, 12, 3]} />
        <meshStandardMaterial color="#6b5a44" roughness={0.9} />
      </mesh>
      <mesh position={[0, 12.6, 0]}>
        <coneGeometry args={[2.4, 3, 4]} />
        <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 9, 1.56]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Modern security scanner styled as a Detector-of-Dark-Magic archway. */
function SecurityArch({ x, z }: { x: number; z: number }) {
  const mat = useRef<MeshStandardMaterial>(null)
  useFrame((state) => {
    if (mat.current) {
      const p = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.0)
      mat.current.emissiveIntensity = 0.6 + p * 0.8
    }
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.5, -1]}>
        <boxGeometry args={[0.6, 5, 0.6]} />
        <meshStandardMaterial color="#6b5a44" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, 1]}>
        <boxGeometry args={[0.6, 5, 0.6]} />
        <meshStandardMaterial color="#6b5a44" roughness={0.9} />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <torusGeometry args={[1.2, 0.2, 10, 24]} />
        <meshStandardMaterial ref={mat} color="#ffae5a" emissive="#ff8a3a" emissiveIntensity={1} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Embedded neon accent strip in a stone wall (warm gold). */
function WallLED({ x, y, z, len, ry, color = '#ffcf6a' }: { x: number; y: number; z: number; len: number; ry: number; color?: string }) {
  return (
    <mesh position={[x, y, z]} rotation={[0, ry, 0]}>
      <boxGeometry args={[len, 0.08, 0.08]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
    </mesh>
  )
}

/** Holographic train schedule floating between the beams. */
function HologramSchedule({ x, y, z }: { x: number; y: number; z: number }) {
  const { c, ctx } = useMemo(() => makeCanvas(256, 256), [])
  const tex = useMemo(() => new CanvasTexture(c), [c])
  const ref = useRef<Group>(null)
  const acc = useRef(0)
  useFrame((state, dt) => {
    if (ref.current) ref.current.position.y = y + Math.sin(state.clock.elapsedTime * 0.6 + x) * 0.06
    acc.current += dt
    if (acc.current < 1) return
    acc.current = 0
    ctx.fillStyle = 'rgba(18,34,52,0.55)'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = '#7fd0ff'
    ctx.lineWidth = 3
    ctx.strokeRect(8, 8, 240, 240)
    ctx.fillStyle = '#bfe8ff'
    ctx.font = 'bold 24px monospace'
    ctx.fillText('SCHEDULE', 56, 46)
    ctx.font = '18px monospace'
    TRAINS.forEach((t, i) => ctx.fillText(`${t.name.slice(0, 15)}  ${t.durationHours}h`, 18, 86 + i * 20))
    tex.needsUpdate = true
  })
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh>
        <planeGeometry args={[1.4, 1.4]} />
        <meshBasicMaterial map={tex} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Velvet-rope barrier held by golden enchanted stands. */
function VelvetRope({ x, z, len }: { x: number; z: number; len: number }) {
  return (
    <group position={[x, 0, z]}>
      {[-len / 2, len / 2].map((sx, i) => (
        <group key={i} position={[sx, 0, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 1.8, 10]} />
            <meshStandardMaterial color="#caa84a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#caa84a" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, len, 8]} />
        <meshStandardMaterial color="#7a1f2a" roughness={0.8} />
      </mesh>
    </group>
  )
}

export function BookingCenter({
  phase,
  onArrive,
  onBoard,
}: {
  phase: TrainXPhase
  onArrive: () => void
  onBoard: () => void
}) {
  const myConfig = useAvatar((s) => s.config)
  const completed = useTrainX((s) => s.completedTrains)
  const board = useMemo(() => makeBoardTexture(vipUnlocked(completed)), [completed])
  const playerPos = useRef(new Vector3(0, 0, 22))
  const roaming = phase === 'queue' || phase === 'confirmed' || phase === 'selecting' || phase === 'warning'

  // Booking / boarding state shared with the train loop.
  const atStation = useRef(false)
  const boarding = useRef(false)
  const bookedOpen = useRef(false)
  // When the player walks up to the doors of their (stationed) train → board.
  useFrame(() => {
    if (boarding.current) return
    if (phase === 'confirmed' && atStation.current) {
      const d = Math.hypot(playerPos.current.x - 4.5, playerPos.current.z)
      if (d < 3.4) {
        boarding.current = true
        bookedOpen.current = false
        playChime('close')
        onBoard()
      }
    }
  })

  const securityConfig = useMemo(() => characterById('ruslan').fallback, [])
  const managerConfigs = useMemo(
    () => TRAINS.map((t) => characterById(TRAIN_VIS[t.id].manager).fallback),
    [],
  )
  const bgConfigs = useMemo(
    () => [characterById('claire').fallback, characterById('mia').fallback, characterById('dino').fallback],
    [],
  )

  const bookedId = useTrainX((s) => s.selectedTrainId)
  const incoming = useMemo(() => TRAINS.map((t, i) => ({ id: t.id, offset: i * 4, period: 26 + i * 2 })), [])

  return (
    <group>
      <fog attach="fog" args={['#0a0e1c', 18, 80]} />
      <ambientLight intensity={0.5} color="#ffe6c0" />
      <hemisphereLight args={['#dfe8ff', '#6b4a2a', 0.5]} />
      <spotLight position={[0, 22, 16]} angle={0.7} penumbra={0.7} intensity={90} color="#ffdca8" castShadow />
      <pointLight position={[0, 8, -9]} intensity={22} color="#ffcf9a" distance={30} />

      {/* grand marble floor (with glowing rune under-lighting) + enchanted ceiling */}
      <MarbleFloor />
      <EnchantedCeiling />

      {/* columns + chandeliers */}
      {[
        [-13, -6], [13, -6], [-13, 6], [13, 6], [-13, 18], [13, 18],
      ].map(([x, z], i) => (<Column key={i} x={x} z={z} />))}
      {[[-9, 0], [9, 0], [-9, 12], [9, 12]].map(([x, z], i) => (<Chandelier key={i} x={x} z={z} />))}

      {/* back wall — ancient stone with warm-gold LED strips */}
      <mesh position={[0, 9, -16]}>
        <boxGeometry args={[70, 18, 0.6]} />
        <meshStandardMaterial color="#4a4036" roughness={0.95} />
      </mesh>
      {/* embedded neon accent strips in the stone */}
      <WallLED x={0} y={16.4} z={-15.6} len={68} ry={0} />
      <WallLED x={0} y={2} z={-15.6} len={68} ry={0} />
      <WallLED x={-34} y={9} z={-15.6} len={16} ry={Math.PI / 2} />
      <WallLED x={34} y={9} z={-15.6} len={16} ry={Math.PI / 2} />
      {/* arched stone doorways carved with glowing runes */}
      <MagicalArch x={-20} z={-15} ry={0} />
      <MagicalArch x={0} z={-15} ry={0} />
      <MagicalArch x={20} z={-15} ry={0} />
      {/* moving portraits along the wall */}
      <MovingPortrait x={-28} y={6} z={-15.4} ry={0} color="#7a3b5a" />
      <MovingPortrait x={-12} y={6} z={-15.4} ry={0} color="#3b5a7a" />
      <MovingPortrait x={12} y={6} z={-15.4} ry={0} color="#5a3b7a" />
      <MovingPortrait x={28} y={6} z={-15.4} ry={0} color="#3b7a5a" />
      {/* grand clock tower (countdown to next departure) */}
      <ClockTower x={-30} z={-13} />

      {/* side glass + sloping tracks (right = arrival, left = departure) */}
      {[6, -6].map((x) => (
        <mesh key={x} position={[x, 4, 4]}>
          <planeGeometry args={[0.4, 12]} />
          <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.3} transparent opacity={0.22} />
        </mesh>
      ))}
      {[6, -6].map((x) => (
        <mesh key={`r${x}`} position={[x, 2.4, 0]} rotation={[-Math.PI / 2 + 0.12, 0, 0]}>
          <planeGeometry args={[1.4, 70]} />
          <meshStandardMaterial color="#15131f" roughness={0.9} />
        </mesh>
      ))}

      <QueueLanes />

      {/* 7 Gringotts-style booking counters — one per train */}
      {TRAINS.map((train, i) => {
        const x = -6 + i * 2
        return <GringottsCounter key={train.id} x={x} trainId={train.id} config={managerConfigs[i]} playerPos={playerPos} index={i} />
      })}

      {/* security / guide NPC at the entrance, under a Dark-Magic detector arch */}
      <SecurityNPC config={securityConfig} />
      <SecurityArch x={0} z={14} />

      {/* floating enchanted candles / lanterns drifting through the hall */}
      <FloatingCandle x={-9} y={9} z={2} />
      <FloatingCandle x={9} y={10} z={2} />
      <FloatingCandle x={0} y={11} z={-4} />
      <FloatingCandle x={-6} y={8} z={12} />
      <FloatingCandle x={6} y={8} z={12} />
      <FloatingCandle x={-14} y={9} z={-6} />
      <FloatingCandle x={14} y={9} z={-6} />

      {/* old wooden benches with glowing carvings */}
      <RuneBench x={-10} z={9} ry={Math.PI / 2} />
      <RuneBench x={10} z={9} ry={-Math.PI / 2} />
      <RuneBench x={-10} z={-2} ry={Math.PI / 2} />
      <RuneBench x={10} z={-2} ry={-Math.PI / 2} />

      {/* velvet-rope barriers held by golden enchanted stands */}
      <VelvetRope x={-3.5} z={11} len={7} />
      <VelvetRope x={3.5} z={11} len={7} />

      {/* holographic schedules floating between the beams */}
      <HologramSchedule x={-5} y={6.5} z={3} />
      <HologramSchedule x={5} y={6.5} z={3} />

      {/* departure board */}
      <mesh position={[0, 8.5, -15.6]}>
        <boxGeometry args={[15, 7.5, 0.3]} />
        <meshStandardMaterial color="#1a2030" roughness={0.8} />
      </mesh>
      <mesh position={[0, 8.5, -15.4]}>
        <planeGeometry args={[14.4, 7]} />
        <meshBasicMaterial map={board} toneMapped={false} />
      </mesh>

      {/* real-time trains on both tracks — hidden during lobby/booking, appear after confirm */}
      {(phase === 'warning' || phase === 'confirmed' || phase === 'boarding' || phase === 'arriving') && (
        <>
          {incoming.map((t) => {
            const isBooked = t.id === bookedId
            return (
              <TrainOnTrack
                key={t.id}
                trainId={t.id}
                x={6}
                period={t.period}
                offset={t.offset}
                openRef={isBooked ? bookedOpen : undefined}
                onStationChange={isBooked ? (o) => { atStation.current = o; if (o) playChime('open'); else playChime('whistle') } : undefined}
              />
            )
          })}
          {incoming.slice(0, 3).map((t, i) => (
            <TrainOnTrack key={`out-${t.id}`} trainId={t.id} x={-6} period={t.period + 6} offset={t.offset + 13} />
          ))}
        </>
      )}

      {/* boarding beacon at the booked train's doors */}
      {phase === 'confirmed' && (
        <group position={[4.5, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[1.0, 1.3, 32]} />
            <meshBasicMaterial color="#7CFFB0" transparent opacity={0.8} toneMapped={false} />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <coneGeometry args={[0.4, 0.8, 4]} />
            <meshBasicMaterial color="#7CFFB0" transparent opacity={0.8} toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* background passengers */}
      <BackgroundPassenger config={bgConfigs[0]} speed={0.05} phase={0} path={useMemo(() => [new Vector3(-8, 0, 4), new Vector3(-8, 0, 14), new Vector3(8, 0, 14), new Vector3(8, 0, 4)], [])} />
      <BackgroundPassenger config={bgConfigs[1]} speed={0.04} phase={0.4} path={useMemo(() => [new Vector3(7, 0, 8), new Vector3(-7, 0, 8), new Vector3(-7, 0, 2), new Vector3(7, 0, 2)], [])} />
      <BackgroundPassenger config={bgConfigs[2]} speed={0.06} phase={0.7} path={useMemo(() => [new Vector3(0, 0, 12), new Vector3(10, 0, 10), new Vector3(0, 0, 6), new Vector3(-10, 0, 10)], [])} />

      <FreeWalker playerPos={playerPos} config={myConfig} active={roaming} onArrive={onArrive} highlighted={phase === 'confirmed'} />
      <CameraFollow playerPos={playerPos} active={roaming} />
    </group>
  )
}
