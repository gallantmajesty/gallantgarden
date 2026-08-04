-- Expose the achievements blob on public_profiles so every player can see the
-- earned badges of any other player (CoC-style profile trophies).
--
-- The `achievements` jsonb column on profiles holds
-- { counters, claimed, lastLoginDay, ... }. Only the `claimed` tierKey map is
-- shown by the client on public profiles; the rest is the player's own
-- progression. The column was missing from the schema (achievement writes
-- silently fell back to localStorage), so add it first.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievements jsonb NOT NULL DEFAULT '{}'::jsonb;

-- This is the FINAL redefinition of public_profiles and must carry every column
-- read paths need (player_id, rank_xp, inventory, ... included).

DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, player_id, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, rank_xp, inventory, achievements, public_profile,
         created_at, last_seen_at, study_status
  FROM profiles;

-- DROP VIEW also drops the view's grants; restore the same access the earlier
-- migrations granted so authenticated can still read profiles.
GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;
