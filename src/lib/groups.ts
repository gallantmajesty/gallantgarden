import { supabase } from './supabase'
import {
  type Conversation,
  type GroupMember,
  type GroupRole,
  type PublicProfile,
  MAX_GROUP_MEMBERS,
  GROUP_TITLE_MAX,
  GROUP_DESC_MAX,
  parseProfilePublic,
} from './types'

// Group chat data layer. Every mutation runs through a SECURITY DEFINER RPC
// (create_group / join_group / group_*) so the friend-gate + role checks stay
// server-side. Reads use RLS (members only). See migrations/20260807000000_*.sql.

export interface CreateGroupInput {
  title: string
  description?: string
  memberIds?: string[]
  memberLimit?: number
}

export async function createGroup(input: CreateGroupInput): Promise<Conversation | null> {
  const title = input.title.trim().slice(0, GROUP_TITLE_MAX)
  if (!title) return null
  const { data, error } = await supabase.rpc('create_group', {
    p_title: title,
    p_description: (input.description ?? '').trim().slice(0, GROUP_DESC_MAX),
    p_member_ids: (input.memberIds ?? []).slice(0, MAX_GROUP_MEMBERS - 1),
    p_member_limit: Math.min(MAX_GROUP_MEMBERS, input.memberLimit ?? MAX_GROUP_MEMBERS),
  })
  if (error || !data) return null
  return data as unknown as Conversation
}

export async function joinGroupByCode(code: string): Promise<Conversation | null> {
  const { data, error } = await supabase.rpc('join_group', { p_code: code.trim() })
  if (error || !data) return null
  return data as unknown as Conversation
}

export async function groupInvite(conversationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('group_invite', { p_group: conversationId, p_user: userId })
  return !error
}

export async function groupRemoveMember(conversationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.rpc('group_remove_member', { p_group: conversationId, p_user: userId })
  return !error
}

export async function groupSetRole(conversationId: string, userId: string, role: GroupRole): Promise<boolean> {
  const { error } = await supabase.rpc('group_set_role', { p_group: conversationId, p_user: userId, p_role: role })
  return !error
}

export async function groupLeave(conversationId: string): Promise<boolean> {
  const { error } = await supabase.rpc('group_leave', { p_group: conversationId })
  return !error
}

/** The full member roster of a group, joined with each member's public profile. */
export async function getGroupMembers(conversationId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(
      'user_id, role, joined_at, profiles:user_id ( id, display_name, avatar_url, country, rank, avatar, public_profile, last_seen_at, study_status, player_id )',
    )
    .eq('conversation_id', conversationId)
    .order('joined_at', { ascending: true })
  if (error || !data) return []
  return (data as Array<Record<string, unknown>>).map((r) => {
    const raw = r.profiles as Record<string, unknown> | null
    const profile: PublicProfile | null = raw
      ? {
          id: raw.id as string,
          display_name: (raw.display_name as string) ?? 'User',
          player_id: (raw.player_id as number | null) ?? null,
          avatar: (raw.avatar as PublicProfile['avatar']) ?? ({} as PublicProfile['avatar']),
          avatar_url: (raw.avatar_url as string | null) ?? null,
          country: (raw.country as string | null) ?? null,
          rank: (raw.rank as string | null) ?? null,
          public_profile: parseProfilePublic(raw.public_profile),
          created_at: (raw.created_at as string) ?? '',
          last_seen_at: (raw.last_seen_at as string | null) ?? null,
          study_status: (raw.study_status as PublicProfile['study_status']) ?? 'offline',
        }
      : null
    return {
      user_id: r.user_id as string,
      role: (r.role as GroupRole) ?? 'member',
      joined_at: r.joined_at as string,
      profile,
    }
  })
}
