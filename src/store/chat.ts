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

// Chat runtime state for the library. v1 delivery is persist-and-poll:
//  • a SLOW poll keeps `summaries` fresh (unread dots + read receipts) while the
//    friends panel is open;
//  • a FAST poll refreshes the OPEN conversation's messages.
// `focusSilent` (driven by the focus timer) gates pop/sound, never storage —
// messages always land in the DB and render when the panel is opened. Swapping
// in realtime later means replacing the two poll calls with channel handlers.

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
  pollActive: () => Promise<void>
  reset: () => void
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
  },

  closeChat: () =>
    set({ activeConversationId: null, activeFriendId: null, messages: [], hasMore: false }),

  send: async (body) => {
    const { activeConversationId, meId } = get()
    const text = body.trim()
    if (!activeConversationId || !meId || !text) return false
    const msg = await sendMessage(activeConversationId, text)
    if (!msg) return false
    set((s) => ({ messages: [...s.messages, msg] }))
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

  reset: () =>
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
    }),
}))
