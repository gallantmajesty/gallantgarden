// @ts-nocheck
// Impostor sprites: distant avatars (remote players + NPCs) swap from their full
// ~110-mesh rig to a single billboarded quad baked from the REAL 3D avatar, so a
// 100-player room costs ~1 draw call per far body instead of 100×110.
//
// How it works:
//   * A hidden bake stage (mounted once per Canvas, driven by a module-level
//     queue) renders a CharacterAvatar into an offscreen WebGLRenderTarget and
//     captures the pixels into a CanvasTexture.
//   * Each DISTINCT look (normalized config + pose) bakes exactly once per
//     session and is cached; every player wearing that look shares the texture.
//   * Consumers (RemotePlayers / NpcPlayers) swap bodies → sprites beyond a
//     distance threshold with hysteresis + a ~0.2s fade. If a bake is still
//     pending, the 3D body simply stays visible — nothing ever pops.
//
// Cost: one transient avatar rig (only while baking), one 256² readback per new
// look (~256 KB VRAM each, capped), and one sprite draw call per far player.

import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  AmbientLight,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  SpriteMaterial,
  SRGBColorSpace,
  WebGLRenderTarget,
} from 'three'
import { CharacterAvatar } from '../../avatar/CharacterAvatar'
import { normalizeAvatar, type AvatarConfig } from '../../avatar/config'
import type { Locomotion } from '../../avatar/animation'

export type ImpostorPose = 'idle' | 'sit'

export interface ImpostorEntry {
  texture: CanvasTexture
  /** Sprite quad side (world units) — sized so the avatar is EXACTLY its true
   *  world height h on screen (the bake frames the avatar inside a larger
   *  quad, so the quad must be taller than the avatar). */
  scale: number
  /** Normalized texture y of the avatar's feet (0 = bottom of quad) — lets the
   *  sprite sit with its feet exactly on the group origin like the 3D body. */
  centerY: number
}

/* ------------------------------------------------ session bake cache + queue */

const BAKE_SIZE = 128
const CACHE_LIMIT = 400
// Spread bakes out so a 100-join burst doesn't stall the frame loop: start at
// most one new bake every BakeInterval ms (each bake also needs several settle
// frames, so the real rate is the slower of the two). Keeps the room responsive
// while the offscreen billboards populate.
const BAKE_INTERVAL_MS = 60

/** True while the impostor bake queue still has pending work. The loading veil
 *  holds until the far-avatar sprites are ready (they're the last heavy work a
 *  library mount does), so the room only reveals itself fully loaded. */
export function impostorBusy(): boolean {
  return busy || queue.size > 0
}

interface BakeJob {
  key: string
  config: AvatarConfig
  pose: ImpostorPose
}

const cache = new Map<string, ImpostorEntry>()
const queue = new Map<string, BakeJob>()
const listeners = new Set<() => void>()
let busy = false

if (import.meta.env.DEV) {
  ;(window as any).__impostorDebug = {
    get cacheSize() { return cache.size },
    get queueSize() { return queue.size },
    get busy() { return busy },
    list() {
      return [...cache.entries()].map(([k, e]) => {
        let alpha = -1
        try {
          const c = e.texture.image as HTMLCanvasElement
          const ctx = c.getContext('2d')!
          const d = ctx.getImageData(0, 0, c.width, c.height).data
          let n = 0
          for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++
          alpha = Math.round((n / (d.length / 4)) * 1000) / 10
        } catch { /* ignore */ }
        return { k, scale: Math.round(e.scale * 1000) / 1000, centerY: Math.round(e.centerY * 1000) / 1000, opaquePct: alpha }
      })
    },
  }
  const report = () => {
    const d = (window as any).__impostorDebug
    console.log('[impostor] report:', JSON.stringify({ cacheSize: d.cacheSize, queueSize: d.queueSize, busy: d.busy, list: d.list() }))
  }
  setTimeout(() => {
    const d = (window as any).__impostorDebug
    console.log('[impostor] after 25s:', JSON.stringify({ cacheSize: d.cacheSize, queueSize: d.queueSize, busy: d.busy, sample: d.list().slice(0, 4) }))
  }, 25000)
  window.addEventListener('message', (ev) => { if (ev.data === 'impostor-report') report() })
}

