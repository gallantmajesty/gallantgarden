import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { ProfileAvatar } from './ProfileAvatar'
import { FollowButton } from './FollowButton'
import type { PublicProfile } from '../lib/types'
import './UserListModal.css'

// A reusable modal that lazily loads + lists users (followers / following /
// mutuals / search results). Each row links to the user's public profile.
export function UserListModal({
  open,
  title,
  load,
  onClose,
}: {
  open: boolean
  title: string
  load: () => Promise<PublicProfile[]>
  onClose: () => void
}) {
  // The list body mounts only while open, so its load effect runs once per
  // open and state resets cleanly on close (no synchronous setState in effects).
  return (
    <Modal open={open} title={title} onClose={onClose}>
      {open && <UserList load={load} onClose={onClose} />}
    </Modal>
  )
}

function UserList({ load, onClose }: { load: () => Promise<PublicProfile[]>; onClose: () => void }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<PublicProfile[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void load().then((u) => {
      if (!cancelled) setUsers(u)
    })
    return () => {
      cancelled = true
    }
    // mount-only: the caller passes a fresh loader each time the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(u: PublicProfile) {
    if (u.player_id == null) return
    onClose()
    navigate(`/u/${u.player_id}`)
  }

  if (users === null) return <p className="ulm-empty">Loading…</p>
  if (users.length === 0) return <p className="ulm-empty">No one here yet.</p>
  return (
    <div className="ulm-list">
      {users.map((u) => (
        <div key={u.id} className="ulm-row">
          <button className="ulm-row-main" onClick={() => go(u)} type="button">
            <ProfileAvatar name={u.display_name} avatarUrl={u.avatar_url} rankId={u.rank} size={42} />
            <span className="ulm-row-text">
              <span className="ulm-row-name">
                {u.display_name}
                <RankBadge rankId={u.rank} size={16} className="ulm-row-rank" />
                {u.country && <Flag code={u.country} className="ulm-row-flag" />}
              </span>
              {u.player_id != null && <span className="ulm-row-handle">Player ID #{u.player_id}</span>}
            </span>
          </button>
          <FollowButton targetId={u.id} className="ulm-row-follow" />
        </div>
      ))}
    </div>
  )
}
