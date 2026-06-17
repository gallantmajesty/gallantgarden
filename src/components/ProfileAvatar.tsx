import { getRank } from '../lib/ranks'
import './ProfileAvatar.css'

// Profile picture with graceful fallback: the uploaded image when present, else
// a rank-tinted glowing monogram built from the display name. No emoji.
export function ProfileAvatar({
  name,
  avatarUrl,
  rankId,
  size = 96,
  className = '',
}: {
  name: string
  avatarUrl?: string | null
  rankId?: string | null
  size?: number
  className?: string
}) {
  const rank = getRank(rankId)
  const initial = (name.trim()[0] || 'E').toUpperCase()
  return (
    <span
      className={`profile-avatar ${className}`.trim()}
      style={{
        width: size,
        height: size,
        ['--pa-accent' as string]: rank.accent,
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" draggable={false} decoding="async" />
      ) : (
        <span className="profile-avatar-monogram">{initial}</span>
      )}
    </span>
  )
}