/** Deterministic per-look identity: the normalized config + the pose. */
function keyFor(config: AvatarConfig, pose: ImpostorPose): string {
  return pose + '|' + JSON.stringify(normalizeAvatar(config))
}

/**
 * Returns the shared impostor texture for this look (or null while it is still
 * baking). Registers a bake request on first use; every completed bake notifies
 * subscribers so consumers re-render with the new entry.
 */
export function useImpostorTexture(config: AvatarConfig, pose: ImpostorPose): ImpostorEntry | null {
  const key = keyFor(config, pose)
  const [, tick] = useState(0)
  const has = useRef<boolean>(!!cache.get(key))

  useEffect(() => {
    if (!cache.has(key) && !queue.has(key)) {
      if (cache.size >= CACHE_LIMIT) {
        const oldest = cache.keys().next().value
        if (oldest !== undefined) {
          cache.get(oldest)!.texture.dispose()
          cache.delete(oldest)
        }
      }
      queue.set(key, { key, config, pose })
    }
    // Only re-render when THIS look's bake completes — not on every bake in the
    // queue, which would re-render every avatar in the room on each completion.
    has.current = !!cache.get(key)
    const fn = () => {
      if (cache.has(key) && !has.current) {
        has.current = true
        tick((n) => n + 1)
      }
    }
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [key])

  return cache.get(key) ?? null
}

/**
 * The single offscreen baker. Renders the queued look into a render target with
 * lighting matching the library interior, reads the pixels back into a canvas,
 * caches the resulting texture, then moves to the next queued look.
 */
export function ImpostorBakeStage() {
  const gl = useThree((s) => s.gl)
  const rtRef = useRef<WebGLRenderTarget | null>(null)
  const [job, setJob] = useState<BakeJob | null>(null)
  const settle = useRef(0)
  const lastStart = useRef(0)
  const loco = useRef<Locomotion>({ speed: 0, grounded: true, vy: 0, turnRate: 0, seated: false })

  const scene = useMemo(() => {
    const s = new Scene()
    // Same interior fill palette as LibraryScene so baked sprites read as
    // "the same avatar" rather than a flat cut-out.
    s.add(new HemisphereLight('#aebfe0', '#6b4a2a', 0.55))
    s.add(new AmbientLight('#ffd9a8', 0.5))
    const d = new DirectionalLight('#fff4e0', 0.9)
    d.position.set(4, 7, 5)
    s.add(d)
    return s
  }, [])
  const cam = useMemo(() => new OrthographicCamera(0, 0, 0, 0, 0.1, 200), [])

  // Realm switch while baking: clear the busy flag so the next stage instance
  // picks the queue back up (the in-flight look is simply re-requested on mount).
  useEffect(() => () => {
    busy = false
    settle.current = 0
  }, [])

  useFrame(() => {
    if (!job) {
      if (!busy && queue.size > 0) {
        // Throttle: don't kick off a new bake more often than BAKE_INTERVAL_MS,
        // so a mass join spreads across many frames instead of stalling.
        const now = performance.now()
        if (now - lastStart.current < BAKE_INTERVAL_MS) return
        lastStart.current = now
        const first = queue.keys().next().value
        if (first === undefined) return
        busy = true
        settle.current = 0
        loco.current.seated = false
        setJob(queue.get(first)!)
        queue.delete(first)
      }
      return
    }

    // idle: the static pose lands on the first animator frame; sit needs the
    // eased sit pose to finish (~0.3 s), so it settles longer.
    settle.current++
    const need = job.pose === 'sit' ? 18 : 4
    if (settle.current < need) return

    const rt = rtRef.current ?? (rtRef.current = new WebGLRenderTarget(BAKE_SIZE, BAKE_SIZE, { depthBuffer: true }))

    // Frame the avatar by its actual bounds (accessories included).
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const h = Math.max(box.max.y - box.min.y, 0.5)
    const w = Math.max(box.max.x - box.min.x, 0.2)
    const cy = (box.min.y + box.max.y) / 2

    // Ortho frame with 20 % margin so the full avatar (including accessories)
    // is guaranteed inside the quad; the resulting quad is slightly larger than
    // the avatar's true height so we scale/center the sprite to cancel it out.
    const V = Math.max(h, w) * 1.2
    cam.left = -V * 0.5
    cam.right = V * 0.5
    cam.top = V * 0.5
    cam.bottom = -V * 0.5
    cam.position.set(0, cy, 10)
    cam.lookAt(0, cy, 0)
    cam.updateProjectionMatrix()

    // Feet fraction inside the baked texture (0 = bottom of quad).
    const centerY = (V - h) / (2 * V)

    // Transparent background so the sprite only carries the avatar's pixels.
    const prevClear = gl.getClearColor(new Color())
    const prevAlpha = gl.getClearAlpha()
    gl.setClearColor(0x000000, 0)
    gl.setRenderTarget(rt)
    gl.clear()
    gl.render(scene, cam)
    gl.setRenderTarget(null)
    gl.setClearColor(prevClear, prevAlpha)

    // GL reads bottom-up; the canvas is top-down — flip the rows.
    const px = new Uint8Array(BAKE_SIZE * BAKE_SIZE * 4)
    gl.readRenderTargetPixels(rt, 0, 0, BAKE_SIZE, BAKE_SIZE, px)
    const canvas = document.createElement('canvas')
    canvas.width = BAKE_SIZE
    canvas.height = BAKE_SIZE
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(BAKE_SIZE, BAKE_SIZE)
    for (let y = 0; y < BAKE_SIZE; y++) {
      const src = y * BAKE_SIZE * 4
      const dst = (BAKE_SIZE - 1 - y) * BAKE_SIZE * 4
      img.data.set(px.subarray(src, src + BAKE_SIZE * 4), dst)
    }
    ctx.putImageData(img, 0, 0)

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    cache.set(job.key, { texture, scale: V, centerY })

    busy = false
    setJob(null)
    for (const fn of listeners) fn()
  })

  // The portal mounts the avatar into the offscreen scene — it never enters the
  // main scene graph, so the main pass and shadow pass stay untouched.
  return job
    ? createPortal(
        <CharacterAvatar
          key={job.key}
          config={job.config}
          locomotion={loco}
          lod="near"
          preview={job.pose === 'sit' ? 'sit' : 'auto'}
          static={job.pose === 'idle'}
        />,
        scene,
      )
    : null
}

/**
 * The billboard itself. Sits at the group origin with its feet at y=0 (matching
 * the 3D body), fades in/out over ~0.2 s when `onRef` flips, and does nothing
 * until a baked texture exists. `toneMapped` is off because the texture was
 * already tone-mapped by the bake pass.
 */
export function ImpostorSprite({ entry, onRef }: { entry: ImpostorEntry | null; onRef: RefObject<boolean> }) {
  const mat = useRef<SpriteMaterial>(null)
  const state = useRef(false)

  useFrame((_, dt) => {
    const m = mat.current
    if (!m) return
    const want = !!entry && !!onRef.current
    if (want === state.current) return
    const k = 1 - Math.exp(-dt * 10)
    m.opacity += (want ? 1 - m.opacity : -m.opacity) * k
    if (want && m.opacity > 0.98) {
      m.opacity = 1
      state.current = true
    } else if (!want && m.opacity < 0.02) {
      m.opacity = 0
      state.current = false
    }
  })

  if (!entry) return null

  return (
    <sprite scale={[entry.scale, entry.scale, 1]} center={[0.5, entry.centerY]}>
      <spriteMaterial ref={mat} map={entry.texture} transparent depthWrite={false} opacity={0} toneMapped={false} />
    </sprite>
  )
}
