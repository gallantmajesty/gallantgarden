import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import { makeWood } from './textures'
import { palette, glow } from './env'
import { platforms, TRAIN_REST_Z, PLAT_Z1 } from './layout'
import { TRAIN_LINES, type TrainLine } from '../../lib/train/lines'
import { platformStatus, APPROACH_SEC, DEPART_SEC } from '../../lib/train/schedule'
import { useTrain } from '../../store/train'

// A premium steam train: a tank locomotive + a rake of lit passenger carriages,
// berthed in a platform's track and animated by the live schedule.
// PERFORMANCE: simplified exterior with fewer individual meshes — windows are
// one merged strip per side instead of individual frames, wheels reduced.

const CARRIAGES = 4
const CAR_LEN = 11
const CAR_GAP = 0.7
const ENGINE_LEN = 9

const AWAY_Z = PLAT_Z1 + (ENGINE_LEN + CARRIAGES * (CAR_LEN + CAR_GAP)) * 0.6

// Drop the whole train so its wheels rest on the recessed track-bed rails
// (rail top ≈ TRACK_BED_Y + 0.2) instead of floating at platform level.
const TRAIN_SIT_Y = -0.85

/* ── Wheel ───────────────────────────────────────────────────── */

function Wheel({ x, z, r = 0.55 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, r, z]}>
      <mesh rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[r, r, 0.18, 12]} />
        <meshStandardMaterial color={'#2a2a30'} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} position={[0, 0, 0]}>
        <cylinderGeometry args={[r * 0.25, r * 0.25, 0.22, 6]} />
        <meshStandardMaterial color={palette.brass} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

function Bogie({ z }: { z: number }) {
  return (
    <group position={[0.9, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.12, 0.12, 2.8]} />
        <meshStandardMaterial color={'#3a3a40'} metalness={0.4} roughness={0.5} />
      </mesh>
      <Wheel x={0} z={-1} r={0.5} />
      <Wheel x={0} z={1} r={0.5} />
    </group>
  )
}

/* ── Carriage exterior ───────────────────────────────────────── */

function Carriage({ z, line, woodTex }: { z: number; line: TrainLine; woodTex: any }) {
  const halfW = 1.4

  return (
    <group position={[0, 0, z]}>
      {/* body shell */}
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 2.6, CAR_LEN]} />
        <meshStandardMaterial map={woodTex} color={line.mood.accent} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* curved roof — half cylinder */}
      <mesh position={[0, 3.15, 0]} castShadow>
        <cylinderGeometry args={[1.55, 1.55, CAR_LEN - 0.5, 10, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={'#48464e'} metalness={0.35} roughness={0.55} side={2} />
      </mesh>
      {/* roof ridge */}
      <mesh position={[0, 3.22, 0]}>
        <boxGeometry args={[0.15, 0.06, CAR_LEN - 0.3]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* belt lines — brass trim */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.86, 0.06, CAR_LEN + 0.04]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[2.86, 0.05, CAR_LEN + 0.04]} />
        <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* window strips — one long glass per side instead of individual frames */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* glass strip */}
          <mesh position={[side * halfW, 1.85, 0]}>
            <boxGeometry args={[0.04, 0.85, CAR_LEN - 2]} />
            <meshStandardMaterial color={'#8ab8d0'} transparent opacity={0.15} />
          </mesh>
          {/* warm interior glow behind the glass */}
          <mesh position={[side * (halfW + 0.06), 1.85, 0]}>
            <boxGeometry args={[0.02, 0.7, CAR_LEN - 2.5]} />
            <meshStandardMaterial color={'#2a2018'} emissive={glow.signLamp} emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {/* window divider bars (3 per side) */}
          {[-2, 0, 2].map((dz) => (
            <mesh key={dz} position={[side * halfW, 1.85, dz]}>
              <boxGeometry args={[0.06, 0.9, 0.08]} />
              <meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}

      {/* doors (−X side only, toward platform) */}
      {[-CAR_LEN / 4, CAR_LEN / 4].map((dz) => (
        <group key={dz} position={[-halfW - 0.02, 0, dz]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[0.08, 2.1, 0.9]} />
            <meshStandardMaterial color={palette.oxblood} roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.1, 0.2]}>
            <boxGeometry args={[0.04, 0.15, 0.04]} />
            <meshStandardMaterial color={palette.brass} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.35, 0.06, 0.85]} />
            <meshStandardMaterial color={'#48464e'} metalness={0.3} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* end walls */}
      {[-1, 1].map((ez) => (
        <mesh key={ez} position={[0, 1.7, ez * CAR_LEN / 2]}>
          <boxGeometry args={[2.8, 2.6, 0.15]} />
          <meshStandardMaterial color={line.mood.accent} roughness={0.7} metalness={0.1} />
        </mesh>
      ))}

      {/* undercarriage — simple frame + fuel tank */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.1, CAR_LEN - 1]} />
        <meshStandardMaterial color={'#3a3a40'} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[-0.8, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.1, CAR_LEN - 1]} />
        <meshStandardMaterial color={'#3a3a40'} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.4, 0.4, 3.5]} />
        <meshStandardMaterial color={'#2f3540'} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* bogies — 4 wheels per side (2 axles) */}
      <Bogie z={-CAR_LEN / 2 + 2} />
      <Bogie z={CAR_LEN / 2 - 2} />
      <group position={[-0.9, 0, 0]}>
        <Bogie z={-CAR_LEN / 2 + 2} />
        <Bogie z={CAR_LEN / 2 - 2} />
      </group>
    </group>
  )
}

