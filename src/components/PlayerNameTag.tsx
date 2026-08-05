import { useState, useEffect } from 'react'
import { Flag } from './Flag'
import { RankBadge } from './RankBadge'
import { getRank } from '../lib/ranks'
import { getEffectiveBanner, effectiveLogos, logoFilter } from '../lib/banners'
import './PlayerNameTag.css'

export interface PlayerNameTagProps {
  name: string
  rank: string
  country: string | null
  playerId?: number | null
  self?: boolean
  showAll?: boolean
  timerRemaining?: number
  timerTotal?: number
  banner?: string
  logo?: string
  onInfoClick?: () => void
  /** If true, banner name text should be dark (for light banners). */
  textDark?: boolean
}

export function PlayerNameTag({ name, rank, country, playerId, self, showAll, timerRemaining, timerTotal, banner, logo, onInfoClick, textDark }: PlayerNameTagProps) {
  const [expanded, setExpanded] = useState(false)
  const r = getRank(rank)
  const visible = showAll || expanded
  const b = getEffectiveBanner(banner)
  const logoData = logo ? effectiveLogos().find((l) => l.id === logo) : null
  const displayName = name.length > 16 ? name.slice(0, 16) + '…' : name

  useEffect(() => {
    if (!expanded) return
    const t = setTimeout(() => setExpanded(false), 6000)
    return () => clearTimeout(t)
  }, [expanded])

  if (!visible) {
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

  return (
    <div
      className={`pnt pnt-expanded${self ? ' pnt-self' : ''}`}
      style={{ ['--rank' as string]: r.accent } as React.CSSProperties}
    >
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
              style={{ filter: logoFilter(logoData) }}
            />
          ) : (
            <span
              className="pnt-banner-logo"
              style={{ background: logoData.css || 'rgba(255,255,255,0.2)' }}
            />
          )
        )}
        <span className="pnt-banner-name" style={textDark ? { color: '#1a1a2e', textShadow: '0 1px 2px rgba(255,255,255,0.5)' } : undefined}>{displayName}</span>
      </div>
      <span className="pnt-content">
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
        <button
          className="pnt-info"
          onClick={(e) => {
            e.stopPropagation()
            if (onInfoClick) {
              onInfoClick()
            } else {
              window.dispatchEvent(new CustomEvent('pnt-info-click', { detail: { name, rank, country, playerId } }))
            }
          }}
        >
          More Info
        </button>
      </span>
    </div>
  )
}
