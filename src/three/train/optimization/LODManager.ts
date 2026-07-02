// Distance-based LOD manager for the train interior and exterior.
// Swaps geometry/material quality based on camera-to-object distance.
// Works with React Three Fiber by exposing a hook that re-evaluates on mount
// and provides distance-scaled LOD info for each renderable group.
//
// LOD tiers:
//   0 (near, < 20m):   Full model — 8,000 tris exterior / 11,400 tris interior
//   1 (mid, 20-50m):   Simplified — 3,000 tris exterior / 6,000 tris interior
//   2 (far, 50-100m):  Basic box — 500 tris exterior / 2,000 tris interior
//   3 (very far, >100m): culled entirely

import { useMemo } from 'react'
import { Vector3 } from 'three'

export type LODQuality = 'ultra' | 'high' | 'medium' | 'low' | 'culled'

export interface LODLevel {
  distance: number
  quality: LODQuality
}

export interface LODConfig {
  exterior: LODLevel[]
  interior: LODLevel[]
}

const DEFAULT_CONFIG: LODConfig = {
  exterior: [
    { distance: 0, quality: 'ultra' },
    { distance: 20, quality: 'high' },
    { distance: 50, quality: 'medium' },
    { distance: 100, quality: 'low' },
    { distance: 150, quality: 'culled' },
  ],
  interior: [
    { distance: 0, quality: 'ultra' },
    { distance: 5, quality: 'high' },
    { distance: 20, quality: 'medium' },
    { distance: 50, quality: 'low' },
    { distance: 100, quality: 'culled' },
  ],
}

/** Resolve LOD quality from a distance and a level ladder. */
export function resolveLOD(distance: number, levels: LODLevel[]): LODQuality {
  let quality: LODQuality = 'culled'
  for (const lv of levels) {
    if (distance < lv.distance) break
    quality = lv.quality
  }
  // edge: first level starts at 0, so anything before it stays 'ultra'
  if (levels.length > 0 && distance < levels[0].distance) {
    quality = levels[0].quality
  }
  return quality
}

/** Get the triangle budget for a given LOD quality. */
export function triBudget(quality: LODQuality, isExterior: boolean): number {
  if (isExterior) {
    switch (quality) {
      case 'ultra': return 8000
      case 'high': return 3000
      case 'medium': return 500
      case 'low': return 500
      case 'culled': return 0
    }
  }
  // interior
  switch (quality) {
    case 'ultra': return 11400
    case 'high': return 6000
    case 'medium': return 2000
    case 'low': return 2000
    case 'culled': return 0
  }
}

/** Scale LOD distances by a bias factor (0 = full quality, 1.5 = aggressive). */
export function biasLOD(levels: LODLevel[], bias: number): LODLevel[] {
  const k = 1 / (1 + bias)
  return levels.map(l => ({ distance: Math.round(l.distance * k), quality: l.quality }))
}

// ── React hook ──────────────────────────────────────────────────────────────

export interface LODState {
  quality: LODQuality
  distance: number
  visible: boolean
}

/** Compute LOD state for a world-space object relative to a camera position. */
export function computeLOD(
  camPos: Vector3,
  objPos: Vector3,
  config: LODConfig,
  isExterior: boolean,
): LODState {
  const distance = camPos.distanceTo(objPos)
  const levels = isExterior ? config.exterior : config.interior
  const quality = resolveLOD(distance, levels)
  return { quality, distance, visible: quality !== 'culled' }
}

/** Hook version that memoizes config lookup. */
export function useLODConfig(): LODConfig {
  return useMemo(() => DEFAULT_CONFIG, [])
}
