-- Owner Analytics HQ — demographic + engagement data for the /owner dashboard.
--
-- Adds:
--   1. profiles.ads_viewed — lifetime ad-view counter (incremented by
--      record_ad_view() when ads ship; 0 until then).
--   2. user_daily_activity — per-user, per-day active-minute ledger so the
--      dashboard can chart a DAU/active series from today forward.
--   3. admin_analytics_users()  — flat per-user analytics (country, age,
--      study goals, referral source, paid flag, ads, wallets, activity).
--   4. admin_analytics_daily()  — last N-day active series for charts.
--   5. record_daily_activity()  — client upsert of the day's active minutes.
--   6. record_ad_view()         — client increment of the ads_viewed counter.
--
-- All admin RPCs reuse _is_owner() from 20260805000000_add-owner-content.sql
-- (hardcoded owner email check); the record_* RPCs are per-user (auth.uid()).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS admin_analytics_users();
--   DROP FUNCTION IF EXISTS admin_analytics_daily(int);
--   DROP FUNCTION IF EXISTS record_daily_activity(date, int);
--   DROP FUNCTION IF EXISTS record_ad_view();
--   DROP TABLE IF EXISTS user_daily_activity;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS ads_viewed;

-- ============================================================
-- Schema additions
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ads_viewed integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_daily_activity (
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day            date NOT NULL,
  active_minutes integer NOT NULL DEFAULT 0 CHECK (active_minutes >= 0),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS user_daily_activity_day_idx
  ON user_daily_activity (day);

-- ============================================================
-- admin_analytics_users() → one flat row per user for charts + table
-- ============================================================
CREATE OR REPLACE FUNCTION admin_analytics_users()
RETURNS TABLE (
  id             uuid,
  player_id      text,
  display_name   text,
  country        text,
  age            integer,
  study_goals    text[],
  referral       text,
  referral_other text,
  paid           boolean,
  ads_viewed     integer,
  xp             integer,
  premium_xp     integer,
  rank_xp        integer,
  created_at     timestamptz,
  last_seen_at   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      p.id,
      p.player_id,
      p.display_name,
      COALESCE(p.settings #>> '{onboarding,country}', p.country),
      NULLIF(p.settings #>> '{onboarding,age}', '')::integer,
      ARRAY(
        SELECT jsonb_array_elements_text(p.settings #> '{onboarding,studyGoals}')
      ),
      p.settings #>> '{onboarding,referral}',
      p.settings #>> '{onboarding,referralOther}',
      p.premium_xp > 0,
      p.ads_viewed,
      p.xp,
      p.premium_xp,
      p.rank_xp,
      p.created_at,
      p.last_seen_at
    FROM profiles p
    ORDER BY p.rank_xp DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_analytics_users() TO authenticated;

-- ============================================================
-- admin_analytics_daily(p_days) → active series over the last N days
-- (continuous date axis; missing days are 0).
-- ============================================================
CREATE OR REPLACE FUNCTION admin_analytics_daily(p_days integer DEFAULT 30)
RETURNS TABLE (
  day             date,
  active_users    bigint,
  active_minutes  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _is_owner() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  RETURN QUERY
    SELECT
      g.day,
      COUNT(d.user_id)::bigint,
      COALESCE(SUM(d.active_minutes), 0)::bigint
    FROM generate_series(
      (CURRENT_DATE - (GREATEST(1, p_days) - 1) * INTERVAL '1 day')::date,
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS g(day)
    LEFT JOIN user_daily_activity d ON d.day = g.day
    GROUP BY g.day
    ORDER BY g.day;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_analytics_daily(integer) TO authenticated;

-- ============================================================
-- record_daily_activity(day, active_minutes) → per-user daily ledger
-- (monotonic: the largest reported minute count for the day wins).
-- ============================================================
CREATE OR REPLACE FUNCTION record_daily_activity(
  p_day            date,
  p_active_minutes integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_daily_activity (user_id, day, active_minutes)
  VALUES (auth.uid(), p_day, GREATEST(0, p_active_minutes))
  ON CONFLICT (user_id, day)
  DO UPDATE SET active_minutes = GREATEST(
    user_daily_activity.active_minutes,
    EXCLUDED.active_minutes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_daily_activity(date, integer) TO authenticated;

-- ============================================================
-- record_ad_view() → +1 on the caller's lifetime ad-view counter
-- ============================================================
CREATE OR REPLACE FUNCTION record_ad_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET ads_viewed = ads_viewed + 1
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION record_ad_view() TO authenticated;
