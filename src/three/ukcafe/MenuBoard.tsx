import { useMemo } from 'react'
import { CanvasTexture, RepeatWrapping } from 'three'

export function MenuBoard() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1a3a1a'
    ctx.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2)
    }
    ctx.strokeStyle = '#DAA520'
    ctx.lineWidth = 6
    ctx.strokeRect(15, 15, 482, 482)
    ctx.strokeStyle = '#B8860B'
    ctx.lineWidth = 2
    ctx.strokeRect(22, 22, 468, 468)
    ctx.fillStyle = '#F5F0E8'
    ctx.font = 'bold 28px Georgia'
    ctx.textAlign = 'center'
    ctx.fillText('~ MENU ~', 256, 70)
    ctx.font = '18px Georgia'
    const items = [
      'Full English Breakfast ..... \u00A39.50',
      'Scones / Clotted Cream ..... \u00A35.00',
      'Victoria Sponge Cake ..... \u00A34.50',
      'English Breakfast Tea ..... \u00A33.00',
      'Earl Grey Tea .............. \u00A33.00',
      'Hot Chocolate ............. \u00A33.50',
      "Shepherd's Pie .............. \u00A311.00",
      'Fish & Chips ............... \u00A310.00',
      'Sausage Rolls ............. \u00A34.00',
      'Lemon Drizzle Cake ..... \u00A34.00',
    ]
    items.forEach((item, i) => {
      ctx.fillText(item, 256, 115 + i * 35)
    })
    ctx.font = 'italic 14px Georgia'
    ctx.fillText('\u2726 Freshly Made Daily \u2726', 256, 490)
    const tex = new CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = RepeatWrapping
    return tex
  }, [])

  return (
    <group position={[-9.5, 4, -2]}>
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[3, 4.5]} />
        <meshStandardMaterial map={texture} roughness={0.8} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]} position={[0, 0, 0.05]}>
        <boxGeometry args={[3.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#DAA520" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh rotation={[0, Math.PI / 4, 0]} position={[0, 0, 0.05]}>
        <boxGeometry args={[3.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#DAA520" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, -2.3, -0.3]}>
        <boxGeometry args={[2.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#5C3A1E" roughness={0.5} />
      </mesh>
    </group>
  )
}