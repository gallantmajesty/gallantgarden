-- Social graph: a directed follow edge (follower -> following).
--
-- Powers follower/following lists, counts, and mutual-follower detection. Reads
-- are open to any authenticated user (you need to see who follows whom to render
-- a public profile); writes are restricted to your own edge so nobody can forge
-- follows on another user's behalf. Counts are derived from this table — no
-- denormalised counters in the first cut.

CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- follower_id is already the leading PK column (fast "who do I follow");
-- add the reverse index for "who follows X" (follower lists + counts).
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (needed for lists / counts / mutual).
CREATE POLICY follows_select ON follows
  FOR SELECT TO authenticated USING (true);

-- INSERT / DELETE: only your own outgoing edge.
CREATE POLICY follows_insert ON follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete ON follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

GRANT SELECT, INSERT, DELETE ON follows TO authenticated;
