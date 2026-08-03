import { supabase } from './supabase'
import type { Conversation, Message } from './types'

// Conversation + message data layer. Sends/creates go through SECURITY DEFINER
// RPCs (get_or_create_dm, send_message) which enforce friendship + block rules;
// reads hit the RLS-guarded tables. v1 is persist-and-poll: the store polls
// getMessages while a chat is open. Swapping in realtime later only changes the
// store's delivery loop — these functions stay the same.

export const MESSAGE_PAGE = 30

/** Get (or atomically create) the DM conversation with a friend. Returns its id. */
export async function getOrCreateDm(other: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { other })
  if (error) return null
  // rpc returns the scalar uuid (string) or { ... } depending on shape
  return (typeof data === 'string' ? data : (data as { get_or_create_dm?: string })?.get_or_create_dm) ?? null
}

/** Send a message. Returns the persisted row, or null if rejected (not friends,
 *  blocked, empty). */
export async function sendMessage(conversationId: string, body: string): Promise<Message | null> {
  const { data, error } = await supabase.rpc('send_message', {
    conversation: conversationId,
    body,
  })
  if (error || !data) return null
  // rpc returns the inserted row (object) or an array with one row
  const row = Array.isArray(data) ? data[0] : data
  return (row as Message) ?? null
}

/** Fetch a page of messages, newest-first internally, returned oldest→newest.
 *  Pass `before` (an ISO created_at) for the next older page (infinite scroll). */
export async function getMessages(
  conversationId: string,
  before?: string,
  limit = MESSAGE_PAGE,
): Promise<Message[]> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  if (error || !data) return []
  return (data as Message[]).slice().reverse()
}

/** Move my read cursor to now (powers unread state + the peer's read receipt). */
export async function markRead(conversationId: string, meId: string): Promise<void> {
  await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', meId)
}

export interface ConversationSummary {
  conversation: Conversation
  /** the other participant (DM); for groups this is null */
  otherUserId: string | null
  /** my read cursor for this conversation */
  myLastReadAt: string
  /** the peer's read cursor (DM) — for "Seen" receipts */
  peerLastReadAt: string | null
  /** unread = last activity newer than my read cursor (own sends self-mark read) */
  unread: boolean
}

interface MemberRow {
  conversation_id: string
  user_id: string
  last_read_at: string
}

/** Build a summary of every conversation I'm in (for friend-list badges +
 *  read receipts). One round-trip per table, joined client-side. */
export async function getConversationSummaries(meId: string): Promise<ConversationSummary[]> {
  const mine = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id, last_read_at')
    .eq('user_id', meId)
  const myRows = (mine.data as MemberRow[] | null) ?? []
  if (!myRows.length) return []
  const ids = myRows.map((r) => r.conversation_id)

  const [convosRes, othersRes] = await Promise.all([
    supabase.from('conversations').select('*').in('id', ids),
    supabase
      .from('conversation_members')
      .select('conversation_id, user_id, last_read_at')
      .in('conversation_id', ids)
      .neq('user_id', meId),
  ])
  const convos = (convosRes.data as Conversation[] | null) ?? []
  const others = (othersRes.data as MemberRow[] | null) ?? []
  const myByConvo = new Map(myRows.map((r) => [r.conversation_id, r]))
  const otherByConvo = new Map(others.map((r) => [r.conversation_id, r]))

  return convos.map((c) => {
    const my = myByConvo.get(c.id)
    const other = otherByConvo.get(c.id)
    return {
      conversation: c,
      otherUserId: c.kind === 'dm' ? other?.user_id ?? null : null,
      myLastReadAt: my?.last_read_at ?? c.created_at,
      peerLastReadAt: other?.last_read_at ?? null,
      unread: !!my && c.updated_at > my.last_read_at,
    }
  })
}
