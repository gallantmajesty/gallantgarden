-- Focus Lily custom realms: server-side, shareable private/public study worlds.
--
-- Why this exists
-- ===============
-- Custom realms used to live ONLY in the creator's localStorage (src/store/realm.ts),
-- so an "invite" could never resolve on anyone else's device — the realm simply
-- didn't exist for them. This migration persists realms in Postgres with a short
-- shareable `code` (e.g. `midnight-8XK2P`) so a link/code opens the exact same
-- realm for a friend. Visibility controls who may enter:
--   • public  — discoverable by everyone (list_public_realms) and joinable by all.
--   • private — not listed; anyone holding the invite code/link may enter.
--   • friends — not listed; only the owner's friends may enter (code optional).
--
-- `realm_members` is created here too (membership is intrinsic to a realm): it is
-- the roster + role (owner/member) + per-realm mute flag. Phase 3 adds bans and
-- the owner-only moderation RPCs on top, and replaces get_realm_by_code to also
-- reject banned users.
--
-- Security model: reads via RLS SELECT; all writes via SECURITY DEFINER RPCs.
-- Reuses are_friends() from the chat-system migration for `friends` visibility.
--
-- Rollback
-- ========
--   DROP FUNCTION IF EXISTS list_public_realms();
--   DROP FUNCTION IF EXISTS close_realm(uuid);
--   DROP FUNCTION IF EXISTS update_realm(uuid, text, text, int);
--   DROP FUNCTION IF EXISTS get_realm_by_code(text);
--   DROP FUNCTION IF EXISTS create_realm(text, text, int);
--   DROP FUNCTION IF EXISTS realm_owner(uuid);
--   DROP FUNCTION IF EXISTS is_realm_member(uuid);
--   DROP TABLE IF EXISTS realm_members;
--   DROP TABLE IF EXISTS realms;

-- ============================================================
-- realms: a custom world + its shareable invite code + visibility
-- ============================================================
CREATE TABLE IF NOT EXISTS realms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL,                       -- shareable invite, e.g. 'midnight-8xk2p'
  name          text NOT NULL,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world         text NOT NULL DEFAULT 'library',     -- library only for now
  visibility    text NOT NULL DEFAULT 'private',     -- 'public' | 'private' | 'friends'
  player_limit  int  NOT NULL DEFAULT 75,
  created_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,                          -- set when the owner closes the realm
  CHECK (visibility IN ('public', 'private', 'friends')),
  CHECK (player_limit BETWEEN 1 AND 75)
);
CREATE UNIQUE INDEX IF NOT EXISTS realms_code_idx ON realms (lower(code));
CREATE INDEX IF NOT EXISTS realms_discover_idx ON realms (visibility, closed_at);
CREATE INDEX IF NOT EXISTS realms_owner_idx ON realms (owner_id);

