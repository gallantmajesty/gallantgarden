-- Grant free leaves to player 801047185 (dev/test gift).
--   +10,000 normal leaves (xp)         → green-leaf spendable wallet
--   +10,000 golden leaves (premium_xp) → golden-leaf wallet
--   +20,000 lifetime rank XP (rank_xp) → rank matches the gift (spending later
--     can't demote them).
--
-- Self-contained: creates the rank_xp column if it isn't applied yet, then
-- backfills any existing wallet into it, then grants the gift. Safe to re-run.

-- 1. Ensure the lifetime-rank column exists (20260803000000_add-rank-xp.sql).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_xp integer NOT NULL DEFAULT 0;

-- 2. Backfill existing players' lifetime rank from their wallet so nobody
--    drops to Bronze just because the column was added now.
UPDATE profiles SET rank_xp = xp + premium_xp
WHERE rank_xp = 0 AND (xp > 0 OR premium_xp > 0);

-- 3. The gift.
WITH target AS (
  SELECT id FROM profiles WHERE player_id = 801047185
)
UPDATE profiles SET
  xp          = xp + 10000,
  premium_xp  = premium_xp + 10000,
  rank_xp     = rank_xp + 20000
WHERE id IN (SELECT id FROM target);

-- 4. Verify.
SELECT id, player_id, display_name, xp, premium_xp, rank_xp
FROM profiles WHERE player_id = 801047185;
