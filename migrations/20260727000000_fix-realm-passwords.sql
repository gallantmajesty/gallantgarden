-- Fix realm passwords: store as bcrypt hash instead of plaintext
-- Run this migration AFTER the realm redesign migration

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add a new column for password hash (keep old for migration)
ALTER TABLE realms ADD COLUMN IF NOT EXISTS password_hash text;

-- Update existing realms: hash their current plaintext passwords
UPDATE realms
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL AND password <> '';

-- Drop the plaintext password column
ALTER TABLE realms DROP COLUMN IF EXISTS password;

-- Rename password_hash to password (for backward compatibility with code)
ALTER TABLE realms RENAME COLUMN password_hash TO password;

-- Now recreate the RPCs to use hash comparison
-- ============================================================
-- 3. Replace create_realm: hash password on insert
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
  p_hash text;
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

  -- Hash the password if provided
  p_hash := CASE
    WHEN p_password IS NOT NULL AND trim(p_password) <> ''
    THEN crypt(trim(p_password), gen_salt('bf', 10))
    ELSE NULL
  END;

  INSERT INTO realms (code, name, owner_id, visibility, player_limit, password, expires_at)
    VALUES (code, nm, me, vis, lim, p_hash, now() + interval '24 hours')
  RETURNING * INTO row;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'owner')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. Replace get_realm_by_code: verify password using hash comparison
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

  -- Check password using hash comparison (only if realm has a password set)
  IF row.password IS NOT NULL AND row.password <> '' THEN
    IF p_password IS NULL OR trim(p_password) = '' THEN
      RAISE EXCEPTION 'password required';
    END IF;
    IF row.password <> crypt(trim(p_password), row.password) THEN
      RAISE EXCEPTION 'wrong password';
    END IF;
  END IF;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'member')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Replace update_realm to handle password hashing
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
  p_hash text;
BEGIN
  IF me IS NULL OR realm_owner(p_id) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;

  p_hash := CASE
    WHEN p_password IS NOT NULL AND trim(p_password) <> ''
    THEN crypt(trim(p_password), gen_salt('bf', 10))
    WHEN p_password IS NOT NULL AND trim(p_password) = ''
    THEN NULL  -- Explicitly clear password if empty string passed
    ELSE NULL  -- Don't change password if not provided (use CASE in UPDATE)
  END;

  UPDATE realms SET
    name         = COALESCE(NULLIF(trim(p_name), ''), name),
    visibility   = CASE WHEN p_visibility IN ('public','private') THEN p_visibility ELSE visibility END,
    player_limit = CASE WHEN p_limit BETWEEN 1 AND 75 THEN p_limit ELSE player_limit END,
    password     = CASE
                     WHEN p_password IS NOT NULL AND trim(p_password) <> ''
                     THEN p_hash
                     WHEN p_password IS NOT NULL AND trim(p_password) = ''
                     THEN NULL
                     ELSE password
                   END
    WHERE id = p_id
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION
  create_realm(text, text, int, text),
  get_realm_by_code(text, text),
  update_realm(uuid, text, text, int, text),
  search_public_realms(text)
  TO authenticated;