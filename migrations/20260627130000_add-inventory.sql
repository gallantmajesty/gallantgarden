-- Shop inventory: track owned items per user.
-- Stores an array of item IDs (catalog items, accessories, themes).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inventory jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update the public_profiles view to expose inventory for ownership checks.
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, inventory, public_profile, created_at
  FROM profiles;
