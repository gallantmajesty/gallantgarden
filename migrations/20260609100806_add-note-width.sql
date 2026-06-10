-- Add a per-note width (pixels) so users can resize sticky notes.
ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS width integer NOT NULL DEFAULT 150;
