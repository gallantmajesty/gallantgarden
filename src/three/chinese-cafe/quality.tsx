import { Component, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Mesh, SkinnedMesh } from 'three'

/* ------------------------------------------------------------------ keyed-notes
 * The Jade Café reliability + quality toolkit. Mirrors the Library realm's
 * proven patterns, scoped to this scene (the library's helpers live inside
 * LibraryScene.tsx and aren't reusable). Each helper is cheap and self-contained.
 */

/* ----------------------------------------------- module-scoped heartbeat state
 * CafeHeartbeat (inside the Canvas) stamps a timestamp every rendered frame;
 * CafeWatchdog (outside, in ChineseCafeScene) reads it. If frames stop advancing
 * for `timeoutMs`, the scene is force-remounted so a frozen render loop recovers
 * automatically instead of leaving a dead, frozen image behind the DOM. */
let heartbeatAt = -1
let heartbeatLive = false

export function CafeHeartbeat() {
  useEffect(() => {
    heartbeatLive = true
    heartbeatAt = performance.now()
    return () => {
      heartbeatLive = false
    }
  }, [])
  useFrame(() => {
    heartbeatAt = performance.now()
  })
  return null
}

export function CafeWatchdog({
  active = true,
  timeoutMs = 6000,
  onStall,
}: {
  active?: boolean
  timeoutMs?: number
  onStall: () => void
}) {
  const onStallRef = useRef(onStall)
  useEffect(() => {
    onStallRef.current = onStall
  }, [onStall])
  useEffect(() => {
    if (!active) return
    let fired = false
    const iv = window.setInterval(() => {
      // If the loop is paused (seat picker / social / hidden tab) there are no
      // frames by design — never fire while inactive.
      if (!heartbeatLive) return
      if (performance.now() - heartbeatAt > timeoutMs && !fired) {
        fired = true
        onStallRef.current()
      }
    }, 800)
    return () => window.clearInterval(iv)
  }, [active, timeoutMs])
  return null
}

/* ----------------------------------------------- in-Canvas error boundary
 * An R3F Canvas owns its OWN React reconciler sub-root. A throw inside it (a
 * post-processing pass after a GPU context loss, a material shader compile, …)
 * silently kills the whole sub-root — the canvas freezes but the DOM stays alive,
 * which reads as a blank / glitched scene. This boundary catches those throws and
 * skips only the failing element (the post effects), not the whole scene. It MUST
 * return `null` (a DOM node here would throw "not part of the THREE namespace"). */
interface CafeCanvasBoundaryProps { children: ReactNode }
interface CafeCanvasBoundaryState { failed: boolean }

export class CafeCanvasBoundary extends Component<CafeCanvasBoundaryProps, CafeCanvasBoundaryState> {
  state: CafeCanvasBoundaryState = { failed: false }
  static getDerivedStateFromError(): CafeCanvasBoundaryState {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[JadeCafe] a scene element failed and was safely skipped:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/* ----------------------------------------------- avatar anticlipping (culling)
 * Seated / walking avatars are thin at arm's length, so their fictional bounding
 * spheres shrink and the camera's frustum sometimes culls them mid-pose — the
 * player visibly blinks out. Mark every skinned (avatar) mesh as never culled.
 * Re-scanned periodically because players join while the room is open. */
export function CafeAvatarCull({ everyMs = 1400 }: { everyMs?: number }) {
  const { scene } = useThree()
  useEffect(() => {
    const trav = () => {
      scene.traverse((obj) => {
        if ((obj as SkinnedMesh).isSkinnedMesh) obj.frustumCulled = false
      })
    }
    trav()
    const iv = window.setInterval(trav, everyMs)
    return () => window.clearInterval(iv)
  }, [scene, everyMs])
  return null
}

/* ----------------------------------------------- texture quality (anisotropy)
 * The café's wood / terrazzo / tile maps look soft at grazing angles on High.
 * Lift every texture to the target anisotropy once the scene has settled. */
const TEX_KEYS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap',
  'clearcoatMap', 'clearcoatRoughnessMap',
] as const

export function CafeTextureSync({ anisotropy = 8 }: { anisotropy?: number }) {
  const { scene } = useThree()
  const setAniso = useCallback(() => {
    scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats as unknown[]) {
        const mo = m as Record<string, unknown>
        for (const key of TEX_KEYS) {
          const t = mo[key]
          if (!t || typeof t !== 'object' || !('anisotropy' in (t as object))) continue
          const tex = t as { anisotropy: number; needsUpdate?: boolean }
          if (tex.anisotropy !== anisotropy) {
            tex.anisotropy = anisotropy
            tex.needsUpdate = true
          }
        }
      }
    })
  }, [scene, anisotropy])
  useEffect(() => {
    const a = window.setTimeout(setAniso, 300)
    const b = window.setTimeout(setAniso, 2600)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [setAniso])
  return null
}

/* ----------------------------------------------- shadow-map budget
 * The café architecture is static. Shadow maps only need a refresh when an avatar
 * moves, so render them once to bake, then refresh on a slow cadence instead of
 * every frame — visually indistinguishable, a large GPU saving. Respects the
 * quality `shadows` flag and restores autoUpdate on unmount. */
export function CafeShadowFreeze({ enabled = true, refreshMs = 2500 }: { enabled?: boolean; refreshMs?: number }) {
  const gl = useThree((state) => state.gl)
  const last = useRef(-1)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  useFrame(({ clock }) => {
    if (!enabled) return
    const t = clock.elapsedTime
    if (last.current < 0 || t - last.current >= refreshMs / 1000) {
      last.current = t
      gl.shadowMap.needsUpdate = true
    }
  })
  return null
}