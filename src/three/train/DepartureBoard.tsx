import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, SRGBColorSpace, type Mesh } from 'three'
import { departureBoard, statusLabel } from '../../lib/train/schedule'
import { DEPARTURE_BOARD } from './layout'
import { palette } from './env'

// The great hanging departure board over the platform mouths — a brass-framed
// dark enamel sign whose split-flap rows show every platform's live status
// (Arriving 01:43 · Boarding · Departed returns 2h 18m), redrawn to its canvas
// texture about once a second. Reads the same deterministic schedule the trains
// and platform signage use, so the board, the countdown and the train you see
// rolling in always agree.

const W = 1024
const H = 256

function draw(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0c0b0a'
  ctx.fillRect(0, 0, W, H)
  // header
  ctx.fillStyle = '#e8c06a'
  ctx.font = 'bold 30px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText('DEPARTURES', 24, 40)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#9a8a66'
  ctx.font = '20px Georgia, serif'
  ctx.fillText('FOCUSLILY TERMINUS', W - 24, 38)
  ctx.strokeStyle = '#3a3026'
  ctx.beginPath()
  ctx.moveTo(24, 52)
  ctx.lineTo(W - 24, 52)
  ctx.stroke()

  const rows = departureBoard()
  const rowH = 38
  rows.forEach((s, i) => {
    const y = 86 + i * rowH
    const { tag, detail } = statusLabel(s)
    // platform pip
    ctx.fillStyle = s.line.mood.glow
    ctx.fillRect(24, y - 22, 6, 28)
    // platform number + line
    ctx.textAlign = 'left'
    ctx.fillStyle = '#f3e2bf'
    ctx.font = 'bold 26px Georgia, serif'
    ctx.fillText(`${s.line.platform}`, 44, y)
    ctx.fillStyle = '#d9c9a6'
    ctx.font = '24px Georgia, serif'
    ctx.fillText(s.line.name, 84, y)
    ctx.fillStyle = '#8a7a5a'
    ctx.font = 'italic 20px Georgia, serif'
    ctx.fillText(`→ ${s.line.destination}`, 300, y)
    // status tag (amber when boardable)
    ctx.textAlign = 'right'
    ctx.fillStyle = s.boardable ? '#7CFFB0' : s.phase === 'approaching' ? '#ffd27a' : '#c98a6a'
    ctx.font = 'bold 24px "Courier New", monospace'
    ctx.fillText(tag.toUpperCase(), W - 200, y)
    ctx.fillStyle = '#cfc3a6'
    ctx.font = '22px "Courier New", monospace'
    ctx.fillText(detail, W - 24, y)
  })
}

export function DepartureBoard() {
  const matRef = useRef<Mesh>(null)
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const context = c.getContext('2d')!
    const texture = new CanvasTexture(c)
    texture.colorSpace = SRGBColorSpace
    return { tex: texture, ctx: context }
  }, [])

  useEffect(() => {
    draw(ctx)
    tex.needsUpdate = true
    const id = window.setInterval(() => {
      draw(ctx)
      tex.needsUpdate = true
    }, 1000)
    return () => window.clearInterval(id)
  }, [ctx, tex])

  const [x, y, z] = DEPARTURE_BOARD.pos
  const w = DEPARTURE_BOARD.width
  const h = DEPARTURE_BOARD.height

  return (
    <group position={[x, y, z]}>
      {/* brass frame */}
      <mesh>
        <boxGeometry args={[w + 0.8, h + 0.8, 0.4]} />
        <meshStandardMaterial color={palette.brass} metalness={0.6} roughness={0.4} emissive={'#3a2808'} emissiveIntensity={0.3} />
      </mesh>
      {/* enamel face with the live schedule */}
      <mesh ref={matRef} position={[0, 0, 0.22]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive={'#ffffff'} emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      {/* hanger chains */}
      {[-w / 2 + 1, w / 2 - 1].map((dx) => (
        <mesh key={dx} position={[dx, h / 2 + 1.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
          <meshStandardMaterial color={palette.iron} metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <pointLight position={[0, 0, 3]} color={'#ffe7b0'} intensity={6} distance={18} decay={2} />
    </group>
  )
}
