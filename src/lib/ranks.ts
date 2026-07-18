// StudyForest rank ladder — Free Fire–inspired competitive tiers.
//
// 7 tiers × 3 arrow subdivisions + 1 final rank (Focuster) = 19 ranks.
// Curve is exponential: early ranks are fast (hook), later ranks are a grind
// (retention). ~1.35x multiplier between tiers.
//
// Rank is earned via total_xp = leaves + golden_leaves thresholds.
// Every user starts at Bronze I; rank upgrades automatically on threshold hit.

export interface Rank {
  id: string
  name: string
  /** badge PNG/WebP under /public/icons/ranks */
  badge: string
  /** accent used for the rank chip glow / label tint */
  accent: string
  /** total XP (leaves + golden leaves) needed to reach this rank */
  threshold: number
}

// Rank thresholds — total XP = leaves + golden leaves combined.
// Curve: Bronze→Silver ~800 XP (~1 week), Diamond→Focuster ~138k XP (~months).
export const RANKS: Rank[] = [
  // Bronze
  { id: 'bronze-1',    name: 'Bronze I',    badge: '/icons/ranks/Bronze 1.png',    accent: '#cd7f32', threshold: 0 },
  { id: 'bronze-2',    name: 'Bronze II',   badge: '/icons/ranks/Bronze 2.png',    accent: '#cd7f32', threshold: 150 },
  { id: 'bronze-3',    name: 'Bronze III',  badge: '/icons/ranks/Bronze 3.png',    accent: '#cd7f32', threshold: 400 },
  // Silver
  { id: 'silver-1',    name: 'Silver I',    badge: '/icons/ranks/Silver 1.png',    accent: '#c0c0c0', threshold: 800 },
  { id: 'silver-2',    name: 'Silver II',   badge: '/icons/ranks/Silver 2.png',    accent: '#c0c0c0', threshold: 1500 },
  { id: 'silver-3',    name: 'Silver III',  badge: '/icons/ranks/Silver 3.png',    accent: '#c0c0c0', threshold: 2500 },
  // Gold
  { id: 'gold-1',      name: 'Gold I',      badge: '/icons/ranks/Gold 1.png',      accent: '#ffd700', threshold: 4000 },
  { id: 'gold-2',      name: 'Gold II',     badge: '/icons/ranks/Gold 2.webp',     accent: '#ffd700', threshold: 6000 },
  { id: 'gold-3',      name: 'Gold III',    badge: '/icons/ranks/Gold 3.png',      accent: '#ffd700', threshold: 9000 },
  // Platinum
  { id: 'platinum-1',  name: 'Platinum I',  badge: '/icons/ranks/platinum 1.webp', accent: '#00bcd4', threshold: 13000 },
  { id: 'platinum-2',  name: 'Platinum II', badge: '/icons/ranks/platinum 2.webp', accent: '#00bcd4', threshold: 18000 },
  { id: 'platinum-3',  name: 'Platinum III', badge: '/icons/ranks/platinum 3.png', accent: '#00bcd4', threshold: 25000 },
  // Diamond
  { id: 'diamond-1',   name: 'Diamond I',   badge: '/icons/ranks/Diamond 1.webp',  accent: '#b388ff', threshold: 34000 },
  { id: 'diamond-2',   name: 'Diamond II',  badge: '/icons/ranks/Diamond 2.webp',  accent: '#b388ff', threshold: 46000 },
  { id: 'diamond-3',   name: 'Diamond III', badge: '/icons/ranks/Diamond 3.webp',  accent: '#b388ff', threshold: 62000 },
  // Crystal
  { id: 'crystal-1',   name: 'Crystal I',   badge: '/icons/ranks/Crystal 1.webp',  accent: '#00e5ff', threshold: 82000 },
  { id: 'crystal-2',   name: 'Crystal II',  badge: '/icons/ranks/Crystal 2.png',   accent: '#00e5ff', threshold: 108000 },
  { id: 'crystal-3',   name: 'Crystal III', badge: '/icons/ranks/Crystal 3.png',   accent: '#00e5ff', threshold: 140000 },
  // Focuster
  { id: 'focuster',    name: 'Focuster',    badge: '/icons/ranks/Focuster.webp',    accent: '#ff4081', threshold: 200000 },
]

export const DEFAULT_RANK_ID = 'bronze-1'

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
