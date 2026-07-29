import { useMemo } from 'react'
import { CanvasTexture, RepeatWrapping } from 'three'

function MarbleTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#F5F0E8'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const r = 4 + Math.random() * 8
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(180,170,160,0.15)')
      g.addColorStop(1, 'rgba(180,170,160,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(2, 1)
    return tex
  }, [])

  return <meshStandardMaterial map={texture} roughness={0.3} />
}

export function ServiceCounter() {
  return (
    <group position={[0, 0, -6.5]}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 2.4, 1.2]} />
        <meshStandardMaterial color="#4A2F1A" roughness={0.5} />
      </mesh>

      <mesh position={[0, 2.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[8.2, 0.08, 1.4]} />
        <MarbleTexture />
      </mesh>

      <mesh position={[0, 2.5, -0.6]} receiveShadow>
        <boxGeometry args={[8, 1, 0.1]} />
        <meshStandardMaterial color="#3D2010" roughness={0.5} />
      </mesh>

      {[-2.5, -1, 1, 2.5].map((x) => (
        <group key={`cake-${x}`} position={[x, 2.55, 0.5]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.2, 0.25, 0.08, 16]} />
            <meshStandardMaterial color="#FFFFF0" roughness={0.2} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.25, 8]} />
            <meshStandardMaterial color="#DAA520" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 0.06, 16]} />
            <meshStandardMaterial color="#DEB887" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <torusGeometry args={[0.16, 0.04, 8, 16]} />
            <meshStandardMaterial color="#FF69B4" roughness={0.3} emissive="#FF69B4" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}

      <group position={[-3.5, 2.55, 0.4]}>
        <mesh>
          <sphereGeometry args={[0.2, 16, 12]} />
          <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
          <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.7} />
        </mesh>
        <mesh position={[0.18, 0.1, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
          <meshStandardMaterial color="#C0C0C0" roughness={0.2} metalness={0.7} />
        </mesh>
      </group>

      <group position={[-3.5, 2.65, -0.1]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.4, 0.3, 0.3]} />
          <meshStandardMaterial color="#2F2F2F" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>

      {[2, 3.5].map((x) => (
        <group key={`cup-${x}`} position={[x, 2.55, 0.5]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.05, 0.1, 12]} />
            <meshStandardMaterial color="#FFFFF0" roughness={0.15} />
          </mesh>
          <mesh position={[0.09, 0.02, 0]}>
            <torusGeometry args={[0.04, 0.015, 8, 8, Math.PI]} />
            <meshStandardMaterial color="#FFFFF0" roughness={0.15} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 2.65, 0.55]}>
        <boxGeometry args={[2, 0.35, 0.4]} />
        <meshStandardMaterial color="#87CEEB" roughness={0.05} opacity={0.3} transparent />
      </mesh>

      <mesh position={[0, 2.82, 0.55]}>
        <boxGeometry args={[2.05, 0.02, 0.42]} />
        <meshStandardMaterial color="#DAA520" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 2.48, 0.55]}>
        <boxGeometry args={[2.05, 0.02, 0.42]} />
        <meshStandardMaterial color="#DAA520" roughness={0.3} metalness={0.5} />
      </mesh>

      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <mesh key={`pastry-${x}`} position={[x, 2.6, 0.55]}>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
          <meshStandardMaterial color="#DEB887" roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}