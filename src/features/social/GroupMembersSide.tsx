import { useChat } from '../../store/chat'
import { useSocialOverlay } from './store'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { GROUP_ROLE_LABEL, type GroupRole } from '../../lib/types'
import { groupSetRole, groupRemoveMember, groupLeave } from '../../lib/groups'

/** Right-hand "members" panel for the full-screen overlay. */
export function GroupMembersSide({ onClose }: { onClose: () => void }) {
  const activeGroupId = useSocialOverlay((s) => s.activeGroupId)
  const members = useChat((s) => s.groupMembers)
  const refresh = useChat((s) => s.refreshGroupMembers)
  const meId = useChat((s) => s.meId)
  const myRole: GroupRole = useChat.getState().groupMembers.find((m) => m.user_id === meId)?.role ?? 'member'
  const canManage = myRole === 'owner' || myRole === 'admin'

  if (!activeGroupId) return null

  return (
    <div className="sh-members-panel">
      <header className="sh-members-head">
        <strong>Members · {members.length}</strong>
        <button className="sh-icon" type="button" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="sh-list">
        {members.map((m) => (
          <div key={m.user_id} className="sh-row sh-member-row">
            <span className="sh-av">
              <ProfileAvatar name={m.profile?.display_name ?? 'U'} avatarUrl={m.profile?.avatar_url} rankId={m.profile?.rank} size={36} />
            </span>
            <span className="sh-row-text">
              <span className="sh-row-name">
                {m.profile?.display_name ?? 'User'}
                {m.user_id === meId && <span className="sh-row-handle">you</span>}
              </span>
              <span className="sh-row-sub">{GROUP_ROLE_LABEL[m.role]}</span>
            </span>
            {canManage && m.user_id !== meId && m.role !== 'owner' && (
              <span className="sh-row-actions">
                {myRole === 'owner' && m.role === 'member' && (
                  <button className="sh-pill ghost" type="button" onClick={() => groupSetRole(activeGroupId, m.user_id, 'admin').then(() => refresh())}>Make mod</button>
                )}
                {m.role === 'admin' && myRole === 'owner' && (
                  <button className="sh-pill ghost" type="button" onClick={() => groupSetRole(activeGroupId, m.user_id, 'member').then(() => refresh())}>Demote</button>
                )}
                <button className="sh-pill ghost" type="button" onClick={() => groupRemoveMember(activeGroupId, m.user_id).then(() => refresh())}>Remove</button>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="sh-members-foot">
        <button className="sh-pill ghost" type="button" onClick={() => void groupLeave(activeGroupId)}>Leave group</button>
      </div>
    </div>
  )
}
