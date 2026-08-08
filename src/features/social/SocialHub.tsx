import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../store/auth'
import { useChat } from '../../store/chat'
import { useFriends } from '../../store/friends'
import { searchUsers } from '../../lib/social'
import { effectiveStatus, STATUS_COLOR } from '../../lib/presence'
import { STUDY_STATUS_LABEL, type PublicProfile } from '../../lib/types'
import { ProfileAvatar } from '../../components/ProfileAvatar'
import { RankBadge } from '../../components/RankBadge'
import { Flag } from '../../components/Flag'
import { AddFriendButton } from '../../components/AddFriendButton'
import { FollowButton } from '../../components/FollowButton'
import { useSocialOverlay, type SocialTab } from './store'
import { ChatThread, type ReplyTarget } from './ChatThread'
import { ChatComposer } from './ChatComposer'
import { GroupsTab } from './GroupsTab'
import { GroupMembersSide } from './GroupMembersSide'
import { ChatSettingsPanel } from './ChatSettingsPanel'
import { GroupAvatar } from './GroupAvatar'
import { useChatCompact, useChatThemeName, useChatSettings } from './chatSettings'
import './social.css'

function useEnsureHydrated() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user?.id) return
    const chat = useChat.getState()
    const friends = useFriends.getState()
    if (!chat.meId) void chat.hydrate(user.id)
    if (!friends.meId) void friends.hydrate(user.id)
  }, [user?.id])
}

const TABS: [SocialTab, string][] = [
  ['chats', 'Chats'],
  ['explore', 'Explore'],
  ['groups', 'Groups'],
]

function ChatGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  )
}

/* -------------------------------------------------------------- launcher */

function LauncherBar() {
  const openHub = useSocialOverlay((s) => s.openHub)
  const summaries = useChat((s) => s.summaries)
  const friends = useFriends((s) => s.friends)
  const focusSilent = useChat((s) => s.focusSilent)
  const total = summaries.reduce((n, s) => n + (s.unreadCount || (s.unread ? 1 : 0)), 0)

  const avatars = useMemo(() => {
    return summaries
      .filter((s) => s.unread && s.otherUserId)
      .slice(0, 3)
      .map((s) => {
        const f = friends.find((fr) => fr.id === s.otherUserId)
        return { id: s.otherUserId as string, name: f?.display_name ?? 'Friend', avatarUrl: f?.avatar_url ?? null, rank: f?.rank ?? null }
      })
  }, [summaries, friends])

  return (
    <button
      className={`sh-launcher ${total > 0 && !focusSilent ? 'alert' : ''}`}
      onClick={() => openHub({ fullscreen: false })}
      title="Open chat"
      type="button"
    >
      <ChatGlyph />
      {avatars.length > 0 ? (
        <span className="sh-launcher-stack">
          {avatars.map((a) => (
            <ProfileAvatar key={a.id} name={a.name} avatarUrl={a.avatarUrl} rankId={a.rank} size={26} className="sh-launcher-av" />
          ))}
        </span>
      ) : (
        <span className="sh-launcher-label">Chat</span>
      )}
      {total > 0 && <span className="sh-launcher-badge">{total > 99 ? '99+' : total}</span>}
    </button>
  )
}

/* -------------------------------------------------------------- chat list */

