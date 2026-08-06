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
    price: 750,
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
    price: 750,
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
    price: 320,
    currency: 'gold',
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
    price: 750,
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
    price: 750,
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
    price: 320,
    currency: 'gold',
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
    price: 320,
    currency: 'gold',
  },
  {
    id: 'elephant',
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
    price: 750,
  },
  {
    id: 'monkey',
    name: 'Monkey',
    gender: 'male',
    model: 'monkey.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'none', hairColor: 'brown', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A playful brown monkey with big round ears, a curly tail and a cheeky grin',
    icon: '/icons/characters/monkey.svg',
    rarity: 'Epic',
    color: '#8B5E3C',
    bg: '#f5e6d3',
    isAnimal: true,
    price: 750,
  },

  // ============================================================================
  //  PHASE 2 — EXPANDED ROSTER
  //  Commons (green 0) · Epics (green ladder 550–800) · Legendaries (gold 🌟 320)
  //  Animal costumes use isAnimal:true (no shoes/human face). New looks reuse the
  //  existing procedural rig pieces with distinct colour/stitching so each reads
  //  as a fresh character without new 3D assets.
  // ============================================================================

  // ── Commons (free) ──────────────────────────────────────────────────────
  {
    id: 'ojas',
    name: 'Ojas',
    gender: 'male',
    model: 'ojas.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'short_neat', hairColor: 'black',
      top: 'hoodie', bottom: 'pants', shoes: 'sneakers',
      topColor: '#c96a2e', bottomColor: '#2c3e50',
    }),
    description: 'A cheerful student in a warm classic kurta-style jacket',
    icon: '/icons/characters/ojas.svg',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#fff0e0',
    price: 0,
  },
  {
    id: 'priya',
    name: 'Priya',
    gender: 'female',
    model: 'priya.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'tan', hair: 'braided', hairColor: 'black',
      top: 'frock', bottom: 'leggings', shoes: 'sneakers',
      topColor: '#e06a8a', bottomColor: '#3d2b1f',
    }),
    description: 'Bright local scholar with a warm smile and an open book',
    icon: '/icons/characters/priya.svg',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#ffe8f0',
    price: 0,
  },
  {
    id: 'zara',
    name: 'Zara',
    gender: 'female',
    model: 'zara.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'tan', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'blazer', bottom: 'leggings', shoes: 'boots',
      topColor: '#2a5a3a', bottomColor: '#2c1a1a',
    }),
    icon: '/icons/characters/zara.svg',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#eaf7dd',
    price: 0,
  },
  {
    id: 'owen',
    name: 'Owen',
    gender: 'male',
    model: 'owen.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'short_messy', hairColor: 'blonde', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
      topColor: '#1a5a8a', bottomColor: '#3a3a3a',
    }),
    icon: '/icons/characters/owen.svg',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#e8f0ff',
    price: 0,
  },
  {
    id: 'taro',
    name: 'Taro',
    gender: 'male',
    model: 'taro.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'short_neat', hairColor: 'black', eyes: 'brown',
      top: 'jacket', bottom: 'pants', shoes: 'boots',
      topColor: '#3a2a5a', bottomColor: '#1a1a1a',
    }),
    icon: '/icons/characters/taro.svg',
    rarity: 'Common',
    color: '#8a8a8a',
    bg: '#efe8ff',
    price: 0,
  },

  // ── Epics (green) ──────────────────────────────────────────────────────
  {
    id: 'panda',
    name: 'Panda',
    gender: 'female',
    model: 'panda.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A cuddly black-and-white panda with round ears and soft paw pads',
    icon: '/icons/characters/panda.svg',
    rarity: 'Epic',
    color: '#3a3a3a',
    bg: '#f0f4f8',
    isAnimal: true,
    price: 750,
  },
  {
    id: 'fox',
    name: 'Fox',
    gender: 'male',
    model: 'fox.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'none', hairColor: 'orange', eyes: 'green',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A quick orange fox with a bushy tail and bright amber eyes',
    icon: '/icons/characters/fox.svg',
    rarity: 'Epic',
    color: '#e8722a',
    bg: '#fff0e0',
    isAnimal: true,
    price: 700,
  },
  {
    id: 'owl',
    name: 'Owl',
    gender: 'female',
    model: 'owl.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'none', hairColor: 'brown', eyes: 'yellow',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
    }),
    description: 'A wise little owl with big round glasses and tilted wings',
    icon: '/icons/characters/owl.svg',
    rarity: 'Epic',
    color: '#8a6c5a',
    bg: '#f5ead9',
    isAnimal: true,
    price: 700,
    special: true,
  },
  {
    id: 'cat_robot',
    name: 'Cat-Robot',
    gender: 'female',
    model: 'cat_robot.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'light', hair: 'none', hairColor: 'black', eyes: 'blue',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
      topColor: '#3a5a8a', bottomColor: '#2a2a3a',
    }),
    icon: '/icons/characters/cat_robot.svg',
    rarity: 'Epic',
    color: '#7a8aa8',
    bg: '#e8eef8',
    isAnimal: true,
    price: 750,
  },
  {
    id: 'samurai',
    name: 'Samurai',
    gender: 'male',
    model: 'samurai.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'none', hairColor: 'black', eyes: 'brown',
      top: 'blazer', bottom: 'pants', shoes: 'boots',
      topColor: '#5a1a1a', bottomColor: '#1a1a1a',
    }),
    description: 'A disciplined young samurai with a crimson haori look',
    icon: '/icons/characters/samurai.svg',
    rarity: 'Epic',
    color: '#c9302c',
    bg: '#f5e6d3',
    price: 800,
  },
  {
    id: 'dragon',
    name: 'Dragon',
    gender: 'male',
    model: 'dragon.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'tan', hair: 'none', hairColor: 'black', eyes: 'green',
      top: 'jacket', bottom: 'pants', shoes: 'sneakers',
      topColor: '#1a5a3a', bottomColor: '#1a1a1a',
    }),
    description: 'A legendary emerald dragon with glowing eyes and a proud stance',
    icon: '/icons/characters/dragon.svg',
    rarity: 'Legendary',
    color: '#2a8a5a',
    bg: '#0f2417',
    special: true,
    isAnimal: true,
    price: 320,
    currency: 'gold',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    gender: 'male',
    model: 'wizard.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'light', hair: 'long_straight', hairColor: 'silver', eyes: 'blue',
      top: 'robe', bottom: 'pants', shoes: 'boots',
      topColor: '#3a2a5a', bottomColor: '#2a1a3a',
    }),
    description: 'A mystical wizard with a navy robe, golden trim and a starry hat',
    icon: '/icons/characters/wizard.svg',
    rarity: 'Legendary',
    color: '#8a6cff',
    bg: '#1a1030',
    special: true,
    price: 320,
    currency: 'gold',
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    gender: 'female',
    model: 'phoenix.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'tan', hair: 'none', hairColor: 'orange', eyes: 'amber',
      top: 'tee', bottom: 'pants', shoes: 'sneakers',
      topColor: '#ff8a3a', bottomColor: '#7a2a04',
    }),
    icon: '/icons/characters/phoenix.svg',
    rarity: 'Legendary',
    color: '#ff8a3a',
    bg: '#2a1008',
    special: true,
    isAnimal: true,
    price: 320,
    currency: 'gold',
  },
  {
    id: 'nightstalker',
    name: 'Nightstalker',
    gender: 'male',
    model: 'nightstalker.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('male', {
      skin: 'porcelain', hair: 'none', hairColor: 'black', eyes: 'silver',
      top: 'jacket', bottom: 'pants', shoes: 'boots',
      topColor: '#0e1116', bottomColor: '#0a0a0f',
    }),
    description: 'A shadowy ninja with glowing cyan lines tracing its dark cloak',
    icon: '/icons/characters/nightstalker.svg',
    rarity: 'Legendary',
    color: '#38bdf8',
    bg: '#0a0e14',
    special: true,
    isAnimal: true,
    price: 320,
    currency: 'gold',
  },
  {
    id: 'celestial',
    name: 'Celestial',
    gender: 'female',
    model: 'celestial.glb',
    scale: 1,
    yOffset: 0,
    fallback: look('female', {
      skin: 'porcelain', hair: 'long_straight', hairColor: 'gold', eyes: 'blue',
      top: 'robe', bottom: 'leggings', shoes: 'boots',
      topColor: '#e8f4fb', bottomColor: '#ffd700',
    }),
    description: 'A radiant guardian in armor-featured white robes with glowing light-wings',
    icon: '/icons/characters/celestial.svg',
    rarity: 'Legendary',
    color: '#ffd700',
    bg: '#0d1a2a',
    special: true,
    price: 320,
    currency: 'gold',
  },
]

// Remove gender-based filtering - all characters are available together
export const ALL_CHARACTERS = CHARACTERS

// ────────────────────────────────────────────────────────────
// Override-aware effective roster — /owner pricing changes in the
// Pricing tab apply instantly to every player-facing screen.
// ────────────────────────────────────────────────────────────
import { getOverride } from '../lib/ownerOverrides'

/** Characters with /owner price + rarity overrides applied. */
export function effectiveCharacters(): Character[] {
  return CHARACTERS.map((c) => {
    const ov = getOverride('characters', c.id, {} as { price?: number; rarity?: string })
    if (!ov || (ov.price === undefined && ov.rarity === undefined)) return c
    return {
      ...c,
      price: ov.price ?? c.price,
      rarity: ov.rarity ?? c.rarity,
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
