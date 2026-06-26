import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { palette, glow } from './env'
import { MAT, InstancedShape, type ShapeItem } from './assets'
import {
  CANOPY_H,
  TRACK_BED_Y,
  TUNNEL_Z0,
  TUNNEL_Z1,
  JUNCTION_Z,
  SPLIT_Z,
  shedExtent,
  platforms,
} from './layout'

// The lit underground tunnel beyond the platform throats — the thing you see when
// you look NORTH up any platform, so the world no longer ends in a void. Each
// platform's single track runs into the tunnel mouth, fans into branch "fingers"
// at the JUNCTION, and every finger splits ONCE more into an outbound + a return
// rail (the train that's leaving, and the track that brings it home). Cool teal
// sconces rake down brick haunches into the dark. Everything repeated — every
// rail, every sconce — is GPU-instanced, so the whole tunnel is a handful of draw
// calls. Purely visual: the player is sealed on the platforms by the colliders and
// never walks in here.

const RAIL_Y = TRACK_BED_Y + 0.12
const GAUGE = 0.7

/** Push a parallel pair of rails (left + right of gauge) between two XZ points. */
function railPair(out: ShapeItem[], x0: number, z0: number, x1: number, z1: number) {
  const dx = x1 - x0
  const dz = z1 - z0
  const len = Math.hypot(dx, dz)
  const angle = Math.atan2(dx, dz) // local +Z aligns to the segment direction
  // perpendicular unit in XZ, for the rail-gauge offset
  const px = dz / len
  const pz = -dx / len
  for (const g of [-GAUGE, GAUGE]) {
    out.push({
      pos: [(x0 + x1) / 2 + px * g, RAIL_Y, (z0 + z1) / 2 + pz * g],
      rot: [0, angle, 0],
      scale: [1, 1, len],
    })
  }
}

