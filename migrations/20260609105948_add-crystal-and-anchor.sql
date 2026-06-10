-- Magical name marker color + which branch anchor a note is pinned to.
ALTER TABLE trees
  ADD COLUMN IF NOT EXISTS crystal_color text NOT NULL DEFAULT '#8a6cff';

ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS anchor_id integer NOT NULL DEFAULT 0;
