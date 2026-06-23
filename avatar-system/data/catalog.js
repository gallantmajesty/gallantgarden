// catalog.js — the runtime cosmetic REGISTRY.
//
// There is no hardcoded item data here anymore. The catalog is loaded ONCE at
// boot from a CatalogProvider (default: LocalCatalogProvider -> public/
// cosmetics.json) and hydrated into a synchronous lookup. Every consumer
// (core/Avatar, core/Cosmetics, scene/effects, studio/CompanionStudio) keeps
// using the SYNCHRONOUS helpers below, so only the boot sequence is async —
// nothing inside the avatar/render path had to change.
//
//   boot:    await loadCatalog(new LocalCatalogProvider())   // index.html
//   runtime: getItem(id) · itemsForSlot(slot) · allItems()   // unchanged API
//
// Items never edit the rig; they only describe layers the attachment system
// mounts onto a bone slot (see core/Cosmetics.js).

import { basisSlot } from './rig.js'
import { LocalCatalogProvider } from './CatalogProvider.js'

/** @typedef {import('../core/schema.js').CosmeticItem} CosmeticItem */

// Back-compat: `basisSlot` used to be exported from here. Re-export so existing
// importers (core/Cosmetics.js) keep working after the move to rig.js.
export { basisSlot }

/** @type {CosmeticItem[]} */
let _items = []
/** @type {Map<string, CosmeticItem>} */
let _byId = new Map()
let _loaded = false

/**
 * Hydrate the registry from a provider. Call once, before constructing any
 * Avatar/CompanionStudio. Safe to call again to hot-swap the whole catalog.
 * @param {import('./CatalogProvider.js').CatalogProvider} [provider]
 * @returns {Promise<CosmeticItem[]>}
 */
export async function loadCatalog(provider = new LocalCatalogProvider()) {
  const items = await provider.fetchItems()
  _items = items
  _byId = new Map(items.map((it) => [it.id, it]))
  _loaded = true
  return _items
}

/** True once loadCatalog() has populated the registry. */
export function isCatalogLoaded() {
  return _loaded
}

/** Every loaded item (the array backing shop / inventory / randomize). */
export function allItems() {
  return _items
}

/** Look up an item by id (null for 'none' / unknown / before load). */
export function getItem(id) {
  return id && id !== 'none' ? _byId.get(id) || null : null
}

/** Items selectable for a slot (uses the mirror basis for right-side slots). */
export function itemsForSlot(slot) {
  const key = basisSlot(slot)
  return _items.filter((it) => it.slot === key)
}
