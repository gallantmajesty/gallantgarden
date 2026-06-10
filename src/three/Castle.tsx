import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'

useGLTF.preload('/models/castle.glb')

class SoftBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The kingdom's centerpiece castle, sitting at the back of the map. */
export function Castle() {
  return (
    <SoftBoundary>
      <Suspense fallback={null}>
        <group position={[0, 0, -34]} scale={0.05}>
          <CastleModel />
        </group>
      </Suspense>
    </SoftBoundary>
  )
}

function CastleModel() {
  const { scene } = useGLTF('/models/castle.glb')
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      // @ts-expect-error three mesh typing
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return c
  }, [scene])
  return <primitive object={cloned} />
}
