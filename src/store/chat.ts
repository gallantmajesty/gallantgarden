import { create } from 'zustand'
import {
  getOrCreateDm,
  sendMessage,
  getMessages,
  markRead,
  getConversationSummaries,
  MESSAGE_PAGE,
  type ConversationSummary,
} from '../lib/chat'
import type { Message, StudyStatus } from '../lib/types'
import { setStudyStatus } from '../lib/presence'
import { insforge } from '../lib/insforge'

// Chat runtime state for the library. v2 delivery is InsForge realtime:
//  • opening a DM subscribes to `chat:{conversationId}` and listens for
//    `chat_message` events pushed by other clients;
//  • sending a message persists to DB AND publishes to the channel so
//    the peer sees it instantly;
//  • a SLOW poll (8s) keeps `summaries` fresh (unread dots + read receipts);
//  • a fallback poll (3s) runs if realtime disconnects.
// `focusSilent` (driven by the focus timer) gates pop/sound, never storage.

const CHAT_CHANNEL_PREFIX = 'chat:'
const FALLBACK_POLL_MS = 4000

interface ChatState {
  meId: string | null
  summaries: ConversationSummary[]

  // open conversation
  activeConversationId: string | null
  activeFriendId: string | null
  messages: Message[]
  hasMore: boolean
  loadingOlder: boolean
  opening: boolean

  /** true while a focus session is active — suppress popups/sound, not storage. */
  focusSilent: boolean
  /** my own broadcast status (reactive mirror of presence.currentStatus). */
  myStatus: StudyStatus

  hydrate: (meId: string) => Promise<void>
  refreshSummaries: () => Promise<void>
  setFocusSilent: (v: boolean) => void
  /** set my status from the UI (persists via heartbeat + mirrors locally). */
  setMyStatus: (s: StudyStatus) => void
  /** mirror only (used by the focus→presence binding; persistence done there). */
  mirrorStatus: (s: StudyStatus) => void

  /** unread dot for a given friend (their DM has activity past my read cursor). */
  unreadWith: (friendId: string) => boolean
  /** peer's read cursor for the open DM (for "Seen"). */
  peerReadAt: () => string | null

  openDm: (friendId: string) => Promise<void>
  closeChat: () => void
  send: (body: string) => Promise<boolean>
  loadOlder: () => Promise<void>
  /** Fallback poll used when realtime is not connected. */
  pollActive: () => Promise<void>
  reset: () => void
}

// --- realtime subscription management ---

let activeChannel: string | null = null
let unsubscribeFn: (() => void) | null = null
let fallbackTimer: ReturnType<typeof setInterval> | null = null

function channelName(conversationId: string): string {
  return `${CHAT_CHANNEL_PREFIX}${conversationId}`
}

function subscribeToChat(conversationId: string, onMessage: (msg: Message) => void) {
  // Clean up any previous subscription
  leaveChat()

  const ch = channelName(conversationId)
  activeChannel = ch

  try {
    insforge.realtime.subscribe(ch)

    const handler = (payload: unknown, event?: string) => {
      if ((event ?? payload) === 'chat_message') {
        const msg = payload as Message
        // Ignore messages from self (we already appended optimistically)
        const meId = useChat.getState().meId
        if (msg.sender_id !== meId) {
          onMessage(msg)
        }
      }
    }

    insforge.realtime.on('*', handler)
    unsubscribeFn = () => {
      insforge.realtime.off('*', handler)
      try { insforge.realtime.unsubscribe(ch) } catch { /* ignore */ }
    }
  } catch {
    // Realtime not connected — fallback polling will handle delivery
    startFallbackPoll(conversationId)
  }
}

