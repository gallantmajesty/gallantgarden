import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function CafeAtmosphere() {
  const steamGroup = useRef<THREE.Group>(null)
  const dustGroup = useRef<THREE.Group>(null)

  const steamParticles = useMemo(() => {
    return Array.from({ length: 30 }, () => ({
      x: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 10 - 2,
      speed: 0.2 + Math.random() * 0.4,
      offset: Math.random() * Math.PI * 2,
      scale: 0.02 + Math.random() * 0.04,
    }))
  }, [])

  const dustParticles = useMemo(() => {
    return Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: 1 + Math.random() * 5,
      z: (Math.random() - 0.5) * 14,
      speed: 0.1 + Math.random() * 0.2,
      offset: Math.random() * Math.PI * 2,
    }))
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (steamGroup.current) {
      steamGroup.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        const p = steamParticles[i]
        mesh.position.y = 1.5 + Math.sin(t * p.speed + p.offset) * 0.3
        mesh.position.x = p.x + Math.sin(t * 0.3 + p.offset) * 0.2
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = 0.15 + Math.sin(t * 0.8 + p.offset) * 0.1
      })
    }

    if (dustGroup.current) {
      dustGroup.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        const p = dustParticles[i]
        mesh.position.y = p.y + Math.sin(t * p.speed + p.offset) * 0.5
        mesh.position.x = p.x + Math.sin(t * 0.5 + p.offset) * 0.3
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = 0.05 + Math.sin(t * 0.6 + p.offset) * 0.04
      })
    }
  })

  return (
    <group>
      <group ref={steamGroup}>
        {steamParticles.map((p, i) => (
          <mesh key={`steam-${i}`} position={[p.x, 1.5, p.z]}>
            <sphereGeometry args={[0.15 + Math.random() * 0.1, 6, 6]} />
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <group ref={dustGroup}>
        {dustParticles.map((p, i) => (
          <mesh key={`dust-${i}`} position={[p.x, p.y, p.z]}>
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshBasicMaterial
              color="#FFE4B5"
              transparent
              opacity={0.05}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}