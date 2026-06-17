import { create } from 'zustand'
import {
  followUser,
  unfollowUser,
  getFollowingIds,
  getCounts,
  type FollowCounts,
} from '../lib/social'

// Lightweight client cache for the signed-in user's social graph: who they
// follow (so Follow buttons render the right state instantly) plus their own
// follower/following counts. Follow/unfollow are optimistic and reconcile with
// the server in the background.

interface SocialState {
  meId: string | null
  /** ids the current user follows */
  following: Set<string>
  /** the current user's own counts (for the profile header) */
  myCounts: FollowCounts
  ready: boolean

  hydrate: (meId: string) => Promise<void>
  isFollowing: (targetId: string) => boolean
  /** Optimistically follow/unfollow `targetId`; returns the new follow state. */
  toggleFollow: (targetId: string) => Promise<boolean>
  reset: () => void
}

export const useSocial = create<SocialState>((set, get) => ({
  meId: null,
  following: new Set(),
  myCounts: { followers: 0, following: 0 },
  ready: false,

  hydrate: async (meId) => {
    const [ids, counts] = await Promise.all([getFollowingIds(meId), getCounts(meId)])
    set({ meId, following: new Set(ids), myCounts: counts, ready: true })
  },

  isFollowing: (targetId) => get().following.has(targetId),

  toggleFollow: async (targetId) => {
    const { meId, following, myCounts } = get()
    if (!meId || meId === targetId) return following.has(targetId)
    const wasFollowing = following.has(targetId)
    const next = new Set(following)
    let nextCount = myCounts.following
    if (wasFollowing) {
      next.delete(targetId)
      nextCount = Math.max(0, nextCount - 1)
    } else {
      next.add(targetId)
      nextCount += 1
    }
    // optimistic update
    set({ following: next, myCounts: { ...myCounts, following: nextCount } })

    const ok = wasFollowing
      ? await unfollowUser(meId, targetId)
      : await followUser(meId, targetId)

    if (!ok) {
      // revert on failure
      set({ following, myCounts })
      return wasFollowing
    }
    return !wasFollowing
  },

  reset: () =>
    set({ meId: null, following: new Set(), myCounts: { followers: 0, following: 0 }, ready: false }),
}))
