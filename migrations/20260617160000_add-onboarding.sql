-- Onboarding: add the one publicly-visible profile field as a first-class column.
-- Everything else from the onboarding wizard (age [PRIVATE], study goals, referral
-- source, rank) lives in profiles.settings jsonb under the `onboarding` namespace.
--
-- `country` is broken out as a column so a future public-lobby read path can
-- expose it (alongside display_name + a rank field) without another migration.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country text;

-- NOTE: a public SELECT policy / view exposing (display_name, country, rank) for
-- the lobby roster is intentionally NOT added yet — multiplayer presence sync is
-- not wired, so the lobby roster is rendered from the current user + a mock
-- roster for now. When presence lands, add a policy here that exposes ONLY those
-- three columns (never age, email, or settings) to authenticated users.
