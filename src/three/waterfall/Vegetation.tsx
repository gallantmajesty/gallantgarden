import { useMemo } from 'react'
import { InstancedShape, type ShapeItem } from '../library/Instanced'
import { CAMPS, LAKE, WORLD, terrainHeight } from './layout'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** True if (x,z) is a bad spot for a plant: in the lake, on a camp platform, or
 *  off the map. */
function blocked(x: number, z: number): boolean {
  if (x < WORLD.minX + 2 || x > WORLD.maxX - 2 || z < WORLD.minZ + 2 || z > WORLD.maxZ - 2) return true
  if (Math.hypot(x - LAKE.cx, z - LAKE.cz) < LAKE.r + 1) return true
  for (const c of CAMPS) if (Math.hypot(x - c.center[0], z - c.center[1]) < c.plat + 2) return true
  return false
}

/**
 * Dense, lush vegetation — broadleaf + conifer trees, ferns, wildflowers,
 * shoreline reeds and moss rocks. Every species is a single instanced draw and
 * its population scales with the graphics-quality `count` (preset.forest). Plants
 * sit on the terrain heightfield and steer clear of the lake, camps and edges.
 */
export function Vegetation({ count = 120 }: { count?: number }) {
  const data = useMemo(() => {
    const rand = rng(64200)
    const trunks: ShapeItem[] = []
    const broad: ShapeItem[] = []
    const pines: ShapeItem[] = []
    const ferns: ShapeItem[] = []
    const flowers: ShapeItem[] = []
    const reeds: ShapeItem[] = []
    const moss: ShapeItem[] = []

    const place = (n: number, fn: (x: number, z: number, y: number) => void, biasEast = false) => {
      let made = 0
      let guard = 0
      while (made < n && guard < n * 12) {
        guard++
        const x = biasEast
          ? 20 + rand() * (WORLD.maxX - 24)
          : WORLD.minX + rand() * (WORLD.maxX - WORLD.minX)
        const z = WORLD.minZ + rand() * (WORLD.maxZ - WORLD.minZ)
        if (blocked(x, z)) continue
        fn(x, z, terrainHeight(x, z))
        made++
      }
    }

    // trees — mix of broadleaf and conifer; a denser cluster toward the forest camp (east)
    place(count, (x, z, y) => {
      const h = 5 + rand() * 9
      const conifer = rand() > 0.55
      trunks.push({ pos: [x, y + h * 0.42, z], scale: [0.34 + rand() * 0.2, h * 0.85, 0.34 + rand() * 0.2], color: '#5a3d22' })
      if (conifer) {
        for (let k = 0; k < 3; k++)
          pines.push({ pos: [x, y + h * 0.6 + k * h * 0.16, z], scale: [3.2 - k * 0.8, 2.6 - k * 0.5, 3.2 - k * 0.8], color: k % 2 ? '#2f5a2c' : '#37692f' })
      } else {
        broad.push({ pos: [x, y + h * 0.95, z], scale: [3.4 + rand() * 1.6, 3.0 + rand() * 1.2, 3.4 + rand() * 1.6], color: rand() > 0.5 ? '#46823a' : '#3c7233' })
      }
    })
    // a deliberate ring of trees hugging the Forest Clearing camp
    {
      const fc = CAMPS[2]
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        const x = fc.center[0] + Math.cos(a) * (fc.plat + 3 + rand() * 3)
        const z = fc.center[1] + Math.sin(a) * (fc.plat + 3 + rand() * 3)
        if (blocked(x, z)) continue
        const y = terrainHeight(x, z)
        const h = 7 + rand() * 5
        trunks.push({ pos: [x, y + h * 0.42, z], scale: [0.4, h * 0.85, 0.4], color: '#5a3d22' })
        broad.push({ pos: [x, y + h * 0.95, z], scale: [4, 3.4, 4], color: '#42803a' })
      }
    }

    place(count * 3, (x, z, y) => {
      ferns.push({ pos: [x, y + 0.4, z], rot: [0, rand() * Math.PI, 0], scale: [0.9 + rand() * 0.6, 0.9 + rand() * 0.5, 0.9 + rand() * 0.6], color: rand() > 0.5 ? '#4e8b3a' : '#5f9a44' })
    })

    place(count * 5, (x, z, y) => {
      const pink = rand()
      flowers.push({
        pos: [x, y + 0.25, z],
        scale: [0.18, 0.4, 0.18],
        color: pink > 0.66 ? '#e98bbf' : pink > 0.33 ? '#f4e26a' : '#f0f4ff',
      })
    })

    // shoreline reeds — a band just outside the lake edge
    for (let i = 0; i < 260; i++) {
      const a = rand() * Math.PI * 2
      const r = LAKE.r + 0.5 + rand() * 3
      const x = LAKE.cx + Math.cos(a) * r
      const z = LAKE.cz + Math.sin(a) * r * 0.95
      if (x < WORLD.minX || x > WORLD.maxX || z < WORLD.minZ || z > WORLD.maxZ) continue
      let onCamp = false
      for (const c of CAMPS) if (Math.hypot(x - c.center[0], z - c.center[1]) < c.plat + 1) onCamp = true
      if (onCamp) continue
      reeds.push({ pos: [x, terrainHeight(x, z) + 0.7, z], scale: [0.06, 1.2 + rand() * 0.8, 0.06], color: rand() > 0.5 ? '#7a8c3a' : '#90a14a' })
    }

    place(Math.round(count * 0.8), (x, z, y) => {
      const s = 0.3 + rand() * 0.7
      moss.push({ pos: [x, y + s * 0.2, z], rot: [rand(), rand() * Math.PI, rand()], scale: [s, s * 0.7, s], color: rand() > 0.5 ? '#6b7d52' : '#7f7567' })
    })

    return { trunks, broad, pines, ferns, flowers, reeds, moss }
  }, [count])

  return (
    <group>
      <InstancedShape items={data.trunks} color="#5a3d22" roughness={0.95} castShadow>
        <cylinderGeometry args={[1, 1.2, 1, 7]} />
      </InstancedShape>
      <InstancedShape items={data.broad} roughness={0.85} flatShading castShadow>
        <icosahedronGeometry args={[1, 1]} />
      </InstancedShape>
      <InstancedShape items={data.pines} roughness={0.85} flatShading castShadow>
        <coneGeometry args={[1, 1, 8]} />
      </InstancedShape>
      <InstancedShape items={data.ferns} color="#4e8b3a" roughness={0.9}>
        <coneGeometry args={[1, 1.6, 6]} />
      </InstancedShape>
      <InstancedShape items={data.flowers} roughness={0.8}>
        <sphereGeometry args={[1, 6, 5]} />
      </InstancedShape>
      <InstancedShape items={data.reeds} roughness={0.9}>
        <cylinderGeometry args={[1, 1, 1, 4]} />
      </InstancedShape>
      <InstancedShape items={data.moss} roughness={1} flatShading>
        <dodecahedronGeometry args={[1, 0]} />
      </InstancedShape>
    </group>
  )
}
