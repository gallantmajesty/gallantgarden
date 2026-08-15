import { useEffect, useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'

export const CAFE_PALETTE = {
  ink: '#15120f',
  walnut: '#2c1a12',
  walnutWarm: '#4a2b18',
  plaster: '#d8cfbc',
  jade: '#2f806a',
  jadeDark: '#17493f',
  brass: '#b98a42',
  celadon: '#9fb9a8',
  stone: '#4a4b47',
  stoneDark: '#252927',
  paper: '#eadbbd',
  upholstery: '#75503d',
} as const

interface CafeTextures {
  wood: Texture
  plaster: Texture
  brick: Texture
  terrazzo: Texture
  /** Chinese grey floor tiles with grout lines — the mezzanine floor. */
  tile: Texture
}

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is required for café materials')
  paint(ctx, size)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

export function useChineseCafeTextures(): CafeTextures {
  const textures = useMemo<CafeTextures>(() => {
    const wood = canvasTexture(512, (ctx, size) => {
      const rnd = seeded(81)
      const gradient = ctx.createLinearGradient(0, 0, size, 0)
      gradient.addColorStop(0, '#28170f')
      gradient.addColorStop(0.5, '#53301b')
      gradient.addColorStop(1, '#2f1a10')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      for (let y = 0; y < size; y += 3) {
        const wave = Math.sin(y * 0.08) * 8 + Math.sin(y * 0.017) * 19
        ctx.strokeStyle = `rgba(${rnd() > 0.5 ? 246 : 38},${rnd() > 0.5 ? 185 : 18},${rnd() > 0.5 ? 112 : 10},${0.025 + rnd() * 0.045})`
        ctx.lineWidth = 0.5 + rnd()
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(size * 0.25, y + wave, size * 0.72, y - wave * 0.5, size, y + wave * 0.2)
        ctx.stroke()
      }
      for (let i = 0; i < 12; i++) {
        const x = rnd() * size
        const y = rnd() * size
        ctx.strokeStyle = 'rgba(20,8,3,0.16)'
        ctx.beginPath()
        ctx.ellipse(x, y, 4 + rnd() * 10, 1.5 + rnd() * 4, rnd(), 0, Math.PI * 2)
        ctx.stroke()
      }
    })
    wood.repeat.set(2, 5)

    const plaster = canvasTexture(256, (ctx, size) => {
      const rnd = seeded(142)
      ctx.fillStyle = '#d8cfbc'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 7000; i++) {
        const v = 150 + Math.round(rnd() * 70)
        ctx.fillStyle = `rgba(${v},${v - 4},${v - 13},${0.025 + rnd() * 0.055})`
        ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2)
      }
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = 'rgba(85,72,54,0.045)'
        ctx.beginPath()
        const y = rnd() * size
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(size * 0.3, y + rnd() * 10, size * 0.7, y - rnd() * 10, size, y)
        ctx.stroke()
      }
    })
    plaster.repeat.set(5, 3)

    const brick = canvasTexture(512, (ctx, size) => {
      const rnd = seeded(407)
      ctx.fillStyle = '#8f8c82'
      ctx.fillRect(0, 0, size, size)
      const bw = 92
      const bh = 34
      for (let row = 0; row < Math.ceil(size / bh); row++) {
        const offset = row % 2 ? -bw / 2 : 0
        for (let col = -1; col < Math.ceil(size / bw) + 1; col++) {
          const tone = 72 + Math.round(rnd() * 30)
          ctx.fillStyle = `rgb(${tone},${tone + 2},${tone - 1})`
          ctx.fillRect(offset + col * bw + 2, row * bh + 2, bw - 4, bh - 4)
          ctx.fillStyle = 'rgba(255,255,255,0.035)'
          ctx.fillRect(offset + col * bw + 4, row * bh + 4, bw - 8, 2)
        }
      }
    })
    brick.repeat.set(4, 3)

    const terrazzo = canvasTexture(256, (ctx, size) => {
      const rnd = seeded(902)
      ctx.fillStyle = '#b8ae9b'
      ctx.fillRect(0, 0, size, size)
      const chips = ['#443d36', '#d8cbb5', '#6f796f', '#8c654f', '#ede3cc']
      for (let i = 0; i < 1250; i++) {
        ctx.fillStyle = chips[Math.floor(rnd() * chips.length)]
        const r = 0.4 + rnd() * 2.2
        ctx.beginPath()
        ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    terrazzo.repeat.set(6, 6)

    const tile = canvasTexture(256, (ctx, size) => {
      const rnd = seeded(613)
      // grout base
      ctx.fillStyle = '#3a403c'
      ctx.fillRect(0, 0, size, size)
      const cols = 4
      const rows = 4
      const tw = size / cols
      const th = size / rows
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tone = 96 + Math.round(rnd() * 28)
          const warm = rnd() > 0.5
          ctx.fillStyle = `rgb(${warm ? tone + 8 : tone},${tone + 3},${warm ? tone - 6 : tone + 2})`
          ctx.fillRect(col * tw + 3, row * th + 3, tw - 6, th - 6)
          // soft bevel highlight on the top-left edge of each tile
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          ctx.fillRect(col * tw + 3, row * th + 3, tw - 6, 2)
          // subtle speckle
          for (let i = 0; i < 22; i++) {
            ctx.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},0.02)`
            ctx.fillRect(col * tw + 6 + rnd() * (tw - 12), row * th + 6 + rnd() * (th - 12), 1.5, 1.5)
          }
        }
      }
    })
    tile.repeat.set(10, 3)

    return { wood, plaster, brick, terrazzo, tile }
  }, [])

  useEffect(() => () => {
    textures.wood.dispose()
    textures.plaster.dispose()
    textures.brick.dispose()
    textures.terrazzo.dispose()
    textures.tile.dispose()
  }, [textures])

  return textures
}
