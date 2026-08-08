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
  /** currency spent: 'green' (🍃) or 'gold' (🌟 gold leaves). Default green. */
  currency?: 'green' | 'gold'
  /** Shop visibility. Hidden characters stay fully playable (equip/loads fine);
   *  they are just filtered out of the shop catalog until launch. */
  visible: boolean
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
    visible: true,
    name: 'James',
    gender: 'male',
    model: 'james.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      characterId: 'james',
      skin: 'light', hair: 'short_neat', hairColor: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
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
    visible: true,
    name: 'Lily',
    gender: 'female',
    model: 'claire.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'ponytail', hairColor: 'chestnut',
      top: 'frock', bottom: 'leggings', shoes: 'sneakers',
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
    visible: true,
    name: 'Mia',
    gender: 'female',
    model: 'mia.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'tan', hair: 'long_straight', hairColor: 'auburn',
      top: 'blazer', bottom: 'leggings', shoes: 'boots',
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
    visible: false,
    name: 'Ruslana',
    gender: 'female',
    model: 'ruslan.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'ruslan',
      skin: 'porcelain', hair: 'braided', hairColor: 'blonde', eyes: 'blue',
      top: 'sarafan', bottom: 'leggings', shoes: 'boots',
    }),
    description: 'Cheerful scholar from the snowy north in an embroidered red sarafan, a pearl kokoshnik and a long braid',
    icon: '/icons/characters/ruslan.webp',
    rarity: 'Legendary',
    color: '#8a8a8a',
    bg: '#eef3f8',
    price: 320,
    currency: 'gold',
  },
  {
    id: 'dino',
    visible: true,
    name: 'Dino',
    gender: 'male',
    model: 'dino.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      characterId: 'dino',
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A cute green wild dinosaur costume — teeth, claws, plates and a spiky tail!',
    icon: '/icons/characters/dino.webp',
    rarity: 'Epic',
    color: '#6cbf4a',
    bg: '#eaf7dd',
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'rabbit',
    visible: true,
    name: 'Bunny',
    gender: 'female',
    model: 'rabbit.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'rabbit',
      skin: 'light', hair: 'none', hairColor: 'brown', eyes: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'An adorable white toy rabbit in a pink suit with a green rear flap and a fluffy cotton tail',
    icon: '/icons/characters/rabbit.webp',
    rarity: 'Epic',
    color: '#f2a3c0',
    bg: '#fdeaf2',
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'robot',
    visible: true,
    name: 'Black Robot',
    gender: 'male',
    model: 'robot.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      characterId: 'robot',
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
    price: 320,
    currency: 'gold',
  },
  {
    id: 'alien',
    visible: false,
    name: 'Alien',
    gender: 'male',
    model: 'alien.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      characterId: 'alien',
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
    price: 2000,
  },
  {
    id: 'pig',
    visible: false,
    name: 'Piggy',
    gender: 'female',
    model: 'pig.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'pig',
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A cheerful pink piglet with a curly tail, floppy ears and a snout full of freckles',
    icon: '/icons/characters/pig.webp',
    rarity: 'Epic',
    color: '#f29ac0',
    bg: '#fde6f1',
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'angel',
    visible: false,
    name: 'Seraphine',
    gender: 'female',
    model: 'angel.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'angel',
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
    price: 320,
    currency: 'gold',
  },
  {
    id: 'sunflower',
    visible: false,
    name: 'Sunny',
    gender: 'female',
    model: 'sunflower.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'sunflower',
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
    price: 320,
    currency: 'gold',
  },
  {
    id: 'elephant',
    visible: false,
    name: 'Ellie',
    gender: 'female',
    model: 'elephant.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'elephant',
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A gentle gray elephant with a big round head, huge floppy ears, a thick trunk, curved ivory tusks, and a smart navy shirt',
    icon: '/icons/characters/elephant.svg',
    rarity: 'Epic',
    color: '#8a8f94',
    bg: '#eef1f4',
    isAnimal: true,
    price: 2000,
  },
  {
    id: 'monkey',
    visible: false,
    name: 'Monkey',
    gender: 'male',
    model: 'monkey.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      characterId: 'monkey',
      skin: 'tan', hair: 'none', hairColor: 'brown', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A playful brown monkey with big round ears, a curly tail and a cheeky grin',
    icon: '/icons/characters/monkey.svg',
    rarity: 'Epic',
    color: '#8B5E3C',
    bg: '#f5e6d3',
    isAnimal: true,
    price: 2000,
  },

  // ============================================================================
  //  PHASE 2 — EXPANDED ROSTER
  //  Commons (green 0) · Epics (green ladder 550–800) · Legendaries (gold 🌟 320)
  //  Animal costumes use isAnimal:true (no shoes/human face). New looks reuse the
  //  existing procedural rig pieces with distinct colour/stitching so each reads
  //  as a fresh character without new 3D assets.
  // ============================================================================

  // ── Epics (green) ──────────────────────────────────────────────────────
  {
    id: 'panda',
    visible: false,
    name: 'Panda',
    gender: 'female',
    model: 'panda.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      characterId: 'panda',
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A cuddly black-and-white panda with round ears and soft paw pads',
    icon: '/icons/characters/panda.svg',
    rarity: 'Epic',
    color: '#3a3a3a',
    bg: '#f0f4f8',
    isAnimal: true,
    price: 2000,
  },
]

// Remove gender-based filtering - all characters are available together
export const ALL_CHARACTERS = CHARACTERS

// ────────────────────────────────────────────────────────────
// Override-aware effective roster — /owner pricing changes in the
// Pricing tab apply instantly to every player-facing screen.
// ────────────────────────────────────────────────────────────
import { getOverride } from '../lib/ownerOverrides'

/** Characters with /owner price + rarity + currency + visibility overrides applied. */
export function effectiveCharacters(): Character[] {
  return CHARACTERS.map((c) => {
    const ov = getOverride('characters', c.id, {} as { price?: number; rarity?: string; currency?: 'green' | 'gold'; visible?: boolean })
    if (!ov || (ov.price === undefined && ov.rarity === undefined && ov.currency === undefined && ov.visible === undefined)) return c
    return {
      ...c,
      price: ov.price ?? c.price,
      rarity: ov.rarity ?? c.rarity,
      currency: ov.currency ?? c.currency,
      visible: ov.visible ?? c.visible,
    }
  })
}

export function getEffectiveCharacter(id: string): Character {
  const effective = effectiveCharacters()
  return effective.find((c) => c.id === id) ?? effective[0]
}

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
