import { useMemo } from 'react'
import { PlaneGeometry } from 'three'

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * A living ground: gently rolling hills (displaced plane), scattered rocks and
 * grass tufts, and a ring of distant mountains fading into the fog. Replaces the
 * flat green disc so the kingdom feels like real terrain.
 */
export function Terrain() {
  // rolling hills via vertex displacement (kept subtle so trees sit flat-ish)
  const groundGeo = useMemo(() => {
    const g = new PlaneGeometry(220, 220, 80, 80)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const d = Math.sqrt(x * x + y * y)
      // flat in the central play area, rising hills toward the edges
      const edge = Math.max(0, d - 22)
      const h =
        Math.sin(x * 0.06) * Math.cos(y * 0.05) * 0.8 +
        Math.sin(x * 0.13 + y * 0.07) * 0.4 +
        edge * 0.12
      pos.setZ(i, h)
    }
    g.computeVertexNormals()
    return g
  }, [])

  const rocks = useMemo(() => {
    const rand = rng(11)
    return Array.from({ length: 26 }, () => {
      const ang = rand() * Math.PI * 2
      const rad = 10 + rand() * 40
      return {
        pos: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad] as [number, number, number],
        s: 0.3 + rand() * 0.9,
        rot: rand() * Math.PI,
        shade: 0.5 + rand() * 0.4,
      }
    })
  }, [])

  const tufts = useMemo(() => {
    const rand = rng(29)
    return Array.from({ length: 140 }, () => {
      const ang = rand() * Math.PI * 2
      const rad = 4 + rand() * 36
      return {
        pos: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad] as [number, number, number],
        s: 0.4 + rand() * 0.7,
        rot: rand() * Math.PI,
        green: rand(),
      }
    })
  }, [])

  const mountains = useMemo(() => {
    const rand = rng(53)
    return Array.from({ length: 22 }, (_, i) => {
      const ang = (i / 22) * Math.PI * 2 + rand() * 0.1
      const rad = 88 + rand() * 14
      return {
        pos: [Math.cos(ang) * rad, -2, Math.sin(ang) * rad] as [number, number, number],
        h: 14 + rand() * 22,
        r: 10 + rand() * 10,
        shade: 0.5 + rand() * 0.3,
      }
    })
  }, [])

  return (
    <group>
      {/* rolling grass ground */}
      <mesh geometry={groundGeo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#6cbf4c" roughness={1} />
      </mesh>

      {/* darker grass underlay for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <circleGeometry args={[200, 48]} />
        <meshStandardMaterial color="#4f9e3c" roughness={1} />
      </mesh>

      {/* rocks */}
      {rocks.map((r, i) => (
        <mesh key={`rock-${i}`} position={r.pos} rotation={[0, r.rot, 0]} scale={r.s} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color={`rgb(${110 * r.shade + 60}, ${110 * r.shade + 62}, ${110 * r.shade + 70})`} roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* grass tufts — crossed blades */}
      {tufts.map((t, i) => {
        const col = t.green < 0.5 ? '#5aa83c' : '#7bc24f'
        return (
          <group key={`tuft-${i}`} position={t.pos} rotation={[0, t.rot, 0]} scale={t.s}>
            <mesh position={[0, 0.3, 0]}>
              <coneGeometry args={[0.12, 0.6, 4]} />
              <meshStandardMaterial color={col} roughness={1} />
            </mesh>
            <mesh position={[0.12, 0.25, 0.05]} rotation={[0, 0, 0.3]}>
              <coneGeometry args={[0.09, 0.45, 4]} />
              <meshStandardMaterial color={col} roughness={1} />
            </mesh>
          </group>
        )
      })}

      {/* distant mountains fading into fog */}
      {mountains.map((m, i) => (
        <mesh key={`mtn-${i}`} position={m.pos} rotation={[0, i, 0]}>
          <coneGeometry args={[m.r, m.h, 5]} />
          <meshStandardMaterial color={`rgb(${120 * m.shade + 70}, ${130 * m.shade + 80}, ${140 * m.shade + 95})`} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}