function ChatList({ onPick }: { onPick: (id: string, isGroup: boolean) => void }) {
  const summaries = useChat((s) => s.summaries)
  const friends = useFriends((s) => s.friends)
  const compact = useChatCompact()
  const byId = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends])

  const rows = useMemo(
    () =>
      summaries
        .map((s) => {
          if (s.kind === 'group') {
            return { id: s.conversation.id, isGroup: true, name: s.title ?? 'Group', avatarUrl: null, rank: null, country: null, status: 'available' as const, unread: s.unreadCount, last: lastText(s), time: s.lastActivity }
          }
          const fid = s.otherUserId
          if (!fid) return null
          const f = byId.get(fid)
          return {
            id: fid,
            isGroup: false,
            name: f?.display_name ?? 'Friend',
            avatarUrl: f?.avatar_url ?? null,
            rank: f?.rank ?? null,
            country: f?.country ?? null,
            status: f ? effectiveStatus(f) : ('offline' as const),
            unread: s.unreadCount,
            last: lastText(s),
            time: s.lastActivity,
          }
        })
        .filter(Boolean) as Array<{ id: string; isGroup: boolean; name: string; avatarUrl: string | null; rank: string | null; country: string | null; status: keyof typeof STATUS_COLOR; unread: number; last: string; time: string }>,
    [summaries, byId],
  )

  if (rows.length === 0) return <p className="sh-empty">No chats yet. Use Explore to add friends, or create a group.</p>

  return (
    <div className={`sh-list ${compact ? 'compact' : ''}`}>
      {rows.map((r) => (
        <button key={r.id} className="sh-row" onClick={() => onPick(r.id, r.isGroup)} type="button">
          <span className="sh-av">
            {r.isGroup ? (
              <GroupAvatar title={r.name} size={40} />
            ) : (
              <>
                <ProfileAvatar name={r.name} avatarUrl={r.avatarUrl} rankId={r.rank} size={40} />
                <span className="sh-status" style={{ background: STATUS_COLOR[r.status] }} />
              </>
            )}
          </span>
          <span className="sh-row-text">
            <span className="sh-row-name">
              {r.name}
              {r.country && <Flag code={r.country} className="sh-row-flag" />}
            </span>
            <span className="sh-row-sub sh-row-last">{r.last}</span>
          </span>
          {r.unread > 0 ? <span className="sh-row-badge">{r.unread > 99 ? '99+' : r.unread}</span> : <span className="sh-row-time">{fmtShort(r.time)}</span>}
        </button>
      ))}
    </div>
  )
}

function lastText(s: import('../../lib/chat').ConversationSummary): string {
  if (!s.lastMessage) return 'No messages yet'
  const lm = s.lastMessage
  if (lm.kind === 'image') return '📷 Photo'
  if (lm.kind === 'sticker') return 'Sticker'
  if (lm.kind === 'link') return '🔗 Link'
  return lm.body || 'Message'
}
function fmtShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  return d.toLocaleDateString([], { month: 'numeric', day: 'numeric' })
}

/* ----------------------------------------------------------- conversation */

