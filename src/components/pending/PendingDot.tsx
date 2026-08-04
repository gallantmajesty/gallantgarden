// Green "you have something to claim/see" dot. Appears on a button while there
// are unclaimed achievement rewards, and vanishes once they're claimed.

import { usePendingClaims } from './usePendingClaims'
import './NotificationDot.css'

/** A small green dot in the top-right corner. Parent needs `position: relative`. */
export function NotificationDot({ size = 11, className }: { size?: number; className?: string }) {
  return (
    <span
      className={`notif-dot ${className ?? ''}`}
      style={{ width: size, height: size }}
      data-testid="notif-dot"
    />
  )
}

/** Renders a green dot only when there is something pending to claim. Place it
 *  directly inside a `position: relative` button. */
export function PendingDot({ size = 11, className }: { size?: number; className?: string }) {
  const count = usePendingClaims()
  if (count <= 0) return null
  return <NotificationDot size={size} className={className} />
}