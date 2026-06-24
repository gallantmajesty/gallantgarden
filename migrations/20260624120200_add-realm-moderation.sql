-- Focus Lily realm moderation: owner powers over a custom realm.
--
-- Why this exists
-- ===============
-- The creator of a custom realm is its owner (realm_members.role = 'owner', seeded
-- in the realms migration). This migration gives the owner real control:
--   • kick   — remove a member now (they may rejoin unless banned)
--   • ban    — remove + block future joins (persisted in realm_bans)
--   • mute   — flag a member muted (realm_members.muted; gates realm broadcast)
--   • transfer ownership — hand the realm to another member
--   • (close / visibility / player-limit live in the realms migration: close_realm,
--      update_realm)
--
-- Enforcement split:
--   • PERSISTENCE is here (these RPCs) — bans survive, mutes survive, roster updates.
--   • INSTANT effect (a kicked client actually leaving) is delivered over realtime:
--     the owner ALSO broadcasts a `kick`/`mute`/`owner` control event on the realm
--     channel (see src/multiplayer/net.ts). The realtime broadcast can't be trusted
--     alone (a hacked client could ignore it), so the ban list is the durable guard
--     at the join RPC.
--
-- This migration also REPLACES get_realm_by_code (from the realms migration) to
-- reject banned users at the join choke-point.
--
-- Rollback
-- ========
--   -- restore the non-ban-checking get_realm_by_code from ..._add-realms.sql
--   DROP FUNCTION IF EXISTS list_realm_members(uuid);
--   DROP FUNCTION IF EXISTS transfer_realm_ownership(uuid, uuid);
--   DROP FUNCTION IF EXISTS unmute_member(uuid, uuid);
--   DROP FUNCTION IF EXISTS mute_member(uuid, uuid);
--   DROP FUNCTION IF EXISTS unban_member(uuid, uuid);
--   DROP FUNCTION IF EXISTS ban_member(uuid, uuid);
--   DROP FUNCTION IF EXISTS kick_member(uuid, uuid);
--   DROP FUNCTION IF EXISTS is_realm_banned(uuid, uuid);
--   DROP TABLE IF EXISTS realm_bans;

-- ============================================================
-- realm_bans: persistent per-realm ban list
-- ============================================================
CREATE TABLE IF NOT EXISTS realm_bans (
  realm_id    uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (realm_id, user_id)
);
CREATE INDEX IF NOT EXISTS realm_bans_user_idx ON realm_bans (user_id);

ALTER TABLE realm_bans ENABLE ROW LEVEL SECURITY;
-- Members of a realm can read its ban list (owner needs it; harmless to members).
CREATE POLICY realm_ban_select ON realm_bans FOR SELECT TO authenticated
  USING (is_realm_member(realm_id));

CREATE OR REPLACE FUNCTION is_realm_banned(realm uuid, uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM realm_bans WHERE realm_id = realm AND user_id = uid);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Owner-only moderation RPCs. Each asserts the caller owns the realm and that the
-- target is not the owner themselves. They drop the target's presence row for this
-- realm so occupancy/roster update immediately; the realtime `kick` event does the
-- live disconnect.
-- ============================================================

CREATE OR REPLACE FUNCTION kick_member(p_realm uuid, p_user uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'cannot kick yourself'; END IF;
  DELETE FROM realm_members  WHERE realm_id = p_realm AND user_id = p_user;
  DELETE FROM realm_presence WHERE user_id = p_user AND room_key = 'custom:' || p_realm::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ban_member(p_realm uuid, p_user uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  INSERT INTO realm_bans (realm_id, user_id, banned_by) VALUES (p_realm, p_user, me)
    ON CONFLICT DO NOTHING;
  DELETE FROM realm_members  WHERE realm_id = p_realm AND user_id = p_user;
  DELETE FROM realm_presence WHERE user_id = p_user AND room_key = 'custom:' || p_realm::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unban_member(p_realm uuid, p_user uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  DELETE FROM realm_bans WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mute_member(p_realm uuid, p_user uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'cannot mute yourself'; END IF;
  UPDATE realm_members SET muted = true WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unmute_member(p_realm uuid, p_user uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realm_members SET muted = false WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hand ownership to another member: flips realms.owner_id and the two role rows.
CREATE OR REPLACE FUNCTION transfer_realm_ownership(p_realm uuid, p_user uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'already the owner'; END IF;
  IF NOT EXISTS (SELECT 1 FROM realm_members WHERE realm_id = p_realm AND user_id = p_user) THEN
    RAISE EXCEPTION 'target is not a member';
  END IF;
  UPDATE realms SET owner_id = p_user WHERE id = p_realm;
  UPDATE realm_members SET role = 'member' WHERE realm_id = p_realm AND user_id = me;
  UPDATE realm_members SET role = 'owner'  WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Roster for the owner's Members panel: every member's role + mute + ban state.
CREATE OR REPLACE FUNCTION list_realm_members(p_realm uuid)
RETURNS TABLE (user_id uuid, role text, muted boolean, banned boolean, joined_at timestamptz) AS $$
  SELECT m.user_id, m.role, m.muted,
         EXISTS (SELECT 1 FROM realm_bans b WHERE b.realm_id = m.realm_id AND b.user_id = m.user_id) AS banned,
         m.joined_at
  FROM realm_members m
  WHERE m.realm_id = p_realm AND is_realm_member(p_realm)
  ORDER BY (m.role = 'owner') DESC, m.joined_at ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- REPLACE get_realm_by_code to also reject banned users (otherwise identical to
-- the version in ..._add-realms.sql).
-- ============================================================
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
  IF is_realm_banned(row.id, me) THEN RAISE EXCEPTION 'banned'; END IF;

  IF row.visibility = 'friends' AND row.owner_id <> me AND NOT are_friends(me, row.owner_id) THEN
    RAISE EXCEPTION 'friends only';
  END IF;

  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'member')
    ON CONFLICT DO NOTHING;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT ON realm_bans TO authenticated;

GRANT EXECUTE ON FUNCTION
  kick_member(uuid, uuid),
  ban_member(uuid, uuid),
  unban_member(uuid, uuid),
  mute_member(uuid, uuid),
  unmute_member(uuid, uuid),
  transfer_realm_ownership(uuid, uuid),
  list_realm_members(uuid)
  TO authenticated;
