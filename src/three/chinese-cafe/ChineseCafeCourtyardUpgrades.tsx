import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, type MeshStandardMaterial } from 'three'
import { CAFE_PALETTE } from './materials'

/** Grand three-tier jade fountain — the pond's new centerpiece.
 *  Stone basins stacked like a pagoda with a pulsing central plume,
 *  side jets and splash rings on every tier, glowing softly at night. */
function GrandFountain() {
  const plume = useRef<Mesh>(null)
  const plumeMat = useRef<MeshStandardMaterial>(null)
  const splashRings = useRef<(Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const p = plume.current
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.15)
    if (p) {
      p.scale.set(0.8 + pulse * 0.6, 0.78 + pulse * 0.6, 0.8 + pulse * 0.6)
      p.position.y = 2.55 + pulse * 0.34
    }
    if (plumeMat.current) plumeMat.current.opacity = 0.5 + pulse * 0.28
    splashRings.current.forEach((m, i) => {
      if (!m) return
      const cyc = (t * 0.7 + i * 0.42) % 1.6
      const k = cyc / 1.6
      m.scale.setScalar(0.5 + k * 1.7)
      const mat = m.material as MeshBasicMaterial
      mat.opacity = 0.7 * Math.sin(k * Math.PI)
    })
  })

  const ring = (r: number, y: number, key: string) => (
    <mesh key={key} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.9, r, 32]} />
      <meshBasicMaterial color="#a9e6dc" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={2} />
    </mesh>
  )

  return (
    <group position={[0, 0, 2.2]}>
      {/* bottom basin — the big stone bowl */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.85, 0.62, 24]} />
        <meshStandardMaterial color="#4a4f4a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <torusGeometry args={[1.7, 0.1, 10, 36]} />
        <meshStandardMaterial color="#6d7268" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.42, 1.42, 0.12, 24]} />
        <meshPhysicalMaterial color="#1d5d50" roughness={0.12} metalness={0.05} emissive="#0d3f36" emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      {/* gold ring on the basin rim */}
      <mesh position={[0, 0.68, 0]}>
        <torusGeometry args={[1.62, 0.045, 8, 36]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.8} roughness={0.25} />
      </mesh>
      {ring(1.55, 0.56, 'ring0')}

      {/* second tier */}
      <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.15, 1.3, 0.5, 20]} />
        <meshStandardMaterial color="#555b53" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.38, 0]} castShadow>
        <torusGeometry args={[1.15, 0.08, 10, 30]} />
        <meshStandardMaterial color="#6d7268" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.1, 20]} />
        <meshPhysicalMaterial color="#1d5d50" roughness={0.12} metalness={0.05} emissive="#0d3f36" emissiveIntensity={0.5} transparent opacity={0.85} />
      </mesh>
      {ring(1.15, 1.1, 'ring1')}

      {/* top basin — where the plume erupts */}
      <mesh position={[0, 1.76, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.82, 0.42, 16]} />
        <meshStandardMaterial color="#5a6058" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.98, 0]} castShadow>
        <torusGeometry args={[0.72, 0.06, 8, 24]} />
        <meshStandardMaterial color="#6d7268" roughness={0.72} />
      </mesh>
      {/* the pulsing water plume — tall, bright, with a hot white core */}
      <mesh ref={plume} position={[0, 2.9, 0]}>
        <coneGeometry args={[0.62, 2.4, 14, 1, true]} />
        <meshStandardMaterial ref={plumeMat} color="#d8fff4" emissive="#37c2a4" emissiveIntensity={1.6} transparent opacity={0.75} depthWrite={false} side={2} />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <coneGeometry args={[0.2, 1.7, 10, 1, true]} />
        <meshBasicMaterial color="#eafffb" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* side jets spraying out of the top tier */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.85, 1.95, Math.sin(a) * 0.85]} rotation={[0, a, 0.55]}>
          <coneGeometry args={[0.06, 0.5, 8, 1, true]} />
          <meshBasicMaterial color="#c9f0e6" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
      {/* small lotus on the top water */}
      <mesh position={[0, 2.06, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#e78fa9" roughness={0.5} />
      </mesh>
      {ring(0.72, 1.74, 'ring2')}
      {/* faint glow over the whole fountain at night */}
      <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshBasicMaterial color="#2f8a78" transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#8ff0dc" intensity={12} distance={13} decay={2} />
    </group>
  )
}

/** Hexagonal lakeside pavilion (六角亭) south of the pond — six red columns,
 *  a double-curved roof with upturned eaves, and a warm lantern inside. */
