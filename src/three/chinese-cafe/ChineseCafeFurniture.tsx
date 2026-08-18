import { useMemo } from 'react'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from '../library/Instanced'
import { chineseCafeSeatAnchors } from './layout'
import { CAFE_PALETTE, useChineseCafeTextures } from './materials'

function offset(x: number, z: number, yaw: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return [x + lx * c + lz * s, z - lx * s + lz * c]
}

/** A classic Chinese table foot (象腿足) — a tapered post, a flared
 *  elephant foot with a brass ring and a round base pad, built up from the
 *  floor to `top` (where the leg meets the apron). Round, carved-looking and
 *  identical from every side. */
function CloudFoot({ top, floor = 0, dark = '#28180f', position = [0, 0, 0] }: { top: number; floor?: number; dark?: string; position?: [number, number, number] }) {
  const rise = top - floor
  const postH = rise - 0.22
  return (
    <group position={position}>
      {/* round base pad */}
      <mesh position={[0, floor + 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.17, 0.06, 14]} />
        <meshStandardMaterial color="#1c1009" roughness={0.6} />
      </mesh>
      {/* flared elephant foot */}
      <mesh position={[0, floor + 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.18, 12]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
      {/* brass ring where the foot meets the post */}
      <mesh position={[0, floor + 0.25, 0]}>
        <torusGeometry args={[0.1, 0.016, 8, 16]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.78} roughness={0.26} />
      </mesh>
      {/* tapered post up to the apron */}
      <mesh position={[0, floor + 0.22 + postH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.082, postH, 10]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
    </group>
  )
}

function CafeChairs() {
  const data = useMemo(() => {
    const seats: ShapeItem[] = []
    const cushions: ShapeItem[] = []
    const rails: BoxItem[] = []
    const legs: ShapeItem[] = []
    const backPosts: ShapeItem[] = []
    const spindles: ShapeItem[] = []
    const arms: BoxItem[] = []
for (const seat of chineseCafeSeatAnchors()) {
        const [x, y, z] = seat.pos
      const upper = seat.zone === 'mezzanine'
      const upholstery = seat.zone === 'booth' ? '#66534b' : upper ? '#375f55' : '#77533f'
      seats.push({ pos: [x, y + 0.43, z], scale: [0.39, 0.1, 0.36], color: '#372217' })
      cushions.push({ pos: [x, y + 0.5, z], scale: [0.35, 0.055, 0.32], color: upholstery })

      // The back belongs BEHIND the seated avatar. The old build used -0.29,
      // which put the back toward the table and made every chair read reversed.
      for (const lx of [-0.27, 0.27]) {
        const [px, pz] = offset(x, z, seat.yaw, lx, 0.29)
        backPosts.push({ pos: [px, y + 0.83, pz], scale: [0.035, 0.74, 0.035], color: '#2a1a12' })
      }
      for (const lx of [-0.18, -0.09, 0, 0.09, 0.18]) {
        const [px, pz] = offset(x, z, seat.yaw, lx, 0.29)
        spindles.push({ pos: [px, y + 0.86, pz], scale: [0.014, 0.52, 0.014], color: CAFE_PALETTE.brass })
      }
      const [railX, railZ] = offset(x, z, seat.yaw, 0, 0.29)
      rails.push({ pos: [railX, y + 1.2, railZ], size: [0.7, 0.09, 0.1], rotY: seat.yaw, color: '#4b2e1c' })
      rails.push({ pos: [railX, y + 0.66, railZ], size: [0.64, 0.06, 0.07], rotY: seat.yaw, color: CAFE_PALETTE.brass })

      // armrests — a top bar each side with a front + back support post, sitting
      // just outside the seat edge so they don't clip the seated avatar
      for (const side of [-1, 1]) {
        const [ax, az] = offset(x, z, seat.yaw, side * 0.33, 0.0)
        arms.push({ pos: [ax, y + 0.72, az], size: [0.07, 0.07, 0.54], rotY: seat.yaw, color: '#4b2e1c' })
        const [fx, fz] = offset(x, z, seat.yaw, side * 0.33, 0.26)
        arms.push({ pos: [fx, y + 0.48, fz], size: [0.07, 0.5, 0.07], color: '#2a1a12' })
        const [bx, bz] = offset(x, z, seat.yaw, side * 0.33, -0.18)
        arms.push({ pos: [bx, y + 0.48, bz], size: [0.07, 0.5, 0.07], color: '#2a1a12' })
      }

      for (const lx of [-0.25, 0.25]) for (const lz of [-0.24, 0.24]) {
        const [wx, wz] = offset(x, z, seat.yaw, lx, lz)
        legs.push({ pos: [wx, y + 0.22, wz], scale: [0.045, 0.44, 0.045], color: '#2a1a12' })
      }
    }
    return { seats, cushions, rails, legs, backPosts, spindles, arms }
  }, [])

  return (
    <group>
      <InstancedShape items={data.seats} roughness={0.5} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 20]} />
      </InstancedShape>
      <InstancedShape items={data.cushions} roughness={0.88} castShadow>
        <cylinderGeometry args={[1, 1, 1, 20]} />
      </InstancedShape>
      <InstancedBoxes items={data.rails} roughness={0.42} metalness={0.12} castShadow />
      <InstancedBoxes items={data.arms} roughness={0.45} castShadow />
      <InstancedShape items={[...data.legs, ...data.backPosts]} roughness={0.48} castShadow>
        <cylinderGeometry args={[1, 1, 1, 12]} />
      </InstancedShape>
      <InstancedShape items={data.spindles} roughness={0.3} metalness={0.55}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
      </InstancedShape>
    </group>
  )
}

