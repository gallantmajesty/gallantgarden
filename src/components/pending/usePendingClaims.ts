// Reactive hook: universal notification count for the green dot.
// Sources: unread announcements (News & Updates), incoming friend requests.
//
// Claimable achievement rewards are intentionally NOT a source: for an active
// player there is almost always a reachable tier (e.g. "visit the library once"),
// so it would keep the dot permanently lit and read as "for show". The dot only
// appears for real, unseen updates — news/events you haven't opened, and new
// friend requests. (Achievements keep their own Claim affordance in the panel.)

import { useState, useEffect } from 'react'
import { useFriends } from '../../store/friends'
import { hasUnreadAnnouncements } from '../../lib/announcements'

/** Poll localStorage-backed notification sources (announcements). */
function useLocalStorageNotifications(): { announcements: boolean } {
  const [state, setState] = useState(() => check())

  useEffect(() => {
    const id = window.setInterval(() => setState(check()), 5_000)
    return () => window.clearInterval(id)
  }, [])

  return state
}

function check(): { announcements: boolean } {
  let announcements = false
  try { announcements = hasUnreadAnnouncements() } catch { /* ok */ }
  return { announcements }
}

/** Total count of all pending notifications (green dot sources). */
export function usePendingClaims(): number {
  // ── zustand-backed sources ──
  const incomingCount = useFriends((s) => s.incoming.length)

  // ── localStorage-backed sources ──
  const { announcements } = useLocalStorageNotifications()

  // ── sum all sources ──
  const announcementCount = announcements ? 1 : 0
  const friendCount = incomingCount > 0 ? 1 : 0

  return announcementCount + friendCount
}
