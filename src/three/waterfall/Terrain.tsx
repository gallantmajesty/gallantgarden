import { useMemo } from 'react'
import { BufferAttribute, Color, DoubleSide, PlaneGeometry } from 'three'
import { LAKE, WATER_LEVEL, WORLD, terrainHeight } from './layout'
import { makeGrassTexture } from './textures'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const cSilt = new Color('#36685a') // lake bed (seen through clear water)
const cSand = new Color('#c2a878')
const cGrass = new Color('#4f7e34')
const cGrassDark = new Color('#3c6328')
const cRock = new Color('#857c6e')
const tmp = new Color()

/**
 * The sculpted ground: a single displaced heightfield mesh driven by
 * layout.terrainHeight, so it matches the player controller's footing exactly.
 * Vertex-coloured by elevation — submerged silt → shoreline sand → meadow grass
 * → high rock — with a faint grass detail map and gentle per-vertex variation.
 */
export function Terrain({ segments = 150 }: { segments?: number }) {
  const grass = useMemo(() => makeGrassTexture(28), [])

  const geometry = useMemo(() => {
    const w = WORLD.maxX - WORLD.minX + 24
    const l = WORLD.maxZ - WORLD.minZ + 24
    const segX = segments
    const segY = Math.round(segments * (l / w))
    const geo = new PlaneGeometry(w, l, segX, segY)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const rand = rng(2026)
    const cx = (WORLD.maxX + WORLD.minX) / 2
    const cz = (WORLD.maxZ + WORLD.minZ) / 2

    for (let i = 0; i < pos.count; i++) {
      const ox = pos.getX(i) + cx
      const oy = pos.getY(i) + cz
      const wx = ox
      const wz = -oy // plane Y maps to world −Z after the rotateX below
      const h = terrainHeight(wx, wz)
      pos.setZ(i, h)

      const dLake = Math.hypot(wx - LAKE.cx, wz - LAKE.cz)
      if (h < WATER_LEVEL - 0.02) {
        tmp.copy(cSilt)
      } else if (dLake < LAKE.r + 4 && h < 0.7) {
        tmp.copy(cSand)
      } else if (h > 4.5) {
        tmp.copy(cRock)
      } else {
        const g = Math.min(1, (h - 0.4) / 4)
        tmp.copy(cGrassDark).lerp(cGrass, 1 - g * 0.6)
      }
      // gentle per-vertex variation so the flat tint doesn't band
      const v = 0.9 + rand() * 0.2
      colors[i * 3] = tmp.r * v
      colors[i * 3 + 1] = tmp.g * v
      colors[i * 3 + 2] = tmp.b * v
    }

    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.rotateX(-Math.PI / 2)
    geo.computeVertexNormals()
    return geo
  }, [segments])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors map={grass} roughness={1} metalness={0} side={DoubleSide} />
    </mesh>
  )
}
