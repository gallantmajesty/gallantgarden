-- Rate limiting via database: track actions per user per time window
-- This is a general-purpose rate limiter for Supabase RPCs

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,       -- e.g. 'friend_request', 'message', 'realm_create'
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  count       int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_cleanup_idx ON rate_limits (window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY rl_own ON rate_limits FOR ALL USING (user_id = (SELECT auth.uid()));

-- Check rate limit: returns true if allowed, false if exceeded
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_action text,
  p_limit int,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  window_start timestamptz;
  current_count int;
BEGIN
  IF me IS NULL THEN RETURN true; END IF

  window_start := date_trunc('minute', now());

  SELECT count INTO current_count
  FROM rate_limits
  WHERE user_id = me
    AND action = p_action
    AND window_start = window_start;

  IF current_count IS NULL THEN
    -- First request in this window
    INSERT INTO rate_limits (user_id, action, window_start, count)
    VALUES (me, p_action, window_start, 1)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET count = rate_limits.count + 1;
    RETURN true;
  ELSIF current_count >= p_limit THEN
    RETURN false;
  ELSE
    UPDATE rate_limits
    SET count = count + 1
    WHERE user_id = me
      AND action = p_action
      AND window_start = window_start;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limit records (run periodically via pg_cron or manual)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '5 minutes';
$$ LANGUAGE sql SECURITY DEFINER;

GRANT SELECT, INSERT, UPDATE ON rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO authenticated;

-- ============================================================
-- Apply rate limits to sensitive RPCs by wrapping them
-- ============================================================

-- Friend requests: max 10 per minute
CREATE OR REPLACE FUNCTION send_friend_request_limited(p_addressee uuid)
RETURNS void AS $$
BEGIN
  IF NOT check_rate_limit('friend_request', 10) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many friend requests';
  END IF;
  PERFORM send_friend_request(p_addressee);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Messages: max 30 per minute
CREATE OR REPLACE FUNCTION send_message_limited(p_conversation uuid, p_content text)
RETURNS messages AS $$
BEGIN
  IF NOT check_rate_limit('message', 30) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many messages';
  END IF;
  RETURN send_message(p_conversation, p_content);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Realm creation: max 5 per minute
CREATE OR REPLACE FUNCTION create_realm_limited(
  p_name text,
  p_visibility text,
  p_limit int,
  p_password text DEFAULT NULL
)
RETURNS realms AS $$
BEGIN
  IF NOT check_rate_limit('realm_create', 5) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many realms';
  END IF;
  RETURN create_realm(p_name, p_visibility, p_limit, p_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profile updates: max 10 per minute
CREATE OR REPLACE FUNCTION update_profile_limited(
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_public_profile jsonb DEFAULT NULL
)
RETURNS profiles AS $$
BEGIN
  IF NOT check_rate_limit('profile_update', 10) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many profile updates';
  END IF;
  RETURN update_profile(p_display_name, p_avatar_url, p_country, p_public_profile);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chat creation: max 5 per minute (DMs)
CREATE OR REPLACE FUNCTION create_conversation_limited(p_other_user uuid)
RETURNS conversations AS $$
BEGIN
  IF NOT check_rate_limit('conversation_create', 5) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many conversations';
  END IF;
  RETURN create_dm_conversation(p_other_user);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION
  send_friend_request_limited(uuid),
  send_message_limited(uuid, text),
  create_realm_limited(text, text, int, text),
  update_profile_limited(text, text, text, jsonb),
  create_conversation_limited(uuid)
  TO authenticated;