// Cosmetics.js — the ATTACHMENT SYSTEM. Cosmetics are *additive*: an item's art
// is mounted as children of a bone's slot container. Swapping an item replaces
// only that slot's contents; the bone-tree and base body are never touched.
// Because slots live inside bones, worn art inherits the bone's animation
// transform automatically (a sleeve swings with its arm).
//
// An item may be SINGLE-slot (legacy `art` + `slot`) or MULTI-slot (`layers[]`,
// one entry per bone it covers — e.g. a hoodie paints torso + both arms). For a
// given slot we render the matching layer; right-side slots fall back to the
// left ("basis") authoring so mirrored pieces need authoring only once.

import { getItem, basisSlot } from '../data/catalog.js'
import { hexOf } from '../data/palettes.js'
import { buildLayer } from './tint.js'
import { SLOTS } from '../data/rig.js'

/** The art spec an item contributes to a particular slot (or null). */
function artForSlot(item, slot) {
  if (item.layers) {
    const l = item.layers.find((L) => L.slot === slot)
      || item.layers.find((L) => L.slot === basisSlot(slot))
    return l ? l.art : null
  }
  // single-slot item: paints its own slot (and the mirror of it)
  if (item.slot === slot || item.slot === basisSlot(slot)) return item.art
  return null
}

export class Cosmetics {
  /** @param {import('./AvatarModel.js').AvatarModel} model */
  constructor(model) {
    this.model = model
  }

  /** Render a single slot from an item id + optional tint swatch. */
  applySlot(slot, itemId, tintSwatch) {
    const container = this.model.slot(slot)
    if (!container) return
    container.replaceChildren() // clear previous layer (safe, fast, no leaks)

    const item = getItem(itemId)
    if (!item) return // 'none' / unknown -> empty slot

    const art = artForSlot(item, slot)
    if (!art) return

    const hex = item.tint ? hexOf(tintSwatch || item.defaultTint) : '#ffffff'
    container.appendChild(buildLayer(art, hex))
  }

  /** Render every slot + the skin from a full config. */
  apply(config) {
    this.model.setSkin(config.skin)
    for (const slot of SLOTS) {
      this.applySlot(slot, config.equipped[slot], config.tints[slot])
    }
  }
}
