import { useMemo } from 'react'
import { RepeatWrapping, CanvasTexture } from 'three'

function TableWood() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#6B4226'
    ctx.fillRect(0, 0, 256, 256)
    for (let y = 0; y < 256; y++) {
      const alpha = 0.01 + Math.sin(y * 0.15) * 0.04 + Math.sin(y * 0.5) * 0.02
      ctx.fillStyle = `rgba(0,0,0,${alpha})`
      ctx.fillRect(0, y, 256, 1)
    }
    for (let x = 0; x < 256; x += 32) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 256)
      ctx.stroke()
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    return tex
  }, [])

  return <meshStandardMaterial map={texture} roughness={0.55} />
}

function Upholstery() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#8B2500'
    ctx.fillRect(0, 0, 128, 128)
    for (let x = 0; x < 128; x += 8) {
      for (let y = 0; y < 128; y += 8) {
        ctx.fillStyle = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? '#8B2500' : '#7A2000'
        ctx.fillRect(x, y, 8, 8)
      }
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(2, 2)
    return tex
  }, [])

  return <meshStandardMaterial map={texture} roughness={0.8} />
}

function SingleChair({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <Upholstery />
      </mesh>
      <mesh position={[0, 1.05, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <Upholstery />
      </mesh>
      {[
        [-0.2, 0.27, -0.2],
        [0.2, 0.27, -0.2],
        [-0.2, 0.27, 0.2],
        [0.2, 0.27, 0.2],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.45, 8]} />
          <meshStandardMaterial color="#3D2010" roughness={0.4} />
        </mesh>
      ))}
      {[
        [-0.28, 0.75, 0],
        [0.28, 0.75, 0],
      ].map((pos, i) => (
        <mesh key={`arm-${i}`} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.08, 0.35, 0.4]} />
          <meshStandardMaterial color="#5C3A1E" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function SingleTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.08, 1.2]} />
        <TableWood />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[1.6, 0.12, 1.0]} />
        <meshStandardMaterial color="#4A2F1A" roughness={0.6} />
      </mesh>
      {[
        [-0.7, 0.6, -0.45],
        [0.7, 0.6, -0.45],
        [-0.7, 0.6, 0.45],
        [0.7, 0.6, 0.45],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 1.1, 8]} />
          <meshStandardMaterial color="#3D2010" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.35, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.35, 0.15]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.37, -0.12]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 8]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.3} />
      </mesh>
      <mesh position={[0.35, 1.3, -0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.06, 0.12, 12]} />
        <meshStandardMaterial color="#FFFFF0" roughness={0.2} />
      </mesh>
    </group>
  )
}

export function CafeTables() {
  return (
    <group>
      <SingleTable position={[-6, 0, 4]} />
      <SingleChair position={[-6.5, 0, 3.35]} rotation={[0, 0, 0]} />
      <SingleChair position={[-5.5, 0, 3.35]} rotation={[0, 0, 0]} />
      <SingleChair position={[-6.5, 0, 4.65]} rotation={[0, Math.PI, 0]} />
      <SingleChair position={[-5.5, 0, 4.65]} rotation={[0, Math.PI, 0]} />

      <SingleTable position={[0, 0, 4]} />
      <SingleChair position={[-0.5, 0, 3.35]} rotation={[0, 0, 0]} />
      <SingleChair position={[0.5, 0, 3.35]} rotation={[0, 0, 0]} />
      <SingleChair position={[-0.5, 0, 4.65]} rotation={[0, Math.PI, 0]} />
      <SingleChair position={[0.5, 0, 4.65]} rotation={[0, Math.PI, 0]} />

      <SingleTable position={[6, 0, 4]} />
      <SingleChair position={[5.5, 0, 3.35]} rotation={[0, 0, 0]} />
      <SingleChair position={[6.5, 0, 3.35]} rotation={[0, 0, 0]} />
      <SingleChair position={[5.5, 0, 4.65]} rotation={[0, Math.PI, 0]} />
      <SingleChair position={[6.5, 0, 4.65]} rotation={[0, Math.PI, 0]} />

      <SingleTable position={[-6, 0, -2]} />
      <SingleChair position={[-6.5, 0, -2.65]} rotation={[0, 0, 0]} />
      <SingleChair position={[-5.5, 0, -2.65]} rotation={[0, 0, 0]} />
      <SingleChair position={[-6.5, 0, -1.35]} rotation={[0, Math.PI, 0]} />
      <SingleChair position={[-5.5, 0, -1.35]} rotation={[0, Math.PI, 0]} />

      <SingleTable position={[6, 0, -2]} />
      <SingleChair position={[5.5, 0, -2.65]} rotation={[0, 0, 0]} />
      <SingleChair position={[6.5, 0, -2.65]} rotation={[0, 0, 0]} />
      <SingleChair position={[5.5, 0, -1.35]} rotation={[0, Math.PI, 0]} />
      <SingleChair position={[6.5, 0, -1.35]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}