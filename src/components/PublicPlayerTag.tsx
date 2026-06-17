import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import './PublicPlayerTag.css'

// The ONE public identity component: [flag] Username [rank badge]. By design it
// only accepts the three publicly-visible fields. Age, email, full name, and the
// auth provider are deliberately NOT part of this contract, so they can never
// leak into a lobby, leaderboard, chat, or roster.
export interface PublicPlayer {
  username: string
  /** ISO 3166-1 alpha-2 country code (UPPERCASE), or null if unset */
  country: string | null
  /** rank id (see ranks.ts) */
  rank: string
}

export function PublicPlayerTag({
  player,
  size = 'md',
  className = '',
}: {
  player: PublicPlayer
  size?: 'sm' | 'md'
  className?: string
}) {
  const badge = size === 'sm' ? 18 : 24
  return (
    <span className={`ppt ppt-${size} ${className}`.trim()}>
      {player.country && <Flag code={player.country} className="ppt-flag" />}
      <span className="ppt-name">{player.username}</span>
      <RankBadge rankId={player.rank} size={badge} className="ppt-rank" />
    </span>
  )
}
