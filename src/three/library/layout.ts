// Shared dimensions for the great hall. Grand university-library / fantasy-castle
// scale: a wide, tall nave with deep walkable upper galleries so hundreds of
// students could roam without ever feeling squeezed between objects.

export const HALL = {
  halfW: 28, // x extent  (long walls at x = ±28)  → 56 wide
  halfL: 46, // z extent  (end walls at z = ±46)   → 92 long
  wallH: 24, // floor-to-ceiling (taller, cathedral-grand)
  balconyY: 9.5, // upper-floor walkway height
  balconyDepth: 8, // deep balcony so the upper walkway is roomy
}

// Player roam bounds on the ground floor (nave minus a wall margin).
export const PLAYER_BOUNDS = {
  minX: -HALL.halfW + 1,
  maxX: HALL.halfW - 1,
  minZ: -HALL.halfL + 1,
  maxZ: HALL.halfL - 1,
}

export const EYE_HEIGHT = 1.7

export const WINDOW = {
  sillY: 3.0,
  headY: HALL.wallH - 4, // → 20: tall gothic bays
  bayCount: 11, // windows per long wall
}

/** z-centres of each window bay along a long wall. */
export function windowZs(): number[] {
  const span = HALL.halfL * 2 - 8
  const step = span / WINDOW.bayCount
  return Array.from({ length: WINDOW.bayCount }, (_, i) => -span / 2 + step * (i + 0.5))
}

export function windowStep(): number {
  return (HALL.halfL * 2 - 8) / WINDOW.bayCount
}