function ConversationView({ onBack }: { onBack: () => void }) {
  const activeGroupId = useSocialOverlay((s) => s.activeGroupId)
  const activeConversationId = useSocialOverlay((s) => s.activeConversationId)
  const setPanel = useSocialOverlay((s) => s.setPanel)
  const panel = useSocialOverlay((s) => s.panel)
  const friends = useFriends((s) => s.friends)
  const summaries = useChat((s) => s.summaries)
  const meId = useChat((s) => s.meId)
  const openDm = useChat((s) => s.openDm)
  const openGroup = useChat((s) => s.openGroup)
  const [reply, setReply] = useState<ReplyTarget | null>(null)

  const isGroup = !!activeGroupId
  const id = activeGroupId ?? activeConversationId

  useEffect(() => {
    if (activeGroupId) void openGroup(activeGroupId)
    else if (activeConversationId) void openDm(activeConversationId)
    setReply(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId, activeConversationId])

  if (!id) return null

  const summary = summaries.find((s) => s.conversation.id === id)
  const friend = isGroup ? null : friends.find((f) => f.id === summary?.otherUserId) ?? null

  const header = isGroup ? (
    <>
      <span className="sh-av"><GroupAvatar title={summary?.title ?? 'Group'} size={36} /></span>
      <span className="sh-conv-name">
        {summary?.title ?? 'Group'}
        <span className="sh-conv-sub">{summary?.memberCount ?? 0} members</span>
      </span>
      <button className="sh-icon" type="button" title="Members" onClick={() => setPanel(panel === 'members' ? 'none' : 'members')}>👥</button>
    </>
  ) : (
    <>
      <span className="sh-av">
        <ProfileAvatar name={friend?.display_name ?? 'Friend'} avatarUrl={friend?.avatar_url} rankId={friend?.rank} size={36} />
        <span className="sh-status" style={{ background: STATUS_COLOR[friend ? effectiveStatus(friend) : 'offline'] }} />
      </span>
      <span className="sh-conv-name">
        {friend?.display_name ?? 'Friend'}
        <span className="sh-conv-sub">{friend ? STUDY_STATUS_LABEL[effectiveStatus(friend)] : 'Offline'}</span>
      </span>
    </>
  )

  return (
    <div className="sh-conv">
      <header className="sh-conv-head">
        <button className="sh-back" onClick={onBack} title="Back" type="button">‹</button>
        {header}
        <button className="sh-icon" type="button" title="Chat settings" onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')}>⚙</button>
      </header>
      <ChatThread isGroup={isGroup} onReply={setReply} />
      <ChatComposer reply={reply} onClearReply={() => setReply(null)} />
    </div>
  )
}

/* -------------------------------------------------------------- explore tab */

function ExploreTab() {
  const meId = useFriends((s) => s.meId)
  const incoming = useFriends((s) => s.incoming)
  const outgoing = useFriends((s) => s.outgoing)
  const friends = useFriends((s) => s.friends)
  const { accept, decline } = useFriends()
  const openConversation = useSocialOverlay((s) => s.openConversation)
  const openGroup = useSocialOverlay((s) => s.openGroup)

  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef<number | null>(null)

  useEffect(() => {
    const query = q.trim()
    if (debounce.current) window.clearTimeout(debounce.current)
    if (query.length < 1) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounce.current = window.setTimeout(async () => {
      const r = await searchUsers(query)
      setResults(r.filter((u) => u.id !== meId))
      setSearching(false)
    }, 350)
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current)
    }
  }, [q, meId])

  return (
    <div className="sh-explore">
      <input className="sf-input sh-search" placeholder="Search by name or Player ID…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus data-no-hotkeys />

      {q.trim().length >= 1 && (
        <div className="sh-list">
          {searching && <p className="sh-empty">Searching…</p>}
          {!searching && results.length === 0 && <p className="sh-empty">No explorers found.</p>}
          {results.map((u) => (
            <div key={u.id} className="sh-row">
              <span className="sh-av">
                <ProfileAvatar name={u.display_name} avatarUrl={u.avatar_url} rankId={u.rank} size={40} />
              </span>
              <span className="sh-row-text">
                <span className="sh-row-name">
                  {u.display_name}
                  {u.player_id != null && <span className="sh-row-handle">#{u.player_id}</span>}
                  {u.country && <Flag code={u.country} className="sh-row-flag" />}
                </span>
                <span className="sh-row-sub"><RankBadge rankId={u.rank} size={14} /></span>
              </span>
              <span className="sh-row-actions">
                <AddFriendButton targetId={u.id} className="sh-pill" />
                <FollowButton targetId={u.id} className="sh-pill" />
              </span>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <>
          <p className="sh-section">Incoming requests</p>
          <div className="sh-list">
            {incoming.map((r) =>
              r.profile ? (
                <div key={r.id} className="sh-row">
                  <span className="sh-av">
                    <ProfileAvatar name={r.profile.display_name} avatarUrl={r.profile.avatar_url} rankId={r.profile.rank} size={40} />
                  </span>
                  <span className="sh-row-text">
                    <span className="sh-row-name">{r.profile.display_name}</span>
                  </span>
                  <span className="sh-row-actions">
                    <button className="sh-pill" onClick={() => void accept(r.id)} type="button">Accept</button>
                    <button className="sh-pill ghost" onClick={() => void decline(r.id)} type="button">Decline</button>
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </>
      )}

      {incoming.length === 0 && outgoing.length === 0 && !q.trim() && (
        <>
          <p className="sh-section">Your friends</p>
          <div className="sh-list">
            {friends.length === 0 && <p className="sh-empty">No friends yet — search above.</p>}
            {friends.map((f) => (
              <div key={f.id} className="sh-row">
                <span className="sh-av">
                  <ProfileAvatar name={f.display_name} avatarUrl={f.avatar_url} rankId={f.rank} size={40} />
                  <span className="sh-status" style={{ background: STATUS_COLOR[effectiveStatus(f)] }} />
                </span>
                <span className="sh-row-text">
                  <span className="sh-row-name">
                    {f.display_name}
                    {f.country && <Flag code={f.country} className="sh-row-flag" />}
                  </span>
                  <span className="sh-row-sub">{STUDY_STATUS_LABEL[effectiveStatus(f)]}</span>
                </span>
                <span className="sh-row-actions">
                  <button className="sh-pill" onClick={() => openConversation(f.id, true)} type="button">Message</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ full-screen */

function ExploreOverlay() {
  const { tab, setTab, setFullscreen, close, panel, setPanel, clearConversation, clearGroup } = useSocialOverlay()
  const openConversation = useSocialOverlay((s) => s.openConversation)
  const openGroup = useSocialOverlay((s) => s.openGroup)
  const activeConversationId = useSocialOverlay((s) => s.activeConversationId)
  const activeGroupId = useSocialOverlay((s) => s.activeGroupId)
  const theme = useChatThemeName()
  const settings = useChatSettings()

  const cardClass = `sh-overlay-card theme-${theme} style-${settings.bubbleStyle}`
  const cardStyle = { ['--sh-font' as string]: `${settings.fontSize}px` } as React.CSSProperties

  const pick = (id: string, isGroup: boolean) => (isGroup ? openGroup(id, true) : openConversation(id, true))

  return (
    <div className="sh-overlay" data-no-hotkeys>
      <div className={cardClass} style={cardStyle}>
        <header className="sh-ov-head">
          <button className="sh-back" title="Back to panel" onClick={() => setFullscreen(false)} type="button">‹</button>
          <div className="sh-tabs">
            {TABS.map(([id, label]) => (
              <button key={id} className={`sh-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)} type="button">
                {label}
              </button>
            ))}
          </div>
          <button className="sh-icon" title="Close" onClick={close} type="button">×</button>
        </header>

        <div className="sh-ov-body">
          {tab === 'chats' && (activeConversationId || activeGroupId ? <ConversationView onBack={activeGroupId ? clearGroup : clearConversation} /> : <ChatList onPick={pick} />)}
          {tab === 'explore' && <ExploreTab />}
          {tab === 'groups' && <GroupsTab />}
          {panel === 'settings' && (
            <div className="sh-ov-side">
              <ChatSettingsPanel onClose={() => setPanel('none')} />
            </div>
          )}
          {panel === 'members' && activeGroupId && (
            <div className="sh-ov-side">
              <GroupMembersSide onClose={() => setPanel('none')} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- hub */

export function SocialHub() {
  const { user } = useAuth()
  const open = useSocialOverlay((s) => s.open)
  const fullscreen = useSocialOverlay((s) => s.fullscreen)
  useEnsureHydrated()

  if (!user) return null
  if (!open) return <LauncherBar />
  return fullscreen ? <ExploreOverlay /> : <MiniDock />
}

function MiniDock() {
  const setFullscreen = useSocialOverlay((s) => s.setFullscreen)
  const close = useSocialOverlay((s) => s.close)
  const clearConversation = useSocialOverlay((s) => s.clearConversation)
  const clearGroup = useSocialOverlay((s) => s.clearGroup)
  const openConversation = useSocialOverlay((s) => s.openConversation)
  const openGroup = useSocialOverlay((s) => s.openGroup)
  const activeConversationId = useSocialOverlay((s) => s.activeConversationId)
  const activeGroupId = useSocialOverlay((s) => s.activeGroupId)
  const theme = useChatThemeName()
  const settings = useChatSettings()
  const dockClass = `sh-dock theme-${theme} style-${settings.bubbleStyle}`
  const dockStyle = { ['--sh-font' as string]: `${settings.fontSize}px` } as React.CSSProperties

  const pick = (id: string, isGroup: boolean) => (isGroup ? openGroup(id, false) : openConversation(id, false))

  return (
    <div className={dockClass} style={dockStyle}>
      <header className="sh-dock-head">
        <strong>Chats</strong>
        <div className="sh-dock-actions">
          <button className="sh-icon" title="Expand" onClick={() => setFullscreen(true)} type="button">⤢</button>
          <button className="sh-icon" title="Close" onClick={close} type="button">×</button>
        </div>
      </header>
      <div className="sh-dock-body">
        {activeConversationId || activeGroupId ? (
          <ConversationView onBack={activeGroupId ? clearGroup : clearConversation} />
        ) : (
          <ChatList onPick={pick} />
        )}
      </div>
    </div>
  )
}
