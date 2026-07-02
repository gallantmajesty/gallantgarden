// @ts-nocheck
// Texture atlas builder for the train interior.
// Packs all seat, wall, floor, brass, carpet and luggage textures into ONE
// 1024x1024 canvas so the entire interior renders with a single texture sample
// per mesh — slashing draw calls from ~80 to ~25.
//
// Usage:
//   const atlas = buildInteriorAtlas(theme)
//   // atlas.texture  → THREE.CanvasTexture
//   // atlas.regions  → UV lookup per material type
//   // applyAtlasUV(geometry, 'seatVelvet', atlas)  → remaps UVs

import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three'
import type { InteriorTheme } from '../interiorThemes'

export interface AtlasRegion {
  x: number
  y: number
  w: number
  h: number
  /** Normalised [0,1] UV coords */
  u0: number
  v0: number
  u1: number
  v1: number
}

export interface InteriorAtlas {
  texture: CanvasTexture
  regions: Record<string, AtlasRegion>
  size: number
}

const ATLAS_SIZE = 1024

// ── Region layout (px coordinates within 1024x1024) ─────────────────────────

function buildRegions(): Record<string, { x: number; y: number; w: number; h: number }> {
  return {
    // row 0: wood + velvet
    seatFrame:   { x: 0,    y: 0,    w: 512, h: 512 },  // wood panel
    seatVelvet:  { x: 512,  y: 0,    w: 512, h: 512 },  // velvet upholstery
    // row 1: brass + carpet
    brass:       { x: 0,    y: 512,  w: 256, h: 256 },  // brass metal
    carpet:      { x: 256,  y: 512,  w: 512, h: 512 },  // carpet floor
    wallpaper:   { x: 768,  y: 512,  w: 256, h: 256 },  // wallpaper
    // row 2: luggage + glass + misc
    luggage:     { x: 0,    y: 768,  w: 256, h: 256 },  // leather luggage
    curtain:     { x: 256,  y: 768,  w: 256, h: 256 },  // curtain fabric
    table:       { x: 512,  y: 768,  w: 256, h: 256 },  // table wood
  }
}

/** Convert a hex color to a canvas fill style. */
function hexToFill(hex: string): string {
  return hex.startsWith('#') ? hex : '#888888'
}

