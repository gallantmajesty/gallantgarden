import { useEffect, useState } from 'react'
import { getRank } from '../lib/ranks'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
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
  /** True when this is a live player (their More Info card), not an NPC. */
  isUser?: boolean
}

interface Props {
  profile: NpcProfileData
  onClose: () => void
}

const DECLINE_MESSAGES = [
  "Thanks for the request! I'm focused on studying right now, maybe later!",
  "Hey! I appreciate it, but I keep my friends list small. Keep grinding though!",
  "Cool request! I'm pretty selective with friends. See you around the library!",
  "Nice one! I'm not adding friends right now but your rank looks great!",
  "Appreciate it! I study solo mostly. Keep up the good work!",
]

export function NpcProfileCard({ profile, onClose }: Props) {
  const [friendSent, setFriendSent] = useState(false)
  const [declineMsg, setDeclineMsg] = useState('')
  const rank = getRank(profile.rank)

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

        <div className="npc-profile-header">
          <div className="npc-profile-avatar">
            <div className="npc-profile-avatar-icon" style={{ background: rank.accent + '33' }}>
              <span className="npc-profile-initial">{profile.name[0]}</span>
            </div>
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
            <button className="npc-profile-btn npc-profile-btn--secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