-- ============================================================
-- realm_members: roster + role + per-realm mute (moderation RPCs land in Phase 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS realm_members (
  realm_id   uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member',   -- 'owner' | 'member'
  muted      boolean NOT NULL DEFAULT false,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (realm_id, user_id),
  CHECK (role IN ('owner', 'member'))
);
CREATE INDEX IF NOT EXISTS realm_members_user_idx ON realm_members (user_id);

-- ============================================================
-- SECURITY DEFINER helpers (bypass RLS on the tables they read → no recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION is_realm_member(realm uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM realm_members
    WHERE realm_id = realm AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION realm_owner(realm uuid)
RETURNS uuid AS $$
  SELECT owner_id FROM realms WHERE id = realm;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RPCs
-- ============================================================

-- Create a realm owned by the caller. Generates a unique, human-friendly code
-- (name slug + 5 random chars), seeds the owner's membership row, returns the row.
CREATE OR REPLACE FUNCTION create_realm(p_name text, p_visibility text, p_limit int)
RETURNS realms AS $$
DECLARE
  me     uuid := (SELECT auth.uid());
  nm     text := COALESCE(NULLIF(trim(p_name), ''), 'My Realm');
  vis    text := COALESCE(p_visibility, 'private');
  lim    int  := COALESCE(p_limit, 75);
  slug   text;
  code   text;
  tries  int := 0;
  row    realms;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF vis NOT IN ('public', 'private', 'friends') THEN vis := 'private'; END IF;
  IF lim < 1 OR lim > 75 THEN lim := 75; END IF;

  -- name → url-safe slug, capped; fall back to 'realm' when the name is all symbols
  slug := regexp_replace(lower(left(nm, 24)), '[^a-z0-9]+', '-', 'g');
  slug := trim(both '-' from slug);
  IF slug = '' THEN slug := 'realm'; END IF;

  LOOP
    code := slug || '-' || lower(substr(md5(random()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM realms WHERE lower(realms.code) = lower(code));
    tries := tries + 1;
    IF tries > 8 THEN RAISE EXCEPTION 'could not allocate a realm code'; END IF;
  END LOOP;

  INSERT INTO realms (code, name, owner_id, visibility, player_limit)
    VALUES (code, nm, me, vis, lim)
  RETURNING * INTO row;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'owner')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resolve an invite code → the realm, enforcing visibility, and join the caller as
-- a member. (Phase 3 replaces this to also reject banned users.)
--   public  → anyone may enter
--   private → the code itself is the secret, so any code-holder may enter
--   friends → only the owner or a friend of the owner may enter
CREATE OR REPLACE FUNCTION get_realm_by_code(p_code text)
RETURNS realms AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  row  realms;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO row FROM realms WHERE lower(code) = lower(trim(p_code));
  IF row.id IS NULL THEN RAISE EXCEPTION 'realm not found'; END IF;
  IF row.closed_at IS NOT NULL THEN RAISE EXCEPTION 'realm closed'; END IF;

  IF row.visibility = 'friends' AND row.owner_id <> me AND NOT are_friends(me, row.owner_id) THEN
    RAISE EXCEPTION 'friends only';
  END IF;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'member')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Owner-only: rename / change visibility / change player limit.
CREATE OR REPLACE FUNCTION update_realm(p_id uuid, p_name text, p_visibility text, p_limit int)
RETURNS realms AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  row  realms;
BEGIN
  IF me IS NULL OR realm_owner(p_id) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realms SET
    name         = COALESCE(NULLIF(trim(p_name), ''), name),
    visibility   = CASE WHEN p_visibility IN ('public','private','friends') THEN p_visibility ELSE visibility END,
    player_limit = CASE WHEN p_limit BETWEEN 1 AND 75 THEN p_limit ELSE player_limit END
    WHERE id = p_id
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Owner-only: close a realm (soft-close → drops from discovery and rejects joins).
CREATE OR REPLACE FUNCTION close_realm(p_id uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_id) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realms SET closed_at = now() WHERE id = p_id AND closed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Discovery feed: open, public realms, newest first.
CREATE OR REPLACE FUNCTION list_public_realms()
RETURNS SETOF realms AS $$
  SELECT * FROM realms
  WHERE visibility = 'public' AND closed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 60;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE realms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE realm_members ENABLE ROW LEVEL SECURITY;

-- realms: owner sees own; everyone sees public; members see realms they're in.
-- private/friends invites are resolved through get_realm_by_code (SECURITY DEFINER).
CREATE POLICY realm_select ON realms FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR visibility = 'public' OR is_realm_member(id));

-- realm_members: members can read the roster of realms they belong to.
CREATE POLICY realm_member_select ON realm_members FOR SELECT TO authenticated
  USING (is_realm_member(realm_id));

-- ============================================================
-- Grants. SELECT for reads; RPCs run as owner.
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON realms, realm_members TO authenticated;

GRANT EXECUTE ON FUNCTION
  create_realm(text, text, int),
  get_realm_by_code(text),
  update_realm(uuid, text, text, int),
  close_realm(uuid),
  list_public_realms()
  TO authenticated;
