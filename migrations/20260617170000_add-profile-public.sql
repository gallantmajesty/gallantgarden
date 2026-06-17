-- Profile public fields + a column-safe public read path.
--
-- Until now a profile was fully private (owner-only RLS) and the only public
-- field was `country` (jsonb-mirrored). The social/profile system needs other
-- users to read a SAFE projection of each profile: username, display name,
-- avatar, country, rank, and an intentionally-public blob (bio, favourite
-- subject, study schedule/interests, banner, social links).
--
-- Postgres RLS is row-level, not column-level, so we expose the safe columns
-- through a VIEW (`public_profiles`) granted to `authenticated`. The base
-- `profiles` table keeps its existing owner-only RLS unchanged — age, email and
-- the settings jsonb are never reachable through the view.

-- ---- new columns on profiles ----
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username       text,
  -- rank promoted from settings.onboarding.rank so the public view can expose it
  ADD COLUMN IF NOT EXISTS rank           text,
  -- optional uploaded profile picture (else the UI falls back to a monogram)
  ADD COLUMN IF NOT EXISTS avatar_url     text,
  -- single intentionally-public blob: { bio, favorite_subject, study_schedule,
  -- study_interests[], banner, social_links[] }. Keeping it one jsonb makes the
  -- "safe to expose" boundary obvious and avoids per-field column churn.
  ADD COLUMN IF NOT EXISTS public_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Globally-unique username, case-insensitive. Partial index so existing rows
-- without a username don't collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON profiles (lower(username))
  WHERE username IS NOT NULL;

-- ---- column-safe public read ----
-- NOTE: do NOT set security_invoker=on — the view must run with its owner's
-- rights so it can project a safe subset past the base table's owner-only RLS.
CREATE OR REPLACE VIEW public_profiles AS
  SELECT
    id,
    username,
    display_name,
    avatar,
    avatar_url,
    country,
    rank,
    public_profile,
    created_at
  FROM profiles;

GRANT SELECT ON public_profiles TO authenticated;

-- Case-insensitive search by username / display name (friend search). Cheap
-- trigram indexes keep ILIKE '%q%' fast as the user base grows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx ON profiles USING gin (display_name gin_trgm_ops);
