import { create } from 'zustand'

export type SocialTab = 'chats' | 'explore' | 'groups'
/** Right-hand pane inside a conversation thread. */
export type ChatPanel = 'none' | 'settings' | 'members' | 'customize'

interface SocialOverlayState {
  /** Whether the social hub is visible at all (launcher hidden when false). */
  open: boolean
  /** Full-screen "Explore" mode vs the docked mini panel. */
  fullscreen: boolean
  /** Active tab inside the full-screen Explore view. */
  tab: SocialTab
  /** A conversation pre-selected for the chat view (DM friend id). */
  activeConversationId: string | null
  /** An open group conversation id (groups tab). */
  activeGroupId: string | null
  /** Side panel inside a thread. */
  panel: ChatPanel

  openHub: (opts?: { fullscreen?: boolean; tab?: SocialTab }) => void
  close: () => void
  setFullscreen: (v: boolean) => void
  setTab: (t: SocialTab) => void
  openConversation: (friendId: string, fullscreen?: boolean) => void
  clearConversation: () => void
  openGroup: (conversationId: string, fullscreen?: boolean) => void
  clearGroup: () => void
  setPanel: (p: ChatPanel) => void
}

/**
 * Single source of truth for the social hub surface. `open` gates rendering and
 * is also read by the 3D scenes (LibraryScene / TrainStationScene) so they can
 * pause the render loop while the hub is up — matching the "stop background
 * rendering" requirement.
 */
export const useSocialOverlay = create<SocialOverlayState>((set, get) => ({
  open: false,
  fullscreen: false,
  tab: 'chats',
  activeConversationId: null,
  activeGroupId: null,
  panel: 'none',

  openHub: (opts) =>
    set((s) => ({
      open: true,
      fullscreen: opts?.fullscreen ?? s.fullscreen,
      tab: opts?.tab ?? s.tab,
    })),

  close: () => set({ open: false, fullscreen: false, activeConversationId: null, activeGroupId: null, panel: 'none' }),

  setFullscreen: (v) => set({ fullscreen: v }),
  setTab: (t) => set({ tab: t }),

  openConversation: (friendId, fullscreen = true) =>
    set({ open: true, fullscreen, tab: 'chats', activeConversationId: friendId, activeGroupId: null, panel: 'none' }),

  clearConversation: () => set({ activeConversationId: null }),

  openGroup: (conversationId, fullscreen = true) =>
    set({ open: true, fullscreen, tab: 'groups', activeGroupId: conversationId, activeConversationId: null, panel: 'none' }),

  clearGroup: () => set({ activeGroupId: null }),

  setPanel: (p) => set({ panel: p }),
}))
