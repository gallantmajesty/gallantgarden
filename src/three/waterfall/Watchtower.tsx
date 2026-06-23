import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { MeshStandardMaterial } from 'three'
import { FALLS, terrainHeight } from './layout'

useGLTF.preload('/models/watchtower.glb')

// A real watchtower model standing on the west flank of the falls (the player's
// LEFT as they look north from spawn), perched on the rocky slope so it reads as
// a landmark guarding the valley mouth. Native model is ~203u tall and Y-up with
// its base ~19u below origin; we scale it down and lift it so the base sits on
// the terrain.
const NATIVE_BASE_Y = -19.43
const SCALE = 0.14 // → ~28u tall
const POS: [number, number] = [-40, -58] // west of the falls, near the cliff base

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function Watchtower() {
  return (
    <Boundary>
      <Suspense fallback={null}>
        <TowerModel />
      </Suspense>
    </Boundary>
  )
}

function TowerModel() {
  const { scene } = useGLTF('/models/watchtower.glb')
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      const mesh = o as unknown as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean; material?: MeshStandardMaterial }
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        if (mesh.material) {
          mesh.material.roughness = 0.9
          mesh.material.metalness = 0
        }
      }
    })
    return c
  }, [scene])

  const groundY = useMemo(() => terrainHeight(POS[0], POS[1]), [])
  // face the tower's doorway toward the lake/falls
  const yaw = Math.atan2(FALLS.centerX - POS[0], FALLS.poolZ - POS[1])

  return (
    <group position={[POS[0], groundY - NATIVE_BASE_Y * SCALE, POS[1]]} rotation={[0, yaw, 0]}>
      <primitive object={cloned} scale={SCALE} />
    </group>
  )
}