/** Draw a simple procedural texture region onto the atlas canvas. */
function drawRegion(
  ctx: CanvasRenderingContext2D,
  rx: number, ry: number, rw: number, rh: number,
  baseColor: string,
  seed: number,
  style: 'wood' | 'fabric' | 'metal' | 'carpet' | 'wall' | 'leather',
) {
  // base fill
  ctx.fillStyle = hexToFill(baseColor)
  ctx.fillRect(rx, ry, rw, rh)

  // simple noise/detail per style
  let s = seed >>> 0
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }

  if (style === 'wood') {
    // horizontal grain lines
    for (let y = 0; y < rh; y += 3 + rand() * 4) {
      ctx.strokeStyle = `rgba(0,0,0,${0.04 + rand() * 0.08})`
      ctx.lineWidth = 0.5 + rand()
      ctx.beginPath()
      ctx.moveTo(rx, ry + y)
      ctx.bezierCurveTo(
        rx + rw * 0.3, ry + y + (rand() - 0.5) * 3,
        rx + rw * 0.7, ry + y + (rand() - 0.5) * 3,
        rx + rw, ry + y,
      )
      ctx.stroke()
    }
  } else if (style === 'fabric') {
    // cross-hatch weave
    for (let i = 0; i < 200; i++) {
      const vx = rx + rand() * rw
      const vy = ry + rand() * rh
      ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.04})`
      ctx.fillRect(vx, vy, 1, 1)
    }
  } else if (style === 'metal') {
    // subtle specular highlight
    const grd = ctx.createRadialGradient(rx + rw * 0.3, ry + rh * 0.3, 0, rx + rw * 0.5, ry + rh * 0.5, rw * 0.7)
    grd.addColorStop(0, 'rgba(255,255,255,0.15)')
    grd.addColorStop(1, 'rgba(0,0,0,0.05)')
    ctx.fillStyle = grd
    ctx.fillRect(rx, ry, rw, rh)
  } else if (style === 'carpet') {
    // soft noise pile texture
    for (let i = 0; i < 500; i++) {
      const v = rand() > 0.5 ? 20 : -20
      ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${0.02 + rand() * 0.03})`
      ctx.fillRect(rx + rand() * rw, ry + rand() * rh, 1, 1)
    }
  } else if (style === 'wall') {
    // subtle plaster texture
    for (let i = 0; i < 300; i++) {
      const v = rand() > 0.7 ? 15 : -10
      ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${0.03 + rand() * 0.04})`
      ctx.fillRect(rx + rand() * rw, ry + rand() * rh, 1 + rand() * 2, 1 + rand() * 2)
    }
  } else {
    // leather: subtle grain
    for (let i = 0; i < 150; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`
      ctx.beginPath()
      const lx = rx + rand() * rw
      const ly = ry + rand() * rh
      ctx.arc(lx, ly, 1 + rand() * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/** Build the full interior texture atlas from a theme's color palette. */
export function buildInteriorAtlas(theme: InteriorTheme): InteriorAtlas {
  const size = ATLAS_SIZE
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!

  const raw = buildRegions()

  // Draw each region with appropriate style
  drawRegion(ctx, raw.seatFrame.x, raw.seatFrame.y, raw.seatFrame.w, raw.seatFrame.h, theme.walls, 1, 'wood')
  drawRegion(ctx, raw.seatVelvet.x, raw.seatVelvet.y, raw.seatVelvet.w, raw.seatVelvet.h, theme.seat, 2, 'fabric')
  drawRegion(ctx, raw.brass.x, raw.brass.y, raw.brass.w, raw.brass.h, '#c39a52', 3, 'metal')
  drawRegion(ctx, raw.carpet.x, raw.carpet.y, raw.carpet.w, raw.carpet.h, theme.floor, 4, 'carpet')
  drawRegion(ctx, raw.wallpaper.x, raw.wallpaper.y, raw.wallpaper.w, raw.wallpaper.h, theme.walls, 5, 'wall')
  drawRegion(ctx, raw.luggage.x, raw.luggage.y, raw.luggage.w, raw.luggage.h, theme.trim, 6, 'leather')
  drawRegion(ctx, raw.curtain.x, raw.curtain.y, raw.curtain.w, raw.curtain.h, theme.curtain, 7, 'fabric')
  drawRegion(ctx, raw.table.x, raw.table.y, raw.table.w, raw.table.h, theme.table, 8, 'wood')

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = 16

  // Build normalised UV regions
  const regions: Record<string, AtlasRegion> = {}
  for (const [key, r] of Object.entries(raw)) {
    regions[key] = {
      x: r.x, y: r.y, w: r.w, h: r.h,
      u0: r.x / size,
      v0: r.y / size,
      u1: (r.x + r.w) / size,
      v1: (r.y + r.h) / size,
    }
  }

  return { texture, regions, size }
}

/** Remap a BufferGeometry's UV attributes to sample from an atlas region. */
export function applyAtlasUV(
  geometry: { attributes: { uv: { array: Float32Array; needsUpdate: boolean } } },
  regionKey: string,
  atlas: InteriorAtlas,
) {
  const region = atlas.regions[regionKey]
  if (!region) return
  const uv = geometry.attributes.uv
  const arr = uv.array
  const rw = region.u1 - region.u0
  const rh = region.v1 - region.v0
  for (let i = 0; i < arr.length; i += 2) {
    arr[i] = region.u0 + arr[i] * rw
    arr[i + 1] = region.v1 - arr[i + 1] * rh // flip V for canvas
  }
  uv.needsUpdate = true
}
