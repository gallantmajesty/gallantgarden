import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, type PointLight, type MeshStandardMaterial } from 'three'
import { makeWood } from './textures'
import { glow } from './env'
import { platforms, TRAIN_REST_Z, PLAT_Z1 } from './layout'
import { TRAIN_LINES, type TrainLine } from '../../lib/train/lines'
import { platformStatus, APPROACH_SEC, DEPART_SEC } from '../../lib/train/schedule'
import { useTrain } from '../../store/train'

const CARRIAGES = 3
const CAR_LEN = 11
const CAR_GAP = 0.7
const ENGINE_LEN = 9
const TENDER_LEN = 4

const TRAIN_SCALE = 2.0

const RAKE_LEN = (ENGINE_LEN + TENDER_LEN + CARRIAGES * (CAR_LEN + CAR_GAP)) * TRAIN_SCALE
const AWAY_Z = PLAT_Z1 + RAKE_LEN * 0.7

const TRAIN_SIT_Y = -0.85

/* ── Hogwarts Express palette (shared across all lines) ───────── */
const HOGWARTS_CREAM = '#F5E6C8'
const HOGWARTS_GOLD = '#D4A843'
const HOGWARTS_BLACK = '#1a1a1e'
const HOGWARTS_GLASS = '#9EC5D8'
const HOGWARTS_ROOF = '#3D3A42'

const HOGWARTS_CRIMSON = '#7B1818'
const HOGWARTS_DARK = '#3a2a28'

/** Per-line body colours — deep, magical, never cartoon-bright. */
const LINE_BODY: Record<string, string> = {
  express:  '#7B1818',  // Hogwarts crimson
  regional: '#1B4332',  // forest green (British Railways)
  mountain: '#1C2541',  // midnight blue
  night:    '#2D1B4E',  // deep indigo
  grand:    '#5C1010',  // dark burgundy
}

function bodyColor(line: TrainLine): string {
  return LINE_BODY[line.id] ?? HOGWARTS_CRIMSON
}

/* ── details reused across the rake ──────────────────────────── */

function Wheel({ x, z, r = 0.55, drive = false }: { x: number; z: number; r?: number; drive?: boolean }) {
  return (
    <group position={[x, r, z]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[r, r, 0.18, 14]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.5} roughness={0.45} />
      </mesh>
      {drive && (
        <mesh rotation-z={Math.PI / 2} position={[0, 0, 0]}>
          <cylinderGeometry args={[r * 0.82, r * 0.82, 0.2, 14]} />
          <meshStandardMaterial color={'#8B1A1A'} metalness={0.15} roughness={0.55} />
        </mesh>
      )}
      <mesh rotation-z={Math.PI / 2} position={[0, 0, 0]}>
        <cylinderGeometry args={[r * 0.22, r * 0.22, 0.24, 8]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.25} />
      </mesh>
    </group>
  )
}

function Bogie({ z }: { z: number }) {
  return (
    <group position={[0.9, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.12, 0.12, 2.8]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.45} roughness={0.5} />
      </mesh>
      <Wheel x={0} z={-1} r={0.5} />
      <Wheel x={0} z={1} r={0.5} />
    </group>
  )
}

function Buffer({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.65, z]}>
      <mesh>
        <cylinderGeometry args={[0.16, 0.2, 0.3, 10]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 10]} />
        <meshStandardMaterial color={'#6e2f2c'} metalness={0.3} roughness={0.55} />
      </mesh>
    </group>
  )
}

/* ── Locomotive ─────────────────────────────────────────────── */

