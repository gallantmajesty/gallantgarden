// Light baking system for the train interior.
// Pre-computes lighting into a lightmap texture so static geometry (walls, floor,
// ceiling, seats) gets baked shadows + ambient occlusion at zero per-frame cost.
// Only dynamic objects (player, particles, curtains) use real-time lights.
//
// The baker runs once at load (or on theme change) and produces a 1024x1024
// lightmap that's applied as a secondary UV channel on static meshes.

import { CanvasTexture, SRGBColorSpace, Vector3, Color } from 'three'
import type { InteriorTheme } from '../interiorThemes'
import { CARRIAGE } from '../interior'

export interface LightmapResult {
  texture: CanvasTexture
  size: number
}

// Light probe grid resolution
const PROBE_COLS = 16
const PROBE_ROWS = 16

// Simple ray-cast visibility for shadow falloff
function visibility(
  probePos: Vector3,
  lightPos: Vector3,
  obstacles: { center: Vector3; halfExtents: Vector3 }[],
): number {
  const dir = new Vector3().subVectors(lightPos, probePos)
  const dist = dir.length()
  dir.normalize()
  let vis = 1.0
  for (const ob of obstacles) {
    const toOb = new Vector3().subVectors(ob.center, probePos)
    const proj = toOb.dot(dir)
    if (proj < 0 || proj > dist) continue
    const perp = new Vector3().addScaledVector(dir, proj).sub(toOb)
    const r = Math.max(ob.halfExtents.x, ob.halfExtents.z)
    if (Math.abs(perp.x) < r && Math.abs(perp.z) < r && Math.abs(perp.y) < ob.halfExtents.y * 1.5) {
      vis *= 0.3 // in shadow
    }
  }
  return vis
}

/** Build a lightmap for the carriage interior. */
export function buildLightmap(theme: InteriorTheme): LightmapResult {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!

  const { halfW, z0, z1, ceilY } = CARRIAGE
  const len = z1 - z0

  // Light positions (matching CarriageInterior's point lights)
  const lightPositions = [
    new Vector3(0, ceilY - 0.3, z0 + 0.25 * len),
    new Vector3(0, ceilY - 0.3, z0 + 0.5 * len),
    new Vector3(0, ceilY - 0.3, z0 + 0.75 * len),
    new Vector3(0, ceilY / 2, (z0 + z1) / 2), // ambient fill
  ]
  const lightColors = [
    new Color(theme.lampGlow),
    new Color(theme.lampGlow),
    new Color(theme.lampGlow),
    new Color(theme.ambientFill),
  ]
  const lightIntensities = [
    theme.lampIntensity * 3,
    theme.lampIntensity * 3,
    theme.lampIntensity * 3,
    theme.lampIntensity,
  ]

  // Obstacles (seats, tables) for basic shadow casting
  const obstacles: { center: Vector3; halfExtents: Vector3 }[] = []
  for (let r = 0; r < 5; r++) {
    const z = -7.5 + r * 4.2
    for (const x of [-2.3, -1.3, 1.3, 2.3]) {
      obstacles.push({
        center: new Vector3(x, 0.6, z),
        halfExtents: new Vector3(0.55, 0.6, 0.55),
      })
    }
  }

  // Bake grid
  const probeW = size / PROBE_COLS
  const probeH = size / PROBE_ROWS

  for (let py = 0; py < PROBE_ROWS; py++) {
    for (let px = 0; px < PROBE_COLS; px++) {
      // Map probe grid to world position
      const u = px / PROBE_COLS
      const v = py / PROBE_ROWS
      const worldX = (u - 0.5) * halfW * 2
      const worldZ = z0 + v * len
      const worldY = v < 0.15 ? 0.01 : v > 0.85 ? ceilY : ceilY * 0.5 // floor, ceiling, or mid

      const probePos = new Vector3(worldX, worldY, worldZ)

      // Accumulate light from all sources
      let totalR = 0, totalG = 0, totalB = 0
      for (let li = 0; li < lightPositions.length; li++) {
        const lp = lightPositions[li]
        const lc = lightColors[li]
        const li_ = lightIntensities[li]

        const dist = probePos.distanceTo(lp)
        const attenuation = Math.max(0, 1 - dist / 12) // ~12m range
        const vis = visibility(probePos, lp, obstacles)
        const falloff = attenuation * attenuation * vis * li_

        totalR += lc.r * falloff
        totalG += lc.g * falloff
        totalB += lc.b * falloff
      }

      // Hemisphere ambient (warm top, cool bottom)
      const hemiFactor = worldY / ceilY
      totalR += 0.15 * (0.6 + hemiFactor * 0.4)
      totalG += 0.12 * (0.6 + hemiFactor * 0.4)
      totalB += 0.10 * (0.6 + hemiFactor * 0.4)

      // Tone-map and write
      const tone = (v: number) => Math.min(1, Math.sqrt(v)) * 255
      const r = Math.floor(tone(totalR))
      const g = Math.floor(tone(totalG))
      const b = Math.floor(tone(totalB))

      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(px * probeW, py * probeH, probeW + 1, probeH + 1) // +1 to avoid seams
    }
  }

  // Soft gaussian blur for smoother gradients
  // (Canvas doesn't have native blur for drawing, so we skip explicit blur
  //  and rely on the grid being coarse enough that bilinear interpolation
  //  during texture sampling provides adequate smoothing.)

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4

  return { texture: tex, size }
}