function leaveChat() {
  if (unsubscribeFn) {
    unsubscribeFn()
    unsubscribeFn = null
  }
  if (activeChannel) {
    try { insforge.realtime.unsubscribe(activeChannel) } catch { /* ignore */ }
    activeChannel = null
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

export const useChat = create<ChatState>((set, get) => ({
  meId: null,
  summaries: [],
  activeConversationId: null,
  activeFriendId: null,
  messages: [],
  hasMore: false,
  loadingOlder: false,
  opening: false,
  focusSilent: false,
  myStatus: 'available',

  hydrate: async (meId) => {
    set({ meId })
    await get().refreshSummaries()
  },

  refreshSummaries: async () => {
    const meId = get().meId
    if (!meId) return
    const summaries = await getConversationSummaries(meId)
    set({ summaries })
  },

  setFocusSilent: (v) => set({ focusSilent: v }),
  setMyStatus: (s) => {
    setStudyStatus(s)
    set({ myStatus: s })
  },
  mirrorStatus: (s) => set({ myStatus: s }),

  unreadWith: (friendId) =>
    get().summaries.some((s) => s.otherUserId === friendId && s.unread),

  peerReadAt: () => {
    const { activeConversationId, summaries } = get()
    return summaries.find((s) => s.conversation.id === activeConversationId)?.peerLastReadAt ?? null
  },

  openDm: async (friendId) => {
    const meId = get().meId
    if (!meId) return
    set({ opening: true, activeFriendId: friendId, messages: [], hasMore: false })
    const cid = await getOrCreateDm(friendId)
    if (!cid) {
      set({ opening: false, activeFriendId: null })
      return
    }
    const messages = await getMessages(cid)
    await markRead(cid, meId)
    set({
      activeConversationId: cid,
      messages,
      hasMore: messages.length >= MESSAGE_PAGE,
      opening: false,
    })
    void get().refreshSummaries()

    // Subscribe to realtime for this conversation
    subscribeToChat(cid, (msg) => {
      const state = get()
      if (state.activeConversationId !== cid) return
      // Append message if not already present
      if (!state.messages.some((m) => m.id === msg.id)) {
        set((s) => ({ messages: [...s.messages, msg] }))
        // Auto-mark as read
        void markRead(cid, meId)
        void get().refreshSummaries()
      }
    })
  },

  closeChat: () => {
    leaveChat()
    set({ activeConversationId: null, activeFriendId: null, messages: [], hasMore: false })
  },

  send: async (body) => {
    const { activeConversationId, meId } = get()
    const text = body.trim()
    if (!activeConversationId || !meId || !text) return false
    const msg = await sendMessage(activeConversationId, text)
    if (!msg) return false
    // Optimistic append (realtime will skip our own message)
    set((s) => ({ messages: [...s.messages, msg] }))

    // Publish to realtime channel so peers see it instantly
    if (activeChannel) {
      try {
        insforge.realtime.publish(activeChannel, 'chat_message', msg)
      } catch { /* realtime not connected — peer will get it via DB poll */ }
    }

    void get().refreshSummaries()
    return true
  },

  loadOlder: async () => {
    const { activeConversationId, messages, loadingOlder, hasMore } = get()
    if (!activeConversationId || loadingOlder || !hasMore || !messages.length) return
    set({ loadingOlder: true })
    const older = await getMessages(activeConversationId, messages[0].created_at)
    set((s) => ({
      messages: [...older, ...s.messages],
      hasMore: older.length >= MESSAGE_PAGE,
      loadingOlder: false,
    }))
  },

  pollActive: async () => {
    const { activeConversationId, meId, messages } = get()
    if (!activeConversationId || !meId) return
    // fetch the latest page and merge anything newer than what we have
    const latest = await getMessages(activeConversationId)
    const haveIds = new Set(messages.map((m) => m.id))
    const fresh = latest.filter((m) => !haveIds.has(m.id))
    if (fresh.length) {
      set((s) => ({ messages: [...s.messages, ...fresh.filter((m) => !s.messages.some((x) => x.id === m.id))] }))
      await markRead(activeConversationId, meId)
    }
    void get().refreshSummaries()
  },

  reset: () => {
    leaveChat()
    set({
      meId: null,
      summaries: [],
      activeConversationId: null,
      activeFriendId: null,
      messages: [],
      hasMore: false,
      loadingOlder: false,
      opening: false,
      focusSilent: false,
      myStatus: 'available',
    })
  },
}))
