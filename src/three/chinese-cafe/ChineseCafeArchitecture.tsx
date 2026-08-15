import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from '../library/Instanced'
import { CAFE } from './layout'
import { CAFE_PALETTE, useChineseCafeTextures } from './materials'

function MoonGate() {
  // The moon gate arch stands free as a decorative passage — the partition
  // walls that separated the main hall from the south room are gone, so the
  // two rooms read as ONE open space. The round ring keeps the garden feel.
  return (
    <group>
      <mesh position={[0, 4.15, 17.1]} castShadow>
        <torusGeometry args={[4.15, 0.28, 12, 72]} />
        <meshStandardMaterial color={CAFE_PALETTE.walnut} roughness={0.46} metalness={0.04} />
      </mesh>
      <mesh position={[0, 4.15, 17.02]}>
        <torusGeometry args={[3.82, 0.045, 8, 72]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} emissive="#8a5f22" emissiveIntensity={0.65} metalness={0.78} roughness={0.27} />
      </mesh>
      {/* small decorative plaque above the arch */}
      <mesh position={[0, 8.95, 17.06]}>
        <boxGeometry args={[4.2, 0.12, 0.12]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} emissive="#a87a30" emissiveIntensity={1.5} />
      </mesh>
      {/* two small stone plinths bracing the base of the ring */}
      {[-3.6, 3.6].map((x) => (
        <mesh key={x} position={[x, 0.25, 17.15]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={CAFE_PALETTE.stone} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

const ROOF_PITCH = 3.4 / 23 // rise / run of the hip roof
const RIDGE_Y = 15.0

function RoofAndBeams() {
  const beams = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    for (let z = -25; z <= 25; z += 5) {
      items.push({ pos: [0, 10.25, z], size: [41.2, 0.42, 0.46], color: z % 10 === 0 ? '#3a2013' : '#2b190f' })
    }
    for (const x of [-18, -12, -6, 0, 6, 12, 18]) {
      items.push({ pos: [x, 10.58, 0], size: [0.3, 0.35, 55], color: '#3b2214' })
    }
    for (const x of [-20, -10, 0, 10, 20]) {
      for (const z of [-26, -13, 0, 13, 26]) {
        items.push({ pos: [x, 9.9, z], size: [0.32, 0.55, 0.32], color: CAFE_PALETTE.brass })
      }
    }
    return items
  }, [])

  // Coffered caisson ceiling between the purlins — dark wells with a brass trim
  // and a deep-red center, the classic Chinese 藻井 look seen from the hall.
  const caisson = useMemo(() => {
    const frames: BoxItem[] = []
    const trims: BoxItem[] = []
    const reds: BoxItem[] = []
    for (const x of [-15, -9, -3, 3, 9, 15]) {
      for (const z of [-22.5, -17.5, -12.5, -7.5, -2.5, 2.5, 7.5, 12.5, 17.5, 22.5]) {
        // leave the courtyard well open so the glass skylight reads through
        if (Math.abs(x) <= 4.8 && z >= 0 && z <= 10.4) continue
        frames.push({ pos: [x, 10.62, z], size: [5.7, 0.07, 4.7], color: '#2b190f' })
        trims.push({ pos: [x, 10.64, z], size: [5.0, 0.045, 4.0], color: CAFE_PALETTE.brass })
        reds.push({ pos: [x, 10.65, z], size: [4.4, 0.035, 3.4], color: '#6e1d1d' })
      }
    }
    return { frames, trims, reds }
  }, [])

  // Tile courses running down the east/west roof slopes (dark grey-blue tiles).
  const tiles = useMemo<ShapeItem[]>(() => {
    const items: ShapeItem[] = []
    for (const side of [-1, 1]) {
      for (let i = 0; i < 12; i++) {
        const x = side * (1.6 + i * 1.7)
        const y = RIDGE_Y - Math.abs(x) * ROOF_PITCH
        for (let z = -21.5; z <= 21.5; z += 2.4) {
          items.push({
            pos: [x, y, z],
            scale: [0.38, 0.05, 2.2],
            rot: [0, 0, side * Math.atan(ROOF_PITCH)],
            color: (i + Math.round(z)) % 2 ? '#333b41' : '#292f34',
          })
        }
      }
    }
    return items
  }, [])

  // Upturned eave corners + ridge finials — the signature Chinese swoop.
  const corners: { pos: [number, number, number]; rot: [number, number, number] }[] = [
    { pos: [22.6, 11.65, 29.6], rot: [0, 0.8, 0] },
    { pos: [-22.6, 11.65, 29.6], rot: [0, -0.8, 0] },
    { pos: [22.6, 11.65, -29.6], rot: [0, 2.34, 0] },
    { pos: [-22.6, 11.65, -29.6], rot: [0, -2.34, 0] },
  ]

  return (
    <group>
      <InstancedBoxes items={beams} roughness={0.62} metalness={0.05} castShadow />
      <InstancedBoxes items={caisson.frames} roughness={0.7} castShadow />
      <InstancedBoxes items={caisson.trims} roughness={0.35} metalness={0.7} />
      <InstancedBoxes items={caisson.reds} roughness={0.6} />
      <InstancedShape items={tiles} roughness={0.85} castShadow>
        <boxGeometry />
      </InstancedShape>

      {/* the flat roof deck closing the hall */}
      <mesh position={[0, 11.55, 0]} receiveShadow>
        <boxGeometry args={[45.5, 0.3, 61.5]} />
        <meshStandardMaterial color="#181210" roughness={0.92} side={DoubleSide} />
      </mesh>
      {/* hip roof — two long slopes + four corner hips */}
      <mesh position={[11.5, 13.25, 0]} rotation={[0, 0, -Math.atan(ROOF_PITCH)]}>
        <boxGeometry args={[23.2, 0.16, 44]} />
        <meshStandardMaterial color="#241a16" roughness={0.9} />
      </mesh>
      <mesh position={[-11.5, 13.25, 0]} rotation={[0, 0, Math.atan(ROOF_PITCH)]}>
        <boxGeometry args={[23.2, 0.16, 44]} />
        <meshStandardMaterial color="#241a16" roughness={0.9} />
      </mesh>
      {([
        { pos: [11.5, 13.25, 26], rot: [0, -0.337, -Math.atan(ROOF_PITCH)] },
        { pos: [-11.5, 13.25, 26], rot: [0, 0.337, Math.atan(ROOF_PITCH)] },
        { pos: [11.5, 13.25, -26], rot: [0, 0.337, -Math.atan(ROOF_PITCH)] },
        { pos: [-11.5, 13.25, -26], rot: [0, -0.337, Math.atan(ROOF_PITCH)] },
      ] as const).map((h, i) => (
        <mesh key={i} position={h.pos} rotation={h.rot}>
          <boxGeometry args={[24.6, 0.16, 10]} />
          <meshStandardMaterial color="#201714" roughness={0.9} />
        </mesh>
      ))}
      {/* ridge beam */}
      <mesh position={[0, RIDGE_Y, 0]} castShadow>
        <boxGeometry args={[0.7, 0.5, 44]} />
        <meshStandardMaterial color="#2c1d15" roughness={0.85} />
      </mesh>
      {/* ridge finials — small golden pagoda tips */}
      {[-22, 22].map((z) => (
        <group key={z} position={[0, RIDGE_Y + 0.3, z]}>
          <mesh><boxGeometry args={[0.5, 0.22, 0.5]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.75} roughness={0.3} /></mesh>
          <mesh position={[0, 0.24, 0]}><coneGeometry args={[0.28, 0.3, 4]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.75} roughness={0.3} /></mesh>
          <mesh position={[0, 0.5, 0]}><sphereGeometry args={[0.09, 8, 6]} /><meshStandardMaterial color="#e8c063" emissive="#c48b36" emissiveIntensity={1.2} /></mesh>
        </group>
      ))}
      {/* eave fascia boards along the four outer edges */}
      <mesh position={[23.1, 11.4, 0]}><boxGeometry args={[0.2, 0.55, 60.5]} /><meshStandardMaterial color="#1e150f" roughness={0.85} /></mesh>
      <mesh position={[-23.1, 11.4, 0]}><boxGeometry args={[0.2, 0.55, 60.5]} /><meshStandardMaterial color="#1e150f" roughness={0.85} /></mesh>
      <mesh position={[0, 11.4, 30.1]}><boxGeometry args={[46.2, 0.55, 0.2]} /><meshStandardMaterial color="#1e150f" roughness={0.85} /></mesh>
      <mesh position={[0, 11.4, -30.1]}><boxGeometry args={[46.2, 0.55, 0.2]} /><meshStandardMaterial color="#1e150f" roughness={0.85} /></mesh>
      {/* upturned eave corners */}
      {corners.map((c, i) => (
        <group key={i} position={c.pos} rotation={c.rot}>
          <mesh castShadow><boxGeometry args={[0.85, 0.18, 0.85]} /><meshStandardMaterial color="#241a16" roughness={0.9} /></mesh>
          <mesh position={[0.28, 0.18, 0.28]} rotation={[0.3, 0, 0.3]}><boxGeometry args={[0.6, 0.18, 0.6]} /><meshStandardMaterial color="#2c1d15" roughness={0.9} /></mesh>
          <mesh position={[0.5, 0.34, 0.5]} rotation={[0.6, 0, 0.6]}><boxGeometry args={[0.4, 0.2, 0.4]} /><meshStandardMaterial color="#332217" roughness={0.9} /></mesh>
          <mesh position={[0.72, 0.52, 0.72]}><coneGeometry args={[0.16, 0.3, 4]} /><meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.8} roughness={0.28} /></mesh>
        </group>
      ))}
    </group>
  )
}

function WindowWall() {
  const frames = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    for (let z = -25; z <= 25; z += 4.2) {
      items.push({ pos: [-20.66, 4.7, z], size: [0.24, 9, 0.18], color: CAFE_PALETTE.walnut })
    }
    for (const y of [0.6, 3.1, 5.8, 8.8]) {
      items.push({ pos: [-20.67, y, 0], size: [0.25, 0.16, 54], color: CAFE_PALETTE.walnutWarm })
    }
    return items
  }, [])

  return (
    <group>
      <mesh position={[-20.78, 4.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[54, 9.2]} />
        <meshPhysicalMaterial color="#718a89" roughness={0.16} metalness={0.05} transmission={0.08} transparent opacity={0.42} side={DoubleSide} depthWrite={false} />
      </mesh>
      <InstancedBoxes items={frames} roughness={0.5} castShadow />
      <mesh position={[-20.58, 1.1, 0]}>
        <boxGeometry args={[0.38, 0.32, 54]} />
        <meshStandardMaterial color={CAFE_PALETTE.stoneDark} roughness={0.8} />
      </mesh>
    </group>
  )
}

function Mezzanine() {
  const textures = useChineseCafeTextures()
  // A proper mezzanine balustrade: a wide rounded handrail, a mid rail and a
  // bottom rail, plus thick closely-spaced balusters and capped newel posts.
  // From the top view the handrail reads as a solid wooden band over a dense
  // row of posts — not a sparse line of dots.
  const rail = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    // handrail — wide + deep so it reads as a real rail from above
    items.push({ pos: [0, 6.4, -15.25], size: [40, 0.16, 0.24], color: CAFE_PALETTE.walnut })
    // mid rail + bottom rail
    items.push({ pos: [0, 5.92, -15.25], size: [40, 0.09, 0.14], color: CAFE_PALETTE.walnutWarm })
    items.push({ pos: [0, 5.5, -15.25], size: [40, 0.1, 0.16], color: CAFE_PALETTE.walnut })
    // balusters — closer together and thicker so the fence looks solid
    for (let x = -19.5; x <= 19.5; x += 0.34) {
      items.push({ pos: [x, 5.95, -15.25], size: [0.1, 0.9, 0.11], color: x % 2 ? CAFE_PALETTE.brass : CAFE_PALETTE.walnutWarm })
    }
    // newel posts at both ends, slightly proud of the rail
    items.push({ pos: [-19.7, 6.1, -15.25], size: [0.24, 1.5, 0.26], color: CAFE_PALETTE.walnut })
    items.push({ pos: [19.7, 6.1, -15.25], size: [0.24, 1.5, 0.26], color: CAFE_PALETTE.walnut })
    // post caps
    items.push({ pos: [-19.7, 6.88, -15.25], size: [0.3, 0.1, 0.32], color: CAFE_PALETTE.brass })
    items.push({ pos: [19.7, 6.88, -15.25], size: [0.3, 0.1, 0.32], color: CAFE_PALETTE.brass })
    return items
  }, [])
  const steps = useMemo<BoxItem[]>(() => Array.from({ length: 16 }, (_, i) => ({
    pos: [17.7, (i + 0.5) * (CAFE.mezzanineY / 16), -9.2 - i * 0.39] as [number, number, number],
    size: [3.3, CAFE.mezzanineY / 16, 0.55] as [number, number, number],
    color: i % 2 ? '#3e2517' : '#4a2c19',
  })), [])

  return (
    <group>
      <mesh position={[0, CAFE.mezzanineY, -21.55]} receiveShadow castShadow>
        <boxGeometry args={[41, 0.5, 12.6]} />
        <meshStandardMaterial color="#342117" roughness={0.73} />
      </mesh>
      <mesh position={[0, CAFE.mezzanineY + 0.27, -21.55]} receiveShadow>
        <boxGeometry args={[40.3, 0.08, 12]} />
        <meshPhysicalMaterial map={textures.tile} color="#c9c2b2" roughness={0.6} clearcoat={0.2} clearcoatRoughness={0.5} />
      </mesh>
      <InstancedBoxes items={rail} roughness={0.48} metalness={0.18} castShadow />
      <InstancedBoxes items={steps} roughness={0.62} receiveShadow castShadow />
    </group>
  )
}

