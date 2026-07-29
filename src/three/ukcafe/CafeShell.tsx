import { RepeatWrapping, CanvasTexture } from 'three'
import { useMemo } from 'react'

function BrickTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(0, 0, 512, 512)
    const brickH = 32
    const brickW = 106
    for (let row = 0; row < 16; row++) {
      const offsetX = row % 2 === 0 ? 0 : brickW / 2
      for (let col = -1; col < 6; col++) {
        const x = col * brickW + offsetX
        const y = row * (brickH + 3)
        const shade = 0.75 + Math.random() * 0.25
        const r = Math.floor(180 * shade)
        const g = Math.floor(70 * shade)
        const b = Math.floor(30 * shade)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(x + 2, y + 1.5, brickW - 3, brickH - 1.5)
      }
    }
    for (let row = 0; row <= 16; row++) {
      ctx.strokeStyle = '#3D2010'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, row * (brickH + 3))
      ctx.lineTo(512, row * (brickH + 3))
      ctx.stroke()
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(2.5, 2)
    return tex
  }, [])

  return <meshStandardMaterial map={texture} roughness={0.85} />
}

function WoodTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#4A2F1A'
    ctx.fillRect(0, 0, 512, 256)
    for (let y = 0; y < 256; y++) {
      const alpha = 0.02 + Math.sin(y * 0.3) * 0.03 + Math.sin(y * 0.7) * 0.02
      ctx.fillStyle = `rgba(0,0,0,${alpha})`
      ctx.fillRect(0, y, 512, 1)
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    return tex
  }, [])

  return <meshStandardMaterial map={texture} roughness={0.6} />
}

export function CafeShell() {
  const roomW = 24
  const roomD = 18
  const wallH = 7
  const wallT = 0.4

  return (
    <group>
      <mesh position={[0, wallH / 2, -roomD / 2]} receiveShadow>
        <boxGeometry args={[roomW, wallH, wallT]} />
        <BrickTexture />
      </mesh>

      <mesh position={[-roomW / 2, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[wallT, wallH, roomD]} />
        <BrickTexture />
      </mesh>

      <mesh position={[roomW / 2, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[wallT, wallH, roomD]} />
        <BrickTexture />
      </mesh>

      <mesh position={[0, wallH, 0]} receiveShadow>
        <planeGeometry args={[roomW, roomD]} />
        <meshStandardMaterial color="#3D2010" roughness={0.9} />
      </mesh>

      {[-8, -4, 0, 4, 8].map((x) => (
        <mesh key={`beam-x-${x}`} position={[x, wallH - 0.15, 0]} castShadow>
          <boxGeometry args={[0.6, 0.3, roomD]} />
          <WoodTexture />
        </mesh>
      ))}

      {[-6, -2, 2, 6].map((z) => (
        <mesh key={`beam-z-${z}`} position={[0, wallH - 0.15, z]} castShadow>
          <boxGeometry args={[roomW, 0.3, 0.6]} />
          <WoodTexture />
        </mesh>
      ))}

      {[-6, 6].map((x) => (
        <group key={`window-${x}`} position={[x, 3.5, -roomD / 2 + 0.01]}>
          <mesh>
            <planeGeometry args={[2.5, 3.5]} />
            <meshStandardMaterial color="#87CEEB" roughness={0.1} emissive="#87CEEB" emissiveIntensity={0.3} opacity={0.6} transparent />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[2.8, 0.15, 0.1]} />
            <meshStandardMaterial color="#5C3A1E" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[2.8, 0.15, 0.1]} />
            <meshStandardMaterial color="#5C3A1E" roughness={0.4} />
          </mesh>
          <mesh position={[0, -1.75, 0.01]}>
            <boxGeometry args={[2.8, 0.15, 0.1]} />
            <meshStandardMaterial color="#5C3A1E" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.08, 3.5, 0.08]} />
            <meshStandardMaterial color="#5C3A1E" roughness={0.4} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, wallH / 2, roomD / 2]} receiveShadow>
        <boxGeometry args={[roomW * 0.65, wallH, wallT]} />
        <BrickTexture />
      </mesh>
    </group>
  )
}