/** A long Chinese scholar's table (条案) — deep walnut top, red-lacquer edge
 *  band, carved apron and cloud-head feet. The surface is left bare: each
 *  player's equipped accessory is what sits in front of them. */
/** The south window counter (南窗茶桌) — a short wall-mounted tea ledge
 *  along the west glazing in the second room, matching the rain-window bar.
 *  Supported by wall brackets on the back edge (hidden from the seats), kept
 *  bare so each player's equipped accessory shows on the top. */
function SouthWindowBar() {
  const gold = CAFE_PALETTE.brass
  const woodDark = '#2c1a10'
  const textures = useChineseCafeTextures()
  // one station per south window seat — medallions + brackets line up with them
  const stations = [18.5, 21, 23.5, 26]
  return (
    <group>
      {/* counter top — polished wood grain with a clearcoat */}
      <mesh position={[-19.6, 0.79, 22.25]} castShadow receiveShadow>
        <boxGeometry args={[1.44, 0.16, 8.5]} />
        <meshPhysicalMaterial map={textures.wood} color="#6a3c20" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.3} />
      </mesh>
      {/* brass beading right under the top edge */}
      <mesh position={[-19.6, 0.71, 22.25]}>
        <boxGeometry args={[1.48, 0.03, 8.54]} />
        <meshStandardMaterial color={gold} metalness={0.82} roughness={0.28} />
      </mesh>
      {/* red-lacquer edge band */}
      <mesh position={[-19.6, 0.66, 22.25]}>
        <boxGeometry args={[1.44, 0.06, 8.5]} />
        <meshStandardMaterial color="#7d2a22" roughness={0.38} />
      </mesh>
      {/* carved apron with a gold bead line */}
      <mesh position={[-19.6, 0.56, 22.25]} castShadow>
        <boxGeometry args={[1.36, 0.16, 8.35]} />
        <meshStandardMaterial color={woodDark} roughness={0.55} />
      </mesh>
      <mesh position={[-19.6, 0.58, 22.25]}>
        <boxGeometry args={[1.4, 0.045, 8.38]} />
        <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* a carved gold medallion on the apron under each station */}
      {stations.map((z) => (
        <mesh key={z} position={[-19.6, 0.56, z]}>
          <boxGeometry args={[0.14, 0.09, 0.09]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      {/* wall-mounted bracket supports on the back edge, hidden from the seats */}
      {stations.map((z) => (
        <group key={z}>
          <mesh position={[-20.26, 0.4, z]} castShadow>
            <boxGeometry args={[0.08, 0.76, 0.1]} />
            <meshStandardMaterial color={woodDark} roughness={0.5} />
          </mesh>
          <mesh position={[-19.9, 0.72, z]} castShadow>
            <boxGeometry args={[0.68, 0.06, 0.12]} />
            <meshStandardMaterial color={woodDark} roughness={0.5} />
          </mesh>
          <mesh position={[-20.26, 0.72, z]}>
            <boxGeometry args={[0.1, 0.1, 0.13]} />
            <meshStandardMaterial color={gold} metalness={0.78} roughness={0.26} />
          </mesh>
        </group>
      ))}
      {/* brass end caps */}
      {[18.0, 26.5].map((z) => (
        <mesh key={z} position={[-19.6, 0.79, z]} castShadow>
          <boxGeometry args={[1.46, 0.18, 0.1]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function CommunalTable() {
  const textures = useChineseCafeTextures()
  const gold = CAFE_PALETTE.brass
  const woodDark = '#28180f'
  return (
    <group>
      {/* tabletop */}
      <mesh position={[-8.4, 0.82, -7.2]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.18, 13.2]} />
        <meshPhysicalMaterial map={textures.wood} color="#6a3c20" roughness={0.46} clearcoat={0.2} clearcoatRoughness={0.45} />
      </mesh>
      {/* red-lacquer edge band */}
      <mesh position={[-8.4, 0.74, -7.2]}>
        <boxGeometry args={[2.46, 0.07, 13.26]} />
        <meshStandardMaterial color="#7d2a22" roughness={0.38} metalness={0.06} />
      </mesh>
      {/* carved apron (牙板) under the top */}
      <mesh position={[-8.4, 0.61, -7.2]} castShadow>
        <boxGeometry args={[2.3, 0.2, 13.1]} />
        <meshStandardMaterial color={woodDark} roughness={0.55} />
      </mesh>
      {/* gold auspicious medallion on the apron centre */}
      <mesh position={[-8.4, 0.61, -7.2]}>
        <boxGeometry args={[0.36, 0.09, 0.09]} />
        <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* four carved legs at the quarter points */}
      {[-9.15, -7.65].map((x) => [-11.7, -2.7].map((z) => (
        <CloudFoot key={`${x}:${z}`} position={[x, 0, z]} top={0.52} dark={woodDark} />
      )))}
      {/* brass corner plates (角花) at the four corners */}
      {[-6.5, 6.5].map((z) => [-1.12, 1.12].map((x) => (
        <mesh key={`${x}:${z}`} position={[-8.4 + x, 0.915, -7.2 + z]} castShadow>
          <boxGeometry args={[0.17, 0.03, 0.17]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
        </mesh>
      )))}
    </group>
  )
}

const BOOTH_ZS = [-15, -7, 1, 9]

/** A Ming-style booth study desk — round-cornered top with brass inlay, a
 *  carved apron on every side and cloud-bracket trestle feet. Kept clear of
 *  clutter: the player's equipped accessory is what sits on the desk. */
function BoothDesk({ z, wood }: { z: number; wood: ReturnType<typeof useChineseCafeTextures>['wood'] }) {
  const gold = CAFE_PALETTE.brass
  const woodDark = '#2c1a10'
  return (
    <group>
      {/* tabletop — visible wood grain with a light polished clearcoat */}
      <mesh position={[14.8, 0.84, z]} castShadow receiveShadow>
        <boxGeometry args={[2.05, 0.14, 2.2]} />
        <meshPhysicalMaterial map={wood} color="#7a4422" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.3} />
      </mesh>
      {/* brass edge inlay */}
      <mesh position={[14.8, 0.86, z]}>
        <boxGeometry args={[2.15, 0.028, 2.3]} />
        <meshStandardMaterial color={gold} metalness={0.82} roughness={0.28} />
      </mesh>
      {/* red-lacquer edge band under the top */}
      <mesh position={[14.8, 0.77, z]}>
        <boxGeometry args={[2.08, 0.05, 2.23]} />
        <meshStandardMaterial color="#7d2a22" roughness={0.38} />
      </mesh>
      {/* carved apron — a full surround */}
      <mesh position={[14.8, 0.66, z]} castShadow>
        <boxGeometry args={[1.94, 0.18, 2.1]} />
        <meshStandardMaterial color={woodDark} roughness={0.55} />
      </mesh>
      {/* gold studs on the apron */}
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[14.8 + dx, 0.66, z]}>
          <boxGeometry args={[0.05, 0.1, 0.05]} />
          <meshStandardMaterial color={gold} metalness={0.78} roughness={0.25} />
        </mesh>
      ))}
      {/* cloud-bracket trestle feet — support the top without blocking the
          sitters on either long side (corner legs used to poke out in front) */}
      {[-0.98, 0.98].map((dz) => (
        <group key={dz}>
          <mesh position={[14.8, 0.4, z + dz]} castShadow>
            <boxGeometry args={[1.85, 0.78, 0.12]} />
            <meshStandardMaterial color={woodDark} roughness={0.5} />
          </mesh>
          {/* flared cloud foot */}
          <mesh position={[14.8, 0.09, z + dz]} castShadow>
            <boxGeometry args={[1.85, 0.12, 0.16]} />
            <meshStandardMaterial color="#1c1009" roughness={0.6} />
          </mesh>
          {/* red trim where the bracket meets the apron */}
          <mesh position={[14.8, 0.71, z + dz]}>
            <boxGeometry args={[1.9, 0.06, 0.14]} />
            <meshStandardMaterial color="#7d2a22" roughness={0.42} />
          </mesh>
        </group>
      ))}
      {/* brass corner plates */}
      {[-0.95, 0.95].map((dz) => [-0.9, 0.9].map((dx) => (
        <mesh key={`${dx}:${dz}`} position={[14.8 + dx, 0.93, z + dz]} castShadow>
          <boxGeometry args={[0.1, 0.025, 0.1]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
        </mesh>
      )))}
    </group>
  )
}

function LatticeBooths() {
  const textures = useChineseCafeTextures()
  const lattice = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    for (const z of BOOTH_ZS) {
      for (const dz of [-3.25, 3.25]) {
        // Solid carved partition panel — the old thin-bar lattice grid read
        // as a fence of sticks from the seated booths.
        // top cap rail
        items.push({ pos: [18.4, 3.3, z + dz], size: [4.6, 0.14, 0.14], rotY: Math.PI / 2, color: CAFE_PALETTE.walnut })
        // solid panel body
        items.push({ pos: [18.4, 1.65, z + dz], size: [4.6, 3.0, 0.12], color: '#3a2619' })
        // decorative brass accent strip at the centre
        items.push({ pos: [18.4, 1.75, z + dz], size: [4.6, 0.08, 0.13], rotY: Math.PI / 2, color: CAFE_PALETTE.brass })
      }
    }
    return items
  }, [])

  return (
    <group>
      <InstancedBoxes items={lattice} roughness={0.56} castShadow />
      {BOOTH_ZS.map((z, index) => (
        <group key={z}>
          <BoothDesk z={z} wood={textures.wood} />
          <mesh position={[19.85, 1.4, z]}>
            <boxGeometry args={[0.18, 2.8, 5.0]} />
            <meshStandardMaterial color="#3a2619" roughness={0.62} />
          </mesh>
          <mesh position={[19.72, 2.25, z]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[2.3, 1.45]} />
            <meshStandardMaterial color={index % 2 ? '#243e35' : '#68412a'} roughness={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** The rain-window counter — a long Chinese tea-table (茶桌) under the glazing.
 *  Walnut top, red-lacquer edge, carved apron and cloud-head legs. Bare on
 *  top so each player's equipped accessory shows. */
function RainWindowBar() {
  const gold = CAFE_PALETTE.brass
  const woodDark = '#2c1a10'
  const textures = useChineseCafeTextures()
  // one station per window seat (17–22) — legs and dividers line up with the seats
  const stations = [3.05, 5.7, 8.35, 11.0, 13.65, 16.3]
  return (
    <group>
      {/* counter top — polished wood grain with a clearcoat */}
      <mesh position={[-19.6, 0.79, 9.675]} castShadow receiveShadow>
        <boxGeometry args={[1.44, 0.16, 14.9]} />
        <meshPhysicalMaterial map={textures.wood} color="#6a3c20" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.3} />
      </mesh>
      {/* brass beading right under the top edge — mirrors the booth desks */}
      <mesh position={[-19.6, 0.71, 9.675]}>
        <boxGeometry args={[1.48, 0.03, 14.94]} />
        <meshStandardMaterial color={gold} metalness={0.82} roughness={0.28} />
      </mesh>
      {/* red-lacquer edge band */}
      <mesh position={[-19.6, 0.66, 9.675]}>
        <boxGeometry args={[1.44, 0.06, 14.9]} />
        <meshStandardMaterial color="#7d2a22" roughness={0.38} />
      </mesh>
      {/* carved apron with a gold bead line */}
      <mesh position={[-19.6, 0.56, 9.675]} castShadow>
        <boxGeometry args={[1.36, 0.16, 14.75]} />
        <meshStandardMaterial color={woodDark} roughness={0.55} />
      </mesh>
      <mesh position={[-19.6, 0.58, 9.675]}>
        <boxGeometry args={[1.4, 0.045, 14.78]} />
        <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* a carved gold medallion on the apron under each station */}
      {stations.map((z) => (
        <mesh key={z} position={[-19.6, 0.56, z]}>
          <boxGeometry args={[0.14, 0.09, 0.09]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      {/* wall-mounted bracket supports (L-brackets) on the back edge,
          hidden from the seated side — the counter is against the west wall,
          so supports attach to the wall rather than standing on the floor. */}
      {stations.map((z) => (
        <group key={z}>
          {/* vertical bracket arm against the wall */}
          <mesh position={[-20.26, 0.4, z]} castShadow>
            <boxGeometry args={[0.08, 0.76, 0.1]} />
            <meshStandardMaterial color={woodDark} roughness={0.5} />
          </mesh>
          {/* horizontal arm reaching under the counter */}
          <mesh position={[-19.9, 0.72, z]} castShadow>
            <boxGeometry args={[0.68, 0.06, 0.12]} />
            <meshStandardMaterial color={woodDark} roughness={0.5} />
          </mesh>
          {/* brass reinforcement plate */}
          <mesh position={[-20.26, 0.72, z]}>
            <boxGeometry args={[0.1, 0.1, 0.13]} />
            <meshStandardMaterial color={gold} metalness={0.78} roughness={0.26} />
          </mesh>
        </group>
      ))}
      {/* brass end caps */}
      {[2.1, 17.25].map((z) => (
        <mesh key={z} position={[-19.6, 0.79, z]} castShadow>
          <boxGeometry args={[1.46, 0.18, 0.1]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.25} />
        </mesh>
      ))}

    </group>
  )
}

/** A scholar's desk on the mezzanine — red-lacquer edge, carved apron and
 *  four cloud-head legs, kept bare for the equipped accessory. */
function MezzanineDesks() {
  const gold = CAFE_PALETTE.brass
  const woodDark = '#2c1a10'
  return (
    <group>
      {[-8.2, 8.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 6.07, -21.6]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.16, 4.2]} />
            <meshPhysicalMaterial color="#5a3822" roughness={0.48} clearcoat={0.2} clearcoatRoughness={0.45} />
          </mesh>
          {/* red-lacquer edge band */}
          <mesh position={[x, 5.99, -21.6]}>
            <boxGeometry args={[1.54, 0.05, 4.24]} />
            <meshStandardMaterial color="#7d2a22" roughness={0.38} />
          </mesh>
          {/* carved apron */}
          <mesh position={[x, 5.87, -21.6]} castShadow>
            <boxGeometry args={[1.4, 0.17, 4.1]} />
            <meshStandardMaterial color={woodDark} roughness={0.55} />
          </mesh>
          {/* gold studs on the apron */}
          {[-0.7, 0.7].map((dz) => (
            <mesh key={dz} position={[x, 5.87, -21.6 + dz]}>
              <boxGeometry args={[0.05, 0.09, 0.05]} />
              <meshStandardMaterial color={gold} metalness={0.78} roughness={0.25} />
            </mesh>
          ))}
          {/* four carved legs so the desk sits on the mezzanine floor */}
          {[[-0.62, -1.92], [0.62, -1.92], [-0.62, 1.92], [0.62, 1.92]].map(([dx, dz]) => (
            <CloudFoot key={`${dx}:${dz}`} position={[x + dx, 0, -21.6 + dz]} top={5.79} floor={5.45} dark={woodDark} />
          ))}
        </group>
      ))}
    </group>
  )
}

function ServiceCounter() {
  const jars = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    const colors = ['#31594d', '#9a713e', '#7c4532', '#b2b7a0']
    for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
      items.push({ pos: [7.6 + col * 0.78, 2.45 + row * 0.72, 22.18], scale: [0.25, 0.52, 0.25], color: colors[(row + col) % colors.length] })
    }
    return items
  }, [])

  return (
    <group>
      <mesh position={[10.7, 1.18, 20.2]} castShadow receiveShadow>
        <boxGeometry args={[8.8, 2.36, 3.2]} />
        <meshStandardMaterial color="#2d211a" roughness={0.64} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={i} position={[6.65 + i * 0.47, 1.15, 18.56]}>
          <boxGeometry args={[0.25, 2.05, 0.08]} />
          <meshStandardMaterial color={i % 2 ? '#4b2f1d' : '#5b3922'} roughness={0.58} />
        </mesh>
      ))}
      <mesh position={[10.7, 2.44, 20.2]} castShadow receiveShadow>
        <boxGeometry args={[9.2, 0.16, 3.5]} />
        <meshPhysicalMaterial color="#d0c7b3" roughness={0.26} clearcoat={0.3} clearcoatRoughness={0.35} />
      </mesh>
      <mesh position={[10.7, 3.25, 22.45]} castShadow>
        <boxGeometry args={[8.6, 2.5, 0.32]} />
        <meshStandardMaterial color="#312218" roughness={0.7} />
      </mesh>
      <InstancedShape items={jars} roughness={0.25} metalness={0.08} castShadow>
        <cylinderGeometry args={[1, 1, 1, 18]} />
      </InstancedShape>
      <group position={[8.2, 2.65, 19.7]}>
        <mesh><boxGeometry args={[2.1, 0.85, 1.25]} /><meshStandardMaterial color="#7c8581" metalness={0.72} roughness={0.26} /></mesh>
        <mesh position={[0.48, 0.62, 0]}><cylinderGeometry args={[0.19, 0.19, 0.8, 16]} /><meshStandardMaterial color="#363c3b" metalness={0.6} roughness={0.28} /></mesh>
        <mesh position={[-0.48, 0.62, 0]}><cylinderGeometry args={[0.19, 0.19, 0.8, 16]} /><meshStandardMaterial color="#363c3b" metalness={0.6} roughness={0.28} /></mesh>
      </group>
      <group position={[12.1, 2.65, 19.8]}>
        <mesh><cylinderGeometry args={[0.55, 0.65, 0.9, 20]} /><meshStandardMaterial color="#2a3030" metalness={0.65} roughness={0.32} /></mesh>
        <mesh position={[0, 0.65, 0]}><torusGeometry args={[0.27, 0.06, 8, 18]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.75} roughness={0.25} /></mesh>
      </group>
      <mesh position={[14.1, 3.05, 19.4]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[1.45, 1.05, 0.08]} />
        <meshBasicMaterial color="#31584e" />
      </mesh>
      <mesh position={[4.75, 4.55, 22.15]}>
        <boxGeometry args={[3, 1.35, 0.16]} />
        <meshStandardMaterial color="#111b18" roughness={0.4} />
      </mesh>
      <mesh position={[4.75, 4.55, 22.04]}><planeGeometry args={[2.65, 1]} /><meshBasicMaterial color="#d9c080" /></mesh>
    </group>
  )
}

