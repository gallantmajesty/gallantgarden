// Lava Pad Arena — procedural generation, connectivity, helpers, and config

import type { LavaPadArenaConfig, LavaPadPlatform, LavaPadGameConfig, PlatformType } from './types'

// =============================================================================
// Seeded PRNG (mulberry32) — deterministic, fast, no allocations
// =============================================================================

export function createRng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// =============================================================================
// Procedural platform generation
// =============================================================================

const RING_COUNTS = [1, 6, 8, 6, 4]
const RING_RADII = [0, 4, 8, 12, 17]
const RING_HEIGHTS = [0, 0, 0.5, 1, 1.5]
const RING_RADIUS_MIN = [2.5, 1.2, 1.0, 0.8, 1.2]
const RING_RADIUS_MAX = [2.5, 1.8, 1.5, 1.2, 1.8]
const RING_TYPES: PlatformType[][] = [
  ['spawn'],
  ['normal', 'normal', 'normal', 'cracked', 'normal', 'normal'],
  ['normal', 'cracked', 'normal', 'shrinking', 'normal', 'moving', 'normal', 'normal'],
  ['normal', 'normal', 'shrinking', 'normal', 'cracked', 'normal'],
  ['normal', 'large', 'large', 'normal'],
]

function generateRing(
  ringIndex: number,
  rng: () => number,
  existing: Omit<LavaPadPlatform, 'connectedTo'>[],
): Omit<LavaPadPlatform, 'connectedTo'>[] {
  void existing
  const count = RING_COUNTS[ringIndex] || 6
  const radius = RING_RADII[ringIndex] || 6
  const height = RING_HEIGHTS[ringIndex] || 0
  const platforms: Omit<LavaPadPlatform, 'connectedTo'>[] = []
  const types = RING_TYPES[ringIndex] || []

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.3
    const rOffset = (rng() - 0.5) * 1.2
    const actualR = radius + rOffset
    const x = Math.sin(angle) * actualR
    const z = Math.cos(angle) * actualR
    const y = height + (rng() - 0.5) * 0.3

    const minR = RING_RADIUS_MIN[ringIndex] || 1
    const maxR = RING_RADIUS_MAX[ringIndex] || 1.5
    const platR = minR + rng() * (maxR - minR)

    const type = types[i % types.length] || 'normal'

    platforms.push({
      id: `p${ringIndex}-${i}`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      z: Math.round(z * 10) / 10,
      radius: Math.round(platR * 10) / 10,
      height: 0.3,
      type,
    })
  }

  return platforms
}

export function generateArena(seed: number): Omit<LavaPadPlatform, 'connectedTo'>[] {
  const rng = createRng(seed)
  let all: Omit<LavaPadPlatform, 'connectedTo'>[] = []

  for (let ring = 0; ring < RING_COUNTS.length; ring++) {
    const platforms = generateRing(ring, rng, all)
    all = all.concat(platforms)
  }

  return all
}

// =============================================================================
// Build connectivity graph
// =============================================================================

function buildConnectivity(
  platforms: Omit<LavaPadPlatform, 'connectedTo'>[],
  maxJumpDist: number,
): LavaPadPlatform[] {
  const result: LavaPadPlatform[] = []

  for (const p of platforms) {
    const connections: string[] = []
    for (const other of platforms) {
      if (other.id === p.id) continue
      const dx = other.x - p.x
      const dz = other.z - p.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      const dy = Math.abs(other.y - p.y)
      const effectiveDist = dist + dy * 2
      if (effectiveDist <= maxJumpDist) {
        connections.push(other.id)
      }
    }
    result.push({ ...p, connectedTo: connections })
  }

  return result
}

// =============================================================================
// Validate connectivity — every platform must be reachable from spawn
// =============================================================================

function validateConnectivity(platforms: LavaPadPlatform[]): boolean {
  const spawns = platforms.filter(p => p.type === 'spawn')
  if (spawns.length === 0) return false

  const visited = new Set<string>()
  const queue = [spawns[0].id]
  visited.add(spawns[0].id)

  while (queue.length > 0) {
    const current = queue.shift()!
    const platform = platforms.find(p => p.id === current)
    if (!platform) continue
    for (const conn of platform.connectedTo) {
      if (!visited.has(conn)) {
        visited.add(conn)
        queue.push(conn)
      }
    }
  }

  return visited.size === platforms.length
}

