CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TABLE IF EXISTS sticky_notes CASCADE;
DROP TABLE IF EXISTS trees CASCADE;

CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Explorer',
  avatar       jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_profile jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS study_status text NOT NULL DEFAULT 'available';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_xp integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles (lower(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_username_trgm_idx ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx ON profiles USING gin (display_name gin_trgm_ops);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (auth.uid() = id);
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

DROP VIEW IF EXISTS public_profiles;
CREATE VIEW public_profiles AS
  SELECT id, username, display_name, avatar, avatar_url, country, rank,
         xp, premium_xp, public_profile, created_at, last_seen_at, study_status
  FROM profiles;
GRANT SELECT ON public_profiles TO authenticated;
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;

CREATE TABLE IF NOT EXISTS blueprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Untitled Blueprint',
  doc         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blueprints_owner_idx ON blueprints(owner_id);

DO $$ BEGIN
  CREATE TRIGGER blueprints_touch BEFORE UPDATE ON blueprints FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blueprints_select ON blueprints;
DROP POLICY IF EXISTS blueprints_insert ON blueprints;
DROP POLICY IF EXISTS blueprints_update ON blueprints;
DROP POLICY IF EXISTS blueprints_delete ON blueprints;
CREATE POLICY blueprints_select ON blueprints FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY blueprints_insert ON blueprints FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY blueprints_update ON blueprints FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY blueprints_delete ON blueprints FOR DELETE USING (auth.uid() = owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON blueprints TO authenticated;

CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follows_select ON follows;
DROP POLICY IF EXISTS follows_insert ON follows;
DROP POLICY IF EXISTS follows_delete ON follows;
CREATE POLICY follows_select ON follows FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY follows_insert ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
GRANT SELECT, INSERT, DELETE ON follows TO authenticated;

CREATE OR REPLACE FUNCTION get_following_ids(p_user_id uuid) RETURNS uuid[] AS $$
  SELECT array_agg(following_id) FROM follows WHERE follower_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_follower_ids(p_user_id uuid) RETURNS uuid[] AS $$
  SELECT array_agg(follower_id) FROM follows WHERE following_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_follow_count(p_user_id uuid) RETURNS jsonb AS $$
  SELECT jsonb_build_object('followers', (SELECT count(*) FROM follows WHERE following_id = p_user_id), 'following', (SELECT count(*) FROM follows WHERE follower_id = p_user_id));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_is_following(p_follower_id uuid, p_following_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM follows WHERE follower_id = p_follower_id AND following_id = p_following_id);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_mutual_following_ids(p_a uuid, p_b uuid) RETURNS uuid[] AS $$
  SELECT array_agg(following_id) FROM follows WHERE follower_id = p_a AND following_id IN (SELECT following_id FROM follows WHERE follower_id = p_b);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_following_ids(uuid), get_follower_ids(uuid), get_follow_count(uuid), get_is_following(uuid, uuid), get_mutual_following_ids(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION are_friends(a uuid, b uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM friendships WHERE user_a = LEAST(a, b) AND user_b = GREATEST(a, b));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_blocked_either(a uuid, b uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_conversation_member(conv uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = conv AND user_id = (SELECT auth.uid()));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_realm_member(realm uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM realm_members WHERE realm_id = realm AND user_id = (SELECT auth.uid()));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION realm_owner(realm uuid) RETURNS uuid AS $$
  SELECT owner_id FROM realms WHERE id = realm;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS friend_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  CHECK (status IN ('pending', 'accepted', 'declined'))
);
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pair_idx ON friend_requests (requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS friend_requests_addressee_idx ON friend_requests (addressee_id, status);

CREATE TABLE IF NOT EXISTS friendships (
  user_a      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX IF NOT EXISTS friendships_user_b_idx ON friendships (user_b);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks (blocked_id);

CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL DEFAULT 'dm',
  title       text,
  icon_url    text,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dm_key      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (kind IN ('dm', 'group'))
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_dm_key_idx ON conversations (dm_key) WHERE dm_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             text NOT NULL DEFAULT 'member',
  last_read_at     timestamptz NOT NULL DEFAULT now(),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON conversation_members (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_convo_time_idx ON messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        text NOT NULL,
  context       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (reason IN ('spam', 'harassment', 'inappropriate'))
);

DO $$ BEGIN
  CREATE TRIGGER friend_requests_touch BEFORE UPDATE ON friend_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TRIGGER conversations_touch BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE friend_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports              ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fr_select ON friend_requests;
CREATE POLICY fr_select ON friend_requests FOR SELECT TO authenticated USING ((SELECT auth.uid()) IN (requester_id, addressee_id));
DROP POLICY IF EXISTS fs_select ON friendships;
CREATE POLICY fs_select ON friendships FOR SELECT TO authenticated USING ((SELECT auth.uid()) IN (user_a, user_b));
DROP POLICY IF EXISTS bl_select ON blocks;
CREATE POLICY bl_select ON blocks FOR SELECT TO authenticated USING ((SELECT auth.uid()) = blocker_id);
DROP POLICY IF EXISTS cv_select ON conversations;
CREATE POLICY cv_select ON conversations FOR SELECT TO authenticated USING (is_conversation_member(id));
DROP POLICY IF EXISTS cm_select ON conversation_members;
CREATE POLICY cm_select ON conversation_members FOR SELECT TO authenticated USING (is_conversation_member(conversation_id));
DROP POLICY IF EXISTS cm_update_own ON conversation_members;
CREATE POLICY cm_update_own ON conversation_members FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS msg_select ON messages;
CREATE POLICY msg_select ON messages FOR SELECT TO authenticated USING (is_conversation_member(conversation_id));
DROP POLICY IF EXISTS rp_select ON reports;
CREATE POLICY rp_select ON reports FOR SELECT TO authenticated USING (reporter_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS rp_insert ON reports;
CREATE POLICY rp_insert ON reports FOR INSERT TO authenticated WITH CHECK (reporter_id = (SELECT auth.uid()));

GRANT SELECT ON friend_requests, friendships, blocks, conversations, messages TO authenticated;
GRANT SELECT, UPDATE ON conversation_members TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;

CREATE OR REPLACE FUNCTION send_friend_request(addressee uuid) RETURNS uuid AS $$
DECLARE me uuid := (SELECT auth.uid()); rid uuid;
BEGIN
  IF me IS NULL OR me = addressee THEN RAISE EXCEPTION 'invalid target'; END IF;
  IF is_blocked_either(me, addressee) THEN RAISE EXCEPTION 'blocked'; END IF;
  IF are_friends(me, addressee) THEN RAISE EXCEPTION 'already friends'; END IF;
  SELECT id INTO rid FROM friend_requests WHERE requester_id = addressee AND addressee_id = me AND status = 'pending';
  IF rid IS NOT NULL THEN PERFORM respond_friend_request(rid, true); RETURN rid; END IF;
  INSERT INTO friend_requests (requester_id, addressee_id, status) VALUES (me, addressee, 'pending')
  ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'pending', updated_at = now()
  RETURNING id INTO rid;
  RETURN rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION respond_friend_request(request_id uuid, accept boolean) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid()); req friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = request_id;
  IF req.id IS NULL OR req.addressee_id <> me THEN RAISE EXCEPTION 'not your request'; END IF;
  IF accept THEN
    INSERT INTO friendships (user_a, user_b) VALUES (LEAST(req.requester_id, req.addressee_id), GREATEST(req.requester_id, req.addressee_id)) ON CONFLICT DO NOTHING;
    UPDATE friend_requests SET status = 'accepted' WHERE id = request_id;
  ELSE
    UPDATE friend_requests SET status = 'declined' WHERE id = request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_friend(other uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  DELETE FROM friendships WHERE user_a = LEAST(me, other) AND user_b = GREATEST(me, other);
  DELETE FROM friend_requests WHERE (requester_id = me AND addressee_id = other) OR (requester_id = other AND addressee_id = me);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION block_user(target uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR me = target THEN RAISE EXCEPTION 'invalid target'; END IF;
  DELETE FROM friendships WHERE user_a = LEAST(me, target) AND user_b = GREATEST(me, target);
  DELETE FROM friend_requests WHERE (requester_id = me AND addressee_id = target) OR (requester_id = target AND addressee_id = me);
  INSERT INTO blocks (blocker_id, blocked_id) VALUES (me, target) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unblock_user(target uuid) RETURNS void AS $$
  DELETE FROM blocks WHERE blocker_id = (SELECT auth.uid()) AND blocked_id = target;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_or_create_dm(other uuid) RETURNS uuid AS $$
DECLARE me uuid := (SELECT auth.uid()); key text := LEAST(me, other)::text || ':' || GREATEST(me, other)::text; cid uuid;
BEGIN
  IF me IS NULL OR me = other THEN RAISE EXCEPTION 'invalid target'; END IF;
  IF NOT are_friends(me, other) THEN RAISE EXCEPTION 'not friends'; END IF;
  IF is_blocked_either(me, other) THEN RAISE EXCEPTION 'blocked'; END IF;
  SELECT id INTO cid FROM conversations WHERE dm_key = key;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO conversations (kind, created_by, dm_key) VALUES ('dm', me, key) RETURNING id INTO cid;
  INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (cid, me, 'owner'), (cid, other, 'member') ON CONFLICT DO NOTHING;
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION send_message(conversation uuid, body text) RETURNS messages AS $$
DECLARE me uuid := (SELECT auth.uid()); conv conversations%ROWTYPE; other uuid; row messages;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF length(trim(body)) = 0 THEN RAISE EXCEPTION 'empty message'; END IF;
  IF NOT is_conversation_member(conversation) THEN RAISE EXCEPTION 'not a member'; END IF;
  SELECT * INTO conv FROM conversations WHERE id = conversation;
  IF conv.kind = 'dm' THEN
    SELECT user_id INTO other FROM conversation_members WHERE conversation_id = conversation AND user_id <> me LIMIT 1;
    IF other IS NULL OR NOT are_friends(me, other) THEN RAISE EXCEPTION 'not friends'; END IF;
    IF is_blocked_either(me, other) THEN RAISE EXCEPTION 'blocked'; END IF;
  END IF;
  INSERT INTO messages (conversation_id, sender_id, body) VALUES (conversation, me, left(body, 4000)) RETURNING * INTO row;
  UPDATE conversations SET updated_at = now() WHERE id = conversation;
  UPDATE conversation_members SET last_read_at = now() WHERE conversation_id = conversation AND user_id = me;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_friend_request(uuid), respond_friend_request(uuid, boolean), remove_friend(uuid), block_user(uuid), unblock_user(uuid), get_or_create_dm(uuid), send_message(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS realms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL,
  name          text NOT NULL,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world         text NOT NULL DEFAULT 'library',
  visibility    text NOT NULL DEFAULT 'private',
  player_limit  int  NOT NULL DEFAULT 75,
  created_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  CHECK (visibility IN ('public', 'private', 'friends')),
  CHECK (player_limit BETWEEN 1 AND 75)
);
CREATE UNIQUE INDEX IF NOT EXISTS realms_code_idx ON realms (lower(code));
CREATE INDEX IF NOT EXISTS realms_discover_idx ON realms (visibility, closed_at);
CREATE INDEX IF NOT EXISTS realms_owner_idx ON realms (owner_id);

CREATE TABLE IF NOT EXISTS realm_members (
  realm_id   uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member',
  muted      boolean NOT NULL DEFAULT false,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (realm_id, user_id),
  CHECK (role IN ('owner', 'member'))
);
CREATE INDEX IF NOT EXISTS realm_members_user_idx ON realm_members (user_id);

CREATE TABLE IF NOT EXISTS realm_bans (
  realm_id    uuid NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (realm_id, user_id)
);
CREATE INDEX IF NOT EXISTS realm_bans_user_idx ON realm_bans (user_id);

CREATE TABLE IF NOT EXISTS realm_presence (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  room_key      text NOT NULL,
  instance      int  NOT NULL DEFAULT 1,
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS realm_presence_room_idx ON realm_presence (room_key, instance, last_seen_at);

ALTER TABLE realms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE realm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE realm_bans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE realm_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realm_select ON realms;
CREATE POLICY realm_select ON realms FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()) OR visibility = 'public' OR is_realm_member(id));
DROP POLICY IF EXISTS realm_member_select ON realm_members;
CREATE POLICY realm_member_select ON realm_members FOR SELECT TO authenticated USING (is_realm_member(realm_id));
DROP POLICY IF EXISTS realm_ban_select ON realm_bans;
CREATE POLICY realm_ban_select ON realm_bans FOR SELECT TO authenticated USING (is_realm_member(realm_id));
DROP POLICY IF EXISTS rp_select ON realm_presence;
CREATE POLICY rp_select ON realm_presence FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON realms, realm_members, realm_bans, realm_presence TO authenticated;

CREATE OR REPLACE FUNCTION create_realm(p_name text, p_visibility text, p_limit int) RETURNS realms AS $$
DECLARE me uuid := (SELECT auth.uid()); nm text := COALESCE(NULLIF(trim(p_name), ''), 'My Realm'); vis text := COALESCE(p_visibility, 'private'); lim int := COALESCE(p_limit, 75); slug text; code text; tries int := 0; row realms;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF vis NOT IN ('public', 'private', 'friends') THEN vis := 'private'; END IF;
  IF lim < 1 OR lim > 75 THEN lim := 75; END IF;
  slug := regexp_replace(lower(left(nm, 24)), '[^a-z0-9]+', '-', 'g');
  slug := trim(both '-' from slug);
  IF slug = '' THEN slug := 'realm'; END IF;
  LOOP
    code := slug || '-' || lower(substr(md5(random()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM realms WHERE lower(realms.code) = lower(code));
    tries := tries + 1;
    IF tries > 8 THEN RAISE EXCEPTION 'could not allocate a realm code'; END IF;
  END LOOP;
  INSERT INTO realms (code, name, owner_id, visibility, player_limit) VALUES (code, nm, me, vis, lim) RETURNING * INTO row;
  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'owner') ON CONFLICT DO NOTHING;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_realm_banned(realm uuid, uid uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM realm_bans WHERE realm_id = realm AND user_id = uid);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_realm_by_code(p_code text) RETURNS realms AS $$
DECLARE me uuid := (SELECT auth.uid()); row realms;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO row FROM realms WHERE lower(code) = lower(trim(p_code));
  IF row.id IS NULL THEN RAISE EXCEPTION 'realm not found'; END IF;
  IF row.closed_at IS NOT NULL THEN RAISE EXCEPTION 'realm closed'; END IF;
  IF is_realm_banned(row.id, me) THEN RAISE EXCEPTION 'banned'; END IF;
  IF row.visibility = 'friends' AND row.owner_id <> me AND NOT are_friends(me, row.owner_id) THEN RAISE EXCEPTION 'friends only'; END IF;
  INSERT INTO realm_members (realm_id, user_id, role) VALUES (row.id, me, 'member') ON CONFLICT DO NOTHING;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_realm(p_id uuid, p_name text, p_visibility text, p_limit int) RETURNS realms AS $$
DECLARE me uuid := (SELECT auth.uid()); row realms;
BEGIN
  IF me IS NULL OR realm_owner(p_id) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realms SET name = COALESCE(NULLIF(trim(p_name), ''), name),
    visibility = CASE WHEN p_visibility IN ('public','private','friends') THEN p_visibility ELSE visibility END,
    player_limit = CASE WHEN p_limit BETWEEN 1 AND 75 THEN p_limit ELSE player_limit END
  WHERE id = p_id RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION close_realm(p_id uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_id) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realms SET closed_at = now() WHERE id = p_id AND closed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION list_public_realms() RETURNS SETOF realms AS $$
  SELECT * FROM realms WHERE visibility = 'public' AND closed_at IS NULL ORDER BY created_at DESC LIMIT 60;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION kick_member(p_realm uuid, p_user uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'cannot kick yourself'; END IF;
  DELETE FROM realm_members WHERE realm_id = p_realm AND user_id = p_user;
  DELETE FROM realm_presence WHERE user_id = p_user AND room_key = 'custom:' || p_realm::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ban_member(p_realm uuid, p_user uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'cannot ban yourself'; END IF;
  INSERT INTO realm_bans (realm_id, user_id, banned_by) VALUES (p_realm, p_user, me) ON CONFLICT DO NOTHING;
  DELETE FROM realm_members WHERE realm_id = p_realm AND user_id = p_user;
  DELETE FROM realm_presence WHERE user_id = p_user AND room_key = 'custom:' || p_realm::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unban_member(p_realm uuid, p_user uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  DELETE FROM realm_bans WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mute_member(p_realm uuid, p_user uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'cannot mute yourself'; END IF;
  UPDATE realm_members SET muted = true WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unmute_member(p_realm uuid, p_user uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  UPDATE realm_members SET muted = false WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transfer_realm_ownership(p_realm uuid, p_user uuid) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL OR realm_owner(p_realm) <> me THEN RAISE EXCEPTION 'not the owner'; END IF;
  IF p_user = me THEN RAISE EXCEPTION 'already the owner'; END IF;
  IF NOT EXISTS (SELECT 1 FROM realm_members WHERE realm_id = p_realm AND user_id = p_user) THEN RAISE EXCEPTION 'target is not a member'; END IF;
  UPDATE realms SET owner_id = p_user WHERE id = p_realm;
  UPDATE realm_members SET role = 'member' WHERE realm_id = p_realm AND user_id = me;
  UPDATE realm_members SET role = 'owner' WHERE realm_id = p_realm AND user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION list_realm_members(p_realm uuid) RETURNS TABLE (user_id uuid, role text, muted boolean, banned boolean, joined_at timestamptz) AS $$
  SELECT m.user_id, m.role, m.muted, EXISTS (SELECT 1 FROM realm_bans b WHERE b.realm_id = m.realm_id AND b.user_id = m.user_id) AS banned, m.joined_at
  FROM realm_members m WHERE m.realm_id = p_realm AND is_realm_member(p_realm) ORDER BY (m.role = 'owner') DESC, m.joined_at ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_realm_instance(p_room_key text, p_capacity int) RETURNS int AS $$
DECLARE me uuid := (SELECT auth.uid()); chosen int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_capacity IS NULL OR p_capacity < 1 THEN p_capacity := 75; END IF;
  WITH live AS (SELECT instance, count(*) AS c FROM realm_presence WHERE room_key = p_room_key AND user_id <> me AND last_seen_at > now() - interval '30 seconds' GROUP BY instance),
  maxinst AS (SELECT COALESCE(MAX(instance), 0) AS m FROM live),
  candidates AS (SELECT gs AS instance FROM generate_series(1, (SELECT m FROM maxinst) + 1) AS gs)
  SELECT MIN(c.instance) INTO chosen FROM candidates c LEFT JOIN live l ON l.instance = c.instance WHERE COALESCE(l.c, 0) < p_capacity;
  chosen := COALESCE(chosen, 1);
  INSERT INTO realm_presence (user_id, room_key, instance, last_seen_at) VALUES (me, p_room_key, chosen, now())
  ON CONFLICT (user_id) DO UPDATE SET room_key = EXCLUDED.room_key, instance = EXCLUDED.instance, last_seen_at = now();
  RETURN chosen;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION realm_heartbeat(p_room_key text, p_instance int) RETURNS void AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  INSERT INTO realm_presence (user_id, room_key, instance, last_seen_at) VALUES (me, p_room_key, COALESCE(p_instance, 1), now())
  ON CONFLICT (user_id) DO UPDATE SET room_key = EXCLUDED.room_key, instance = EXCLUDED.instance, last_seen_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION leave_realm_presence() RETURNS void AS $$
  DELETE FROM realm_presence WHERE user_id = (SELECT auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION realm_occupancy(p_room_key text) RETURNS jsonb AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('instance', instance, 'count', c) ORDER BY instance), '[]'::jsonb)
  FROM (SELECT instance, count(*) AS c FROM realm_presence WHERE room_key = p_room_key AND last_seen_at > now() - interval '30 seconds' GROUP BY instance) q;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_realm(text, text, int), get_realm_by_code(text), update_realm(uuid, text, text, int), close_realm(uuid), list_public_realms(), kick_member(uuid, uuid), ban_member(uuid, uuid), unban_member(uuid, uuid), mute_member(uuid, uuid), unmute_member(uuid, uuid), transfer_realm_ownership(uuid, uuid), list_realm_members(uuid), assign_realm_instance(text, int), realm_heartbeat(text, int), leave_realm_presence(), realm_occupancy(text) TO authenticated;

CREATE TABLE IF NOT EXISTS active_session (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL,
  device_label  text NOT NULL DEFAULT '',
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS active_session_seen_idx ON active_session (last_seen_at);
ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS as_select ON active_session;
CREATE POLICY as_select ON active_session FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
GRANT SELECT ON active_session TO authenticated;

CREATE OR REPLACE FUNCTION claim_session(p_session_id uuid, p_device_label text) RETURNS boolean AS $$
DECLARE me uuid := (SELECT auth.uid());
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO active_session (user_id, session_id, device_label, last_seen_at) VALUES (me, p_session_id, COALESCE(p_device_label, ''), now())
  ON CONFLICT (user_id) DO UPDATE SET session_id = EXCLUDED.session_id, device_label = EXCLUDED.device_label, last_seen_at = now();
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION session_heartbeat(p_session_id uuid) RETURNS boolean AS $$
DECLARE me uuid := (SELECT auth.uid()); current_holder uuid;
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  SELECT session_id INTO current_holder FROM active_session WHERE user_id = me;
  IF current_holder IS NULL OR current_holder <> p_session_id THEN RETURN false; END IF;
  UPDATE active_session SET last_seen_at = now() WHERE user_id = me;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_session() RETURNS void AS $$
  DELETE FROM active_session WHERE user_id = (SELECT auth.uid());
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_session(uuid, text), session_heartbeat(uuid), release_session() TO authenticated;
