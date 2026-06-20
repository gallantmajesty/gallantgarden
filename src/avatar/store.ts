import { create } from 'zustand'
import {
  DEFAULT_CHARACTER_CONFIG,
  normalizeCharacter,
  type CharacterConfig,
} from './characters'

// Character choice store. Persists to localStorage immediately (same pattern as
// the settings/realm stores) and is structured so that switching to InsForge
// profile persistence later is a one-function change inside `save()`.
//
// Reads the legacy v1 key as a fallback so players who customized an avatar
// before the character system are migrated to the closest character instead of
// being reset.

const KEY = 'sf.character.v1'
const LEGACY_KEY = 'sf.avatar.v1'

function load(): CharacterConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalizeCharacter(JSON.parse(raw) as Partial<CharacterConfig>)
    // migrate a pre-existing v1 procedural avatar, if any
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) return normalizeCharacter(JSON.parse(legacy))
    return { ...DEFAULT_CHARACTER_CONFIG }
  } catch {
    return { ...DEFAULT_CHARACTER_CONFIG }
  }
}

function persist(cfg: CharacterConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    /* storage full / blocked — ignore */
  }
}

interface AvatarState {
  config: CharacterConfig
  /** select a character by id (instant apply in the chooser) */
  pick: (characterId: string) => void
  reset: () => void
  /** Commit the current config. Today = localStorage; later = InsForge upsert.
   *  This is the single choke-point for backend persistence. */
  save: () => Promise<void>
}

export const useAvatar = create<AvatarState>((set, get) => ({
  config: load(),

  pick: (characterId) => {
    const config: CharacterConfig = { ...get().config, characterId }
    set({ config })
    persist(config)
  },

  reset: () => {
    const config = { ...DEFAULT_CHARACTER_CONFIG }
    set({ config })
    persist(config)
  },

  save: async () => {
    const config = get().config
    persist(config)
    // FUTURE (InsForge): upsert into a `profiles` table keyed by auth.uid():
    //   await insforge.from('profiles').upsert([{ id: userId, character: config }])
    // The shape is already a plain JSON-serializable CharacterConfig.
  },
}))
