import { getRank } from '../lib/ranks'

// A rank badge image (the sliced art under /public/icons/ranks). Display only —
// rank progression isn't computed yet; everyone is Brown Leaf by default.
export function RankBadge({
  rankId,
  size = 24,
  showName = false,
  className = '',
}: {
  rankId: string | null | undefined
  size?: number
  showName?: boolean
  className?: string
}) {
  const rank = getRank(rankId)
  const img = (
    <img
      src={rank.badge}
      width={size}
      height={size}
      alt={showName ? '' : rank.name}
      aria-hidden={showName ? true : undefined}
      title={rank.name}
      draggable={false}
      decoding="async"
    />
  )
  if (!showName) return <span className={`rank-badge ${className}`.trim()}>{img}</span>
  return (
    <span className={`rank-badge with-name ${className}`.trim()} style={{ ['--rank' as string]: rank.accent }}>
      {img}
      <span className="rank-badge-name">{rank.name}</span>
    </span>
  )
}