function Locomotive({ line }: { line: TrainLine }) {
  const lightRef = useRef<PointLight>(null)
  const lensRef = useRef<MeshStandardMaterial>(null)

  useFrame(() => {
    const s = platformStatus(line)
    let lin: number
    if (s.phase === 'approaching') lin = 1 - s.phaseRemaining / APPROACH_SEC
    else if (s.phase === 'boarding') lin = 0.5
    else if (s.phase === 'departing') lin = 0.1 + 0.4 * (s.phaseRemaining / DEPART_SEC)
    else lin = 0.08
    const li = lightRef.current
    if (li) li.intensity = MathUtils.lerp(li.intensity, 0.8 + lin * 3.5, 0.1)
    const le = lensRef.current
    if (le) le.emissiveIntensity = MathUtils.lerp(le.emissiveIntensity, 0.6 + lin * 1.5, 0.1)
  })

  return (
    <group>
      {/* ── Boiler (tapered: larger at front, slightly smaller at cab) ── */}
      <mesh position={[0, 1.9, 0.4]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[1.05, 0.95, ENGINE_LEN - 1.5, 16]} />
        <meshStandardMaterial color={bodyColor(line)} metalness={0.35} roughness={0.45} />
      </mesh>

      {/* Brass boiler bands */}
      {[-3.2, -1.2, 0.8, 2.8].map((dz) => (
        <mesh key={dz} position={[0, 1.9, dz]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.07, 0.045, 6, 16]} />
          <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.25} />
        </mesh>
      ))}

      {/* ── Smokebox ── */}
      <mesh position={[0, 1.9, -ENGINE_LEN / 2 + 0.6]} rotation-x={Math.PI / 2} castShadow>
        <sphereGeometry args={[1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* ── Chimney -- tall GWR-style with flared top ── */}
      <mesh position={[0, 3.0, -ENGINE_LEN / 2 + 1.4]} castShadow>
        <cylinderGeometry args={[0.24, 0.18, 1.1, 10]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.4} roughness={0.55} />
      </mesh>
      <mesh position={[0, 3.6, -ENGINE_LEN / 2 + 1.4]}>
        <cylinderGeometry args={[0.4, 0.26, 0.18, 10]} />
        <meshStandardMaterial color={bodyColor(line)} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* ── Steam dome (brass) ── */}
      <mesh position={[0, 2.82, 0.3]} castShadow>
        <sphereGeometry args={[0.38, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.7} roughness={0.2} />
      </mesh>

      {/* ── Safety valve bonnet ── */}
      <mesh position={[0, 2.82, 2.2]} castShadow>
        <sphereGeometry args={[0.26, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.25} />
      </mesh>

      {/* ── Cab ── */}
      <mesh position={[0, 2.4, ENGINE_LEN / 2 - 1.4]} castShadow>
        <boxGeometry args={[2.8, 2.8, 2.6]} />
        <meshStandardMaterial color={bodyColor(line)} metalness={0.25} roughness={0.55} />
      </mesh>
      {/* Cab roof (overhangs slightly) */}
      <mesh position={[0, 3.9, ENGINE_LEN / 2 - 1.4]}>
        <boxGeometry args={[3.1, 0.15, 3.0]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Cab windows */}
      {[-1.4, 1.4].map((sx) => (
        <mesh key={sx} position={[sx, 2.6, ENGINE_LEN / 2 - 1.4]}>
          <boxGeometry args={[0.04, 0.7, 0.85]} />
          <meshStandardMaterial color={HOGWARTS_GLASS} transparent opacity={0.2} />
        </mesh>
      ))}
      {/* Cab rear window */}
      <mesh position={[0, 2.7, ENGINE_LEN / 2 - 0.15]}>
        <boxGeometry args={[0.75, 0.5, 0.04]} />
        <meshStandardMaterial color={HOGWARTS_GLASS} transparent opacity={0.2} />
      </mesh>

      {/* ── Cowcatcher ── */}
      <mesh position={[0, 0.25, -ENGINE_LEN / 2 - 0.15]} rotation-x={0.35} castShadow>
        <boxGeometry args={[2.6, 0.35, 0.5]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.45} roughness={0.5} />
      </mesh>

      {/* ── Buffer beam (front) ── */}
      <mesh position={[0, 0.7, -ENGINE_LEN / 2 + 0.05]}>
        <boxGeometry args={[2.8, 0.2, 0.2]} />
        <meshStandardMaterial color={'#8B1A1A'} metalness={0.35} roughness={0.55} />
      </mesh>
      <Buffer x={-1.1} z={-ENGINE_LEN / 2 + 0.15} />
      <Buffer x={1.1} z={-ENGINE_LEN / 2 + 0.15} />

      {/* ── Headlight ── */}
      <mesh position={[0, 2.1, -ENGINE_LEN / 2 + 0.15]}>
        <cylinderGeometry args={[0.32, 0.38, 0.25, 10]} />
        <meshStandardMaterial ref={lensRef} color={'#fff4d0'} emissive={'#fff0c0'} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 2.1, -ENGINE_LEN / 2 - 1.5]} color={'#ffe9b0'} intensity={2.5} distance={18} decay={2} />

      {/* ── Driving wheels (3 axles, large, red spokes) ── */}
      {[-2.8, -0.3, 2.2].map((wz) => [-1, 1].map((sx) => <Wheel key={`d${wz}-${sx}`} x={sx * 1.1} z={wz} r={0.7} drive />))}

      {/* ── Connecting rod between driving wheels ── */}
      <mesh position={[0, 0.7, -0.3]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.04, 0.04, 5.0, 4]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.25} />
      </mesh>

      {/* ── Leading wheels (front, smaller, no drive) ── */}
      <Wheel x={-1.05} z={-ENGINE_LEN / 2 + 1.6} r={0.55} />
      <Wheel x={1.05} z={-ENGINE_LEN / 2 + 1.6} r={0.55} />

      {/* ── Footplate / running board ── */}
      <mesh position={[0, 1.25, 0.4]}>
        <boxGeometry args={[2.9, 0.08, ENGINE_LEN - 1.5]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  )
}

