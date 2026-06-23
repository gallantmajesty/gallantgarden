// schema.js — the persisted, multiplayer-serializable avatar description, plus
// the cosmetic ITEM schema (extended for a future marketplace). Plain JSON only:
// no DOM, no class instances, safe to store in localStorage / send over a wire.

import { SLOTS } from '../data/rig.js'

export const AVATAR_SCHEMA_VERSION = 3

/**
 * @typedef {Object} AvatarConfig
 * @property {number} v                 Schema version (for safe migrations).
 * @property {number} height            Uniform scale. Fixed at 1 for all players
 *                                       today (Roblox "one rig" rule); kept so a
 *                                       future mode can vary it without migration.
 * @property {string} skin              Skin swatch id — tints all base body parts.
 * @property {Record<string,string>} equipped  slot id -> item id ('none' = empty).
 * @property {Record<string,string>} tints     slot id -> swatch id (tinted items).
 */

/**
 * @typedef {Object} CosmeticItem  A wearable. The base body is NOT an item — it
 *   is the procedural rig; items only ever ADD layers onto a bone's mount slot.
 * @property {string} id
 * @property {string} name
 * @property {string} slot            One of SLOTS — which bone slot it mounts to.
 * @property {boolean} tint           Does it read config.tints[slot]? (grayscale art)
 * @property {string} [defaultTint]   Swatch id used when none is chosen.
 * @property {Object} art             Render spec (see core/tint.js buildLayer()).
 *
 * --- marketplace / economy fields (forward-compatible, all optional) ---
 * @property {('common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic')} [rarity]
 * @property {('default'|'shop'|'quest'|'event'|'craft'|'reward'|'premium')} [obtainMethod]
 * @property {boolean} [tradeable]    May be traded between players.
 * @property {boolean} [limited]      Time/quantity-limited drop (collectible).
 * @property {number}  [price]        Soft-currency cost in shop (if obtainable).
 */

/** A fresh default look. Every slot present (even if 'none') for stable diffing. */
export function createDefaultConfig() {
  return {
    v: AVATAR_SCHEMA_VERSION,
    height: 1,
    skin: 'light',
    equipped: {
      hairBack: 'none',
      hairFront: 'hair_wavy',
      eyes: 'eyes_round',
      face: 'none',
      mouth: 'mouth_soft',
      torso: 'top_hoodie',
      leftArm: 'sleeve_long',
      rightArm: 'sleeve_long',
      leftLeg: 'pants_jeans',
      rightLeg: 'pants_jeans',
      leftShoe: 'shoes_sneakers',
      rightShoe: 'shoes_sneakers',
      accessories: 'none',
      backItem: 'wings_starlight',
    },
    tints: {
      hairBack: 'hair_chestnut',
      hairFront: 'hair_chestnut',
      eyes: 'eye_hazel',
      face: 'cloth_slate',
      mouth: 'cloth_rose',
      torso: 'cloth_indigo',
      leftArm: 'cloth_indigo',
      rightArm: 'cloth_indigo',
      leftLeg: 'cloth_slate',
      rightLeg: 'cloth_slate',
      leftShoe: 'cloth_cream',
      rightShoe: 'cloth_cream',
      accessories: 'cloth_amber',
      backItem: 'cloth_arcane',
    },
  }
}

/** Coerce any (possibly older / partial) config into a valid current one. */
export function migrateConfig(input) {
  const def = createDefaultConfig()
  if (!input || typeof input !== 'object') return def

  const out = {
    v: AVATAR_SCHEMA_VERSION,
    height: typeof input.height === 'number' ? input.height : def.height,
    skin: typeof input.skin === 'string' ? input.skin : def.skin,
    equipped: { ...def.equipped },
    tints: { ...def.tints },
  }
  // Only copy known slots; unknown keys are dropped (defends against bad data).
  for (const slot of SLOTS) {
    if (input.equipped && typeof input.equipped[slot] === 'string') {
      out.equipped[slot] = input.equipped[slot]
    }
    if (input.tints && typeof input.tints[slot] === 'string') {
      out.tints[slot] = input.tints[slot]
    }
  }
  return out
}

/** True if `cfg` is a structurally valid current-version config. */
export function validateConfig(cfg) {
  if (!cfg || cfg.v !== AVATAR_SCHEMA_VERSION) return false
  if (typeof cfg.skin !== 'string' || typeof cfg.height !== 'number') return false
  if (!cfg.equipped || !cfg.tints) return false
  return SLOTS.every((s) => typeof cfg.equipped[s] === 'string')
}

/** Deep clone a config (structuredClone where available, JSON fallback). */
export function cloneConfig(cfg) {
  return typeof structuredClone === 'function'
    ? structuredClone(cfg)
    : JSON.parse(JSON.stringify(cfg))
}
