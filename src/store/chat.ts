import { create } from 'zustand'
import {
  getOrCreateDm,
  sendMessage,
  sendRichMessage,
  getMessages,
  getMessagesWithReactions,
  markRead,
  getConversationSummaries,
  getConversationSummariesV2,
  setReaction as apiSetReaction,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  setTyping as apiSetTyping,
  getTyping as apiGetTyping,
  groupReactions,
  MESSAGE_PAGE,
  type ConversationSummary,
} from '../lib/chat'
import {
  createGroup,
  joinGroupByCode,
  getGroupMembers,
  groupLeave,
  type CreateGroupInput,
} from '../lib/groups'
import { uploadChatImage } from '../lib/chatMedia'
import type { Message, MessageKind, MessageMeta, MessageReaction, ReactionGroup, GroupMember, GroupRole } from '../lib/types'
import { setStudyStatus } from '../lib/presence'
import { supabase } from '../lib/supabase'
import { playIncomingSound } from '../features/social/chatSettings'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Chat runtime state for the social hub. v3 adds group chat, rich messages
// (images / stickers / link previews), emoji reactions, typing indicators,
// replies, edit/delete, and a richer conversation list — while keeping the
// public surface the rest of the app already uses (openDm / send / summaries).

const FALLBACK_POLL_MS = 4000
const TYPING_POLL_MS = 3000

interface ChatState {
  meId: string | null
  summaries: ConversationSummary[]

  activeConversationId: string | null // DM conversation id (friend-scoped)
  activeFriendId: string | null
  activeGroupId: string | null // group conversation id
  messages: Message[]
  hasMore: boolean
  loadingOlder: boolean
  opening: boolean

  typing: string[] // user ids currently typing (excludes me)
  reactions: Record<string, ReactionGroup[]> // messageId -> groups
  groupMembers: GroupMember[] // roster of the open group

  /** group member display names by conversation (cached when a group opens,
   *  so headers/lists can show the last sender's name without a refetch). */
  memberNames: Record<string, Record<string, string>>
  /** conversationId -> other users who have seen the latest message (read receipts). */
  seenBy: Record<string, string[]>
  markSeen: (conversationId: string) => void

  /** per-group customizations (name / logo / color), persisted locally so a
   *  group keeps its look even before the server supports metadata. */
  groupCustom: Record<string, { name?: string; logo?: string; color?: string }>
  customizeGroup: (conversationId: string, patch: { name?: string; logo?: string; color?: string }) => void

  focusSilent: boolean
  myStatus: import('../lib/types').StudyStatus

  hydrate: (meId: string) => Promise<void>
  refreshSummaries: () => Promise<void>
  setFocusSilent: (v: boolean) => void
  setMyStatus: (s: import('../lib/types').StudyStatus) => void
  mirrorStatus: (s: import('../lib/types').StudyStatus) => void

  unreadWith: (friendId: string) => boolean
  peerReadAt: () => string | null
  totalUnread: () => number

  openDm: (friendId: string) => Promise<void>
  closeChat: () => void
  send: (body: string, opts?: SendOpts) => Promise<boolean>
  sendImage: (file: File) => Promise<boolean>
  loadOlder: () => Promise<void>
  pollActive: () => Promise<void>
  reset: () => void

  // groups
  openGroup: (conversationId: string) => Promise<void>
  createNewGroup: (input: CreateGroupInput) => Promise<string | null>
  joinByCode: (code: string) => Promise<string | null>
  leaveGroup: (conversationId: string) => Promise<void>
  refreshGroupMembers: () => Promise<void>

  // reactions / typing / edit
  toggleReaction: (messageId: string, emoji: string) => Promise<void>
  refreshReactions: () => Promise<void>
  beatTyping: () => void
  pollTyping: () => Promise<void>
  editMine: (messageId: string, body: string) => Promise<void>
  deleteMine: (messageId: string) => Promise<void>

  activeId: () => string | null
}

interface SendOpts {
  kind?: MessageKind
  attachmentUrl?: string | null
  meta?: MessageMeta | null
  replyTo?: string | null
}

let activeChannelObj: RealtimeChannel | null = null
let fallbackTimer: ReturnType<typeof setInterval> | null = null
let typingTimer: ReturnType<typeof setInterval> | null = null
let typingBeat: ReturnType<typeof setInterval> | null = null

function subscribeToChat(conversationId: string, onMessage: (msg: Message) => void) {
  leaveChat()
  try {
    activeChannelObj = supabase.channel(`chat:${conversationId}`)
    activeChannelObj
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        const msg = payload.payload as Message
        const meId = useChat.getState().meId
        if (msg.sender_id !== meId) {
          playIncomingSound()
          onMessage(msg)
        }
      })
      .subscribe()
  } catch {
    startFallbackPoll(conversationId)
  }
}

