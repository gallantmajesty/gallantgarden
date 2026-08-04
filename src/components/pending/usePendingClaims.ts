// Reactive hook: how many achievement rewards are claimable but unclaimed.

import { useAchievements, pendingClaimCount } from '../../store/achievements'
import { usePomodoro } from '../../store/pomodoro'
import { useMagnet } from '../../store/magnet'
import { useFriends } from '../../store/friends'
import { useSocial } from '../../store/social'
import { useProfile } from '../../store/profile'

/** Count of achievements that are claimable right now but not yet claimed. */
export function usePendingClaims(): number {
  const claimed = useAchievements((s) => s.claimed)
  // Subscribing here means only the consuming component re-renders when progress changes.
  usePomodoro((s) => s.totalFocusMin)
  usePomodoro((s) => s.completed)
  useMagnet((s) => s.data)
  useFriends((s) => s.friendIds)
  useFriends((s) => s.outgoing)
  useSocial((s) => s.myCounts)
  useProfile((s) => s.rankXp)
  return pendingClaimCount(claimed)
}
