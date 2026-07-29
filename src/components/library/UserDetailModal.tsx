import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTarget, getSelfId } from '../../multiplayer/net'
import { getPublicProfileById } from '../../lib/social'
import { getRank } from '../../lib/ranks'
import { effectiveStatus, STATUS_COLOR } from '../../lib/presence'
import { STUDY_STATUS_LABEL, type PublicProfile, type StudyStatus } from '../../lib/types'
import { ProfileAvatar } from '../ProfileAvatar'
import { RankBadge } from '../RankBadge'
import { Flag } from '../Flag'
import { AddFriendButton } from '../AddFriendButton'
import './UserDetailModal.css'

type Tab = 'focus' | 'profile'

interface Props {
  /** Network ID of the selected player (from the roster) */
  networkId: string
  /** Display name from the roster */
  name: string
  /** Country code from the roster */
  country: string | null
  /** Rank ID from the roster */
  rank: string
  onClose: () => void
}

export function UserDetailModal({ networkId, name, country, rank, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('focus')
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Fetch the remote user's full profile from the DB
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // The network id format is "userId:deviceToken" — extract the auth user id prefix.
    const userId = networkId.split(':')[0]
    void getPublicProfileById(userId).then((p) => {
      if (cancelled) return
      console.log('[UserDetailModal] profile fetch:', userId, p ? 'found' : 'null')
      setProfile(p)
      setLoading(false)
    }).catch((err) => {
      console.error('[UserDetailModal] profile fetch error:', err)
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [networkId])

  // Live data from the multiplayer target (updates every second via tick)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const target = getTarget(networkId)
  const subject = target?.subject || ''
  const timerStartedAt = target?.timerStartedAt ?? 0
  const timerDurationMs = target?.timerDurationMs ?? 0

  const timerInfo = useMemo(() => {
    if (!timerStartedAt || !timerDurationMs) return null
    const now = Date.now()
    const elapsed = now - timerStartedAt
    const remainingMs = Math.max(0, timerDurationMs - elapsed)
    const pct = Math.min(1, elapsed / timerDurationMs)
    const totalSec = Math.round(remainingMs / 1000)
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const ss = String(totalSec % 60).padStart(2, '0')
    const sittingMin = Math.floor(elapsed / 60000)
    const sittingH = Math.floor(sittingMin / 60)
    const sittingM = sittingMin % 60
    const sittingLabel = sittingH > 0 ? `${sittingH}h ${sittingM}m` : `${sittingM}m`
    return { pct, mm, ss, sittingLabel, elapsed }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, timerStartedAt, timerDurationMs])

  const pub = profile?.public_profile

  function goProfile() {
    if (profile?.player_id != null) {
      onClose()
      navigate(`/u/${profile.player_id}`)
    }
  }

  // Determine status
  const status: StudyStatus = profile
    ? effectiveStatus({ last_seen_at: profile.last_seen_at, study_status: profile.study_status })
    : 'offline'

  const isSelf = networkId === getSelfId()

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="udm-head">
          <div className="udm-head-left">
            <ProfileAvatar name={name} avatarUrl={profile?.avatar_url ?? null} rankId={rank} size={44} />
            <div className="udm-head-text">
              <span className="udm-head-name">
                {name}
                <RankBadge rankId={rank} size={18} />
              </span>
              <span className="udm-head-status">
                <span className="udm-status-dot" style={{ background: STATUS_COLOR[status] }} />
                {STUDY_STATUS_LABEL[status]}
                {country && <Flag code={country} className="udm-head-flag" />}
              </span>
            </div>
          </div>
          <button className="udm-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="udm-tabs">
          <button
            className={`udm-tab ${tab === 'focus' ? 'active' : ''}`}
            onClick={() => setTab('focus')}
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Live Focus
          </button>
          <button
            className={`udm-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
          >
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </button>
        </div>

        {/* Body */}
        <div className="udm-body">
          {tab === 'focus' ? (
            <FocusTab
              subject={subject}
              timerInfo={timerInfo}
              status={status}
              target={target}
            />
          ) : (
            <ProfileTab
              profile={profile}
              loading={loading}
              onGoProfile={goProfile}
              name={name}
              rank={rank}
              country={country}
              networkId={networkId}
            />
          )}
        </div>

        {/* Footer */}
        {!isSelf && (
          <div className="udm-foot">
            <AddFriendButton targetId={networkId.split(':')[0]} />
            {profile?.player_id != null && (
              <button className="udm-view-profile-btn" onClick={goProfile}>
                View Full Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ focus tab */

function FocusTab({
  subject,
  timerInfo,
  status,
  target,
}: {
  subject: string
  timerInfo: { pct: number; mm: string; ss: string; sittingLabel: string; elapsed: number } | null
  status: StudyStatus
  target: ReturnType<typeof getTarget>
}) {
  const isStudying = status === 'studying' || status === 'focus'
  const isSeated = target?.seated ?? false

  return (
    <div className="udm-focus">
      {!isStudying && !timerInfo ? (
        <div className="udm-focus-empty">
          <div className="udm-focus-empty-icon">
            <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <p>Not in a study session</p>
          <span>This user is currently {STUDY_STATUS_LABEL[status].toLowerCase()}</span>
        </div>
      ) : (
        <>
          {/* Timer Ring */}
          {timerInfo && (
            <div className="udm-focus-ring-wrap">
              <div className="udm-focus-ring">
                <svg viewBox="0 0 100 100" width={100} height={100}>
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
                  <circle
                    cx="50" cy="50" r="44"
                    fill="none"
                    stroke={status === 'focus' ? '#a07cff' : '#4ade80'}
                    strokeWidth={5}
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 * (1 - timerInfo.pct)}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="udm-focus-ring-center">
                  <span className="udm-focus-ring-time">{timerInfo.mm}:{timerInfo.ss}</span>
                  <span className="udm-focus-ring-label">remaining</span>
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          {subject && (
            <div className="udm-focus-subject">
              <span className="udm-focus-subject-label">Studying</span>
              <span className="udm-focus-subject-name">{subject}</span>
            </div>
          )}

          {/* Sitting Duration */}
          {timerInfo && (
            <div className="udm-focus-sitting">
              <div className="udm-focus-sitting-row">
                <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Sitting for <strong>{timerInfo.sittingLabel}</strong></span>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="udm-focus-status">
            <span className="udm-focus-status-dot" style={{ background: STATUS_COLOR[status] }} />
            <span>{STUDY_STATUS_LABEL[status]}</span>
            {isSeated && <span className="udm-focus-seated-badge">Seated</span>}
          </div>
        </>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- profile tab */

function ProfileTab({
  profile,
  loading,
  onGoProfile,
  name,
  rank: rankId,
  country,
  networkId,
}: {
  profile: PublicProfile | null
  loading: boolean
  onGoProfile: () => void
  name: string
  rank: string
  country: string | null
  networkId: string
}) {
  if (loading) {
    return (
      <div className="udm-profile-loading">
        <div className="udm-profile-spinner" />
        <span>Loading profile…</span>
      </div>
    )
  }

  const pub = profile?.public_profile
  const rank = rankId ? getRank(rankId) : null
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <div className="udm-profile">
      {/* Basic Info — always shown from roster data */}
      <div className="udm-profile-stats">
        {rank && (
          <div className="udm-profile-stat">
            <span className="udm-profile-stat-label">Rank</span>
            <span className="udm-profile-stat-value" style={{ color: rank.accent }}>{rank.name}</span>
          </div>
        )}
        {country && (
          <div className="udm-profile-stat">
            <span className="udm-profile-stat-label">Country</span>
            <span className="udm-profile-stat-value">{country}</span>
          </div>
        )}
        {memberSince && (
          <div className="udm-profile-stat">
            <span className="udm-profile-stat-label">Member Since</span>
            <span className="udm-profile-stat-value">{memberSince}</span>
          </div>
        )}
      </div>

      {pub ? (
        <>
          {/* Bio */}
          {pub.bio && (
            <div className="udm-profile-section">
              <div className="udm-profile-section-label">Bio</div>
              <p className="udm-profile-bio">{pub.bio}</p>
            </div>
          )}

          {/* Extended Stats */}
          {pub.favoriteSubject && (
            <div className="udm-profile-section">
              <div className="udm-profile-section-label">Favorite Subject</div>
              <span className="udm-profile-stat-value">{pub.favoriteSubject}</span>
            </div>
          )}
          {pub.studySchedule && (
            <div className="udm-profile-section">
              <div className="udm-profile-section-label">Schedule</div>
              <span className="udm-profile-stat-value">{pub.studySchedule}</span>
            </div>
          )}
          {pub.likes > 0 && (
            <div className="udm-profile-section">
              <div className="udm-profile-section-label">Likes</div>
              <span className="udm-profile-stat-value">{pub.likes}</span>
            </div>
          )}

          {/* Study Interests */}
          {pub.studyInterests.length > 0 && (
            <div className="udm-profile-section">
              <div className="udm-profile-section-label">Study Interests</div>
              <div className="udm-profile-tags">
                {pub.studyInterests.map((interest) => (
                  <span key={interest} className="udm-profile-tag">{interest}</span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {pub.socialLinks.length > 0 && (
            <div className="udm-profile-section">
              <div className="udm-profile-section-label">Links</div>
              <div className="udm-profile-links">
                {pub.socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="udm-profile-link"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="udm-profile-section">
          <p className="udm-profile-bio" style={{ opacity: 0.5 }}>Sign in to see this user's full profile.</p>
        </div>
      )}
    </div>
  )
}
