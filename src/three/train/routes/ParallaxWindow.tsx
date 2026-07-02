// ParallaxWindow — window view layers with parallax scrolling.
// Inside each window, the landscape is rendered on separate planes at different
// depths, each scrolling at a different speed to create depth illusion:
//
//   Layer 1 (near):  Speed 1.0x — bushes, fences, signs, flowers
//   Layer 2 (mid):   Speed 0.6x — trees, houses, bridges, animals
//   Layer 3 (far):   Speed 0.2x — mountains, clouds, sky gradient
//
// Each layer is a scrolling texture plane behind the window glass.
// Different speeds = depth illusion. Procedurally generated textures.

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Group, RepeatWrapping, SRGBColorSpace } from 'three'
import { CARRIAGE, carriageWindows } from '../interior'

const ANISO = 16

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function finish(c: HTMLCanvasElement, repeatX: number) {
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(repeatX, 1)
  tex.anisotropy = ANISO
  return tex
}

/** Generate near-layer texture: bushes, fences, flowers */
function makeNearTexture(theme: any, seed: number): CanvasTexture {
  const c = canvas(512, 128)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)

  // sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, theme.sky)
  grad.addColorStop(0.6, theme.ground)
  grad.addColorStop(1, theme.ground)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 128)

  // bushes
  for (let i = 0; i < 30; i++) {
    const x = rand() * 512
    const y = 70 + rand() * 30
    const r = 5 + rand() * 10
    ctx.fillStyle = theme.tree
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // fence posts
  for (let x = 0; x < 512; x += 40 + rand() * 20) {
    const y = 90 + rand() * 10
    ctx.fillStyle = '#8a7a60'
    ctx.fillRect(x, y - 15, 3, 15)
  }
  // fence rails
  ctx.fillStyle = '#8a7a60'
  ctx.fillRect(0, 82, 512, 2)
  ctx.fillRect(0, 88, 512, 2)

  // flowers
  for (let i = 0; i < 20; i++) {
    const x = rand() * 512
    const y = 95 + rand() * 25
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff']
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)]
    ctx.beginPath()
    ctx.arc(x, y, 2 + rand() * 2, 0, Math.PI * 2)
    ctx.fill()
  }

  return finish(c, 4)
}

/** Generate mid-layer texture: trees, houses, bridges */
function makeMidTexture(theme: any, seed: number): CanvasTexture {
  const c = canvas(512, 256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)

  // sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, theme.sky)
  grad.addColorStop(0.5, theme.sky)
  grad.addColorStop(0.7, theme.ground)
  grad.addColorStop(1, theme.ground)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 256)

  // trees
  for (let i = 0; i < 15; i++) {
    const x = rand() * 512
    const baseY = 160 + rand() * 30
    // trunk
    ctx.fillStyle = theme.trunk
    ctx.fillRect(x - 2, baseY - 30, 4, 30)
    // canopy
    ctx.fillStyle = theme.tree
    ctx.beginPath()
    ctx.arc(x, baseY - 40, 12 + rand() * 8, 0, Math.PI * 2)
    ctx.fill()
  }

  // houses
  for (let i = 0; i < 4; i++) {
    const x = rand() * 512
    const y = 150 + rand() * 20
    const w = 20 + rand() * 15
    const h = 15 + rand() * 10
    ctx.fillStyle = theme.wall
    ctx.fillRect(x - w / 2, y - h, w, h)
    ctx.fillStyle = theme.roof
    ctx.beginPath()
    ctx.moveTo(x - w / 2 - 3, y - h)
    ctx.lineTo(x, y - h - 10)
    ctx.lineTo(x + w / 2 + 3, y - h)
    ctx.fill()
  }

  return finish(c, 3)
}