export function TunnelJunction() {
  const shed = useMemo(() => shedExtent(), [])
  const plats = useMemo(() => platforms(), [])
  const tunMidZ = (TUNNEL_Z0 + TUNNEL_Z1) / 2
  const tunLen = TUNNEL_Z1 - TUNNEL_Z0

  // ---- all tunnel rails as ONE instanced batch ----
  const rails = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (const p of plats) {
      const tx = p.trackX
      // 1) straight throat: mouth → junction
      railPair(out, tx, TUNNEL_Z0, tx, JUNCTION_Z)
      // 2) the two fingers fanning out from the junction
      const L: [number, number] = [tx - 3, SPLIT_Z]
      const R: [number, number] = [tx + 3, SPLIT_Z]
      railPair(out, tx, JUNCTION_Z, L[0], L[1])
      railPair(out, tx, JUNCTION_Z, R[0], R[1])
      // 3) each finger splits once more into outbound + return, into the dark
      railPair(out, L[0], L[1], tx - 4.6, TUNNEL_Z1)
      railPair(out, L[0], L[1], tx - 1.8, TUNNEL_Z1)
      railPair(out, R[0], R[1], tx + 1.8, TUNNEL_Z1)
      railPair(out, R[0], R[1], tx + 4.6, TUNNEL_Z1)
    }
    return out
  }, [plats])

  // ---- point-machine frogs (where the rails diverge) as a cheap instanced batch ----
  const frogs = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (const p of plats) {
      out.push({ pos: [p.trackX, RAIL_Y, JUNCTION_Z] })
      out.push({ pos: [p.trackX - 3, RAIL_Y, SPLIT_Z] })
      out.push({ pos: [p.trackX + 3, RAIL_Y, SPLIT_Z] })
    }
    return out
  }, [plats])

  // ---- teal wall sconces down both haunches ----
  const sconceCount = 7
  const sconces = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (let i = 0; i < sconceCount; i++) {
      const z = TUNNEL_Z0 + 4 + (i / (sconceCount - 1)) * (tunLen - 8)
      out.push({ pos: [shed.westX + 0.6, 4.4, z] })
      out.push({ pos: [shed.eastX - 0.6, 4.4, z] })
    }
    return out
  }, [shed, tunLen])

  return (
    <group>
      {/* tunnel floor — dark ballast running the whole length, full width */}
      <mesh rotation-x={-Math.PI / 2} position={[shed.cx, TRACK_BED_Y, tunMidZ]} receiveShadow>
        <planeGeometry args={[shed.width + 1, tunLen]} />
        <meshStandardMaterial color={'#1a1714'} roughness={0.97} />
      </mesh>

      {/* the two brick haunch walls of the tunnel (cool brick) */}
      {[shed.westX - 0.1, shed.eastX + 0.1].map((x) => (
        <mesh key={x} position={[x, CANOPY_H / 2 - 1, tunMidZ]} receiveShadow material={MAT.brickCool()}>
          <boxGeometry args={[0.8, CANOPY_H, tunLen]} />
        </mesh>
      ))}

      {/* flat tunnel ceiling, a touch lower than the shed canopy */}
      <mesh position={[shed.cx, CANOPY_H - 1.2, tunMidZ]}>
        <boxGeometry args={[shed.width + 1, 0.8, tunLen]} />
        <meshStandardMaterial color={'#15120f'} roughness={0.95} />
      </mesh>

      {/* the brick mouth arch framing the tunnel entrance (replaces the old gable) */}
      <mesh position={[shed.cx, CANOPY_H - 2.4, TUNNEL_Z0]} material={MAT.brick()}>
        <boxGeometry args={[shed.width + 1.5, 3.2, 1.4]} />
      </mesh>
      {[shed.westX, shed.eastX].map((x) => (
        <mesh key={x} position={[x, (CANOPY_H - 3.2) / 2, TUNNEL_Z0]} material={MAT.brickDark()}>
          <boxGeometry args={[1.6, CANOPY_H - 3.2, 1.4]} />
        </mesh>
      ))}
      {/* pale stone keystone + impost band over the mouth */}
      <mesh position={[shed.cx, CANOPY_H - 2.4, TUNNEL_Z0 - 0.75]} material={MAT.mortar()}>
        <boxGeometry args={[2.2, 1.4, 0.3]} />
      </mesh>

      {/* dark back wall closing the far end — no void beyond, just the deep dark */}
      <mesh position={[shed.cx, CANOPY_H / 2 - 1, TUNNEL_Z1]}>
        <planeGeometry args={[shed.width + 2, CANOPY_H + 2]} />
        <meshStandardMaterial color={'#08090c'} side={DoubleSide} />
      </mesh>

      {/* ---- all rails: one draw call ---- */}
      <InstancedShape items={rails} color={palette.steel.getStyle()} metalness={0.55} roughness={0.4}>
        <boxGeometry args={[0.12, 0.16, 1]} />
      </InstancedShape>

      {/* point-machine frogs at every divergence */}
      <InstancedShape items={frogs} color={palette.iron.getStyle()} metalness={0.5} roughness={0.6}>
        <boxGeometry args={[1.6, 0.14, 1.6]} />
      </InstancedShape>

      {/* ---- teal sconces: instanced bracket + instanced glow ---- */}
      <InstancedShape items={sconces} color={palette.iron.getStyle()} metalness={0.6} roughness={0.5}>
        <boxGeometry args={[0.3, 0.5, 0.3]} />
      </InstancedShape>
      <InstancedShape items={sconces} color={'#0c1a1a'} emissive={glow.tunnel.getStyle()} emissiveIntensity={2.4}>
        <sphereGeometry args={[0.22, 8, 6]} />
      </InstancedShape>

      {/* a few real cool point-lights (perf-capped) to actually light the throat */}
      <pointLight position={[shed.cx, 4.5, TUNNEL_Z0 + 6]} color={glow.tunnel.getStyle()} intensity={3.2} distance={26} decay={2} />
      <pointLight position={[shed.cx, 4.5, JUNCTION_Z + 4]} color={glow.tunnel.getStyle()} intensity={2.6} distance={28} decay={2} />

      {/* green "road clear" signal at the junction; red protecting the return roads */}
      <mesh position={[shed.cx - 1.5, 3.2, JUNCTION_Z]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color={'#0a1a0e'} emissive={glow.signalGreen.getStyle()} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[shed.cx + 1.5, 3.2, SPLIT_Z]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color={'#1a0a0a'} emissive={glow.signalRed.getStyle()} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  )
}
