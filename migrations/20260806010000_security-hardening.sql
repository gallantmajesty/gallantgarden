-- Security hardening (3.5): server-side input caps + report rate limiting.
-- The UI enforces these limits client-side; these CHECKs guarantee them even
-- for direct/scripted calls.

-- Display names: max 20 chars (matches DISPLAY_NAME_MAX in src/lib/displayName.ts)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_len;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_display_name_len CHECK (char_length(display_name) <= 20);

-- Chat messages: max 500 chars (matches MESSAGE_MAX in src/lib/chat.ts)
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_body_len;
ALTER TABLE messages
  ADD CONSTRAINT messages_body_len CHECK (char_length(body) <= 500);

-- Report context: max 1000 chars; reason is already constrained to the enum
ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_context_len;
ALTER TABLE reports
  ADD CONSTRAINT reports_context_len CHECK (char_length(context) <= 1000);

-- Report rate limit: max 5 per minute, same budget as the client-side limiter.
-- Mirrors send_friend_request_limited / send_message_limited from
-- 20260727010000_add-rate-limits.sql. Uses check_rate_limit() from that migration.
CREATE OR REPLACE FUNCTION report_user_limited(
  p_reported_id uuid,
  p_reason text,
  p_context text DEFAULT ''
)
RETURNS void AS $$
DECLARE
  reason_ok text;
BEGIN
  IF NOT check_rate_limit('report', 5) THEN
    RAISE EXCEPTION 'rate limit exceeded: too many reports';
  END IF;
  reason_ok := left(p_reason, 20);
  INSERT INTO reports (reported_id, reason, context)
  VALUES (p_reported_id, reason_ok, left(p_context, 1000));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION report_user_limited(uuid, text, text) TO authenticated;
