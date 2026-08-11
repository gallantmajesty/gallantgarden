import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { HALL } from './layout'
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

    return { chandBulbs, chandRods, chandRings, potBodies, potRims, trunks, fronds, bannerRods, bannerCloths, bannerTails }
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

      {/* grand "FOCUS LILY" house banners hanging from the balcony — rod, cloth
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

      {/* ── great clock gallery wall on the near end ── */}
      <group position={[0, 13, halfL - 0.05]} rotation={[0, Math.PI, 0]}>
        {/* ornate outer frame ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.0, 0.12, 12, 48]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* decorative inner bevel */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.7, 0.06, 8, 48]} />
          <meshStandardMaterial color="#b8942e" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* clock face */}
        <mesh position={[0, 0, 0.12]}>
          <circleGeometry args={[1.6, 48]} />
          <meshStandardMaterial color="#f6e8c8" roughness={0.8} />
        </mesh>
        {/* 12 hour markers — gold dots around the face */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2
          const r = 1.38
          return (
            <mesh key={`hm${i}`} position={[Math.cos(a) * r, Math.sin(a) * r, 0.16]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.3} />
            </mesh>
          )
        })}
        {/* ornate hour hand — tapered with arrow tip */}
        <group position={[0, 0, 0.16]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.08, 0.9, 0.04]} />
            <meshStandardMaterial color="#2a1c10" />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <coneGeometry args={[0.06, 0.18, 4]} />
            <meshStandardMaterial color="#2a1c10" />
          </mesh>
        </group>
        {/* minute hand — slimmer */}
        <group position={[0, 0, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.05, 0.65, 0.03]} />
            <meshStandardMaterial color="#2a1c10" />
          </mesh>
          <mesh position={[0, 0.58, 0]}>
            <coneGeometry args={[0.04, 0.12, 4]} />
            <meshStandardMaterial color="#2a1c10" />
          </mesh>
        </group>
        {/* center cap */}
        <mesh position={[0, 0, 0.18]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* decorative crown above clock */}
        <mesh position={[0, 2.2, 0.05]}>
          <coneGeometry args={[0.3, 0.4, 5]} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[-0.25, 2.0, 0.05]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0.25, 2.0, 0.05]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
        </mesh>
        {/* pendulum below */}
        <mesh position={[0, -2.0, 0.08]}>
          <cylinderGeometry args={[0.02, 0.02, 1.8, 6]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, -2.95, 0.08]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
        </mesh>
      </group>

      {/* ── left astrolabe — concentric rings + cross ── */}
      <group position={[-5.5, 13, halfL - 0.08]} rotation={[0, Math.PI, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.06, 8, 32]} />
          <meshStandardMaterial color={GOLD} metalness={0.65} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.04, 8, 32]} />
          <meshStandardMaterial color="#b8942e" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.03, 8, 24]} />
          <meshStandardMaterial color="#8a6c20" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* cross hairs */}
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2.0, 0.03, 0.02]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.03, 2.0, 0.02]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* pointer needle */}
        <mesh position={[0, 0, 0.04]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.04, 0.9, 0.02]} />
          <meshStandardMaterial color="#c03030" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* degree dots around outer ring */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={`ad${i}`} position={[Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.03]}>
              <sphereGeometry args={[0.03, 6, 6]} />
              <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
            </mesh>
          )
        })}
      </group>

      {/* ── right astrolabe ── */}
      <group position={[5.5, 13, halfL - 0.08]} rotation={[0, Math.PI, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.0, 0.06, 8, 32]} />
          <meshStandardMaterial color={GOLD} metalness={0.65} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.04, 8, 32]} />
          <meshStandardMaterial color="#b8942e" metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.03, 8, 24]} />
          <meshStandardMaterial color="#8a6c20" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2.0, 0.03, 0.02]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.03, 2.0, 0.02]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.04]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.04, 0.9, 0.02]} />
          <meshStandardMaterial color="#c03030" metalness={0.3} roughness={0.5} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={`ad${i}`} position={[Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0.03]}>
              <sphereGeometry args={[0.03, 6, 6]} />
              <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
            </mesh>
          )
        })}
      </group>

      {/* ── left star chart (framed rectangle) ── */}
      <group position={[-9.5, 14.5, halfL - 0.06]} rotation={[0, Math.PI, 0]}>
        {/* frame */}
        <mesh>
          <boxGeometry args={[2.6, 3.4, 0.12]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* chart surface */}
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[2.2, 3.0]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
        </mesh>
        {/* star dots */}
        {[
          [-0.6, 1.0], [0.3, 0.8], [-0.2, 0.3], [0.7, 0.1], [-0.8, -0.2],
          [0.1, -0.6], [-0.5, -1.0], [0.6, -0.8], [-0.3, -1.2], [0.4, 1.2],
          [-0.9, 0.5], [0.8, -0.3], [-0.1, 0.9], [0.5, -1.1], [-0.7, -0.5],
        ].map(([x, y], i) => (
          <mesh key={`sc${i}`} position={[x * 0.9, y * 0.9, 0.09]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={0.8} />
          </mesh>
        ))}
        {/* constellation lines */}
        <mesh position={[-0.15, 0.6, 0.09]}>
          <boxGeometry args={[0.015, 0.5, 0.01]} />
          <meshStandardMaterial color="#4a4a6a" />
        </mesh>
        <mesh position={[0.25, -0.1, 0.09]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.015, 0.7, 0.01]} />
          <meshStandardMaterial color="#4a4a6a" />
        </mesh>
      </group>

      {/* ── right star chart ── */}
      <group position={[9.5, 14.5, halfL - 0.06]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <boxGeometry args={[2.6, 3.4, 0.12]} />
          <meshStandardMaterial color="#5a4020" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[2.2, 3.0]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
        </mesh>
        {[
          [0.5, 1.1], [-0.4, 0.7], [0.1, 0.4], [-0.7, 0.0], [0.3, -0.3],
          [-0.2, -0.7], [0.6, -1.0], [-0.6, -0.9], [0.0, -1.3], [-0.5, 1.3],
          [0.8, 0.4], [-0.8, -0.4], [0.2, 0.8], [-0.3, -1.0], [0.7, -0.6],
        ].map(([x, y], i) => (
          <mesh key={`sc${i}`} position={[x * 0.9, y * 0.9, 0.09]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={0.8} />
          </mesh>
        ))}
        <mesh position={[0.1, 0.5, 0.09]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.015, 0.6, 0.01]} />
          <meshStandardMaterial color="#4a4a6a" />
        </mesh>
        <mesh position={[-0.2, -0.2, 0.09]} rotation={[0, 0, 0.8]}>
          <boxGeometry args={[0.015, 0.5, 0.01]} />
          <meshStandardMaterial color="#4a4a6a" />
        </mesh>
      </group>

      {/* ── decorative scrollwork connecting elements ── */}
      {/* left scroll */}
      <mesh position={[-3.2, 13, halfL - 0.06]} rotation={[0, Math.PI, 0]}>
        <torusGeometry args={[0.4, 0.025, 6, 16, Math.PI]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* right scroll */}
      <mesh position={[3.2, 13, halfL - 0.06]} rotation={[0, Math.PI, 0]}>
        <torusGeometry args={[0.4, 0.025, 6, 16, Math.PI]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* horizontal connecting bars */}
      <mesh position={[-3.0, 13, halfL - 0.06]}>
        <boxGeometry args={[2.0, 0.04, 0.03]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[3.0, 13, halfL - 0.06]}>
        <boxGeometry args={[2.0, 0.04, 0.03]} />
        <meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.35} />
      </mesh>

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