function leaveChat() {
  if (activeChannelObj) {
    try {
      supabase.removeChannel(activeChannelObj)
    } catch {
      /* ignore */
    }
    activeChannelObj = null
  }
  stopFallbackPoll()
}

function startFallbackPoll(_conversationId: string) {
  stopFallbackPoll()
  fallbackTimer = setInterval(() => {
    void useChat.getState().pollActive()
  }, FALLBACK_POLL_MS)
}

function stopFallbackPoll() {
  if (fallbackTimer) {
    clearInterval(fallbackTimer)
    fallbackTimer = null
  }
}

const GROUP_CUSTOM_KEY = 'fl-group-custom'

type GroupCustomMap = Record<string, { name?: string; logo?: string; color?: string }>

function loadGroupCustom(): GroupCustomMap {
  try {
    const raw = localStorage.getItem(GROUP_CUSTOM_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as GroupCustomMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveGroupCustom(map: GroupCustomMap) {
  try {
    localStorage.setItem(GROUP_CUSTOM_KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable — customization stays session-only */
  }
}

function attachReactions(msgs: Message[], meId: string | null): Record<string, ReactionGroup[]> {
  const out: Record<string, ReactionGroup[]> = {}
  for (const m of msgs) {
    const rs = (m.reactions as MessageReaction[] | undefined) ?? []
    if (rs.length) out[m.id] = groupReactions(rs, meId)
  }
  return out
}

export const useChat = create<ChatState>((set, get) => ({
  meId: null,
  summaries: [],
  activeConversationId: null,
  activeFriendId: null,
  activeGroupId: null,
  messages: [],
  hasMore: false,
  loadingOlder: false,
  opening: false,
  typing: [],
  reactions: {},
  groupMembers: [],
  memberNames: {},
  seenBy: {},
  groupCustom: loadGroupCustom(),
  focusSilent: false,
  myStatus: 'available',

  hydrate: async (meId) => {
    set({ meId })
    await get().refreshSummaries()
  },

  refreshSummaries: async () => {
    const meId = get().meId
    if (!meId) return
    // Prefer the richer v2 summary (includes groups + last message). Fall back
    // to the legacy v1 builder if the migration hasn't been applied.
    let summaries = await getConversationSummariesV2(meId).catch(() => [])
    if (!summaries.length) summaries = await getConversationSummaries(meId)
    set({ summaries })
  },

  setFocusSilent: (v) => set({ focusSilent: v }),
  setMyStatus: (s) => {
    setStudyStatus(s)
    set({ myStatus: s })
  },
  mirrorStatus: (s) => set({ myStatus: s }),

  unreadWith: (friendId) => get().summaries.some((s) => s.otherUserId === friendId && s.unread),
  peerReadAt: () => {
    const { activeConversationId, summaries } = get()
    return summaries.find((s) => s.conversation.id === activeConversationId)?.peerLastReadAt ?? null
  },
  totalUnread: () => get().summaries.reduce((n, s) => n + (s.unreadCount || (s.unread ? 1 : 0)), 0),

  activeId: () => get().activeGroupId ?? get().activeConversationId,

  openDm: async (friendId) => {
    const meId = get().meId
    if (!meId) return
    set({ opening: true, activeGroupId: null, activeFriendId: friendId, messages: [], hasMore: false, reactions: {}, typing: [] })
    const cid = await getOrCreateDm(friendId)
    if (!cid) {
      set({ opening: false, activeFriendId: null })
      return
    }
    const messages = await getMessagesWithReactions(cid)
    await markRead(cid, meId)
    set({
      activeConversationId: cid,
      messages,
      reactions: attachReactions(messages, meId),
      hasMore: messages.length >= MESSAGE_PAGE,
      opening: false,
    })
    void get().refreshSummaries()
    startTypingPoll()
    subscribeToChat(cid, (msg) => {
      const state = get()
      if (state.activeConversationId !== cid) return
      if (!state.messages.some((m) => m.id === msg.id)) {
        set((s) => ({ messages: [...s.messages, msg] }))
        void markRead(cid, meId)
        void get().refreshSummaries()
      }
    })
  },

  openGroup: async (conversationId) => {
    const meId = get().meId
    if (!meId) return
    set({ opening: true, activeConversationId: null, activeFriendId: null, activeGroupId: conversationId, messages: [], hasMore: false, reactions: {}, typing: [], groupMembers: [] })
    const messages = await getMessagesWithReactions(conversationId)
    await markRead(conversationId, meId)
    const members = await getGroupMembers(conversationId)
    const names: Record<string, string> = {}
    for (const m of members) if (m.profile?.display_name) names[m.user_id] = m.profile.display_name
    set({
      messages,
      reactions: attachReactions(messages, meId),
      hasMore: messages.length >= MESSAGE_PAGE,
      opening: false,
      groupMembers: members,
      memberNames: { ...get().memberNames, [conversationId]: names },
    })
    get().markSeen(conversationId)
    void get().refreshSummaries()
    startTypingPoll()
    subscribeToChat(conversationId, (msg) => {
      const state = get()
      if (state.activeGroupId !== conversationId) return
      if (!state.messages.some((m) => m.id === msg.id)) {
        set((s) => ({ messages: [...s.messages, msg] }))
        void markRead(conversationId, meId)
        get().markSeen(conversationId)
        void get().refreshSummaries()
      }
    })
  },

  closeChat: () => {
    leaveChat()
    stopTypingPoll()
    set({ activeConversationId: null, activeFriendId: null, activeGroupId: null, messages: [], hasMore: false, reactions: {}, typing: [], groupMembers: [] })
  },

  createNewGroup: async (input) => {
    const conv = await createGroup(input)
    if (!conv) return null
    await get().refreshSummaries()
    return conv.id
  },

  joinByCode: async (code) => {
    const conv = await joinGroupByCode(code)
    if (!conv) return null
    await get().refreshSummaries()
    return conv.id
  },

  leaveGroup: async (conversationId) => {
    await groupLeave(conversationId)
    if (get().activeGroupId === conversationId) get().closeChat()
    await get().refreshSummaries()
  },

  refreshGroupMembers: async () => {
    const id = get().activeGroupId
    if (!id) return
    set({ groupMembers: await getGroupMembers(id) })
  },

  customizeGroup: (conversationId, patch) => {
    const next = { ...get().groupCustom, [conversationId]: { ...get().groupCustom[conversationId], ...patch } }
    if (!next[conversationId].name && !next[conversationId].logo && !next[conversationId].color) delete next[conversationId]
    saveGroupCustom(next)
    set({ groupCustom: next })
  },

  markSeen: (conversationId) => {
    const meId = get().meId
    if (!meId) return
    const cur = get().seenBy[conversationId] ?? []
    if (cur.includes(meId)) return
    set({ seenBy: { ...get().seenBy, [conversationId]: [...cur, meId] } })
  },


  send: async (body, opts) => {
    const { activeId, meId } = get()
    const active = activeId()
    const text = (body ?? '').trim()
    const kind = opts?.kind ?? 'text'
    if (!active || !meId) return false
    if (kind === 'text' && !text) return false

    const tempId = `tmp-${crypto.randomUUID()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: active,
      sender_id: meId,
      body: text,
      kind,
      attachment_url: opts?.attachmentUrl ?? null,
      meta: opts?.meta ?? null,
      reply_to: opts?.replyTo ?? null,
      created_at: new Date().toISOString(),
      pending: true,
    }
    set((s) => ({ messages: [...s.messages, optimistic] }))

    const msg = await sendRichMessage(active, text, kind, opts?.attachmentUrl ?? null, opts?.meta ?? null, opts?.replyTo ?? null)
    // Fall back to legacy text send for pre-migration databases.
    const finalMsg = msg ?? (kind === 'text' ? await sendMessage(active, text) : null)
    if (!finalMsg) {
      set((s) => ({ messages: s.messages.map((m) => (m.id === tempId ? { ...m, failed: true } : m)) }))
      return false
    }
    set((s) => ({
      messages: s.messages.map((m) => (m.id === tempId ? finalMsg : m)),
      reactions: { ...s.reactions, [finalMsg.id]: s.reactions[tempId] ?? [] },
    }))
    delete (get().reactions as Record<string, unknown>)[tempId]

    if (activeChannelObj) {
      try {
        await activeChannelObj.send({ type: 'broadcast', event: 'chat_message', payload: finalMsg })
      } catch {
        /* peer gets it via poll */
      }
    }
    void get().refreshSummaries()
    return true
  },

  sendImage: async (file) => {
    const uploaded = await uploadChatImage(file)
    if (!uploaded) return false
    return get().send('', {
      kind: 'image',
      attachmentUrl: uploaded.url,
      meta: { w: uploaded.width, h: uploaded.height, name: file.name, size: file.size },
    })
  },

  loadOlder: async () => {
    const { activeGroupId, activeConversationId, messages, loadingOlder, hasMore } = get()
    const id = activeGroupId ?? activeConversationId
    if (!id || loadingOlder || !hasMore || !messages.length) return
    set({ loadingOlder: true })
    const older = await getMessagesWithReactions(id, messages[0].created_at)
    set((s) => ({
      messages: [...older, ...s.messages],
      reactions: { ...s.reactions, ...attachReactions(older, s.meId) },
      hasMore: older.length >= MESSAGE_PAGE,
      loadingOlder: false,
    }))
  },

  pollActive: async () => {
    const { activeGroupId, activeConversationId, meId, messages } = get()
    const id = activeGroupId ?? activeConversationId
    if (!id || !meId) return
    const latest = await getMessagesWithReactions(id)
    const haveIds = new Set(messages.map((m) => m.id))
    const fresh = latest.filter((m) => !haveIds.has(m.id))
    if (fresh.length) {
      set((s) => ({
        messages: [...s.messages, ...fresh.filter((m) => !s.messages.some((x) => x.id === m.id))],
        reactions: { ...s.reactions, ...attachReactions(fresh, meId) },
      }))
      await markRead(id, meId)
      if (fresh.some((m) => m.sender_id !== meId)) playIncomingSound()
    }
    await get().refreshReactions()
    void get().refreshSummaries()
  },

  toggleReaction: async (messageId, emoji) => {
    const meId = get().meId
    const current = get().reactions[messageId] ?? []
    const mine = current.find((g) => g.emoji === emoji)?.mine
    // optimistic flip
    const next = mine
      ? current.map((g) => (g.emoji === emoji ? { ...g, users: g.users.filter((u) => u !== meId), mine: false } : g)).filter((g) => g.users.length)
      : [...current.filter((g) => g.emoji !== emoji), { emoji, users: [...(current.find((g) => g.emoji === emoji)?.users ?? []), meId as string], mine: true }]
    set((s) => ({ reactions: { ...s.reactions, [messageId]: next } }))
    await apiSetReaction(messageId, emoji)
  },

  refreshReactions: async () => {
    const { messages, meId } = get()
    if (!messages.length) return
    const ids = messages.map((m) => m.id)
    const { data } = await supabase.from('message_reactions').select('*').in('message_id', ids.slice(0, 200))
    const all = (data as MessageReaction[] | null) ?? []
    const byMsg = new Map<string, MessageReaction[]>()
    for (const r of all) {
      const list = byMsg.get(r.message_id) ?? []
      list.push(r)
      byMsg.set(r.message_id, list)
    }
    const merged: Record<string, ReactionGroup[]> = {}
    for (const [mid, rs] of byMsg) merged[mid] = groupReactions(rs, meId)
    set((s) => ({ reactions: { ...s.reactions, ...merged } }))
  },

  beatTyping: () => {
    const id = get().activeId()
    if (id) void apiSetTyping(id)
  },

  pollTyping: async () => {
    const id = get().activeId()
    const meId = get().meId
    if (!id || !meId) return
    const ids = await apiGetTyping(id, meId)
    set({ typing: ids })
  },

  editMine: async (messageId, body) => {
    const updated = await apiEditMessage(messageId, body)
    if (updated) set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, body: updated.body, edited_at: updated.edited_at ?? new Date().toISOString() } : m)) }))
  },

  deleteMine: async (messageId) => {
    const ok = await apiDeleteMessage(messageId)
    if (ok) {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, body: '', kind: 'system', deleted_at: new Date().toISOString(), attachment_url: null, meta: null } : m,
        ),
      }))
      const rest = { ...get().reactions }
      delete rest[messageId]
      set({ reactions: rest })
    }
  },

  reset: () => {
    leaveChat()
    stopTypingPoll()
    set({
      meId: null,
      summaries: [],
      activeConversationId: null,
      activeFriendId: null,
      activeGroupId: null,
      messages: [],
      hasMore: false,
      loadingOlder: false,
      opening: false,
      typing: [],
      reactions: {},
      groupMembers: [],
      memberNames: {},
      seenBy: {},
      focusSilent: false,
      myStatus: 'available',
    })
  },
}))

function startTypingPoll() {
  stopTypingPoll()
  typingTimer = setInterval(() => void useChat.getState().pollTyping(), TYPING_POLL_MS)
}
function stopTypingPoll() {
  if (typingTimer) {
    clearInterval(typingTimer)
    typingTimer = null
  }
  if (typingBeat) {
    clearInterval(typingBeat)
    typingBeat = null
  }
}

/** Start emitting "typing" heartbeats while the composer has text. */
export function startTypingBeat() {
  if (typingBeat) return
  typingBeat = setInterval(() => useChat.getState().beatTyping(), 2500)
}
