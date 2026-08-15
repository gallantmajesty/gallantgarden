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
  Vector3,
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
  /** World-y offset of the sprite's feet from the group origin, baked from the
   *  avatar's lowest vertex. The seated pose drops the rig root (rootY -0.25)
   *  so the hips rest on the chair; the sprite must drop the same amount or it
   *  floats above the chair. Standing (idle) bakes sit at 0. */
  offsetY: number
}

/* ------------------------------------------------ session bake cache + queue */

const BAKE_SIZE = 128
const CACHE_LIMIT = 400
// Spread bakes out so a 100-join burst doesn't stall the frame loop: start at
// most one new bake every BakeInterval ms (each bake also needs several settle
// frames, so the real rate is the slower of the two). Keeps the room responsive
// while the offscreen billboards populate. A slower rate also keeps the
// synchronous readback stall (GPU pipeline flush) from stacking back-to-back.
const BAKE_INTERVAL_MS = 200

/** True while the impostor bake queue still has pending work. Kept for
 *  diagnostics — the loading veil no longer waits on it (the gate defers all
 *  bakes until after reveal instead, so sprites just stream in behind). */
export function impostorBusy(): boolean {
  return busy || queue.size > 0
}

// Bake gate: while false the queue sits untouched. LibraryScene opens the gate
// only AFTER the loading veil has lifted, so the entry window (scene mount +
// first frames) never has to also absorb ~30 full-rig bake renders + readbacks
// — that synchronous load is what made the page go "not responding" on entry.
let gate = false
export function setBakeGate(v: boolean) {
  gate = v
}

interface BakeJob {
  key: string
  config: AvatarConfig
  pose: ImpostorPose
  yaw: number
}

const cache = new Map<string, ImpostorEntry>()
const queue = new Map<string, BakeJob>()
const listeners = new Set<() => void>()
let busy = false
const tmpV = new Vector3()

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

/** Deterministic per-look identity: the normalized config + the pose + the
 *  bake camera yaw (each look bakes a left/center/right lean variant). */
function keyFor(config: AvatarConfig, pose: ImpostorPose, yaw: number): string {
  return pose + '|' + yaw.toFixed(2) + '|' + JSON.stringify(normalizeAvatar(config))
}

/**
 * Returns the shared impostor texture for this look (or null while it is still
 * baking). Registers a bake request on first use; every completed bake notifies
 * subscribers so consumers re-render with the new entry.
 *
 * `yaw` is the bake camera's azimuth relative to the avatar's front (+Z):
 *   +0.6 → avatar leans LEFT in the texture, 0 → dead-front, -0.6 → leans RIGHT.
 */