/* ── Locomotive ─────────────────────────────────────────────── */

function Locomotive({ line }: { line: TrainLine }) {
  return (
    <group>
      {/* boiler — slimmer so the engine doesn't read as bulbous */}
      <mesh position={[0, 1.9, 0]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[1.0, 1.0, ENGINE_LEN - 2.5, 16]} />
        <meshStandardMaterial color={'#2f3540'} metalness={0.45} roughness={0.4} />
      </mesh>
      {/* brass bands */}
      {[-2.5, -0.5, 1.5].map((dz) => (
        <mesh key={dz} position={[0, 1.9, dz]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1.02, 0.04, 6, 16]} />
          <meshStandardMaterial color={palette.brass} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* smokebox */}
      <mesh position={[0, 1.9, -ENGINE_LEN / 2 + 0.8]} rotation-x={Math.PI / 2} castShadow>
        <sphereGeometry args={[1.0, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={'#1f1f24'} metalness={0.45} roughness={0.45} />
      </mesh>

      {/* cab */}
      <mesh position={[0, 2.3, ENGINE_LEN / 2 - 1.6]} castShadow>
        <boxGeometry args={[2.8, 2.6, 3]} />
        <meshStandardMaterial color={line.mood.accent} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.7, ENGINE_LEN / 2 - 1.6]}>
        <boxGeometry args={[3.0, 0.15, 3.2]} />
        <meshStandardMaterial color={'#48464e'} metalness={0.35} roughness={0.55} />
      </mesh>
      {/* cab windows */}
      {[-1.42, 1.42].map((sx) => (
        <mesh key={sx} position={[sx, 2.6, ENGINE_LEN / 2 - 1.6]}>
          <boxGeometry args={[0.04, 0.7, 1.0]} />
          <meshStandardMaterial color={'#8ab8d0'} transparent opacity={0.2} />
        </mesh>
      ))}

      {/* chimney — smaller, neat funnel sitting on top of the boiler */}
      <mesh position={[0, 2.85, -ENGINE_LEN / 2 + 1.6]} castShadow>
        <cylinderGeometry args={[0.26, 0.34, 0.85, 10]} />
        <meshStandardMaterial color={'#1f1f24'} metalness={0.35} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.32, -ENGINE_LEN / 2 + 1.6]}>
        <cylinderGeometry args={[0.38, 0.3, 0.13, 10]} />
        <meshStandardMaterial color={'#1f1f24'} metalness={0.4} roughness={0.5} />
      </mesh>

      {/* steam dome */}
      <mesh position={[0, 2.78, 0]} castShadow>
        <sphereGeometry args={[0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={palette.brass} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* headlight */}
      <mesh position={[0, 2.0, -ENGINE_LEN / 2 + 0.2]}>
        <cylinderGeometry args={[0.3, 0.35, 0.25, 10]} />
        <meshStandardMaterial color={'#fff4d0'} emissive={'#fff0c0'} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.0, -ENGINE_LEN / 2 - 1]} color={'#ffe9b0'} intensity={6} distance={22} decay={2} />

      {/* buffer beam */}
      <mesh position={[0, 0.7, -ENGINE_LEN / 2 + 0.1]}>
        <boxGeometry args={[3.0, 0.2, 0.2]} />
        <meshStandardMaterial color={'#8b1a1a'} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* engine wheels — larger */}
      {[-2.5, 0, 2.5].map((wz) => [-1, 1].map((sx) => <Wheel key={`${wz}-${sx}`} x={sx * 1.05} z={wz} r={0.65} />))}
    </group>
  )
}

