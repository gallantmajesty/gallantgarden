import type { PublicPlayer } from '../components/PublicPlayerTag'

// Mock roster for the public-lobby player list. Real presence sync isn't wired
// yet (see realm.ts), so global rooms show a believable, stable set of sample
// players. Each entry is ONLY the three public fields — same contract as the
// live data path will use. Swap this for a presence query when the backend lands.

const SAMPLE: PublicPlayer[] = [
  { username: 'Aarav', country: 'IN', rank: 'green-leaf' },
  { username: 'Mei', country: 'CN', rank: 'silver-leaf' },
  { username: 'Sofia', country: 'BR', rank: 'yellow-leaf' },
  { username: 'Liam', country: 'US', rank: 'golden-leaf' },
  { username: 'Yuki', country: 'JP', rank: 'red-flower' },
  { username: 'Emma', country: 'GB', rank: 'bronze-leaf' },
  { username: 'Omar', country: 'AE', rank: 'brown-leaf' },
  { username: 'Lena', country: 'DE', rank: 'fire-flower' },
  { username: 'Chloé', country: 'FR', rank: 'platinum-bunch' },
  { username: 'Noah', country: 'CA', rank: 'green-leaf' },
  { username: 'Ananya', country: 'IN', rank: 'forest-guardian' },
  { username: 'Diego', country: 'MX', rank: 'yellow-leaf' },
]

// Deterministic seeded shuffle/slice so a given room shows a stable roster.
function seeded(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/** A stable mock roster of `count` players for a room seed. */
export function mockRoster(seed: number, count: number): PublicPlayer[] {
  const rand = seeded(seed * 7 + 3)
  const pool = [...SAMPLE]
  // Fisher–Yates with the seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)))
}
