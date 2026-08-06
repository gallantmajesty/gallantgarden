-- Golden-leaf store: real-money purchases credited by the Stripe webhook.
--
-- credit_golden_leaves is the ONLY path that adds premium (golden) leaves from
-- money. It runs SECURITY DEFINER and is granted exclusively to service_role, so
-- the anon/authenticated clients can never self-credit. The Stripe webhook edge
-- function calls it with the service-role key and the Stripe session id, which
-- makes the credit idempotent (a replayed webhook can't double-pay).

CREATE TABLE IF NOT EXISTS payments (
  txn_id        text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_golden integer NOT NULL,
  amount_cents  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'succeeded',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments (user_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own purchase history.
CREATE POLICY payments_select_own ON payments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON payments TO authenticated;

-- Credit golden leaves for a completed purchase (idempotent on txn_id).
CREATE OR REPLACE FUNCTION credit_golden_leaves(p_user uuid, p_amount integer, p_cents integer, p_tx text)
RETURNS boolean AS $$
BEGIN
  IF p_user IS NULL OR p_amount IS NULL OR p_tx IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO payments (txn_id, user_id, amount_golden, amount_cents)
  VALUES (p_tx, p_user, p_amount, COALESCE(p_cents, 0))
  ON CONFLICT (txn_id) DO NOTHING;

  -- Already processed (idempotent webhook replay) — nothing to do.
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  UPDATE profiles
    SET premium_xp = premium_xp + p_amount,
        rank_xp    = rank_xp + p_amount
    WHERE id = p_user;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION credit_golden_leaves(uuid, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit_golden_leaves(uuid, integer, integer, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION credit_golden_leaves(uuid, integer, integer, text) TO service_role;
