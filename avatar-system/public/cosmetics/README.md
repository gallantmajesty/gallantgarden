# `public/cosmetics/` — cosmetic asset packs

One **folder per cosmetic**, named by the item's `id`. Each folder holds the
grayscale PNG(s) for the rig slots that cosmetic covers (plus an optional tint
`mask.png`). The catalog entry in [`../cosmetics.json`](../cosmetics.json) points
at these files via its `assets` map.

```
cosmetics/
├─ <item_id>/
│  ├─ <slot>.png        grayscale art, sized in the rig's stage pixels
│  ├─ <slot>.png        (one per slot the item covers)
│  └─ mask.png          OPTIONAL — restricts tinting to a region
└─ …
```

Slot file names are by convention (`torso.png`, `arm.png`, `front.png`,
`back.png`, `leg.png`, …); the binding is whatever path the JSON `assets` map
gives, so names are free — the map is the source of truth.

**Authoring rules, the JSON schema, and the per-slot size/placement table live in
[`../../AUTHORING.md`](../../AUTHORING.md).**

Adding a cosmetic = drop a folder here + add one JSON entry. No code changes.
Until a PNG exists, the item renders its procedural shape fallback automatically,
so referencing not-yet-authored art never breaks the avatar.
