import { useChat } from '../../store/chat'
import { useSocialOverlay } from './store'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { GROUP_ROLE_LABEL, type GroupRole } from '../../lib/types'
import { groupSetRole, groupRemoveMember, groupLeave } from '../../lib/groups'

function RoleBadge({ role }: { role: GroupRole }) {
  if (role === 'owner') {
    return (
      <span className="sh-role-badge owner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 17h20M4 17l-1-8 5.5 4L12 5l3.5 8L21 9l-1 8" /></svg>
        Owner
      </span>
    )
  }
  if (role === 'admin') {
    return (
      <span className="sh-role-badge admin">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        Admin
      </span>
    )
  }
  return (
    <span className="sh-role-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
      {GROUP_ROLE_LABEL[role]}
    </span>
  )
}

/** Right-hand "members" panel for the full-screen overlay. Shows the group
 *  info (name / description / join code) plus the roster with role badges,
 *  and lets owners/admins promote, demote, and remove members. */
export function GroupMembersSide({ onClose }: { onClose: () => void }) {
  const activeGroupId = useSocialOverlay((s) => s.activeGroupId)
  const members = useChat((s) => s.groupMembers)
  const summaries = useChat((s) => s.summaries)
  const refresh = useChat((s) => s.refreshGroupMembers)
  const meId = useChat((s) => s.meId)
  const myRole: GroupRole = useChat.getState().groupMembers.find((m) => m.user_id === meId)?.role ?? 'member'
  const canManage = myRole === 'owner' || myRole === 'admin'

  if (!activeGroupId) return null

  const summary = summaries.find((s) => s.conversation.id === activeGroupId)

  return (
    <div className="sh-members-panel">
      <header className="sh-members-head">
        <strong>Group info</strong>
        <button className="sh-icon" type="button" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="sh-group-info">
        <p className="sh-group-info-name">{summary?.title ?? 'Group'}</p>
        {summary?.conversation.description ? <p className="sh-group-info-desc">{summary.conversation.description}</p> : null}
        <p className="sh-group-info-meta">
          {members.length} members · join code <strong>{summary?.joinCode ?? '—'}</strong>
        </p>
      </div>

      <p className="sh-section">Members</p>
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
              <span className="sh-row-sub"><RoleBadge role={m.role} /></span>
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
