// effects.js — the "cosmetics feel rewarding" layer. When an item declares
// `glow:true` and/or `particle:'sparkle'|'petal'`, we attach a soft aura and a
// twinkle emitter to that item's slot, so it lights up the instant it's worn
// (e.g. Starlight Wings glow + sparkle; Focus Halo shimmers). Removing the item
// removes its effects. Effects live inside the slot, so they ride the animation.

import { getItem } from '../data/catalog.js'
import { hexOf } from '../data/palettes.js'
import { fillSparkles, fillPetals } from './Particles.js'
import { SLOTS } from '../data/rig.js'

export class CosmeticEffects {
  /** @param {import('../core/AvatarModel.js').AvatarModel} model */
  constructor(model) {
    this.model = model
    /** @type {Map<string,HTMLElement>} slot -> effect container */
    this._fx = new Map()
  }

  /** (Re)build effects for one slot from its current item + tint. */
  apply(slot, item, tintSwatch) {
    // clear previous
    const old = this._fx.get(slot)
    if (old) { old.remove(); this._fx.delete(slot) }

    if (!item || (!item.glow && !item.particle)) return
    const container = this.model.slot(slot)
    if (!container) return

    const fx = document.createElement('div')
    fx.className = 'cosmetic-fx'

    if (item.glow) {
      const glow = document.createElement('div')
      glow.className = 'cosmetic-glow'
      // tie the aura to the item's colour for a cohesive look
      const hex = item.tint ? hexOf(tintSwatch || item.defaultTint) : '#b9a3ff'
      glow.style.background =
        `radial-gradient(ellipse at center, ${hex}cc 0%, ${hex}55 40%, transparent 72%)`
      fx.appendChild(glow)
    }

    if (item.particle === 'sparkle') {
      const sp = document.createElement('div')
      sp.className = 'cosmetic-sparkles'
      fillSparkles(sp, 10)
      fx.appendChild(sp)
    } else if (item.particle === 'petal') {
      const pl = document.createElement('div')
      pl.className = 'cosmetic-petals'
      fillPetals(pl, { count: 8, color: 'rgba(247,201,232,.9)' })
      fx.appendChild(pl)
    }

    container.appendChild(fx)
    this._fx.set(slot, fx)
  }

  /** Rebuild every slot's effects from a full config. */
  applyAll(config) {
    for (const slot of SLOTS) {
      this.apply(slot, getItem(config.equipped[slot]), config.tints[slot])
    }
  }
}
