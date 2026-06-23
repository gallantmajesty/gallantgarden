// CatalogProvider.js — the pluggable SOURCE of the cosmetic catalog.
//
// The runtime (Avatar / Cosmetics / effects / studio) never talks to a provider
// directly. It calls `loadCatalog(provider)` ONCE at boot (see data/catalog.js),
// which hydrates a synchronous registry. Everything downstream then uses the
// sync helpers (getItem / itemsForSlot). Swapping the data source — local JSON
// today, a remote Insforge marketplace later — changes ONLY the boot line; no
// avatar, studio, or marketplace code changes.
//
//   CatalogProvider            (interface)
//   ├─ LocalCatalogProvider    fetch public/cosmetics.json   (now)
//   └─ RemoteCatalogProvider   fetch a marketplace endpoint  (future stub)
//
// A provider's job is to return an array of items in the INTERNAL render shape
// (the one core/Cosmetics.js consumes). `normalizeItem()` does that translation,
// so authored JSON can stay terse: an item names its grayscale PNGs by slot in
// an `assets` map and the loader expands them into tinted image layers — with a
// procedural shape fallback baked in, so a missing PNG still renders.

import { basisSlot, SLOT_ART_BOX } from './rig.js'

/**
 * Convert ONE authored catalog entry into the internal render shape.
 *
 * Two authoring styles are accepted and both end up as something Cosmetics.js
 * already knows how to mount:
 *   • PNG pack  — `assets: { slot: 'id/file.png' | {src,w,h,left,top,maskSrc} }`
 *                  -> expanded to `layers: [{ slot, art:[{kind:'image', …}] }]`
 *   • Procedural — legacy `art` / `layers` are passed through untouched (lets the
 *                  starter catalog keep CSS-shape art until baked PNGs exist).
 *
 * @param {object} entry      Raw item from cosmetics.json.
 * @param {string} assetBase  URL prefix for asset paths (default '/cosmetics/').
 * @returns {object} item in internal shape.
 */
export function normalizeItem(entry, assetBase = '/cosmetics/') {
  // Procedural / already-internal items need no translation.
  if (!entry.assets) return { ...entry }

  const item = { ...entry }
  item.layers = Object.entries(entry.assets).map(([slot, val]) => {
    const spec = typeof val === 'string' ? { src: val } : { ...val }
    const box = SLOT_ART_BOX[basisSlot(slot)] || {}
    const geom = {
      w: spec.w ?? box.w,
      h: spec.h ?? box.h,
      left: spec.left ?? box.left,
      top: spec.top ?? box.top,
      ...(spec.radius != null ? { radius: spec.radius } : {}),
    }
    const layer = { kind: 'image', src: assetBase + spec.src, ...geom }
    // Optional per-region tint mask (intersected with the art mask by tint.js).
    const mask = spec.maskSrc || entry.mask
    if (mask) layer.maskSrc = assetBase + mask
    // Graceful degrade: if the PNG 404s, render the same-sized procedural shape.
    layer.fallback = { kind: 'shape', ...geom }
    return { slot, art: [layer] }
  })
  delete item.assets
  delete item.mask
  return item
}

/** Provider interface. Subclasses implement `fetchItems()`. */
export class CatalogProvider {
  /** @returns {Promise<object[]>} items in the internal render shape. */
  async fetchItems() {
    throw new Error('CatalogProvider.fetchItems() not implemented')
  }
}

/** Loads the catalog from a local JSON file shipped in /public. */
export class LocalCatalogProvider extends CatalogProvider {
  /** @param {{url?:string, assetBase?:string}} [opts] */
  constructor({ url = '/cosmetics.json', assetBase = '/cosmetics/' } = {}) {
    super()
    this.url = url
    this.assetBase = assetBase
  }

  async fetchItems() {
    const res = await fetch(this.url)
    if (!res.ok) throw new Error(`cosmetics.json fetch failed: ${res.status}`)
    const data = await res.json()
    const items = Array.isArray(data) ? data : data.items || []
    return items.map((e) => normalizeItem(e, this.assetBase))
  }
}

/**
 * FUTURE: a remote, marketplace-backed catalog (e.g. Insforge). Returns the
 * SAME normalized shape, so nothing downstream changes when we switch to it.
 * Left intentionally unimplemented in this phase.
 */
export class RemoteCatalogProvider extends CatalogProvider {
  /** @param {{endpoint:string, assetBase?:string, token?:string}} opts */
  constructor({ endpoint, assetBase = '/cosmetics/', token } = {}) {
    super()
    this.endpoint = endpoint
    this.assetBase = assetBase
    this.token = token
  }

  async fetchItems() {
    throw new Error('RemoteCatalogProvider is not implemented yet (phase: marketplace)')
  }
}
