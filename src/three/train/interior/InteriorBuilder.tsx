// @ts-nocheck
// InteriorBuilder — main scene assembler for the Hogwarts Express-style carriage
// interior. Composes all Phase 2 systems: wall panels, floor, seats, windows,
// curtains, luggage racks, magic details, and interior lighting. Replaces the
// basic geometry in CarriageInterior.tsx with rich, themed detail.
//
// The builder reads the current train line's interiorTheme and layers the
// components accordingly. Each sub-component owns its own materials (memoised)
// so the builder is just layout + lighting.

import { useMemo, useRef } from 'react'
import { DoubleSide, DirectionalLight, Color, MathUtils } from 'three'
import { CARRIAGE, carriageSeats, seatTable, ROWS, ROW_DZ, DOOR_Z } from '../interior'
import { getInteriorTheme } from '../interiorThemes'
import type { TrainLine } from '../../../lib/train/lines'
import { useTrain } from '../../../store/train'
import { WallPanels } from './WallPanels'
import { FloorSystem } from './FloorSystem'
import { WindowFrames } from './WindowFrame'
import { CurtainSystem } from './CurtainSystem'
import { LuggageRack } from './LuggageRack'
import { Seat, getSeatVariant } from './SeatFactory'
import { DustParticles, CandleFlicker, MagicBookStack } from './MagicDetails'
import { InteriorAudio } from './InteriorAudio'
import { getRouteConfig, isInTunnel } from '../routes'
import { computeTimeState } from '../routes/TimeOfDay'

const DOOR_H = 2.2
const DOOR_W = 0.9

/** Sliding door opening with brass frame and warm light spill */
function DoorOpening({ side, z, locked }: { side: -1 | 1; z: number; locked: boolean }) {
  const { halfW } = CARRIAGE
  const wx = side * halfW
  return (
    <group position={[wx, 0, z]}>
      {/* doorway recess */}
      <mesh position={[-side * 0.04, DOOR_H / 2, 0]}>
        <boxGeometry args={[0.08, DOOR_H, DOOR_W]} />
        <meshStandardMaterial
          color={locked ? '#1a0505' : '#0b0a0c'}
          emissive={locked ? '#ff2222' : '#ffd27a'}
          emissiveIntensity={locked ? 0.8 : 0.5}
          toneMapped={false}
        />
      </mesh>
      {/* brass door frame */}
      <mesh position={[-side * 0.06, DOOR_H / 2, -DOOR_W / 2 - 0.03]}>
        <boxGeometry args={[0.04, DOOR_H, 0.04]} />
        <meshStandardMaterial color="#C9A84C" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[-side * 0.06, DOOR_H / 2, DOOR_W / 2 + 0.03]}>
        <boxGeometry args={[0.04, DOOR_H, 0.04]} />
        <meshStandardMaterial color="#C9A84C" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[-side * 0.06, DOOR_H, 0]}>
        <boxGeometry args={[0.04, 0.04, DOOR_W + 0.06]} />
        <meshStandardMaterial color="#C9A84C" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* locked indicator */}
      {locked && (
        <mesh position={[-side * 0.06, DOOR_H + 0.02, 0]}>
          <boxGeometry args={[0.06, 0.04, DOOR_W + 0.08]} />
          <meshStandardMaterial color="#ff1111" emissive="#ff2222" emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      )}
      {/* threshold */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.4, 0.06, 0.9]} />
        <meshStandardMaterial color="#48464e" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* warm light spill */}
      <mesh position={[-side * 0.01, 1.0, 0]}>
        <planeGeometry args={[0.3, DOOR_H * 0.6]} />
        <meshStandardMaterial
          color={locked ? '#ff4444' : '#ffd27a'}
          emissive={locked ? '#ff2222' : '#ffd27a'}
          emissiveIntensity={locked ? 0.3 : 0.6}
          transparent
          opacity={locked ? 0.08 : 0.15}
          toneMapped={false}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/** Panoramic front glass — tall observation window */
function PanoramicGlass() {
  const { halfW, z1 } = CARRIAGE
  return (
    <mesh position={[0, 1.7, z1 - 0.11]}>
      <planeGeometry args={[halfW * 1.8, 2.0]} />
      <meshPhysicalMaterial
        color="#E3F2FD"
        roughness={0.05}
        metalness={0.1}
        transparent
        opacity={0.18}
        transmission={0.7}
        thickness={0.02}
        side={DoubleSide}
      />
    </mesh>
  )
}

