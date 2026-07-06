// 🧛 Character & Cosmetic System for LavaPad
// Persist players' chosen characters, pad skins, and trail effects

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Character {
  id: string
  name: string
  description: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  previewColor: string
}

export interface PadSkin {
  id: string
  name: string
  description: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  color: string
}

export interface TrailEffect {
  id: string
  name: string
  description: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  color: string
}

// ─── DEFAULT DATA ──────────────────────────────────────────────────────────

export const DEFAULT_CHARACTERS: Character[] = [
  { id: 'avatar_hero', name: 'Hero', description: 'The brave adventurer', price: 0, rarity: 'common', unlocked: true, previewColor: '#ff6a20' },
  { id: 'avatar_robot', name: 'Robot', description: 'Built for survival', price: 200, rarity: 'rare', unlocked: false, previewColor: '#44aaff' },
  { id: 'avatar_ninja', name: 'Ninja', description: 'Silent and swift', price: 500, rarity: 'epic', unlocked: false, previewColor: '#222222' },
  { id: 'avatar_wizard', name: 'Wizard', description: 'Master of the arcane', price: 800, rarity: 'legendary', unlocked: false, previewColor: '#aa44ff' },
]

export const DEFAULT_PAD_SKINS: PadSkin[] = [
  { id: 'skin_stone', name: 'Stone', description: 'Classic stone texture', price: 0, rarity: 'common', unlocked: true, color: '#666666' },
  { id: 'skin_lava', name: 'Lava', description: 'Molten hot pads', price: 150, rarity: 'rare', unlocked: false, color: '#ff4400' },
  { id: 'skin_neon', name: 'Neon', description: 'Cyberpunk glow', price: 300, rarity: 'epic', unlocked: false, color: '#00ffaa' },
  { id: 'skin_gold', name: 'Gold', description: 'Pure luxury', price: 500, rarity: 'legendary', unlocked: false, color: '#ffcc00' },
]

export const DEFAULT_TRAILS: TrailEffect[] = [
  { id: 'trail_none', name: 'None', description: 'No trail', price: 0, rarity: 'common', unlocked: true, color: 'transparent' },
  { id: 'trail_fire', name: 'Fire', description: 'Burning trail', price: 200, rarity: 'rare', unlocked: false, color: '#ff4400' },
  { id: 'trail_electric', name: 'Electric', description: 'Sparking trail', price: 350, rarity: 'epic', unlocked: false, color: '#44aaff' },
  { id: 'trail_smoke', name: 'Smoke', description: 'Mysterious smoke', price: 400, rarity: 'epic', unlocked: false, color: '#888888' },
]

// ─── ZUSTAND STORE ─────────────────────────────────────────────────────────

interface CosmeticStore {
  selectedCharacter: string
  selectedPadSkin: string
  selectedTrail: string
  ownedCharacterslapCharacters: string[]
  ownedPadSkins: string[]
  ownedTrails: string[]

  // Actions
  selectCharacter: (id: string) => void
  selectPadSkin: (id: string) => void
  selectTrail: (id: string) => void
  unlockItem: (type: 'character' | 'padSkin' | 'trail', id: string) => void
  isOwned: (type: 'character' | 'padSkin' | 'trail', id: string) => boolean
}

export const useCosmeticStore = create<CosmeticStore>()(
  persist(
    (set, get) => ({
      selectedCharacter: 'avatar_hero',
      selectedPadSkin: 'skin_stone',
      selectedTrail: 'trail_none',
      ownedCharacters: ['avatar_hero'],
      ownedPadSkins: ['skin_stone'],
      ownedTrails: ['trail_none'],

      selectCharacter: (id) => set({ selectedCharacter: id }),
      selectPadSkin: (id) => set({ selectedPadSkin: id }),
      selectTrail: (id) => set({ selectedTrail: id }),

      unlockItem: (type, id) =>
        set((s) => {
          if (type === 'character') return { ownedCharacters: [...s.ownedCharacters, id] }
          if (type === 'padSkin') return { ownedPadSkins: [...s.ownedPadSkins, id] }
          return { ownedTrails: [...s.ownedTrails, id] }
        }),

      isOwned: (type, id) => {
        const s = get()
        if (type === 'character') return s.ownedCharacters.includes(id)
        if (type === 'padSkin') return s.ownedPadSkins.includes(id)
        return s.ownedTrails.includes(id)
      },
    }),
    {
      name: 'lavapad-cosmetics',
      version: 1,
    }
  )
)
