import { useState, useEffect } from 'react'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { getRank } from '../lib/ranks'
import { getBanner, LOGOS } from '../lib/banners'
import './PlayerNameTag.css'

// A magical floating name plate shown above each player's head in the realm.
// By default shows only the country flag — tap/click to expand the full tag
// (name + rank + timer + report). When `showAllUserInfo` is ON, always show
// the full tag.
export interface PlayerNameTagProps {
  name: string
  rank: string
  country: string | null
  playerId?: number | null
  self?: boolean
  /** When true, always show full info (name + rank). When false, flag-only by default. */
  showAll?: boolean
  /** Timer info from the multiplayer target — remaining seconds and total seconds. */
  timerRemaining?: number
  timerTotal?: number
  /** Banner id for the mini banner strip */
  banner?: string
  /** Logo id for the mini avatar */
  logo?: string
}

export function PlayerNameTag({ name, rank, country, playerId, self, showAll, timerRemaining, timerTotal, banner, logo }: PlayerNameTagProps) {
  const [expanded, setExpanded] = useState(false)
  const r = getRank(rank)
  const visible = showAll || expanded
  const b = getBanner(banner)
  const logoData = logo ? LOGOS.find((l) => l.id === logo) : null

  // Truncate name to 16 chars with ellipsis
  const displayName = name.length > 16 ? name.slice(0, 16) + '…' : name

  // Auto-collapse after 6 seconds
  useEffect(() => {
    if (!expanded) return
    const t = setTimeout(() => setExpanded(false), 6000)
    return () => clearTimeout(t)
  }, [expanded])

  if (!visible) {
    // Flag-only mode — small, clickable
    return (
      <div
        className="pnt-flag-only"
        onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
        title={`${name} — tap to see info`}
      >
        {country && <Flag code={country} className="pnt-flag" />}
      </div>
    )
  }

  // Full expanded tag with mini banner
  return (
    <div
      className={`pnt pnt-expanded${self ? ' pnt-self' : ''}`}
      style={{ ['--rank' as string]: r.accent } as React.CSSProperties}
    >
      {/* Mini banner strip */}
      <div
        className="pnt-banner-strip"
        style={b.image
          ? { backgroundImage: `url(${b.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: b.css }
        }
      >
        {logoData && (
          logoData.image ? (
            <img
              className="pnt-banner-logo"
              src={logoData.image}
              alt=""
              draggable={false}
              style={logoData.dim ? { filter: 'brightness(0.85)' } : undefined}
            />
          ) : (
            <span
              className="pnt-banner-logo"
              style={{ background: logoData.css || 'rgba(255,255,255,0.2)' }}
            />
          )
        )}
        <span className="pnt-banner-name">{displayName}</span>
      </div>
      <span className="pnt-content">
        <span className="pnt-top">
          {country && <Flag code={country} className="pnt-flag" />}
          <span className="pnt-name">{name}</span>
        </span>
        <span className="pnt-bottom">
          <RankBadge rankId={rank} size={18} className="pnt-rank" />
          <span className="pnt-rankname">{r.name}</span>
          {playerId != null && <span className="pnt-id"> #{playerId}</span>}
        </span>
        {timerRemaining != null && timerTotal != null && timerTotal > 0 && timerRemaining > 0 && (
          <span className="pnt-timer">
            <span className="pnt-timer-bar">
              <span className="pnt-timer-fill" style={{ width: `${Math.round((1 - timerRemaining / timerTotal) * 100)}%` }} />
            </span>
            <span className="pnt-timer-text">
              {Math.floor(timerRemaining / 60)}:{String(timerRemaining % 60).padStart(2, '0')}
            </span>
          </span>
        )}
        {self && (
          <span className="pnt-self-label">You</span>
        )}
      </span>
    </div>
  )
}
