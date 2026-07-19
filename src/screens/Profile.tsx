import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useProfile } from '../store/profile'
import { useSocial } from '../store/social'
import { usePomodoro } from '../store/pomodoro'
import { useMagnet } from '../store/magnet'
import { insforge } from '../lib/insforge'
import {
  getProfilesByIds,
  getFollowerIds,
  getFollowingIds,
  getMutualIds,
} from '../lib/social'
import { loadStudyCounts, levelProgress, formatLikes, type StudyCounts } from '../lib/stats'
import { BANNERS } from '../lib/banners'
import { checkDisplayName } from '../lib/displayName'
import type { ProfilePublic, PublicProfile } from '../lib/types'
import { DISPLAY_NAME_CHANGES_MAX } from '../lib/types'
import { getRank, rankProgress, RANKS } from '../lib/ranks'
import { characterById } from '../avatar/characters'
import { useAvatar } from '../avatar/store'
import { computeStreak } from '../lib/magnet/insights'
import { generatePlayerId } from '../lib/playerId'
import { CharacterPortrait3D } from '../components/CharacterPortrait3D'
import { Flag } from '../components/Flag'
import { Icon } from '../components/magnet/Icon'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { AvatarCropper } from '../components/AvatarCropper'
import { FollowButton } from '../components/FollowButton'
import { AddFriendButton } from '../components/AddFriendButton'
import { UserListModal } from '../components/UserListModal'
import { StudyGoalsSelector } from '../components/StudyGoalsSelector'
import './Profile.css'

// Free Fire–style profile. One component serves both the editable own profile
// (/profile) and read-only public profiles (/u/:playerId).

interface ProfileView {
  id: string
  playerId: number | null
  displayName: string
  avatarUrl: string | null
  country: string | null
  rankId: string | null
  pub: ProfilePublic
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
  const ownRank = useProfile((s) => s.data.rank)

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
        rankId: remote.rank,
        pub: remote.public_profile,
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
          ← PROFILE
        </button>
      </div>
      <div className="pf-topbar-right">
        <span className="pf-resource">
          <img className="pf-resource-icon" src="/icons/golden-leaf.png" alt="" draggable={false} />
          {goldenXp.toLocaleString()}
        </span>
        <span className="pf-resource">
          <img className="pf-resource-icon" src="/icons/leaf.png" alt="" draggable={false} />
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
  const setAvatarUrl = useProfile((s) => s.setAvatarUrl)
  const ownPlayerId = useProfile((s) => s.playerId)
  const xp = useMagnet((s) => s.data.xp)
  const goldenXp = useMagnet((s) => s.data.premiumXp)
  const totalXp = xp + goldenXp
  const focusSessions = usePomodoro((s) => s.completed)
  const totalFocusMin = usePomodoro((s) => s.totalFocusMin)
  const achievements = useMagnet((s) => s.data.achievements.length)
  const magnetData = useMagnet((s) => s.data)
  const streak = useMemo(() => computeStreak(magnetData, new Date()), [magnetData])

