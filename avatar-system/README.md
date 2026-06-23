# Avatar System

A Roblox-style avatar for the web, simplified for an indie game: **one fixed
skeleton, separate animation, modular cosmetics, clean logic** — built as a
**DOM/CSS layered rig** with **grayscale-mask tinting**, in **plain ES modules
(no build step)**.

It runs **today with zero image assets** — the base body and every cosmetic are
procedural CSS shapes. Drop in grayscale PNGs later by flipping one field; no
code changes.

> This is a **fresh** architecture. It does **not** touch, import, or reuse the
> old GLB-based `src/avatar/` system. There is no GLB editing and no runtime
> mutation of the model anywhere.

---

## Why DOM/CSS instead of 3D

- Mobile-first and cheap: no WebGL context, no model loading, no draconian asset
  pipeline. A handful of `<div>`s the GPU composites.
- The skeleton is the DOM tree, so **transforms compose for free** — rotate the
  torso and the head + arms follow, exactly like a bone hierarchy.
- Cosmetics are just child layers. Swapping a hat replaces one container.

---

## Core guarantees (the stability contract)

1. **The skeleton is built once and never restructured.** `AvatarModel` creates
   the bone tree from `data/rig.js` a single time. Nothing rewrites it.
2. **Animation only writes `transform` to bones.** It never adds, removes, or
   reshapes anything. (`animation/Animator.js`)
3. **Cosmetics are purely additive.** Items mount as children of a bone's slot
   container; swapping clears only that slot. The base body is untouched.
   (`core/Cosmetics.js`)
4. **No model mutation, ever.** The only "edits" are config-driven *tints*
   (recolouring procedural shapes / multiplying over grayscale art).

---

## Folder structure

```
avatar-system/
├─ index.html              Standalone demo: live customizer + walk/run/jump
├─ README.md
├─ data/                   DATA ONLY (no DOM, no logic)
│  ├─ rig.js               Bone hierarchy, joints, base body, slot map + art boxes
│  ├─ palettes.js          Tint swatches (skin / hair / cloth / feature)
│  ├─ CatalogProvider.js   Pluggable catalog source (Local JSON now / Remote later)
│  └─ catalog.js           Async loader + sync registry (getItem / itemsForSlot)
├─ AUTHORING.md            How to add cosmetics (schema + asset pipeline)
├─ core/                   THE MODEL + COSMETICS
│  ├─ schema.js            AvatarConfig + item schema, versioning, migration
│  ├─ tint.js              Grayscale-mask tinting + procedural shapes
│  ├─ AvatarModel.js       Immutable bone-tree builder (the "model")
│  ├─ Cosmetics.js         Attachment system (mount/swap layers on slots)
│  └─ Avatar.js            Public facade (wires everything + frame clock)
├─ animation/              ANIMATION (fully separate from the model)
│  ├─ clips.js             Keyframe data: idle / walk / run / jump
│  ├─ Animator.js          Sampler + crossfade, writes bone transforms
│  └─ StateMachine.js      Locomotion intent -> clip (emote hook included)
├─ controller/             LOGIC
│  └─ AvatarController.js  Input (keyboard / touch / code) -> movement + intent
└─ styles/
   └─ avatar.css           Shared paint rules (layout is data-driven, inline)
```

Clean separation as requested: **model** (`core/AvatarModel`), **animation**
(`animation/`), **cosmetics** (`core/Cosmetics` + `data/catalog`), **logic**
(`controller/`), tied together by the **`Avatar`** facade.

---

## Body hierarchy (rig)

Defined in `data/rig.js`. Bones are zero-size **joint anchors**; visible art is
offset from the joint so rotation pivots correctly. Parenting is chosen so limbs
animate independently (the required slots all exist — some are bones, some are
layer-slots on the head/torso):

```
AvatarRoot (ground point — controller moves & flips it)
└─ Torso              (pivot: hips)
   ├─ Head            (pivot: neck)
   │  ├─ HairBack     (behind the face)
   │  ├─ Eyes
   │  ├─ Mouth
   │  ├─ HairFront    (bangs, over the face)
   │  └─ Accessories  (hats / crowns)
   ├─ LeftArm         (pivot: shoulder — sleeve rides along)
   ├─ RightArm        (pivot: shoulder)
   └─ BackItem        (cape / wings — sways with torso)
└─ LeftLeg            (pivot: hip — steps independently of torso)
└─ RightLeg           (pivot: hip)
```

