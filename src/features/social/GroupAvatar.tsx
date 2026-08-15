import { useState } from 'react'
import { getGroupColor, getGroupLogo } from './groupLogos'

/** A group avatar: a warm gradient tile with a people glyph, monogram fallback.
 *  Customized groups render their chosen logo over their chosen color. */
export function GroupAvatar({
  title,
  size = 40,
  logo,
  color,
}: {
  title: string
  size?: number
  logo?: string | null
  color?: string | null
}) {
  const [broken] = useState(false)
  const initial = (title.trim()[0] || '#').toUpperCase()
  const chosen = getGroupLogo(logo)
  const swatch = getGroupColor(color)
  const style = logo || color ? { background: `linear-gradient(135deg, ${swatch.from}, ${swatch.to})` } : undefined
  return (
    <span className="sh-group-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.4), ...style }}>
      {broken ? (
        initial
      ) : chosen ? (
        <span className="sh-group-logo" style={{ width: Math.round(size * 0.56), height: Math.round(size * 0.56) }}>
          {chosen.node}
        </span>
      ) : (
        <svg viewBox="0 0 24 24" width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )}
    </span>
  )
}
