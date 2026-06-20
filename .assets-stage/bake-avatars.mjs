// Bake the Mixamo character packs into web-ready, animated .glb files.
//
// For each character we take the skinned mesh FBX + a handful of locomotion clip
// FBX (idle/walk/run/jump) out of its "Locomotion Pack.zip", convert each to glTF
// with fbx2gltf, then MERGE every clip's animation onto the mesh's skeleton —
// retargeting channels by normalized bone name so a differing `mixamorigN:`
// prefix between exports doesn't matter. The result is one compressed .glb per
// character (mesh + named clips: idle/walk/run/jump) under public/models/avatars.
//
//   node .assets-stage/bake-avatars.mjs
//
// Requires (already dev-deps): fbx2gltf, @gltf-transform/*, meshoptimizer, sharp.
// The runtime (CharacterAvatar.tsx) matches clip names fuzzily, so exact casing
// here is not critical.

import { execSync } from 'node:child_process'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import convert from 'fbx2gltf'
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions'
import { mergeDocuments, prune, dedup, weld, textureCompress, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const DL = path.join(homedir(), 'Downloads')
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..')
const OUT_DIR = path.join(ROOT, 'public', 'models', 'avatars')
const TMP = path.join(ROOT, '.assets-stage', 'avatars-tmp')

const CHARACTERS = [
  { id: 'james', dir: 'james', mesh: 'Ch06_nonPBR.fbx' },
  { id: 'megan', dir: 'Megan', mesh: 'Ch22_nonPBR.fbx' },
  { id: 'luise', dir: 'luise', mesh: 'Ch07_nonPBR.fbx' },
]

// Source clip filename -> baked animation name. These four live in every pack.
const CLIPS = [
  { file: 'idle.fbx', name: 'idle' },
  { file: 'walking.fbx', name: 'walk' },
  { file: 'running.fbx', name: 'run' },
  { file: 'jump.fbx', name: 'jump' },
]

// Optional standalone clips dropped next to the pack (NOT inside the zip). Each
// is baked + named only if the file exists, so the script stays green before
// they finish downloading. Download a Mixamo "Sitting Idle" per character to
// light up the seated pose; the runtime plays `sit` whenever the player sits.
const OPTIONAL_CLIPS = [
  { file: 'Sitting Idle.fbx', name: 'sit' },
  { file: 'Sit To Stand.fbx', name: 'sit_to_stand' },
  { file: 'Stand To Sit.fbx', name: 'stand_to_sit' },
]

const norm = (n) => (n ? n.split(':').pop() : n) // mixamorig9:Hips -> Hips

function unzipTo(zip, member, dest) {
  // -o overwrite, -j flatten. Git-Bash unzip is available in this environment.
  execSync(`unzip -o -j "${zip}" "${member}" -d "${dest}"`, { stdio: 'ignore' })
  return path.join(dest, path.basename(member))
}

async function bakeCharacter(io, char) {
  const zip = path.join(DL, char.dir, 'Locomotion Pack.zip')
  if (!existsSync(zip)) throw new Error(`missing pack: ${zip}`)
  const work = path.join(TMP, char.id)
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })

  // 1. mesh fbx -> base glb (standard PBR so it lifts under scene lighting)
  console.log(`[${char.id}] converting mesh ${char.mesh}…`)
  const meshFbx = unzipTo(zip, char.mesh, work)
  const baseGlb = path.join(work, 'base.glb')
  await convert(meshFbx, baseGlb, ['--binary'])
  const baseDoc = await io.read(baseGlb)

  // drop any animation the mesh export carried; we add clean clips below
  baseDoc.getRoot().listAnimations().forEach((a) => a.dispose())

  // index the base skeleton by normalized bone name (captured before merges)
  const baseBones = new Map()
  for (const node of baseDoc.getRoot().listNodes()) baseBones.set(norm(node.getName()), node)

  // merge one clip glb's animation onto the base skeleton (retarget by bone name)
  async function mergeClip(clipFbx, name) {
    const clipGlb = path.join(work, `${name}.glb`)
    await convert(clipFbx, clipGlb, ['--binary'])
    const clipDoc = await io.read(clipGlb)
    const srcAnim = clipDoc.getRoot().listAnimations()[0]
    if (!srcAnim) {
      console.warn(`[${char.id}] ${name} has no animation, skipping`)
      return
    }
    const map = mergeDocuments(baseDoc, clipDoc)
    const anim = map.get(srcAnim)
    anim.setName(name)
    let rebound = 0
    for (const ch of anim.listChannels()) {
      const tgt = ch.getTargetNode()
      const base = tgt && baseBones.get(norm(tgt.getName()))
      if (base) {
        ch.setTargetNode(base)
        rebound++
      }
    }
    // dispose the duplicated scene + skeleton the merge dragged in (channels are
    // now rebound to the base skeleton, so these are orphaned)
    for (const s of clipDoc.getRoot().listScenes()) map.get(s)?.dispose()
    for (const n of clipDoc.getRoot().listNodes()) map.get(n)?.dispose()
    console.log(`[${char.id}] + ${name} (${rebound}/${anim.listChannels().length} channels rebound)`)
  }

  // 2a. core locomotion clips from the pack zip (always present)
  for (const clip of CLIPS) {
    await mergeClip(unzipTo(zip, clip.file, work), clip.name)
  }
  // 2b. optional standalone clips dropped next to the pack (sit, transitions)
  for (const clip of OPTIONAL_CLIPS) {
    const standalone = path.join(DL, char.dir, clip.file)
    if (existsSync(standalone)) await mergeClip(standalone, clip.name)
  }

  // 3. report bind-pose mesh height so character.scale can be set precisely
  let minY = Infinity
  let maxY = -Infinity
  for (const mesh of baseDoc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      const el = [0, 0, 0]
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, el)
        if (el[1] < minY) minY = el[1]
        if (el[1] > maxY) maxY = el[1]
      }
    }
  }
  const height = Number.isFinite(maxY - minY) ? (maxY - minY).toFixed(2) : '?'
  console.log(`[${char.id}] bind-pose mesh height ≈ ${height} units  (set scale ≈ ${(1.7 / (maxY - minY)).toFixed(4)} in characters.ts)`)

  // 4. optimize: weld, prune, dedup, resize textures, meshopt-compress
  await baseDoc.transform(
    weld(),
    prune(),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  )

  // merging dragged in one buffer per source doc; a GLB allows only one, so fold
  // every accessor onto the first buffer and drop the rest
  const buf = baseDoc.getRoot().listBuffers()[0]
  baseDoc.getRoot().listAccessors().forEach((a) => a.setBuffer(buf))
  baseDoc.getRoot().listBuffers().forEach((b, i) => { if (i > 0) b.dispose() })

  const out = path.join(OUT_DIR, `${char.id}.glb`)
  await io.write(out, baseDoc)
  console.log(`[${char.id}] -> ${path.relative(ROOT, out)}\n`)
}

async function main() {
  await MeshoptEncoder.ready
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, EXTTextureWebP])
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': null })
  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(TMP, { recursive: true })
  for (const char of CHARACTERS) {
    try {
      await bakeCharacter(io, char)
    } catch (e) {
      console.error(`[${char.id}] FAILED:`, e.message)
    }
  }
  console.log('done.')
}

main()
