// Marketplace & Inventory type system
// Future-proof: adding new categories is purely additive — no backend rewrites.

// ── Rarity ───────────────────────────────────────────────────────────────────
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic',
}
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9ba3af', uncommon: '#4ade80', rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24', mythic: '#ff5470',
}

/** Low → high. Drives sorting and rarity-border styling. */
export const RARITY_ORDER: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

// ── Equipment slots ───────────────────────────────────────────────────────────
export type EquipSlot =
  | 'hair' | 'top' | 'bottom' | 'shoes'
  | 'face_accessory' | 'head_accessory' | 'back_accessory' | 'effect'

// ── Item categories (discriminated union — additive) ──────────────────────────
export type ItemCategory =
  | 'shirt' | 'hoodie' | 'jacket' | 'pants' | 'shorts' | 'dress' | 'shoes' | 'socks'
  | 'hair_short' | 'hair_long' | 'hair_curly' | 'hair_ponytail' | 'hair_fantasy'
  | 'glasses' | 'hat' | 'cap' | 'headphones' | 'mask' | 'scarf' | 'backpack'
  | 'wings' | 'aura' | 'floating_particles' | 'magical_trail' | 'glow_effect'
  | 'prop_book' | 'prop_pencil' | 'prop_study_bag' | 'prop_graduation_cap' | 'prop_notebook'
  | 'pet' | 'companion' | 'custom_chair' | 'desk_decoration' | 'room_decoration'
  | 'profile_badge' | 'achievement_cosmetic'

export const SLOT_FOR_CATEGORY: Record<ItemCategory, EquipSlot> = {
  shirt: 'top', hoodie: 'top', jacket: 'top',
  pants: 'bottom', shorts: 'bottom', dress: 'bottom', socks: 'shoes',
  shoes: 'shoes',
  hair_short: 'hair', hair_long: 'hair', hair_curly: 'hair', hair_ponytail: 'hair', hair_fantasy: 'hair',
  glasses: 'face_accessory', mask: 'face_accessory', scarf: 'face_accessory',
  hat: 'head_accessory', cap: 'head_accessory', headphones: 'head_accessory',
  backpack: 'back_accessory', wings: 'back_accessory',
  aura: 'effect', floating_particles: 'effect', magical_trail: 'effect', glow_effect: 'effect',
  prop_book: 'back_accessory', prop_pencil: 'back_accessory',
  prop_study_bag: 'back_accessory', prop_graduation_cap: 'head_accessory', prop_notebook: 'back_accessory',
  pet: 'back_accessory', companion: 'back_accessory', custom_chair: 'back_accessory',
  desk_decoration: 'back_accessory', room_decoration: 'back_accessory',
  profile_badge: 'back_accessory', achievement_cosmetic: 'back_accessory',
}

// ── Catalog item ──────────────────────────────────────────────────────────────
export interface CatalogItem {
  id:          string
  name:        string
  category:    ItemCategory
  slot:        EquipSlot
  rarity:      Rarity
  price:       number
  description: string
  thumbnail:   string
  visualData?: Record<string, string | number | boolean>
}

// ── Inventory entry (persisted per user) ─────────────────────────────────────
export interface InventoryEntry {
  itemId:     string
  obtainedAt: string   // ISO 8601
  source:     ObtainSource
}

export type ObtainSource = 'purchase' | 'starter' | 'earned' | 'gifted' | 'unlocked' | 'admin'

// ── Equipment preset ──────────────────────────────────────────────────────────
export interface EquipmentPreset {
  id:    string
  name:  string
  slots: Partial<Record<EquipSlot, string | null>>
}

export const DEFAULT_PRESET_NAMES = ['Casual', 'Study Mode', 'Fantasy'] as const

export type EquippedItems = Partial<Record<EquipSlot, string | null>>
