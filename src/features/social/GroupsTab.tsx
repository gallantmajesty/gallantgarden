import { useState } from 'react'
import { useChat } from '../../store/chat'
import { useFriends } from '../../store/friends'
import { useSocialOverlay } from './store'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { GroupAvatar } from './GroupAvatar'
import { MAX_GROUP_MEMBERS } from '../../lib/types'
import { groupLeave } from '../../lib/groups'

export function GroupsTab() {
  const summaries = useChat((s) => s.summaries)
  const friends = useFriends((s) => s.friends)
  const createNewGroup = useChat((s) => s.createNewGroup)
  const joinByCode = useChat((s) => s.joinByCode)
  const openGroup = useSocialOverlay((s) => s.openGroup)

  const groupCustom = useChat((s) => s.groupCustom)

  const groups = summaries.filter((s) => s.kind === 'group')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const doCreate = async () => {
    if (!title.trim()) return
    setBusy(true)
    setErr(null)
    const id = await createNewGroup({ title, description: desc, memberIds: [...picked] })
    setBusy(false)
    if (id) {
      setTitle('')
      setDesc('')
      setPicked(new Set())
      setCreating(false)
      openGroup(id, true)
    } else setErr('Could not create group. Make sure you have applied the chat-upgrade migration.')
  }

  const doJoin = async () => {
    if (!code.trim()) return
    setBusy(true)
    setErr(null)
    const id = await joinByCode(code.trim())
    setBusy(false)
    if (id) {
      setCode('')
      openGroup(id, true)
    } else setErr('Invalid Group ID, or you must be friends with the host.')
  }

  return (
    <div className="sh-explore sh-groups-tab">
      <div className="sh-group-actions">
        <button className="sh-pill" type="button" onClick={() => setCreating((v) => !v)} disabled={busy}>
          + New group
        </button>
        <div className="sh-join-row">
          <input
            className="sf-input sh-search"
            placeholder="Enter Group ID (FL-XXXXXX)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            data-no-hotkeys
          />
          <button className="sh-pill" type="button" onClick={() => void doJoin()} disabled={busy || !code.trim()}>
            Join
          </button>
        </div>
      </div>
      {err && <p className="sh-error">{err}</p>}

      {creating && (
        <div className="sh-create-card">
          <input className="sf-input" placeholder="Group name" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} data-no-hotkeys />
          <textarea className="sf-input sh-create-desc" placeholder="Description (optional)" value={desc} maxLength={140} onChange={(e) => setDesc(e.target.value)} data-no-hotkeys />
          <p className="sh-section">Invite friends (optional)</p>
          <div className="sh-invite-list">
            {friends.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`sh-invite ${picked.has(f.id) ? 'on' : ''}`}
                onClick={() =>
                  setPicked((prev) => {
                    const n = new Set(prev)
                    if (n.has(f.id)) n.delete(f.id)
                    else if (n.size < MAX_GROUP_MEMBERS - 1) n.add(f.id)
                    return n
                  })
                }
              >
                <ProfileAvatar name={f.display_name} avatarUrl={f.avatar_url} rankId={f.rank} size={24} />
                <span>{f.display_name}</span>
              </button>
            ))}
            {friends.length === 0 && <p className="sh-empty">Add friends first to invite them.</p>}
          </div>
          <div className="sh-create-actions">
            <button className="sh-pill ghost" type="button" onClick={() => setCreating(false)}>Cancel</button>
            <button className="sh-pill" type="button" onClick={() => void doCreate()} disabled={busy || !title.trim()}>
              Create
            </button>
          </div>
        </div>
      )}

      <p className="sh-section">Your groups ({groups.length})</p>
      <div className="sh-list">
        {groups.length === 0 && <p className="sh-empty">No groups yet. Create one or join with a Group ID.</p>}
        {groups.map((g) => {
          const c = groupCustom[g.conversation.id]
          const name = c?.name ?? g.title ?? 'Group'
          return (
            <button key={g.conversation.id} type="button" className="sh-row" onClick={() => openGroup(g.conversation.id, true)}>
              <span className="sh-av">
                <GroupAvatar title={name} logo={c?.logo} color={c?.color} />
              </span>
              <span className="sh-row-text">
                <span className="sh-row-name">{name}</span>
                <span className="sh-row-sub">{g.memberCount} members</span>
              </span>
              {g.unreadCount > 0 && <span className="sh-row-unread" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
