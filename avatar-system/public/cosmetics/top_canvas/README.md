# `top_canvas` — example PNG-pack cosmetic

The reference asset pack the catalog ships with. Its JSON entry
(`top_canvas` in `../../cosmetics.json`) declares:

```jsonc
"assets": {
  "torso":   "top_canvas/torso.png",   // grayscale, ~66x66 px @ left -33, top -66
  "leftArm": "top_canvas/arm.png"      // grayscale sleeve, ~20x50 px @ left -10, top -2
}                                       // leftArm art is auto-mirrored to rightArm
```

Drop the two grayscale PNGs into this folder to see real art render — no code or
JSON change required. Until then, `top_canvas` renders the procedural fallback
shape (proving the missing-asset path degrades gracefully).

**Authoring a part:**
- Grayscale only: **mid-grey = full tint**, white = highlight, black = shadow.
- Size/place to the slot box in `AUTHORING.md` (or override `w/h/left/top` in the
  JSON `assets` entry).
- Transparent background; trim to the silhouette.
