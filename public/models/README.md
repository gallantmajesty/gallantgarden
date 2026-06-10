# Tree models (drop your GLB files here)

The kingdom loads realistic trees from this folder. Until a file is present, each
tree falls back to a stylized procedural tree automatically — so the app always
works, and gets more realistic the moment you add models.

## Current models (converted from your Downloads/Render packs)

These were converted from the OBJ packs you downloaded and are already wired in:

| File         | Source pack        | Used as          |
| ------------ | ------------------ | ---------------- |
| `maple.glb`  | 47-mapletree.zip   | Maple / Red Maple |
| `palm.glb`   | Date_palm.rar      | Date Palm / Oasis Palm |
| `castle.glb` | castle.zip         | Kingdom centerpiece |

The variant→species mapping (and per-model scale) lives in `src/lib/types.ts`
(`TREE_SPECIES`). Tune `scale` / `yOffset` there if a tree sits too big/small or
floats off the ground.

### Packs that still need Blender
`grass`, `mountain`, `lowpolychunk`, and `Scene_Morning` are **.blend only** — I
can't convert those without Blender. To use them: open in Blender →
`File → Export → glTF 2.0 (.glb)` → drop the result here and add an entry to
`TREE_SPECIES` (or wire it like the castle).

## Where to get free, realistic CC0 trees

All of these allow commercial use, no attribution required (CC0):

- **Poly Haven** — https://polyhaven.com/models (filter: Nature). Download the
  **glTF** version.
- **Quaternius** — https://quaternius.com (great stylized + realistic nature packs,
  already game-optimized / low-draw).
- **Sketchfab** — https://sketchfab.com (filter Downloadable + CC0). Export as glTF/GLB.

## Preparing a model

1. Download the model (glTF `.glb` preferred — single file).
2. If it's a `.gltf` + textures, open it in **Blender** (free) and
   `File → Export → glTF 2.0 (.glb)` to get one bundled file.
3. Rename it to one of the filenames above and drop it here.
4. Scale guidance: the procedural trees are ~5 units tall and rooted at y=0.
   Aim for a similar height so it sits on the ground. You can tweak per-model
   scale/offset in `src/three/TreeMesh.tsx` (`GLBTree`) if needed.

## Performance tips

- Prefer models **under ~2 MB** each; foliage cards beat dense leaf meshes.
- If a model uses **Draco** compression, it still works (decoder is loaded from
  Google's CDN automatically by `useGLTF`).
- Reuse the same few species across many trees — they're cloned, not re-downloaded.
