import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { HALL, windowZs } from './layout'
import { readingCorners } from './furniture'
import { makeBannerTexture } from './textures'
import { InstancedShape, type ShapeItem } from './Instanced'

const GOLD = '#caa84a'

/** Hanging lamps, plants, reading corners, banners, a great clock, rugs and a
 *  few elegant glowing crystals — the handcrafted clutter that fills the hall.
 *
 *  PERFORMANCE: the repeated dressing (chandelier bulbs/rods/rings, potted-tree
 *  fronds & pots, wall sconces, banner rods/cloth/tails) used to be hundreds of
 *  individual meshes. Each repeated set is now a single instanced draw; only the
 *  genuinely unique pieces (reading corners, clock, rugs, crystals) stay as
 *  one-off meshes. */
export function Decor() {
  const { halfW, halfL, wallH, balconyY } = HALL
  const corners = useMemo(() => readingCorners(), [])
  const banner = useMemo(() => makeBannerTexture(), [])

  const chandPositions = useMemo<[number, number][]>(
    () => [
      [-9.5, -16],
      [9.5, -16],
      [-9.5, 16],
      [9.5, 16],
    ],
    [],
  )

  // ---- instanced dressing batches ----
  const instanced = useMemo(() => {
    const chandBulbs: ShapeItem[] = []
    const chandRods: ShapeItem[] = []
    const chandRings: ShapeItem[] = []
    const potBodies: ShapeItem[] = []
    const potRims: ShapeItem[] = []
    const trunks: ShapeItem[] = []
    const fronds: ShapeItem[] = []
    const sconceCores: ShapeItem[] = []
    const sconceArms: ShapeItem[] = []
    const bannerRods: ShapeItem[] = []
    const bannerCloths: ShapeItem[] = []
    const bannerTails: ShapeItem[] = []

    // chandeliers over the two table aisles (avoiding the central tree)
    for (const [x, z] of chandPositions) {
      const cy = wallH - 3
      chandRods.push({ pos: [x, cy + 1.8, z] })
      chandRings.push({ pos: [x, cy, z], rot: [Math.PI / 2, 0, 0] })
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        chandBulbs.push({ pos: [x + Math.cos(a) * 0.95, cy + 0.12, z + Math.sin(a) * 0.95] })
      }
    }

    // corner potted trees — terracotta pot + rim, a short trunk, and a full
    // leafy canopy built from two evenly-spaced rings of outward-leaning fronds
    // plus an upright crown (was a single spiky ring that read as a starburst).
    for (const [x, z] of [
      [-halfW + 1.6, -halfL + 2],
      [halfW - 1.6, -halfL + 2],
      [-halfW + 1.6, halfL - 2],
      [halfW - 1.6, halfL - 2],
    ]) {
      potBodies.push({ pos: [x, 0.5, z] })
      potRims.push({ pos: [x, 1.02, z] })
      trunks.push({ pos: [x, 1.3, z] })
      const rings = [
        { y: 1.65, r: 0.42, n: 9, s: 0.62, lean: 0.95 },
        { y: 2.15, r: 0.3, n: 7, s: 0.5, lean: 0.6 },
      ]
      for (const ring of rings) {
        for (let k = 0; k < ring.n; k++) {
          const a = (k / ring.n) * Math.PI * 2
          fronds.push({
            pos: [x + Math.cos(a) * ring.r, ring.y, z + Math.sin(a) * ring.r],
            rot: [Math.sin(a) * ring.lean, -a, -Math.cos(a) * ring.lean],
            scale: ring.s,
            color: k % 2 ? '#2f7a3a' : '#3f9a4a',
          })
        }
      }
      fronds.push({ pos: [x, 2.55, z], rot: [0, 0, 0], scale: 0.5, color: '#3f9a4a' })
    }

    // warm wall sconces between the windows (glow via bloom, no light cost)
    windowZs().forEach((z) => {
      for (const sx of [-1, 1]) {
        const gx = sx * (halfW - 0.7)
        sconceCores.push({ pos: [gx, 5.4, z] })
        sconceArms.push({ pos: [gx + sx * 0.12, 5.1, z], rot: [0, 0, sx * 0.4] })
      }
    })

    // grand house banners hanging from the balcony
    for (const z of [-22, -8, 8, 22]) {
      for (const sx of [-1, 1]) {
        const gx = sx * (HALL.halfW - HALL.balconyDepth - 0.2)
        const gy = balconyY - 0.4
        bannerRods.push({ pos: [gx, gy + 0.2, z], rot: [0, 0, Math.PI / 2] })
        bannerCloths.push({ pos: [gx, gy - 2.4, z] })
        bannerTails.push({ pos: [gx, gy - 5.1, z], rot: [0, 0, Math.PI] })
      }
    }

    return { chandBulbs, chandRods, chandRings, potBodies, potRims, trunks, fronds, sconceCores, sconceArms, bannerRods, bannerCloths, bannerTails }
  }, [chandPositions, halfW, halfL, wallH, balconyY])

  const crystals = useMemo(
    () => [
      { pos: [-14, 4, -18], c: '#8a6cff' },
      { pos: [15, 3.4, -6], c: '#4fd1c5' },
      { pos: [-16, 5.2, 10], c: '#ff6f91' },
      { pos: [13, 4.6, 24], c: '#ffba49' },
      { pos: [0, balconyY + 3, -28], c: '#5b9bd5' },
    ],
    [balconyY],
  )

  return (
    <group>
      {/* chandelier frames + bulbs (glow via bloom — the grand lanterns supply the
          real ceiling light). Each part is one instanced draw across all four. */}
      <InstancedShape items={instanced.chandRods} color="#2a1c10">
        <cylinderGeometry args={[0.03, 0.03, 1.8, 6]} />
      </InstancedShape>
      <InstancedShape items={instanced.chandRings} color={GOLD} metalness={0.7} roughness={0.3} emissive="#3a2c10">
        <torusGeometry args={[0.95, 0.07, 8, 24]} />
      </InstancedShape>
      <InstancedShape items={instanced.chandBulbs} color="#fff2cf" emissive="#ffce7a" emissiveIntensity={2.2}>
        <sphereGeometry args={[0.1, 10, 10]} />
      </InstancedShape>

      {/* corner potted trees: pot body + flared rim + trunk + leafy fronds, each
          one instanced draw across all four corners */}
      <InstancedShape items={instanced.potBodies} color="#9c4a28" roughness={0.85}>
        <cylinderGeometry args={[0.5, 0.36, 1, 20]} />
      </InstancedShape>
      <InstancedShape items={instanced.potRims} color="#7d3a1f" roughness={0.85}>
        <cylinderGeometry args={[0.56, 0.5, 0.16, 20]} />
      </InstancedShape>
      <InstancedShape items={instanced.trunks} color="#6b4a28" roughness={0.9}>
        <cylinderGeometry args={[0.09, 0.13, 0.8, 8]} />
      </InstancedShape>
      <InstancedShape items={instanced.fronds} roughness={0.9}>
        <coneGeometry args={[0.18, 2, 5]} />
      </InstancedShape>

      {/* reading corners: armchair + floor lamp + rug (handful, kept per-corner) */}
      {corners.map((c, i) => (
        <group key={`corner-${i}`} position={c.pos} rotation={[0, c.rotY, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <planeGeometry args={[3, 3]} />
            <meshStandardMaterial color="#5a2030" roughness={1} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.1, 0.5, 1]} />
            <meshStandardMaterial color="#6b4a8a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.95, -0.45]}>
            <boxGeometry args={[1.1, 0.9, 0.2]} />
            <meshStandardMaterial color="#7a59a0" roughness={0.9} />
          </mesh>
          <group position={[1.1, 0, 0.6]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 1.8, 8]} />
              <meshStandardMaterial color="#caa84a" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 1.85, 0]}>
              <coneGeometry args={[0.28, 0.35, 16, 1, true]} />
              <meshStandardMaterial color="#e9d3a0" emissive="#ffd98a" emissiveIntensity={1.6} side={DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}

      {/* grand "STUDY GARDEN" house banners hanging from the balcony — rod, cloth
          and tail each instanced across all eight banners */}
      <InstancedShape items={instanced.bannerRods} color={GOLD} metalness={0.7} roughness={0.3}>
        <cylinderGeometry args={[0.06, 0.06, 2.1, 8]} />
      </InstancedShape>
      <InstancedShape items={instanced.bannerCloths} map={banner} emissiveMap={banner} emissive="#caa84a" emissiveIntensity={0.18} roughness={0.9} side={DoubleSide}>
        <planeGeometry args={[1.9, 5]} />
      </InstancedShape>
      <InstancedShape items={instanced.bannerTails} color="#16243c" roughness={0.9} side={DoubleSide}>
        <coneGeometry args={[0.95, 0.5, 3]} />
      </InstancedShape>

      {/* great clock on the near end wall */}
      <group position={[0, 13, halfL - 0.05]} rotation={[0, Math.PI, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.6, 1.6, 0.2, 32]} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <circleGeometry args={[1.35, 32]} />
          <meshStandardMaterial color="#f6e8c8" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.36, 0.16]}>
          <boxGeometry args={[0.07, 0.85, 0.04]} />
          <meshStandardMaterial color="#2a1c10" />
        </mesh>
        <mesh position={[0.32, 0, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.06, 0.6, 0.04]} />
          <meshStandardMaterial color="#2a1c10" />
        </mesh>
      </group>

      {/* central rug ring around the tree + side runners */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[4.6, 9, 48]} />
        <meshStandardMaterial color="#5a2030" roughness={1} side={DoubleSide} />
      </mesh>
      {[-9.5, 9.5].map((x) => (
        <mesh key={`rug-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, 0]}>
          <planeGeometry args={[3, halfL * 2 - 6]} />
          <meshStandardMaterial color="#4a2030" roughness={1} side={DoubleSide} />
        </mesh>
      ))}

      {/* sconces: glowing cores + iron arms, instanced across every window pier */}
      <InstancedShape items={instanced.sconceCores} color="#fff0c8" emissive="#ffb24a" emissiveIntensity={2}>
        <sphereGeometry args={[0.17, 10, 10]} />
      </InstancedShape>
      <InstancedShape items={instanced.sconceArms} color="#3a2c10" metalness={0.5} roughness={0.5}>
        <cylinderGeometry args={[0.04, 0.08, 0.6, 8]} />
      </InstancedShape>

      {/* elegant glowing crystals (glow via bloom; each a unique emissive hue) */}
      {crystals.map((cr, i) => (
        <mesh key={`cry-${i}`} position={cr.pos as [number, number, number]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color={cr.c} emissive={cr.c} emissiveIntensity={1.6} roughness={0.2} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
