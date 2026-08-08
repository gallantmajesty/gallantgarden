-- Self-service account deletion (DPDP right to erasure).
-- A user can permanently delete their own account + personal data.
--
-- Security model:
--   * delete_my_account() is SECURITY DEFINER but ONLY ever operates on
--     auth.uid() — there is no way to pass another user's id.
--   * Financial records are NOT destroyed: the payments FK is switched to
--     ON DELETE SET NULL so the row survives (anonymized) for legal/accounting
--     reasons. Razorpay/Stripe keep their own records regardless.
--   * Group conversations survive their creator leaving: conversations.created_by
--     is switched to ON DELETE SET NULL (was CASCADE, which would have deleted
--     the whole group chat for everyone when one member deleted their account).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS delete_my_account();
--   ALTER TABLE payments DROP CONSTRAINT payments_user_id_fkey;
--   ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
--   ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--   ALTER TABLE conversations DROP CONSTRAINT conversations_created_by_fkey;
--   ALTER TABLE conversations ALTER COLUMN created_by SET NOT NULL;
--   ALTER TABLE conversations ADD CONSTRAINT conversations_created_by_fkey
--     FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- 1. Anonymize (not destroy) financial records on user deletion
--    (guarded: the payments table only exists once
--    migrations/20260806000000_add-payments.sql has been applied)
-- ============================================================
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE IF EXISTS payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS payments ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 2. Group chats survive their creator leaving
-- ============================================================
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;
ALTER TABLE IF EXISTS conversations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE IF EXISTS conversations ADD CONSTRAINT conversations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 3. delete_my_account() — wipes the caller's own data
-- ============================================================
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Chat: my messages, reactions, memberships. Conversations that become
  -- empty (DM pair where I was a member) are removed; group chats with other
  -- members stay untouched.
  DELETE FROM messages WHERE sender_id = me;
  DELETE FROM message_reactions WHERE user_id = me;
  DELETE FROM conversation_members WHERE user_id = me;
  DELETE FROM conversation_typing WHERE user_id = me;
  DELETE FROM conversations c
    WHERE NOT EXISTS (
      SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id
    );

  -- Social graph
  DELETE FROM follows WHERE follower_id = me OR following_id = me;
  DELETE FROM friend_requests WHERE requester_id = me OR addressee_id = me;
  DELETE FROM friendships WHERE user_a = me OR user_b = me;
  DELETE FROM blocks WHERE blocker_id = me OR blocked_id = me;
  DELETE FROM reports WHERE reporter_id = me;

  -- Realms (memberships/presence/bans/realm rows all cascade from auth.users)
  DELETE FROM realm_presence WHERE user_id = me;

  -- Sessions, rewards, sync blobs, rate-limit rows
  DELETE FROM active_session WHERE user_id = me;
  DELETE FROM daily_rewards WHERE user_id = me;
  DELETE FROM rate_limits WHERE user_id = me;
  DELETE FROM magnet_data WHERE id = me;
  DELETE FROM error_logs WHERE user_id = me;

  -- Profile row, then the auth user itself (everything else cascades).
  DELETE FROM profiles WHERE id = me;
  DELETE FROM auth.users WHERE id = me;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;