// =============================================================================
// Arena Configuration
// =============================================================================

const MAX_ARENA_RETRIES = 50

export function createArenaConfig(seed?: number): LavaPadArenaConfig {
  const s = seed ?? Math.floor(Math.random() * 2147483647)

  for (let attempt = 0; attempt < MAX_ARENA_RETRIES; attempt++) {
    const trySeed = s + attempt
    const raw = generateArena(trySeed)
    const connected = buildConnectivity(raw, 5.5)

    if (validateConnectivity(connected)) {
      return {
        platforms: connected,
        lava: { initialY: -10, riseSpeed: 0.15, maxY: 20 },
        arena: { centerX: 0, centerZ: 0, radius: 25, spawnHeight: 2 },
        match: { countdownDuration: 3, maxDuration: 180 },
        seed: trySeed,
      }
    }
  }

  const raw = generateArena(s)
  const connected = buildConnectivity(raw, 5.5)
  return {
    platforms: connected,
    lava: { initialY: -10, riseSpeed: 0.15, maxY: 20 },
    arena: { centerX: 0, centerZ: 0, radius: 25, spawnHeight: 2 },
    match: { countdownDuration: 3, maxDuration: 180 },
    seed: s,
  }
}

export let ARENA_CONFIG: LavaPadArenaConfig = createArenaConfig()

/** Rebuild arena with optional seed, updating the global config */
export function regenerateArena(seed?: number): LavaPadArenaConfig {
  ARENA_CONFIG = createArenaConfig(seed)
  return ARENA_CONFIG
}

// =============================================================================
// Game Configuration
// =============================================================================

export const GAME_CONFIG: LavaPadGameConfig = {
  arena: ARENA_CONFIG,
  player: {
    jumpDuration: 0.8,
    jumpHeight: 4,
    maxJumpDistance: 6,
    anticipationDuration: 0.15,
    landingDuration: 0.1,
  },
  camera: {
    distance: 8,
    height: 5,
    stiffness: 35,
    damping: 10,
    jumpZoomFactor: 1.2,
    tiltAmount: 0.15,
  },
  lava: {
    warningThreshold: 3,
  },
  platform: {
    crackedBreakDelay: 3,
    crackedRespawnDelay: 5,
    movingSpeed: 1.5,
    shrinkingMinRadius: 0.4,
    shrinkingSpeed: 0.3,
    shrinkingGrowSpeed: 0.5,
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

export function getPlatformById(id: string): LavaPadPlatform | undefined {
  return ARENA_CONFIG.platforms.find(p => p.id === id)
}

export function getSpawnPlatforms(): LavaPadPlatform[] {
  return ARENA_CONFIG.platforms.filter(p => p.type === 'spawn')
}

export function getValidJumpTargets(currentPlatformId: string, maxDist: number): string[] {
  const current = getPlatformById(currentPlatformId)
  if (!current) return []
  return current.connectedTo.filter(targetId => {
    const target = getPlatformById(targetId)
    if (!target) return false
    const dx = target.x - current.x
    const dz = target.z - current.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    return dist <= maxDist
  })
}

export function calculateJumpArc(
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  progress: number,
  maxHeight: number,
): { x: number; y: number; z: number } {
  const t = progress
  const invT = 1 - t
  const midX = (start.x + end.x) / 2
  const midZ = (start.z + end.z) / 2
  const midY = Math.max(start.y, end.y) + maxHeight
  const x = invT * invT * start.x + 2 * invT * t * midX + t * t * end.x
  const y = invT * invT * start.y + 2 * invT * t * midY + t * t * end.y
  const z = invT * invT * start.z + 2 * invT * t * midZ + t * t * end.z
  return { x, y, z }
}

export function getLavaY(timeElapsed: number): number {
  return ARENA_CONFIG.lava.initialY + ARENA_CONFIG.lava.riseSpeed * timeElapsed
}

export function isPlayerEliminated(playerY: number, lavaY: number): boolean {
  return playerY <= lavaY + 0.5
}