export function useImpostorTexture(config: AvatarConfig, pose: ImpostorPose, yaw = 0): ImpostorEntry | null {
  const key = keyFor(config, pose, yaw)
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
      queue.set(key, { key, config, pose, yaw })
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
 * All four view variants for a look. Distant billboards always face the
 * camera, so a single baked lean can only point one way on screen; baking
 * left/center/right/back lets the sprite show the view matching the camera's
 * azimuth around the avatar — the NPC always reads as facing its desk (never
 * the camera), no matter where the camera is.
 */
export function useImpostorTextures(config: AvatarConfig, pose: ImpostorPose) {
  const left = useImpostorTexture(config, pose, 0.6)
  const center = useImpostorTexture(config, pose, 0)
  const right = useImpostorTexture(config, pose, -0.6)
  const back = useImpostorTexture(config, pose, Math.PI)
  return { left, center, right, back }
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
  // Time-based settle (not frame count): at 10 fps, 18 frames is 1.8 s per
  // bake; at 60 fps it's 0.3 s. On slow GPUs frame-based settling made the
  // whole bake queue (and therefore the loading veil) crawl.
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

  useFrame((_, dt) => {
    if (!job) {
      if (!busy && gate && queue.size > 0) {
        // Throttle: don't kick off a new bake more often than BAKE_INTERVAL_MS,
        // so a mass join spreads across many frames instead of stalling.
        const now = performance.now()
        if (now - lastStart.current < BAKE_INTERVAL_MS) return
        lastStart.current = now
        const first = queue.keys().next().value
        if (first === undefined) return
        const nextJob = queue.get(first)!
        busy = true
        settle.current = 0
        // The sit bake drops the rig root (-0.25) like the in-world seated body,
        // so the baked silhouette matches what the 3D body looks like on a chair.
        loco.current.seated = nextJob.pose === 'sit'
        setJob(nextJob)
        queue.delete(first)
      }
      return
    }

    // idle: the static pose lands on the first animator frame; sit needs the
    // eased sit pose to finish (~0.3 s), so it settles longer. Accumulated
    // real time (bounded), so the settle duration is fps-independent.
    settle.current += Math.min(dt, 0.1)
    const need = job.pose === 'sit' ? 0.3 : 0.07
    if (settle.current < need) return

    const rt = rtRef.current ?? (rtRef.current = new WebGLRenderTarget(BAKE_SIZE, BAKE_SIZE, { depthBuffer: true }))

    // Frame the avatar by its actual bounds (accessories included).
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const h = Math.max(box.max.y - box.min.y, 0.5)
    // Bake from a yawed angle (never dead-front): the sprite always faces the
    // camera, so a front-view bake makes every distant NPC stare at the viewer.
    // Each look bakes three yaws (left/center/right) so the sprite can pick the
    // variant whose lean points at the desk. Width is measured along the BAKE
    // camera's view axis (the rotated projection), so the 3/4 view never clips
    // the arms/accessories.
    const cosY = Math.cos(job.yaw)
    const sinY = Math.sin(job.yaw)
    let w = 0.1
    for (let i = 0; i < 8; i++) {
      const px = (i & 1 ? box.max.x : box.min.x) * cosY - (i & 4 ? box.max.z : box.min.z) * sinY
      w = Math.max(w, Math.abs(px))
    }
    const cy = (box.min.y + box.max.y) / 2
    // w is a half-extent; convert to full width for the max() below.
    w *= 2

    // Ortho frame with 20 % margin so the full avatar (including accessories)
    // is guaranteed inside the quad; the resulting quad is slightly larger than
    // the avatar's true height so we scale/center the sprite to cancel it out.
    const V = Math.max(h, w) * 1.2
    cam.left = -V * 0.5
    cam.right = V * 0.5
    cam.top = V * 0.5
    cam.bottom = -V * 0.5
    cam.position.set(sinY * 10, cy, cosY * 10)
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
    cache.set(job.key, { texture, scale: V, centerY, offsetY: box.min.y })

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
          preview="auto"
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
 *
 * `facing` (world yaw the avatar is turned toward, e.g. a seated NPC's desk):
 * PERMANENT RULE — the sprite always shows the avatar as if it were facing
 * `facing`, regardless of the camera. Each frame we measure the camera's
 * azimuth around the avatar relative to that axis and show the nearest baked
 * view (left/center/right/back), so from any camera position the sprite reads
 * exactly like a body that is turned toward its desk — it never stares at the
 * camera, not even when the camera lines up with the desk axis (there the
 * correct view is the avatar's BACK). Hysteresis margins keep the boundary
 * between two views from flickering.
 */
type Variant = 'left' | 'center' | 'right' | 'back'

/** Resolve the entries map — supports both a plain record and a live RefObject
 *  (consumers that switch poses per-frame pass a ref they update in useFrame so
 *  the sprite never needs a React re-render to change pose). A plain record has
 *  no `.current`; a RefObject's `.current` is the record itself. */
function resolveEntries(entries: Record<Variant, ImpostorEntry | null> | RefObject<Record<Variant, ImpostorEntry | null>>): Record<Variant, ImpostorEntry | null> {
  const r = entries as RefObject<Record<Variant, ImpostorEntry | null>> & Record<Variant, ImpostorEntry | null>
  const live = r.current
  if (live && typeof live === 'object') return live
  return r
}

export function ImpostorSprite({
  entries,
  onRef,
  facing,
  onActive,
}: {
  entries: Record<Variant, ImpostorEntry | null> | RefObject<Record<Variant, ImpostorEntry | null>>
  onRef: RefObject<boolean>
  facing?: RefObject<number> | number
  /** Fired when the sprite's fade fully completes in either direction — lets
   *  the parent hide/show the real 3D body exactly when the billboard takes
   *  over (or hands back), so nothing ever shows two avatars at once. */
  onActive?: (shown: boolean) => void
}) {
  const mat = useRef<SpriteMaterial>(null)
  const spr = useRef<THREE.Sprite>(null)
  const state = useRef(false)
  const current = useRef<ImpostorEntry | null>(null)
  const zone = useRef<Variant>('center')
  const onActiveRef = useRef(onActive)
  onActiveRef.current = onActive

  useFrame(({ camera }, dt) => {
    const m = mat.current
    const spr0 = spr.current
    if (!m || !spr0) return
    const map = resolveEntries(entries)

    // Desk-facing view pick — runs every frame (independent of the fade) so the
    // view tracks the camera even after the sprite is fully up.
    let pick = zone.current
    const yaw = typeof facing === 'number' ? facing : facing?.current
    if (yaw !== undefined) {
      const fx = Math.sin(yaw)
      const fz = Math.cos(yaw)
      // Avatar's right = cross(up, front).
      const rx = fz
      const rz = -fx
      spr0.getWorldPosition(tmpV)
      const e = camera.matrixWorld.elements
      const vx = e[12] - tmpV.x
      const vz = e[14] - tmpV.z
      const len = Math.hypot(vx, vz) || 1
      // Camera azimuth around the avatar relative to its facing axis:
      // 0 = dead ahead, ±π = directly behind, + = toward its right.
      const phi = Math.atan2((vx * rx + vz * rz) / len, (vx * fx + vz * fz) / len)
      const a = Math.abs(phi)
      if (pick === 'center') {
        if (a > 2.7) pick = 'back'
        else if (a > 0.55) pick = phi > 0 ? 'left' : 'right'
      } else if (pick === 'back') {
        if (a < 2.5) pick = 'center'
      } else {
        if (a > 2.7) pick = 'back'
        else if (a < 0.35) pick = 'center'
        else if ((pick === 'left') !== (phi > 0)) pick = phi > 0 ? 'left' : 'right'
      }
      zone.current = pick
    } else {
      pick = 'center'
      zone.current = 'center'
    }

    let entry = map[pick] ?? map.center ?? map.left ?? map.right ?? map.back
    if (entry !== current.current) {
      current.current = entry
      if (entry) {
        m.map = entry.texture
        m.needsUpdate = true
        spr0.position.y = entry.offsetY
        spr0.scale.set(entry.scale, entry.scale, 1)
        spr0.center.set(0.5, entry.centerY)
      }
    }

    const want = !!entry && !!onRef.current
    if (want === state.current) return
    const k = 1 - Math.exp(-dt * 10)
    m.opacity += (want ? 1 - m.opacity : -m.opacity) * k
    if (want && m.opacity > 0.98) {
      m.opacity = 1
      state.current = true
      onActiveRef.current?.(true)
    } else if (!want && m.opacity < 0.02) {
      m.opacity = 0
      state.current = false
      onActiveRef.current?.(false)
    }
  })

  const map = resolveEntries(entries)
  const entry = map.left ?? map.center ?? map.right ?? map.back ?? current.current
  if (!entry) return null

  return (
    <sprite
      ref={spr}
      position={[0, entry.offsetY, 0]}
      scale={[entry.scale, entry.scale, 1]}
      center={[0.5, entry.centerY]}
    >
      <spriteMaterial ref={mat} map={entry.texture} transparent depthWrite={false} opacity={0} toneMapped={false} />
    </sprite>
  )
}
