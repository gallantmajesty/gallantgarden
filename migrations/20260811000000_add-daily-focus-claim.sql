-- Server-side gate for the daily focus claim: closes the "clear localStorage
-- to re-earn" farm hole for the daily focus bonus. One row per user+date;
-- idempotent. The client calls claim_daily_focus() and only credits leaves
-- when it returns 1.

ALTER TABLE daily_rewards
  ADD COLUMN IF NOT EXISTS focus_claimed boolean NOT NULL DEFAULT false;

-- Returns 1 if the daily focus claim was granted (this request), 0 if it was
-- already claimed today or the caller is unauthenticated.
CREATE OR REPLACE FUNCTION claim_daily_focus()
RETURNS integer AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  awarded integer := 0;
BEGIN
  IF me IS NULL THEN RETURN 0; END IF;
  INSERT INTO daily_rewards (user_id, reward_date, focus_claimed)
  VALUES (me, (CURRENT_DATE)::date, true)
  ON CONFLICT (user_id, reward_date)
  DO UPDATE SET focus_claimed = true
  WHERE daily_rewards.focus_claimed = false
  RETURNING 1 INTO awarded;
  RETURN COALESCE(awarded, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_daily_focus() TO authenticated;
