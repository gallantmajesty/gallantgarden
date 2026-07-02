// Dark green carpet material — forest green runner with diamond pattern, worn
// center aisle, and brass edge trim. Procedurally generated canvas textures
// for the Hogwarts Express-style floor.

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

/** Diamond pattern normal map for carpet */
export function makeCarpetNormal(repeatX = 6, repeatY = 10): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!

  // base flat normal
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 256, 256)

  // diamond grid pattern
  const cellSize = 32
  ctx.strokeStyle = 'rgb(136,136,255)' // slightly raised lines
  ctx.lineWidth = 1.5
  for (let y = 0; y < 256; y += cellSize) {
    for (let x = 0; x < 256; x += cellSize) {
      const cx = x + cellSize / 2
      const cy = y + cellSize / 2
      ctx.beginPath()
      ctx.moveTo(cx, cy - cellSize / 2 + 4)
      ctx.lineTo(cx + cellSize / 2 - 4, cy)
      ctx.lineTo(cx, cy + cellSize / 2 - 4)
      ctx.lineTo(cx - cellSize / 2 + 4, cy)
      ctx.closePath()
      ctx.stroke()
    }
  }

  return finish(c, repeatX, repeatY)
}

/** Worn roughness map — center aisle is smoother from foot traffic */
export function makeCarpetRoughness(repeatX = 6, repeatY = 10): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!
  const rand = rng(55)

  // base carpet roughness (~0.95 = 242/255)
  ctx.fillStyle = 'rgb(242,242,242)'
  ctx.fillRect(0, 0, 256, 256)

  // center aisle worn path — smoother (lower roughness)
  const aisleGrad = ctx.createLinearGradient(96, 0, 160, 0)
  aisleGrad.addColorStop(0, 'rgba(200,200,200,0)')
  aisleGrad.addColorStop(0.3, 'rgba(200,200,200,0.5)')
  aisleGrad.addColorStop(0.5, 'rgba(200,200,200,0.7)')
  aisleGrad.addColorStop(0.7, 'rgba(200,200,200,0.5)')
  aisleGrad.addColorStop(1, 'rgba(200,200,200,0)')
  ctx.fillStyle = aisleGrad
  ctx.fillRect(96, 0, 64, 256)

  // random scuff marks
  for (let i = 0; i < 150; i++) {
    const v = 200 + Math.floor(rand() * 40)
    ctx.fillStyle = `rgba(${v},${v},${v},0.12)`
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 5, 1)
  }

  return finish(c, repeatX, repeatY)
}

/** Create main carpet floor material — forest green with diamond pattern */
export function useCarpetMaterial() {
  return useMemo(() => {
    const normalMap = makeCarpetNormal(8, 14)
    const roughnessMap = makeCarpetRoughness(8, 14)
    return new MeshStandardMaterial({
      color: '#2E4A3E',
      roughness: 0.95,
      metalness: 0.0,
      normalMap,
      normalScale: [0.4, 0.4] as any,
      roughnessMap,
    })
  }, [])
}

/** Create aisle runner material — slightly lighter green with higher wear */
export function useAisleRunnerMaterial() {
  return useMemo(() => {
    return new MeshStandardMaterial({
      color: '#3E5A4E',
      roughness: 0.85,
      metalness: 0.0,
    })
  }, [])
}
