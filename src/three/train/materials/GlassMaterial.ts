// Window glass material — slightly tinted warm amber with subtle reflection,
// rain droplet texture (route-dependent), and frost effect for Mountain Route.
// Uses procedural textures for the tint and optional condensation overlay.

import { useMemo } from 'react'
import { CanvasTexture, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace } from 'three'

const ANISO = 16

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/** Rain droplet texture — small scattered droplets on glass surface */
export function makeRainDroplets(): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!
  const rand = rng(33)

  // transparent base
  ctx.clearRect(0, 0, 256, 256)

  // scattered droplets
  for (let i = 0; i < 120; i++) {
    const x = rand() * 256
    const y = rand() * 256
    const r = 1 + rand() * 3

    // droplet — slightly brighter center with透明 edge
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(200,220,240,0.4)')
    grad.addColorStop(0.6, 'rgba(180,200,220,0.2)')
    grad.addColorStop(1, 'rgba(160,180,200,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // some streaks (rain running down)
  ctx.strokeStyle = 'rgba(180,200,220,0.15)'
  ctx.lineWidth = 1
  for (let i = 0; i < 15; i++) {
    const x = rand() * 256
    const y = rand() * 128
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + (rand() - 0.5) * 10, y + 40, x + (rand() - 0.5) * 10, y + 80, x + (rand() - 0.5) * 5, y + 100 + rand() * 60)
    ctx.stroke()
  }

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = ANISO
  return tex
}

/** Frost texture — crystalline pattern for Mountain Route cold areas */
export function makeFrostTexture(): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!
  const rand = rng(88)

  ctx.clearRect(0, 0, 256, 256)

  // frost crystalline branches from edges
  ctx.strokeStyle = 'rgba(220,235,250,0.35)'
  ctx.lineWidth = 1

  for (let i = 0; i < 40; i++) {
    // start from random edge
    let x: number, y: number
    const edge = Math.floor(rand() * 4)
    if (edge === 0) { x = 0; y = rand() * 256 }
    else if (edge === 1) { x = 256; y = rand() * 256 }
    else if (edge === 2) { x = rand() * 256; y = 0 }
    else { x = rand() * 256; y = 256 }

    // branch inward
    const steps = 5 + Math.floor(rand() * 8)
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let s = 0; s < steps; s++) {
      const angle = Math.atan2(128 - y, 128 - x) + (rand() - 0.5) * 1.2
      const len = 8 + rand() * 15
      x += Math.cos(angle) * len
      y += Math.sin(angle) * len
      ctx.lineTo(x, y)
    }
    ctx.stroke()

    // sub-branches
    if (rand() > 0.5) {
      const bx = x + (rand() - 0.5) * 20
      const by = y + (rand() - 0.5) * 20
      ctx.beginPath()
      ctx.moveTo(x, y)
      const subAngle = Math.atan2(128 - y, 128 - x) + (rand() - 0.5) * 2
      ctx.lineTo(x + Math.cos(subAngle) * 12, y + Math.sin(subAngle) * 12)
      ctx.stroke()
    }
  }

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = ANISO
  return tex
}

/** Create window glass material — warm tinted, transparent, physical */
export function useGlassMaterial() {
  return useMemo(() => {
    return new MeshPhysicalMaterial({
      color: '#FFF8E1',
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      transmission: 0.8,
      thickness: 0.02,
      envMapIntensity: 0.5,
      side: 2, // DoubleSide
    })
  }, [])
}
