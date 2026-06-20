// The character system: a small, fixed roster of pre-built avatars the player
// chooses from (no live customization). Each character ships as a single baked
// .glb (mesh + all locomotion clips) under /models/avatars; until that file is
// present, a deterministic procedural look (config.ts rig) stands in so the app
// always works — same graceful-fallback contract the tree system uses.
//
// `accessories` is reserved (always [] today) so caps / wearables can be layered
// on later without another schema migration.

import { DEFAULT_AVATAR, type AvatarConfig, type BodyType } from './config'

export const CHARACTER_SCHEMA_VERSION = 2

export type Gender = 'male' | 'female'

export interface Character {
  id: string
  name: string
  gender: Gender
  /** baked glb filename under /models/avatars (mesh + animation clips) */
  model: string
  /** uniform scale + ground offset for the glb in-world (Mixamo exports vary) */
  scale: number
  yOffset: number
  /** deterministic procedural stand-in used until the glb is dropped in */
  fallback: AvatarConfig
}

/** Build a fixed procedural look for a character's fallback rig. */
function look(bodyType: BodyType, over: Partial<AvatarConfig>): AvatarConfig {
  return { ...DEFAULT_AVATAR, bodyType, ...over }
}

// Roster. Gender split per product decision: James ♂ · Megan + Luise ♀.
export const CHARACTERS: Character[] = [
  {
    id: 'james',
    name: 'James',
    gender: 'male',
    model: 'james.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'short', hairColor: 'black',
      top: 'jacket', topColor: 'slate', bottom: 'pants', bottomColor: 'indigo',
      shoes: 'sneakers', shoesColor: 'white',
    }),
  },
  {
    id: 'megan',
    name: 'Megan',
    gender: 'female',
    model: 'megan.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'long', hairColor: 'chestnut',
      top: 'tee', topColor: 'rose', bottom: 'skirt', bottomColor: 'plum',
      shoes: 'sneakers', shoesColor: 'white',
    }),
  },
  {
    id: 'luise',
    name: 'Luise',
    gender: 'female',
    model: 'luise.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'porcelain', hair: 'bun', hairColor: 'blonde',
      top: 'hoodie', topColor: 'forest', bottom: 'pants', bottomColor: 'slate',
      shoes: 'boots', shoesColor: 'brown',
    }),
  },
]

export const MALE_CHARACTERS = CHARACTERS.filter((c) => c.gender === 'male')
export const FEMALE_CHARACTERS = CHARACTERS.filter((c) => c.gender === 'female')

export const DEFAULT_CHARACTER_ID = 'james'

export function characterById(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
}

/* ----------------------------------------------------------------- config */

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
 * jarring stranger — a male v1 avatar becomes James, a female one becomes Megan.
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

  // legacy v1 procedural blob -> map by body type
  const id = input.bodyType === 'female' ? 'megan' : DEFAULT_CHARACTER_ID
  return { v: CHARACTER_SCHEMA_VERSION, characterId: id, accessories: [] }
}
