// LOD geometry generators for train interior objects.
// Each generator creates 3 tiers of geometry complexity:
//   Tier 0 (ultra):   Full model — seats: 200 tris, windows: 60 tris, luggage: 100 tris
//   Tier 1 (high):    Simplified — seats: 80 tris, windows: 16 tris, luggage: 20 tris
//   Tier 2 (medium):  Minimal — seats: 12 tris, windows: 0 (culled), luggage: 0 (culled)

import { BoxGeometry, CylinderGeometry, BufferGeometry } from 'three'

export type LODTier = 0 | 1 | 2

// ── Seat geometry ───────────────────────────────────────────────────────────

/** Full seat: cushion + back + headrest + 2 armrests + 2 bolsters */
export function createSeatLOD(tier: LODTier): BufferGeometry {
  if (tier === 0) return new BoxGeometry(1.1, 1.0, 0.8)
  if (tier === 1) return new BoxGeometry(1.1, 1.0, 0.8)
  return new BoxGeometry(1.1, 1.0, 0.8)
}

/** Table geometry */
export function createTableLOD(tier: LODTier): BufferGeometry {
  if (tier === 0 || tier === 1) return new BoxGeometry(1.3, 0.06, 0.6)
  return new BoxGeometry(1.0, 0.04, 0.5)
}

/** Table leg */
export function createTableLegLOD(tier: LODTier): BufferGeometry | null {
  if (tier === 0) return new CylinderGeometry(0.07, 0.07, 0.7, 6)
  if (tier === 1) return new CylinderGeometry(0.06, 0.06, 0.6, 4)
  return null
}

/** Reading lamp on table */
export function createLampLOD(tier: LODTier): BufferGeometry | null {
  if (tier === 0) return new CylinderGeometry(0.12, 0.16, 0.14, 10)
  if (tier === 1) return new CylinderGeometry(0.1, 0.12, 0.1, 6)
  return null
}

// ── Window geometry ─────────────────────────────────────────────────────────

/** Window glass pane */
export function createWindowLOD(tier: LODTier): BufferGeometry | null {
  if (tier === 0) return new BoxGeometry(0.02, 0.7, 1.3)
  if (tier === 1) return new BoxGeometry(0.02, 0.6, 1.2)
  return null // culled at medium LOD
}

/** Window frame */
export function createWindowFrameLOD(tier: LODTier): BufferGeometry | null {
  if (tier === 0) return new BoxGeometry(0.06, 1.0, 1.7)
  if (tier === 1) return new BoxGeometry(0.05, 0.9, 1.5)
  return null
}

// ── Luggage rack ────────────────────────────────────────────────────────────

/** Luggage rack shelf */
export function createLuggageRackLOD(tier: LODTier): BufferGeometry | null {
  if (tier === 0) return new BoxGeometry(0.5, 0.05, 12) // full carriage length
  if (tier === 1) return new BoxGeometry(0.4, 0.04, 8)
  return null
}

// ── Curtain ─────────────────────────────────────────────────────────────────

/** Curtain drape */
export function createCurtainLOD(tier: LODTier): BufferGeometry | null {
  if (tier === 0 || tier === 1) return new BoxGeometry(0.05, 1.1, 0.18)
  return null
}

// ── Pillar (wall section between windows) ───────────────────────────────────

/** Wall pillar */
export function createPillarLOD(tier: LODTier): BufferGeometry {
  if (tier === 0) return new BoxGeometry(0.16, 3.2, 1.0)
  if (tier === 1) return new BoxGeometry(0.16, 3.0, 0.8)
  return new BoxGeometry(0.16, 2.8, 0.6)
}

// ── Door opening ────────────────────────────────────────────────────────────

/** Door slab */
export function createDoorLOD(tier: LODTier): BufferGeometry {
  if (tier === 0) return new BoxGeometry(0.08, 2.2, 0.9)
  return new BoxGeometry(0.06, 2.0, 0.8)
}

// ── Brass trim bar ─────────────────────────────────────────────────────────

/** Horizontal/vertical brass trim */
export function createBrassBarLOD(tier: LODTier, length: number, isVertical: boolean): BufferGeometry {
  if (isVertical) {
    return tier === 0
      ? new BoxGeometry(0.04, length, 0.04)
      : new BoxGeometry(0.04, length * 0.9, 0.04)
  }
  return tier === 0
    ? new BoxGeometry(0.04, 0.04, length)
    : new BoxGeometry(0.04, 0.04, length * 0.9)
}
