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
  /** UI-only metadata for the character picker / customization screen */
  icon?: string
  rarity?: string
  color?: string
  bg?: string
  /** 'male' | 'female' — kept here so it's trivial to see/edit each character's gender */
  gender?: 'male' | 'female'
  /** costume characters (dino, bunny…) render no shoes and no human face */
  isAnimal?: boolean
  /** price in green leaves (0 = free/owned) */
  price?: number
}

/** Build a fixed procedural look for a character's fallback rig. */
function look(bodyType: BodyType, over: Partial<AvatarConfig>): AvatarConfig {
  return { ...DEFAULT_AVATAR, bodyType, ...over }
}

// ============================================================================
//  CHARACTER ROSTER  —  the playable characters (single source of truth)
//  Edit anything below to change a character; both the customization screen
//  (AvatarCreator) and the character picker (CharacterSelection) read from here.
//
//   1. james  → James  (MALE)   — black jacket student
//   2. claire → Lily   (FEMALE) — ponytail + pink frock
//   3. mia    → Mia    (FEMALE) — long auburn hair + blazer
//   4. ruslan → Ruslana (FEMALE) — fair scholar in a red sarafan + pearl kokoshnik + long braid
//   5. dino   → Dino (COSTUME)   — cute green dinosaur mascot, no human face, same skeleton
//   6. rabbit → Bunny (COSTUME)  — white toy rabbit, pink suit, green rear flap, cotton tail
//   7. robot  → Robot (COSTUME)  — sci-fi robot with a black outfit and glowing blue accent lines
//   8. alien  → Alien (COSTUME)  — friendly green extraterrestrial with big black eyes and antennae
//
//  All share the SAME skeleton + height (see src/avatar/rig.ts). Gender is
//  signalled by body shape, hair, clothing and colour — not scale.
// ============================================================================
export const CHARACTERS: Character[] = [
  {
    id: 'james',
    name: 'James',
    gender: 'male',
    model: 'james.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'short_neat', hairColor: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
      topColor: '#cc2222', bottomColor: '#1a1a1a',
    }),
    description: 'Friendly student with a cool black outfit',
    icon: '/icons/characters/james.webp',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#e8f0ff',
    price: 0,
  },
  {
    id: 'claire',
    name: 'Lily',
    gender: 'female',
    model: 'claire.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'ponytail', hairColor: 'chestnut',
      top: 'frock', bottom: 'leggings', shoes: 'sneakers',
      topColor: '#e87ca0', bottomColor: '#2d1f3d',
    }),
    description: 'Cheerful girl with a cute ponytail and pink dress',
    icon: '/icons/characters/lily.webp',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#ffe8f0',
    price: 0,
  },
  {
    id: 'mia',
    name: 'Mia',
    gender: 'female',
    model: 'mia.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'tan', hair: 'long_straight', hairColor: 'auburn',
      top: 'blazer', bottom: 'leggings', shoes: 'boots',
      topColor: '#1e3a5f', bottomColor: '#3d2b1f',
    }),
    description: 'Bright scholar with long auburn hair and a smart blazer',
    icon: '/icons/characters/mia.svg',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#fff0e0',
    price: 0,
  },
  {
    id: 'ruslan',
    name: 'Ruslana',
    gender: 'female',
    model: 'ruslan.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'porcelain', hair: 'braided', hairColor: 'blonde', eyes: 'blue',
      top: 'sarafan', bottom: 'leggings', shoes: 'boots',
      topColor: '#b4202f', bottomColor: '#1a2a3a',
    }),
    description: 'Cheerful scholar from the snowy north in an embroidered red sarafan, a pearl kokoshnik and a long braid',
    icon: '/icons/characters/ruslan.webp',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#eef3f8',
    price: 0,
  },
  {
    id: 'dino',
    name: 'Dino',
    gender: 'male',
    model: 'dino.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A cute green wild dinosaur costume — teeth, claws, plates and a spiky tail!',
    icon: '/icons/characters/dino.webp',
    rarity: 'Epic',
    color: '#6cbf4a',
    bg: '#eaf7dd',
    isAnimal: true,
    price: 400,
  },
  {
    id: 'rabbit',
    name: 'Bunny',
    gender: 'female',
    model: 'rabbit.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'none', hairColor: 'brown', eyes: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'An adorable white toy rabbit in a pink suit with a green rear flap and a fluffy cotton tail',
    icon: '/icons/characters/rabbit.webp',
    rarity: 'Epic',
    color: '#f2a3c0',
    bg: '#fdeaf2',
    isAnimal: true,
    price: 400,
  },
  {
    id: 'robot',
    name: 'Black Robot',
    gender: 'male',
    model: 'robot.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'blue',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A sci-fi robot with a sleek black outfit and glowing blue sci-fi accent lines',
    icon: '/icons/characters/robot.webp',
    rarity: 'Legendary',
    color: '#1a1a2e',
    bg: '#0c1322',
    special: true,
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'alien',
    name: 'Alien',
    gender: 'male',
    model: 'alien.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'green',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A friendly green extraterrestrial with big black eyes and glowing antennae',
    icon: '/icons/characters/alien.webp',
    rarity: 'Epic',
    color: '#52c64a',
    bg: '#0f2417',
    special: true,
    isAnimal: true,
    price: 400,
  },
  {
    id: 'pig',
    name: 'Piggy',
    gender: 'female',
    model: 'pig.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A cheerful pink piglet with a curly tail, floppy ears and a snout full of freckles',
    icon: '/icons/characters/pig.webp',
    rarity: 'Epic',
    color: '#f29ac0',
    bg: '#fde6f1',
    isAnimal: true,
    price: 400,
  },
  {
    id: 'angel',
    name: 'Seraphine',
    gender: 'female',
    model: 'angel.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'porcelain', hair: 'none', hairColor: 'blonde', eyes: 'blue',
      top: 'robe', bottom: 'leggings', shoes: 'boots',
    }),
    description: 'A radiant white angel with feathered wings, a golden halo and a flowing robe of light',
    icon: '/icons/characters/angel.webp',
    rarity: 'Legendary',
    color: '#f4ecd6',
    bg: '#11131f',
    special: true,
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'sunflower',
    name: 'Sunny',
    gender: 'female',
    model: 'sunflower.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'none', hairColor: 'blonde', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
      topColor: '#f9d857', bottomColor: '#e8c32a',
    }),
    description: 'A radiant sunflower — whole body glowing yellow with a giant sunflower bloom for a head, green leafy arms, and earthy brown feet',
    icon: '/icons/characters/sunflower.svg',
    rarity: 'Legendary',
    color: '#ffcd00',
    bg: '#1a3010',
    special: true,
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'grim',
    name: 'Grim',
    gender: 'male',
    model: 'grim.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'green',
      top: 'hoodie', bottom: 'pants', shoes: 'boots',
    }),
    description: 'A chibi Grim Reaper — glowing green skull eyes, dark hooded cloak with gold armor, a scythe and spectral green flames',
    icon: '/icons/characters/grim.svg',
    rarity: 'Legendary',
    color: '#39ff14',
    bg: '#0a1a0a',
    special: true,
    isAnimal: true,
    price: 2000,
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
