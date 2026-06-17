-- Harden the public_profiles view.
--
-- New relations inherit broad default privileges for anon/authenticated on this
-- backend. Because public_profiles is a SIMPLE (auto-updatable) view that runs
-- with its owner's rights (security_invoker is off, by design, so SELECT can
-- project past owner-only RLS), an INSERT/UPDATE/DELETE through the view would
-- execute as the owner and BYPASS the base profiles RLS. That must never be
-- reachable from client roles.
--
-- Lock the view to read-only, authenticated-only access:
REVOKE ALL ON public_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public_profiles FROM authenticated;
-- (SELECT for authenticated was granted in the creating migration and remains.)
