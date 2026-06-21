import { insforge } from './insforge'
import { getProfilesByIds } from './social'
import type { FriendRequest, PublicProfile, ReportReason } from './types'

// Friend layer: the mutual, accept-gated relationship that unlocks chat. Sits
// ABOVE the asymmetric `follows` graph (see social.ts). All mutations go through
// SECURITY DEFINER RPCs (see the chat migration) so the cross-user rules — not
// blocked, not already friends, you-are-the-addressee — live server-side. Reads
// hit the RLS-guarded tables directly.

// ----------------------------------------------------------------- mutations

/** Send (or re-send) a friend request. Returns true on success. */
export async function sendFriendRequest(addressee: string): Promise<boolean> {
  const { error } = await insforge.database.rpc('send_friend_request', { addressee })
  return !error
}

/** Accept or decline an incoming request by id. */
export async function respondFriendRequest(requestId: string, accept: boolean): Promise<boolean> {
  const { error } = await insforge.database.rpc('respond_friend_request', {
    request_id: requestId,
    accept,
  })
  return !error
}

/** Remove an existing friend (either party). */
export async function removeFriend(other: string): Promise<boolean> {
  const { error } = await insforge.database.rpc('remove_friend', { other })
  return !error
}

/** Block a user — severs friendship, cancels requests, stops all contact. */
export async function blockUser(target: string): Promise<boolean> {
  const { error } = await insforge.database.rpc('block_user', { target })
  return !error
}

export async function unblockUser(target: string): Promise<boolean> {
  const { error } = await insforge.database.rpc('unblock_user', { target })
  return !error
}

/** File a report against a user. */
export async function reportUser(
  reportedId: string,
  reason: ReportReason,
  context = '',
): Promise<boolean> {
  const { error } = await insforge.database
    .from('reports')
    .insert([{ reported_id: reportedId, reason, context }])
  return !error
}

// --------------------------------------------------------------------- reads

/** Ids of everyone the current user is friends with (either side of the edge). */
export async function getFriendIds(meId: string): Promise<string[]> {
  const { data, error } = await insforge.database
    .from('friendships')
    .select('user_a, user_b')
  if (error || !data) return []
  return (data as { user_a: string; user_b: string }[]).map((r) =>
    r.user_a === meId ? r.user_b : r.user_a,
  )
}

/** Friends as full public profiles (for list rendering). */
export async function getFriends(meId: string): Promise<PublicProfile[]> {
  const ids = await getFriendIds(meId)
  return getProfilesByIds(ids)
}

export interface FriendRequestWithProfile extends FriendRequest {
  profile: PublicProfile | null
}

/** Incoming pending requests (people who want to friend me), with profiles. */
export async function getIncomingRequests(meId: string): Promise<FriendRequestWithProfile[]> {
  const { data, error } = await insforge.database
    .from('friend_requests')
    .select('*')
    .eq('addressee_id', meId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  const rows = data as FriendRequest[]
  const profiles = await getProfilesByIds(rows.map((r) => r.requester_id))
  const byId = new Map(profiles.map((p) => [p.id, p]))
  return rows.map((r) => ({ ...r, profile: byId.get(r.requester_id) ?? null }))
}

/** Outgoing pending requests (people I've asked), with profiles. */
export async function getOutgoingRequests(meId: string): Promise<FriendRequestWithProfile[]> {
  const { data, error } = await insforge.database
    .from('friend_requests')
    .select('*')
    .eq('requester_id', meId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  const rows = data as FriendRequest[]
  const profiles = await getProfilesByIds(rows.map((r) => r.addressee_id))
  const byId = new Map(profiles.map((p) => [p.id, p]))
  return rows.map((r) => ({ ...r, profile: byId.get(r.addressee_id) ?? null }))
}

/** Ids the current user has blocked. */
export async function getBlockedIds(meId: string): Promise<string[]> {
  const { data, error } = await insforge.database
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', meId)
  if (error || !data) return []
  return (data as { blocked_id: string }[]).map((r) => r.blocked_id)
}