/* ── Full train set ─────────────────────────────────────────── */

function TrainSet({ platformIndex }: { platformIndex: number }) {
  const ref = useRef<Group>(null)
  const line = TRAIN_LINES[platformIndex]
  const pl = platforms()[platformIndex]
  const woodTex = useMemo(() => makeWood(3, 7 + platformIndex, '#4a3020'), [platformIndex])

  // Carriage Z offsets are LOCAL to the train group (whose origin already sits at
  // TRAIN_REST_Z). Start them right behind the locomotive so the rake stays
  // COUPLED to the engine — previously these added TRAIN_REST_Z a second time,
  // which flung the carriages ~20 m north and detached them from the loco.
  const carZs = useMemo(() => {
    const out: number[] = []
    let z = ENGINE_LEN / 2 + CAR_LEN / 2 + CAR_GAP
    for (let i = 0; i < CARRIAGES; i++) {
      out.push(z)
      z += CAR_LEN + CAR_GAP
    }
    return out
  }, [])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const train = useTrain.getState()
    const mine = (train.phase === 'boarding' || train.phase === 'traveling') && train.line?.id === line.id

    let offset: number
    if (mine) {
      offset = 0
    } else {
      const s = platformStatus(line)
      if (s.phase === 'boarding') offset = 0
      else if (s.phase === 'approaching') {
        const t = 1 - s.phaseRemaining / APPROACH_SEC
        offset = (AWAY_Z - TRAIN_REST_Z) * (1 - easeOutCubic(t))
      } else if (s.phase === 'departing') {
        const t = 1 - s.phaseRemaining / DEPART_SEC
        offset = (AWAY_Z - TRAIN_REST_Z) * easeInCubic(t)
      } else {
        offset = AWAY_Z - TRAIN_REST_Z
      }
    }

    const targetZ = TRAIN_REST_Z + offset
    g.position.z = MathUtils.lerp(g.position.z, targetZ, 1 - Math.pow(0.0001, dt))
    g.position.x = pl.trackX
    g.position.y = TRAIN_SIT_Y
    g.visible = offset < AWAY_Z - TRAIN_REST_Z - 1
  })

  return (
    <group ref={ref} position={[pl.trackX, TRAIN_SIT_Y, TRAIN_REST_Z]}>
      <Locomotive line={line} />
      {carZs.map((z, i) => (
        <Carriage key={i} z={z} line={line} woodTex={woodTex} />
      ))}
      <pointLight position={[-1.6, 2.2, ENGINE_LEN + 6]} color={line.mood.glow} intensity={5} distance={14} decay={2} />
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