  const [editing, setEditing] = useState(false)
  const [rankModal, setRankModal] = useState(false)
  const [remoteCounts, setRemoteCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 })
  const [studyCounts, setStudyCounts] = useState<StudyCounts>({ blueprints: 0 })
  const [listModal, setListModal] = useState<null | 'followers' | 'following' | 'mutual'>(null)
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const counts = isOwn ? myCounts : remoteCounts

  // Generate Player ID if missing (for existing users who signed up before this feature)
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

  const rank = getRank(view.rankId)
  const levelData = levelProgress(totalXp)
  const charConfig = useAvatar((s) => s.config)
  const character = characterById(charConfig?.characterId ?? 'james')
  const avatarConfig = { ...character.fallback, characterId: character.id }

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

      <div className="pf-layout">
        {/* ========== LEFT — Character Card ========== */}
        <div className="pf-panel pf-char-card pf-panel-inner">
          <div className="pf-char-level">
            <span className="pf-char-level-label">Level</span>
            <span className="pf-char-level-num">{levelData.level}</span>
          </div>


          <div className="pf-char-img-wrap">
            <CharacterPortrait3D config={avatarConfig} size={300} />
          </div>

          {!isOwn && (
            <div className="pf-public-actions">
              <AddFriendButton targetId={view.id} />
              <FollowButton targetId={view.id} />
            </div>
          )}

          {/* About Me — study info */}
          <div className="pf-about-section">
            <div className="pf-about-title">About Me</div>
            {view.pub.favoriteSubject && (
              <div className="pf-about-row">
                <span className="pf-about-label">Studying</span>
                <span className="pf-about-value">{view.pub.favoriteSubject}</span>
              </div>
            )}
            {view.pub.studySchedule && (
              <div className="pf-about-row">
                <span className="pf-about-label">Schedule</span>
                <span className="pf-about-value">{view.pub.studySchedule}</span>
              </div>
            )}
            {view.pub.studyInterests.length > 0 && (
              <div className="pf-about-row">
                <span className="pf-about-label">Interests</span>
                <span className="pf-about-value">{view.pub.studyInterests.slice(0, 3).join(', ')}</span>
              </div>
            )}
            {!view.pub.favoriteSubject && !view.pub.studySchedule && view.pub.studyInterests.length === 0 && (
              <div className="pf-about-empty">
                {isOwn ? 'Add study info in Customize.' : 'No study info yet.'}
              </div>
            )}
          </div>

          {/* Study Interests — dynamic from onboarding/customize */}
          {view.pub.studyInterests.length > 0 && (
            <div className="pf-qa-section">
              <div className="pf-qa-title">Study Focus</div>
              <div className="pf-interests-row">
                {view.pub.studyInterests.map((interest) => (
                  <span key={interest} className="pf-interest-chip">{interest}</span>
                ))}
              </div>
            </div>
          )}
          {view.pub.bio && (
            <div className="pf-qa-section">
              <div className="pf-qa-title">Bio</div>
              <div className="pf-bio-text">{view.pub.bio}</div>
            </div>
          )}
          {!view.pub.studyInterests.length && !view.pub.bio && (
            <div className="pf-qa-section">
              <div className="pf-about-empty">
                {isOwn ? 'Add study interests in Customize.' : 'No study info yet.'}
              </div>
            </div>
          )}
        </div>

        {/* ========== CENTER — Identity Card ========== */}
        <div className="pf-panel pf-identity-card pf-panel-inner">
          {/* rank emblem — click to upload avatar or open rank roadmap */}
          <button
            className="pf-rank-emblem pf-rank-emblem-btn"
            onClick={() => {
              if (isOwn) {
                avatarInputRef.current?.click()
              } else {
                setRankModal(true)
              }
            }}
            title={isOwn ? 'Click to change profile picture' : rank.name}
          >
            {view.avatarUrl ? (
              <img src={view.avatarUrl} alt="" />
            ) : (
              <div
                className="pf-rank-emblem-monogram"
                style={{ background: `linear-gradient(135deg, ${rank.accent}, ${rank.accent}88)` }}
              >
                {(view.displayName.trim()[0] || 'E').toUpperCase()}
              </div>
            )}
            {isOwn && <span className="pf-avatar-edit-badge">📷</span>}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPendingAvatar(file)
              if (avatarInputRef.current) avatarInputRef.current.value = ''
            }}
          />
          <button className="pf-rank-name-tag pf-rank-name-btn" onClick={() => setRankModal(true)}>
            <img src={rank.badge} alt="" />
            {rank.name}
          </button>

          {/* name + flag */}
          <div className="pf-id-name">
            {view.displayName}
            {view.country && <Flag code={view.country} className="pf-flag" />}
          </div>
          <div className="pf-id-playerid">
            Player ID: <strong>{view.playerId ?? '—'}</strong>
          </div>

          {/* rank boxes */}
          <div className="pf-rank-boxes">
            <div className="pf-rank-box">
              <div className="pf-rank-box-label">Focus Rank</div>
              <div className="pf-rank-box-value">{rank.name}</div>
            </div>
            <div className="pf-rank-box">
              <div className="pf-rank-box-label">Study Streak</div>
              <div className="pf-rank-box-value">{streak}d</div>
            </div>
          </div>

          {/* level / likes / uid row */}
          <div className="pf-id-stats-row">
            <div className="pf-id-stat">
              <div className="pf-id-stat-label">Level</div>
              <div className="pf-id-stat-value">{levelData.level}</div>
            </div>
            <div className="pf-id-stat">
              <div className="pf-id-stat-label">Likes</div>
              <div className="pf-id-stat-value">{formatLikes(view.pub.likes ?? 0)}</div>
            </div>
            <div className="pf-id-stat">
              <div className="pf-id-stat-label">UID</div>
              <div className="pf-id-stat-value">{view.playerId ?? '—'}</div>
            </div>
          </div>

          {/* XP bar */}
          <div className="pf-xp-bar-wrap">
            <div className="pf-xp-bar-header">
              <span className="pf-xp-bar-label">
                XP {levelData.intoLevel}/{levelData.needed}
              </span>
              <span className="pf-xp-bar-pct">{Math.round(levelData.pct * 100)}%</span>
            </div>
            <div className="pf-xp-bar-track">
              <div className="pf-xp-bar-fill" style={{ width: `${levelData.pct * 100}%` }} />
            </div>
          </div>

          {/* bio */}
          <div className="pf-id-bio">{view.pub.bio}</div>

          {/* customize / share */}
          {isOwn ? (
            <button className="pf-customize-btn" onClick={() => setEditing(true)}>
              CUSTOMIZE
            </button>
          ) : (
            <ShareButton playerId={view.playerId} />
          )}
        </div>

        {/* ========== RIGHT — Stats + Goals ========== */}
        <div className="pf-right-col">
          {/* Study Stats */}
          <div className="pf-panel pf-panel-inner">
            <div className="pf-section-title">Study Stats</div>
            <div className="pf-stat-grid">
              <div className="pf-stat-card">
                <div className="pf-stat-card-label">Total Study Hours</div>
                <div className="pf-stat-card-value">{formatHours(totalFocusMin)}</div>
              </div>
              <div className="pf-stat-card">
                <div className="pf-stat-card-label">Focus Sessions</div>
                <div className="pf-stat-card-value">{focusSessions}</div>
              </div>
              <div className="pf-stat-card">
                <div className="pf-stat-card-label">Blueprints</div>
                <div className="pf-stat-card-value">{studyCounts.blueprints}</div>
              </div>
              <div className="pf-stat-card">
                <div className="pf-stat-card-label">Current Rank</div>
                <div className="pf-stat-card-value rank-val">{rank.name}</div>
              </div>
            </div>
          </div>

          {/* Study Goals */}
          <div className="pf-panel pf-panel-inner">
            <div className="pf-section-title">Study Goals</div>
            {view.pub.studyInterests.length > 0 ? (
              <div className="pf-goals-list">
                {view.pub.studyInterests.map((goal) => (
                  <div key={goal} className="pf-goal-badge">
                    <span className="pf-goal-lock">🔒</span>
                    {goal}
                  </div>
                ))}
              </div>
            ) : (
              <div className="pf-goals-empty">
                {isOwn ? 'Set your study goals in Customize.' : 'No study goals set.'}
              </div>
            )}
          </div>

          {/* Followers/Following — visible on every profile */}
          <div className="pf-panel pf-panel-inner">
            <div className="pf-section-title">Social</div>
            <div className="pf-stat-grid" style={{ padding: '14px' }}>
              <button className="pf-stat-card" onClick={() => setListModal('followers')} style={{ cursor: 'pointer' }}>
                <div className="pf-stat-card-label">Followers</div>
                <div className="pf-stat-card-value">{counts.followers}</div>
              </button>
              <button className="pf-stat-card" onClick={() => setListModal('following')} style={{ cursor: 'pointer' }}>
                <div className="pf-stat-card-label">Following</div>
                <div className="pf-stat-card-value">{counts.following}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* modals */}
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

      {/* edit overlay */}
      {isOwn && editing && (
        <EditOverlay view={view} onClose={() => setEditing(false)} />
      )}

      {/* rank roadmap modal */}
      {rankModal && (
        <RankRoadmap totalXp={totalXp} onClose={() => setRankModal(false)} />
      )}

      {/* avatar cropper modal */}
      {pendingAvatar && (
        <AvatarCropper
          file={pendingAvatar}
          onCancel={() => setPendingAvatar(null)}
          onDone={async (url) => {
            await setAvatarUrl(url)
            setPendingAvatar(null)
          }}
        />
      )}
    </div>
  )
}

