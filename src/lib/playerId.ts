// Unique numeric Player ID generation (Free Fire–style). Assigned once at
// signup and permanent — it is the shareable, searchable identity key that
// replaces the old text username. Uniqueness is enforced by a unique index on
// `profiles.player_id`; the generator just produces a random candidate and the
// caller retries on collision (extremely unlikely at this range).

/** Generate a random 9-digit Player ID (100000000 – 999999999). */
export function generatePlayerId(): number {
  // 9-digit range keeps it short, shareable, and collision-resistant enough
  // that a single retry almost always succeeds.
  return 100_000_000 + Math.floor(Math.random() * 900_000_000)
}
