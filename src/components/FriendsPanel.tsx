import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocial } from '../store/social'
import { useFriends } from '../store/friends'
import { searchUsers, getProfilesByIds, getFollowerIds, getFollowingIds } from '../lib/social'
import type { PublicProfile } from '../lib/types'
import { Modal } from './Modal'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { ProfileAvatar } from './ProfileAvatar'
import { FollowButton } from './FollowButton'
import { AddFriendButton } from './AddFriendButton'
import './FriendsPanel.css'

type Tab = 'find' | 'friends' | 'requests' | 'following' | 'followers'

// Social hub (Lobby): find explorers, send/answer friend requests, manage
// friends, and browse follows. Friend requests + accepted friends gate the chat
// system — this is the ONLY place requests are surfaced (the library never
// interrupts focus with them).
export function FriendsPanel({ onClose }: { onClose: () => void }) {
  const meId = useSocial((s) => s.meId)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('find')

  const friends = useFriends((s) => s.friends)
  const incoming = useFriends((s) => s.incoming)
  const outgoing = useFriends((s) => s.outgoing)
  const { accept, decline, refreshRequests, refreshFriends } = useFriends()

  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef<number | null>(null)

  const [following, setFollowing] = useState<PublicProfile[] | null>(null)
  const [followers, setFollowers] = useState<PublicProfile[] | null>(null)

  // keep requests/friends fresh whenever the hub opens
  useEffect(() => {
    void refreshRequests()
    void refreshFriends()
  }, [refreshRequests, refreshFriends])

  // live search (debounced)
  useEffect(() => {
    const query = q.trim()
    let active = true
    if (debounce.current) window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(async () => {
      if (query.length < 2) {
        if (active) {
          setResults([])
          setSearching(false)
        }
        return
      }
      if (active) setSearching(true)
      const r = await searchUsers(query)
      if (active) {
        setResults(r.filter((u) => u.id !== meId))
        setSearching(false)
      }
    }, query.length < 2 ? 0 : 350)
    return () => {
      active = false
      if (debounce.current) window.clearTimeout(debounce.current)
    }
  }, [q, meId])

  useEffect(() => {
    if (!meId) return
    if (tab === 'following' && following === null)
      void getFollowingIds(meId).then(getProfilesByIds).then(setFollowing)
    if (tab === 'followers' && followers === null)
      void getFollowerIds(meId).then(getProfilesByIds).then(setFollowers)
  }, [tab, meId, following, followers])

  function go(u: PublicProfile) {
    if (!u.username) return
    onClose()
    navigate(`/u/${u.username}`)
  }

  const TABS: [Tab, string][] = [
    ['find', 'Find'],
    ['friends', 'Friends'],
    ['requests', 'Requests'],
    ['following', 'Following'],
    ['followers', 'Followers'],
  ]

  function Row({ u, action }: { u: PublicProfile; action?: React.ReactNode }) {
    return (
      <div className="fp-row">
        <button className="fp-row-main" onClick={() => go(u)} type="button">
          <ProfileAvatar name={u.display_name} avatarUrl={u.avatar_url} rankId={u.rank} size={42} />
          <span className="fp-row-text">
            <span className="fp-row-name">
              {u.display_name}
              <RankBadge rankId={u.rank} size={16} />
              {u.country && <Flag code={u.country} className="fp-row-flag" />}
            </span>
            {u.username && <span className="fp-row-handle">@{u.username}</span>}
          </span>
        </button>
        {action}
      </div>
    )
  }

  return (
    <Modal open title="Friends" onClose={onClose} width={520}>
      <div className="fp-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={`fp-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
            {id === 'requests' && incoming.length > 0 && <span className="fp-tab-badge">{incoming.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'find' && (
        <input
          className="sf-input fp-search"
          placeholder="Search by username or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      )}

      <div className="fp-list">
        {/* ---- Find ---- */}
        {tab === 'find' && (
          <>
            {q.trim().length < 2 && <p className="fp-empty">Type at least 2 characters to search.</p>}
            {searching && <p className="fp-empty">Searching…</p>}
            {q.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="fp-empty">No explorers found.</p>
            )}
            {results.map((u) => (
              <Row
                key={u.id}
                u={u}
                action={
                  <div className="fp-row-actions">
                    <AddFriendButton targetId={u.id} className="fp-row-friend" />
                    <FollowButton targetId={u.id} className="fp-row-follow" />
                  </div>
                }
              />
            ))}
          </>
        )}

        {/* ---- Friends ---- */}
        {tab === 'friends' && (
          <>
            {friends.length === 0 && (
              <p className="fp-empty">No friends yet. Find explorers and send a request.</p>
            )}
            {friends.map((u) => (
              <Row key={u.id} u={u} action={<AddFriendButton targetId={u.id} className="fp-row-friend" />} />
            ))}
          </>
        )}

        {/* ---- Requests ---- */}
        {tab === 'requests' && (
          <>
            {incoming.length === 0 && outgoing.length === 0 && (
              <p className="fp-empty">No pending requests.</p>
            )}
            {incoming.length > 0 && <p className="fp-section">Incoming</p>}
            {incoming.map((r) =>
              r.profile ? (
                <Row
                  key={r.id}
                  u={r.profile}
                  action={
                    <div className="fp-row-actions">
                      <button className="sf-btn fp-row-friend" onClick={() => void accept(r.id)}>
                        Accept
                      </button>
                      <button className="sf-btn secondary fp-row-friend" onClick={() => void decline(r.id)}>
                        Decline
                      </button>
                    </div>
                  }
                />
              ) : null,
            )}
            {outgoing.length > 0 && <p className="fp-section">Sent</p>}
            {outgoing.map((r) =>
              r.profile ? (
                <Row
                  key={r.id}
                  u={r.profile}
                  action={<span className="fp-pending">Pending</span>}
                />
              ) : null,
            )}
          </>
        )}

        {/* ---- Following / Followers ---- */}
        {tab === 'following' && (following === null
          ? <p className="fp-empty">Loading…</p>
          : following.length === 0
            ? <p className="fp-empty">You're not following anyone yet.</p>
            : following.map((u) => <Row key={u.id} u={u} action={<FollowButton targetId={u.id} className="fp-row-follow" />} />))}
        {tab === 'followers' && (followers === null
          ? <p className="fp-empty">Loading…</p>
          : followers.length === 0
            ? <p className="fp-empty">No followers yet.</p>
            : followers.map((u) => <Row key={u.id} u={u} action={<AddFriendButton targetId={u.id} className="fp-row-friend" />} />))}
      </div>
    </Modal>
  )
}
