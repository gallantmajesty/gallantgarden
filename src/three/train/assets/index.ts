// Barrel for the Train Station Realm asset system: shared material/geometry
// registry, instancing workhorses, GLB hero loader (+ procedural fallback) and
// scenery LOD. Import from here so the rest of the realm has one entry point.

export { MAT, material, boxGeo, cylGeo, type MatSpec } from './registry'
export { InstancedBoxes, InstancedShape, type BoxItem, type ShapeItem } from './instanced'
export { Hero, preloadTrainAssets, type HeroProps } from './Hero'
export { TRAIN_ASSETS, presentAssetUrls, type HeroName, type HeroDef } from './manifest'
export { Lod, lodDistances } from './Lod'
