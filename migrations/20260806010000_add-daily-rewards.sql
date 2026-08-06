-- Server-side daily-reward gate: closes the "clear localStorage to re-earn"
-- farm hole for the daily login bonus. One row per user+date; idempotent.
-- The client calls claim_daily_login() and only credits leaves when it returns 1.

CREATE TABLE IF NOT EXISTS daily_rewards (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_date   date NOT NULL,
  login_awarded boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, reward_date)
);

ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_rewards_select ON daily_rewards FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON daily_rewards TO authenticated;

-- Returns 1 if the daily login bonus was granted (this request), 0 if it was
-- already claimed today or the caller is unauthenticated.
CREATE OR REPLACE FUNCTION claim_daily_login()
RETURNS integer AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  awarded integer := 0;
BEGIN
  IF me IS NULL THEN RETURN 0; END IF;
  INSERT INTO daily_rewards (user_id, reward_date, login_awarded)
  VALUES (me, (CURRENT_DATE)::date, true)
  ON CONFLICT (user_id, reward_date)
  DO UPDATE SET login_awarded = true
  WHERE daily_rewards.login_awarded = false
  RETURNING 1 INTO awarded;
  RETURN COALESCE(awarded, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_daily_login() TO authenticated;
