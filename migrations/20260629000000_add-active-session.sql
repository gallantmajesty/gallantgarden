-- Focus Lily active session lock: ONE device/browser/tab at a time per user.
--
-- Why this exists
-- ===============
-- To stop spam/abuse we enforce single-session: only the most recent tab/browser/
-- device that claimed the lock may use the app. Every other tab shows a full-screen
-- "Active elsewhere" overlay until the user explicitly moves the session there.
--
-- How it works
-- ============
--   • Each tab generates a random SESSION_ID on mount (crypto.randomUUID()).
--   • On sign-in the tab calls claim_session(session_id, device_label) → upserts the
--     user's single row in active_session with the new token, instantly locking out
--     every other tab/browser/device.
--   • A ~10s heartbeat calls session_heartbeat(session_id) to prove the holder is
--     still alive. If the stored token matches, last_seen_at refreshes; if not the
--     RPC returns false and the tab shows the lock overlay.
--   • Same-browser tabs also coordinate via BroadcastChannel for instant detection
--     (no 10s wait) — see src/lib/session.ts.
--   • The lock overlay shows "Use Focus Lily here" → resumeHere() → claim_session()
--     → steals the lock and the old tab shows the overlay within one heartbeat.
--
-- Security model: RLS enabled, all writes via SECURITY DEFINER RPCs (like chat/realm).
--
-- Rollback
-- ========
--   DROP FUNCTION IF EXISTS release_session();
--   DROP FUNCTION IF EXISTS session_heartbeat(uuid);
--   DROP FUNCTION IF EXISTS claim_session(uuid, text);
--   DROP TABLE IF EXISTS active_session;

-- ============================================================
-- active_session: one row per user → current session holder
-- ============================================================
CREATE TABLE IF NOT EXISTS active_session (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL,
  device_label  text NOT NULL DEFAULT '',
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS active_session_seen_idx ON active_session (last_seen_at);

ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;

-- Users can read their own row to compare tokens, no cross-user reads.
CREATE POLICY as_select ON active_session FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- RPCs (SECURITY DEFINER)
-- ============================================================

-- Claim the session lock for this user+session_id, ALWAYS overwriting any prior
-- holder. Returns true. Used on sign-in and on "Use here" button (steal).
CREATE OR REPLACE FUNCTION claim_session(p_session_id uuid, p_device_label text)
RETURNS boolean AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO active_session (user_id, session_id, device_label, last_seen_at)
    VALUES (me, p_session_id, COALESCE(p_device_label, ''), now())
  ON CONFLICT (user_id)
    DO UPDATE SET session_id = EXCLUDED.session_id,
                  device_label = EXCLUDED.device_label,
                  last_seen_at = now();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Heartbeat: refresh last_seen_at IF the stored token matches p_session_id (proving
-- I still hold the lock). Returns true if I'm still the holder, false if another
-- session stole it (caller shows lock overlay on false).
CREATE OR REPLACE FUNCTION session_heartbeat(p_session_id uuid)
RETURNS boolean AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  current_holder uuid;
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  SELECT session_id INTO current_holder FROM active_session WHERE user_id = me;
  IF current_holder IS NULL OR current_holder <> p_session_id THEN
    RETURN false;
  END IF;
  UPDATE active_session SET last_seen_at = now() WHERE user_id = me;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Release the lock on sign-out (cleanup; also prevents brief flash on re-sign-in).
CREATE OR REPLACE FUNCTION release_session()
RETURNS void AS $$
  DELETE FROM active_session WHERE user_id = (SELECT auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- Grants
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON active_session TO authenticated;

GRANT EXECUTE ON FUNCTION
  claim_session(uuid, text),
  session_heartbeat(uuid),
  release_session()
  TO authenticated;
