// The character system: a small, fixed roster of pre-built avatars the player
// chooses from (no live customization). Each character ships as a single baked
// .glb (mesh + animation clips) under /models/avatars; until that file is
// present, a deterministic procedural look (config.ts rig) stands in so the app
// always works — same graceful-fallback contract the tree system uses.

import { DEFAULT_AVATAR, type AvatarConfig, type BodyType } from './config'

export const CHARACTER_SCHEMA_VERSION = 2

export interface Character {
  id: string
  name: string
  /** baked glb filename under /models/avatars (mesh + animation clips) */
  model: string
  /** uniform scale + ground offset for the glb in-world (Mixamo exports vary) */
  scale: number
  yOffset: number
  /** deterministic procedural stand-in used until the glb is present */
  fallback: AvatarConfig
  /** description for character selection */
  description?: string
  /** special character badge */
  special?: boolean
}

/** Build a fixed procedural look for a character's fallback rig. */
function look(bodyType: BodyType, over: Partial<AvatarConfig>): AvatarConfig {
  return { ...DEFAULT_AVATAR, bodyType, ...over }
}

// All characters available for selection
export const CHARACTERS: Character[] = [
  {
    id: 'james',
    name: 'James',
    model: 'james.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'short_messy', hairColor: 'black',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'Classic student with a friendly look'
  },
  {
    id: 'claire',
    name: 'Claire',
    model: 'claire.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'tan', hair: 'twintails', hairColor: 'chestnut',
      top: 'blazer', bottom: 'pants', shoes: 'boots',
    }),
    description: 'Studious student with stylish appearance'
  },
  {
    id: 'samurai',
    name: 'Samurai',
    model: 'samurai.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'short_messy', hairColor: 'black',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'Legendary warrior with traditional armor',
    special: true
  },
]

// Remove gender-based filtering - all characters are available together
export const ALL_CHARACTERS = CHARACTERS

export const DEFAULT_CHARACTER_ID = 'james'

export function characterById(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
}

/** Persisted, multiplayer-serializable character choice. Plain JSON only. */
export interface CharacterConfig {
  v: number
  characterId: string
  /** reserved for future caps / wearables; always [] today */
  accessories: string[]
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  v: CHARACTER_SCHEMA_VERSION,
  characterId: DEFAULT_CHARACTER_ID,
  accessories: [],
}

/**
 * Bring any persisted/partial blob up to a complete, valid CharacterConfig.
 * Handles the v1 procedural avatar shape ({ bodyType, skin, ... }) by mapping
 * its body type onto a default character so existing players aren't reset to a
 * jarring stranger — defaults to James for backward compatibility.
 */
export function normalizeCharacter(
  input: Partial<CharacterConfig> & { bodyType?: BodyType } | null | undefined,
): CharacterConfig {
  if (!input) return { ...DEFAULT_CHARACTER_CONFIG }

  // already a character config
  if (typeof input.characterId === 'string' && characterById(input.characterId).id === input.characterId) {
    return {
      v: CHARACTER_SCHEMA_VERSION,
      characterId: input.characterId,
      accessories: Array.isArray(input.accessories) ? input.accessories : [],
    }
  }

  // legacy v1 procedural blob -> default to James
  return { v: CHARACTER_SCHEMA_VERSION, characterId: DEFAULT_CHARACTER_ID, accessories: [] }
}
