import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Per-user *chat* preferences (separate from the global app/graphics settings).
// Persisted to localStorage so they survive reloads without a server round-trip.

export type ChatTheme = 'gold' | 'midnight' | 'aurora'
export type BubbleStyle = 'rounded' | 'compact' | 'bubbly'
export type ChatWallpaper = 'none' | 'forest' | 'dusk' | 'stars'

export interface ChatSettings {
  theme: ChatTheme
  bubbleStyle: BubbleStyle
  fontSize: number // 13–19 px
  enterToSend: boolean
  sound: boolean
  notifications: boolean
  showReadReceipts: boolean
  showTyping: boolean
  autoplayGif: boolean
  wallpaper: ChatWallpaper
  compactList: boolean
  set: (patch: Partial<ChatSettings>) => void
}

const DEFAULTS: Omit<ChatSettings, 'set'> = {
  theme: 'gold',
  bubbleStyle: 'rounded',
  fontSize: 15,
  enterToSend: true,
  sound: true,
  notifications: true,
  showReadReceipts: true,
  showTyping: true,
  autoplayGif: false,
  wallpaper: 'none',
  compactList: false,
}

export const useChatSettings = create<ChatSettings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
    }),
    { name: 'sf.chat.settings.v1' },
  ),
)

const BLIP = 'data:audio/wav;base64,UklGRl9vAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

/** Tiny outgoing-message blip. No asset file — synthesized via WebAudio. */
let ctx: AudioContext | null = null
export function playSendSound() {
  try {
    if (!useChatSettings.getState().sound) return
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 540
    g.gain.value = 0.04
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.08)
    o.stop(ctx.currentTime + 0.12)
  } catch {
    void BLIP
  }
}

/** Convenience selectors (avoid re-subscribing the whole settings object). */
export const useChatCompact = () => useChatSettings((s) => s.compactList)
export const useChatThemeName = () => useChatSettings((s) => s.theme)
