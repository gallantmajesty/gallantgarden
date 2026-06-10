import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, weld, resample, textureCompress } from '@gltf-transform/functions'
import sharpMod from 'sharp'
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const [src,dst,alphaMatch] = process.argv.slice(2)
const doc = await io.read(src)
// mark leaf materials as alpha-masked so cutout works
if (alphaMatch) {
  for (const m of doc.getRoot().listMaterials()) {
    if (m.getName().toLowerCase().includes(alphaMatch)) {
      m.setAlphaMode('MASK'); m.setAlphaCutoff(0.5); m.setDoubleSided(true)
    }
  }
}
await doc.transform(dedup(), weld(), prune())
await io.write(dst, doc)
console.log('wrote', dst)
