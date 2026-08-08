-- Focus Lily — chat upgrade: rich messages, group chat, reactions, media.
--
-- Apply this in the Supabase SQL editor, then redeploy via Vercel/GitHub.
-- Everything here is additive and degrades gracefully: old text-only message
-- rows (no kind/attachment_url/meta columns) still parse fine on the client.
--
-- What this unlocks:
--   • Group conversations (create by name, join by shareable Group ID)
--   • Images / stickers / link previews sent as messages
--   • Emoji reactions
--   • Edit / delete (soft) / reply / typing indicators
--   • A public `chat-media` storage bucket for uploaded chat images

-- ============================================================
-- 1. messages: rich payload columns (all nullable, backward safe)
-- ============================================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS kind         text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS meta         jsonb,
  ADD COLUMN IF NOT EXISTS reply_to     uuid REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at    timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at   timestamptz;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_kind_check;
ALTER TABLE messages
  ADD CONSTRAINT messages_kind_check
  CHECK (kind IN ('text', 'image', 'sticker', 'link', 'system'));

-- Allow image/sticker/link messages to have an empty body.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_body_len;
-- NOT VALID: never blocks the migration on legacy rows (older send paths capped
-- at 4000 chars). New rows are still capped at 2000 by send_message_rich.
ALTER TABLE messages
  ADD CONSTRAINT messages_body_len CHECK (char_length(body) <= 2000) NOT VALID;

CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON messages (reply_to);

-- ============================================================
-- 2. conversations: group fields (shareable id, description, limit)
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS join_code    text UNIQUE,
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS member_limit int NOT NULL DEFAULT 50;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_member_limit_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_member_limit_check
  CHECK (member_limit BETWEEN 2 AND 200);

-- ============================================================
-- 3. conversation_members: promote role to a 3-tier enum
-- ============================================================
ALTER TABLE conversation_members
  DROP CONSTRAINT IF EXISTS conversation_members_role_check;
ALTER TABLE conversation_members
  ALTER COLUMN role TYPE text;
ALTER TABLE conversation_members
  ADD CONSTRAINT conversation_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

-- ============================================================
-- 4. reactions
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS message_reactions_msg_idx ON message_reactions (message_id);

