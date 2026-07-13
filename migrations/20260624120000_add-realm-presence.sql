-- Focus Lily realm presence: the server source of truth for "who is in which
-- realm instance right now."
--
-- Why this exists
-- ===============
-- Realm multiplayer itself runs over ephemeral InsForge realtime broadcast
-- (see src/multiplayer/net.ts) — great for movement, but it keeps NO history
-- (`retention_days = 0`) and exposes no "list everyone in channel X" query. So
-- there is no way, from realtime alone, to:
--   • show a pre-join occupancy count ("Forest Hall — 42/50"),
--   • enforce a per-room capacity, or
--   • auto-instance a busy room into Forest Hall #1, #2, #3…
--
-- This table is that missing source of truth. Each signed-in player has at most
-- ONE row (they are in one realm at a time). A short heartbeat keeps it fresh;
-- a row counts as "present" only while `last_seen_at` is within ACTIVE_WINDOW
-- (30s), so crashes / closed tabs fall out automatically with no cleanup job.
--
-- Guests (signed-out) cannot write here (RLS needs auth.uid()); they still
-- appear to others over realtime, they simply don't contribute to DB occupancy.
-- The overwhelming majority of sessions are authenticated, so capacity and
-- instancing decisions remain accurate in practice.
--
-- Security model: reads go through an RLS SELECT policy (counts are non-secret);
-- every WRITE goes through a SECURITY DEFINER RPC, matching the chat system.
--
-- Rollback
-- ========
--   DROP FUNCTION IF EXISTS realm_occupancy(text);
--   DROP FUNCTION IF EXISTS leave_realm_presence();
--   DROP FUNCTION IF EXISTS realm_heartbeat(text, int);
--   DROP FUNCTION IF EXISTS assign_realm_instance(text, int);
--   DROP TABLE IF EXISTS realm_presence;

-- ============================================================
-- realm_presence: one live row per player → their current realm + instance
-- ============================================================
CREATE TABLE IF NOT EXISTS realm_presence (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- logical realm, WITHOUT the instance suffix: 'lib:forest-hall' | 'custom:<realmId>'
  room_key      text NOT NULL,
  instance      int  NOT NULL DEFAULT 1,
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
-- Fast live-occupancy counts per (room, instance) within the active window.
CREATE INDEX IF NOT EXISTS realm_presence_room_idx
  ON realm_presence (room_key, instance, last_seen_at);

ALTER TABLE realm_presence ENABLE ROW LEVEL SECURITY;

-- Occupancy counts are not secret — any signed-in user may read them (the chooser
-- needs them before joining). All writes are funnelled through the RPCs below.
CREATE POLICY rp_select ON realm_presence FOR SELECT TO authenticated USING (true);

-- ============================================================
-- RPCs (SECURITY DEFINER → run as owner, bypass RLS for the write)
-- ============================================================

-- The join choke-point: pick an instance of p_room_key that has room (< capacity)
-- and claim a presence slot in it. Returns the chosen instance number.
--   • Counts only OTHER players seen within the 30s active window.
--   • Returns the LOWEST instance with free space; if every existing instance is
--     full it returns max(instance)+1 (a brand-new instance) → auto-instancing.
--   • Upserts the caller's single presence row to the chosen (room_key, instance).
CREATE OR REPLACE FUNCTION assign_realm_instance(p_room_key text, p_capacity int)
RETURNS int AS $$
DECLARE
  me      uuid := (SELECT auth.uid());
  chosen  int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_capacity IS NULL OR p_capacity < 1 THEN p_capacity := 75; END IF;

  WITH live AS (
    SELECT instance, count(*) AS c
    FROM realm_presence
    WHERE room_key = p_room_key
      AND user_id <> me
      AND last_seen_at > now() - interval '30 seconds'
    GROUP BY instance
  ),
  maxinst AS (SELECT COALESCE(MAX(instance), 0) AS m FROM live),
  candidates AS (
    SELECT gs AS instance FROM generate_series(1, (SELECT m FROM maxinst) + 1) AS gs
  )
  SELECT MIN(c.instance) INTO chosen
  FROM candidates c
  LEFT JOIN live l ON l.instance = c.instance
  WHERE COALESCE(l.c, 0) < p_capacity;

  chosen := COALESCE(chosen, 1);

  INSERT INTO realm_presence (user_id, room_key, instance, last_seen_at)
    VALUES (me, p_room_key, chosen, now())
  ON CONFLICT (user_id)
    DO UPDATE SET room_key = EXCLUDED.room_key, instance = EXCLUDED.instance, last_seen_at = now();

  RETURN chosen;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the caller's presence row fresh while they stay in a realm (~20s loop).
-- Doubles as a re-claim if the row was pruned, so presence self-heals.
CREATE OR REPLACE FUNCTION realm_heartbeat(p_room_key text, p_instance int)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  INSERT INTO realm_presence (user_id, room_key, instance, last_seen_at)
    VALUES (me, p_room_key, COALESCE(p_instance, 1), now())
  ON CONFLICT (user_id)
    DO UPDATE SET room_key = EXCLUDED.room_key, instance = EXCLUDED.instance, last_seen_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the caller's presence row on leave (closing tab also clears it via the
-- 30s active window, but an explicit leave makes the count instantly accurate).
CREATE OR REPLACE FUNCTION leave_realm_presence()
RETURNS void AS $$
  DELETE FROM realm_presence WHERE user_id = (SELECT auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- Live occupancy per instance for a room, as a JSON array sorted by instance:
--   [{ "instance": 1, "count": 42 }, { "instance": 2, "count": 7 }]
-- Used by the realm chooser to show counts and "opening a new room" hints.
CREATE OR REPLACE FUNCTION realm_occupancy(p_room_key text)
RETURNS jsonb AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('instance', instance, 'count', c) ORDER BY instance),
    '[]'::jsonb
  )
  FROM (
    SELECT instance, count(*) AS c
    FROM realm_presence
    WHERE room_key = p_room_key
      AND last_seen_at > now() - interval '30 seconds'
    GROUP BY instance
  ) q;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Grants. SELECT for reads; RPCs run as owner.
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON realm_presence TO authenticated;

GRANT EXECUTE ON FUNCTION
  assign_realm_instance(text, int),
  realm_heartbeat(text, int),
  leave_realm_presence(),
  realm_occupancy(text)
  TO authenticated;
