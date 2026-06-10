-- StudyForest core schema
-- Tables: profiles (avatar/settings), trees (note folders), sticky_notes (the notes)
-- All rows are owned by a user; RLS restricts access to the owner.

-- ============================================================
-- profiles: per-user display name + avatar customization
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Explorer',
  -- avatar holds head / hair / body_size and color choices as JSON
  avatar       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- free-form client settings (controls, audio, graphics quality, etc.)
  settings     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- trees: a tree is a "folder" of sticky notes in the forest
-- limits enforced in app: max 20 trees/user, max 1000 notes/tree
-- ============================================================
CREATE TABLE IF NOT EXISTS trees (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New Tree',
  world       text NOT NULL DEFAULT 'international',
  -- placement of the tree in the 3D forest
  pos_x       double precision NOT NULL DEFAULT 0,
  pos_y       double precision NOT NULL DEFAULT 0,
  pos_z       double precision NOT NULL DEFAULT 0,
  -- which tree model/style variant to render
  variant     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trees_owner_idx ON trees(owner_id);

-- ============================================================
-- sticky_notes: a styled note stuck on a tree at a 3D position
-- ============================================================
CREATE TABLE IF NOT EXISTS sticky_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id       uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- rich-text body (HTML from the editor) + plain text mirror for search
  content_html  text NOT NULL DEFAULT '',
  content_text  text NOT NULL DEFAULT '',
  -- styling
  color         text NOT NULL DEFAULT '#ffe27a',  -- paper color (any hex)
  bg_style      text NOT NULL DEFAULT 'solid',     -- 'solid' | 'gradient' | 'design'
  bg_value      text NOT NULL DEFAULT '',          -- gradient css / design id
  font_family   text NOT NULL DEFAULT 'Inter',
  font_size     integer NOT NULL DEFAULT 16,
  font_color    text NOT NULL DEFAULT '#1a1a1a',
  image_url     text,                              -- optional diagram image
  -- placement on the tree
  pos_x         double precision NOT NULL DEFAULT 0,
  pos_y         double precision NOT NULL DEFAULT 0,
  pos_z         double precision NOT NULL DEFAULT 0,
  rotation      double precision NOT NULL DEFAULT 0,
  -- casual/flashcard support
  is_flashcard   boolean NOT NULL DEFAULT false,
  flashcard_back text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sticky_notes_tree_idx ON sticky_notes(tree_id);
CREATE INDEX IF NOT EXISTS sticky_notes_owner_idx ON sticky_notes(owner_id);
-- full-text search over note plain-text content
CREATE INDEX IF NOT EXISTS sticky_notes_search_idx ON sticky_notes USING gin (to_tsvector('english', content_text));

-- ============================================================
-- updated_at auto-touch trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_touch     BEFORE UPDATE ON profiles     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trees_touch        BEFORE UPDATE ON trees        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sticky_notes_touch BEFORE UPDATE ON sticky_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Row Level Security: each user sees/edits only their own rows
-- ============================================================
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete ON profiles FOR DELETE USING (auth.uid() = id);

-- trees
CREATE POLICY trees_select ON trees FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY trees_insert ON trees FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY trees_update ON trees FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY trees_delete ON trees FOR DELETE USING (auth.uid() = owner_id);

-- sticky_notes
CREATE POLICY notes_select ON sticky_notes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY notes_insert ON sticky_notes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY notes_update ON sticky_notes FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY notes_delete ON sticky_notes FOR DELETE USING (auth.uid() = owner_id);
