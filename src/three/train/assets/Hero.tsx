// <Hero> — render a high-quality GLB hero asset when one is present, else fall
// back to a procedural component, with the same graceful-degradation guarantee as
// the avatar system (src/avatar/CharacterAvatar.tsx): a missing or broken model
// never blanks the scene, it just shows the handcrafted procedural version.
//
// Why a boundary AND a manifest gate: the manifest `present` flag avoids issuing
// any network request for assets we haven't sourced yet (the common case today);
// the error boundary additionally protects against a present-but-broken file.
//
//   <Hero name="bench" position={[x, 0, z]} rotation={[0, yaw, 0]} castShadow
//         fallback={<ProceduralBench />} />
//
// For REPEATED scenery (trees, rocks) prefer instancing the procedural fallback
// or a GLB's geometry via ./instanced — <Hero> is for one-off / low-count placements.

import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { Object3D } from 'three'
import { TRAIN_ASSETS, presentAssetUrls, type HeroName } from './manifest'

class HeroBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function GltfHero({ url, scale, yOffset }: { url: string; scale: number; yOffset: number }) {
  const { scene } = useGLTF(`/models/${url}`)
  const cloned = useMemo(() => {
    const c = scene.clone(true) as Object3D
    c.traverse((o) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return c
  }, [scene])
  return <primitive object={cloned} scale={scale} position={[0, yOffset, 0]} />
}

export interface HeroProps {
  name: HeroName
  fallback: ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
  /** multiplies the manifest scale */
  scale?: number
}

export function Hero({ name, fallback, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: HeroProps) {
  const def = TRAIN_ASSETS[name]
  // No sourced asset yet → render the procedural fallback directly (zero fetches).
  if (!def.present || !def.url) {
    return (
      <group position={position} rotation={rotation}>
        {fallback}
      </group>
    )
  }
  return (
    <group position={position} rotation={rotation}>
      <HeroBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <GltfHero url={def.url} scale={(def.scale ?? 1) * scale} yOffset={def.yOffset ?? 0} />
        </Suspense>
      </HeroBoundary>
    </group>
  )
}

/** Warm the drei GLTF cache for every present hero asset, so the first placement
 *  doesn't hitch. No-op while the manifest has no present assets. Call once at
 *  module load (like TreeMesh.tsx's useGLTF.preload). */
export function preloadTrainAssets(): void {
  for (const url of presentAssetUrls()) useGLTF.preload(url)
}

preloadTrainAssets()
