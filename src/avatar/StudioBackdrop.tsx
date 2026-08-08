// Warm studio environment for the accessories preview: a soft gradient backdrop
// plus a matching image-based environment map so the leather, gilt metal and
// paper read with real reflections instead of sitting in a flat void. Generated
// procedurally into a canvas (no network HDR), pre-filtered with PMREM.
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, EquirectangularReflectionMapping, PMREMGenerator, SRGBColorSpace, type Texture } from 'three'

function makeEquirect(): Texture {
  const w = 512
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  // vertical studio gradient: dark warm floor → mid → soft warm ceiling
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#2a2118')
  g.addColorStop(0.45, '#3a2c1e')
  g.addColorStop(0.62, '#52402b')
  g.addColorStop(0.8, '#241a12')
  g.addColorStop(1, '#140f0a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // key-light glow (upper-right) — gives the gold a bright catch
  const key = ctx.createRadialGradient(w * 0.72, h * 0.3, 4, w * 0.72, h * 0.3, w * 0.32)
  key.addColorStop(0, 'rgba(255,233,200,0.9)')
  key.addColorStop(0.5, 'rgba(255,210,160,0.25)')
  key.addColorStop(1, 'rgba(255,210,160,0)')
  ctx.fillStyle = key
  ctx.fillRect(0, 0, w, h)
  // cool rim glow (back-left)
  const rim = ctx.createRadialGradient(w * 0.18, h * 0.42, 4, w * 0.18, h * 0.42, w * 0.3)
  rim.addColorStop(0, 'rgba(180,190,230,0.35)')
  rim.addColorStop(1, 'rgba(180,190,230,0)')
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, w, h)
  const t = new CanvasTexture(c)
  t.mapping = EquirectangularReflectionMapping
  t.colorSpace = SRGBColorSpace
  return t
}

let cached: Texture | null = null

export function StudioBackdrop({ intensity = 0.55 }: { intensity?: number }) {
  const scene = useThree((s) => s.scene)
  const renderer = useThree((s) => s.gl)

  useEffect(() => {
    if (!cached) cached = makeEquirect()
    const tex = cached
    scene.background = tex
    const pmrem = new PMREMGenerator(renderer as unknown as import('three').WebGLRenderer)
    pmrem.compileEquirectangularShader()
    const env = pmrem.fromEquirectangular(tex).texture
    scene.environment = env
    scene.environmentIntensity = intensity
    return () => {
      pmrem.dispose()
    }
  }, [scene, renderer, intensity])

  return null
}