-- is_conversation_member() expects a conversation id; resolve the message first.
CREATE OR REPLACE FUNCTION is_reaction_member(msg uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = msg AND is_conversation_member(m.conversation_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mr_select ON message_reactions;
CREATE POLICY mr_select ON message_reactions FOR SELECT TO authenticated
  USING (is_reaction_member(message_id));
DROP POLICY IF EXISTS mr_upsert ON message_reactions;
CREATE POLICY mr_upsert ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (is_reaction_member(message_id) AND user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS mr_delete ON message_reactions;
CREATE POLICY mr_delete ON message_reactions FOR DELETE TO authenticated
  USING (is_reaction_member(message_id) AND user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT, DELETE ON message_reactions TO authenticated;

-- ============================================================
-- 5. typing presence (ephemeral, last-typing timestamp per member)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_typing (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conversation_typing_conv_idx ON conversation_typing (conversation_id);
ALTER TABLE conversation_typing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ct_select ON conversation_typing;
CREATE POLICY ct_select ON conversation_typing FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id));
DROP POLICY IF EXISTS ct_upsert ON conversation_typing;
CREATE POLICY ct_upsert ON conversation_typing FOR INSERT TO authenticated
  WITH CHECK (is_conversation_member(conversation_id) AND user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS ct_update ON conversation_typing;
CREATE POLICY ct_update ON conversation_typing FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT, UPDATE ON conversation_typing TO authenticated;

-- ============================================================
-- 6. RPC: create_group — friends-only, ≤ member_limit, returns the conv
-- ============================================================
CREATE OR REPLACE FUNCTION create_group(
  p_title       text,
  p_description text DEFAULT '',
  p_member_ids  uuid[] DEFAULT '{}',
  p_member_limit int DEFAULT 50
)
RETURNS conversations AS $$
DECLARE
  me    uuid := (SELECT auth.uid());
  title text := left(btrim(coalesce(p_title, '')), 40);
  conv  conversations;
  cid   uuid;
  code  text;
  m     uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF title = '' THEN RAISE EXCEPTION 'group needs a name'; END IF;
  IF check_rate_limit('group_create', 5) = false THEN
    RAISE EXCEPTION 'rate limit exceeded: too many groups';
  END IF;
  IF p_member_limit < 2 OR p_member_limit > 200 THEN
    p_member_limit := 50;
  END IF;

  -- unique shareable Group ID like "FL-7K2QX9"
  LOOP
    code := 'FL-' || upper(substring(md5(random()::text || me::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM conversations WHERE join_code = code);
  END LOOP;

  INSERT INTO conversations (kind, title, description, created_by, member_limit, join_code)
    VALUES ('group', title, left(coalesce(p_description, ''), 140), me, p_member_limit, code)
    RETURNING * INTO conv;
  cid := conv.id;

  INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (cid, me, 'owner');

  FOREACH m IN ARRAY p_member_ids
  LOOP
    IF m IS DISTINCT FROM me AND are_friends(me, m)
       AND NOT is_blocked_either(me, m) THEN
      INSERT INTO conversation_members (conversation_id, user_id, role)
        VALUES (cid, m, 'member')
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO messages (conversation_id, sender_id, kind, body)
    VALUES (cid, me, 'system', 'Group "' || title || '" created');

  RETURN conv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_group(text, text, uuid[], int) TO authenticated;

-- ============================================================
-- 7. RPC: join_group — join by Group ID (you must be a friend of the host)
-- ============================================================
CREATE OR REPLACE FUNCTION join_group(p_code text)
RETURNS conversations AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  code text := upper(btrim(coalesce(p_code, '')));
  conv conversations;
  host uuid;
  cnt  int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO conv FROM conversations WHERE join_code = code;
  IF conv.id IS NULL THEN RAISE EXCEPTION 'invalid group id'; END IF;

  IF EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conv.id AND user_id = me) THEN
    RETURN conv;
  END IF;

  SELECT user_id INTO host FROM conversation_members
    WHERE conversation_id = conv.id AND role = 'owner' LIMIT 1;
  IF host IS NULL OR NOT are_friends(me, host) THEN
    RAISE EXCEPTION 'you must be friends with the host to join';
  END IF;
  IF is_blocked_either(me, host) THEN RAISE EXCEPTION 'blocked'; END IF;

  SELECT count(*) INTO cnt FROM conversation_members WHERE conversation_id = conv.id;
  IF cnt >= conv.member_limit THEN RAISE EXCEPTION 'group is full'; END IF;

  INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (conv.id, me, 'member');
  INSERT INTO messages (conversation_id, sender_id, kind, body)
    VALUES (conv.id, me, 'system', 'Joined the group');
  RETURN conv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_group(text) TO authenticated;

-- ============================================================
-- 8. RPC: group membership management
-- ============================================================
CREATE OR REPLACE FUNCTION group_invite(p_group uuid, p_user uuid)
RETURNS void AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  role text;
  cnt  int;
BEGIN
  SELECT role INTO role FROM conversation_members
    WHERE conversation_id = p_group AND user_id = me;
  IF role IS NULL OR role = 'member' THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF NOT are_friends(me, p_user) OR is_blocked_either(me, p_user) THEN
    RAISE EXCEPTION 'can only invite friends';
  END IF;
  SELECT count(*) INTO cnt FROM conversation_members WHERE conversation_id = p_group;
  IF cnt >= (SELECT member_limit FROM conversations WHERE id = p_group) THEN
    RAISE EXCEPTION 'group is full';
  END IF;
  INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (p_group, p_user, 'member')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION group_remove_member(p_group uuid, p_user uuid)
RETURNS void AS $$
DECLARE
  me   uuid := (SELECT auth.uid());
  myrole text;
  their  text;
BEGIN
  SELECT role INTO myrole FROM conversation_members
    WHERE conversation_id = p_group AND user_id = me;
  SELECT role INTO their FROM conversation_members
    WHERE conversation_id = p_group AND user_id = p_user;
  IF myrole IS NULL THEN RAISE EXCEPTION 'not a member'; END IF;
  IF their = 'owner' THEN RAISE EXCEPTION 'cannot remove the host'; END IF;
  IF myrole = 'member' THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF myrole = 'admin' AND their = 'admin' THEN RAISE EXCEPTION 'admins cannot remove admins'; END IF;
  DELETE FROM conversation_members
    WHERE conversation_id = p_group AND user_id = p_user;
  INSERT INTO messages (conversation_id, sender_id, kind, body)
    VALUES (p_group, me, 'system', 'A member left the group');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION group_set_role(p_group uuid, p_user uuid, p_role text)
RETURNS void AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  myrole text;
BEGIN
  IF p_role NOT IN ('admin', 'member') THEN RAISE EXCEPTION 'invalid role'; END IF;
  SELECT role INTO myrole FROM conversation_members
    WHERE conversation_id = p_group AND user_id = me;
  IF myrole <> 'owner' THEN RAISE EXCEPTION 'only the host can change roles'; END IF;
  UPDATE conversation_members SET role = p_role
    WHERE conversation_id = p_group AND user_id = p_user AND role <> 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION group_leave(p_group uuid)
RETURNS void AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  myrole text;
  n int;
BEGIN
  SELECT role INTO myrole FROM conversation_members
    WHERE conversation_id = p_group AND user_id = me;
  IF myrole IS NULL THEN RETURN; END IF;
  IF myrole = 'owner' THEN
    SELECT count(*) INTO n FROM conversation_members WHERE conversation_id = p_group;
    IF n > 1 THEN RAISE EXCEPTION 'transfer host or remove members first'; END IF;
  END IF;
  DELETE FROM conversation_members WHERE conversation_id = p_group AND user_id = me;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION
  group_invite(uuid, uuid),
  group_remove_member(uuid, uuid),
  group_set_role(uuid, uuid, text),
  group_leave(uuid)
  TO authenticated;

-- ============================================================
-- 9. RPC: send_message_rich — supports image / sticker / link / reply
-- ============================================================
CREATE OR REPLACE FUNCTION send_message_rich(
  p_conversation uuid,
  p_kind         text DEFAULT 'text',
  p_body         text DEFAULT '',
  p_attachment   text DEFAULT NULL,
  p_meta         jsonb DEFAULT NULL,
  p_reply_to     uuid DEFAULT NULL
)
RETURNS messages AS $$
DECLARE
  me    uuid := (SELECT auth.uid());
  conv  conversations%ROWTYPE;
  other uuid;
  row   messages;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT is_conversation_member(p_conversation) THEN RAISE EXCEPTION 'not a member'; END IF;
  IF NOT check_rate_limit('message', 30) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many messages';
  END IF;

  -- For non-text kinds an empty body is fine; otherwise require content.
  IF p_kind = 'text' AND length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'empty message';
  END IF;

  SELECT * INTO conv FROM conversations WHERE id = p_conversation;
  IF conv.kind = 'dm' THEN
    SELECT user_id INTO other FROM conversation_members
      WHERE conversation_id = p_conversation AND user_id <> me LIMIT 1;
    IF other IS NULL OR NOT are_friends(me, other) THEN RAISE EXCEPTION 'not friends'; END IF;
    IF is_blocked_either(me, other) THEN RAISE EXCEPTION 'blocked'; END IF;
  END IF;

  INSERT INTO messages (conversation_id, sender_id, kind, body, attachment_url, meta, reply_to)
    VALUES (p_conversation, me, p_kind, left(coalesce(p_body, ''), 2000),
            NULLIF(p_attachment, ''), p_meta, p_reply_to)
    RETURNING * INTO row;

  UPDATE conversations SET updated_at = now() WHERE id = p_conversation;
  UPDATE conversation_members SET last_read_at = now()
    WHERE conversation_id = p_conversation AND user_id = me;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_message_rich(uuid, text, text, text, jsonb, uuid) TO authenticated;

-- ============================================================
-- 10. RPC: edit / delete / react
-- ============================================================
CREATE OR REPLACE FUNCTION edit_message(p_message uuid, p_body text)
RETURNS messages AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  row messages;
BEGIN
  UPDATE messages SET body = left(trim(p_body), 2000), edited_at = now()
    WHERE id = p_message AND sender_id = me AND deleted_at IS NULL
    RETURNING * INTO row;
  IF row.id IS NULL THEN RAISE EXCEPTION 'cannot edit'; END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_message(p_message uuid)
RETURNS void AS $$
DECLARE
  me uuid := (SELECT auth.uid());
BEGIN
  UPDATE messages SET deleted_at = now(), body = '', kind = 'system',
    attachment_url = NULL, meta = NULL
    WHERE id = p_message AND sender_id = me AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_reaction(p_message uuid, p_emoji text)
RETURNS void AS $$
DECLARE
  me uuid := (SELECT auth.uid());
BEGIN
  IF NOT is_reaction_member(p_message) THEN RAISE EXCEPTION 'not a member'; END IF;
  IF EXISTS (SELECT 1 FROM message_reactions WHERE message_id = p_message AND user_id = me AND emoji = p_emoji) THEN
    DELETE FROM message_reactions WHERE message_id = p_message AND user_id = me AND emoji = p_emoji;
  ELSE
    INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES (p_message, me, p_emoji)
      ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION
  edit_message(uuid, text),
  delete_message(uuid),
  toggle_reaction(uuid, text)
  TO authenticated;

-- ============================================================
-- 11. RPC: conversation summaries incl. groups + last message + unread count
-- ============================================================
CREATE OR REPLACE FUNCTION get_conversation_summaries_v2()
RETURNS TABLE (
  conversation_id  uuid,
  kind             text,
  title            text,
  icon_url         text,
  join_code        text,
  member_count     int,
  other_user_id    uuid,
  my_last_read_at  timestamptz,
  last_activity    timestamptz,
  unread_count     int,
  last_message_id  uuid,
  last_sender_id   uuid,
  last_body        text,
  last_kind        text,
  last_attachment  text
) AS $$
DECLARE
  me uuid := (SELECT auth.uid());
BEGIN
  RETURN QUERY
  WITH mine AS (
    SELECT conversation_id, last_read_at
    FROM conversation_members WHERE user_id = me
  ),
  members AS (
    SELECT conversation_id, count(*)::int AS mcount
    FROM conversation_members
    WHERE conversation_id IN (SELECT conversation_id FROM mine)
    GROUP BY conversation_id
  ),
  others AS (
    SELECT DISTINCT ON (conversation_id) conversation_id, user_id
    FROM conversation_members
    WHERE conversation_id IN (SELECT conversation_id FROM mine)
      AND user_id <> me
    ORDER BY conversation_id, user_id
  ),
  latest AS (
    SELECT DISTINCT ON (conversation_id)
      conversation_id, id, sender_id, body, kind, attachment_url, created_at
    FROM messages
    WHERE conversation_id IN (SELECT conversation_id FROM mine)
      AND deleted_at IS NULL
    ORDER BY conversation_id, created_at DESC
  ),
  unread AS (
    SELECT m.conversation_id, count(*)::int AS ucount
    FROM messages m
    JOIN mine mm ON mm.conversation_id = m.conversation_id
    WHERE m.deleted_at IS NULL
      AND m.created_at > mm.last_read_at
      AND m.sender_id <> me
    GROUP BY m.conversation_id
  ),
  maxact AS (
    SELECT c.id AS conversation_id, greatest(c.updated_at, COALESCE(max(m.created_at), c.created_at)) AS act
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
    WHERE c.id IN (SELECT conversation_id FROM mine)
    GROUP BY c.id, c.updated_at
  )
  SELECT
    c.id,
    c.kind,
    c.title,
    c.icon_url,
    c.join_code,
    COALESCE(mb.mcount, 1),
    CASE WHEN c.kind = 'dm' THEN o.user_id ELSE NULL END,
    mm.last_read_at,
    ma.act,
    COALESCE(u.ucount, 0),
    l.id, l.sender_id, l.body, l.kind, l.attachment_url
  FROM conversations c
  JOIN mine mm ON mm.conversation_id = c.id
  LEFT JOIN members mb ON mb.conversation_id = c.id
  LEFT JOIN others o ON o.conversation_id = c.id
  LEFT JOIN latest l ON l.conversation_id = c.id
  LEFT JOIN unread u ON u.conversation_id = c.id
  LEFT JOIN maxact ma ON ma.conversation_id = c.id
  ORDER BY ma.act DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_conversation_summaries_v2() TO authenticated;

-- ============================================================
-- 12. Storage bucket for chat media (public, size-capped)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', true, 5242880,
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS chat_media_read ON storage.objects;
CREATE POLICY chat_media_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS chat_media_insert ON storage.objects;
CREATE POLICY chat_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND owner = (SELECT auth.uid()));

DROP POLICY IF EXISTS chat_media_delete ON storage.objects;
CREATE POLICY chat_media_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND owner = (SELECT auth.uid()));
