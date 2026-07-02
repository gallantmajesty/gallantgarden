import { useMemo } from 'react'
import { CanvasTexture, DoubleSide, SRGBColorSpace } from 'three'
import { makeStationFloor, makeWood } from './textures'
import { palette, glow } from './env'
import { MAT, InstancedShape, type ShapeItem } from './assets'
import {
  CONCOURSE,
  CANOPY_H,
  PLAT_Z0,
  PLAT_Z1,
  PLAT_LEN,
  PLAT_W,
  TRACK_W,
  TRACK_BED_Y,
  platforms,
  shedExtent,
  shedRibZ,
  shedPillars,
} from './layout'

// The fixed fabric of the station, rebuilt as a premium AAA-stylized terminus.
// Two volumes meet at the platform mouths: a warm, human-scaled CONCOURSE hall to
// the south (stone floor, plastered walls, a coffered timber ceiling on iron
// columns, a grand glowing entrance arch) and, beyond it, the lofty vaulted
// TRAINSHED over the narrow island platforms — a real ceiling of cast-iron
// trusses, timber tie-arches, ribbed glass skylight bays and suspended pendant
// lamps, carried on a colonnade of riveted columns. Nothing is a bare plane: every
// surface overhead is articulated. All repeated structure (ribs, arches, pillars,
// pendants, skylight mullions) is GPU-instanced, so the whole shed is a handful of
// draw calls. Built entirely from the layout constants so it lines up exactly with
// the colliders and the berthed trains.

