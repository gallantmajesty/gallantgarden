-- Shop inventory: track owned items per user.
-- Stores an array of item IDs (catalog items, accessories, themes).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inventory jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update the public_profiles view to expose inventory for ownership checks.
-- This is the FINAL redefinition of public_profiles across all migrations, so it
-- must carry EVERY column any read path needs — including last_seen_at/study_status
-- (added by the chat-system migration) which the intermediate xp-system redefinition
-- dropped. src/lib/social.ts (PUBLIC_COLS) selects last_seen_at + study_status.
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, inventory, public_profile, created_at,
         last_seen_at, study_status
  FROM profiles;

-- DROP VIEW also drops the view's grants; restore the same access the chat-system
-- migration granted so authenticated can still read profiles (writes stay blocked).
GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;