function EntranceVestibule() {
  return (
    <group>
      <mesh position={[0, 4.3, 27.55]} receiveShadow>
        <boxGeometry args={[41.5, 8.6, 0.7]} />
        <meshStandardMaterial color="#5e6461" roughness={0.88} />
      </mesh>
      <mesh position={[0, 3.5, 27.16]}>
        <boxGeometry args={[7.2, 7, 0.22]} />
        <meshStandardMaterial color={CAFE_PALETTE.walnut} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.82, 3.45, 26.98]}>
          <mesh>
            <boxGeometry args={[3.38, 6.4, 0.18]} />
            <meshPhysicalMaterial color="#283b39" roughness={0.25} transmission={0.05} transparent opacity={0.86} />
          </mesh>
          <mesh position={[-side * 0.16, 0, -0.14]}>
            <boxGeometry args={[0.075, 1.55, 0.08]} />
            <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 7.65, 26.96]}>
        <boxGeometry args={[8.2, 0.72, 0.25]} />
        <meshStandardMaterial color="#111916" roughness={0.42} />
      </mesh>
      <mesh position={[0, 7.66, 26.78]}>
        <planeGeometry args={[6.5, 0.42]} />
        <meshBasicMaterial color="#e9c778" />
      </mesh>
      <mesh position={[-6.1, 0.55, 25.25]} castShadow>
        <boxGeometry args={[3.7, 1.1, 1.1]} />
        <meshStandardMaterial color="#453023" roughness={0.78} />
      </mesh>
      <mesh position={[7.7, 1.15, 24.7]} castShadow>
        <boxGeometry args={[1.4, 2.3, 1.2]} />
        <meshStandardMaterial color={CAFE_PALETTE.walnutWarm} roughness={0.55} />
      </mesh>
    </group>
  )
}

export function ChineseCafeArchitecture() {
  const textures = useChineseCafeTextures()
  return (
    <group>
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[CAFE.halfW * 2, 0.36, CAFE.halfL * 2]} />
        <meshStandardMaterial map={textures.terrazzo} color="#9f9687" roughness={0.78} />
      </mesh>
      <mesh position={[20.75, 5.2, 0]} receiveShadow>
        <boxGeometry args={[0.5, 10.4, 56]} />
        <meshStandardMaterial map={textures.plaster} color={CAFE_PALETTE.plaster} roughness={0.93} />
      </mesh>
      <mesh position={[0, 5.2, -27.75]} receiveShadow>
        <boxGeometry args={[42, 10.4, 0.5]} />
        <meshStandardMaterial map={textures.brick} color="#77776f" roughness={0.96} />
      </mesh>
      <WindowWall />
      <RoofAndBeams />
      <EntranceVestibule />
      <MoonGate />
      <Mezzanine />
    </group>
  )
}
