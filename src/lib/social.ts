import { insforge } from './insforge'
import { parseProfilePublic, type PublicProfile, type StudyStatus } from './types'

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
    last_seen_at: (row.last_seen_at as string | null) ?? null,
    study_status: (row.study_status as StudyStatus | undefined) ?? 'offline',
  }
}

// NOTE: last_seen_at/study_status only exist after the chat migration is applied.
// PostgREST tolerates selecting them once present; before that, callers should
// have the migration applied (see migrations/*_add-chat-system.sql).
const PUBLIC_COLS =
  'id, username, display_name, avatar, avatar_url, country, rank, public_profile, created_at, last_seen_at, study_status'

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
  const { data, error } = await insforge.rpc('get_following_ids', { p_user_id: userId })
  if (error || !data) return []
  return data as string[]
}

/** Ids of everyone who follows `userId`. */
export async function getFollowerIds(userId: string): Promise<string[]> {
  const { data, error } = await insforge.rpc('get_follower_ids', { p_user_id: userId })
  if (error || !data) return []
  return data as string[]
}

export interface FollowCounts {
  followers: number
  following: number
}

/** Follower + following counts for a user (derived from the follows table). */
export async function getCounts(userId: string): Promise<FollowCounts> {
  const { data, error } = await insforge.rpc('get_follow_count', { p_user_id: userId })
  if (error || !data) return { followers: 0, following: 0 }
  return data as FollowCounts
}

/** Does `meId` follow `targetId`? */
export async function isFollowing(meId: string, targetId: string): Promise<boolean> {
  const { data, error } = await insforge.rpc('get_is_following', {
    p_follower_id: meId,
    p_following_id: targetId,
  })
  if (error || typeof data !== 'boolean') return false
  return data
}

/** Users that BOTH `a` and `b` follow in common (mutual connections). */
export async function getMutualIds(a: string, b: string): Promise<string[]> {
  const { data, error } = await insforge.rpc('get_mutual_following_ids', { p_a: a, p_b: b })
  if (error || !data) return []
  return data as string[]
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
  // Sanitize for PostgREST: strip all non-alphanumeric chars except spaces
  const safe = q.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50)
  if (!safe) return []
  const like = `%${safe.replace(/[%_]/g, '')}%`
  const { data, error } = await insforge.database
    .from('public_profiles')
    .select(PUBLIC_COLS)
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .limit(Math.min(limit, 50))
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(mapPublic)
}
