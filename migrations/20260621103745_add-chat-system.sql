-- Focus Lily chat system: friend-only messaging.
--
-- Design notes
-- ============
-- • Friendship is MUTUAL and gated by an explicit request/accept handshake, a
--   layer ABOVE the existing asymmetric `follows` graph. Follow = lightweight
--   public interest; Friend = accepted, chat-enabled relationship.
-- • Conversations are uniform: a `kind` of 'dm' (exactly two friends) or 'group'
--   (friends only, ≤20). v1 ships DM UI; the group shape is schema-ready.
-- • Messages are persisted in Postgres (the source of truth) and the client
--   polls while a chat is open. The schema is realtime-ready: dropping in
--   InsForge realtime later only changes the delivery layer, not the tables.
--
-- Security model
-- ==============
-- READS go through RLS SELECT policies. WRITES go through SECURITY DEFINER RPCs
-- (send_friend_request / respond_friend_request / remove_friend / block_user /
-- get_or_create_dm / send_message) so all the cross-table rules (are-they-
-- friends, are-they-blocked, am-I-a-member) live in ONE place and we never build
-- an RLS-on-RLS recursion chain (messages ↔ conversation_members). The single
-- membership predicate used by policies is the SECURITY DEFINER helper
-- `is_conversation_member()`, which bypasses RLS on the tables it reads.

-- ============================================================
-- profiles: presence + study status (the one cross-user-visible activity state)
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at  timestamptz,
  -- 'available' | 'studying' | 'focus' | 'break' | 'offline'. 'focus' means a
  -- focus session is active → the client silences chat popups for that user.
  ADD COLUMN IF NOT EXISTS study_status  text NOT NULL DEFAULT 'available';

-- Surface presence on the safe public read path so a friend list can show dots.
CREATE OR REPLACE VIEW public_profiles AS
  SELECT
    id, username, display_name, avatar, avatar_url, country, rank,
    public_profile, created_at,
    last_seen_at, study_status
  FROM profiles;

GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;

-- ============================================================
-- friend_requests: a pending/answered handshake (requester -> addressee)
-- ============================================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  CHECK (status IN ('pending', 'accepted', 'declined'))
);
-- One live request per ordered pair (re-request after decline reuses the row).
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pair_idx
  ON friend_requests (requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS friend_requests_addressee_idx
  ON friend_requests (addressee_id, status);

-- ============================================================
-- friendships: ONE symmetric row per pair, canonical order (user_a < user_b)
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  user_a      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX IF NOT EXISTS friendships_user_b_idx ON friendships (user_b);

-- ============================================================
-- blocks: directed. Blocking severs friendship + stops messages/invites/requests
-- ============================================================
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks (blocked_id);

-- ============================================================
-- conversations: a dm (2 members) or group (≤20). dm_key enforces one DM / pair
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL DEFAULT 'dm',       -- 'dm' | 'group'
  title       text,                              -- group only
  icon_url    text,                              -- group only
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- canonical 'minId:maxId' for DMs so a pair can only ever have one; NULL for groups
  dm_key      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),  -- bumped on each new message (sort key)
  CHECK (kind IN ('dm', 'group'))
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_dm_key_idx
  ON conversations (dm_key) WHERE dm_key IS NOT NULL;

-- ============================================================
-- conversation_members: who is in a conversation + their read cursor
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             text NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  -- read cursor: powers unread counts AND the other side's read receipt
  last_read_at     timestamptz NOT NULL DEFAULT now(),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON conversation_members (user_id);

-- ============================================================
-- messages: text body (raw; the word filter is applied at render time)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- Recent-first paging within a conversation (infinite scroll keyset).
CREATE INDEX IF NOT EXISTS messages_convo_time_idx ON messages (conversation_id, created_at DESC);

-- ============================================================
-- reports: lightweight user reports (spam | harassment | inappropriate)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- defaults to the caller so the client insert need only supply reported_id +
  -- reason; the RLS WITH CHECK (reporter_id = auth.uid()) still guards it.
  reporter_id   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        text NOT NULL,        -- 'spam' | 'harassment' | 'inappropriate'
  context       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (reason IN ('spam', 'harassment', 'inappropriate'))
);

-- updated_at auto-touch (set_updated_at() created in the core-schema migration)
DROP TRIGGER IF EXISTS friend_requests_touch ON friend_requests;
CREATE TRIGGER friend_requests_touch BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS conversations_touch ON conversations;
CREATE TRIGGER conversations_touch BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SECURITY DEFINER helpers (bypass RLS on the tables they read → no recursion)
-- ============================================================

