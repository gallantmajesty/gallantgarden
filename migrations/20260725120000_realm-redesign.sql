-- Realm redesign: 7-digit codes, passwords, 24h expiry, search.
--
-- Changes:
--   1. Add `password` (text) and `expires_at` (timestamptz) columns to `realms`.
--   2. Remove 'friends' from visibility CHECK (only 'public' / 'private').
--   3. Replace create_realm: generates 7-digit numeric code, accepts password,
--      sets expires_at = now + 24h, auto-closes any existing active realm by
--      the same user (one realm per user limit).
--   4. Replace get_realm_by_code: verifies password, checks expiry.
--   5. Add search_public_realms(p_query) RPC for name search.
--   6. Replace list_public_realms to exclude expired realms.
--   7. Update update_realm to handle new fields.

-- ============================================================
-- 1. Add columns
-- ============================================================
ALTER TABLE realms ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE realms ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ============================================================
-- 2. Remove 'friends' from visibility CHECK
-- ============================================================
ALTER TABLE realms DROP CONSTRAINT IF EXISTS realms_visibility_check;
ALTER TABLE realms ADD CONSTRAINT realms_visibility_check
  CHECK (visibility IN ('public', 'private'));

-- ============================================================
-- 3. Replace create_realm
-- ============================================================
CREATE OR REPLACE FUNCTION create_realm(
  p_name text,
  p_visibility text,
  p_limit int,
  p_password text DEFAULT NULL
)
RETURNS realms AS $$
DECLARE
  me     uuid := (SELECT auth.uid());
  nm     text := COALESCE(NULLIF(trim(p_name), ''), 'My Realm');
  vis    text := COALESCE(p_visibility, 'private');
  lim    int  := COALESCE(p_limit, 75);
  code   text;
  tries  int := 0;
  row    realms;
  old_realm RECORD;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF vis NOT IN ('public', 'private') THEN vis := 'private'; END IF;
  IF lim < 1 OR lim > 75 THEN lim := 75; END IF;

  -- One realm per user: auto-close any existing active realm
  FOR old_realm IN
    SELECT id FROM realms
    WHERE owner_id = me AND closed_at IS NULL
  LOOP
    UPDATE realms SET closed_at = now() WHERE id = old_realm.id;
    DELETE FROM realm_members WHERE realm_id = old_realm.id;
  END LOOP;

  -- Generate a random 7-digit numeric code
  LOOP
    code := lpad(floor(random() * 9000000 + 1000000)::text, 7, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM realms WHERE realms.code = code);
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'could not allocate a realm code'; END IF;
  END LOOP;

  INSERT INTO realms (code, name, owner_id, visibility, player_limit, password, expires_at)
    VALUES (code, nm, me, vis, lim, NULLIF(trim(p_password), ''), now() + interval '24 hours')
  RETURNING * INTO row;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'owner')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Replace get_realm_by_code — now with password + expiry check
-- ============================================================
CREATE OR REPLACE FUNCTION get_realm_by_code(p_code text, p_password text DEFAULT NULL)
RETURNS realms AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  row  realms;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO row FROM realms WHERE code = trim(p_code);
  IF row.id IS NULL THEN RAISE EXCEPTION 'realm not found'; END IF;
  IF row.closed_at IS NOT NULL THEN RAISE EXCEPTION 'realm closed'; END IF;

  -- Check expiry
  IF row.expires_at IS NOT NULL AND row.expires_at < now() THEN
    RAISE EXCEPTION 'realm expired';
  END IF;

  -- Check password (only if the realm has one set)
  IF row.password IS NOT NULL AND row.password <> '' THEN
    IF p_password IS NULL OR trim(p_password) <> row.password THEN
      RAISE EXCEPTION 'wrong password';
    END IF;
  END IF;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'member')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Search public realms by name
-- ============================================================
CREATE OR REPLACE FUNCTION search_public_realms(p_query text)
RETURNS SETOF realms AS $$
  -- p_query is a bound parameter (no SQL injection), but escape LIKE
  -- wildcards so user input matches literally instead of broadening the
  -- pattern (e.g. "%_" can't be used to force a full-table match).
  SELECT * FROM realms
  WHERE visibility = 'public'
    AND closed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND name ILIKE '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  ORDER BY created_at DESC
  LIMIT 30;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 6. Replace list_public_realms — exclude expired
-- ============================================================
CREATE OR REPLACE FUNCTION list_public_realms()
RETURNS SETOF realms AS $$
  SELECT * FROM realms
  WHERE visibility = 'public'
    AND closed_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 60;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 7. Update update_realm to handle new fields
-- ============================================================
CREATE OR REPLACE FUNCTION update_realm(
  p_id uuid,
  p_name text,
  p_visibility text,
  p_limit int,
  p_password text DEFAULT NULL
)
RETURNS realms AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  row  realms;
BEGIN
  IF me IS NULL OR realm_owner(p_id) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realms SET
    name         = COALESCE(NULLIF(trim(p_name), ''), name),
    visibility   = CASE WHEN p_visibility IN ('public','private') THEN p_visibility ELSE visibility END,
    player_limit = CASE WHEN p_limit BETWEEN 1 AND 75 THEN p_limit ELSE player_limit END,
    password     = CASE
                     WHEN p_password IS NOT NULL THEN NULLIF(trim(p_password), '')
                     ELSE password
                   END
    WHERE id = p_id
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Update grants
-- ============================================================
GRANT EXECUTE ON FUNCTION
  create_realm(text, text, int, text),
  get_realm_by_code(text, text),
  update_realm(uuid, text, text, int, text),
  search_public_realms(text)
  TO authenticated;
