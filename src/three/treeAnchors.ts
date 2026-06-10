// Branch anchor points where sticky notes attach to a tree.
// Deterministic per-variant so a note's anchor_id maps to a stable spot,
// and both the tree mesh and the note layer agree on positions.

export interface Anchor {
  pos: [number, number, number]
}

function rng(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const CACHE = new Map<number, Anchor[]>()

/** A ring of anchor points around the canopy/trunk for a given tree variant. */
export function anchorsForVariant(variant: number, count = 8): Anchor[] {
  const key = variant * 100 + count
  const cached = CACHE.get(key)
  if (cached) return cached

  const rand = rng(variant + 7)
  const anchors: Anchor[] = []
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rand() * 0.5
    const rad = 1.0 + rand() * 0.9
    const height = 2.0 + rand() * 1.8
    anchors.push({
      pos: [Math.cos(ang) * rad, height, Math.sin(ang) * rad * 0.85],
    })
  }
  CACHE.set(key, anchors)
  return anchors
}

/** Index of the anchor nearest a local-space point (for drag-snap). */
export function nearestAnchorId(
  variant: number,
  local: [number, number, number],
  count = 8,
): number {
  const anchors = anchorsForVariant(variant, count)
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < anchors.length; i++) {
    const [ax, ay, az] = anchors[i].pos
    const d = (ax - local[0]) ** 2 + (ay - local[1]) ** 2 + (az - local[2]) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}
