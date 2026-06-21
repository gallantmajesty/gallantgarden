import { useEffect, useMemo, useState } from 'react'
import { useFriends } from '../../store/friends'
import { useChat } from '../../store/chat'
import { effectiveStatus, STATUS_COLOR } from '../../lib/presence'
import { STUDY_STATUS_LABEL, type StudyStatus, type PublicProfile } from '../../lib/types'
import { ProfileAvatar } from '../ProfileAvatar'
import { StatusDot } from './StatusDot'
import { ChatWindow } from './ChatWindow'
import './library-chat.css'

// The library's collapsible friends sidebar. Hidden by default behind a slim
// edge tab so it never covers the workspace; opens from the right with a smooth
// slide. This is the ONLY chat surface in the focus zone — no popups, no
// request prompts (those live in the Lobby). Messages that arrived during a
// focus session are simply here, waiting, when the student chooses to look.
export function LibraryFriendsPanel() {
  const [open, setOpen] = useState(false)
  const friends = useFriends((s) => s.friends)
  const meId = useFriends((s) => s.meId)

  const summaries = useChat((s) => s.summaries)
  const activeFriendId = useChat((s) => s.activeFriendId)
  const refreshSummaries = useChat((s) => s.refreshSummaries)
  const myStatus = useChat((s) => s.myStatus)
  const focusSilent = useChat((s) => s.focusSilent)

  // Poll summaries (unread dots + receipts) only while the panel is open.
  useEffect(() => {
    if (!open || !meId) return
    void refreshSummaries()
    const id = window.setInterval(() => void refreshSummaries(), 8000)
    return () => window.clearInterval(id)
  }, [open, meId, refreshSummaries])

  const unreadIds = useMemo(
    () => new Set(summaries.filter((s) => s.unread && s.otherUserId).map((s) => s.otherUserId as string)),
    [summaries],
  )
  const anyUnread = unreadIds.size > 0

  // friends sorted: unread first, then online, then by name
  const sorted = useMemo(() => {
    const score = (f: PublicProfile) => {
      const online = effectiveStatus(f) !== 'offline'
      return (unreadIds.has(f.id) ? 0 : 1) * 10 + (online ? 0 : 1)
    }
    return [...friends].sort(
      (a, b) => score(a) - score(b) || a.display_name.localeCompare(b.display_name),
    )
  }, [friends, unreadIds])

  const onlineCount = useMemo(() => friends.filter((f) => effectiveStatus(f) !== 'offline').length, [friends])

  return (
    <>
      {/* edge tab — always present, unobtrusive */}
      <button
        className={`lcf-tab ${open ? 'hidden' : ''} ${anyUnread && !focusSilent ? 'alert' : ''}`}
        onClick={() => setOpen(true)}
        title="Friends"
      >
        <FriendsGlyph />
        <span className="lcf-tab-label">Friends</span>
        {onlineCount > 0 && <span className="lcf-tab-count">{onlineCount}</span>}
        {anyUnread && !focusSilent && <span className="lcf-tab-dot" />}
      </button>

      <aside className={`lcf-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <header className="lcf-head">
          <div className="lcf-head-title">
            <strong>Friends</strong>
            <span className="lcf-head-sub">{onlineCount} online</span>
          </div>
          <StatusPicker status={myStatus} />
          <button className="lcf-collapse" onClick={() => setOpen(false)} title="Collapse" aria-label="Collapse">
            ›
          </button>
        </header>

        {focusSilent && (
          <div className="lcf-focus-note">
            <span className="lcf-focus-dot" /> Focus mode — chats are silent. Messages wait quietly here.
          </div>
        )}

        <div className="lcf-list">
          {sorted.length === 0 && (
            <p className="lcf-empty">
              No friends yet. Add friends from the Lobby, then chat with them here while you study.
            </p>
          )}
          {sorted.map((f) => {
            const status = effectiveStatus(f)
            return (
              <button
                key={f.id}
                className={`lcf-friend ${activeFriendId === f.id ? 'active' : ''}`}
                onClick={() => useChat.getState().openDm(f.id)}
              >
                <span className="lcf-friend-av">
                  <ProfileAvatar name={f.display_name} avatarUrl={f.avatar_url} rankId={f.rank} size={36} />
                  <span className="lcf-friend-status" style={{ background: STATUS_COLOR[status] }} />
                </span>
                <span className="lcf-friend-text">
                  <span className="lcf-friend-name">{f.display_name}</span>
                  <span className="lcf-friend-sub">{STUDY_STATUS_LABEL[status]}</span>
                </span>
                {unreadIds.has(f.id) && <span className="lcf-friend-unread" />}
              </button>
            )
          })}
        </div>
      </aside>

      {/* the active chat window floats beside the panel */}
      <ChatWindow />
    </>
  )
}

/* ----- my-status picker (calm dropdown) ----- */
const PICKABLE: StudyStatus[] = ['available', 'studying', 'break', 'offline']

function StatusPicker({ status }: { status: StudyStatus }) {
  const [open, setOpen] = useState(false)
  const setMyStatus = useChat((s) => s.setMyStatus)
  return (
    <div className="lcf-status">
      <button className="lcf-status-btn" onClick={() => setOpen((v) => !v)} title="Your status">
        <StatusDot status={status} />
        <span>{STUDY_STATUS_LABEL[status]}</span>
        <span className="lcf-status-chev">▾</span>
      </button>
      {open && (
        <>
          <div className="lcf-status-scrim" onClick={() => setOpen(false)} />
          <div className="lcf-status-menu">
            {status === 'focus' && <div className="lcf-status-auto">Auto: focus session active</div>}
            {PICKABLE.map((s) => (
              <button
                key={s}
                className={`lcf-status-item ${status === s ? 'on' : ''}`}
                onClick={() => {
                  setMyStatus(s)
                  setOpen(false)
                }}
              >
                <StatusDot status={s} />
                {STUDY_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FriendsGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6z M2 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M16 14a6 6 0 016 6" />
    </svg>
  )
}
