import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocial } from '../store/social'
import { searchUsers, getProfilesByIds, getFollowerIds, getFollowingIds } from '../lib/social'
import type { PublicProfile } from '../lib/types'
import { Modal } from './Modal'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { ProfileAvatar } from './ProfileAvatar'
import { FollowButton } from './FollowButton'
import './FriendsPanel.css'

type Tab = 'find' | 'following' | 'followers'

// Friends hub: search the directory, follow explorers, and browse who you
// follow / who follows you. Reuses the public_profiles read path + social store.
export function FriendsPanel({ onClose }: { onClose: () => void }) {
  const meId = useSocial((s) => s.meId)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('find')

  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef<number | null>(null)

  const [following, setFollowing] = useState<PublicProfile[] | null>(null)
  const [followers, setFollowers] = useState<PublicProfile[] | null>(null)

  // live search (debounced). All state changes happen inside the timer callback
  // so nothing mutates state synchronously during the effect body.
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

  // lazy-load list tabs
  useEffect(() => {
    if (!meId) return
    if (tab === 'following' && following === null) {
      void getFollowingIds(meId).then(getProfilesByIds).then(setFollowing)
    }
    if (tab === 'followers' && followers === null) {
      void getFollowerIds(meId).then(getProfilesByIds).then(setFollowers)
    }
  }, [tab, meId, following, followers])

  function go(u: PublicProfile) {
    if (!u.username) return
    onClose()
    navigate(`/u/${u.username}`)
  }

  const TABS: [Tab, string][] = [
    ['find', 'Find'],
    ['following', 'Following'],
    ['followers', 'Followers'],
  ]

  const list = tab === 'find' ? results : tab === 'following' ? following : followers

  return (
    <Modal open title="Friends" onClose={onClose} width={500}>
      <div className="fp-tabs">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className={`fp-tab ${tab === id ? 'on' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
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
        {tab === 'find' && q.trim().length < 2 && (
          <p className="fp-empty">Type at least 2 characters to search.</p>
        )}
        {tab === 'find' && searching && <p className="fp-empty">Searching…</p>}
        {list === null && <p className="fp-empty">Loading…</p>}
        {list !== null && list.length === 0 && !(tab === 'find' && (searching || q.trim().length < 2)) && (
          <p className="fp-empty">
            {tab === 'find' ? 'No explorers found.' : tab === 'following' ? "You're not following anyone yet." : 'No followers yet.'}
          </p>
        )}
        {(list ?? []).map((u) => (
          <div key={u.id} className="fp-row">
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
            <FollowButton targetId={u.id} className="fp-row-follow" />
          </div>
        ))}
      </div>
    </Modal>
  )
}