function WallDetails() {
  const shelves = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    for (const x of [-14, -9, -4, 2]) {
      items.push({ pos: [x, 3.1, -27.25], size: [4.2, 0.16, 0.46], color: '#4c2d1a' })
      items.push({ pos: [x, 5.35, -27.25], size: [4.2, 0.16, 0.46], color: '#4c2d1a' })
      for (let i = 0; i < 11; i++) {
        items.push({ pos: [x - 1.75 + i * 0.34, 3.55 + (i % 3) * 0.07, -26.93], size: [0.24, 0.75 + (i % 4) * 0.08, 0.22], color: ['#6b3430', '#2f584a', '#ba8e45', '#354b63'][i % 4] })
      }
    }
    return items
  }, [])
  return (
    <group>
      <InstancedBoxes items={shelves} roughness={0.72} castShadow />
      {[-13, -4, 5].map((x, i) => (
        <group key={x} position={[x, 7.7, -27.38]}>
          <mesh><planeGeometry args={[4.2, 2.15]} /><meshStandardMaterial color={i === 0 ? '#3d5a4d' : i === 1 ? '#8c6a3b' : '#43372d'} roughness={0.86} /></mesh>
          <mesh position={[0, 0, 0.03]}><torusGeometry args={[0.72, 0.035, 8, 48]} /><meshBasicMaterial color="#dec783" /></mesh>
        </group>
      ))}
      {[-15, -5, 5, 15].map((x) => (
        <mesh key={x} position={[x, 9.2, -26.95]}>
          <boxGeometry args={[0.12, 2.1, 0.12]} />
          <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

export function ChineseCafeFurniture() {
  return (
    <group>
      <CafeChairs />
      <CommunalTable />
      <SouthWindowBar />
      <LatticeBooths />
      <RainWindowBar />
      <MezzanineDesks />
      <ServiceCounter />
      <WallDetails />
    </group>
  )
}
