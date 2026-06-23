# Authoring cosmetics — the data-driven pipeline

The avatar's wardrobe is **data, not code**. The catalog lives in
`public/cosmetics.json`; art lives in `public/cosmetics/<id>/`. Adding a cosmetic
is two steps and **never touches `.js`**:

1. Drop the asset folder into `public/cosmetics/<id>/`.
2. Add one entry to `public/cosmetics.json`.

The game reads the catalog through a **provider** at boot, so the same JSON works
locally today and from a remote marketplace later with no avatar/studio changes.

```
load path:  index.html
              └─ await loadCatalog(new LocalCatalogProvider())   // data/catalog.js
                   └─ fetch /cosmetics.json                       // data/CatalogProvider.js
                        └─ normalizeItem(entry)  → internal render shape
runtime:    getItem(id) · itemsForSlot(slot) · allItems()         // synchronous
render:     core/Cosmetics.js mounts each item's layers on a bone slot
```

---

## The two authoring styles

An item is either **procedural** (CSS shapes — no assets) or a **PNG pack**
(grayscale art). Both are valid in the same `cosmetics.json`; mix freely.

### A. PNG pack (the long-term format)
Name each grayscale PNG by the rig slot it covers under `assets`. The loader
expands it into a tinted image layer, filling size/placement from the per-slot
default box (below) so you usually only give `src`.

```jsonc
{
  "id": "top_hoodie", "name": "Study Hoodie", "slot": "torso",
  "tint": true, "defaultTint": "cloth_indigo",
  "assets": {
    "torso":   "top_hoodie/torso.png",
    "leftArm": "top_hoodie/arm.png"     // auto-mirrored to rightArm
  },
  "mask": "top_hoodie/mask.png",        // OPTIONAL — limits the tint region
  "rarity": "epic", "obtainMethod": "shop", "price": 320
}
```

Per-slot override when art needs a custom footprint:
```jsonc
"assets": { "torso": { "src": "x/torso.png", "w": 70, "h": 68, "left": -35, "top": -68 } }
```

### B. Procedural (used by the starter catalog until PNGs are baked)
```jsonc
{
  "id": "mouth_soft", "name": "Soft Smile", "slot": "mouth",
  "tint": true, "defaultTint": "cloth_rose",
  "art": [ { "w": 16, "h": 8, "left": -8, "top": -22, "radius": "0 0 10px 10px" } ]
}
```
`art` shapes pass through untouched. Shape kinds: omit `kind` for a tinted box;
`"flat": true` opts out of tinting (decals, eye-whites); `border`/`fill`/`radius`
behave like CSS.

---

## Item schema

| Field | Req | Meaning |
|---|---|---|
| `id` | ✓ | Unique, kebab/snake. Matches the asset folder name. |
| `name` | ✓ | Display label. |
| `slot` | ✓ | Primary slot (also the customizer tab + mirror basis). See slots below. |
| `tint` | ✓ | `true` = recolour with `config.tints[slot]` (grayscale art); `false` = full-colour. |
| `defaultTint` | — | Swatch id used when none chosen (see `data/palettes.js`). |
| `assets` | A | `{ slot: "path.png" | {src,w,h,left,top,maskSrc,radius} }`. |
| `mask` | — | Pack-wide tint mask (per-slot `maskSrc` overrides it). |
| `art` | B | Procedural shape array (instead of `assets`). |
| `sleeve` | — | A Top may name a sleeve item auto-equipped on both arms. |
| `glow` | — | `true` adds a soft aura (`scene/effects.js`). |
| `particle` | — | `"sparkle"` or `"petal"` emitter on the slot. |
| `rarity` | — | `common·uncommon·rare·epic·legendary·mythic`. |
| `obtainMethod` | — | `default·shop·quest·event·craft·reward·premium`. |
| `tradeable` `limited` `price` | — | Marketplace fields (forward-compatible). |

`A`/`B` = supply exactly one of `assets` or `art`.

---

## Rig slots & default art boxes

Slots (mirror pairs author the LEFT side only; right reuses it):
`hairBack · hairFront · eyes · face · mouth · torso · leftArm(/rightArm) ·
leftLeg(/rightLeg) · leftShoe(/rightShoe) · accessories · backItem`.

Default image geometry (`data/rig.js` → `SLOT_ART_BOX`), in **stage pixels**
(bone-local; `0,0` = the bone joint; face centre ≈ `(0,-45)`; head ≈ 100px):

| slot | w × h | left, top |
|---|---|---|
| hairFront | 118 × 64 | −59, −104 |
| hairBack | 124 × 150 | −62, −96 |
| eyes | 64 × 34 | −33, −58 |
| face | 72 × 40 | −36, −58 |
| mouth | 24 × 14 | −12, −24 |
| torso | 66 × 66 | −33, −66 |
| leftArm | 20 × 50 | −10, −2 |
| leftLeg | 22 × 58 | −11, −2 |
| leftShoe | 24 × 18 | −12, 48 |
| accessories | 116 × 46 | −58, −110 |
| backItem | 96 × 100 | −48, −78 |

---

## Grayscale tinting rules

Author tintable parts in **grayscale**: **mid-grey (~#808080) = 100% of the
chosen swatch**, white = highlight, black = shadow. At runtime the swatch hex is
multiplied over the art (`core/tint.js`), so one PNG → every colour with shading
preserved. Use a transparent background and trim to the silhouette. For art that
must keep its own colours (printed logos, eyes with whites) set `"flat": true` or
use a `"flat"`-kind layer.

---

## Graceful fallback (why broken refs are safe)

Every expanded image layer carries a same-sized procedural **fallback**. If a PNG
is missing or 404s, the avatar renders the fallback shape instead of a blank slot
(`core/tint.js` `img.onerror`). So you can list a cosmetic in `cosmetics.json`
before its art is baked — it still looks complete, and the moment the PNG lands it
renders with zero code changes. The shipped `top_canvas` item demonstrates this.

---

## Swapping the catalog source (future)

`LocalCatalogProvider` reads `/cosmetics.json`. A `RemoteCatalogProvider`
(Insforge-backed) is stubbed in `data/CatalogProvider.js` and returns the SAME
normalized shape — so going remote changes only the one boot line in `index.html`.
Configure paths when serving from elsewhere:
`new LocalCatalogProvider({ url: '/cosmetics.json', assetBase: '/cosmetics/' })`.
