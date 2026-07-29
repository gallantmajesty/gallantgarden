import { RepeatWrapping, CanvasTexture } from 'three'
import { useMemo } from 'react'

export function CafeFloor() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#F5F0E8'
    ctx.fillRect(0, 0, 512, 512)
    const tileSize = 64
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const isDark = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
        ctx.fillStyle = isDark ? '#3D2B1F' : '#F5E6D3'
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }
    ctx.strokeStyle = '#2A1F15'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= 512; i += tileSize) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
    }
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(3, 2.5)
    return tex
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[24, 18]} />
      <meshStandardMaterial map={texture} roughness={0.5} />
    </mesh>
  )
}