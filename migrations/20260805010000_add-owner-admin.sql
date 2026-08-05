-- Owner admin HQ — SECURITY DEFINER RPCs for managing other users.
--
-- Reuses _is_owner() from 20260805000000_add-owner-content.sql (checks the
-- caller's email against the hardcoded owner address). Only the owner can
-- call these; RLS blocks direct table access.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS admin_list_users();
--   DROP FUNCTION IF EXISTS admin_get_user(uuid);
--   DROP FUNCTION IF EXISTS admin_grant_wallets(uuid, int, int, int);
--   DROP FUNCTION IF EXISTS admin_set_inventory(uuid, jsonb);
--   DROP FUNCTION IF EXISTS admin_set_achievements(uuid, jsonb);
--   DROP FUNCTION IF EXISTS admin_set_profile_field(uuid, text, jsonb);
--   DROP FUNCTION IF EXISTS admin_delete_user(uuid);

-- ============================================================
-- admin_list_users() → lightweight roster for the HQ list
-- ============================================================
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id            uuid,
  player_id     text,
  display_name  text,
  xp            integer,
  premium_xp    integer,
  rank_xp       integer,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
    SELECT p.id, p.player_id, p.display_name, p.xp, p.premium_xp, p.rank_xp, p.created_at
    FROM profiles p
    ORDER BY p.rank_xp DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;

-- ============================================================
-- admin_get_user(uuid) → full profile blob (incl. inventory + achievements)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT to_jsonb(p) INTO result FROM profiles p WHERE p.id = p_user_id;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user(uuid) TO authenticated;

-- ============================================================
-- admin_grant_wallets(uuid, xp, premium_xp, rank_xp)
-- Adds (can be negative to deduct) leaves / gold / rank XP.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_grant_wallets(
  p_user_id    uuid,
  p_xp         int DEFAULT 0,
  p_premium_xp int DEFAULT 0,
  p_rank_xp    int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE profiles SET
    xp         = GREATEST(0, xp + p_xp),
    premium_xp = GREATEST(0, premium_xp + p_premium_xp),
    rank_xp    = GREATEST(0, rank_xp + p_rank_xp)
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_grant_wallets(uuid, int, int, int) TO authenticated;

-- ============================================================
-- admin_set_inventory(uuid, jsonb) → replace the user's inventory
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_inventory(p_user_id uuid, p_inventory jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE profiles SET inventory = p_inventory WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_inventory(uuid, jsonb) TO authenticated;

-- ============================================================
-- admin_set_achievements(uuid, jsonb) → replace the user's achievements
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_achievements(p_user_id uuid, p_achievements jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE profiles SET achievements = p_achievements WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_achievements(uuid, jsonb) TO authenticated;

-- ============================================================
-- admin_set_profile_field(uuid, field, value) → generic safe update
-- Whitelisted fields only; anything else is rejected.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_profile_field(p_user_id uuid, p_field text, p_value jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_field = 'display_name' THEN
    UPDATE profiles SET display_name = (p_value #>> '{}') WHERE id = p_user_id;
  ELSIF p_field = 'public_profile' THEN
    UPDATE profiles SET public_profile = (p_value #>> '{}')::boolean WHERE id = p_user_id;
  ELSIF p_field = 'country' THEN
    UPDATE profiles SET country = (p_value #>> '{}') WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'field not allowed';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_profile_field(uuid, text, jsonb) TO authenticated;

-- ============================================================
-- admin_delete_user(uuid) → hard-delete the account (auth + profile)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_user(uuid) TO authenticated;
