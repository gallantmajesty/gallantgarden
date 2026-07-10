// Performance overlay HUD — renders a semi-transparent debug panel showing
// real-time FPS, frame time, draw calls, triangle count, texture memory,
// LOD level and resolution. Toggled with the backtick (`) key.
//
// This is a non-visual component (returns null from the R3F tree) and draws
// directly to a DOM overlay for zero render-tree cost.

import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { sharedPerfMonitor } from './perfMonitor'

const OVERLAY_STYLES: React.CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 9999,
  background: 'rgba(10,8,16,0.85)',
  color: '#e0d8c8',
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 12,
  lineHeight: 1.6,
  padding: '10px 14px',
  borderRadius: 6,
  border: '1px solid rgba(195,154,82,0.3)',
  pointerEvents: 'none',
  whiteSpace: 'pre',
  backdropFilter: 'blur(4px)',
  display: 'none',
}

export function PerformanceOverlay() {
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const monitor = sharedPerfMonitor

  // Wire up renderer info
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    monitor.setRendererInfo(
      () => {
        const info = gl.info.render as { calls?: number }
        return info.calls ?? 0
      },
      () => {
        const info = gl.info.render as { triangles?: number }
        return info.triangles ?? 0
      },
      () => {
        let total = 0
        scene.traverse((obj) => {
          const mesh = obj as { material?: { map?: { image?: { width: number; height: number } } } }
          if (mesh.material?.map?.image) {
            const img = mesh.material.map.image
            total += (img.width * img.height * 4) / (1024 * 1024)
          }
        })
        return total
      },
    )
  }, [gl, scene, monitor])

  // Toggle visibility on backtick key
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') {
        setVisible(v => !v)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // Capture the renderer's native pixel ratio so we can restore it on exit.
  const baseDpr = useRef(gl.getPixelRatio())

  // Apply the monitor's auto-adjustment decisions to the actual renderer
  // (spec 3.8 / 3.10): dynamic resolution scaling + dust-particle gate. The
  // monitor only computes these numbers — here we push them into the GPU.
  useEffect(() => {
    const restoreDpr = baseDpr.current
    return () => {
      // Restore native resolution when leaving the train realm.
      gl.setPixelRatio(restoreDpr)
    }
  }, [gl])

  // Update overlay text every 10 frames (not every frame — DOM writes are expensive)
  const frameCount = useRef(0)
  const lastRes = useRef(1)
  useFrame((_, dt) => {
    frameCount.current++
    if (frameCount.current % 10 !== 0) return

    const snap = monitor.update(dt)

    // Dynamic resolution scaling — only touch the renderer when it changes.
    if (snap.resolution !== lastRes.current) {
      lastRes.current = snap.resolution
      gl.setPixelRatio((window.devicePixelRatio || 1) * snap.resolution)
    }

    if (overlayRef.current) {
      overlayRef.current.style.display = visible ? 'block' : 'none'
      if (visible) {
        overlayRef.current.textContent = [
          '  PERFORMANCE MONITOR  ',
          '',
          `  FPS: ${snap.fps.toFixed(0)}  |  Frame: ${snap.frameTime.toFixed(1)}ms`,
          `  Draw Calls: ${snap.drawCalls}  |  Triangles: ${snap.triangles.toLocaleString()}`,
          `  Textures: ${snap.texturesMB.toFixed(1)} MB  |  Lights: ${snap.lights}`,
          `  LOD Bias: ${snap.lodLevel}  |  Resolution: ${(snap.resolution * 100).toFixed(0)}%`,
          `  Dust: ${monitor.dustParticlesEnabled ? 'ON' : 'OFF'}`,
          '',
          '  Press ` to toggle',
        ].join('\n')
      }
    }
  })

  return <div ref={overlayRef} style={OVERLAY_STYLES} />
}
