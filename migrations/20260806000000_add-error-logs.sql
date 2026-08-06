-- Error monitoring: zero-config logger table (see src/lib/errorLogger.ts).
-- The app captures window errors + unhandled rejections and inserts rows here.
-- RLS: anyone may insert (client caps 200/session), only the owner (or admins
-- via the dashboard/table editor) can read/delete their own rows.

CREATE TABLE IF NOT EXISTS error_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  scope       text NOT NULL,          -- 'window.error' | 'unhandledrejection' | custom scope
  message     text NOT NULL,
  context     jsonb,                  -- stack, filename, line/col, extra data
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  url         text,
  ua          text
);

CREATE INDEX IF NOT EXISTS error_logs_time_idx ON error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_scope_idx ON error_logs (scope);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY error_logs_insert ON error_logs
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY error_logs_select_own ON error_logs
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY error_logs_delete_own ON error_logs
  FOR DELETE USING (user_id = (SELECT auth.uid()));
