-- Make public_profiles a SECURITY INVOKER view and close the gaps that
-- implies. Resolves the Supabase security advisor finding:
--   "View public.public_profiles is defined with the SECURITY DEFINER property"
--
-- Before: the view ran with its owner's rights (security_invoker = off), so it
-- bypassed the base table's owner-only RLS. The column projection was the only
-- protection — which is why the advisor flags it.
--
-- After:
--   1. The view re-runs RLS as the caller (security_invoker = true).
--   2. profiles gets a SELECT policy for authenticated that admits ANY row —
--      required for the invoker view to keep serving cross-user reads
--      (leaderboards, profiles, friend search).
--   3. The one private column (settings — holds age / onboarding data) is
--      column-revoked from authenticated, so the all-rows SELECT policy can
--      never leak it through the table or the Data API.
--   4. Owners still read their own settings via get_my_settings()
--      (SECURITY DEFINER with a hard auth.uid() guard — same pattern as
--      delete_my_account / the realm and chat RPCs) and write them through the
--      existing direct upsert (INSERT/UPDATE on the column stay granted).

-- ---- 1. SECURITY INVOKER view (same column list as 20260804000000) ----
DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles
WITH (security_invoker = true)
AS
  SELECT id, player_id, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, rank_xp, inventory, achievements, public_profile,
         created_at, last_seen_at, study_status
  FROM profiles;

-- DROP VIEW drops the view's grants; restore the exact access from before.
GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;

-- ---- 2. Cross-user SELECT on profiles (needed by the invoker view) ----
-- Existing owner-only policies (profiles_select) stay; policies are additive.
CREATE POLICY profiles_select_public
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- ---- 3. Close the column leak ----
-- The table now admits all rows to authenticated; settings must stay private.
-- Supabase's default grants give authenticated a table-level SELECT on every
-- public table, and a table-level privilege overrides any column-level revoke
-- (REVOKE SELECT (settings) would be a silent no-op). So instead replace the
-- table-wide SELECT with column-level SELECT on every public column — all of
-- them except settings. PostgREST expands `*` to only the granted columns.
REVOKE SELECT ON profiles FROM authenticated;
GRANT SELECT (id, display_name, avatar, created_at, updated_at, country, username,
              rank, avatar_url, public_profile, last_seen_at, study_status, xp,
              premium_xp, inventory, player_id, display_name_changes, rank_xp,
              achievements, ads_viewed) ON profiles TO authenticated;

-- ---- 4. Own-settings read path (replaces the revoked direct read) ----
CREATE OR REPLACE FUNCTION get_my_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  RETURN (SELECT settings FROM profiles WHERE id = me);
END;
$$;

-- Supabase default privileges grant EXECUTE to anon/authenticated directly on
-- every public function, so REVOKE FROM PUBLIC alone is a no-op for them; the
-- explicit anon revoke below is what actually closes the unauthenticated path.
REVOKE ALL ON FUNCTION get_my_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_settings() FROM anon;
GRANT EXECUTE ON FUNCTION get_my_settings() TO authenticated;

-- Rollback:
--   DROP POLICY IF EXISTS profiles_select_public ON profiles;
--   REVOKE SELECT (settings) ON profiles FROM authenticated;  -- restores the column read
--   DROP FUNCTION IF EXISTS get_my_settings();
--   DROP VIEW IF EXISTS public_profiles;
--   (re-create the view with the 20260804000000 definition to restore the
--    security_definer behavior, or `CREATE VIEW ... WITH (security_invoker = true)`
--    to keep the new one)
