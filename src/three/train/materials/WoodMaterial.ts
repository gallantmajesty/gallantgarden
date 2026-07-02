// Dark walnut wood paneling material — horizontal planks with visible grain,
// brass nail-head detail, and worn areas near door handles. Procedurally
// generated canvas textures (no asset files). Each material is cached so
// multiple panels share one instance.

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

/** Dark walnut plank normal map — horizontal grain lines with subtle depth */
export function makeWoodNormal(repeatX = 3, repeatY = 1): CanvasTexture {
  const c = canvas(512, 512)
  const ctx = c.getContext('2d')!
  const rand = rng(42)

  // base flat normal (128,128,255) = facing outward
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 512, 512)

  const plankH = 64
  for (let y = 0; y < 512; y += plankH) {
    // plank edge groove — darker normal =凹
    ctx.fillStyle = 'rgb(100,100,255)'
    ctx.fillRect(0, y, 512, 2)
    ctx.fillStyle = 'rgb(155,155,255)'
    ctx.fillRect(0, y + 2, 512, 1)

    // grain lines — subtle horizontal ridges
    for (let i = 0; i < 30; i++) {
      const yy = y + 4 + rand() * (plankH - 8)
      const intensity = 115 + Math.floor(rand() * 30)
      ctx.strokeStyle = `rgb(${intensity},${intensity},255)`
      ctx.lineWidth = 0.5 + rand() * 0.8
      ctx.beginPath()
      ctx.moveTo(0, yy)
      ctx.bezierCurveTo(
        128, yy + (rand() - 0.5) * 3,
        384, yy + (rand() - 0.5) * 3,
        512, yy,
      )
      ctx.stroke()
    }

    // brass nail heads — small bright dots every ~30cm (mapped to texture)
    for (let x = 20; x < 512; x += 90) {
      if (rand() > 0.6) continue
      const nx = x + (rand() - 0.5) * 8
      const ny = y + plankH / 2 + (rand() - 0.5) * 4
      ctx.fillStyle = 'rgb(200,180,255)' // elevated brass bump
      ctx.beginPath()
      ctx.arc(nx, ny, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return finish(c, repeatX, repeatY)
}

/** Dark walnut plank roughness map — worn areas near bottom, grain variation */
export function makeWoodRoughness(repeatX = 3, repeatY = 1): CanvasTexture {
  const c = canvas(512, 512)
  const ctx = c.getContext('2d')!
  const rand = rng(99)

  // base roughness (~0.7 = 178/255)
  ctx.fillStyle = 'rgb(178,178,178)'
  ctx.fillRect(0, 0, 512, 512)

  const plankH = 64
  for (let y = 0; y < 512; y += plankH) {
    // plank variation — some planks smoother, some rougher
    const base = 160 + Math.floor(rand() * 40)
    ctx.fillStyle = `rgb(${base},${base},${base})`
    ctx.fillRect(0, y + 3, 512, plankH - 5)

    // worn area near door handles (lower portion) — smoother
    if (y > 256) {
      ctx.fillStyle = 'rgba(140,140,140,0.3)'
      ctx.fillRect(0, y + 3, 512, plankH - 5)
    }
  }

  // subtle scuff marks
  for (let i = 0; i < 100; i++) {
    const v = 140 + Math.floor(rand() * 30)
    ctx.fillStyle = `rgba(${v},${v},${v},0.15)`
    ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 8, 1)
  }

  return finish(c, repeatX, repeatY)
}

/** Wallpaper damask normal pattern for upper walls */
export function makeDamaskNormal(repeatX = 2, repeatY = 2): CanvasTexture {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')!

  // base flat normal
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 256, 256)

  // subtle damask motif — repeated floral scroll
  ctx.strokeStyle = 'rgb(135,135,255)'
  ctx.lineWidth = 1.5
  const cx = 128, cy = 128
  // diamond frame
  ctx.beginPath()
  ctx.moveTo(cx, cy - 50)
  ctx.lineTo(cx + 40, cy)
  ctx.lineTo(cx, cy + 50)
  ctx.lineTo(cx - 40, cy)
  ctx.closePath()
  ctx.stroke()
  // inner scroll curves
  ctx.beginPath()
  ctx.moveTo(cx, cy - 35)
  ctx.bezierCurveTo(cx + 20, cy - 15, cx + 20, cy + 15, cx, cy + 35)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, cy - 35)
  ctx.bezierCurveTo(cx - 20, cy - 15, cx - 20, cy + 15, cx, cy + 35)
  ctx.stroke()

  return finish(c, repeatX, repeatY)
}

/** Create walnut wood panel material */
export function useWoodPanelMaterial() {
  return useMemo(() => {
    const normalMap = makeWoodNormal(4, 1)
    const roughnessMap = makeWoodRoughness(4, 1)
    return new MeshStandardMaterial({
      color: '#3E2723',
      roughness: 0.65,
      metalness: 0.05,
      normalMap,
      normalScale: [0.8, 0.8] as any,
      roughnessMap,
      clearcoat: 0.1,
      clearcoatRoughness: 0.6,
    })
  }, [])
}

/** Create cream wallpaper material for upper walls */
export function useWallpaperMaterial() {
  return useMemo(() => {
    const normalMap = makeDamaskNormal(3, 3)
    return new MeshStandardMaterial({
      color: '#FFF8E1',
      roughness: 0.95,
      metalness: 0.0,
      normalMap,
      normalScale: [0.3, 0.3] as any,
    })
  }, [])
}