-- Canonical pair ordering helper (used by friendship logic).
CREATE OR REPLACE FUNCTION are_friends(a uuid, b uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_a = LEAST(a, b) AND user_b = GREATEST(a, b)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_blocked_either(a uuid, b uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- The ONE membership predicate every conversation/message policy uses.
CREATE OR REPLACE FUNCTION is_conversation_member(conv uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RPCs: all mutations that touch cross-user rules (run as definer/owner)
-- ============================================================

-- Send (or re-send) a friend request. Rejects self, blocked pairs, and already-
-- friends. Re-requesting after a decline resets the row to pending.
CREATE OR REPLACE FUNCTION send_friend_request(addressee uuid)
RETURNS uuid AS $$
DECLARE
  me  uuid := (SELECT auth.uid());
  rid uuid;
BEGIN
  IF me IS NULL OR me = addressee THEN RAISE EXCEPTION 'invalid target'; END IF;
  IF is_blocked_either(me, addressee) THEN RAISE EXCEPTION 'blocked'; END IF;
  IF are_friends(me, addressee) THEN RAISE EXCEPTION 'already friends'; END IF;

  -- If the OTHER side already requested me, accept it instead of duplicating.
  SELECT id INTO rid FROM friend_requests
    WHERE requester_id = addressee AND addressee_id = me AND status = 'pending';
  IF rid IS NOT NULL THEN
    PERFORM respond_friend_request(rid, true);
    RETURN rid;
  END IF;

  INSERT INTO friend_requests (requester_id, addressee_id, status)
    VALUES (me, addressee, 'pending')
  ON CONFLICT (requester_id, addressee_id)
    DO UPDATE SET status = 'pending', updated_at = now()
  RETURNING id INTO rid;
  RETURN rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept or decline a request. Only the addressee may respond. Accept creates the
-- symmetric friendship row (canonical order) idempotently.
CREATE OR REPLACE FUNCTION respond_friend_request(request_id uuid, accept boolean)
RETURNS void AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  req  friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = request_id;
  IF req.id IS NULL OR req.addressee_id <> me THEN RAISE EXCEPTION 'not your request'; END IF;

  IF accept THEN
    INSERT INTO friendships (user_a, user_b)
      VALUES (LEAST(req.requester_id, req.addressee_id), GREATEST(req.requester_id, req.addressee_id))
    ON CONFLICT DO NOTHING;
    UPDATE friend_requests SET status = 'accepted' WHERE id = request_id;
  ELSE
    UPDATE friend_requests SET status = 'declined' WHERE id = request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a friend (either party). Drops the friendship; any DM history remains
-- but sending is blocked until they re-friend (enforced in send_message).
CREATE OR REPLACE FUNCTION remove_friend(other uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  DELETE FROM friendships
    WHERE user_a = LEAST(me, other) AND user_b = GREATEST(me, other);
  DELETE FROM friend_requests
    WHERE (requester_id = me AND addressee_id = other)
       OR (requester_id = other AND addressee_id = me);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Block a user: severs friendship, cancels requests both ways, records the block.
CREATE OR REPLACE FUNCTION block_user(target uuid)
RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR me = target THEN RAISE EXCEPTION 'invalid target'; END IF;
  DELETE FROM friendships
    WHERE user_a = LEAST(me, target) AND user_b = GREATEST(me, target);
  DELETE FROM friend_requests
    WHERE (requester_id = me AND addressee_id = target)
       OR (requester_id = target AND addressee_id = me);
  INSERT INTO blocks (blocker_id, blocked_id) VALUES (me, target)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unblock_user(target uuid)
RETURNS void AS $$
  DELETE FROM blocks WHERE blocker_id = (SELECT auth.uid()) AND blocked_id = target;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get (or atomically create) the single DM conversation for me+other. Requires an
-- active friendship and no block. Returns the conversation id.
CREATE OR REPLACE FUNCTION get_or_create_dm(other uuid)
RETURNS uuid AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  key  text := LEAST(me, other)::text || ':' || GREATEST(me, other)::text;
  cid  uuid;
BEGIN
  IF me IS NULL OR me = other THEN RAISE EXCEPTION 'invalid target'; END IF;
  IF NOT are_friends(me, other) THEN RAISE EXCEPTION 'not friends'; END IF;
  IF is_blocked_either(me, other) THEN RAISE EXCEPTION 'blocked'; END IF;

  SELECT id INTO cid FROM conversations WHERE dm_key = key;
  IF cid IS NOT NULL THEN RETURN cid; END IF;

  INSERT INTO conversations (kind, created_by, dm_key) VALUES ('dm', me, key)
    RETURNING id INTO cid;
  INSERT INTO conversation_members (conversation_id, user_id, role) VALUES
    (cid, me, 'owner'), (cid, other, 'member')
    ON CONFLICT DO NOTHING;
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send a message. Validates membership and (for DMs) live friendship + no block.
-- Bumps the conversation's updated_at so chat lists sort by recency. Returns the row.
CREATE OR REPLACE FUNCTION send_message(conversation uuid, body text)
RETURNS messages AS $$
DECLARE
  me    uuid := (SELECT auth.uid());
  conv  conversations%ROWTYPE;
  other uuid;
  row   messages;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(trim(body)) = 0 THEN RAISE EXCEPTION 'empty message'; END IF;
  IF NOT is_conversation_member(conversation) THEN RAISE EXCEPTION 'not a member'; END IF;

  SELECT * INTO conv FROM conversations WHERE id = conversation;
  IF conv.kind = 'dm' THEN
    SELECT user_id INTO other FROM conversation_members
      WHERE conversation_id = conversation AND user_id <> me LIMIT 1;
    IF other IS NULL OR NOT are_friends(me, other) THEN RAISE EXCEPTION 'not friends'; END IF;
    IF is_blocked_either(me, other) THEN RAISE EXCEPTION 'blocked'; END IF;
  END IF;

  INSERT INTO messages (conversation_id, sender_id, body)
    VALUES (conversation, me, left(body, 4000))
  RETURNING * INTO row;

  UPDATE conversations SET updated_at = now() WHERE id = conversation;
  -- sender has implicitly read their own message
  UPDATE conversation_members SET last_read_at = now()
    WHERE conversation_id = conversation AND user_id = me;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE friend_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports              ENABLE ROW LEVEL SECURITY;

-- friend_requests: each party may read their own (in/out). Writes via RPC only.
DROP POLICY IF EXISTS fr_select ON friend_requests;
CREATE POLICY fr_select ON friend_requests FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (requester_id, addressee_id));

-- friendships: read your own edges. Writes via RPC only.
DROP POLICY IF EXISTS fs_select ON friendships;
CREATE POLICY fs_select ON friendships FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (user_a, user_b));

-- blocks: read only your own outgoing blocks. Writes via RPC only.
DROP POLICY IF EXISTS bl_select ON blocks;
CREATE POLICY bl_select ON blocks FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = blocker_id);

-- conversations: visible to members. Writes via RPC only.
DROP POLICY IF EXISTS cv_select ON conversations;
CREATE POLICY cv_select ON conversations FOR SELECT TO authenticated
  USING (is_conversation_member(id));

-- conversation_members: members can see the roster of conversations they're in.
-- last_read_at update lets the client move its OWN read cursor (read receipts).
DROP POLICY IF EXISTS cm_select ON conversation_members;
CREATE POLICY cm_select ON conversation_members FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id));
DROP POLICY IF EXISTS cm_update_own ON conversation_members;
CREATE POLICY cm_update_own ON conversation_members FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- messages: members read history. Writes via send_message RPC only.
DROP POLICY IF EXISTS msg_select ON messages;
CREATE POLICY msg_select ON messages FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id));

-- reports: a user may file (and read back) their own reports.
DROP POLICY IF EXISTS rp_select ON reports;
CREATE POLICY rp_select ON reports FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS rp_insert ON reports;
CREATE POLICY rp_insert ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

-- ============================================================
-- Grants. SELECT (+ the few direct writes) for authenticated; RPCs run as owner.
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON friend_requests, friendships, blocks, conversations, messages TO authenticated;
GRANT SELECT, UPDATE ON conversation_members TO authenticated;  -- UPDATE = own read cursor
GRANT SELECT, INSERT ON reports TO authenticated;

GRANT EXECUTE ON FUNCTION
  send_friend_request(uuid), respond_friend_request(uuid, boolean),
  remove_friend(uuid), block_user(uuid), unblock_user(uuid),
  get_or_create_dm(uuid), send_message(uuid, text)
  TO authenticated;
