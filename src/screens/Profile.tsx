import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useSocial } from '../store/social'
import { usePomodoro } from '../store/pomodoro'
import { useMagnet } from '../store/magnet'
import { supabase } from '../lib/supabase'
import {
  getProfilesByIds,
  getFollowerIds,
  getFollowingIds,
  getMutualIds,
} from '../lib/social'
import { loadStudyCounts, levelProgress, formatLikes, type StudyCounts } from '../lib/stats'
import { effectiveBanners, getEffectiveBanner, effectiveLogos, logoFilter } from '../lib/banners'
import type { ProfilePublic, PublicProfile } from '../lib/types'
import { DISPLAY_NAME_CHANGES_MAX } from '../lib/types'
import { getRank, rankForLifetime, rankForTotalXp, rankProgress, RANKS } from '../lib/ranks'
import { computeStreak } from '../lib/magnet/insights'
import { generatePlayerId } from '../lib/playerId'
import { checkDisplayName } from '../lib/displayName'
import { studyGoalLabel } from '../lib/studyGoals'
import { characterById } from '../avatar/characters'
import { useAvatar } from '../avatar/store'
import { CharacterPortrait3D } from '../components/CharacterPortrait3D'
import { Flag } from '../components/Flag'
import { Icon } from '../components/magnet/Icon'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { FollowButton } from '../components/FollowButton'
import { AddFriendButton } from '../components/AddFriendButton'
import { UserListModal } from '../components/UserListModal'
import { StudyGoalsSelector } from '../components/StudyGoalsSelector'
import { AchievementsPanel } from '../components/profile/AchievementsPanel'
import { GREEN_LEAF_ICON, GOLD_LEAF_ICON } from '../lib/leafIcons'
import { useShop } from '../shop/store'
import './Profile.css'

// YouTube-style profile. One component serves both the editable own profile
// (/profile) and read-only public profiles (/u/:playerId).

interface ProfileView {
  id: string
  playerId: number | null
  displayName: string
  avatarUrl: string | null
  country: string | null
  rankId: string | null
  pub: ProfilePublic
  /** claimed tierKey map for public profiles (parsed from the remote blob) */
  earned?: Record<string, string>
}

export function Profile() {
  const { playerId: routePlayerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const ownPlayerId = useProfile((s) => s.playerId)
  const ownDisplayName = useProfile((s) => s.displayName)
  const ownAvatarUrl = useProfile((s) => s.avatarUrl)
  const ownPub = useProfile((s) => s.pub)
  const ownCountry = useProfile((s) => s.data.country)
  const ownRank = useProfile((s) => rankForLifetime(s.rankXp, s.xp, s.premiumXp).id)

  const isOwnRoute = !routePlayerId || Number(routePlayerId) === ownPlayerId

  const [remote, setRemote] = useState<PublicProfile | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (isOwnRoute || !routePlayerId) return
    let cancelled = false
    const pid = Number(routePlayerId)
    if (!Number.isFinite(pid)) {
      setNotFound(true)
      return
    }
    void getPublicProfileByPlayerId(pid).then((p) => {
      if (cancelled) return
      setRemote(p)
      setNotFound(!p)
    })
    return () => { cancelled = true }
  }, [isOwnRoute, routePlayerId])

  const isOwn = isOwnRoute
  const view: ProfileView | null = useMemo(() => {
    if (isOwn) {
      if (!user) return null
      return {
        id: user.id,
        playerId: ownPlayerId,
        displayName: ownDisplayName || user.profile?.name || 'Explorer',
        avatarUrl: ownAvatarUrl,
        country: ownCountry,
        rankId: ownRank,
        pub: ownPub,
      }
    }
    if (remote && remote.player_id != null && remote.player_id === Number(routePlayerId)) {
      return {
        id: remote.id,
        playerId: remote.player_id,
        displayName: remote.display_name,
        avatarUrl: remote.avatar_url,
        country: remote.country,
        rankId: remote.rank_xp ? rankForTotalXp(remote.rank_xp).id : remote.rank,
        pub: remote.public_profile,
        earned: parseRemoteEarned(remote),
      }
    }
    return null
  }, [isOwn, user, ownPlayerId, ownDisplayName, ownAvatarUrl, ownCountry, ownRank, ownPub, remote, routePlayerId])

  if (notFound) {
    return (
      <div className="pf-root">
        <TopBar onBack={() => navigate('/')} />
        <div className="pf-notfound">
          <h2>Explorer not found</h2>
          <p>There's no profile with that Player ID yet.</p>
          <button className="pf-customize-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => navigate('/')}>
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="pf-root">
        <TopBar onBack={() => navigate('/')} />
        <div className="pf-loading">Loading profile…</div>
      </div>
    )
  }

  return <ProfileBody view={view} isOwn={isOwn} onBack={() => navigate('/')} />
}