/** Generate far-layer texture: mountains, clouds, sky gradient */
function makeFarTexture(theme: any, seed: number): CanvasTexture {
  const c = canvas(512, 256)
  const ctx = c.getContext('2d')!
  const rand = rng(seed)

  // sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, theme.sky)
  grad.addColorStop(0.7, theme.sky)
  grad.addColorStop(0.85, theme.ground)
  grad.addColorStop(1, theme.ground)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 256)

  // distant mountain range
  ctx.fillStyle = theme.mtn
  ctx.beginPath()
  ctx.moveTo(0, 200)
  for (let x = 0; x <= 512; x += 20) {
    const y = 170 + Math.sin(x * 0.02) * 20 + rand() * 15
    ctx.lineTo(x, y)
  }
  ctx.lineTo(512, 256)
  ctx.lineTo(0, 256)
  ctx.fill()

  // snow caps
  ctx.fillStyle = theme.cap
  ctx.beginPath()
  ctx.moveTo(0, 190)
  for (let x = 0; x <= 512; x += 20) {
    const y = 165 + Math.sin(x * 0.02) * 18 + rand() * 10
    ctx.lineTo(x, y)
  }
  for (let x = 512; x >= 0; x -= 20) {
    const y = 175 + Math.sin(x * 0.02) * 15 + rand() * 8
    ctx.lineTo(x, y)
  }
  ctx.fill()

  // clouds
  for (let i = 0; i < 8; i++) {
    const x = rand() * 512
    const y = 30 + rand() * 60
    const w = 30 + rand() * 40
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.ellipse(x, y, w, 8 + rand() * 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  return finish(c, 2)
}

/** Speed constants for each parallax layer */
const LAYER_SPEEDS = [1.0, 0.6, 0.2]

/** A single window with 3 parallax layers behind it — receives shared textures */
function ParallaxWindowLayer({
  side,
  z,
  nearTex,
  midTex,
  farTex,
}: {
  side: -1 | 1
  z: number
  nearTex: CanvasTexture
  midTex: CanvasTexture
  farTex: CanvasTexture
}) {
  const { halfW } = CARRIAGE
  const x = side * (halfW - 0.15)

  const nearRef = useRef<any>(null)
  const midRef = useRef<any>(null)
  const farRef = useRef<any>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (nearRef.current) nearRef.current.offset.x = t * 0.08 * LAYER_SPEEDS[0]
    if (midRef.current) midRef.current.offset.x = t * 0.08 * LAYER_SPEEDS[1]
    if (farRef.current) farRef.current.offset.x = t * 0.08 * LAYER_SPEEDS[2]
  })

  return (
    <group position={[x, 1.35, z]}>
      <mesh position={[-side * 0.15, 0, 0]}>
        <planeGeometry args={[0.01, 0.7, 1.0]} />
        <meshBasicMaterial map={farTex} fog={false} />
      </mesh>
      <mesh position={[-side * 0.1, 0, 0]}>
        <planeGeometry args={[0.01, 0.65, 0.95]} />
        <meshBasicMaterial map={midTex} fog={false} />
      </mesh>
      <mesh position={[-side * 0.05, 0, 0]}>
        <planeGeometry args={[0.01, 0.6, 0.9]} />
        <meshBasicMaterial map={nearTex} fog={false} />
      </mesh>
    </group>
  )
}

/** All parallax window views — 3 shared textures instead of 30 */
export function ParallaxWindows({ theme }: { theme: any }) {
  const windows = useMemo(() => carriageWindows(), [])

  const nearTex = useMemo(() => makeNearTexture(theme, 42), [theme])
  const midTex = useMemo(() => makeMidTexture(theme, 142), [theme])
  const farTex = useMemo(() => makeFarTexture(theme, 242), [theme])

  return (
    <group>
      {windows.map((w, i) => (
        <ParallaxWindowLayer
          key={i}
          side={w.side}
          z={w.pos[2]}
          nearTex={nearTex}
          midTex={midTex}
          farTex={farTex}
        />
      ))}
    </group>
  )
}
