-- Grant table privileges to the authenticated role.
-- RLS policies decide WHICH rows; these grants decide whether the role can
-- touch the tables at all. Both are required for SDK calls to work.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trees        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sticky_notes TO authenticated;