/* ------------------------------------------------------------------ top bar */

function TopBar({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) {
  const { signOut } = useAuth()
  const xp = useMagnet((s) => s.data.xp)
  const goldenXp = useMagnet((s) => s.data.premiumXp)

  return (
    <div className="pf-topbar">
      <div className="pf-topbar-left">
        <button className="pf-back" onClick={onBack}>
          ← Back
        </button>
      </div>
      <div className="pf-topbar-right">
        <span className="pf-resource">
          <img className="pf-resource-icon" src={GOLD_LEAF_ICON} alt="" draggable={false} />
          {goldenXp.toLocaleString()}
        </span>
        <span className="pf-resource">
          <img className="pf-resource-icon" src={GREEN_LEAF_ICON} alt="" draggable={false} />
          {xp >= 1000 ? `${(xp / 1000).toFixed(1)}K` : xp.toLocaleString()}
        </span>
        {right}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- main body */

function ProfileBody({
  view,
  isOwn,
  onBack,
}: {
  view: ProfileView
  isOwn: boolean
  onBack: () => void
}) {
  const myCounts = useSocial((s) => s.myCounts)
  const { signOut, user } = useAuth()
  const ownPlayerId = useProfile((s) => s.playerId)
  const onboardingGoals = useProfile((s) => s.data.studyGoals)
  const xp = useMagnet((s) => s.data.xp)
  const goldenXp = useMagnet((s) => s.data.premiumXp)
  const rankXp = useMagnet((s) => s.data.rankXp)
  const totalXp = xp + goldenXp
  const lifetimeXp = rankXp > 0 ? rankXp : totalXp
  const focusSessions = usePomodoro((s) => s.completed)
  const totalFocusMin = usePomodoro((s) => s.totalFocusMin)
  const achievements = useMagnet((s) => s.data.achievements.length)
  const magnetData = useMagnet((s) => s.data)
  const streak = useMemo(() => computeStreak(magnetData, new Date()), [magnetData])
  const charConfig = useAvatar((s) => s.config)
  const character = characterById(charConfig?.characterId ?? 'james')
  const avatarConfig = { ...character.fallback, characterId: character.id }

  // Study goals: prefer onboarding goals (exam IDs), fall back to pub.studyInterests
  const studyGoals = isOwn && onboardingGoals.length > 0
    ? onboardingGoals
    : view.pub.studyInterests

  const [editing, setEditing] = useState(false)
  const [rankModal, setRankModal] = useState(false)
  const [remoteCounts, setRemoteCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 })
  const [studyCounts, setStudyCounts] = useState<StudyCounts>({ blueprints: 0 })
  const [listModal, setListModal] = useState<null | 'followers' | 'following' | 'mutual'>(null)
  const [deleteModal, setDeleteModal] = useState(false)

  const counts = isOwn ? myCounts : remoteCounts

  // Generate Player ID if missing
  useEffect(() => {
    if (isOwn && ownPlayerId == null && user) {
      const pid = generatePlayerId()
      useProfile.getState().setPlayerId(pid)
    }
  }, [isOwn, ownPlayerId, user])

  useEffect(() => {
    let cancelled = false
    if (!isOwn) {
      void Promise.all([getFollowerIds(view.id), getFollowingIds(view.id)]).then(([fr, fg]) => {
        if (!cancelled) setRemoteCounts({ followers: fr.length, following: fg.length })
      })
    } else {
      void useSocial.getState().refreshCounts()
      void loadStudyCounts(view.id).then((c) => {
        if (!cancelled) setStudyCounts(c)
      })
    }
    return () => { cancelled = true }
  }, [view.id, isOwn])

  const rank = rankForLifetime(rankXp, xp, goldenXp)
  const levelData = levelProgress(lifetimeXp)
  const banner = getEffectiveBanner(view.pub.banner)

  const formatHours = (min: number) => {
    if (min < 60) return `${min}M`
    const h = min / 60
    return h >= 10 ? `${Math.round(h)}H` : `${h.toFixed(1)}H`
  }

  return (
    <div className="pf-root">
      <TopBar
        onBack={onBack}
        right={
          isOwn ? (
            <button className="pf-signout" onClick={signOut}>
              Sign Out
            </button>
          ) : undefined
        }
      />

      <div className="pf-channel">
        {/* ========== FF-STYLE BANNER ========== */}
        <div className="ff-banner-wrap">
          <div className="ff-banner">
            {/* Banner background */}
            {view.pub.bannerImage ? (
              <img src={view.pub.bannerImage} alt="" className="ff-banner-bg" style={{ ['--pf-banner-pos' as string]: `${view.pub.bannerPos}%` }} />
            ) : banner.image ? (
              <img src={banner.image} alt="" className="ff-banner-bg" />
            ) : (
              <div className="ff-banner-bg" style={{ background: banner.css }} />
            )}

            {/* Dark overlay for readability */}
            <div className="ff-banner-overlay" />

            {/* Edit icon for own profile */}
            {isOwn && (
              <button className="ff-banner-edit" onClick={() => setEditing(true)} title="Customize profile">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Identity row — avatar + name + rank, all OUTSIDE the overflow:hidden banner */}
          <div className="ff-identity">
            <div className="ff-banner-avatar">
              {(() => {
                const selectedLogo = view.pub.logo ? effectiveLogos().find(l => l.id === view.pub.logo) : null
                const logoUrl = selectedLogo?.image || null
                return (
              <ProfileAvatar
                name={view.displayName}
                avatarUrl={logoUrl || view.avatarUrl}
                rankId={view.rankId}
                size={110}
                className={selectedLogo ? 'logo-dim' : ''}
              />
                )
              })()}
            </div>

            <div className="ff-identity-info">
              <div className="ff-banner-name-row">
                <span className="ff-banner-name">{view.displayName}</span>
                {view.country && <Flag code={view.country} className="ff-banner-flag" />}
              </div>
              <div className="ff-banner-player-id">ID: {view.playerId ?? '—'}</div>
              {view.pub.bio && <div className="ff-banner-bio">{view.pub.bio}</div>}
            </div>

            <div className="ff-banner-rank" onClick={() => setRankModal(true)}>
              <img src={rank.badge} alt="" className="ff-rank-badge-img" />
              <span className="ff-rank-badge-name">{rank.name}</span>
            </div>
          </div>
        </div>

        {/* ========== FOLLOWER STATS + ACTIONS ========== */}
        <div className="ff-meta-row">
          <div className="ff-meta-stats">
            <span><strong>{counts.followers}</strong> Followers</span>
            <span><strong>{counts.following}</strong> Following</span>
          </div>
          {!isOwn && (
            <div className="ff-meta-actions">
              <AddFriendButton targetId={view.id} />
              <FollowButton targetId={view.id} />
              <ShareButton playerId={view.playerId} />
            </div>
          )}
        </div>

        <div className="pf-divider" />

        {/* ========== STATS ROW ========== */}
        <div className="pf-stats-row">
          <div className="pf-stat-card">
            <div className="pf-stat-card-label">Study Hours</div>
            <div className="pf-stat-card-value">{formatHours(totalFocusMin)}</div>
          </div>
          <div className="pf-stat-card">
            <div className="pf-stat-card-label">Sessions</div>
            <div className="pf-stat-card-value">{focusSessions}</div>
          </div>
          <div className="pf-stat-card">
            <div className="pf-stat-card-label">Blueprints</div>
            <div className="pf-stat-card-value">{studyCounts.blueprints}</div>
          </div>
          <div className="pf-stat-card">
            <div className="pf-stat-card-label">Rank</div>
            <div className="pf-stat-card-value rank-val">{rank.name}</div>
          </div>
        </div>

        {/* ========== XP BAR ========== */}
        <div className="pf-xp-bar-wrap">
          <div className="pf-xp-bar-header">
            <span className="pf-xp-bar-label">
              Level {levelData.level} · XP {levelData.intoLevel}/{levelData.needed}
            </span>
            <span className="pf-xp-bar-pct">{Math.round(levelData.pct * 100)}%</span>
          </div>
          <div className="pf-xp-bar-track">
            <div className="pf-xp-bar-fill" style={{ width: `${levelData.pct * 100}%` }} />
          </div>
        </div>

        {/* ========== ABOUT ME ========== */}
        {(view.pub.favoriteSubject || view.pub.studySchedule || view.pub.studyInterests.length > 0) && (
          <div className="pf-about-section">
            <div className="pf-section-title">About</div>
            <div className="pf-about-grid">
              {view.pub.favoriteSubject && (
                <div className="pf-about-card">
                  <div className="pf-about-card-label">Studying</div>
                  <div className="pf-about-card-value">{view.pub.favoriteSubject}</div>
                </div>
              )}
              {view.pub.studySchedule && (
                <div className="pf-about-card">
                  <div className="pf-about-card-label">Schedule</div>
                  <div className="pf-about-card-value">{view.pub.studySchedule}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== INTERESTS ========== */}
        {view.pub.studyInterests.length > 0 && (
          <div className="pf-interests-section">
            <div className="pf-section-title">Study Focus</div>
            <div className="pf-interests-row">
              {view.pub.studyInterests.map((interest) => (
                <span key={interest} className="pf-interest-chip">{interest}</span>
              ))}
            </div>
          </div>
        )}

        {/* ========== SOCIAL ========== */}
        <div className="pf-social-section">
          <div className="pf-section-title">Social</div>
          <div className="pf-social-row">
            <button className="pf-social-btn" onClick={() => setListModal('followers')}>
              <span className="pf-social-btn-value">{counts.followers}</span>
              <span className="pf-social-btn-label">Followers</span>
            </button>
            <button className="pf-social-btn" onClick={() => setListModal('following')}>
              <span className="pf-social-btn-value">{counts.following}</span>
              <span className="pf-social-btn-label">Following</span>
            </button>
          </div>
        </div>

        {/* ========== STUDY GOALS ========== */}
        <div className="pf-goals-section">
          <div className="pf-section-title">Study Goals</div>
          {studyGoals.length > 0 ? (
            <div className="pf-goals-list">
              {studyGoals.map((goal) => (
                <div key={goal} className="pf-goal-badge">
                  <span className="pf-goal-lock">🎯</span>
                  {studyGoalLabel(goal)}
                </div>
              ))}
            </div>
          ) : (
            <div className="pf-goals-empty">
              {isOwn ? 'Set your study goals in Customize.' : 'No study goals set.'}
            </div>
          )}
        </div>

        {/* ========== CHARACTER ========== */}
        <div className="pf-character-section">
          <div className="pf-section-title">Character</div>
          <div className="pf-character-wrap">
            <CharacterPortrait3D config={avatarConfig} size={280} />
          </div>
        </div>

        {/* ========== ACHIEVEMENTS ========== */}
        <div className="pf-achievements-section">
          <AchievementsPanel isOwn={isOwn} earned={view.earned} />
        </div>

        {/* ========== DANGER ZONE (own profile only) ========== */}
        {isOwn && (
          <div className="pf-danger-section">
            <div className="pf-section-title">Account</div>
            <div className="pf-danger-row">
              <div>
                <div className="pf-danger-title">Delete my account</div>
                <div className="pf-danger-sub">
                  Permanently removes your profile, avatar, chat history, friends and
                  progress. Payment records are kept anonymous as required by law.
                </div>
              </div>
              <button className="pf-delete-btn" onClick={() => setDeleteModal(true)}>
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}
      <UserListModal
        open={listModal === 'followers'}
        title="Followers"
        onClose={() => setListModal(null)}
        load={async () => getProfilesByIds(await getFollowerIds(view.id))}
      />
      <UserListModal
        open={listModal === 'following'}
        title="Following"
        onClose={() => setListModal(null)}
        load={async () => getProfilesByIds(await getFollowingIds(view.id))}
      />
      <UserListModal
        open={listModal === 'mutual'}
        title="Mutual Followers"
        onClose={() => setListModal(null)}
        load={async () => {
          const me = useSocial.getState().meId
          if (!me) return []
          return getProfilesByIds(await getMutualIds(me, view.id))
        }}
      />

      {isOwn && editing && (
        <EditOverlay view={view} onClose={() => setEditing(false)} />
      )}

      {rankModal && (
        <RankRoadmap totalXp={lifetimeXp} onClose={() => setRankModal(false)} />
      )}

      {isOwn && deleteModal && (
        <DeleteAccountModal
          onClose={() => setDeleteModal(false)}
          onDeleted={() => {
            setDeleteModal(false)
            onBack()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------ delete account modal */

function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const { signOut, user } = useAuth()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doDelete() {
    if (typed !== 'DELETE') return
    setBusy(true)
    setError(null)
    try {
      if (user) {
        const { error: rpcError } = await supabase.rpc('delete_my_account')
        if (rpcError) {
          setError('Deletion failed — please try again or email support.')
          setBusy(false)
          return
        }
      }
      // Guests have nothing server-side — signOut clears the local guest data.
      await signOut()
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pf-edit-overlay" onClick={onClose}>
      <div className="pf-edit-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="pf-edit-header">
          <div className="pf-edit-title" style={{ color: '#ff6b5e' }}>Delete my account</div>
          <button className="pf-edit-close" onClick={onClose}>✕</button>
        </div>

        <div className="pf-edit-body">
          <p style={{ fontSize: 14, color: '#e8d9b0', lineHeight: 1.6, margin: '0 0 8px' }}>
            This will <strong style={{ color: '#ff6b5e' }}>permanently</strong> delete:
          </p>
          <ul style={{ fontSize: 13, color: '#b8a88a', lineHeight: 1.8, margin: '0 0 14px', paddingLeft: 18 }}>
            <li>Your profile, name, avatar and banner</li>
            <li>All leaves, golden leaves, ranks and achievements</li>
            <li>Chat messages, friends, follows and group memberships</li>
            <li>Realms, blueprints and study progress</li>
          </ul>
          <p style={{ fontSize: 12, color: 'rgba(240,223,192,0.5)', lineHeight: 1.5, margin: '0 0 14px' }}>
            Payment records are kept (anonymized) as required by law. This cannot be undone.
          </p>

          <div className="pf-edit-label">Type <strong style={{ color: '#ff6b5e' }}>DELETE</strong> to confirm</div>
          <input
            className="sf-input"
            value={typed}
            placeholder="DELETE"
            onChange={(e) => setTyped(e.target.value)}
            style={{ width: '100%', fontSize: 15, padding: '10px 12px', marginBottom: 14 }}
          />

          {error && <p style={{ fontSize: 13, color: '#ff6b5e', margin: '0 0 10px' }}>{error}</p>}

          <div className="pf-edit-save-bar">
            <button className="pf-edit-cancel-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              className="pf-delete-confirm-btn"
              onClick={doDelete}
              disabled={typed !== 'DELETE' || busy}
            >
              {busy ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- rank roadmap */

function RankRoadmap({ totalXp, onClose }: { totalXp: number; onClose: () => void }) {
  const { rank, nextRank, pct } = rankProgress(totalXp)
  const currentIdx = RANKS.findIndex((r) => r.id === rank.id)
  return (
    <div className="pf-edit-overlay" onClick={onClose}>
      <div className="pf-roadmap" onClick={(e) => e.stopPropagation()}>
        <div className="pf-edit-header">
          <div className="pf-edit-title">Rank Roadmap</div>
          <button className="pf-edit-close" onClick={onClose}>✕</button>
        </div>

        <p className="pf-roadmap-intro">
          Your rank is earned from <strong>total XP</strong> = Green Leaves (study time) + Golden Leaves (engagement &amp; streaks).
        </p>

        {nextRank ? (
          <div className="pf-roadmap-progress">
            <div className="pf-xp-bar-header">
              <span className="pf-xp-bar-label">
                {rank.name} → {nextRank.name}
              </span>
              <span className="pf-xp-bar-pct">{Math.round(pct * 100)}%</span>
            </div>
            <div className="pf-xp-bar-track">
              <div className="pf-xp-bar-fill" style={{ width: `${pct * 100}%` }} />
            </div>
            <div className="pf-roadmap-next">
              {nextRank.threshold - Math.round(totalXp)} XP to next rank
            </div>
          </div>
        ) : (
          <div className="pf-roadmap-max">You've reached the highest rank!</div>
        )}

        <div className="pf-roadmap-list">
          {RANKS.map((r, i) => {
            const reached = i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <div
                key={r.id}
                className={`pf-roadmap-node ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}`}
                style={{ ['--rank' as string]: r.accent }}
              >
                <img src={r.badge} alt="" className="pf-roadmap-badge" />
                <div className="pf-roadmap-node-main">
                  <div className="pf-roadmap-node-name">{r.name}</div>
                  <div className="pf-roadmap-node-th">
                    {r.threshold === 0 ? 'Start' : `${r.threshold.toLocaleString()} XP`}
                  </div>
                </div>
                {isCurrent && <span className="pf-roadmap-you">YOU</span>}
                {reached && !isCurrent && <span className="pf-roadmap-check">✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- share button */

function ShareButton({ playerId }: { playerId: number | null }) {
  const [copied, setCopied] = useState(false)
  if (playerId == null) return null
  async function copy() {
    const url = `${window.location.origin}/u/${playerId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard blocked */ }
  }
  return (
    <button className="pf-share-btn" onClick={copy}>
      <Icon name="people" size={16} /> {copied ? 'Copied!' : 'Share'}
    </button>
  )
}

/* ----------------------------------------------------------- edit overlay */

function EditOverlay({
  view,
  onClose,
}: {
  view: ProfileView
  onClose: () => void
}) {
  const setDisplayName = useProfile((s) => s.setDisplayName)
  const savePublic = useProfile((s) => s.savePublic)
  const setStudyGoals = useProfile((s) => s.setStudyGoals)
  const canChange = useProfile((s) => s.canChangeDisplayName())
  const nameWarning = useProfile((s) => s.nameWarning)
  const changesUsed = useProfile((s) => s.displayNameChanges)
  const goals = useProfile((s) => s.data.studyGoals)

  const [tab, setTab] = useState<'identity' | 'bio' | 'goals'>('identity')
  const [name, setName] = useState(view.displayName)
  const [bio, setBio] = useState(view.pub.bio)
  const [nameStatus, setNameStatus] = useState<{ ok: boolean; error?: string }>({ ok: true })
  const [draftGoals, setDraftGoals] = useState<string[]>(goals)

  const [saved, setSaved] = useState(false)

  const remaining = Math.max(0, DISPLAY_NAME_CHANGES_MAX - changesUsed)

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === view.displayName) return
    const check = checkDisplayName(trimmed)
    if (!check.ok) { setNameStatus({ ok: false, error: check.error }); return }
    if (!canChange && !nameWarning) { setNameStatus({ ok: false, error: 'Changes used up — buy a Name Card' }); return }
    setNameStatus({ ok: true })
    const ok = await setDisplayName(trimmed)
    if (!ok) setNameStatus({ ok: false, error: 'Could not save' })
  }

  async function saveAll() {
    // Save display name if changed
    if (name.trim() && name.trim() !== view.displayName) {
      await saveName()
    }
    // Save bio if changed
    if (bio !== view.pub.bio) {
      await savePublic({ bio })
    }
    // Save goals
    await setStudyGoals(draftGoals)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const tabStyle = (t: string) => ({
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer' as const,
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700 as const,
    fontSize: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    background: tab === t ? 'linear-gradient(180deg, #d4a843, #8b6914)' : 'rgba(212, 168, 67, 0.08)',
    color: tab === t ? '#1a1008' : '#b8a88a',
    transition: 'background 0.15s',
  })

  return (
    <div className="pf-edit-overlay" onClick={onClose}>
      <div className="pf-edit-panel" onClick={(e) => e.stopPropagation()}>
        <div className="pf-edit-header">
          <div className="pf-edit-title">Customize Profile</div>
          <button className="pf-edit-close" onClick={onClose}>✕</button>
        </div>

        {/* tab bar */}
        <div className="pf-edit-body">
          <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
            {(['identity', 'bio', 'goals'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
                {t === 'identity' ? 'Name & Banner' : t === 'bio' ? 'Bio' : 'Goals'}
              </button>
            ))}
          </div>

          {/* identity tab */}
          {tab === 'identity' && (
            <div className="pf-edit-section">
              <div className="pf-edit-label">Display Name</div>
              <input
                className="sf-input"
                value={name}
                maxLength={20}
                placeholder="e.g. john_smith"
                onChange={(e) => { const v = e.target.value; if (/^[a-zA-Z0-9_]*$/.test(v)) { setName(v); if (!nameStatus.ok) setNameStatus({ ok: true }) } }}
                style={{ width: '100%', fontSize: 18, fontWeight: 700, padding: '12px 14px' }}
              />
              <div style={{ marginTop: 6, fontSize: 13, color: nameStatus.ok ? '#d4a843' : '#e25b4b' }}>
                {nameStatus.ok
                  ? nameWarning
                    ? 'Free rename — update to letters, numbers and _ only'
                    : `${remaining} free change${remaining === 1 ? '' : 's'} left`
                  : nameStatus.error}
              </div>

              <div className="pf-edit-label" style={{ marginTop: 20 }}>Banner</div>
              <div className="pf-banner-grid">
                {effectiveBanners().filter((b) => useShop.getState().isOwned(b.id)).map((b) => (
                  <button
                    key={b.id}
                    className={`pf-banner-swatch ${view.pub.banner === b.id ? 'active' : ''}`}
                    style={b.image ? { backgroundImage: `url(${b.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: b.css }}
                    onClick={() => savePublic({ banner: b.id, bannerImage: null })}
                    title={b.name}
                  />
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(240,223,192,0.4)' }}>
                Don't see a banner? <a href="/avatar" style={{ color: '#d4a843', textDecoration: 'underline' }}>Visit the Avatar Shop</a> to unlock more.
              </div>

              <div className="pf-edit-label" style={{ marginTop: 20 }}>Logo</div>
              <div className="pf-logo-grid">
                {effectiveLogos().filter((l) => useShop.getState().isOwned(l.id)).map((l) => (
                  <button
                    key={l.id}
                    className={`pf-logo-swatch ${view.pub.logo === l.id ? 'active' : ''}`}
                    onClick={() => savePublic({ logo: l.id })}
                    title={l.name}
                  >
                    {l.image ? (
                      <img src={l.image} alt="" style={{ filter: logoFilter(l) }} />
                    ) : (
                      <span style={{ display: 'block', width: '100%', height: '100%', background: l.css || 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    )}
                  </button>
                ))}
                <button
                  className={`pf-logo-swatch ${view.pub.logo === '' ? 'active' : ''}`}
                  onClick={() => savePublic({ logo: '' })}
                  title="Use rank avatar"
                >
                  <span className="pf-logo-swatch-none">?</span>
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(240,223,192,0.4)' }}>
                Pick a logo or use your rank avatar. <a href="/avatar" style={{ color: '#d4a843', textDecoration: 'underline' }}>Get more in the Avatar Shop</a>.
              </div>
            </div>
          )}

          {/* bio tab */}
          {tab === 'bio' && (
            <div className="pf-edit-section">
              <div className="pf-edit-label">About / Bio</div>
              <textarea
                className="sf-input"
                value={bio}
                maxLength={280}
                placeholder="Tell other explorers about your study journey…"
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                style={{ width: '100%', resize: 'vertical', fontSize: 15, padding: '12px 14px' }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: '#b8a88a', textAlign: 'right' }}>
                {bio.length}/280
              </div>
            </div>
          )}

          {/* goals tab */}
          {tab === 'goals' && (
            <div className="pf-edit-section">
              <div className="pf-edit-label">Study Goals</div>
              <StudyGoalsSelector value={draftGoals} onChange={setDraftGoals} />
            </div>
          )}
        </div>

        {/* SAVE BAR — sticky bottom */}
        <div className="pf-edit-save-bar">
          {saved ? (
            <span className="pf-edit-saved-indicator">✓ Saved!</span>
          ) : (
            <button className="pf-edit-cancel-btn" onClick={onClose}>Cancel</button>
          )}
          <button className="pf-edit-save-btn" onClick={saveAll}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- banner picker */

function BannerPicker({ view }: { view: ProfileView }) {
  const savePublic = useProfile((s) => s.savePublic)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const hasImage = !!view.pub.bannerImage

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setBusy(true)
    try {
      const path = `avatars/${crypto.randomUUID()}`
      const { error } = await supabase.storage.from('avatars').upload(path, file)
      if (!error) {
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        savePublic({ bannerImage: pub.publicUrl, bannerPos: 50 })
      }
    } finally { setBusy(false) }
  }

  return (
    <div>
      {/* Current banner preview */}
      <div style={{
        width: '100%', height: 80, borderRadius: 10, overflow: 'hidden',
        border: '2px solid var(--pf-border)', marginBottom: 12,
        background: hasImage ? undefined : getEffectiveBanner(view.pub.banner).css,
      }}>
        {hasImage && (
          <img
            src={view.pub.bannerImage!}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${view.pub.bannerPos}%` }}
          />
        )}
      </div>

      {/* Banner grid */}
      <div className="pf-banner-picker-grid">
        {effectiveBanners().map((b) => (
          <button
            key={b.id}
            className={`pf-banner-preview ${!hasImage && view.pub.banner === b.id ? 'active' : ''}`}
            style={b.image ? { backgroundImage: `url(${b.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: b.css }}
            title={b.name}
            onClick={() => savePublic({ banner: b.id, bannerImage: null })}
          >
            {!hasImage && view.pub.banner === b.id && (
              <span className="pf-banner-preview-check">✓</span>
            )}
          </button>
        ))}
        <button
          className="pf-banner-upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? '…' : '⬆ Upload'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />

      {/* Position slider for uploaded images */}
      {hasImage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#b8a88a', marginTop: 12 }}>
          <span>Position</span>
          <input
            type="range" min={0} max={100} step={1}
            value={view.pub.bannerPos}
            onChange={(e) => savePublic({ bannerPos: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#d4a843' }}
          />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------- helper: fetch by player ID */

/** Parse the earned tierKey map out of a remote profile's public achievements
 *  blob (the `achievements.claimed` jsonb), so other players can view trophies. */
function parseRemoteEarned(remote: PublicProfile): Record<string, string> | undefined {
  const blob = (remote as PublicProfile & { achievements?: Record<string, unknown> }).achievements
  const claimed = blob?.claimed
  if (!claimed || typeof claimed !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(claimed)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

async function getPublicProfileByPlayerId(playerId: number): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as PublicProfile
}
