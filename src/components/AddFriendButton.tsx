import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useFriends } from '../store/friends'

// Friend handshake button. Mirrors FollowButton's shape but with four states:
//   not connected → "Add friend"   (sends a request)
//   outgoing pending → "Requested" (disabled)
//   incoming pending → "Accept"    (accepts their request)
//   already friends  → "Friends"   (click to unfriend, with confirm)
// Renders nothing for yourself or when there's no target.
export function AddFriendButton({
  targetId,
  className = '',
}: {
  targetId: string | null
  className?: string
}) {
  const { t } = useTranslation()
  const meId = useFriends((s) => s.meId)
  const isFriend = useFriends((s) => (targetId ? s.friendIds.has(targetId) : false))
  const outgoing = useFriends((s) => (targetId ? s.outgoing.some((r) => r.addressee_id === targetId) : false))
  const incoming = useFriends((s) => (targetId ? s.incoming.find((r) => r.requester_id === targetId) : undefined))
  const blocked = useFriends((s) => (targetId ? s.blockedIds.has(targetId) : false))
  const { sendRequest, accept, unfriend } = useFriends()
  const [busy, setBusy] = useState(false)

  if (!targetId || !meId || targetId === meId || blocked) return null

  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    await fn()
    setBusy(false)
  }

  if (isFriend) {
    return (
      <button
        type="button"
        className={`sf-btn secondary friend-btn is-friend ${className}`.trim()}
        disabled={busy}
        onClick={() => {
          if (window.confirm(t('addFriend.confirmUnfriend')))
            void run(() => unfriend(targetId))
        }}
      >
        {t('addFriend.friends')}
      </button>
    )
  }
  if (incoming) {
    return (
      <button
        type="button"
        className={`sf-btn friend-btn ${className}`.trim()}
        disabled={busy}
        onClick={() => void run(() => accept(incoming.id))}
      >
        {t('addFriend.acceptRequest')}
      </button>
    )
  }
  if (outgoing) {
    return (
      <button type="button" className={`sf-btn secondary friend-btn ${className}`.trim()} disabled>
        {t('addFriend.requested')}
      </button>
    )
  }
  return (
    <button
      type="button"
      className={`sf-btn friend-btn ${className}`.trim()}
      disabled={busy}
      onClick={() => void run(() => sendRequest(targetId))}
    >
      {t('addFriend.addFriend')}
    </button>
  )
}