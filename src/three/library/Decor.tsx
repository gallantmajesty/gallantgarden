import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { HALL, windowZs } from './layout'
import { readingCorners } from './furniture'
import { makeBannerTexture } from './textures'

const GOLD = '#caa84a'

/** Hanging lamps, plants, reading corners, banners, a great clock, rugs and a
 *  few elegant glowing crystals — the handcrafted clutter that fills the hall. */
export function Decor() {
  const { halfW, halfL, wallH, balconyY } = HALL
  const corners = useMemo(() => readingCorners(), [])
  const banner = useMemo(() => makeBannerTexture(), [])

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
      {/* chandeliers over the two table aisles (avoiding the central tree) */}
      {[
        [-9.5, -16],
        [9.5, -16],
        [-9.5, 16],
        [9.5, 16],
      ].map(([x, z], i) => (
        <group key={`chand-${i}`} position={[x, wallH - 3, z]}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.8, 6]} />
            <meshStandardMaterial color="#2a1c10" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.95, 0.07, 8, 24]} />
            <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} emissive="#3a2c10" />
          </mesh>
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * Math.PI * 2
            return (
              <mesh key={k} position={[Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95]}>
                <sphereGeometry args={[0.1, 10, 10]} />
                <meshStandardMaterial color="#fff2cf" emissive="#ffce7a" emissiveIntensity={2.2} />
              </mesh>
            )
          })}
          {/* glow only (bloom) — the four grand lanterns supply the real ceiling light */}
        </group>
      ))}

      {/* corner potted trees */}
      {[
        [-halfW + 1.6, -halfL + 2],
        [halfW - 1.6, -halfL + 2],
        [-halfW + 1.6, halfL - 2],
        [halfW - 1.6, halfL - 2],
      ].map(([x, z], i) => (
        <group key={`plant-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.36, 1, 16]} />
            <meshStandardMaterial color="#9c4a28" roughness={0.85} />
          </mesh>
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2
            return (
              <mesh key={k} position={[Math.cos(a) * 0.28, 1.7, Math.sin(a) * 0.28]} rotation={[0.4, a, 0]} castShadow>
                <coneGeometry args={[0.18, 2, 5]} />
                <meshStandardMaterial color={k % 2 ? '#2f7a3a' : '#3f9a4a'} roughness={0.9} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* reading corners: armchair + floor lamp + rug */}
      {corners.map((c, i) => (
        <group key={`corner-${i}`} position={c.pos} rotation={[0, c.rotY, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <planeGeometry args={[3, 3]} />
            <meshStandardMaterial color="#5a2030" roughness={1} side={DoubleSide} />
          </mesh>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.1, 0.5, 1]} />
            <meshStandardMaterial color="#6b4a8a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.95, -0.45]} castShadow>
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

      {/* grand "STUDY GARDEN" house banners hanging from the balcony */}
      {[-22, -8, 8, 22].map((z, i) =>
        [-1, 1].map((sx) => (
          <group key={`ban-${i}-${sx}`} position={[sx * (HALL.halfW - HALL.balconyDepth - 0.2), balconyY - 0.4, z]}>
            {/* gold hanging rod (spans the banner width) */}
            <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 2.1, 8]} />
              <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* banner cloth */}
            <mesh position={[0, -2.4, 0]}>
              <planeGeometry args={[1.9, 5]} />
              <meshStandardMaterial map={banner} emissiveMap={banner} emissive="#caa84a" emissiveIntensity={0.18} roughness={0.9} side={DoubleSide} />
            </mesh>
            {/* pointed tail */}
            <mesh position={[0, -5.1, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.95, 0.5, 3]} />
              <meshStandardMaterial color="#16243c" roughness={0.9} side={DoubleSide} />
            </mesh>
          </group>
        )),
      )}

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

      {/* warm wall sconces between the windows (glow via bloom, no light cost) */}
      {windowZs().map((z, i) =>
        [-1, 1].map((sx) => (
          <group key={`sconce-${i}-${sx}`} position={[sx * (HALL.halfW - 0.7), 5.4, z]}>
            <mesh>
              <sphereGeometry args={[0.17, 10, 10]} />
              <meshStandardMaterial color="#fff0c8" emissive="#ffb24a" emissiveIntensity={2} />
            </mesh>
            <mesh position={[sx * 0.12, -0.3, 0]} rotation={[0, 0, sx * 0.4]}>
              <cylinderGeometry args={[0.04, 0.08, 0.6, 8]} />
              <meshStandardMaterial color="#3a2c10" metalness={0.5} roughness={0.5} />
            </mesh>
          </group>
        )),
      )}

      {/* elegant glowing crystals (glow via bloom) */}
      {crystals.map((cr, i) => (
        <mesh key={`cry-${i}`} position={cr.pos as [number, number, number]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color={cr.c} emissive={cr.c} emissiveIntensity={1.6} roughness={0.2} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
