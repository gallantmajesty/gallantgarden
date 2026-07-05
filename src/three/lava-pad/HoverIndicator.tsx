// Lava Pad Hover Indicator — ring and glow effect on targeted platform

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, RingGeometry, MeshBasicMaterial, AdditiveBlending, DoubleSide } from 'three'
import { useLavaPadStore } from './store'

export function HoverIndicator() {
  const ringRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)
  const hoveredPlatform = useLavaPadStore((s) => s.hoveredPlatform)
  const platformsRuntime = useLavaPadStore((s) => s.platforms)
  const jumpState = useLavaPadStore((s) => s.jumpState)

  // Only show when idle
  const showHover = jumpState === 'idle' && hoveredPlatform

  const ringGeo = useMemo(() => new RingGeometry(0.8, 1.0, 32), [])
  const glowGeo = useMemo(() => new RingGeometry(0.3, 1.2, 32), [])

  useFrame(() => {
    const ring = ringRef.current
    const glow = glowRef.current
    if (!ring || !glow) return

    if (!showHover) {
      ring.visible = false
      glow.visible = false
      return
    }

    ring.visible = true
    glow.visible = true

    const target = platformsRuntime.find(p => p.id === hoveredPlatform)
    if (!target) {
      ring.visible = false
      glow.visible = false
      return
    }

    const time = Date.now() * 0.001
    const y = target.y + target.height / 2 + 0.02

    ring.position.set(target.x, y, target.z)
    ring.rotation.x = -Math.PI / 2
    ring.scale.set(target.radius, target.radius, target.radius)

    glow.position.set(target.x, y, target.z)
    glow.rotation.x = -Math.PI / 2
    glow.scale.set(target.radius, target.radius, target.radius)

    // Pulse ring
    const pulse = 1 + Math.sin(time * 5) * 0.05
    ring.scale.multiplyScalar(pulse)

    // Animate glow opacity
    const opacity = 0.3 + Math.sin(time * 3) * 0.15
    const mat = glow.material as MeshBasicMaterial
    mat.opacity = opacity
  })

  return (
    <>
      <mesh ref={ringRef} geometry={ringGeo} visible={false}>
        <meshBasicMaterial color="#ffce54" transparent opacity={0.9} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh ref={glowRef} geometry={glowGeo} visible={false}>
        <meshBasicMaterial
          color="#ffce54"
          transparent
          opacity={0.3}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </>
  )
}