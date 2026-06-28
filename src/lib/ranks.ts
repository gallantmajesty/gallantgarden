// FocusLily rank ladder — dual XP system.
// Leaves (green) = regular XP from daily study habits.
// Golden Leaves = premium XP from high-commitment achievements.
//
// Rank is earned via total_xp = xp + premium_xp thresholds.
// Every user starts at Brown Leaf; rank upgrades automatically on threshold hit.

export interface Rank {
  id: string
  name: string
  /** badge PNG under /public/icons/ranks */
  badge: string
  /** accent used for the rank chip glow / label tint */
  accent: string
  /** total XP (leaves + golden leaves) needed to reach this rank */
  threshold: number
}

// Rank thresholds — total XP = leaves + golden_leaves combined.
// Curve: early ranks are fast (hook), later ranks are a grind (retention).
export const RANKS: Rank[] = [
  { id: 'brown-leaf',      name: 'Brown Leaf',      badge: '/icons/ranks/brown-leaf.png',      accent: '#8a5a32', threshold: 0 },
  { id: 'yellow-leaf',     name: 'Yellow Leaf',     badge: '/icons/ranks/yellow-leaf.png',     accent: '#e6b517', threshold: 400 },
  { id: 'green-leaf',      name: 'Green Leaf',      badge: '/icons/ranks/green-leaf.png',      accent: '#46b84a', threshold: 1200 },
  { id: 'bronze-leaf',     name: 'Bronze Leaf',     badge: '/icons/ranks/bronze-leaf.png',     accent: '#c2773d', threshold: 3000 },
  { id: 'silver-leaf',     name: 'Silver Leaf',     badge: '/icons/ranks/silver-leaf.png',     accent: '#aab4bd', threshold: 7000 },
  { id: 'golden-leaf',     name: 'Golden Leaf',     badge: '/icons/ranks/golden-leaf.png',     accent: '#e8b300', threshold: 14000 },
  { id: 'red-flower',      name: 'Red Flower',      badge: '/icons/ranks/red-flower.png',      accent: '#d8283c', threshold: 25000 },
  { id: 'fire-flower',     name: 'Fire Flower',     badge: '/icons/ranks/fire-flower.png',     accent: '#ff6a1a', threshold: 42000 },
  { id: 'platinum-bunch',  name: 'Platinum Bunch',  badge: '/icons/ranks/platinum-bunch.png',  accent: '#8a7bff', threshold: 70000 },
  { id: 'forest-guardian', name: 'Forest Guardian', badge: '/icons/ranks/forest-guardian.png', accent: '#c065e0', threshold: 120000 },
]

export const DEFAULT_RANK_ID = 'brown-leaf'

const BY_ID = new Map(RANKS.map((r) => [r.id, r]))

export function getRank(id: string | null | undefined): Rank {
  return (id && BY_ID.get(id)) || RANKS[0]
}

/** Compute the rank for a given total XP (leaves + golden leaves). */
export function rankForTotalXp(totalXp: number): Rank {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (totalXp >= r.threshold) rank = r
    else break
  }
  return rank
}

/** Return the index of the rank in the ladder (0-based). */
export function rankIndex(rankId: string): number {
  return Math.max(0, RANKS.findIndex((r) => r.id === rankId))
}

/** How much XP until the next rank. Returns 0 if already max rank. */
export function xpToNextRank(totalXp: number): number {
  const current = rankForTotalXp(totalXp)
  const idx = RANKS.indexOf(current)
  if (idx >= RANKS.length - 1) return 0
  return RANKS[idx + 1].threshold - totalXp
}

/** Progress within the current rank (0..1). */
export function rankProgress(totalXp: number): { rank: Rank; nextRank: Rank | null; pct: number } {
  const rank = rankForTotalXp(totalXp)
  const idx = RANKS.indexOf(rank)
  const nextRank = idx < RANKS.length - 1 ? RANKS[idx + 1] : null
  if (!nextRank) return { rank, nextRank: null, pct: 1 }
  const span = nextRank.threshold - rank.threshold
  const into = totalXp - rank.threshold
  return { rank, nextRank, pct: span > 0 ? Math.min(1, into / span) : 1 }
}
