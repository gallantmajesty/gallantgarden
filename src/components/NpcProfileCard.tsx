import { useEffect, useState } from 'react'
import { getRank } from '../lib/ranks'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { BANNERS, LOGOS, type Banner } from '../lib/banners'
import './NpcProfileCard.css'

export interface NpcProfileData {
  name: string
  rank: string
  country: string | null
  characterId?: string
  studyTopic?: string
  totalXp?: number
  sessionsCompleted?: number
  streak?: number
  bio?: string
  joinDate?: string
  status: 'studying' | 'on-break' | 'offline'
  /** banner id (lib/banners) shown on the compact card strip */
  banner?: string
  /** logo id (lib/banners) shown on the compact card */
  logo?: string
  /** True when this is a live player (their More Info card), not an NPC. */
  isUser?: boolean
}

interface Props {
  profile: NpcProfileData
  onClose: () => void
  /** Optional — when set, "More Info" hands off to this instead of expanding
   *  the NPC full profile (used for real players, e.g. the room roster). */
  onMoreInfo?: () => void
}

const DECLINE_MESSAGES = [
  "Thanks for the request! I'm focused on studying right now, maybe later!",
  "Hey! I appreciate it, but I keep my friends list small. Keep grinding though!",
  "Cool request! I'm pretty selective with friends. See you around the library!",
  "Nice one! I'm not adding friends right now but your rank looks great!",
  "Appreciate it! I study solo mostly. Keep up the good work!",
]

/** The banner strip background for the compact card. */
function bannerStyle(id: string | undefined, rankAccent: string): React.CSSProperties {
  const b: Banner | undefined = BANNERS.find((x) => x.id === id)
  if (b?.image) return { backgroundImage: `url(${b.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  if (b?.css) return { background: b.css }
  return { background: `linear-gradient(135deg, ${rankAccent}55, #141414 70%)` }
}

export function NpcProfileCard({ profile, onClose, onMoreInfo }: Props) {
  const [friendSent, setFriendSent] = useState(false)
  const [declineMsg, setDeclineMsg] = useState('')
  const [expanded, setExpanded] = useState(false)
  const rank = getRank(profile.rank)
  const logo = LOGOS.find((l) => l.id === profile.logo)
  const showFull = onMoreInfo ? false : expanded

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (!friendSent) return
    const t = setTimeout(() => {
      setDeclineMsg(DECLINE_MESSAGES[Math.floor(Math.random() * DECLINE_MESSAGES.length)])
    }, 2000)
    return () => clearTimeout(t)
  }, [friendSent])

  return (
    <div className="npc-profile-overlay" onClick={onClose}>
      <div className="npc-profile-card" onClick={(e) => e.stopPropagation()}>
        <button className="npc-profile-close" onClick={onClose}>×</button>

        {/* Compact view: banner strip + logo + name + rank + flag */}
        <div className="npc-profile-banner" style={bannerStyle(profile.banner, rank.accent)} />
        <div className="npc-profile-header">
          <div className="npc-profile-logo">
            {logo?.image ? (
              <img src={logo.image} alt="" draggable={false} />
            ) : (
              <span className="npc-profile-initial">{profile.name[0]}</span>
            )}
          </div>
          <div className="npc-profile-identity">
            <h2 className="npc-profile-name">{profile.name}</h2>
            <div className="npc-profile-rank">
              <RankBadge rankId={profile.rank} size={20} />
              <span>{rank.name}</span>
            </div>
            {profile.country && (
              <div className="npc-profile-country">
                <Flag code={profile.country} className="npc-profile-flag" />
                <span>{profile.country}</span>
              </div>
            )}
          </div>
        </div>

        <div className="npc-profile-status">
          <span className={`npc-profile-dot npc-profile-dot--${profile.status}`} />
          <span>{profile.isUser ? 'In the library now' : profile.status === 'studying' ? 'Studying now' : profile.status === 'on-break' ? 'On a break' : 'Offline'}</span>
        </div>

        <div className="npc-profile-actions npc-profile-actions--top">
          {(onMoreInfo || !profile.isUser) && (
            <button
              className="npc-profile-btn npc-profile-btn--primary"
              onClick={() => (onMoreInfo ? onMoreInfo() : setExpanded(true))}
            >
              More Info
            </button>
          )}
        </div>

        {/* Full profile — only revealed behind "More Info" (NPCs). */}
        {showFull && (
          <div className="npc-profile-full">
            {profile.bio && <p className="npc-profile-bio">{profile.bio}</p>}

            {profile.totalXp != null && (
              <div className="npc-profile-stats">
                <div className="npc-profile-stat">
                  <span className="npc-profile-stat-value">{profile.totalXp.toLocaleString()}</span>
                  <span className="npc-profile-stat-label">Total XP</span>
                </div>
                <div className="npc-profile-stat">
                  <span className="npc-profile-stat-value">{profile.sessionsCompleted ?? '—'}</span>
                  <span className="npc-profile-stat-label">Sessions</span>
                </div>
                <div className="npc-profile-stat">
                  <span className="npc-profile-stat-value">{profile.streak ?? '—'}</span>
                  <span className="npc-profile-stat-label">Day Streak</span>
                </div>
              </div>
            )}

            {profile.studyTopic && (
              <div className="npc-profile-topic">
                <span className="npc-profile-topic-label">Studying</span>
                <span className="npc-profile-topic-value">{profile.studyTopic}</span>
              </div>
            )}

            {profile.joinDate && (
              <div className="npc-profile-joined">
                Joined {profile.joinDate}
              </div>
            )}

            {!profile.isUser && (
              <div className="npc-profile-actions">
                {!friendSent ? (
                  <button
                    className="npc-profile-btn npc-profile-btn--primary"
                    onClick={() => setFriendSent(true)}
                  >
                    Send Friend Request
                  </button>
                ) : !declineMsg ? (
                  <button className="npc-profile-btn npc-profile-btn--pending" disabled>
                    Request Sent...
                  </button>
                ) : (
                  <div className="npc-profile-decline">
                    <span className="npc-profile-decline-icon">💬</span>
                    <span className="npc-profile-decline-msg">{declineMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
