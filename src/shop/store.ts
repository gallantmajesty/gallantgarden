// Shop store — ownership tracking + purchase logic for all buyable items.
// Covers: marketplace catalog items, accessory catalog items, magnet themes.
// Persistence: localStorage (instant) + InsForge DB sync (debounced).

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useProfile } from '../store/profile'
import { STARTER_THEME_IDS } from '../lib/magnet/themes'

const STORAGE_KEY = 'sf.shop.inventory'
const FREE_PLAYER_ID = -1
// Common characters are always owned (free starter characters)
const STARTER_CHARACTER_IDS = ['james', 'claire', 'mia', 'ruslan']
// Free banners and logos are always owned
const STARTER_BANNER_IDS = ['default_banner', 'aurora', 'ember', 'forest', 'midnight', 'dawn', 'tide', 'mystic']
const STARTER_LOGO_IDS = ['default_logo']
const ALL_STARTERS = [...STARTER_THEME_IDS, ...STARTER_CHARACTER_IDS, ...STARTER_BANNER_IDS, ...STARTER_LOGO_IDS]

interface ShopState {
  userId: string | null
  /** IDs of all owned items (catalog items + accessories + themes) */
  ownedItems: string[]
  /** Whether hydration from DB has completed */
  ready: boolean

  /** Load owned items from localStorage, then sync from DB */
  hydrate: (userId: string) => void
  /** Check if a specific item is owned */
  isOwned: (itemId: string) => boolean
  /** Check if the user can afford an item (has enough leaves) */
  canAfford: (price: number, currentLeaves: number) => boolean
  /** Purchase an item — deducts leaves, adds to owned, persists */
  purchase: (itemId: string, price: number, currentLeaves: number) => number
  /** Batch-check ownership for multiple items */
  getOwned: (itemIds: string[]) => string[]
}

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...ALL_STARTERS]
    const parsed = JSON.parse(raw) as string[]
    // Always include starters
    return [...new Set([...ALL_STARTERS, ...parsed])]
  } catch {
    return [...ALL_STARTERS]
  }
}

function saveLocal(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch { /* ignore */ }
}

// Debounced DB sync
let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingItems: string[] = []

function syncToDb(userId: string, items: string[]) {
  pendingItems = items
  if (syncTimer) return
  syncTimer = setTimeout(async () => {
    syncTimer = null
    const toSave = pendingItems
    try {
      await supabase
        .from('profiles')
        .upsert([{ id: userId, inventory: toSave }], { onConflict: 'id' })
    } catch {
      /* offline / column missing — localStorage is still authoritative */
    }
  }, 3000)
}

export const useShop = create<ShopState>((set, get) => ({
  userId: null,
  ownedItems: [...ALL_STARTERS],
  ready: false,

  hydrate: (userId) => {
    if (get().userId === userId && get().ready) return
    const items = loadLocal()
    set({ userId, ownedItems: items, ready: true })

    // Async DB sync — merge DB inventory with local
    ;(async () => {
      try {
        const { data: row } = await supabase
          .from('profiles')
          .select('inventory')
          .eq('id', userId)
          .maybeSingle()
        if (row && Array.isArray((row as Record<string, unknown>).inventory)) {
          const dbItems = (row as Record<string, unknown>).inventory as string[]
          const merged = [...new Set([...ALL_STARTERS, ...items, ...dbItems])]
          set({ ownedItems: merged })
          saveLocal(merged)
        }
      } catch {
        /* offline — localStorage is fine */
      }
    })()
  },

  isOwned: (itemId) => get().ownedItems.includes(itemId),

  canAfford: (price, currentLeaves) => {
    const playerId = useProfile.getState().playerId
    if (playerId === FREE_PLAYER_ID) return true
    return currentLeaves >= price
  },

  purchase: (itemId, price, currentLeaves) => {
    const playerId = useProfile.getState().playerId
    if (playerId === FREE_PLAYER_ID) {
      if (get().isOwned(itemId)) return currentLeaves
      const newOwned = [...get().ownedItems, itemId]
      set({ ownedItems: newOwned })
      saveLocal(newOwned)
      const userId = get().userId
      if (userId) syncToDb(userId, newOwned)
      return currentLeaves
    }
    if (!get().canAfford(price, currentLeaves)) return currentLeaves
    if (get().isOwned(itemId)) return currentLeaves

    const newLeaves = currentLeaves - price
    const newOwned = [...get().ownedItems, itemId]
    set({ ownedItems: newOwned })
    saveLocal(newOwned)

    const uid = get().userId
    if (uid) syncToDb(uid, newOwned)

    return newLeaves
  },

  getOwned: (itemIds) => {
    const owned = get().ownedItems
    return itemIds.filter((id) => owned.includes(id))
  },
}))
