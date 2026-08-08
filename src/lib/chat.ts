import { supabase } from './supabase'
import { allow, RATE_LIMITS } from './rateLimit'
import type { Conversation, Message, MessageKind, MessageMeta, MessageReaction, ReactionGroup } from './types'

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

/** Max characters for a *text* message body (images/links may be empty body). */
export const MESSAGE_MAX = 2000

/** Send a message. Returns the persisted row, or null if rejected (not friends,
 *  blocked, empty, over the rate limit). Body is capped at 500 chars here and
 *  by a DB CHECK; server-side send_message_limited caps 30/min. */
export async function sendMessage(conversationId: string, body: string): Promise<Message | null> {
  const trimmed = body.trim().slice(0, MESSAGE_MAX)
  if (!trimmed) return null
  if (!allow('message', RATE_LIMITS.message)) return null
  const { data, error } = await supabase.rpc('send_message_limited', {
    p_conversation: conversationId,
    p_content: trimmed,
  })
  if (error || !data) return null
  // rpc returns the inserted row (object) or an array with one row
  const row = Array.isArray(data) ? data[0] : data
  return (row as Message) ?? null
}

/** Send a rich message (image / sticker / link / reply). Falls back to a plain
 *  text send when the chat-upgrade migration hasn't been applied yet. */
export async function sendRichMessage(
  conversationId: string,
  body: string,
  kind: MessageKind = 'text',
  attachmentUrl?: string | null,
  meta?: MessageMeta | null,
  replyTo?: string | null,
): Promise<Message | null> {
  if (!allow('message', RATE_LIMITS.message)) return null
  const cleanBody = (body ?? '').slice(0, MESSAGE_MAX)
  if (kind === 'text' && !cleanBody.trim()) return null
  const { data, error } = await supabase.rpc('send_message_rich', {
    p_conversation: conversationId,
    p_kind: kind,
    p_body: cleanBody,
    p_attachment: attachmentUrl ?? null,
    p_meta: meta ?? null,
    p_reply_to: replyTo ?? null,
  })
  if (!error && data) {
    const row = Array.isArray(data) ? data[0] : data
    return (row as Message) ?? null
  }
  // Fallback: legacy text-only path (image/link payloads are dropped).
  if (kind === 'text') return sendMessage(conversationId, cleanBody)
  return null
}

/** Toggle an emoji reaction on a message (idempotent — adds or removes). */
export async function setReaction(messageId: string, emoji: string): Promise<boolean> {
  const { error } = await supabase.rpc('toggle_reaction', { p_message: messageId, p_emoji: emoji })
  return !error
}

/** Edit one of my own messages (keeps it on the server, sets edited_at). */
export async function editMessage(messageId: string, body: string): Promise<Message | null> {
  const { data, error } = await supabase.rpc('edit_message', {
    p_message: messageId,
    p_body: body.slice(0, MESSAGE_MAX),
  })
  if (error || !data) return null
  const row = Array.isArray(data) ? data[0] : data
  return (row as Message) ?? null
}

/** Soft-delete one of my own messages. */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase.rpc('delete_message', { p_message: messageId })
  return !error
}

/** Mark myself as typing in a conversation (ephemeral, auto-expires). */
export async function setTyping(conversationId: string): Promise<void> {
  await supabase.from('conversation_typing').upsert(
    { conversation_id: conversationId, user_id: (await supabase.auth.getUser()).data.user?.id ?? '', updated_at: new Date().toISOString() },
    { onConflict: 'conversation_id,user_id' },
  )
}

/** Who (besides me) is currently typing in a conversation. */
export async function getTyping(conversationId: string, meId: string): Promise<string[]> {
  const { data } = await supabase
    .from('conversation_typing')
    .select('user_id, updated_at')
    .eq('conversation_id', conversationId)
    .neq('user_id', meId)
  if (!data) return []
  const cutoff = Date.now() - 6000
  return (data as { user_id: string; updated_at: string }[])
    .filter((r) => new Date(r.updated_at).getTime() > cutoff)
    .map((r) => r.user_id)
}

/** Build reaction groups (emoji → users) for rendering. */
export function groupReactions(reactions: MessageReaction[], meId: string | null): ReactionGroup[] {
  const by = new Map<string, string[]>()
  for (const r of reactions) {
    const list = by.get(r.emoji) ?? []
    list.push(r.user_id)
    by.set(r.emoji, list)
  }
  return [...by.entries()]
    .map(([emoji, users]) => ({ emoji, users, mine: meId ? users.includes(meId) : false }))
    .sort((a, b) => b.users.length - a.users.length)
}

/** Fetch a page of messages with their reactions merged in. */
export async function getMessagesWithReactions(
  conversationId: string,
  before?: string,
  limit = MESSAGE_PAGE,
): Promise<Message[]> {
  const msgs = await getMessages(conversationId, before, limit)
  const ids = msgs.map((m) => m.id)
  if (!ids.length) return msgs
  const { data } = await supabase.from('message_reactions').select('*').in('message_id', ids)
  const reactions = (data as MessageReaction[] | null) ?? []
  return msgs.map((m) => ({ ...m, reactions: reactions.filter((r) => r.message_id === m.id) }))
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
  /** ---- v2 summary fields (present when using getConversationSummariesV2) ---- */
  kind: 'dm' | 'group'
  title: string | null
  joinCode: string | null
  memberCount: number
  lastActivity: string
  unreadCount: number
  lastMessage: {
    id: string
    senderId: string
    body: string
    kind: MessageKind
    attachmentUrl: string | null
  } | null
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
      kind: c.kind,
      title: c.title,
      joinCode: c.join_code ?? null,
      memberCount: c.kind === 'group' ? myRows.filter((r) => r.conversation_id === c.id).length + (others.filter((r) => r.conversation_id === c.id).length) : 2,
      lastActivity: c.updated_at,
      unreadCount: 0,
      lastMessage: null,
    }
  })
}

/** Richer summary builder backed by the get_conversation_summaries_v2 RPC.
 *  Returns DM *and* group conversations, the last message, and unread counts. */
export async function getConversationSummariesV2(meId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('get_conversation_summaries_v2')
  if (error || !data) return []
  return (data as Array<Record<string, unknown>>).map((r) => {
    const c: Conversation = {
      id: r.conversation_id as string,
      kind: (r.kind as 'dm' | 'group') ?? 'dm',
      title: (r.title as string | null) ?? null,
      icon_url: (r.icon_url as string | null) ?? null,
      created_by: meId,
      dm_key: null,
      created_at: r.last_activity as string,
      updated_at: r.last_activity as string,
      join_code: (r.join_code as string | null) ?? null,
      description: null,
      member_limit: undefined,
    }
    const hasLast = r.last_message_id != null
    return {
      conversation: c,
      otherUserId: (r.other_user_id as string | null) ?? null,
      myLastReadAt: (r.my_last_read_at as string) ?? (r.last_activity as string),
      peerLastReadAt: null,
      unread: (r.unread_count as number) > 0,
      kind: c.kind,
      title: c.title,
      joinCode: c.join_code ?? null,
      memberCount: (r.member_count as number) ?? 1,
      lastActivity: (r.last_activity as string) ?? new Date().toISOString(),
      unreadCount: (r.unread_count as number) ?? 0,
      lastMessage: hasLast
        ? {
            id: r.last_message_id as string,
            senderId: r.last_sender_id as string,
            body: (r.last_body as string) ?? '',
            kind: (r.last_kind as MessageKind) ?? 'text',
            attachmentUrl: (r.last_attachment as string | null) ?? null,
          }
        : null,
    }
  })
}
