// Barrel export for all optimization modules.

export { ObjectPool, createDustPool, createSoundPool, createUIPool } from './ObjectPool'
export type { PoolOptions } from './ObjectPool'

export {
  resolveLOD, triBudget, biasLOD, computeLOD, useLODConfig,
} from './LODManager'
export type { LODQuality, LODLevel, LODConfig, LODState } from './LODManager'

export {
  buildInteriorAtlas, applyAtlasUV,
} from './TextureAtlas'
export type { AtlasRegion, InteriorAtlas } from './TextureAtlas'

export { buildLightmap } from './Lightmapper'
export type { LightmapResult } from './Lightmapper'

export {
  mergeGeometries, InstancedMeshPool, createSeatInstances,
} from './BatchManager'
export type { BatchDef } from './BatchManager'

export {
  updateFrustum, isInFrustum, OcclusionCuller,
} from './CullingManager'

export { TrainPerfMonitor } from './PerformanceMonitor'
export type { PerfSnapshot, PerfConfig } from './PerformanceMonitor'
