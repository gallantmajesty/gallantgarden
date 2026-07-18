import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

export function FriendsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
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

  useEffect(() => {
    void refreshRequests()
    void refreshFriends()
  }, [refreshRequests, refreshFriends])

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
    if (u.player_id == null) return
    onClose()
    navigate(`/u/${u.player_id}`)
  }

  const TABS: [Tab, string][] = [
    ['find', t('friendsPanel.tabFind')],
    ['friends', t('friendsPanel.tabFriends')],
    ['requests', t('friendsPanel.tabRequests')],
    ['following', t('friendsPanel.tabFollowing')],
    ['followers', t('friendsPanel.tabFollowers')],
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
            {u.player_id != null && <span className="fp-row-handle">Player ID #{u.player_id}</span>}
          </span>
        </button>
        {action}
      </div>
    )
  }

  return (
    <Modal open title={t('friendsPanel.title')} onClose={onClose} width={520}>
      <div className="fp-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={`fp-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
            {id === 'requests' && incoming.length > 0 && <span className="fp-tab-badge">{incoming.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'find' && (
        <input
          className="sf-input fp-search"
          placeholder={t('friendsPanel.searchPlaceholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      )}

      <div className="fp-list">
        {tab === 'find' && (
          <>
            {q.trim().length < 2 && <p className="fp-empty">{t('friendsPanel.typeToSearch')}</p>}
            {searching && <p className="fp-empty">{t('common.loading')}</p>}
            {q.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="fp-empty">{t('friendsPanel.noExplorers')}</p>
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

        {tab === 'friends' && (
          <>
            {friends.length === 0 && (
              <p className="fp-empty">{t('friendsPanel.noFriendsYet')}</p>
            )}
            {friends.map((u) => (
              <Row key={u.id} u={u} action={<AddFriendButton targetId={u.id} className="fp-row-friend" />} />
            ))}
          </>
        )}

        {tab === 'requests' && (
          <>
            {incoming.length === 0 && outgoing.length === 0 && (
              <p className="fp-empty">{t('friendsPanel.noPendingRequests')}</p>
            )}
            {incoming.length > 0 && <p className="fp-section">{t('friendsPanel.incoming')}</p>}
            {incoming.map((r) =>
              r.profile ? (
                <Row
                  key={r.id}
                  u={r.profile}
                  action={
                    <div className="fp-row-actions">
                      <button className="sf-btn fp-row-friend" onClick={() => void accept(r.id)}>
                        {t('common.accept')}
                      </button>
                      <button className="sf-btn secondary fp-row-friend" onClick={() => void decline(r.id)}>
                        {t('common.decline')}
                      </button>
                    </div>
                  }
                />
              ) : null,
            )}
            {outgoing.length > 0 && <p className="fp-section">{t('friendsPanel.sent')}</p>}
            {outgoing.map((r) =>
              r.profile ? (
                <Row
                  key={r.id}
                  u={r.profile}
                  action={<span className="fp-pending">{t('common.pending')}</span>}
                />
              ) : null,
            )}
          </>
        )}

        {tab === 'following' && (following === null
          ? <p className="fp-empty">{t('common.loading')}</p>
          : following.length === 0
            ? <p className="fp-empty">{t('friendsPanel.notFollowingAnyone')}</p>
            : following.map((u) => <Row key={u.id} u={u} action={<FollowButton targetId={u.id} className="fp-row-follow" />} />))}
        {tab === 'followers' && (followers === null
          ? <p className="fp-empty">{t('common.loading')}</p>
          : followers.length === 0
            ? <p className="fp-empty">{t('friendsPanel.noFollowersYet')}</p>
            : followers.map((u) => <Row key={u.id} u={u} action={<AddFriendButton targetId={u.id} className="fp-row-friend" />} />))}
      </div>
    </Modal>
  )
}