// Hero-asset manifest for the Train Station Realm. Maps a logical hero name to an
// (optional) GLB under public/models/train/ plus placement metadata. This is the
// ONE place to wire a downloaded/optimised GLB in: drop the file, set
// `present: true`, and every <Hero name="..."> swaps from its procedural fallback
// to the model with no other code change (mirrors the avatar base.glb convention
// in src/avatar/baseBody.ts + the public/models drop-in workflow).
//
// Until a GLB lands, `present: false` means <Hero> renders its procedural
// fallback directly and issues ZERO network requests (no 404s, no loader churn).
// Source CC0 low-poly packs (Quaternius / Kenney / Poly Pizza), stage in
// .assets-stage/train/, optimise with the installed @gltf-transform tooling
// (Draco/meshopt), then output to public/models/train/<file>.glb.

export type HeroName =
  // station props
  | 'bench'
  | 'lantern'
  | 'clock'
  | 'luggage'
  | 'cart'
  | 'trashBin'
  | 'plantPalm'
  | 'plantFern'
  | 'kiosk'
  // train
  | 'locomotive'
  | 'carriage'
  // outside world (instanced scenery)
  | 'pine'
  | 'rock'
  | 'house'
  | 'bridge'

export interface HeroDef {
  /** file under public/models/train/ — undefined until an asset is sourced */
  url?: string
  /** uniform scale applied to the loaded model to match world units */
  scale?: number
  /** vertical offset so the model's origin sits on the floor */
  yOffset?: number
  /** flip to true once the GLB is present & optimised in public/models/train/ */
  present: boolean
  /** human note on intended source / licence, for the asset pipeline */
  source?: string
}

export const TRAIN_ASSETS: Record<HeroName, HeroDef> = {
  bench: { url: 'train/bench.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 low-poly bench' },
  lantern: { url: 'train/lantern.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 station lamp' },
  clock: { url: 'train/clock.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 station clock' },
  luggage: { url: 'train/luggage.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 suitcase/trunk' },
  cart: { url: 'train/cart.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 luggage cart' },
  trashBin: { url: 'train/bin.glb', scale: 1, yOffset: 0, present: false },
  plantPalm: { url: 'train/palm.glb', scale: 1, yOffset: 0, present: false, source: 'reuse /models/palm.glb candidate' },
  plantFern: { url: 'train/fern.glb', scale: 1, yOffset: 0, present: false },
  kiosk: { url: 'train/kiosk.glb', scale: 1, yOffset: 0, present: false },
  locomotive: { url: 'train/locomotive.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 steam loco' },
  carriage: { url: 'train/carriage.glb', scale: 1, yOffset: 0, present: false, source: 'CC0 passenger car' },
  pine: { url: 'train/pine.glb', scale: 1, yOffset: 0, present: false, source: 'Quaternius nature' },
  rock: { url: 'train/rock.glb', scale: 1, yOffset: 0, present: false },
  house: { url: 'train/house.glb', scale: 1, yOffset: 0, present: false },
  bridge: { url: 'train/bridge.glb', scale: 1, yOffset: 0, present: false },
}

/** Every present GLB url — call to warm the drei cache (see Hero.preloadTrainAssets). */
export function presentAssetUrls(): string[] {
  return Object.values(TRAIN_ASSETS)
    .filter((d) => d.present && d.url)
    .map((d) => `/models/${d.url}`)
}
