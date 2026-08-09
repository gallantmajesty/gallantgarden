-- Lint remediation for the Supabase Performance/Security report
-- (Supabase Performance Security Lints CSV, 2026-08-08 — 210 findings, 6 lint families).
--
-- What each section fixes:
--   1. 0011 function_search_path_mutable  — pin SET search_path on every flagged function.
--   2. 0028 anon_security_definer_function_executable — close the anon/PUBLIC path on
--      every public function. Every function the app calls already carries an explicit
--      GRANT EXECUTE ... TO authenticated (or service_role) in its migration, so the
--      default PUBLIC grant is the only reason anon could execute them.
--   3. 0014 extension_in_public — move pg_trgm to the extensions schema (the two
--      profiles GIN indexes must be rebuilt, they depend on gin_trgm_ops).
--   4. 0025 public_bucket_allows_listing — drop the broad SELECT-on-objects policies;
--      public buckets serve URLs without them and the app never lists objects.
--   5. Leaked-password protection toggle — enable via auth.config.
--
-- 0029 authenticated_security_definer_function_executable stays open BY DESIGN:
-- every flagged function is the client-facing RPC surface (chat, friends, realms,
-- sessions, daily rewards, analytics). admin_*/owner_* are guarded in-function by
-- _is_owner() (hardcoded owner email); they must remain callable as authenticated
-- because the owner panel runs in the browser with a normal user JWT.
--
-- Safe to re-run (idempotent).

-- ============================================================
-- 1. Pin search_path on all functions flagged 0011
-- ============================================================
ALTER FUNCTION IF EXISTS public.is_conversation_member(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.send_friend_request(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.respond_friend_request(uuid, boolean) SET search_path = public;
ALTER FUNCTION IF EXISTS public.remove_friend(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.block_user(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.unblock_user(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.realm_heartbeat(text, integer) SET search_path = public;
ALTER FUNCTION IF EXISTS public.leave_realm_presence() SET search_path = public;
ALTER FUNCTION IF EXISTS public.is_realm_banned(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.set_updated_at() SET search_path = public;
ALTER FUNCTION IF EXISTS public.are_friends(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.is_blocked_either(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.is_realm_member(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.realm_owner(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_realm(uuid, text, text, integer) SET search_path = public;
ALTER FUNCTION IF EXISTS public.list_public_realms() SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_following_ids(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_follower_ids(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_follow_count(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_is_following(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_mutual_following_ids(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_or_create_dm(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.send_message(uuid, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.create_realm(text, text, integer) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_realm_by_code(text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.close_realm(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.kick_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.ban_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.unban_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.mute_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.unmute_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.transfer_realm_ownership(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.list_realm_members(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.assign_realm_instance(text, integer) SET search_path = public;
ALTER FUNCTION IF EXISTS public.realm_occupancy(text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.claim_session(uuid, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.session_heartbeat(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.release_session() SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_realm_by_code(text, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.cleanup_rate_limits() SET search_path = public;
ALTER FUNCTION IF EXISTS public.check_rate_limit(text, integer, integer) SET search_path = public;
ALTER FUNCTION IF EXISTS public.credit_golden_leaves(uuid, integer, integer, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.edit_message(uuid, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public._is_owner() SET search_path = public;
ALTER FUNCTION IF EXISTS public.delete_message(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.create_realm(text, text, integer, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.update_realm(uuid, text, text, integer, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.search_public_realms(text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.claim_daily_login() SET search_path = public;
ALTER FUNCTION IF EXISTS public.is_reaction_member(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.create_group(text, text, uuid[], integer) SET search_path = public;
ALTER FUNCTION IF EXISTS public.join_group(text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.group_invite(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.group_remove_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.group_set_role(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.group_leave(uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.send_message_rich(uuid, text, text, text, jsonb, uuid) SET search_path = public;
ALTER FUNCTION IF EXISTS public.toggle_reaction(uuid, text) SET search_path = public;
ALTER FUNCTION IF EXISTS public.get_conversation_summaries_v2() SET search_path = public;

-- ============================================================
-- 2. Close the unauthenticated (anon) path on every public function
-- ============================================================
-- Supabase default privileges grant EXECUTE to PUBLIC on every public function,
-- and anon inherits it — that is the entire 0028 finding set. The app never calls
-- RPCs before login, so anon loses nothing. authenticated keeps its explicit grants
-- (verified against every migration), and service_role keeps credit_golden_leaves.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Keep future migrations from silently re-opening the anon path.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ============================================================
-- 3. Move pg_trgm out of public (0014)
-- ============================================================
-- The two profiles GIN indexes depend on gin_trgm_ops, so they must be dropped
-- before the extension can move; they are rebuilt schema-qualified afterwards.
-- (search_public_realms uses plain ILIKE, no trgm operators, so nothing else moves.)
DROP INDEX IF EXISTS profiles_username_trgm_idx;
DROP INDEX IF EXISTS profiles_display_name_trgm_idx;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

CREATE INDEX profiles_username_trgm_idx
  ON profiles USING gin (username extensions.gin_trgm_ops);
CREATE INDEX profiles_display_name_trgm_idx
  ON profiles USING gin (display_name extensions.gin_trgm_ops);

-- ============================================================
-- 4. Drop broad storage listing policies (0025)
-- ============================================================
-- Public buckets serve object URLs without any SELECT policy; these policies only
-- enabled listing of every file in the bucket (the app never lists — it only uses
-- getPublicUrl / upload / remove).
DROP POLICY IF EXISTS chat_media_read ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Note images are publicly accessible" ON storage.objects;

-- ============================================================
-- 5. Enable leaked-password protection
-- ============================================================
-- Primary path: Supabase Dashboard → Authentication → Passwords →
-- "Prevent use of leaked passwords" (Pro plan and above). Management API
-- equivalent: PATCH /v1/projects/{ref}/config/auth {"PASSWORD_PROTECTION_ENABLED": true}.
--
-- Newer Supabase projects also expose the setting as auth.config
-- (security_leaked_password_protection_enabled); try that first, fall back to a
-- NOTICE so the migration still succeeds on projects without the table/column.
DO $$
BEGIN
  BEGIN
    UPDATE auth.config SET security_leaked_password_protection_enabled = true;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RAISE NOTICE 'auth.config not present on this project; enable leaked-password protection via the dashboard (Authentication → Passwords)';
  END;
END $$;
