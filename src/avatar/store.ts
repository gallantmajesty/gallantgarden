import { create } from 'zustand'
import {
  DEFAULT_AVATAR,
  normalizeAvatar,
  randomizeAvatar,
  type AvatarConfig,
} from './config'

// Avatar config store. Persists to localStorage immediately (same pattern as the
// settings/realm stores) and is structured so that switching to InsForge profile
// persistence later is a one-function change inside `save()`.

const KEY = 'sf.avatar.v1'

function load(): AvatarConfig {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalizeAvatar(JSON.parse(raw) as Partial<AvatarConfig>) : { ...DEFAULT_AVATAR }
  } catch {
    return { ...DEFAULT_AVATAR }
  }
}

function persist(cfg: AvatarConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    /* storage full / blocked — ignore */
  }
}

interface AvatarState {
  config: AvatarConfig
  /** patch a single field (instant apply in the creator) */
  patch: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void
  randomize: () => void
  reset: () => void
  /** Commit the current config. Today = localStorage; later = InsForge upsert.
   *  This is the single choke-point for backend persistence. */
  save: () => Promise<void>
}

export const useAvatar = create<AvatarState>((set, get) => ({
  config: load(),

  patch: (key, value) => {
    const config = { ...get().config, [key]: value }
    set({ config })
    persist(config)
  },

  randomize: () => {
    const config = randomizeAvatar()
    set({ config })
    persist(config)
  },

  reset: () => {
    const config = { ...DEFAULT_AVATAR }
    set({ config })
    persist(config)
  },

  save: async () => {
    const config = get().config
    persist(config)
    // FUTURE (InsForge): upsert into a `profiles` table keyed by auth.uid():
    //   await insforge.from('profiles').upsert([{ id: userId, avatar: config }])
    // The shape is already a plain JSON-serializable AvatarConfig.
  },
}))
