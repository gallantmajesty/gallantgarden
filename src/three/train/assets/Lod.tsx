// Distance LOD for static scenery, built on drei's <Detailed> (THREE.LOD under
// the hood — automatic frustum culling + per-distance mesh swap). The Library/
// avatar realms LOD animated avatars by hand; static world props are simpler:
// hand <Lod> an array of progressively cheaper children and the switch distances.
//
//   <Lod distances={[0, 28, 70]}>
//     <PineHigh />      {/* 0–28 m: full detail */}
//     <PineLow />       {/* 28–70 m: trunk + 2 cones */}
//     <PineBillboard /> {/* 70 m+: a single camera-facing card */}
//   </Lod>
//
// Switch distances scale with the user's view-distance / LOD-bias budget
// (store/settings ScenePreset): a higher lodBias pulls the cheap levels in
// closer; pass the preset's lodBias to `bias`.

import { Detailed } from '@react-three/drei'
import { type ReactNode } from 'react'

/** Scale a base distance ladder by the LOD bias (0 = full quality, 1.5 = shed
 *  detail aggressively). Higher bias → smaller distances → cheaper levels sooner. */
export function lodDistances(base: number[], bias = 0): number[] {
  const k = 1 / (1 + bias) // bias 0 → ×1, bias 1.5 → ×0.4
  return base.map((d) => Math.round(d * k))
}

// drei types <Detailed>'s children as an inline tuple of LOD levels, which makes
// it awkward to wrap with a dynamic children prop. One localised, documented cast
// to a permissive component type lets <Lod> accept normal ReactNode children while
// still rendering through the real THREE.LOD-backed component at runtime.
const DetailedAny = Detailed as unknown as (props: {
  distances: number[]
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  children?: ReactNode
}) => ReactNode

export function Lod({
  distances,
  bias = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  children,
}: {
  distances: number[]
  bias?: number
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  children: ReactNode
}) {
  return (
    <DetailedAny distances={lodDistances(distances, bias)} position={position} rotation={rotation} scale={scale}>
      {children}
    </DetailedAny>
  )
}