/** Exterior shell — curved roof, livery, brass trim (preserved from Phase 1) */
function ExteriorShell({ line, midZ, len }: { line: TrainLine; midZ: number; len: number }) {
  const { halfW, z0, z1, ceilY } = CARRIAGE
  return (
    <group>
      {/* curved roof */}
      <mesh position={[0, 1.05, midZ]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[halfW + 0.22, halfW + 0.22, len + 0.7, 18, 1, true]} />
        <meshStandardMaterial color="#3a3742" metalness={0.35} roughness={0.55} side={DoubleSide} />
      </mesh>
      {/* brass roof ridge */}
      <mesh position={[0, halfW + 0.05 + 1.05, midZ]}>
        <boxGeometry args={[0.18, 0.08, len]} />
        <meshStandardMaterial color="#C9A84C" metalness={0.55} roughness={0.3} />
      </mesh>
      {/* livery body sides + brass belt-lines + skirt */}
      {[-1, 1].map((side) => (
        <group key={`shell${side}`}>
          <mesh position={[side * (halfW + 0.06), 0.55, (z0 + 5.5 + z1) / 2]}>
            <boxGeometry args={[0.16, 1.15, z1 - (z0 + 5.5)]} />
            <meshStandardMaterial color={line.mood.accent} roughness={0.55} metalness={0.15} />
          </mesh>
          <mesh position={[side * (halfW + 0.12), 1.16, midZ]}>
            <boxGeometry args={[0.08, 0.08, len]} />
            <meshStandardMaterial color="#C9A84C" metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[side * (halfW + 0.04), 2.05, midZ]}>
            <boxGeometry args={[0.08, 0.07, len]} />
            <meshStandardMaterial color="#C9A84C" metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[side * (halfW + 0.05), 0.05, midZ]}>
            <boxGeometry args={[0.12, 0.2, len]} />
            <meshStandardMaterial color="#23202a" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Ceiling — cream with warm lamp strip */
function Ceiling({ midZ, len, ceilY }: { midZ: number; len: number; ceilY: number }) {
  return (
    <group>
      <mesh rotation-x={Math.PI / 2} position={[0, ceilY, midZ]}>
        <planeGeometry args={[CARRIAGE.halfW * 2, len]} />
        <meshStandardMaterial color="#FFF8E1" side={DoubleSide} roughness={0.9} />
      </mesh>
      {/* ceiling light strip */}
      <mesh position={[0, ceilY - 0.06, midZ]}>
        <boxGeometry args={[0.6, 0.06, len - 1]} />
        <meshStandardMaterial color="#fff0d0" emissive="#FFB74D" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Wall sconce — brass bracket + cream glass shade + warm point light */
function WallSconce({ position, lightRef }: { position: [number, number, number]; lightRef: React.RefObject<any> }) {
  return (
    <group position={position}>
      {/* Brass wall bracket — curved arm */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.04, 0.08, 0.06]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.04, 0.06]}>
        <boxGeometry args={[0.03, 0.03, 0.1]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Cream glass shade — frosted cone */}
      <mesh position={[0, -0.06, 0.12]}>
        <cylinderGeometry args={[0.04, 0.08, 0.12, 8, 1, true]} />
        <meshStandardMaterial
          color="#FFF8E1"
          roughness={0.1}
          metalness={0.0}
          transparent
          opacity={0.7}
          emissive="#FFB74D"
          emissiveIntensity={0.4}
          toneMapped={false}
          side={2}
        />
      </mesh>
      {/* Warm glow disc under shade */}
      <mesh position={[0, -0.12, 0.12]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.08, 8]} />
        <meshStandardMaterial
          color="#FFB74D"
          emissive="#FFB74D"
          emissiveIntensity={0.8}
          toneMapped={false}
          transparent
          opacity={0.3}
          side={2}
          depthWrite={false}
        />
      </mesh>
      {/* Point light */}
      <pointLight
        ref={lightRef}
        position={[0, -0.08, 0.14]}
        color="#FFB74D"
        intensity={2.4}
        distance={5}
        decay={2}
        castShadow
      />
    </group>
  )
}

/** Ceiling pendant — brass chain + frosted glass globe + warm point light */
function CeilingPendant({ position, lightRef }: { position: [number, number, number]; lightRef: React.RefObject<any> }) {
  return (
    <group position={position}>
      {/* Brass ceiling plate */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.03, 8]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* Brass chain links — 3 short segments */}
      {[0.08, 0.0, -0.08].map((dy, i) => (
        <mesh key={i} position={[0, dy, 0]}>
          <torusGeometry args={[0.015, 0.004, 6, 8]} />
          <meshStandardMaterial color="#E0C060" roughness={0.2} metalness={0.95} />
        </mesh>
      ))}
      {/* Frosted glass globe */}
      <mesh position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial
          color="#FFF8E1"
          roughness={0.15}
          metalness={0.0}
          transparent
          opacity={0.75}
          emissive="#FFB74D"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* Point light */}
      <pointLight
        ref={lightRef}
        position={[0, -0.15, 0]}
        color="#FFB74D"
        intensity={1.8}
        distance={7}
        decay={2}
      />
    </group>
  )
}

