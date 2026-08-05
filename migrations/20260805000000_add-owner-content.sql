-- Owner content store — single JSONB row per content key (events, overrides, etc.).
-- Only the owner can read/write; other authenticated users see nothing.
--
-- Security model: all access goes through SECURITY DEFINER RPCs that check
-- the caller's email against a hardcoded owner list. RLS blocks direct access.
--
-- IMPORTANT: Replace the owner UUID below with your Supabase auth user's UUID.
-- Find it in: Supabase Dashboard → Authentication → Users → your account → UUID.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS owner_get_content(text);
--   DROP FUNCTION IF EXISTS owner_upsert_content(text, jsonb);
--   DROP TABLE IF EXISTS owner_content;

-- ============================================================
-- owner_content: one row per key, JSONB data blob
-- ============================================================
CREATE TABLE IF NOT EXISTS owner_content (
  id          text PRIMARY KEY,
  data        jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE owner_content ENABLE ROW LEVEL SECURITY;

-- No direct access — all reads/writes go through the RPCs below.
-- (We intentionally create NO permissive policies.)

-- ============================================================
-- Helper: check if the current user is the owner
-- ============================================================
CREATE OR REPLACE FUNCTION _is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IN (
    -- !! REPLACE THIS UUID with your owner account's auth UUID !!
    SELECT id FROM auth.users WHERE email = 'support@focuslily.com'
  );
$$;

-- ============================================================
-- RPC: owner_get_content(key) → returns the data JSONB or null
-- ============================================================
CREATE OR REPLACE FUNCTION owner_get_content(p_key text)
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
  SELECT data INTO result FROM owner_content WHERE id = p_key;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION owner_get_content(text) TO authenticated;

-- ============================================================
-- RPC: owner_upsert_content(key, data) → insert or update
-- ============================================================
CREATE OR REPLACE FUNCTION owner_upsert_content(p_key text, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  INSERT INTO owner_content (id, data, updated_at)
  VALUES (p_key, p_data, now())
  ON CONFLICT (id) DO UPDATE
    SET data = p_data, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION owner_upsert_content(text, jsonb) TO authenticated;

-- ============================================================
-- RPC: owner_delete_content(key) → remove a row
-- ============================================================
CREATE OR REPLACE FUNCTION owner_delete_content(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  DELETE FROM owner_content WHERE id = p_key;
END;
$$;

GRANT EXECUTE ON FUNCTION owner_delete_content(text) TO authenticated;

-- ============================================================
-- RPC: owner_list_keys() → returns all content keys
-- ============================================================
CREATE OR REPLACE FUNCTION owner_list_keys()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text[];
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT array_agg(id) INTO result FROM owner_content;
  RETURN COALESCE(result, ARRAY[]::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION owner_list_keys() TO authenticated;
