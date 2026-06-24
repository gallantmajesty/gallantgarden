import { create } from 'zustand'

// Local persistence for the Calculator Hub: favorites, recently-used and a
// usage-count map that powers "Most popular". All stored in localStorage so the
// user's pinned tools and history survive refreshes without any backend.

const FAV_KEY = 'calc.favorites.v1'
const RECENT_KEY = 'calc.recents.v1'
const USAGE_KEY = 'calc.usage.v1'
const RECENT_MAX = 12

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

interface CalcPrefsState {
  favorites: string[]
  recents: string[]
  usage: Record<string, number>
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
  /** Record that a calculator was opened — updates recents + usage counts. */
  markUsed: (id: string) => void
  /** Ids sorted by usage count, highest first. */
  popularIds: () => string[]
}

export const useCalcPrefs = create<CalcPrefsState>((set, get) => ({
  favorites: load<string[]>(FAV_KEY, []),
  recents: load<string[]>(RECENT_KEY, []),
  usage: load<Record<string, number>>(USAGE_KEY, {}),

  isFavorite: (id) => get().favorites.includes(id),

  toggleFavorite: (id) => {
    const cur = get().favorites
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]
    save(FAV_KEY, next)
    set({ favorites: next })
  },

  markUsed: (id) => {
    const recents = [id, ...get().recents.filter((x) => x !== id)].slice(0, RECENT_MAX)
    const usage = { ...get().usage, [id]: (get().usage[id] ?? 0) + 1 }
    save(RECENT_KEY, recents)
    save(USAGE_KEY, usage)
    set({ recents, usage })
  },

  popularIds: () => {
    const usage = get().usage
    return Object.keys(usage).sort((a, b) => usage[b] - usage[a])
  },
}))
