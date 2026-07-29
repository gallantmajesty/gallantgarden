import { CanvasTexture, RepeatWrapping } from 'three'

export function createBrickTexture(): CanvasTexture {
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
  return tex
}

export function createWoodTexture(baseColor = '#4A2F1A'): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 512, 256)
  for (let y = 0; y < 256; y++) {
    const alpha = 0.02 + Math.sin(y * 0.3) * 0.03 + Math.sin(y * 0.7) * 0.02
    ctx.fillStyle = `rgba(0,0,0,${alpha})`
    ctx.fillRect(0, y, 512, 1)
  }
  for (let x = 0; x < 512; x += 40) {
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 256)
    ctx.stroke()
  }
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

export function createTileTexture(lightColor = '#F5E6D3', darkColor = '#3D2B1F', tileSize = 64): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = lightColor
  ctx.fillRect(0, 0, 512, 512)
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      const isDark = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
      ctx.fillStyle = isDark ? darkColor : lightColor
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
  return tex
}

export function createFabricTexture(baseColor = '#8B2500'): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, 128, 128)
  for (let x = 0; x < 128; x += 4) {
    for (let y = 0; y < 128; y += 4) {
      const shade = 0.9 + Math.random() * 0.1
      ctx.fillStyle = `rgba(0,0,0,${1 - shade})`
      ctx.fillRect(x, y, 4, 4)
    }
  }
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(4, 4)
  return tex
}

export function createMarbleTexture(): CanvasTexture {
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
  return tex
}