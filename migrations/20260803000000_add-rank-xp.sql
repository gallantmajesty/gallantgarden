-- Lifetime rank XP: the monotonic counter that drives rank, completely
-- separate from the spendable green-leaf wallet (xp) and premium golden leaves
-- (premium_xp). Spending leaves on shop items must NEVER demote the player.
--
-- rank_xp is written by src/lib/xpEngine.ts (syncXpToDb) and src/store/magnet.ts.
-- This column was missing from the schema, so those writes silently failed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_xp integer NOT NULL DEFAULT 0;

-- One-time backfill: existing players get their lifetime rank XP seeded from
-- their current wallet total so nobody drops to Bronze on migration. New rows
-- (rank_xp = 0 AND no wallet) are left untouched — their rank starts at Bronze.
UPDATE profiles SET rank_xp = xp + premium_xp
WHERE rank_xp = 0 AND (xp > 0 OR premium_xp > 0);

-- Rebuild public_profiles with rank_xp so leaderboards / profile views can rank
-- by lifetime XP instead of the (spendable) wallet total. This is the FINAL
-- definition and must carry every column read paths need.
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, rank_xp, inventory, public_profile, created_at,
         last_seen_at, study_status
  FROM profiles;

-- DROP VIEW also drops the view's grants; restore the same access the earlier
-- migrations granted so authenticated can still read profiles.
GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;