/* ── Tender (coal car behind the locomotive) ─────────────────── */

function Tender({ line }: { line: TrainLine }) {
  return (
    <group position={[0, 0, ENGINE_LEN / 2 + TENDER_LEN / 2]}>
      {/* Body */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[2.6, 2.6, TENDER_LEN]} />
        <meshStandardMaterial color={bodyColor(line)} metalness={0.25} roughness={0.55} />
      </mesh>
      {/* Coal bunker top lip */}
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[2.8, 0.12, TENDER_LEN - 0.2]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Brass trim line */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[2.66, 0.06, TENDER_LEN + 0.04]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.6} roughness={0.25} />
      </mesh>
      {/* Tender wheels (2 axles, smaller, no drive) */}
      {[-1.2, 1.2].map((wz) => [-1, 1].map((sx) => <Wheel key={`t${wz}-${sx}`} x={sx * 1.0} z={wz} r={0.5} />))}
      {/* Buffers at back */}
      <Buffer x={-1.0} z={TENDER_LEN / 2 + 0.05} />
      <Buffer x={1.0} z={TENDER_LEN / 2 + 0.05} />
      <mesh position={[0, 0.6, TENDER_LEN / 2]} castShadow>
        <boxGeometry args={[2.6, 0.2, 0.2]} />
        <meshStandardMaterial color={'#8b1a1a'} metalness={0.3} roughness={0.6} />
      </mesh>
    </group>
  )
}

/* ── Carriage exterior ──────────────────────────────────────── */

