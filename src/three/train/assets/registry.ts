// Shared material + geometry registry for the Train Station Realm. The single
// biggest draw-call / allocation win in a stylized scene is REUSE: one waxed-teak
// material, one brass, one iron — referenced by hundreds of meshes — instead of a
// fresh MeshStandardMaterial per mesh. This mirrors the avatar system's
// `sharedMaterial`/geo caches (src/avatar/config.ts) but scoped to this realm and
// keyed off the env.ts palette so the look stays cohesive.
//
// Two ways to use it:
//   • Non-instanced meshes — pass a cached material instance via the `material`
//     prop (e.g. <mesh material={mat('teak')} />), so N meshes share one material.
//   • Instanced batches — keep using InstancedShape (./instanced); one batch is
//     already one draw call, but pull its colour/roughness from these tokens so
//     every batch matches the palette.
//
// Caches are process-wide and never disposed (the realm lives for the session);
// keys are content-hashed so identical specs collapse to one object.

import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  type ColorRepresentation,
} from 'three'
import { palette, glow } from '../env'

/* -------------------------------------------------------------------------- */
/* Materials                                                                   */
/* -------------------------------------------------------------------------- */

export interface MatSpec {
  color: ColorRepresentation
  roughness?: number
  metalness?: number
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  /** keep emissive out of tone-mapping so bloom catches it (lanterns, windows) */
  glow?: boolean
}

const matCache = new Map<string, MeshStandardMaterial>()

/** Get (or create once) a shared MeshStandardMaterial for a spec. Safe to call in
 *  render — the same spec always returns the same instance. */
export function material(spec: MatSpec): MeshStandardMaterial {
  const key = JSON.stringify([
    String(spec.color),
    spec.roughness ?? 0.85,
    spec.metalness ?? 0,
    spec.emissive ? String(spec.emissive) : '',
    spec.emissiveIntensity ?? 0,
    spec.glow ?? false,
  ])
  let m = matCache.get(key)
  if (!m) {
    m = new MeshStandardMaterial({
      color: spec.color,
      roughness: spec.roughness ?? 0.85,
      metalness: spec.metalness ?? 0,
      emissive: spec.emissive ?? '#000000',
      emissiveIntensity: spec.emissiveIntensity ?? 0,
    })
    if (spec.glow) m.toneMapped = false
    matCache.set(key, m)
  }
  return m
}

/** Named palette materials — the realm's shared "library" of surfaces. Defined
 *  lazily through `material()` so they share the same cache as ad-hoc specs. */
export const MAT = {
  teak: () => material({ color: palette.teak.getHex(), roughness: 0.72 }),
  teakDark: () => material({ color: palette.teakDark.getHex(), roughness: 0.78 }),
  oak: () => material({ color: palette.oak.getHex(), roughness: 0.7 }),
  woodWarm: () => material({ color: palette.woodWarm.getHex(), roughness: 0.74 }),
  brass: () => material({ color: palette.brass.getHex(), roughness: 0.34, metalness: 0.85 }),
  brassDark: () => material({ color: palette.brassDark.getHex(), roughness: 0.45, metalness: 0.7 }),
  iron: () => material({ color: palette.iron.getHex(), roughness: 0.5, metalness: 0.6 }),
  ironWarm: () => material({ color: palette.ironWarm.getHex(), roughness: 0.55, metalness: 0.5 }),
  steel: () => material({ color: palette.steel.getHex(), roughness: 0.32, metalness: 0.9 }),
  copper: () => material({ color: palette.copper.getHex(), roughness: 0.5, metalness: 0.55 }),
  stone: () => material({ color: palette.stoneFloor.getHex(), roughness: 0.88 }),
  stoneWarm: () => material({ color: palette.stoneFloorWarm.getHex(), roughness: 0.84 }),
  brick: () => material({ color: palette.brick.getHex(), roughness: 0.92 }),
  brickDark: () => material({ color: palette.brickDark.getHex(), roughness: 0.94 }),
  brickCool: () => material({ color: palette.brickCool.getHex(), roughness: 0.93 }),
  mortar: () => material({ color: palette.mortar.getHex(), roughness: 0.9 }),
  plaster: () => material({ color: palette.plaster.getHex(), roughness: 0.95 }),
  plasterCool: () => material({ color: palette.plasterCool.getHex(), roughness: 0.95 }),
  oxblood: () => material({ color: palette.oxblood.getHex(), roughness: 0.82 }),
  ivory: () => material({ color: palette.ivory.getHex(), roughness: 0.7 }),
  plant: () => material({ color: palette.plant.getHex(), roughness: 0.85 }),
  plantPot: () => material({ color: palette.plantPot.getHex(), roughness: 0.9 }),
  // emissive (bloom-bright)
  lantern: () => material({ color: '#3a2a14', emissive: glow.lantern.getHex(), emissiveIntensity: 1.7, glow: true }),
  lanternCore: () => material({ color: '#222', emissive: glow.lanternCore.getHex(), emissiveIntensity: 2.4, glow: true }),
  windowGlow: () => material({ color: '#241a0e', emissive: glow.window.getHex(), emissiveIntensity: 1.5, glow: true }),
  signLamp: () => material({ color: '#241a0e', emissive: glow.signLamp.getHex(), emissiveIntensity: 1.3, glow: true }),
} as const

/* -------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* -------------------------------------------------------------------------- */
//
// Cache parametric geometries so repeated NON-instanced meshes (e.g. every
// platform's edge lip, every pillar) share one BufferGeometry. Instanced batches
// don't need this (they own one geometry already); this is for the architectural
// meshes that recur with identical dimensions.

const boxCache = new Map<string, BoxGeometry>()
export function boxGeo(w: number, h: number, d: number): BoxGeometry {
  const key = `${w}|${h}|${d}`
  let g = boxCache.get(key)
  if (!g) {
    g = new BoxGeometry(w, h, d)
    boxCache.set(key, g)
  }
  return g
}

const cylCache = new Map<string, CylinderGeometry>()
export function cylGeo(rt: number, rb: number, h: number, seg = 12): CylinderGeometry {
  const key = `${rt}|${rb}|${h}|${seg}`
  let g = cylCache.get(key)
  if (!g) {
    g = new CylinderGeometry(rt, rb, h, seg)
    cylCache.set(key, g)
  }
  return g
}