/* ----------------------------------------------------------- rank roadmap */

function RankRoadmap({ totalXp, onClose }: { totalXp: number; onClose: () => void }) {
  const { rank, nextRank, pct } = rankProgress(totalXp)
  const currentIdx = RANKS.findIndex((r) => r.id === rank.id)
  return (
    <div className="pf-edit-overlay" onClick={onClose}>
      <div className="pf-roadmap pf-panel-inner" onClick={(e) => e.stopPropagation()}>
        <div className="pf-edit-header">
          <div className="pf-edit-title">Rank Roadmap</div>
          <button className="pf-edit-close" onClick={onClose}>✕</button>
        </div>

        <p className="pf-roadmap-intro">
          Your rank is earned from <strong>total XP</strong> = 🌿 Green Leaves (study time) + 💎 Golden Leaves (engagement &amp; streaks). The ladder is exponential: early ranks come fast to hook you in, later ranks are a long grind that rewards consistency.
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
          <div className="pf-roadmap-max">You've reached the highest rank — Focuster! 👑</div>
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
      <Icon name="people" size={16} /> {copied ? 'Copied!' : 'Share Profile'}
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
  const setAvatarUrl = useProfile((s) => s.setAvatarUrl)
  const savePublic = useProfile((s) => s.savePublic)
  const setStudyGoals = useProfile((s) => s.setStudyGoals)
  const canChange = useProfile((s) => s.canChangeDisplayName())
  const changesUsed = useProfile((s) => s.displayNameChanges)
  const goals = useProfile((s) => s.data.studyGoals)
  const rank = getRank(view.rankId)

  const [tab, setTab] = useState<'identity' | 'avatar' | 'bio' | 'goals'>('identity')
  const [name, setName] = useState(view.displayName)
  const [bio, setBio] = useState(view.pub.bio)
  const [nameStatus, setNameStatus] = useState<{ ok: boolean; error?: string }>({ ok: true })
  const [draftGoals, setDraftGoals] = useState<string[]>(goals)
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const remaining = Math.max(0, DISPLAY_NAME_CHANGES_MAX - changesUsed)

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === view.displayName) return
    const check = checkDisplayName(trimmed)
    if (!check.ok) { setNameStatus({ ok: false, error: check.error }); return }
    if (!canChange) { setNameStatus({ ok: false, error: 'Changes used up — buy a Name Card' }); return }
    setNameStatus({ ok: true })
    const ok = await setDisplayName(trimmed)
    if (!ok) setNameStatus({ ok: false, error: 'Could not save' })
  }

  function saveBio() {
    if (bio !== view.pub.bio) savePublic({ bio })
  }

  function saveGoals() {
    setStudyGoals(draftGoals)
  }

  return (
    <div className="pf-edit-overlay" onClick={onClose}>
      <div className="pf-edit-panel pf-panel-inner" onClick={(e) => e.stopPropagation()}>
        <div className="pf-edit-header">
          <div className="pf-edit-title">Customize Profile</div>
          <button className="pf-edit-close" onClick={onClose}>✕</button>
        </div>

        {/* tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['identity', 'avatar', 'bio', 'goals'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase',
                letterSpacing: 0.8,
                background: tab === t ? 'linear-gradient(180deg, #f0c850, #d4a843)' : 'rgba(200,168,78,0.1)',
                color: tab === t ? '#0b1022' : '#8a8878',
              }}
            >
              {t === 'identity' ? 'Name' : t === 'avatar' ? 'Avatar' : t === 'bio' ? 'Bio' : 'Goals'}
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
              maxLength={40}
              placeholder="Display name"
              onChange={(e) => { setName(e.target.value); if (!nameStatus.ok) setNameStatus({ ok: true }) }}
              onBlur={saveName}
              style={{ width: '100%', fontSize: 18, fontWeight: 700 }}
            />
            <div style={{ marginTop: 6, fontSize: 13, color: nameStatus.ok ? '#4fd1c5' : '#ff6a6a' }}>
              {nameStatus.ok
                ? `${remaining} free change${remaining === 1 ? '' : 's'} left`
                : nameStatus.error}
            </div>

            <div className="pf-edit-label" style={{ marginTop: 16 }}>Banner</div>
            <BannerPicker view={view} />
          </div>
        )}

        {/* avatar tab */}
        {tab === 'avatar' && (
          <div className="pf-edit-section">
            <div className="pf-edit-label">Profile Picture</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <ProfileAvatar name={view.displayName} avatarUrl={view.avatarUrl} rankId={view.rankId} size={80} />
              <div>
                <button
                  className="sf-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{ fontSize: 14 }}
                >
                  Upload Photo
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setPendingAvatar(file)
                    if (avatarInputRef.current) avatarInputRef.current.value = ''
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#8a8878' }}>
              Choose a character or upload your own picture.
            </div>
            <button
              className="sf-btn secondary"
              onClick={() => window.location.href = '/character-select'}
              style={{ marginTop: 12, fontSize: 14 }}
            >
              Choose Character
            </button>
            {pendingAvatar && (
              <AvatarCropper
                file={pendingAvatar}
                onCancel={() => setPendingAvatar(null)}
                onDone={async (url) => {
                  await setAvatarUrl(url)
                  setPendingAvatar(null)
                }}
              />
            )}
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
              onBlur={saveBio}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#8a8878', textAlign: 'right' }}>
              {bio.length}/280
            </div>
          </div>
        )}

        {/* goals tab */}
        {tab === 'goals' && (
          <div className="pf-edit-section">
            <div className="pf-edit-label">Study Goals</div>
            <StudyGoalsSelector value={draftGoals} onChange={setDraftGoals} />
            <button
              className="sf-btn"
              onClick={saveGoals}
              style={{ marginTop: 12, width: '100%', fontSize: 14 }}
            >
              Save Goals
            </button>
          </div>
        )}
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
      const { error } = await insforge.storage.from('avatars').upload(path, file)
      if (!error) {
        const { data: pub } = insforge.storage.from('avatars').getPublicUrl(path)
        savePublic({ bannerImage: pub.publicUrl, bannerPos: 50 })
      }
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            padding: '6px 12px', borderRadius: 4, border: '1px solid rgba(200,168,78,0.3)',
            background: 'rgba(200,168,78,0.1)', color: '#d4a843', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          {busy ? '…' : '⬆ Upload'}
        </button>
        {BANNERS.map((b) => (
          <button
            key={b.id}
            style={{
              width: 32, height: 20, borderRadius: 4, border: `2px solid ${!hasImage && view.pub.banner === b.id ? '#d4a843' : 'rgba(200,168,78,0.2)'}`,
              background: b.css, cursor: 'pointer',
            }}
            title={b.name}
            onClick={() => savePublic({ banner: b.id, bannerImage: null })}
          />
        ))}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {hasImage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8a8878' }}>
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

async function getPublicProfileByPlayerId(playerId: number): Promise<PublicProfile | null> {
  const { data, error } = await insforge
    .from('public_profiles')
    .select('*')
    .eq('player_id', playerId)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as PublicProfile
}
