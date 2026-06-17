import { insforge } from './insforge'
import { parseProfilePublic, type PublicProfile } from './types'

// Social graph helpers — follow/unfollow plus the read paths that power profile
// pages, followers/following lists, mutual detection and friend search. All
// cross-user reads go through the `public_profiles` view (safe columns only);
// the `follows` table is readable by any authenticated user but writable only
// for your own outgoing edge (enforced by RLS).

/** Map a raw public_profiles row into a typed PublicProfile (parsing jsonb). */
function mapPublic(row: Record<string, unknown>): PublicProfile {
  return {
    id: String(row.id),
    username: (row.username as string | null) ?? null,
    display_name: (row.display_name as string) || 'Explorer',
    avatar: (row.avatar as PublicProfile['avatar']) ?? ({} as PublicProfile['avatar']),
    avatar_url: (row.avatar_url as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    rank: (row.rank as string | null) ?? null,
    public_profile: parseProfilePublic(row.public_profile),
    created_at: (row.created_at as string) ?? '',
  }
}

const PUBLIC_COLS = 'id, username, display_name, avatar, avatar_url, country, rank, public_profile, created_at'

// ---------------------------------------------------------------- follow edges

/** Follow a user. Idempotent (upsert on the composite PK). */
export async function followUser(meId: string, targetId: string): Promise<boolean> {
  if (meId === targetId) return false
  const { error } = await insforge.database
    .from('follows')
    .upsert([{ follower_id: meId, following_id: targetId }], {
      onConflict: 'follower_id,following_id',
    })
  return !error
}

/** Unfollow a user. */
export async function unfollowUser(meId: string, targetId: string): Promise<boolean> {
  const { error } = await insforge.database
    .from('follows')
    .delete()
    .eq('follower_id', meId)
    .eq('following_id', targetId)
  return !error
}

/** Ids of everyone `userId` follows. */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await insforge.database
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  if (error || !data) return []
  return (data as { following_id: string }[]).map((r) => r.following_id)
}

/** Ids of everyone who follows `userId`. */
export async function getFollowerIds(userId: string): Promise<string[]> {
  const { data, error } = await insforge.database
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
  if (error || !data) return []
  return (data as { follower_id: string }[]).map((r) => r.follower_id)
}

export interface FollowCounts {
  followers: number
  following: number
}

/** Follower + following counts for a user (derived from the follows table). */
export async function getCounts(userId: string): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([
    getFollowerIds(userId),
    getFollowingIds(userId),
  ])
  return { followers: followers.length, following: following.length }
}

/** Does `meId` follow `targetId`? */
export async function isFollowing(meId: string, targetId: string): Promise<boolean> {
  const { data } = await insforge.database
    .from('follows')
    .select('follower_id')
    .eq('follower_id', meId)
    .eq('following_id', targetId)
    .maybeSingle()
  return !!data
}

/** Users that BOTH `a` and `b` follow in common (mutual connections). */
export async function getMutualIds(a: string, b: string): Promise<string[]> {
  const [fa, fb] = await Promise.all([getFollowingIds(a), getFollowingIds(b)])
  const set = new Set(fb)
  return fa.filter((id) => set.has(id))
}

// -------------------------------------------------------------- public reads

/** Resolve a batch of user ids into public profiles (for list rendering). */
export async function getProfilesByIds(ids: string[]): Promise<PublicProfile[]> {
  if (!ids.length) return []
  const { data, error } = await insforge.database
    .from('public_profiles')
    .select(PUBLIC_COLS)
    .in('id', ids)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(mapPublic)
}

/** Fetch one public profile by username (the /u/:username route). */
export async function getPublicProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data, error } = await insforge.database
    .from('public_profiles')
    .select(PUBLIC_COLS)
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (error || !data) return null
  return mapPublic(data as Record<string, unknown>)
}

/** Fetch one public profile by id. */
export async function getPublicProfileById(id: string): Promise<PublicProfile | null> {
  const { data, error } = await insforge.database
    .from('public_profiles')
    .select(PUBLIC_COLS)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return mapPublic(data as Record<string, unknown>)
}

/** Search users by username or display name (friend search). */
export async function searchUsers(query: string, limit = 20): Promise<PublicProfile[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const like = `%${q.replace(/[%_]/g, '')}%`
  const { data, error } = await insforge.database
    .from('public_profiles')
    .select(PUBLIC_COLS)
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .limit(limit)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(mapPublic)
}
