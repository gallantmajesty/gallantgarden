import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ClockType = 
  | 'analog'
  | 'digital'
  | 'sand'
  | 'magical-rune'
  | 'crystal'
  | 'moon-phase'
  | 'steampunk'
  | 'ethereal'

export interface ClockSettings {
  activeClock: ClockType
  clockColor: string
  showSeconds: boolean
  animationSpeed: number
  particleDensity: number
  unlockedClocks: ClockType[]
}

interface ClockStore extends ClockSettings {
  setActiveClock: (clock: ClockType) => void
  setClockColor: (color: string) => void
  setShowSeconds: (show: boolean) => void
  setAnimationSpeed: (speed: number) => void
  setParticleDensity: (density: number) => void
  unlockClock: (clock: ClockType) => void
  isClockUnlocked: (clock: ClockType) => boolean
  spendLeaves: (amount: number) => boolean
  leaves: number
}

const DEFAULT_CLOCK_SETTINGS: ClockSettings = {
  activeClock: 'analog',
  clockColor: '#c9b896',
  showSeconds: true,
  animationSpeed: 1,
  particleDensity: 1,
  unlockedClocks: ['analog', 'digital', 'sand', 'magical-rune'],
}

export const useClockStore = create<ClockStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CLOCK_SETTINGS,
      leaves: 0,

      setActiveClock: (clock) => {
        if (get().isClockUnlocked(clock)) {
          set({ activeClock: clock })
        }
      },

      setClockColor: (color) => set({ clockColor: color }),

      setShowSeconds: (show) => set({ showSeconds: show }),

      setAnimationSpeed: (speed) => set({ animationSpeed: Math.max(0.1, Math.min(3, speed)) }),

      setParticleDensity: (density) => set({ particleDensity: Math.max(0, Math.min(2, density)) }),

      unlockClock: (clock) => set((state) => ({
        unlockedClocks: [...new Set([...state.unlockedClocks, clock])],
      })),

      isClockUnlocked: (clock) => get().unlockedClocks.includes(clock),

      spendLeaves: (amount) => {
        const state = get()
        if (state.leaves >= amount) {
          set({ leaves: state.leaves - amount })
          return true
        }
        return false
      },
    }),
    {
      name: 'focuslily-clock-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)

export interface ClockTheme {
  id: ClockType
  name: string
  previewIcon: string
  rarity: string
  price: number
}

export const CLOCK_THEMES: ClockTheme[] = [
  { id: 'analog', name: 'Classic Analog', previewIcon: '🕐', rarity: 'Common', price: 0 },
  { id: 'digital', name: 'Digital', previewIcon: '🔢', rarity: 'Common', price: 0 },
  { id: 'sand', name: 'Hourglass', previewIcon: '⏳', rarity: 'Common', price: 0 },
  { id: 'magical-rune', name: 'Magical Rune', previewIcon: '🔮', rarity: 'Common', price: 0 },
  { id: 'crystal', name: 'Crystal', previewIcon: '💎', rarity: 'Rare', price: 150 },
  { id: 'moon-phase', name: 'Moon Phase', previewIcon: '🌙', rarity: 'Rare', price: 200 },
  { id: 'steampunk', name: 'Steampunk', previewIcon: '⚙️', rarity: 'Epic', price: 300 },
  { id: 'ethereal', name: 'Ethereal', previewIcon: '✨', rarity: 'Legendary', price: 500 },
]

export function addLeaves(amount: number) {
  useClockStore.setState((state) => ({ leaves: state.leaves + amount }))
}