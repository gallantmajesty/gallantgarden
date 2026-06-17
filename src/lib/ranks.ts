// The FocusLily rank ladder. Ten tiers, sliced from the badge art sheet into
// /public/icons/ranks. Every new user starts at the lowest tier (Brown Leaf).
//
// This pass is DISPLAY ONLY — there is no XP / progression / promotion logic
// yet. A user's rank is stored as a stable id ('brown-leaf') in the profile so a
// future progression system can promote users without any schema change.

export interface Rank {
  id: string
  name: string
  /** badge PNG under /public/icons/ranks */
  badge: string
  /** accent used for the rank chip glow / label tint */
  accent: string
}

export const RANKS: Rank[] = [
  { id: 'brown-leaf', name: 'Brown Leaf', badge: '/icons/ranks/brown-leaf.png', accent: '#8a5a32' },
  { id: 'yellow-leaf', name: 'Yellow Leaf', badge: '/icons/ranks/yellow-leaf.png', accent: '#e6b517' },
  { id: 'green-leaf', name: 'Green Leaf', badge: '/icons/ranks/green-leaf.png', accent: '#46b84a' },
  { id: 'bronze-leaf', name: 'Bronze Leaf', badge: '/icons/ranks/bronze-leaf.png', accent: '#c2773d' },
  { id: 'silver-leaf', name: 'Silver Leaf', badge: '/icons/ranks/silver-leaf.png', accent: '#aab4bd' },
  { id: 'golden-leaf', name: 'Golden Leaf', badge: '/icons/ranks/golden-leaf.png', accent: '#e8b300' },
  { id: 'red-flower', name: 'Red Flower', badge: '/icons/ranks/red-flower.png', accent: '#d8283c' },
  { id: 'fire-flower', name: 'Fire Flower', badge: '/icons/ranks/fire-flower.png', accent: '#ff6a1a' },
  { id: 'platinum-bunch', name: 'Platinum Bunch', badge: '/icons/ranks/platinum-bunch.png', accent: '#8a7bff' },
  { id: 'forest-guardian', name: 'Forest Guardian', badge: '/icons/ranks/forest-guardian.png', accent: '#c065e0' },
]

export const DEFAULT_RANK_ID = 'brown-leaf'

const BY_ID = new Map(RANKS.map((r) => [r.id, r]))

export function getRank(id: string | null | undefined): Rank {
  return (id && BY_ID.get(id)) || RANKS[0]
}
