-- Identity model v2: replace the text username with a unique numeric Player ID
-- (Free Fire–style) assigned at signup, and track display-name changes.
--
-- Summary of the client-side change this migration backs:
--   * profiles.username  -> removed (replaced by player_id everywhere)
--   * profiles.player_id -> new, unique, assigned once at signup
--   * profiles.display_name_changes -> counter, capped at 2 free renames
--   * public_profiles view now exposes player_id instead of username
--   * search is by player_id (exact) or display_name (ilike)

-- 1. Add the new columns.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_id bigint;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name_changes integer NOT NULL DEFAULT 0;

-- 2. Unique index on the numeric Player ID (NULLs allowed for the brief window
--    before onboarding assigns one).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_player_id_idx
  ON profiles (player_id)
  WHERE player_id IS NOT NULL;

-- 3. Faster numeric/exact lookups + name search.
CREATE INDEX IF NOT EXISTS profiles_player_id_lookup_idx ON profiles (player_id);
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx2
  ON profiles USING gin (display_name gin_trgm_ops);

-- 4. Backfill: give every existing row a random 9-digit Player ID so links/search
--    keep working. Collisions are retried; in practice astronomically unlikely.
--    (Run once; safe to re-run — only touches rows still missing an id.)
DO $$
DECLARE
  rid uuid;
  new_id bigint;
  dup boolean;
  updated int := 0;
BEGIN
  FOR rid IN SELECT id FROM profiles WHERE player_id IS NULL LOOP
    LOOP
      new_id := 100000000 + floor(random() * 900000000)::bigint;
      SELECT EXISTS (SELECT 1 FROM profiles WHERE player_id = new_id) INTO dup;
      EXIT WHEN NOT dup;
    END LOOP;
    UPDATE profiles SET player_id = new_id WHERE id = rid;
    updated := updated + 1;
  END LOOP;
  RAISE NOTICE 'Backfilled player_id on % existing profile(s)', updated;
END $$;

-- 5. Drop the old username column + its indexes (no longer referenced anywhere).
DROP INDEX IF EXISTS profiles_username_lower_idx;
DROP INDEX IF EXISTS profiles_username_trgm_idx;
ALTER TABLE profiles DROP COLUMN IF EXISTS username;

-- 6. Re-point the public_profiles view: drop username, add player_id.
--    This is the FINAL redefinition of public_profiles, so it must carry every
--    column read paths need (last_seen_at / study_status included).
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, player_id, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, inventory, public_profile, created_at,
         last_seen_at, study_status
  FROM profiles;

GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;
