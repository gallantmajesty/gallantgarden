import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { getRank } from '../lib/ranks'
import './PlayerNameTag.css'

// A magical floating name plate shown above each player's head in the realm.
// It carries the player's display name (never the login username) plus their
// rank — and the whole thing is tinted + glows in the rank's own accent colour,
// so a Forest Guardian reads very differently from a Brown Leaf.
export interface PlayerNameTagProps {
  name: string
  rank: string
  country: string | null
  /** the local player gets a brighter ring so you can spot yourself */
  self?: boolean
}

export function PlayerNameTag({ name, rank, country, self }: PlayerNameTagProps) {
  const r = getRank(rank)
  return (
    <div
      className={`pnt${self ? ' pnt-self' : ''}`}
      style={{ ['--rank' as string]: r.accent } as React.CSSProperties}
    >
      <span className="pnt-shine" aria-hidden />
      <span className="pnt-frame" aria-hidden />
      <span className="pnt-spark" aria-hidden>✦</span>
      <span className="pnt-content">
        <span className="pnt-top">
          {country && <Flag code={country} className="pnt-flag" />}
          <span className="pnt-name">{name}</span>
        </span>
        <span className="pnt-bottom">
          <RankBadge rankId={rank} size={18} className="pnt-rank" />
          <span className="pnt-rankname">{r.name}</span>
        </span>
      </span>
    </div>
  )
}