function LakesidePavilion() {
  const cols = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2
    return { x: Math.cos(a) * 1.7, z: Math.sin(a) * 1.7 }
  }), [])
  const roof1 = useMemo(() => (
    <mesh position={[0, 3.15, 0]} castShadow>
      <coneGeometry args={[2.5, 1.15, 6]} />
      <meshStandardMaterial color="#7d2a22" roughness={0.5} side={2} />
    </mesh>
  ), [])
  return (
    <group position={[0, 0.28, 0.5]}>
      {/* stone deck + base */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.25, 2.35, 0.16, 6]} />
        <meshStandardMaterial color="#77766f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.05, 2.15, 0.14, 6]} />
        <meshStandardMaterial color="#8a887a" roughness={0.85} />
      </mesh>
      {/* six red columns */}
      {cols.map((c, i) => (
        <mesh key={i} position={[c.x, 1.6, c.z]} castShadow>
          <cylinderGeometry args={[0.11, 0.14, 2.7, 10]} />
          <meshStandardMaterial color="#7d2a22" roughness={0.5} />
        </mesh>
      ))}
      {/* architrave ring */}
      <mesh position={[0, 3.05, 0]} castShadow>
        <cylinderGeometry args={[1.8, 1.9, 0.2, 6]} />
        <meshStandardMaterial color="#8a4a2a" roughness={0.55} />
      </mesh>
      {/* double-curved roof */}
      {roof1}
      <mesh position={[0, 4.0, 0]} castShadow>
        <coneGeometry args={[1.25, 0.9, 6]} />
        <meshStandardMaterial color="#5e1e1e" roughness={0.5} side={2} />
      </mesh>
      {/* upturned eave tips */}
      {cols.map((c, i) => (
        <mesh key={i} position={[c.x * 1.45, 2.85, c.z * 1.45]} rotation={[0, (i / 6) * Math.PI * 2, 0.5]}>
          <coneGeometry args={[0.12, 0.6, 4]} />
          <meshStandardMaterial color="#8a4a2a" roughness={0.55} />
        </mesh>
      ))}
      {/* gold finial on top */}
      <mesh position={[0, 4.75, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* warm lantern hanging inside */}
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color="#e8b15c" emissive="#d98c2b" emissiveIntensity={2.2} />
      </mesh>
      <pointLight color="#ffc87a" intensity={6} distance={8} decay={2} />
    </group>
  )
}

/** Two stone pagoda lanterns flanking the pond's south edge. */
function PagodaLanterns() {
  return (
    <group>
      {[-3.9, 3.9].map((x, i) => (
        <group key={x} position={[x, 0.32, 3.0]} rotation={[0, i * 1.4, 0]}>
          {/* base rocks */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <dodecahedronGeometry args={[0.85, 1]} />
            <meshStandardMaterial color="#565c56" roughness={0.95} flatShading />
          </mesh>
          {/* pedestal + shaft */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.36, 0.5, 8]} />
            <meshStandardMaterial color="#6f6d63" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.35, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 0.9, 8]} />
            <meshStandardMaterial color="#6f6d63" roughness={0.9} />
          </mesh>
          {/* light chamber */}
          <mesh position={[0, 1.85, 0]} castShadow>
            <boxGeometry args={[0.42, 0.5, 0.42]} />
            <meshStandardMaterial color="#8a8778" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.85, 0]}>
            <boxGeometry args={[0.28, 0.36, 0.28]} />
            <meshBasicMaterial color="#ffb35c" />
          </mesh>
          {/* roof cap */}
          <mesh position={[0, 2.25, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.3, 0.2, 6]} />
            <meshStandardMaterial color="#5a574e" roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 2.42, 0]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshStandardMaterial color={CAFE_PALETTE.brass} metalness={0.8} roughness={0.25} />
          </mesh>
          <pointLight color="#ff9d45" intensity={2.5} distance={5} decay={2} />
        </group>
      ))}
    </group>
  )
}

