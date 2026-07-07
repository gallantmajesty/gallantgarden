// @ts-nocheck
/**
 * Debug overlay for black-flicker investigation.
 *
 * Usage:
 *   <DebugProbe />   — mount INSIDE the <Canvas>
 *   <DebugHud />     — mount OUTSIDE the <Canvas> (sibling or parent)
 *
 * DebugProbe collects renderer stats each frame into a module-level object.
 * DebugHud reads that object via polling and renders a fixed-position DOM HUD.
 *
 * Remove both files + imports once the flicker is resolved.
 */
import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Material, Mesh, Scene, Texture, WebGLRenderer } from 'three'

/* ------------------------------------------------------------------ */
/*  Shared stats object — written by DebugProbe, read by DebugHud      */
/* ------------------------------------------------------------------ */

export interface DebugStats {
  fps: number
  draws: number
  tris: number
  programs: number
  geo: number
  tex: number
  spikes: number
  recreations: number
  ctxLost: boolean
}

const stats: DebugStats = {
  fps: 0, draws: 0, tris: 0, programs: 0, geo: 0, tex: 0,
  spikes: 0, recreations: 0, ctxLost: false,
}
if (typeof window !== 'undefined') (window as any).__debugStats = stats

/* ------------------------------------------------------------------ */
/*  DebugProbe — INSIDE the Canvas. Collects stats via useThree/useFrame */
/* ------------------------------------------------------------------ */

export function DebugProbe() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  // WebGL context-loss listener
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = (e: Event) => {
      e.preventDefault()
      stats.ctxLost = true
      console.error(`[${Date.now()}] WebGL CONTEXT LOST`)
    }
    const onRestore = () => {
      stats.ctxLost = false
      console.warn(`[${Date.now()}] WebGL CONTEXT RESTORED`)
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestore)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestore)
    }
  }, [gl])

  // Material / geometry / texture re-creation detector
  const snapshotRef = useRef<{
    materials: Set<number>
    geometries: Set<number>
    textures: Set<number>
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const materials = new Set<number>()
      const geometries = new Set<number>()
      const textures = new Set<number>()
      scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined
        if (m) {
          for (const mat of Array.isArray(m) ? m : [m]) {
            materials.add(mat.uuid)
            for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const) {
              const tex = (mat as unknown as Record<string, Texture | null>)[key]
              if (tex?.isTexture) textures.add(tex.uuid)
            }
          }
        }
        // @ts-expect-error three typing
        const geo = (o as Mesh).geometry
        if (geo) geometries.add(geo.uuid)
      })
      snapshotRef.current = { materials, geometries, textures }
    }, 2000)
    return () => clearTimeout(timer)
  }, [scene])

  const acc = useRef({
    frames: 0, time: 0, since: 0,
    spikeCount: 0, lastSpikeTime: 0,
  })

  useFrame((_, dt) => {
    const a = acc.current
    a.frames++
    a.time += dt
    a.since += dt

    if (a.since >= 0.5) {
      stats.fps = a.frames / a.since
      const r = gl.info.render
      const m = gl.info.memory
      stats.draws = r.calls
      stats.tris = r.triangles
      stats.programs = gl.info.programs?.length ?? 0
      stats.geo = m.geometries
      stats.tex = m.textures
      a.frames = 0
      a.since = 0
    }

    if (dt > 0.05) {
      a.spikeCount++
      if (a.time - a.lastSpikeTime > 2) {
        console.warn(`[DebugOverlay] Frame spike: ${(dt * 1000).toFixed(1)}ms at t=${a.time.toFixed(1)}s`)
        a.lastSpikeTime = a.time
      }
    }

    // Check for new materials/geometries/textures
    if (snapshotRef.current) {
      const snap = snapshotRef.current
      let count = 0
      scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined
        if (m) {
          for (const mat of Array.isArray(m) ? m : [m]) {
            if (!snap.materials.has(mat.uuid)) count++
            for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const) {
              const tex = (mat as unknown as Record<string, Texture | null>)[key]
              if (tex?.isTexture && !snap.textures.has(tex.uuid)) count++
            }
          }
        }
        // @ts-expect-error three typing
        const geo = (o as Mesh).geometry
        if (geo && !snap.geometries.has(geo.uuid)) count++
      })
      if (count > 0) {
        stats.recreations = count
        console.warn(`[DebugOverlay] Detected ${count} new materials/geometries/textures since snapshot`)
      }
    }

    stats.spikes = acc.current.spikeCount
  })

  return null
}

/* ------------------------------------------------------------------ */
/*  DebugHud — OUTSIDE the Canvas. Polls stats and renders DOM overlay  */
/* ------------------------------------------------------------------ */

interface HudEntry {
  label: string
  value: string
  color?: string
}

export function DebugHud() {
  const [, setTick] = useState(0)

  // Poll the shared stats object at 2 Hz — cheap, no RAF needed
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(iv)
  }, [])

  const s = stats

  const entries: HudEntry[] = [
    { label: 'FPS', value: s.fps.toFixed(0), color: s.fps < 30 ? '#f66' : s.fps < 50 ? '#ff6' : '#6f6' },
    { label: 'Draws', value: String(s.draws), color: s.draws > 200 ? '#f66' : '#cfc' },
    { label: 'Tris', value: `${(s.tris / 1000).toFixed(0)}k` },
    { label: 'Programs', value: String(s.programs) },
    { label: 'Geo', value: String(s.geo) },
    { label: 'Tex', value: String(s.tex) },
    { label: 'Spikes', value: String(s.spikes), color: s.spikes > 0 ? '#f66' : '#cfc' },
    { label: 'Recreations', value: String(s.recreations), color: s.recreations > 0 ? '#f66' : '#cfc' },
    { label: 'Context', value: s.ctxLost ? 'LOST' : 'OK', color: s.ctxLost ? '#f00' : '#6f6' },
  ]

  return (
    <div style={{
      position: 'fixed', top: 8, left: 8, zIndex: 99999,
      fontFamily: 'monospace', fontSize: 12, lineHeight: '18px',
      background: 'rgba(0,0,0,0.82)', color: '#cfc', padding: '8px 12px',
      borderRadius: 6, pointerEvents: 'none', whiteSpace: 'pre',
      maxWidth: 520,
    }}>
      {entries.map((e, i) => (
        <span key={i} style={{ color: e.color ?? '#cfc', marginRight: 14 }}>
          {e.label}: <b>{e.value}</b>
        </span>
      ))}
    </div>
  )
}
