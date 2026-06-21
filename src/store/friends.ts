import { create } from 'zustand'
import {
  getFriends,
  getFriendIds,
  getIncomingRequests,
  getOutgoingRequests,
  getBlockedIds,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend as apiRemoveFriend,
  blockUser as apiBlock,
  unblockUser as apiUnblock,
  type FriendRequestWithProfile,
} from '../lib/friends'
import type { PublicProfile, ReportReason } from '../lib/types'
import { reportUser as apiReport } from '../lib/friends'

// Client cache of the signed-in user's friend graph: accepted friends, pending
// requests (both directions) and blocks. Mutations call the RPC layer then
// refresh the affected slice so the UI reflects server truth. Relationship
// lookups (isFriend / hasOutgoing / hasIncoming) drive the Add-Friend button.

interface FriendsState {
  meId: string | null
  ready: boolean
  friends: PublicProfile[]
  friendIds: Set<string>
  incoming: FriendRequestWithProfile[]
  outgoing: FriendRequestWithProfile[]
  blockedIds: Set<string>

  hydrate: (meId: string) => Promise<void>
  refreshFriends: () => Promise<void>
  refreshRequests: () => Promise<void>

  isFriend: (id: string) => boolean
  hasOutgoing: (id: string) => boolean
  incomingFrom: (id: string) => FriendRequestWithProfile | undefined
  isBlocked: (id: string) => boolean

  sendRequest: (id: string) => Promise<boolean>
  accept: (requestId: string) => Promise<boolean>
  decline: (requestId: string) => Promise<boolean>
  unfriend: (id: string) => Promise<boolean>
  block: (id: string) => Promise<boolean>
  unblock: (id: string) => Promise<boolean>
  report: (id: string, reason: ReportReason, context?: string) => Promise<boolean>
  reset: () => void
}

export const useFriends = create<FriendsState>((set, get) => ({
  meId: null,
  ready: false,
  friends: [],
  friendIds: new Set(),
  incoming: [],
  outgoing: [],
  blockedIds: new Set(),

  hydrate: async (meId) => {
    const [friends, incoming, outgoing, blocked] = await Promise.all([
      getFriends(meId),
      getIncomingRequests(meId),
      getOutgoingRequests(meId),
      getBlockedIds(meId),
    ])
    set({
      meId,
      ready: true,
      friends,
      friendIds: new Set(friends.map((f) => f.id)),
      incoming,
      outgoing,
      blockedIds: new Set(blocked),
    })
  },

  refreshFriends: async () => {
    const meId = get().meId
    if (!meId) return
    const ids = await getFriendIds(meId)
    const friends = await getFriends(meId)
    set({ friendIds: new Set(ids), friends })
  },

  refreshRequests: async () => {
    const meId = get().meId
    if (!meId) return
    const [incoming, outgoing] = await Promise.all([
      getIncomingRequests(meId),
      getOutgoingRequests(meId),
    ])
    set({ incoming, outgoing })
  },

  isFriend: (id) => get().friendIds.has(id),
  hasOutgoing: (id) => get().outgoing.some((r) => r.addressee_id === id),
  incomingFrom: (id) => get().incoming.find((r) => r.requester_id === id),
  isBlocked: (id) => get().blockedIds.has(id),

  sendRequest: async (id) => {
    const ok = await sendFriendRequest(id)
    if (ok) await Promise.all([get().refreshRequests(), get().refreshFriends()])
    return ok
  },
  accept: async (requestId) => {
    const ok = await respondFriendRequest(requestId, true)
    if (ok) await Promise.all([get().refreshRequests(), get().refreshFriends()])
    return ok
  },
  decline: async (requestId) => {
    const ok = await respondFriendRequest(requestId, false)
    if (ok) await get().refreshRequests()
    return ok
  },
  unfriend: async (id) => {
    const ok = await apiRemoveFriend(id)
    if (ok) await Promise.all([get().refreshFriends(), get().refreshRequests()])
    return ok
  },
  block: async (id) => {
    const ok = await apiBlock(id)
    if (ok) {
      set((s) => ({ blockedIds: new Set(s.blockedIds).add(id) }))
      await Promise.all([get().refreshFriends(), get().refreshRequests()])
    }
    return ok
  },
  unblock: async (id) => {
    const ok = await apiUnblock(id)
    if (ok)
      set((s) => {
        const next = new Set(s.blockedIds)
        next.delete(id)
        return { blockedIds: next }
      })
    return ok
  },
  report: (id, reason, context = '') => apiReport(id, reason, context),

  reset: () =>
    set({
      meId: null,
      ready: false,
      friends: [],
      friendIds: new Set(),
      incoming: [],
      outgoing: [],
      blockedIds: new Set(),
    }),
}))
