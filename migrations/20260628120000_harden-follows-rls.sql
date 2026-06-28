-- Hardens follows / realm_presence RLS for the security audit (Phase 2):
--   • follows: direct SELECT restricted to your own edges; cross-user reads go
--     through SECURITY DEFINER RPCs (safe, no full-graph scrape).
--   • realm_presence: direct SELECT restricted to your own row; all app reads
--     already go through the SECURITY DEFINER realm_occupancy() RPC.
--
-- Rollback
-- ========
--   DROP FUNCTION IF EXISTS get_following_ids(uuid);
--   DROP FUNCTION IF EXISTS get_follower_ids(uuid);
--   DROP FUNCTION IF EXISTS get_follow_count(uuid);
--   DROP FUNCTION IF EXISTS get_is_following(uuid, uuid);
--   DROP FUNCTION IF EXISTS get_mutual_following_ids(uuid, uuid);
--   ALTER POLICY follows_select ON follows USING (true);
--   ALTER POLICY rp_select ON realm_presence USING (true);

-- ============================================================
-- 1. follows — cross-user read RPCs (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION get_following_ids(p_user_id uuid)
RETURNS uuid[] AS $$
  SELECT array_agg(following_id)
  FROM follows
  WHERE follower_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_follower_ids(p_user_id uuid)
RETURNS uuid[] AS $$
  SELECT array_agg(follower_id)
  FROM follows
  WHERE following_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_follow_count(p_user_id uuid)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'followers', (SELECT count(*) FROM follows WHERE following_id = p_user_id),
    'following', (SELECT count(*) FROM follows WHERE follower_id = p_user_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_is_following(p_follower_id uuid, p_following_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows WHERE follower_id = p_follower_id AND following_id = p_following_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_mutual_following_ids(p_a uuid, p_b uuid)
RETURNS uuid[] AS $$
  SELECT array_agg(following_id)
  FROM follows
  WHERE follower_id = p_a
    AND following_id IN (SELECT following_id FROM follows WHERE follower_id = p_b);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION
  get_following_ids(uuid),
  get_follower_ids(uuid),
  get_follow_count(uuid),
  get_is_following(uuid, uuid),
  get_mutual_following_ids(uuid, uuid)
  TO authenticated;

-- ============================================================
-- 2. follows — lock down SELECT to your own edges only
-- ============================================================

DROP POLICY IF EXISTS follows_select ON follows;
CREATE POLICY follows_select ON follows
  FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- ============================================================
-- 3. realm_presence — lock down SELECT to your own row only
--     (all app reads go through SECURITY DEFINER realm_occupancy())
-- ============================================================

DROP POLICY IF EXISTS rp_select ON realm_presence;
CREATE POLICY rp_select ON realm_presence
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
