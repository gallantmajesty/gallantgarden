import { create } from 'zustand'
import {
  DEFAULT_AVATAR,
  normalizeAvatar,
  randomizeAvatar,
  type AvatarConfig,
} from './config'
import { characterById } from './characters'

// The player's customizable avatar look. ONE base body, fully customized via the
// AvatarConfig (skin / hair / eyes / clothing styles + colours). Persists to
// localStorage immediately (same pattern as the settings/realm stores) and is
// structured so switching to InsForge profile persistence later is a one-function
// change inside `save()` — the shape is already the profile schema's `avatar`
// (see lib/types.ts).
//
// Migration: this store previously held a roster CharacterConfig ({ characterId }).
// Those saves are mapped to the matching character's signature look so existing
// players keep an avatar instead of being reset. The even-older v1 procedural
// blob (`sf.avatar.v1`, already an AvatarConfig) is read as a direct fallback.

const KEY = 'sf.avatar.v2'
const ROSTER_KEY = 'sf.character.v1'
const LEGACY_KEY = 'sf.avatar.v1'

/** Map a legacy roster choice ({ characterId }) onto a full base-body look. */
function fromRoster(raw: string): AvatarConfig | null {
  try {
    const parsed = JSON.parse(raw) as { characterId?: string }
    if (parsed && typeof parsed.characterId === 'string') {
      // characterById always returns a character; its `fallback` is an AvatarConfig.
      return normalizeAvatar(characterById(parsed.characterId).fallback)
    }
  } catch {
    /* fall through */
  }
  return null
}

function load(): AvatarConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalizeAvatar(JSON.parse(raw) as Partial<AvatarConfig>)

    // migrate a roster CharacterConfig -> the matching character's look
    const roster = localStorage.getItem(ROSTER_KEY)
    if (roster) {
      const look = fromRoster(roster)
      if (look) return look
    }

    // migrate a pre-roster v1 procedural avatar (already an AvatarConfig)
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) return normalizeAvatar(JSON.parse(legacy) as Partial<AvatarConfig>)

    return { ...DEFAULT_AVATAR }
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
  /** patch one or more fields of the look (instant apply in the editor + world) */
  set: (patch: Partial<AvatarConfig>) => void
  /** roll a fresh random look */
  randomize: () => void
  /** back to the default look */
  reset: () => void
  /** Commit the current config. Today = localStorage; later = InsForge upsert.
   *  This is the single choke-point for backend persistence. */
  save: () => Promise<void>
}

export const useAvatar = create<AvatarState>((set, get) => ({
  config: load(),

  set: (patch) => {
    const config = normalizeAvatar({ ...get().config, ...patch })
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
    // The shape is already a plain JSON-serializable AvatarConfig (lib/types.ts).
  },
}))