function Carriage({ z, line, woodTex }: { z: number; line: TrainLine; woodTex: any }) {
  const halfW = 1.4
  const DOOR_Z = [-CAR_LEN / 4, CAR_LEN / 4]
  const doorRefs = useRef<(Group | null)[]>([])
  const doorGlowRefs = useRef<(MeshStandardMaterial | null)[]>([])
  const lockRefs = useRef<(MeshStandardMaterial | null)[]>([])

  useFrame(() => {
    const open = platformStatus(line).phase === 'boarding'
    const speed = 0.08
    doorRefs.current.forEach((d) => {
      if (d) {
        d.position.z = MathUtils.lerp(d.position.z, open ? 1.2 : 0, speed)
      }
    })
    // door glow: warm when open, dim when closed
    doorGlowRefs.current.forEach((mat) => {
      if (mat) mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, open ? 2.0 : 0.15, speed)
    })
    // lock indicator: red glow when closed (locked), hidden when open
    lockRefs.current.forEach((mat) => {
      if (mat) mat.emissiveIntensity = MathUtils.lerp(mat.emissiveIntensity, open ? 0 : 2.0, speed)
    })
  })

  return (
    <group position={[0, 0, z]}>
      {/* ── Body shell (base) ── */}
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 2.4, CAR_LEN]} />
        <meshStandardMaterial map={woodTex} color={bodyColor(line)} roughness={0.55} metalness={0.15} />
      </mesh>

      {/* ── Upper cream / ivory panel ── */}
      <mesh position={[0, 2.55, 0]}>
        <boxGeometry args={[2.82, 0.55, CAR_LEN - 0.3]} />
        <meshStandardMaterial color={HOGWARTS_CREAM} roughness={0.6} metalness={0.05} />
      </mesh>

      {/* ── Roof (curved) ── */}
      <mesh position={[0, 3.05, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, CAR_LEN - 0.5, 10, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={HOGWARTS_ROOF} metalness={0.35} roughness={0.55} side={2} />
      </mesh>
      {/* Roof ridge */}
      <mesh position={[0, 3.12, 0]}>
        <boxGeometry args={[0.12, 0.06, CAR_LEN - 0.3]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.6} roughness={0.25} />
      </mesh>

      {/* ── Brass belt lines (waist trim) ── */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.86, 0.06, CAR_LEN + 0.04]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[2.86, 0.06, CAR_LEN + 0.04]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[0, 2.82, 0]}>
        <boxGeometry args={[2.86, 0.04, CAR_LEN + 0.04]} />
        <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.6} roughness={0.25} />
      </mesh>

      {/* ── Individual windows with magical warm glow ── */}
      {[-1, 1].map((side) => {
        const windowCount = 6
        const windowZone = CAR_LEN - 3.5
        const windowW = windowZone / windowCount - 0.1
        const startZ = -windowZone / 2
        return Array.from({ length: windowCount }, (_, wi) => {
          const wz = startZ + wi * (windowW + 0.1) + windowW / 2
          return (
            <group key={`w-${side}-${wi}`} position={[side * halfW, 1.7, wz]}>
              {/* Deep recess — dark void behind the glass */}
              <mesh position={[-side * 0.06, 0, 0]}>
                <boxGeometry args={[0.12, 1.0, windowW]} />
                <meshStandardMaterial color={'#080604'} roughness={0.95} />
              </mesh>
              {/* Interior warmth — layered glow panels for depth */}
              <mesh position={[-side * 0.03, 0, 0]}>
                <boxGeometry args={[0.02, 0.8, windowW - 0.15]} />
                <meshStandardMaterial color={'#1a0e04'} roughness={0.9} />
              </mesh>
              <mesh position={[side * 0.01, 0, 0]}>
                <boxGeometry args={[0.02, 0.6, windowW - 0.25]} />
                <meshStandardMaterial color={'#2a1608'} emissive={'#ff9930'} emissiveIntensity={0.2} toneMapped={false} />
              </mesh>
              {/* Glass pane — slight tint, subtle reflection */}
              <mesh position={[side * 0.02, 0, 0]}>
                <boxGeometry args={[0.03, 0.7, windowW - 0.1]} />
                <meshStandardMaterial
                  color={'#4a6878'}
                  transparent
                  opacity={0.12}
                  metalness={0.3}
                  roughness={0.1}
                />
              </mesh>
              {/* Warm glow spill — the magical "candlelit interior" bloom */}
              <mesh position={[side * 0.04, 0, 0]}>
                <boxGeometry args={[0.01, 0.5, windowW - 0.3]} />
                <meshStandardMaterial
                  color={'#ffcc66'}
                  emissive={'#ffaa22'}
                  emissiveIntensity={0.5}
                  toneMapped={false}
                  transparent
                  opacity={0.5}
                />
              </mesh>
              {/* Curtain edges (visible through glass) */}
              {[-0.42, 0.42].map((dz) => (
                <mesh key={dz} position={[side * 0.01, 0, dz]}>
                  <boxGeometry args={[0.02, 0.6, 0.07]} />
                  <meshStandardMaterial color={bodyColor(line)} roughness={0.85} transparent opacity={0.5} />
                </mesh>
              ))}
              {/* Brass frame — top, bottom, sides */}
              <mesh position={[0, -0.48, 0]}>
                <boxGeometry args={[0.08, 0.05, windowW + 0.04]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.48, 0]}>
                <boxGeometry args={[0.08, 0.05, windowW + 0.04]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
              </mesh>
              {/* Side frame pillars */}
              {[-1, 1].map((sx) => (
                <mesh key={sx} position={[0, 0, sx * (windowW / 2 + 0.01)]}>
                  <boxGeometry args={[0.08, 1.0, 0.04]} />
                  <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
                </mesh>
              ))}
            </group>
          )
        })
      })}

      {/* ── DOORS — visible entrance with brass frame, warm glow, and step ── */}
      {[-1, 1].map((side) =>
        DOOR_Z.map((dz, di) => (
          <group key={`d-${side}-${dz}`}>
              {/* Door recess — dark interior visible when door slides open */}
              <mesh position={[side * halfW, 1.2, dz]}>
                <boxGeometry args={[0.06, 2.2, 0.92]} />
                <meshStandardMaterial color={HOGWARTS_BLACK} roughness={0.9} />
              </mesh>

              {/* Warm light spilling from interior (visible when open) */}
              <mesh
                position={[side * halfW, 1.2, dz]}
                ref={(el) => {
                  if (el) doorGlowRefs.current[di + (side > 0 ? DOOR_Z.length : 0)] = el as unknown as MeshStandardMaterial
                }}
              >
                <boxGeometry args={[0.04, 2.0, 0.88]} />
                <meshStandardMaterial
                  color={'#fff0d0'}
                  emissive={glow.signLamp}
                  emissiveIntensity={0.15}
                  toneMapped={false}
                  transparent
                  opacity={0.9}
                />
              </mesh>

              {/* Brass door frame — thick, visible outline */}
              {/* Top */}
              <mesh position={[side * halfW, 2.35, dz]}>
                <boxGeometry args={[0.1, 0.08, 1.0]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
              </mesh>
              {/* Bottom threshold */}
              <mesh position={[side * halfW, 0.15, dz]}>
                <boxGeometry args={[0.1, 0.08, 1.0]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
              </mesh>
              {/* Left edge */}
              <mesh position={[side * halfW, 1.25, dz - 0.46]}>
                <boxGeometry args={[0.1, 2.3, 0.08]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
              </mesh>
              {/* Right edge */}
              <mesh position={[side * halfW, 1.25, dz + 0.46]}>
                <boxGeometry args={[0.1, 2.3, 0.08]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.65} roughness={0.2} />
              </mesh>

              {/* Lock indicator — red emissive strip, glows when doors are sealed */}
              <mesh position={[side * halfW, 2.38, dz]}>
                <boxGeometry args={[0.08, 0.06, 0.96]} />
                <meshStandardMaterial
                  color={'#ff1111'}
                  emissive={'#ff2222'}
                  emissiveIntensity={0}
                  toneMapped={false}
                  ref={(el) => {
                    const idx = di + (side > 0 ? DOOR_Z.length : 0)
                    if (el) lockRefs.current[idx] = el as unknown as MeshStandardMaterial
                  }}
                />
              </mesh>

              {/* Boarding step / threshold plate */}
              <mesh position={[side * (halfW + 0.15), 0.08, dz]}>
                <boxGeometry args={[0.5, 0.06, 0.9]} />
                <meshStandardMaterial color={'#3a3a40'} roughness={0.6} metalness={0.3} />
              </mesh>
              {/* Step edge highlight */}
              <mesh position={[side * (halfW + 0.15), 0.12, dz + 0.44]}>
                <boxGeometry args={[0.5, 0.03, 0.04]} />
                <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.6} roughness={0.25} />
              </mesh>

              {/* Sliding door leaf — darker shade of body */}
              <group ref={(el) => (doorRefs.current[di + (side > 0 ? DOOR_Z.length : 0)] = el)}>
                <mesh position={[side * halfW, 1.2, dz]}>
                  <boxGeometry args={[0.08, 2.1, 0.9]} />
                  <meshStandardMaterial color={HOGWARTS_DARK} roughness={0.5} metalness={0.2} />
                </mesh>
                {/* Door handle */}
                <mesh position={[side * halfW, 1.1, dz + 0.35]}>
                  <boxGeometry args={[0.04, 0.18, 0.06]} />
                  <meshStandardMaterial color={HOGWARTS_GOLD} metalness={0.7} roughness={0.2} />
                </mesh>
                {/* Window in door */}
                <mesh position={[side * halfW, 1.7, dz]}>
                  <boxGeometry args={[0.05, 0.5, 0.4]} />
                  <meshStandardMaterial color={HOGWARTS_GLASS} transparent opacity={0.2} />
                </mesh>
              </group>
            </group>
          ))
      )}

      {/* ── End walls ── */}
      {[-1, 1].map((ez) => (
        <mesh key={ez} position={[0, 1.6, ez * CAR_LEN / 2]}>
          <boxGeometry args={[2.8, 2.4, 0.15]} />
          <meshStandardMaterial color={bodyColor(line)} roughness={0.6} metalness={0.15} />
        </mesh>
      ))}

      {/* ── Gangway connection ── */}
      {[-1, 1].map((ez) => (
        <mesh key={`gw-${ez}`} position={[0, 2.0, ez * CAR_LEN / 2 + ez * 0.12]}>
          <boxGeometry args={[1.6, 2.0, 0.08]} />
          <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.35} roughness={0.55} />
        </mesh>
      ))}

      {/* ── Undercarriage ── */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.1, CAR_LEN - 1]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.45} roughness={0.5} />
      </mesh>
      <mesh position={[-0.8, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.1, CAR_LEN - 1]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.45} roughness={0.5} />
      </mesh>
      {/* Fuel / water tank */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.4, 0.4, 3.5]} />
        <meshStandardMaterial color={HOGWARTS_BLACK} metalness={0.35} roughness={0.55} />
      </mesh>
      {/* Bogies */}
      <Bogie z={-CAR_LEN / 2 + 2} />
      <Bogie z={CAR_LEN / 2 - 2} />
      <group position={[-0.9, 0, 0]}>
        <Bogie z={-CAR_LEN / 2 + 2} />
        <Bogie z={CAR_LEN / 2 - 2} />
      </group>
    </group>
  )
}