Clothing/cosmetics are **split by body part** (no merged full-body images), so
future emotes can rotate any limb without warping the art.

---

## Run the demo

It uses ES module imports, so serve it over HTTP (module fetch is blocked on
`file://`). From the project root:

```bash
npx vite avatar-system        # or: python -m http.server -d avatar-system
```

Then open the printed URL. Move with **← →** / **A D**, hold **Shift** to run,
**Space** / **↑** to jump. On touch, use the on-screen pad. Tinker live via
`window.avatar` in the console.

---

## Use it in code

```js
import { Avatar } from './avatar-system/core/Avatar.js'

const avatar = new Avatar({ parent: document.body, config: savedConfig /* or omitted */ })
avatar.attachController({ bounds: { min: -160, max: 160 } }).enable()
avatar.start()

// cosmetics
avatar.setSkin('tan')
avatar.equip('hairFront', 'hair_swept')
avatar.setTint('torso', 'cloth_forest')
avatar.equip('backItem', 'wings_starlet')

// animation (also driven automatically by the controller)
avatar.jump()
avatar.setLocomotion({ moving: true, running: true })

// persistence / multiplayer — plain JSON
const json = avatar.serialize()
localStorage.setItem('look', JSON.stringify(json))
```

`Avatar` is framework-agnostic; in the React app, mount `avatar.el` in a
`useEffect` and call `destroy()` on cleanup.

---

## Avatar config (persisted shape)

`core/schema.js`, versioned with `migrateConfig()` for safe upgrades:

```js
{
  v: 2,
  height: 1,                 // uniform scale — fixed for all players today
  skin: 'light',             // swatch id, tints all base body parts
  equipped: { hairFront:'hair_short', torso:'top_tee', /* …every slot… */ },
  tints:    { hairFront:'hair_brown', torso:'cloth_indigo', /* …per slot… */ },
}
```

## Item schema (marketplace-ready)

Every cosmetic in `data/catalog.js` carries forward-compatible economy fields so
the marketplace can grow without a migration:

```js
{
  id, name, slot, tint, defaultTint, art,
  rarity,        // common | uncommon | rare | epic | legendary | mythic
  obtainMethod,  // default | shop | quest | event | craft | reward | premium
  tradeable,     // boolean
  limited,       // boolean (time/quantity-limited collectible)
  price,         // soft-currency cost (optional)
}
```

---

## Adding cosmetics (data-driven — no code)

The catalog is **data**, loaded at boot from `public/cosmetics.json` through a
`CatalogProvider`. Adding a cosmetic is two steps and touches **no `.js`**:

1. Drop the grayscale PNG pack into `public/cosmetics/<id>/`.
2. Add one entry to `public/cosmetics.json`:

```jsonc
{ "id": "hair_swept", "name": "Swept", "slot": "hairFront",
  "tint": true, "defaultTint": "hair_brown",
  "assets": { "hairFront": "hair_swept/front.png" } }
```

The loader expands `assets` into tinted image layers (size/placement default from
`SLOT_ART_BOX` in `data/rig.js`). A missing PNG renders the procedural fallback,
so you can list art before it's baked. Procedural `art:[…]` items are still valid
in the same JSON (the starter catalog uses them).

**Full schema, slot art-boxes, and grayscale rules:
[`AUTHORING.md`](./AUTHORING.md).** Swap `LocalCatalogProvider` →
`RemoteCatalogProvider` later to source the catalog from a marketplace; nothing
else changes.

---

## Extending later (already designed for it)

- **Emotes / sit / sleep / read / dance** — add a clip to `animation/clips.js`
  and `avatar.emote('wave')`. Looping holds (sit/sleep) use `loop:true` ended by
  a release. No model changes.
- **Pets / companions** — instantiate a second `Avatar` (or a lighter rig) and
  parent it near the player; the same clock/controller patterns apply.
- **Marketplace** — items already carry rarity/obtain/tradeable/limited/price;
  filter `ITEMS` to build shop, inventory, and trade UIs.
- **One base model only** — there is exactly one rig (`data/rig.js`) and no
  alternate/broken model files in the pipeline.
```
