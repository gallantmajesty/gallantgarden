// Cosmetic accessory type system — the data contract for the avatar's wearable
// accessories. Deliberately data-first: an accessory is a plain JSON-serializable
// record that names a *render kind* (one of a small fixed set of parametric
// renderers, see render.tsx) plus free-form `params` that drive that renderer's
// look. New items — even hundreds — are added by appending rows to the catalog
// (catalog.ts); only a genuinely new SHAPE needs a new render kind. Rarity is
// reused from the marketplace type system so there is one source of truth.

import type { Rarity } from '../../marketplace/types'

export type { Rarity }

/**
 * Equip slots. One item per slot (conflicts are automatic), but ALL slots can be
 * worn at once — so an avatar can have e.g. glasses + a hat + a beard + a scarf +
 * wings + a book simultaneously. Glasses & sunglasses share `eyewear`; hats, ears,
 * headsets & helmets share `headwear`; facial hair, masks, nose/mark/eye-patch
 * share `face`.
 */
export type AccessorySlot = 'eyewear' | 'headwear' | 'face' | 'neck' | 'back' | 'hand'

export const ACCESSORY_SLOTS: readonly AccessorySlot[] = [
  'eyewear', 'headwear', 'face', 'neck', 'back', 'hand',
]

/** The 7 player-facing categories (used to group the catalog in the UI). */
export type AccessoryCategory =
  | 'glasses' | 'sunglasses' | 'headwear' | 'face' | 'neck' | 'back' | 'handheld'

export const CATEGORY_LABEL: Record<AccessoryCategory, string> = {
  glasses: 'Glasses',
  sunglasses: 'Sunglasses',
  headwear: 'Hats & Headwear',
  face: 'Face',
  neck: 'Neck',
  back: 'Back',
  handheld: 'Handheld',
}

/** Display order for the category sections in the editor. */
export const CATEGORY_ORDER: readonly AccessoryCategory[] = [
  'glasses', 'sunglasses', 'headwear', 'face', 'neck', 'back', 'handheld',
]

/** Which slot each category equips into. */
export const SLOT_FOR_ACCESSORY_CATEGORY: Record<AccessoryCategory, AccessorySlot> = {
  glasses: 'eyewear',
  sunglasses: 'eyewear',
  headwear: 'headwear',
  face: 'face',
  neck: 'neck',
  back: 'back',
  handheld: 'hand',
}

/**
 * The fixed set of parametric renderers (the ONLY place geometry lives, see
 * render.tsx). Each covers a family of items distinguished by `params`. Adding a
 * recolour / shape variant of an existing family = data only; a brand-new family =
 * add one kind here + one renderer.
 */
export type RenderKind =
  | 'glasses'   // all glasses + sunglasses (shape + lens tint/opacity)
  | 'hatBrim'   // caps, bucket, fedora, straw, pirate (crown + brim)
  | 'hatSoft'   // beanie, bandana (soft cap)
  | 'crown'     // crown / golden crown / flower crown
  | 'ears'      // bunny / cat ears (headband + ears)
  | 'headset'   // gaming headset / headphones (band + cups)
  | 'pointHat'  // wizard hat (cone) / viking helmet (dome + horns)
  | 'facialHair'// mustache / goatee / short + long beard
  | 'mask'      // face / medical / bandana mask
  | 'faceSmall' // clown nose / beauty mark / eye patch
  | 'neckwear'  // scarf / chain / necklace / tie / bow-tie / lanyard / neckband
  | 'wings'     // angel / demon / butterfly
  | 'cape'      // small / royal cape
  | 'bag'       // backpack / school bag
  | 'backProp'  // jetpack / floating books / magic aura
  | 'handheld'  // book / coffee / pencil / laptop / wand / lantern / rose / camera / tablet / notes

/** Free-form, JSON-safe parameters interpreted by the chosen renderer. */
export type AccessoryParams = Record<string, string | number | boolean>

/** One catalog entry. Plain data — serialisable and (later) loadable from JSON. */
export interface AccessoryItem {
  id: string
  name: string
  category: AccessoryCategory
  slot: AccessorySlot
  rarity: Rarity
  price: number
  description: string
  render: RenderKind
  params: AccessoryParams
}

/** Equipped accessories: at most one item id per slot. Persisted in AvatarConfig. */
export type EquippedAccessories = Partial<Record<AccessorySlot, string | null>>