/* ── Full train set ─────────────────────────────────────────── */

function TrainSet({ platformIndex }: { platformIndex: number }) {
  const ref = useRef<Group>(null)
  const line = TRAIN_LINES[platformIndex]
  const pl = platforms()[platformIndex]
  const woodTex = useMemo(() => makeWood(3, 7 + platformIndex, '#4a3020'), [platformIndex])
  const sway = useRef(0)
  const prevPhase = useRef<string>('')

  const carZs = useMemo(() => {
    const out: number[] = []
    let z = ENGINE_LEN / 2 + TENDER_LEN + CAR_LEN / 2 + CAR_GAP
    for (let i = 0; i < CARRIAGES; i++) {
      out.push(z)
      z += CAR_LEN + CAR_GAP
    }
    return out
  }, [])

  useFrame((st, dt) => {
    const g = ref.current
    if (!g) return
    const train = useTrain.getState()
    const mine = (train.phase === 'boarding' || train.phase === 'traveling') && train.line?.id === line.id
    const sch = platformStatus(line)

    let offset: number
    if (mine) {
      offset = 0
    } else {
      if (sch.phase === 'boarding') offset = 0
      else if (sch.phase === 'approaching') {
        const t = 1 - sch.phaseRemaining / APPROACH_SEC
        offset = (AWAY_Z - TRAIN_REST_Z) * (1 - easeOutCubic(t))
      } else if (sch.phase === 'departing') {
        const t = 1 - sch.phaseRemaining / DEPART_SEC
        offset = (AWAY_Z - TRAIN_REST_Z) * easeInCubic(t)
      } else {
        offset = AWAY_Z - TRAIN_REST_Z
      }
    }

    if (prevPhase.current === 'approaching' && sch.phase === 'boarding') sway.current = 1
    else if (prevPhase.current === 'boarding' && sch.phase === 'departing') sway.current = 0.7
    prevPhase.current = sch.phase
    sway.current = Math.max(0, sway.current - dt * 1.6)
    const env = sway.current
    const tEl = st.clock.elapsedTime

    const targetZ = TRAIN_REST_Z + offset
    // Snappy lerp: fast enough to feel responsive, smooth enough to avoid jumps.
    // At 60fps this is ~0.38 per frame; at 30fps ~0.58 — both feel like a heavy
    // train braking naturally rather than a teleport or a lazy drift.
    const lerpK = 1 - Math.pow(0.003, dt)
    g.position.z = MathUtils.lerp(g.position.z, targetZ, lerpK)
    g.position.x = pl.trackX + Math.sin(tEl * 7) * 0.05 * env
    g.position.y = TRAIN_SIT_Y
    g.rotation.z = Math.sin(tEl * 9) * 0.012 * env
    g.visible = offset < AWAY_Z - TRAIN_REST_Z - 1
  })

  return (
    <group ref={ref} position={[pl.trackX, TRAIN_SIT_Y, TRAIN_REST_Z]} scale={TRAIN_SCALE}>
      <Locomotive line={line} />
      <Tender line={line} />
      {carZs.map((z, i) => (
        <Carriage key={i} z={z} line={line} woodTex={woodTex} />
      ))}
      <pointLight position={[-1.6, 2.2, ENGINE_LEN + TENDER_LEN + 6]} color={line.mood.glow} intensity={5} distance={14} decay={2} />
    </group>
  )
}

export function Trains() {
  return (
    <group>
      {TRAIN_LINES.map((_, i) => (
        <TrainSet key={i} platformIndex={i} />
      ))}
    </group>
  )
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
function easeInCubic(t: number): number {
  return t * t * t
}
