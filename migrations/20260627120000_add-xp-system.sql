-- XP system: add leaf (regular) and golden_leaf (premium) XP columns to profiles.
-- Rank is now earned via progression, not manually chosen during onboarding.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_xp integer NOT NULL DEFAULT 0;

-- Update the public_profiles view to expose XP for leaderboards / profile display.
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, public_profile, created_at
  FROM profiles;
