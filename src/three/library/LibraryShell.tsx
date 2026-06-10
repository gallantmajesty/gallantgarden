import { useMemo } from 'react'
import { DoubleSide, type Texture } from 'three'
import { HALL, WINDOW, windowStep, windowZs } from './layout'
import { balconyPlatforms, columns, staircases } from './furniture'
import { makePlasterTexture, makeStainedGlassTexture, makeWoodTexture } from './textures'
import { InstancedBoxes, type BoxItem } from './Instanced'

const STONE = '#9c8158' // warmer honey-stone (was a washed-out cream)
const STONE_DARK = '#6f5a39'
const TRIM = '#5a3f26'
const CEIL = '#23170d'

/**
 * The cathedral-scale shell: floor, beamed ceiling, two long window-walls (sill +
 * lintel + mullions so the gaps are the windows), end walls with a fireplace,
 * balcony-supporting columns, a walkable upper-floor ring with railings, two
 * grand staircases, and big arched glass. All procedural.
 */
export function LibraryShell() {
  const wood = useMemo(() => makeWoodTexture(14, 7), [])
  const balconyWood = useMemo(() => makeWoodTexture(10, 13), [])
  const plaster = useMemo(() => makePlasterTexture(4, 19), [])
  const glass = useMemo(() => makeStainedGlassTexture(5), [])
  const { halfW, halfL, wallH, balconyY, balconyDepth } = HALL
  const zs = useMemo(() => windowZs(), [])
  const step = windowStep()

  const mullionZs = useMemo(() => {
    const out: number[] = []
    for (let i = 0; i <= WINDOW.bayCount; i++) out.push(-((halfL * 2 - 8) / 2) + i * step)
    return out
  }, [halfL, step])

  const cols = useMemo(() => columns(), [])
  const stairs = useMemo(() => staircases(), [])
  const platforms = useMemo(() => balconyPlatforms(), [])

  const beamZs = useMemo(() => {
    const out: number[] = []
    for (let z = -halfL + 4; z <= halfL - 4; z += 5) out.push(z)
    return out
  }, [halfL])

  // balcony balusters along the inner edges
  const balusters = useMemo<BoxItem[]>(() => {
    const items: BoxItem[] = []
    const innerX = halfW - balconyDepth
    for (let z = -halfL + 1; z <= halfL - 1; z += 0.7) {
      items.push({ pos: [innerX, balconyY + 0.6, z], size: [0.1, 1.2, 0.1] })
      items.push({ pos: [-innerX, balconyY + 0.6, z], size: [0.1, 1.2, 0.1] })
    }
    const innerZ = halfL - balconyDepth
    for (let x = -halfW + 1; x <= halfW - 1; x += 0.7) {
      items.push({ pos: [x, balconyY + 0.6, innerZ], size: [0.1, 1.2, 0.1] })
      items.push({ pos: [x, balconyY + 0.6, -innerZ], size: [0.1, 1.2, 0.1] })
    }
    return items
  }, [halfW, halfL, balconyY, balconyDepth])

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial map={wood} roughness={0.7} metalness={0.04} />
      </mesh>

      {/* ceiling + beams */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallH, 0]}>
        <planeGeometry args={[halfW * 2, halfL * 2]} />
        <meshStandardMaterial color={CEIL} roughness={1} side={DoubleSide} />
      </mesh>
      {beamZs.map((z) => (
        <mesh key={`beam-${z}`} position={[0, wallH - 0.4, z]} castShadow>
          <boxGeometry args={[halfW * 2 - 0.5, 0.6, 0.6]} />
          <meshStandardMaterial color={TRIM} roughness={0.9} />
        </mesh>
      ))}

      {/* end walls */}
      {[-1, 1].map((s) => (
        <mesh key={`end-${s}`} position={[0, wallH / 2, s * (halfL + 0.3)]} receiveShadow>
          <boxGeometry args={[halfW * 2 + 1.2, wallH, 0.6]} />
          <meshStandardMaterial map={plaster} color={STONE} roughness={1} />
        </mesh>
      ))}

      {/* long window-walls */}
      {[-1, 1].map((s) => {
        const x = s * (halfW + 0.3)
        return (
          <group key={`wall-${s}`}>
            <mesh position={[x, WINDOW.sillY / 2, 0]} receiveShadow>
              <boxGeometry args={[0.6, WINDOW.sillY, halfL * 2]} />
              <meshStandardMaterial map={plaster} color={STONE} roughness={1} />
            </mesh>
            <mesh position={[x, (WINDOW.headY + wallH) / 2, 0]} receiveShadow>
              <boxGeometry args={[0.6, wallH - WINDOW.headY, halfL * 2]} />
              <meshStandardMaterial map={plaster} color={STONE} roughness={1} />
            </mesh>
            {mullionZs.map((z) => (
              <mesh key={`mul-${s}-${z}`} position={[x, (WINDOW.sillY + WINDOW.headY) / 2, z]}>
                <boxGeometry args={[0.55, WINDOW.headY - WINDOW.sillY, 0.5]} />
                <meshStandardMaterial color={STONE_DARK} roughness={1} />
              </mesh>
            ))}
            {/* grand gothic window bays */}
            {zs.map((z) => {
              const R = step / 2 - 0.25
              const midY = (WINDOW.sillY + WINDOW.headY) / 2
              const h = WINDOW.headY - WINDOW.sillY
              const transomY = WINDOW.sillY + h * 0.62
              return (
                <group key={`win-${s}-${z}`}>
                  {/* stained glass (main panel, slightly inset toward the room) */}
                  <mesh position={[x - s * 0.04, midY, z]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[step - 0.7, h]} />
                    <meshStandardMaterial map={glass} emissiveMap={glass} emissive="#ffffff" emissiveIntensity={0.5} transparent opacity={0.92} roughness={0.4} metalness={0.1} side={DoubleSide} />
                  </mesh>
                  {/* stone tracery: sill ledge, transom bar, centre muntin */}
                  <mesh position={[x, WINDOW.sillY + 0.06, z]}>
                    <boxGeometry args={[0.85, 0.2, step - 0.2]} />
                    <meshStandardMaterial color={STONE} roughness={1} />
                  </mesh>
                  <mesh position={[x, transomY, z]}>
                    <boxGeometry args={[0.62, 0.16, step - 0.5]} />
                    <meshStandardMaterial color={STONE_DARK} roughness={1} />
                  </mesh>
                  <mesh position={[x, midY, z]}>
                    <boxGeometry args={[0.6, h, 0.16]} />
                    <meshStandardMaterial color={STONE_DARK} roughness={1} />
                  </mesh>
                  {/* molded arch (outer + inner) with a keystone */}
                  <mesh position={[x, WINDOW.headY, z]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[R + 0.4, R + 0.4, 0.64, 20, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color={STONE_DARK} roughness={1} side={DoubleSide} />
                  </mesh>
                  <mesh position={[x - s * 0.06, WINDOW.headY, z]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[R, R, 0.68, 20, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color={STONE} roughness={1} side={DoubleSide} />
                  </mesh>
                  <mesh position={[x, WINDOW.headY + R - 0.1, z]}>
                    <boxGeometry args={[0.8, 0.8, 0.6]} />
                    <meshStandardMaterial color={STONE} roughness={0.95} />
                  </mesh>
                  {/* glowing apex roundel (a magical oculus) */}
                  <mesh position={[x - s * 0.05, WINDOW.headY + R * 0.45, z]} rotation={[0, Math.PI / 2, 0]}>
                    <circleGeometry args={[0.5, 18]} />
                    <meshStandardMaterial color="#ffe6b0" emissive="#ffce8a" emissiveIntensity={1.1} side={DoubleSide} />
                  </mesh>
                  <mesh position={[x, WINDOW.headY + R * 0.45, z]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.52, 0.08, 8, 20]} />
                    <meshStandardMaterial color={STONE_DARK} roughness={1} />
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      })}

      {/* columns — carved magical pillars: plinth, fluted shaft, glowing rune
          band and a capital, firmly rooted floor → balcony */}
      {cols.map((c, i) => (
        <Pillar key={`col-${i}`} x={c[0]} z={c[2]} h={wallH} />
      ))}

      {/* balcony platforms + rails */}
      {platforms.map((pf, i) => (
        <mesh key={`plat-${i}`} position={pf.pos} receiveShadow castShadow>
          <boxGeometry args={pf.size} />
          <meshStandardMaterial map={balconyWood} color="#b89058" roughness={0.8} />
        </mesh>
      ))}
      {/* top rails */}
      {[-1, 1].map((s) => (
        <mesh key={`railx-${s}`} position={[s * (halfW - balconyDepth), balconyY + 1.25, 0]}>
          <boxGeometry args={[0.18, 0.18, halfL * 2 - 1]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`railz-${s}`} position={[0, balconyY + 1.25, s * (halfL - balconyDepth)]}>
          <boxGeometry args={[halfW * 2 - 1, 0.18, 0.18]} />
          <meshStandardMaterial color={TRIM} roughness={0.7} />
        </mesh>
      ))}
      <InstancedBoxes items={balusters} color={STONE_DARK} roughness={0.8} castShadow />

      {/* grand staircases with stringers, carved banisters, newels & lanterns */}
      {stairs.map((sc) => (
        <GrandStaircase key={`stair-${sc.side}`} steps={sc.steps} wood={balconyWood} />
      ))}

      {/* fireplace on the far wall */}
      <group position={[0, 0, -halfL + 0.4]}>
        <mesh position={[0, 2, 0]} castShadow>
          <boxGeometry args={[6, 4, 1.2]} />
          <meshStandardMaterial color="#5b5048" roughness={1} />
        </mesh>
        <mesh position={[0, 1.2, 0.3]}>
          <boxGeometry args={[3.4, 2.2, 0.8]} />
          <meshStandardMaterial color="#0c0907" roughness={1} />
        </mesh>
        {/* embers (glow via bloom) */}
        <mesh position={[0, 0.5, 0.6]}>
          <boxGeometry args={[2.6, 0.5, 0.5]} />
          <meshStandardMaterial color="#ff7a2a" emissive="#ff7a2a" emissiveIntensity={2.6} />
        </mesh>
        <pointLight position={[0, 1.2, 1.2]} intensity={9} distance={14} decay={2} color="#ff8a3a" />
      </group>
    </group>
  )
}

/** A grand staircase: its steps plus sloped wooden stringers, carved banisters
 *  with balusters, newel posts and a warm lantern at the foot & head. */
function GrandStaircase({ steps, wood }: { steps: { pos: [number, number, number]; size: [number, number, number] }[]; wood: Texture }) {
  const first = steps[0]
  const last = steps[steps.length - 1]
  const x = first.pos[0]
  const halfW = first.size[0] / 2
  const zB = first.pos[2] // bottom (high z)
  const yB = first.pos[1]
  const zT = last.pos[2] // top (low z)
  const yT = last.pos[1]
  const dz = zB - zT
  const dy = yT - yB
  const len = Math.hypot(dz, dy)
  const angle = Math.atan2(dy, dz)
  const midZ = (zB + zT) / 2
  const railY = (yB + yT) / 2 + 1.05

  const baluster: { z: number; y: number }[] = []
  const nB = 10
  for (let i = 1; i < nB; i++) {
    const f = i / nB
    baluster.push({ z: zB - dz * f, y: yB + dy * f + 0.55 })
  }

  return (
    <group>
      {/* steps */}
      {steps.map((stp, i) => (
        <mesh key={i} position={stp.pos} castShadow receiveShadow>
          <boxGeometry args={stp.size} />
          <meshStandardMaterial map={wood} color="#a9803f" roughness={0.8} />
        </mesh>
      ))}
      {/* sloped stringers + handrails + balusters + newels on both sides */}
      {[-1, 1].map((sx) => {
        const rx = x + sx * (halfW - 0.12)
        return (
          <group key={sx}>
            {/* carved stringer board */}
            <mesh position={[rx, (yB + yT) / 2 - 0.1, midZ]} rotation={[angle, 0, 0]} castShadow>
              <boxGeometry args={[0.22, 0.7, len + 0.6]} />
              <meshStandardMaterial color="#6b4a25" roughness={0.85} />
            </mesh>
            {/* handrail */}
            <mesh position={[rx, railY, midZ]} rotation={[angle, 0, 0]} castShadow>
              <boxGeometry args={[0.16, 0.16, len + 0.4]} />
              <meshStandardMaterial color="#7a5230" roughness={0.6} metalness={0.1} />
            </mesh>
            {/* balusters */}
            {baluster.map((b, i) => (
              <mesh key={i} position={[rx, b.y, b.z]} castShadow>
                <boxGeometry args={[0.07, 1.0, 0.07]} />
                <meshStandardMaterial color="#5a3d22" roughness={0.85} />
              </mesh>
            ))}
            {/* newel posts at foot & head, each crowned with a lantern */}
            {[
              { z: zB, y: yB },
              { z: zT, y: yT },
            ].map((p, i) => (
              <group key={i} position={[rx, p.y, p.z]}>
                <mesh position={[0, 0.7, 0]} castShadow>
                  <boxGeometry args={[0.22, 1.4, 0.22]} />
                  <meshStandardMaterial color="#5a3d22" roughness={0.85} />
                </mesh>
                <mesh position={[0, 1.55, 0]}>
                  <sphereGeometry args={[0.16, 12, 12]} />
                  <meshStandardMaterial color="#fff0c8" emissive="#ffb24a" emissiveIntensity={1.9} />
                </mesh>
              </group>
            ))}
          </group>
        )
      })}
    </group>
  )
}

/** A carved magical pillar: stepped plinth, gently tapered fluted shaft, a band
 *  of softly glowing runes at eye level, and a flared capital under the balcony.
 *  Rooted firmly on the floor so it never reads as "hanging". */
function Pillar({ x, z, h }: { x: number; z: number; h: number }) {
  const shaftH = h - 1.6
  return (
    <group position={[x, 0, z]}>
      {/* plinth */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.6, 1.7]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.4, 0.3, 1.4]} />
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </mesh>
      {/* fluted shaft */}
      <mesh position={[0, 0.9 + shaftH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.66, shaftH, 24, 1]} />
        <meshStandardMaterial color={STONE} roughness={0.8} />
      </mesh>
      {/* carved astragal moldings (base & neck rings) */}
      {[1.4, h - 1.9].map((ry, k) => (
        <mesh key={k} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.66, 0.09, 8, 24]} />
          <meshStandardMaterial color={STONE_DARK} roughness={0.85} />
        </mesh>
      ))}
      {/* glowing rune band at eye level */}
      <mesh position={[0, 4.6, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.7, 24, 1, true]} />
        <meshStandardMaterial color="#5a4a8a" emissive="#8a6cff" emissiveIntensity={0.85} roughness={0.5} side={DoubleSide} />
      </mesh>
      {/* magical accent ring framing the runes */}
      {[4.25, 4.95].map((ry, k) => (
        <mesh key={`r-${k}`} position={[0, ry, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.61, 0.05, 8, 24]} />
          <meshStandardMaterial color="#caa84a" metalness={0.6} roughness={0.35} emissive="#3a2c10" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* capital */}
      <mesh position={[0, h - 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.78, 0.5, 0.8, 24]} />
        <meshStandardMaterial color={STONE} roughness={0.85} />
      </mesh>
      <mesh position={[0, h - 0.2, 0]} castShadow>
        <boxGeometry args={[1.5, 0.4, 1.5]} />
        <meshStandardMaterial color={STONE_DARK} roughness={0.9} />
      </mesh>
    </group>
  )
}
