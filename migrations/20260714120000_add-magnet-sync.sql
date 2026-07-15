-- Task Magnet cloud sync: mirror each user's private MagnetData (the whole
-- Task Magnet universe) to Postgres so it follows them across devices.
--
-- The entire model is stored as one JSONB document per user. It's private:
-- RLS restricts every row to its owner (auth.uid()).

CREATE TABLE IF NOT EXISTS magnet_data (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE magnet_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS magnet_data_owner ON magnet_data;
CREATE POLICY magnet_data_owner
  ON magnet_data
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE, DELETE ON magnet_data TO authenticated;