/** A trail of flat stones crossing the pond between the fountain and the deck. */
function SteppingStones() {
  const stones = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const t = i / 4
    return {
      x: Math.sin(t * Math.PI * 0.6) * 1.5,
      z: 4.1 + t * 1.7,
      s: 0.34 + (i % 2) * 0.06,
      r: i * 1.1,
    }
  }), [])
  return (
    <group>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, 0.52, s.z]} rotation={[0, s.r, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[s.s, s.s * 1.1, 0.1, 10]} />
          <meshStandardMaterial color="#6e7166" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** Paper lanterns bobbing on the pond — warm, glowing, alive. */
function FloatingLanterns() {
  const lanterns = useMemo(() => [
    { x: -1.7, z: 6.6, c: '#e8873a' },
    { x: 1.9, z: 7.4, c: '#e2a03c' },
    { x: -0.6, z: 8.2, c: '#ec6f4a' },
    { x: 1.4, z: 3.6, c: '#e8b15c' },
    { x: -1.5, z: 4.6, c: '#e8873a' },
  ], [])
  const refs = useRef<(Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    lanterns.forEach((l, i) => {
      const g = refs.current[i]
      if (!g) return
      g.position.y = 0.6 + Math.sin(t * 1.4 + i * 1.7) * 0.04
      g.rotation.y = Math.sin(t * 0.5 + i) * 0.15
    })
  })
  return (
    <group>
      {lanterns.map((l, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g }} position={[l.x, 0.6, l.z]}>
          <mesh castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />
            <meshStandardMaterial color={l.c} emissive={l.c} emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0, -0.18, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 0.1, 8]} />
            <meshStandardMaterial color="#4a2b18" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A gentle waterfall spilling off the north rock cluster into the pond. */
function RockWaterfall() {
  const sheet = useRef<Mesh>(null)
  const sheetMat = useRef<MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (sheet.current) sheet.current.position.y = 1.05 + Math.sin(t * 2.2) * 0.05
    if (sheetMat.current) sheetMat.current.opacity = 0.45 + Math.sin(t * 3.1) * 0.12
  })
  return (
    <group position={[5.55, 0, 2.1]}>
      {/* the rock ledge the water pours off */}
      <mesh position={[0, 1.0, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial color="#4a514d" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-0.4, 1.5, 0.25]} castShadow>
        <dodecahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#59605b" roughness={0.95} flatShading />
      </mesh>
      {/* the falling water sheet */}
      <mesh ref={sheet} position={[0, 1.05, -0.25]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.7, 1.1]} />
        <meshBasicMaterial ref={sheetMat} color="#9fddd4" transparent opacity={0.5} depthWrite={false} side={2} />
      </mesh>
      {/* splash ring at the bottom */}
      <mesh position={[0, 0.35, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 20]} />
        <meshBasicMaterial color="#a7e8dc" transparent opacity={0.35} blending={AdditiveBlending} depthWrite={false} side={2} />
      </mesh>
      <pointLight color="#8fd6cc" intensity={2} distance={4} decay={2} />
    </group>
  )
}

/** Extra lotus blooms scattered around the fountain basin. */
function FountainLotuses() {
  const flowers = useMemo(() => [
    { x: 2.1, z: 1.7, s: 0.9, c: '#e78fa9' },
    { x: -2.1, z: 2.9, s: 1.05, c: '#eaa0b0' },
    { x: 2.3, z: 3.3, s: 0.8, c: '#efb1bb' },
    { x: -2.3, z: 1.4, s: 0.85, c: '#e58aa3' },
  ], [])
  return (
    <group>
      {flowers.map((f, fi) => (
        <group key={fi}>
          <mesh position={[f.x, 0.585, f.z]} rotation={[0, fi * 1.3, 0]}>
            <cylinderGeometry args={[0.32 * f.s, 0.3 * f.s, 0.05, 14]} />
            <meshStandardMaterial color={fi % 2 ? '#3f7a4e' : '#316b44'} roughness={0.6} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + fi
            return (
              <mesh key={i} position={[f.x + Math.cos(a) * 0.06 * f.s, 0.63, f.z + Math.sin(a) * 0.06 * f.s]} rotation={[0.6, 0, a + Math.PI / 2]}>
                <coneGeometry args={[0.07 * f.s, 0.28 * f.s, 6]} />
                <meshStandardMaterial color={f.c} roughness={0.5} />
              </mesh>
            )
          })}
          <mesh position={[f.x, 0.655, f.z]}>
            <sphereGeometry args={[0.09 * f.s, 8, 6]} />
            <meshStandardMaterial color="#e9c163" roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** All the new courtyard architecture: fountain + pavilion + lanterns + path. */
export function ChineseCafeCourtyardUpgrades() {
  return (
    <group>
      <GrandFountain />
      <LakesidePavilion />
      <PagodaLanterns />
      <SteppingStones />
      <FloatingLanterns />
      <RockWaterfall />
      <FountainLotuses />
    </group>
  )
}