export function Station() {
  const floorTex = useMemo(() => makeStationFloor(16), [])
  const platTex = useMemo(() => makeStationFloor(8, 53), [])
  const woodTex = useMemo(() => makeWood(6, 7, '#5a3a22'), [])
  const barrierSign = useMemo(() => makeBarrierSign(), [])

  const shed = useMemo(() => shedExtent(), [])
  const ribs = useMemo(() => shedRibZ(), [])
  const pillars = useMemo(() => shedPillars(), [])
  const midZ = (PLAT_Z0 + PLAT_Z1) / 2

  const concourseCX = (CONCOURSE.minX + CONCOURSE.maxX) / 2
  const concourseW = CONCOURSE.maxX - CONCOURSE.minX
  const concourseL = CONCOURSE.z1 - CONCOURSE.z0
  const concourseCZ = (CONCOURSE.z0 + CONCOURSE.z1) / 2

  /* ---------------------------------------------------------------------- */
  /* Instanced structural batches — one draw call each                       */
  /* ---------------------------------------------------------------------- */

  // Cast-iron colonnade carrying the shed (visible columns; colliders match).
  const columnItems = useMemo<ShapeItem[]>(
    () => pillars.map(([x, z]) => ({ pos: [x, (CANOPY_H - 1) / 2, z], scale: [1, CANOPY_H - 1, 1] })),
    [pillars],
  )
  // Decorative capital + base rings on each column.
  const capitalItems = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (const [x, z] of pillars) {
      out.push({ pos: [x, CANOPY_H - 1.4, z] })
      out.push({ pos: [x, 0.5, z] })
    }
    return out
  }, [pillars])

  // The two longitudinal top chords of the truss running the length of the shed.
  const chordItems = useMemo<ShapeItem[]>(() => {
    const sideX = [shed.westX + 1.3, shed.eastX - 1.3]
    return sideX.map((x) => ({ pos: [x, CANOPY_H - 0.6, midZ], scale: [1, 1, PLAT_LEN] }))
  }, [shed, midZ])

  // Cross tie-beams + a shallow king-post gable at every rib (the "ceiling ribs").
  const tieItems = useMemo<ShapeItem[]>(
    () => ribs.map((z) => ({ pos: [shed.cx, CANOPY_H - 0.6, z], scale: [shed.width - 2, 1, 1] })),
    [ribs, shed],
  )
  const rafterItems = useMemo<ShapeItem[]>(() => {
    const out: ShapeItem[] = []
    for (const z of ribs) {
      for (const s of [-1, 1]) {
        out.push({ pos: [shed.cx + (s * shed.width) / 4, CANOPY_H + 0.4, z], rot: [0, 0, s * 0.34], scale: [shed.width / 2, 1, 1] })
      }
    }
    return out
  }, [ribs, shed])
  // King-post finial at each gable apex.
  const finialItems = useMemo<ShapeItem[]>(() => ribs.map((z) => ({ pos: [shed.cx, CANOPY_H + 1.5, z] })), [ribs, shed])

  // Suspended pendant lamps hung from alternate tie-beams down the shed centre.
  const pendants = useMemo(() => {
    const out: { pos: [number, number, number] }[] = []
    ribs.forEach((z, i) => {
      if (i % 2 === 1) out.push({ pos: [shed.cx, CANOPY_H - 2.4, z] })
    })
    return out
  }, [ribs, shed])
  const pendantRodItems = useMemo<ShapeItem[]>(
    () => pendants.map((p) => ({ pos: [p.pos[0], p.pos[1] + 0.9, p.pos[2]], scale: [1, 1.8, 1] })),
    [pendants],
  )
  const pendantShadeItems = useMemo<ShapeItem[]>(() => pendants.map((p) => ({ pos: p.pos })), [pendants])
  const pendantGlowItems = useMemo<ShapeItem[]>(() => pendants.map((p) => ({ pos: [p.pos[0], p.pos[1] - 0.12, p.pos[2]] })), [pendants])

  // Skylight mullions: slim cross-bars dividing the glazed roof into bays.
  const mullionItems = useMemo<ShapeItem[]>(
    () => ribs.map((z) => ({ pos: [shed.cx, CANOPY_H - 1.2, z], scale: [shed.width - 3, 1, 1] })),
    [ribs, shed],
  )

  return (
    <group>
      {/* =================== CONCOURSE HALL =================== */}
      {/* stone floor — warm flagstone */}
      <mesh rotation-x={-Math.PI / 2} position={[concourseCX, 0.001, concourseCZ]} receiveShadow>
        <planeGeometry args={[concourseW, concourseL]} />
        <meshStandardMaterial map={floorTex} color={palette.stoneFloorWarm} roughness={0.82} metalness={0.04} />
      </mesh>
      {/* floor extension through the west wall gap to Platform 1 */}
      <mesh rotation-x={-Math.PI / 2} position={[(CONCOURSE.minX + (-37.5)) / 2, 0.001, (-40 + (-2)) / 2]} receiveShadow>
        <planeGeometry args={[Math.abs(-37.5 - CONCOURSE.minX), 38]} />
        <meshStandardMaterial map={floorTex} color={palette.stoneFloorWarm} roughness={0.82} metalness={0.04} />
      </mesh>

      {/* west + east plastered walls with a timber dado + cornice */}
      {[
        // east wall — solid
        { x: CONCOURSE.maxX, segs: [{ cz: concourseCZ, len: concourseL }] },
        // west wall — split with a gap for Platform 1 access (z = -40 to -2)
        {
          x: CONCOURSE.minX,
          segs: [
            { cz: (CONCOURSE.z0 + (-40)) / 2, len: (-40) - CONCOURSE.z0 },
            { cz: ((-2) + CONCOURSE.z1) / 2, len: CONCOURSE.z1 - (-2) },
          ],
        },
      ].map((wall) =>
        wall.segs.map((seg, si) => (
          <group key={`w-${wall.x}-${si}`}>
            <mesh position={[wall.x, CONCOURSE.wallH / 2, seg.cz]} receiveShadow material={MAT.brick()}>
              <boxGeometry args={[0.6, CONCOURSE.wallH, seg.len]} />
            </mesh>
            {/* pale stone string-course banding the brick (King's Cross) */}
            <mesh position={[wall.x + (wall.x < 0 ? 0.32 : -0.32), 3.4, seg.cz]} material={MAT.mortar()}>
              <boxGeometry args={[0.14, 0.3, seg.len]} />
            </mesh>
            {/* warm timber dado rail */}
            <mesh position={[wall.x + (wall.x < 0 ? 0.32 : -0.32), 1.4, seg.cz]} material={MAT.teak()}>
              <boxGeometry args={[0.12, 0.4, seg.len]} />
            </mesh>
            {/* cornice */}
            <mesh position={[wall.x + (wall.x < 0 ? 0.32 : -0.32), CONCOURSE.wallH - 0.5, seg.cz]} material={MAT.oak()}>
              <boxGeometry args={[0.18, 0.5, seg.len]} />
            </mesh>
          </group>
        )),
      )}

      {/* south wall, split around the grand entrance arch */}
      {[
        { cx: (CONCOURSE.minX - 8) / 2, w: -CONCOURSE.minX - 8 },
        { cx: (CONCOURSE.maxX + 8) / 2, w: CONCOURSE.maxX - 8 },
      ].map((seg, i) => (
        <mesh key={i} position={[seg.cx, CONCOURSE.wallH / 2, CONCOURSE.z0]} receiveShadow material={MAT.brick()}>
          <boxGeometry args={[seg.w, CONCOURSE.wallH, 0.6]} />
        </mesh>
      ))}
      {/* The King's Cross brick BARRIER wall around the entrance — NO glowing
          portal. The opening is a real brick archway you walk out through, framed
          by stock-brick piers, a stone impost band and a Platform 9¾ roundel. */}
      {/* brick lintel spanning the opening */}
      <mesh position={[0, CONCOURSE.wallH - 2.6, CONCOURSE.z0]} material={MAT.brick()}>
        <boxGeometry args={[19, 1.7, 0.9]} />
      </mesh>
      {/* pale stone impost band under the lintel (King's Cross banding) */}
      <mesh position={[0, CONCOURSE.wallH - 3.55, CONCOURSE.z0 - 0.05]} material={MAT.mortar()}>
        <boxGeometry args={[19.6, 0.4, 0.7]} />
      </mesh>
      {/* brick side piers flanking the opening */}
      {[-8.6, 8.6].map((x) => (
        <mesh key={x} position={[x, (CONCOURSE.wallH - 3.4) / 2, CONCOURSE.z0]} receiveShadow material={MAT.brickDark()}>
          <boxGeometry args={[1.4, CONCOURSE.wallH - 3.4, 0.9]} />
        </mesh>
      ))}
      {/* stone quoin keystone at the crown of the arch */}
      <mesh position={[0, CONCOURSE.wallH - 1.5, CONCOURSE.z0 - 0.1]} material={MAT.mortar()}>
        <boxGeometry args={[1.6, 1.2, 0.7]} />
      </mesh>
      {/* enamel Platform 9¾ roundel mounted on the pier above the arch */}
      <group position={[0, CONCOURSE.wallH - 0.2, CONCOURSE.z0 - 0.12]}>
        <mesh>
          <circleGeometry args={[1.15, 28]} />
          <meshStandardMaterial map={barrierSign} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.05]} material={MAT.brass()}>
          <torusGeometry args={[1.15, 0.08, 8, 28]} />
        </mesh>
      </group>
      {/* exterior brick porch just OUTSIDE the arch, so looking back south you see
          a King's Cross vestibule — not the void. Floor, return walls, back wall. */}
      <group>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.0, CONCOURSE.z0 - 4]} receiveShadow>
          <planeGeometry args={[20, 8]} />
          <meshStandardMaterial map={floorTex} color={palette.stoneFloorWarm} roughness={0.86} />
        </mesh>
        {[-9.5, 9.5].map((x) => (
          <mesh key={x} position={[x, CONCOURSE.wallH / 2, CONCOURSE.z0 - 4]} receiveShadow material={MAT.brickDark()}>
            <boxGeometry args={[0.6, CONCOURSE.wallH, 8]} />
          </mesh>
        ))}
        {/* back wall of the porch with a doorway suggested by a darker recess */}
        <mesh position={[0, CONCOURSE.wallH / 2, CONCOURSE.z0 - 8]} receiveShadow material={MAT.brick()}>
          <boxGeometry args={[20, CONCOURSE.wallH, 0.6]} />
        </mesh>
        <mesh position={[0, 3.4, CONCOURSE.z0 - 7.7]} material={MAT.teakDark()}>
          <boxGeometry args={[5, 6.4, 0.3]} />
        </mesh>
        {/* porch roof so no sky leaks over the vestibule */}
        <mesh rotation-x={Math.PI / 2} position={[0, CONCOURSE.wallH, CONCOURSE.z0 - 4]}>
          <planeGeometry args={[20, 8]} />
          <meshStandardMaterial color={'#1d1712'} side={DoubleSide} roughness={0.95} />
        </mesh>
      </group>

      {/* coffered timber ceiling on the hall — beams both ways, not a bare plane */}
      <mesh rotation-x={Math.PI / 2} position={[concourseCX, CONCOURSE.wallH, concourseCZ]}>
        <planeGeometry args={[concourseW, concourseL]} />
        <meshStandardMaterial map={woodTex} color={'#2b211a'} side={DoubleSide} roughness={0.95} />
      </mesh>
      {/* longitudinal beams */}
      {[-12, 0, 12].map((x) => (
        <mesh key={`lx${x}`} position={[x, CONCOURSE.wallH - 0.45, concourseCZ]} material={MAT.teakDark()}>
          <boxGeometry args={[0.6, 0.7, concourseL - 1]} />
        </mesh>
      ))}
      {/* cross beams */}
      {[-32, -24, -16, -8].map((z) => (
        <mesh key={`cz${z}`} position={[concourseCX, CONCOURSE.wallH - 0.4, z]} material={MAT.woodWarm()}>
          <boxGeometry args={[concourseW - 1, 0.55, 0.6]} />
        </mesh>
      ))}

      {/* =================== PLATFORMS + TRACK BEDS =================== */}
      {platforms().map((p) => (
        <group key={p.index}>
          {/* platform walkway (narrow island) */}
          <mesh rotation-x={-Math.PI / 2} position={[p.platformX, 0.002, midZ]} receiveShadow>
            <planeGeometry args={[PLAT_W, PLAT_LEN]} />
            <meshStandardMaterial map={platTex} color={palette.stoneFloorWarm} roughness={0.82} />
          </mesh>
          {/* warm tactile safety strip set in from the door edge */}
          <mesh rotation-x={-Math.PI / 2} position={[p.eastX - 0.5, 0.02, midZ]}>
            <planeGeometry args={[0.22, PLAT_LEN - 4]} />
            <meshStandardMaterial color={'#e7b94a'} emissive={'#7a5a10'} emissiveIntensity={0.45} roughness={0.6} />
          </mesh>
          {/* recessed track bed (ballast-dark) */}
          <mesh rotation-x={-Math.PI / 2} position={[p.trackX, TRACK_BED_Y, midZ]} receiveShadow>
            <planeGeometry args={[TRACK_W, PLAT_LEN]} />
            <meshStandardMaterial color={'#3a3530'} roughness={0.95} />
          </mesh>
          {/* two steel rails */}
          {[-0.7, 0.7].map((dx) => (
            <mesh key={dx} position={[p.trackX + dx, TRACK_BED_Y + 0.12, midZ]} material={MAT.steel()}>
              <boxGeometry args={[0.12, 0.16, PLAT_LEN]} />
            </mesh>
          ))}
          {/* platform edge stone lip (both long sides) */}
          {[p.eastX - 0.1, p.westX + 0.1].map((ex, k) => (
            <mesh key={k} position={[ex, 0.12, midZ]} material={MAT.stoneWarm()}>
              <boxGeometry args={[0.3, 0.36, PLAT_LEN]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* sleepers under each track (instanced — one draw call for all beds) */}
      <InstancedShape items={sleeperItems()} color={'#241c14'} roughness={0.95} castShadow={false} receiveShadow>
        <boxGeometry args={[TRACK_W - 0.6, 0.12, 0.4]} />
      </InstancedShape>

      {/* =================== TRAINSHED SHELL =================== */}
      {/* low brick spandrel walls each side, to the canopy spring line */}
      {[shed.westX, shed.eastX].map((x) => (
        <mesh key={x} position={[x, 4.5, midZ]} receiveShadow material={MAT.oxblood()}>
          <boxGeometry args={[0.6, 9, PLAT_LEN]} />
        </mesh>
      ))}
      {/* UPPER side walls (brick) from the spandrel top up under the eaves — these
          close the long sides so no sky leaks above the wall between the columns */}
      {[shed.westX, shed.eastX].map((x) => (
        <mesh key={`up${x}`} position={[x, 12, midZ]} receiveShadow material={MAT.brickDark()}>
          <boxGeometry args={[0.6, 7, PLAT_LEN]} />
        </mesh>
      ))}

      {/* cast-iron colonnade */}
      <InstancedShape items={columnItems} color={palette.iron.getStyle()} metalness={0.55} roughness={0.5} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.42, 1, 10]} />
      </InstancedShape>
      <InstancedShape items={capitalItems} color={palette.brassDark.getStyle()} metalness={0.6} roughness={0.45} castShadow>
        <cylinderGeometry args={[0.55, 0.46, 0.4, 10]} />
      </InstancedShape>

      {/* =================== THE CEILING (truss + arch + skylight) =================== */}
      {/* longitudinal top chords */}
      <InstancedShape items={chordItems} color={palette.iron.getStyle()} metalness={0.6} roughness={0.5} castShadow>
        <boxGeometry args={[0.4, 0.5, 1]} />
      </InstancedShape>
      {/* timber tie-beams across the shed */}
      <InstancedShape items={tieItems} color={palette.teakDark.getStyle()} roughness={0.8} castShadow>
        <boxGeometry args={[1, 0.42, 0.5]} />
      </InstancedShape>
      {/* sloped iron rafters forming the gable */}
      <InstancedShape items={rafterItems} color={palette.iron.getStyle()} metalness={0.6} roughness={0.5} castShadow>
        <boxGeometry args={[1, 0.34, 0.34]} />
      </InstancedShape>
      {/* king-post finials at each apex */}
      <InstancedShape items={finialItems} color={palette.brass.getStyle()} metalness={0.6} roughness={0.4}>
        <coneGeometry args={[0.3, 1.1, 8]} />
      </InstancedShape>

      {/* SOLID dark roof — two slate slopes meeting at the ridge, fully closing
          the shed so NO sky shows through the trusses. Opaque + depthWrite, and
          oversized so the eaves overhang the walls with no daylight gaps. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[shed.cx + (s * shed.width) / 4.0, CANOPY_H + 0.35, midZ]} rotation-x={-Math.PI / 2} rotation-z={s * 0.34} receiveShadow>
          <planeGeometry args={[shed.width / 1.9, PLAT_LEN + 2]} />
          <meshStandardMaterial color={'#241f26'} roughness={0.92} metalness={0.1} side={DoubleSide} />
        </mesh>
      ))}
      {/* ridge cap board along the apex */}
      <mesh position={[shed.cx, CANOPY_H + 1.7, midZ]}>
        <boxGeometry args={[0.5, 0.4, PLAT_LEN + 2]} />
        <meshStandardMaterial color={'#1c181f'} roughness={0.9} />
      </mesh>
      {/* gable end walls — tall enough to fully close the clerestory STEP where
          the lower concourse roof meets the taller shed roof (kills the open slot
          of sky between hall and shed) and the triangle under the roof at the ends */}
      {[PLAT_Z0 - 0.1, PLAT_Z1 + 0.1].map((z) => (
        <mesh key={z} position={[shed.cx, CANOPY_H - 1, z]} receiveShadow material={MAT.brickDark()}>
          <boxGeometry args={[shed.width + 0.4, 9, 0.4]} />
        </mesh>
      ))}
      {/* fill walls below the south gable — bridging concourse-to-shed width step
          so no sky leaks through the east/west side gaps */}
      {[
        { x: (CONCOURSE.maxX + shed.eastX) / 2, w: shed.eastX - CONCOURSE.maxX },
        { x: (shed.westX + CONCOURSE.minX) / 2, w: CONCOURSE.minX - shed.westX },
      ].map((seg, i) => (
        <mesh key={`gfill${i}`} position={[seg.x, (CANOPY_H - 1) / 2, PLAT_Z0 - 0.1]}
              receiveShadow material={MAT.brickDark()}>
          <boxGeometry args={[seg.w, CANOPY_H - 1, 0.4]} />
        </mesh>
      ))}
      {/* thin glazed clerestory mullions reading as roof ribs on the underside */}
      <InstancedShape items={mullionItems} color={palette.iron.getStyle()} metalness={0.5} roughness={0.6}>
        <boxGeometry args={[1, 0.18, 0.18]} />
      </InstancedShape>

      {/* suspended pendant lamps down the shed centre */}
      <InstancedShape items={pendantRodItems} color={palette.iron.getStyle()} metalness={0.7} roughness={0.4}>
        <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
      </InstancedShape>
      <InstancedShape items={pendantShadeItems} color={palette.brassDark.getStyle()} metalness={0.7} roughness={0.4} castShadow>
        <coneGeometry args={[0.7, 0.6, 12]} />
      </InstancedShape>
      <InstancedShape items={pendantGlowItems} color={'#241a0e'} emissive={glow.lanternCore.getStyle()} emissiveIntensity={2.2}>
        <sphereGeometry args={[0.32, 10, 8]} />
      </InstancedShape>

      {/* decorative carved valance along the platform-mouth end of the canopy */}
      <mesh position={[shed.cx, CANOPY_H - 2.2, PLAT_Z0 + 0.4]} material={MAT.woodWarm()}>
        <boxGeometry args={[shed.width - 1, 1.3, 0.25]} />
      </mesh>

      {/* =================== GROUND + TUNNEL =================== */}
      {/* massive ground plane beneath everything — stops the floating look */}
      <mesh rotation-x={-Math.PI / 2} position={[0, TRACK_BED_Y - 0.5, 20]} receiveShadow>
        <planeGeometry args={[200, 260]} />
        <meshStandardMaterial color={'#2a2520'} roughness={0.95} />
      </mesh>

      {/* concourse-to-platform connecting ground (fill the gap at z=0) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, TRACK_BED_Y - 0.5, -20]} receiveShadow>
        <planeGeometry args={[120, 50]} />
        <meshStandardMaterial color={'#2a2520'} roughness={0.95} />
      </mesh>

      {/* The north end (tunnel mouth, splitting tracks, signals) is owned by
          <TunnelJunction /> so the platform throats open into a real lit tunnel
          rather than a flat painted gable. */}

      {/* brick retaining walls along the west and east sides — exterior massing so
          the shed reads as built into the ground, not floating on a slab */}
      {[shed.westX - 1.5, shed.eastX + 1.5].map((x) => (
        <mesh key={x} position={[x, 2, midZ]} receiveShadow material={MAT.brickDark()}>
          <boxGeometry args={[2, 4, PLAT_LEN]} />
        </mesh>
      ))}
    </group>
  )
}

/** The enamel "Platform 9¾ — King's Cross" roundel mounted over the entrance
 *  arch: a London-Underground-style cream-on-oxblood target. Drawn once into a
 *  CanvasTexture (cheap, crisp, no glow). */
function makeBarrierSign() {
  const s = 256
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1b1f24'
  ctx.fillRect(0, 0, s, s)
  // oxblood ring
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2)
  ctx.fillStyle = '#6e2f2c'
  ctx.fill()
  // cream centre bar
  ctx.fillStyle = '#efe2c2'
  ctx.fillRect(0, s * 0.4, s, s * 0.2)
  // text
  ctx.fillStyle = '#1b1f24'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(s * 0.16)}px Georgia, serif`
  ctx.fillText('PLATFORM', s / 2, s * 0.5)
  ctx.fillStyle = '#efe2c2'
  ctx.font = `bold ${Math.round(s * 0.34)}px Georgia, serif`
  ctx.fillText('9¾', s / 2, s * 0.2)
  ctx.font = `bold ${Math.round(s * 0.1)}px Georgia, serif`
  ctx.fillText("KING'S CROSS", s / 2, s * 0.78)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Instanced sleeper transforms beneath every platform's track bed. */
function sleeperItems(): ShapeItem[] {
  const out: ShapeItem[] = []
  const n = 26
  for (const p of platforms()) {
    for (let i = 0; i < n; i++) {
      const z = PLAT_Z0 + 1 + (i / (n - 1)) * (PLAT_LEN - 2)
      out.push({ pos: [p.trackX, TRACK_BED_Y + 0.04, z] })
    }
  }
  return out
}
