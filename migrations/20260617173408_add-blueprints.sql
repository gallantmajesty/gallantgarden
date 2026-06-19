-- Custom Blueprint replaces the old Tree Sticky Notes feature.
-- Drop the forest tables (their RLS policies + triggers go with them via CASCADE)
-- and add a single `blueprints` table that stores each board as one JSONB doc.

DROP TABLE IF EXISTS sticky_notes CASCADE;
DROP TABLE IF EXISTS trees CASCADE;

-- ============================================================
-- blueprints: one infinite-canvas board per row, owned by a user.
-- The whole board (nodes, edges, connection types, viewport, versions)
-- lives in `doc` as JSONB. Boards are small (a student's personal board),
-- so whole-document read/write is acceptable here.
-- ============================================================
CREATE TABLE IF NOT EXISTS blueprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Untitled Blueprint',
  doc         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blueprints_owner_idx ON blueprints(owner_id);

-- reuse the existing set_updated_at() trigger function (created in core schema)
CREATE TRIGGER blueprints_touch BEFORE UPDATE ON blueprints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security: each user sees/edits only their own boards.
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY blueprints_select ON blueprints FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY blueprints_insert ON blueprints FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY blueprints_update ON blueprints FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY blueprints_delete ON blueprints FOR DELETE USING (auth.uid() = owner_id);

-- Grant table privileges to the authenticated role (RLS still filters rows).
GRANT SELECT, INSERT, UPDATE, DELETE ON blueprints TO authenticated;
