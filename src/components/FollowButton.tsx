import { useState } from 'react'
import { useSocial } from '../store/social'

// Follow / Following toggle backed by the optimistic social store. Renders
// nothing when there is no target or the target is yourself.
export function FollowButton({
  targetId,
  className = '',
  onChange,
}: {
  targetId: string | null
  className?: string
  onChange?: (following: boolean) => void
}) {
  const meId = useSocial((s) => s.meId)
  const following = useSocial((s) => (targetId ? s.following.has(targetId) : false))
  const toggleFollow = useSocial((s) => s.toggleFollow)
  const [busy, setBusy] = useState(false)

  if (!targetId || !meId || targetId === meId) return null

  async function onClick() {
    if (busy || !targetId) return
    setBusy(true)
    const now = await toggleFollow(targetId)
    setBusy(false)
    onChange?.(now)
  }

  return (
    <button
      type="button"
      className={`sf-btn ${following ? 'secondary' : ''} follow-btn ${following ? 'is-following' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={busy}
      aria-pressed={following}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
