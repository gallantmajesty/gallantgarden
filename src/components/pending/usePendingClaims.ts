// Reactive hook: universal notification count for the green dot.
// Sources: unclaimed achievements, unread announcements, free wheel spins,
// incoming friend requests.

import { useState, useEffect } from 'react'
import { useAchievements, pendingClaimCount } from '../../store/achievements'
import { usePomodoro } from '../../store/pomodoro'
import { useMagnet } from '../../store/magnet'
import { useFriends } from '../../store/friends'
import { useSocial } from '../../store/social'
import { useProfile } from '../../store/profile'
import { hasUnreadAnnouncements } from '../../lib/announcements'
import { getSpinRecord, loadWheelConfig } from '../../lib/luckyWheel'

/** Poll localStorage-backed notification sources (announcements, wheel spins). */
function useLocalStorageNotifications(): { announcements: boolean; freeSpins: boolean } {
  const [state, setState] = useState(() => check())

  useEffect(() => {
    const id = window.setInterval(() => setState(check()), 5_000)
    return () => window.clearInterval(id)
  }, [])

  return state
}

function check(): { announcements: boolean; freeSpins: boolean } {
  let announcements = false
  let freeSpins = false
  try { announcements = hasUnreadAnnouncements() } catch { /* ok */ }
  try {
    const cfg = loadWheelConfig()
    const rec = getSpinRecord()
    freeSpins = cfg.enabled && cfg.freeSpinsPerDay > 0 && rec.free < cfg.freeSpinsPerDay
  } catch { /* ok */ }
  return { announcements, freeSpins }
}

/** Total count of all pending notifications (green dot sources). */
export function usePendingClaims(): number {
  // ── zustand-backed sources ──
  const claimed = useAchievements((s) => s.claimed)
  usePomodoro((s) => s.totalFocusMin)
  usePomodoro((s) => s.completed)
  useMagnet((s) => s.data)
  useFriends((s) => s.friendIds)
  useFriends((s) => s.outgoing)
  const incomingCount = useFriends((s) => s.incoming.length)
  useSocial((s) => s.myCounts)
  useProfile((s) => s.rankXp)

  // ── localStorage-backed sources ──
  const { announcements, freeSpins } = useLocalStorageNotifications()

  // ── sum all sources ──
  const achievementCount = pendingClaimCount(claimed)
  const announcementCount = announcements ? 1 : 0
  const spinCount = freeSpins ? 1 : 0
  const friendCount = incomingCount > 0 ? 1 : 0

  return achievementCount + announcementCount + spinCount + friendCount
}