/** Interior lighting — 2 wall sconces + ceiling pendant + ambient hemisphere */
function InteriorLighting() {
  const { ceilY, z0, z1 } = CARRIAGE
  const len = z1 - z0
  const lamp1Ref = useRef<any>(null)
  const lamp2Ref = useRef<any>(null)
  const lamp3Ref = useRef<any>(null)

  return (
    <group>
      {/* Wall sconce left — between windows */}
      <WallSconce
        position={[-CARRIAGE.halfW + 0.15, 1.8, z0 + len * 0.25]}
        lightRef={lamp1Ref}
      />
      {/* Wall sconce right */}
      <WallSconce
        position={[CARRIAGE.halfW - 0.15, 1.8, z0 + len * 0.75]}
        lightRef={lamp2Ref}
      />
      {/* Ceiling pendant — centre of carriage */}
      <CeilingPendant
        position={[0, ceilY, (z0 + z1) / 2]}
        lightRef={lamp3Ref}
      />
      {/* Ambient hemisphere */}
      <hemisphereLight args={['#FFB74D', '#2E4A3E', 0.25]} />
      {/* Candle flicker on all three */}
      <CandleFlicker lightRef={lamp1Ref} />
      <CandleFlicker lightRef={lamp2Ref} />
      <CandleFlicker lightRef={lamp3Ref} />
    </group>
  )
}

/** Window light — directional sunlight/moonlight streaming in through the
 *  carriage windows (spec 2.4). Colour + intensity follow the route's
 *  time-of-day preset and the live journey progress; it cuts to black (and the
 *  carriage goes "tunnel dark") while the train is inside a tunnel. On the
 *  platform (not yet moving) it falls back to a cool blue station ambient. */
function WindowLight({ line }: { line: TrainLine }) {
  const sunRef = useRef<DirectionalLight>(null)
  const cfg = useMemo(() => getRouteConfig(line), [line])
  const tmp = useMemo(() => new Color(), [])

  useFrame(() => {
    const sun = sunRef.current
    if (!sun) return
    const st = useTrain.getState()
    const moving = st.phase === 'traveling' || st.phase === 'arriving'
    let color = '#FFB74D'
    let intensity = 1.2
    if (moving) {
      const p = st.progress()
      const inTunnel = isInTunnel(p, cfg.tunnels).active
      const t = computeTimeState(p, cfg.timeOfDay)
      color = t.sunColor
      intensity = inTunnel ? 0 : t.sunIntensity
    } else {
      // cool blue station ambient through the glass while waiting to depart
      color = '#9db4ff'
      intensity = 0.4
    }
    sun.color.lerp(tmp.set(color), 0.08)
    sun.intensity = MathUtils.lerp(sun.intensity, intensity, 0.08)
  })

  // Angled down through the windows from the +X side (spec: ~30° from vertical).
  return <directionalLight ref={sunRef} position={[7, 3.5, 0]} color="#FFB74D" intensity={1.2} />
}

/** Main interior builder — assembles all Phase 2 systems */
export function InteriorBuilder({ line }: { line: TrainLine }) {
  const theme = getInteriorTheme(line.id)
  const seats = useMemo(() => carriageSeats(), [])
  const { halfW, z0, z1, ceilY } = CARRIAGE
  const len = z1 - z0
  const midZ = (z0 + z1) / 2
  const phase = useTrain((s) => s.phase)
  const doorsLocked = phase === 'traveling'

  return (
    <group>
      {/* Floor system — carpet + aisle runner + brass trim */}
      <FloorSystem />

      {/* Wall panels — wood paneling + wallpaper + brass trim */}
      <WallPanels />

      {/* Ceiling */}
      <Ceiling midZ={midZ} len={len} ceilY={ceilY} />

      {/* Windows — brass-framed with glass (+ frost film on cold routes) */}
      <WindowFrames frost={line.weather === 'snow'} />

      {/* Curtains — velvet with sway animation */}
      {theme.curtains && <CurtainSystem />}

      {/* Luggage racks — brass rail + random items */}
      {theme.luggageRacks && <LuggageRack />}

      {/* Seats + tray tables */}
      {seats.map((s, i) => {
        const seatType = s.col === 0 || s.col === 3 ? 'A' : 'B'
        const variant = getSeatVariant(i)
        return (
          <group key={s.id}>
            <group position={[s.pos[0], 0, s.pos[2]]}>
              <Seat type={seatType} variant={variant} />
            </group>
          </group>
        )
      })}

      {/* Magic details — dust particles + book stack */}
      <DustParticles />
      <MagicBookStack position={[seats[0]?.pos[0] ?? -2.3, 0.35, (seats[0]?.pos[2] ?? -7.5) + 0.9]} />

      {/* Door openings */}
      {([-1, 1] as const).map((side) =>
        DOOR_Z.map((dz) => <DoorOpening key={`door-${side}-${dz}`} side={side} z={dz} locked={doorsLocked} />),
      )}

      {/* Panoramic front glass */}
      <PanoramicGlass />

      {/* Exterior shell */}
      <ExteriorShell line={line} midZ={midZ} len={len} />

      {/* Interior lighting */}
      <InteriorLighting />

      {/* Window light — route/time-of-day sun through the glass + tunnel dark */}
      <WindowLight line={line} />

      {/* Ambient audio */}
      <InteriorAudio />
    </group>
  )
}
