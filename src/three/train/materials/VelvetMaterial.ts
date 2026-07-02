// @ts-nocheck
// Deep maroon velvet upholstery material — tufted button pattern, worn edges,
// and subtle fold wrinkles. Used for seat cushions and backrests in the
// Hogwarts Express-style interior. Procedurally generated textures.

import { useMemo } from 'react'
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three'

const ANISO = 16

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function finish(c: HTMLCanvasElement, repeatX: number, repeatY: number) {
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.anisotropy = ANISO
  return tex
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** Velvet tufted normal map — button dimples with radiating fold wrinkles */
export function makeVelvetNormal(repeatX = 2, repeatY = 2): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!

  // base flat normal
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 256, 256)

  // tufted button grid — 4x4 dimples
  const cols = 4, rows = 4
  const spacingX = 256 / cols
  const spacingY = 256 / rows

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const bx = spacingX * (col + 0.5)
      const by = spacingY * (r + 0.5)

      // button dimple — circular depression (lower normal values)
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, spacingX * 0.35)
      grad.addColorStop(0, 'rgb(100,100,255)')   // deep center
      grad.addColorStop(0.5, 'rgb(118,118,255)') // slope
      grad.addColorStop(1, 'rgb(128,128,255)')   // flat surface
      ctx.fillStyle = grad
      ctx.fillRect(bx - spacingX * 0.4, by - spacingY * 0.4, spacingX * 0.8, spacingY * 0.8)

      // radiating fold wrinkles from button
      ctx.strokeStyle = 'rgb(120,120,255)'
      ctx.lineWidth = 0.8
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2
        const len = spacingX * 0.3
        ctx.beginPath()
        ctx.moveTo(bx + Math.cos(angle) * 4, by + Math.sin(angle) * 4)
        ctx.lineTo(bx + Math.cos(angle) * len, by + Math.sin(angle) * len)
        ctx.stroke()
      }
    }
  }

  return finish(c, repeatX, repeatY)
}

/** Velvet worn roughness map — edges and high-contact areas are smoother */
export function makeVelvetRoughness(repeatX = 2, repeatY = 2): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!
  const rand = rng(77)

  // base velvet roughness (~0.9 = 230/255)
  ctx.fillStyle = 'rgb(230,230,230)'
  ctx.fillRect(0, 0, 256, 256)

  // worn edge areas — smoother (lower values)
  // bottom edge (seat front — where legs contact)
  const edgeGrad = ctx.createLinearGradient(0, 200, 0, 256)
  edgeGrad.addColorStop(0, 'rgba(180,180,180,0)')
  edgeGrad.addColorStop(1, 'rgba(180,180,180,0.6)')
  ctx.fillStyle = edgeGrad
  ctx.fillRect(0, 200, 256, 56)

  // side edges
  const sideGrad = ctx.createLinearGradient(0, 0, 40, 0)
  sideGrad.addColorStop(0, 'rgba(180,180,180,0.5)')
  sideGrad.addColorStop(1, 'rgba(180,180,180,0)')
  ctx.fillStyle = sideGrad
  ctx.fillRect(0, 0, 40, 256)

  const sideGrad2 = ctx.createLinearGradient(216, 0, 256, 0)
  sideGrad2.addColorStop(0, 'rgba(180,180,180,0)')
  sideGrad2.addColorStop(1, 'rgba(180,180,180,0.5)')
  ctx.fillStyle = sideGrad2
  ctx.fillRect(216, 0, 40, 256)

  // random subtle variation
  for (let i = 0; i < 200; i++) {
    const v = 210 + Math.floor(rand() * 40)
    ctx.fillStyle = `rgba(${v},${v},${v},0.1)`
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 3, 1 + rand() * 3)
  }

  return finish(c, repeatX, repeatY)
}

/** Create velvet seat upholstery material — deep maroon with sheen */
export function useVelvetMaterial() {
  return useMemo(() => {
    const normalMap = makeVelvetNormal(2, 2)
    const roughnessMap = makeVelvetRoughness(2, 2)
    return new MeshStandardMaterial({
      color: '#6B1D1D',
      roughness: 0.9,
      metalness: 0.0,
      normalMap,
      normalScale: [0.6, 0.6] as any,
      roughnessMap,
      // sheen is simulated via slight clearcoat for the velvet shimmer
      clearcoat: 0.15,
      clearcoatRoughness: 0.8,
    })
  }, [])
}
